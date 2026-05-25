import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, type TranslationKey } from '../i18n';
import { formatMoney } from '../lib/format';
import { computeEstimate } from '../lib/bidEstimate';
import {
  buildMaterials,
  buildStages,
  defaultIncluded,
  defaultParamValues,
  deriveRow,
  estimateArea,
  isParamVisible,
  materialPriceKey,
  type ListRow,
  type MaterialConsumptions,
  type MaterialPrices,
  type ParamValues,
  type StageRate,
} from '../lib/bidType';
import { BID_TYPES, BID_TYPE_IDS } from '../lib/bidTypes';

const inputCls =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums focus:border-brand-600 focus:outline focus:outline-2 focus:outline-brand-600';


const numOr0 = (n: number): number => (Number.isFinite(n) ? n : 0);

/** Tap/click info bubble for a technical field. One box, toggled by the
 *  button — works one-handed on a phone (no hover needed) and is
 *  keyboard reachable. Closes on a second tap or on blur. */
function InfoTip({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`${label} — info`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-400 transition hover:border-brand-600 hover:text-brand-600 focus:outline focus:outline-2 focus:outline-brand-600"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-20 mt-1 w-64 -translate-x-1/2 rounded-md bg-slate-900 px-3 py-2 text-xs leading-snug text-white shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}

export function BidEstimator() {
  const { t } = useTranslation();
  /** All definition label keys exist in the dictionary (added with the
   *  definitions); narrow the string to a TranslationKey at the boundary. */
  const tk = (key: string): string => t(key as TranslationKey);

  /** Info bubble for a param, when the definition supplies help text. */
  const helpFor = (helpKey: string | undefined, label: string) =>
    helpKey ? <InfoTip label={label} text={tk(helpKey)} /> : null;

  const [typeId, setTypeId] = useState<string>(BID_TYPE_IDS[0]);
  const ct = BID_TYPES[typeId];
  const def = ct.def;

  const [values, setValues] = useState<ParamValues>(() =>
    defaultParamValues(def),
  );
  const [included, setIncluded] = useState<Record<string, boolean>>(() =>
    defaultIncluded(def),
  );
  const [rateEdits, setRateEdits] = useState<
    Record<string, Partial<StageRate>>
  >({});
  const [materialPrices, setMaterialPrices] = useState<MaterialPrices>({});
  const [consumptionEdits, setConsumptionEdits] =
    useState<MaterialConsumptions>({});
  const [materialsMarkupPct, setMaterialsMarkupPct] = useState(
    def.defaults.materialsMarkupPct,
  );
  const [bdiPct, setBdiPct] = useState(def.defaults.bdiPct);

  const changeType = (id: string) => {
    const next = BID_TYPES[id].def;
    setTypeId(id);
    setValues(defaultParamValues(next));
    setIncluded(defaultIncluded(next));
    setRateEdits({});
    setDirectEdits({});
    setMaterialPrices({});
    setConsumptionEdits({});
    setMaterialsMarkupPct(next.defaults.materialsMarkupPct);
    setBdiPct(next.defaults.bdiPct);
  };

  const setParam = (key: string, v: number | boolean | string) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const rowsOf = (key: string): ListRow[] =>
    Array.isArray(values[key]) ? (values[key] as ListRow[]) : [];

  const setRows = (key: string, rows: ListRow[]) =>
    setValues((prev) => ({ ...prev, [key]: rows }));

  const setRowField = (
    key: string,
    idx: number,
    field: string,
    v: number,
  ) =>
    setRows(
      key,
      rowsOf(key).map((r, i) => (i === idx ? { ...r, [field]: v } : r)),
    );

  const [directEdits, setDirectEdits] = useState<Record<string, number>>({});

  const setRate = (key: string, field: keyof StageRate, v: number) =>
    setRateEdits((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: v },
    }));

  const setDirect = (key: string, v: number) =>
    setDirectEdits((prev) => ({ ...prev, [key]: v }));

  // Quantities + resolved default rates for every component (not just
  // included ones) so the table can show what each would add.
  const allStages = useMemo(() => {
    const all = Object.fromEntries(def.components.map((c) => [c.key, true]));
    return Object.fromEntries(
      buildStages(ct, values, all).map((s) => [s.key, s]),
    );
  }, [ct, def, values]);

  const effectiveRate = (key: string): StageRate => ({
    dailyTeamCost:
      rateEdits[key]?.dailyTeamCost ?? allStages[key]?.dailyTeamCost ?? 0,
    dailyProduction:
      rateEdits[key]?.dailyProduction ?? allStages[key]?.dailyProduction ?? 0,
  });

  const effectiveDirect = (key: string): number =>
    directEdits[key] ?? allStages[key]?.directCostPerUnit ?? 0;

  const laborPerUnit = (key: string): number => {
    const r = effectiveRate(key);
    return r.dailyProduction > 0 ? r.dailyTeamCost / r.dailyProduction : 0;
  };

  const area = useMemo(() => estimateArea(ct, values), [ct, values]);

  const materials = useMemo(
    () =>
      buildMaterials(ct, values, included, materialPrices, consumptionEdits),
    [ct, values, included, materialPrices, consumptionEdits],
  );

  const materialsByComponent = useMemo(() => {
    const m: Record<string, typeof materials.lines> = {};
    for (const line of materials.lines) {
      (m[line.componentKey] ??= []).push(line);
    }
    return m;
  }, [materials]);

  const estimate = useMemo(() => {
    const stages = def.components
      .filter((c) => included[c.key])
      .map((c) => ({
        key: c.key,
        unit: c.unit,
        quantity: allStages[c.key]?.quantity ?? 0,
        ...effectiveRate(c.key),
        directCostPerUnit: effectiveDirect(c.key),
      }));
    return computeEstimate({
      stages,
      materialsCost: materials.total,
      materialsMarkupPct,
      bdiPct,
      area,
    });
    // effectiveRate closes over rateEdits/allStages; list them explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    def,
    included,
    allStages,
    rateEdits,
    directEdits,
    materials,
    materialsMarkupPct,
    bdiPct,
    area,
  ]);

  const rowByKey = Object.fromEntries(
    estimate.stages.map((s) => [s.key, s]),
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        to="/"
        className="text-sm text-slate-500 transition hover:text-slate-800"
      >
        {t('bid.backHome')}
      </Link>

      <header className="mt-2 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {t('bid.title')}
        </h1>
        <p className="text-sm text-slate-500">{t('bid.subtitle')}</p>
      </header>

      <label className="mt-6 block max-w-sm">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t('bid.bidType')}
        </span>
        <select
          aria-label={t('bid.bidType')}
          value={typeId}
          onChange={(e) => changeType(e.target.value)}
          className={inputCls}
        >
          {BID_TYPE_IDS.map((id) => (
            <option key={id} value={id}>
              {tk(BID_TYPES[id].def.labelKey)}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4 space-y-4">
        {/* INPUTS */}
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('bid.inputs')}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {def.params
              .filter((p) => isParamVisible(ct, p.key, values))
              .map((p) => {
              const label = tk(p.labelKey);
              if (p.kind === 'list') {
                const rows = rowsOf(p.key);
                const fields = p.fields ?? [];
                return (
                  <div key={p.key} className="sm:col-span-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        {label}
                        {helpFor(p.helpKey, label)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setRows(p.key, [
                            ...rows,
                            Object.fromEntries(
                              fields.map((f) => [f.key, 0]),
                            ) as ListRow,
                          ])
                        }
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-brand-600 transition hover:border-brand-600"
                      >
                        + {t('bid.addRow')}
                      </button>
                    </div>
                    {rows.length === 0 ? (
                      <p className="text-xs text-slate-400">—</p>
                    ) : (
                      <div className="space-y-2">
                        {rows.map((row, idx) => {
                          const derived = deriveRow(ct, p.key, row);
                          return (
                            <div
                              key={idx}
                              className="flex items-end gap-2"
                            >
                              {fields.map((f) => {
                                const isDerived = Boolean(
                                  p.rowDerive?.[f.key],
                                );
                                const shown = isDerived
                                  ? derived[f.key] ?? 0
                                  : row[f.key] ?? 0;
                                return (
                                  <label key={f.key} className="block flex-1">
                                    <span className="mb-1 block text-xs text-slate-500">
                                      {tk(f.labelKey)}
                                    </span>
                                    <input
                                      type="number"
                                      aria-label={`${label} ${idx + 1} ${tk(f.labelKey)}`}
                                      min={f.min ?? 0}
                                      step={f.step ?? 1}
                                      value={shown}
                                      onChange={(e) =>
                                        setRowField(
                                          p.key,
                                          idx,
                                          f.key,
                                          numOr0(e.target.valueAsNumber),
                                        )
                                      }
                                      className={inputCls}
                                    />
                                  </label>
                                );
                              })}
                              <button
                                type="button"
                                aria-label={`${t('bid.removeRow')} ${label} ${idx + 1}`}
                                onClick={() =>
                                  setRows(
                                    p.key,
                                    rows.filter((_, i) => i !== idx),
                                  )
                                }
                                className="mb-1 rounded-md border border-slate-200 px-2 py-2 text-xs text-slate-500 transition hover:border-rose-400 hover:text-rose-600"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              if (p.kind === 'boolean') {
                return (
                  <div
                    key={p.key}
                    className="flex items-center gap-2 text-sm sm:col-span-2"
                  >
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        aria-label={label}
                        checked={Boolean(values[p.key])}
                        onChange={(e) => setParam(p.key, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <span className="text-slate-700">{label}</span>
                    </label>
                    {helpFor(p.helpKey, label)}
                  </div>
                );
              }
              if (p.kind === 'enum') {
                return (
                  <div key={p.key} className="block">
                    <span className="mb-1 flex items-center gap-1 text-xs text-slate-500">
                      {label}
                      {helpFor(p.helpKey, label)}
                    </span>
                    <select
                      aria-label={label}
                      value={String(values[p.key])}
                      onChange={(e) => setParam(p.key, e.target.value)}
                      className={inputCls}
                    >
                      {p.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {tk(`${p.labelKey}.${opt}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              return (
                <div key={p.key} className="block">
                  <span className="mb-1 flex items-center gap-1 text-xs text-slate-500">
                    {label}
                    {helpFor(p.helpKey, label)}
                  </span>
                  <input
                    type="number"
                    aria-label={label}
                    min={p.min ?? 0}
                    step={p.step ?? 1}
                    value={Number(values[p.key])}
                    onChange={(e) =>
                      setParam(p.key, numOr0(e.target.valueAsNumber))
                    }
                    className={inputCls}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('bid.breakdown')}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {t('bid.componentsHint')}
          </p>
          <p className="mb-3 mt-1 text-xs text-slate-400">
            {t('bid.mathHint')}
          </p>

          <div className="space-y-3">
            {def.components.map((c) => {
              const label = tk(c.labelKey);
              const on = Boolean(included[c.key]);
              const qty = allStages[c.key]?.quantity ?? 0;
              const rate = effectiveRate(c.key);
              const row = rowByKey[c.key];
              const mats = materialsByComponent[c.key] ?? [];
              return (
                <div
                  key={c.key}
                  className={`rounded-lg border border-slate-200 p-3 ${on ? '' : 'opacity-50'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                      <input
                        type="checkbox"
                        aria-label={`${t('bid.include')} ${label}`}
                        checked={on}
                        disabled={!c.optional}
                        onChange={(e) =>
                          setIncluded((prev) => ({
                            ...prev,
                            [c.key]: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      {label}
                    </label>
                    <span className="tabular-nums text-sm font-semibold text-slate-900">
                      {on && row ? formatMoney(row.subtotal) : '—'}
                    </span>
                  </div>

                  {on && (
                    <>
                      <p className="mt-1 text-xs text-slate-500">
                        {t('bid.colQty')}:{' '}
                        <span className="tabular-nums">
                          {qty} {c.unit}
                        </span>
                        {' · '}
                        {t('bid.colLaborPerUnit')}:{' '}
                        <span className="tabular-nums">
                          {formatMoney(laborPerUnit(c.key))}
                        </span>
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <label className="block">
                          <span className="mb-1 block text-xs text-slate-500">
                            {t('bid.colDailyCost')}
                          </span>
                          <input
                            aria-label={`${label} ${t('bid.colDailyCost')}`}
                            type="number"
                            min={0}
                            step={10}
                            value={rate.dailyTeamCost}
                            onChange={(e) =>
                              setRate(
                                c.key,
                                'dailyTeamCost',
                                numOr0(e.target.valueAsNumber),
                              )
                            }
                            className={inputCls}
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs text-slate-500">
                            {t('bid.colDailyProd')}
                          </span>
                          <input
                            aria-label={`${label} ${t('bid.colDailyProd')}`}
                            type="number"
                            min={0}
                            step={1}
                            value={rate.dailyProduction}
                            onChange={(e) =>
                              setRate(
                                c.key,
                                'dailyProduction',
                                numOr0(e.target.valueAsNumber),
                              )
                            }
                            className={inputCls}
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs text-slate-500">
                            {t('bid.colDirectPerUnit')}
                          </span>
                          <input
                            aria-label={`${label} ${t('bid.colDirectPerUnit')}`}
                            type="number"
                            min={0}
                            step={10}
                            value={effectiveDirect(c.key)}
                            onChange={(e) =>
                              setDirect(c.key, numOr0(e.target.valueAsNumber))
                            }
                            className={inputCls}
                          />
                        </label>
                      </div>

                      {mats.length > 0 && (
                        <div className="mt-3 space-y-2 border-t border-slate-100 pt-2">
                          {mats.map((m) => {
                            const matLabel = tk(
                              `bid.material.${m.materialKey}`,
                            );
                            const k = materialPriceKey(
                              m.componentKey,
                              m.materialKey,
                            );
                            return (
                              <div key={k}>
                                <div className="flex items-center justify-between text-xs text-slate-600">
                                  <span>{matLabel}</span>
                                  <span className="tabular-nums">
                                    {Math.round(m.materialQty * 1000) / 1000}{' '}
                                    {m.unit} · {formatMoney(m.lineCost)}
                                  </span>
                                </div>
                                <div className="mt-1 grid grid-cols-2 gap-2">
                                  <label className="block">
                                    <span className="mb-1 block text-xs text-slate-400">
                                      {t('bid.colConsumption')} ({m.unit}/
                                      {c.unit})
                                    </span>
                                    <input
                                      aria-label={`${matLabel} — ${label} ${t('bid.colConsumption')}`}
                                      type="number"
                                      min={0}
                                      step="any"
                                      value={m.consumptionPerUnit}
                                      onChange={(e) =>
                                        setConsumptionEdits((prev) => ({
                                          ...prev,
                                          [k]: numOr0(e.target.valueAsNumber),
                                        }))
                                      }
                                      className={inputCls}
                                    />
                                  </label>
                                  <label className="block">
                                    <span className="mb-1 block text-xs text-slate-400">
                                      {t('bid.colUnitPrice')}
                                    </span>
                                    <input
                                      aria-label={`${matLabel} — ${label} ${t('bid.colUnitPrice')}`}
                                      type="number"
                                      min={0}
                                      step={1}
                                      value={m.unitPrice}
                                      onChange={(e) =>
                                        setMaterialPrices((prev) => ({
                                          ...prev,
                                          [k]: numOr0(e.target.valueAsNumber),
                                        }))
                                      }
                                      className={inputCls}
                                    />
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4">
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">
                {t('bid.materialsMarkup')}
              </span>
              <input
                type="number"
                aria-label={t('bid.materialsMarkup')}
                min={0}
                step={1}
                value={materialsMarkupPct}
                onChange={(e) =>
                  setMaterialsMarkupPct(numOr0(e.target.valueAsNumber))
                }
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">
                {t('bid.bdi')}
              </span>
              <input
                type="number"
                aria-label={t('bid.bdi')}
                min={0}
                step={1}
                value={bdiPct}
                onChange={(e) => setBdiPct(numOr0(e.target.valueAsNumber))}
                className={inputCls}
              />
            </label>
          </div>
        </section>

        {/* SUMMARY */}
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('bid.summary')}
          </h2>
          <dl className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">{t('bid.laborTotal')}</dt>
              <dd className="tabular-nums text-slate-900">
                {formatMoney(estimate.laborTotal)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">{t('bid.directTotal')}</dt>
              <dd className="tabular-nums text-slate-900">
                {formatMoney(estimate.directTotal)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">{t('bid.materialsWithMarkup')}</dt>
              <dd className="tabular-nums text-slate-900">
                {formatMoney(estimate.materialsWithMarkup)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">{t('bid.bdiAmount')}</dt>
              <dd className="tabular-nums text-slate-900">
                {formatMoney(estimate.bdi)}
              </dd>
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t border-slate-200 pt-3">
              <dt className="font-semibold text-slate-900">{t('bid.total')}</dt>
              <dd className="text-right">
                <span className="block text-2xl font-bold tabular-nums text-brand-600">
                  {formatMoney(estimate.total)}
                </span>
                {area > 0 && (
                  <span className="text-xs text-slate-500">
                    {t('bid.perM2', {
                      amount: formatMoney(estimate.pricePerM2),
                    })}
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
