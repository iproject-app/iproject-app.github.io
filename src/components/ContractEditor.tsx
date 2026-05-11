import { formatMoney, formatDate } from '../lib/format';
import {
  schedule,
  toggleApproval,
  weeklyPaymentAmount,
  type CheckpointRow,
} from '../lib/schedule';
import type { ProjectData } from '../lib/types';
import { useTranslation } from '../i18n';

export interface ContractDraft {
  plannedLabor: string;
  contractUpfront: string;
  contractStartDate: string;
  contractWeeks: string;
  approvedCheckpoints: string[];
}

export const projectToContractDraft = (data: ProjectData): ContractDraft => ({
  plannedLabor:
    data.plannedLabor != null ? String(data.plannedLabor) : '',
  contractUpfront:
    data.contractUpfront != null ? String(data.contractUpfront) : '',
  contractStartDate: data.contractStartDate ?? '',
  contractWeeks:
    data.contractWeeks != null ? String(data.contractWeeks) : '',
  approvedCheckpoints: [...(data.approvedCheckpoints ?? [])],
});

export interface ContractPatch {
  plannedLabor?: number;
  contractUpfront?: number;
  contractStartDate?: string;
  contractWeeks?: number;
  approvedCheckpoints?: string[];
}

const parsePositive = (raw: string): number | undefined => {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
};

const parseNonNegative = (raw: string): number | undefined => {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
};

/** Convert a ContractDraft back into the patch fields on ProjectData. Missing
 *  values yield `undefined` so the caller can spread the patch over existing
 *  data without erasing other keys. */
export function draftToContract(draft: ContractDraft): ContractPatch {
  return {
    plannedLabor: parsePositive(draft.plannedLabor),
    contractUpfront: parseNonNegative(draft.contractUpfront),
    contractStartDate: draft.contractStartDate || undefined,
    contractWeeks: parsePositive(draft.contractWeeks),
    approvedCheckpoints: draft.approvedCheckpoints.length
      ? draft.approvedCheckpoints
      : undefined,
  };
}

/** Apply a draft patch onto a ProjectData. Empty draft fields clear the
 *  corresponding key on the data. */
export function applyContractDraft(
  data: ProjectData,
  draft: ContractDraft,
): ProjectData {
  const patch = draftToContract(draft);
  const next: ProjectData = { ...data };
  // Each key writes through individually so an unset draft field clears the
  // corresponding key on the data rather than leaving a stale value behind.
  if (patch.plannedLabor === undefined) delete next.plannedLabor;
  else next.plannedLabor = patch.plannedLabor;
  if (patch.contractUpfront === undefined) delete next.contractUpfront;
  else next.contractUpfront = patch.contractUpfront;
  if (patch.contractStartDate === undefined) delete next.contractStartDate;
  else next.contractStartDate = patch.contractStartDate;
  if (patch.contractWeeks === undefined) delete next.contractWeeks;
  else next.contractWeeks = patch.contractWeeks;
  if (patch.approvedCheckpoints === undefined) delete next.approvedCheckpoints;
  else next.approvedCheckpoints = patch.approvedCheckpoints;
  return next;
}

interface Props {
  value: ContractDraft;
  onChange: (next: ContractDraft) => void;
  saving?: boolean;
}

export function ContractEditor({ value, onChange, saving }: Props) {
  const { t } = useTranslation();

  // Compute schedule from the current draft for live preview as the user types.
  const preview: ProjectData = applyContractDraft(
    {
      slug: '',
      name: '',
      currency: 'BRL',
      customCategories: [],
      contacts: [],
      expenses: [],
    },
    value,
  );
  const rows = schedule(preview);
  const weekly = weeklyPaymentAmount(preview);

  const update = (patch: Partial<ContractDraft>) =>
    onChange({ ...value, ...patch });

  const toggle = (key: string) =>
    onChange({
      ...value,
      approvedCheckpoints: toggleApproval(value.approvedCheckpoints, key),
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t('contract.amount')}>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={value.plannedLabor}
            onChange={(e) => update({ plannedLabor: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label={t('contract.upfront')} hint={t('contract.upfrontHint')}>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={value.contractUpfront}
            onChange={(e) => update({ contractUpfront: e.target.value })}
            className={inputClass}
            placeholder="0"
          />
        </Field>

        <Field label={t('contract.startDate')}>
          <input
            type="date"
            value={value.contractStartDate}
            onChange={(e) => update({ contractStartDate: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label={t('contract.weeks')}>
          <input
            type="number"
            inputMode="numeric"
            step="1"
            min="1"
            value={value.contractWeeks}
            onChange={(e) => update({ contractWeeks: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>

      {weekly > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span className="font-medium">{t('contract.weeklyAmount')}:</span>{' '}
          <span>{formatMoney(weekly)}</span>
        </div>
      )}

      <ScheduleList
        rows={rows}
        onToggle={toggle}
        saving={saving}
        notConfigured={t('contract.notConfigured')}
        title={t('contract.scheduleTitle')}
        upfrontLabel={t('contract.upfrontRow')}
        weekLabel={(n) => t('contract.weekRow', { n })}
        approveAria={(label) => t('contract.approveAria', { label })}
      />
    </div>
  );
}

interface ScheduleListProps {
  rows: CheckpointRow[];
  onToggle: (key: string) => void;
  saving?: boolean;
  notConfigured: string;
  title: string;
  upfrontLabel: string;
  weekLabel: (n: number) => string;
  approveAria: (label: string) => string;
}

function ScheduleList({
  rows,
  onToggle,
  saving,
  notConfigured,
  title,
  upfrontLabel,
  weekLabel,
  approveAria,
}: ScheduleListProps) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
        {notConfigured}
      </p>
    );
  }
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h4>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {rows.map((row) => {
          const label =
            row.kind === 'upfront' ? upfrontLabel : weekLabel(row.index + 1);
          return (
            <li
              key={row.key}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                row.approved ? 'bg-emerald-50/60' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={row.approved}
                onChange={() => onToggle(row.key)}
                disabled={saving}
                aria-label={approveAria(label)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div className="flex flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500">{formatDate(row.date)}</p>
                </div>
                <p className="whitespace-nowrap text-sm font-semibold text-slate-900">
                  {formatMoney(row.amount)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">
        {label}
        {hint && (
          <span className="ml-1 font-normal text-slate-500">· {hint}</span>
        )}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';
