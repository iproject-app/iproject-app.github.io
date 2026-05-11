import { describe, expect, it } from 'vitest';
import {
  addDays,
  nextPayment,
  schedule,
  toggleApproval,
  weeklyPaymentAmount,
} from './schedule';
import type { ProjectData } from './types';

const project = (over: Partial<ProjectData> = {}): ProjectData => ({
  slug: 's',
  name: 'p',
  currency: 'BRL',
  customCategories: [],
  contacts: [],
  expenses: [],
  ...over,
});

describe('addDays', () => {
  it('moves forward across month boundaries', () => {
    expect(addDays('2026-01-30', 5)).toBe('2026-02-04');
  });

  it('moves backward with negative deltas', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('returns the input unchanged when malformed', () => {
    expect(addDays('not-a-date', 7)).toBe('not-a-date');
  });
});

describe('weeklyPaymentAmount', () => {
  it('apportions remaining (contract − upfront) over the weeks', () => {
    expect(
      weeklyPaymentAmount(
        project({ plannedLabor: 15800, contractUpfront: 2000, contractWeeks: 3 }),
      ),
    ).toBeCloseTo((15800 - 2000) / 3);
  });

  it('defaults upfront to 0 when missing', () => {
    expect(
      weeklyPaymentAmount(project({ plannedLabor: 15000, contractWeeks: 3 })),
    ).toBeCloseTo(5000);
  });

  it('returns 0 when contract amount is missing or non-positive', () => {
    expect(weeklyPaymentAmount(project({ contractWeeks: 3 }))).toBe(0);
    expect(
      weeklyPaymentAmount(project({ plannedLabor: 0, contractWeeks: 3 })),
    ).toBe(0);
  });

  it('returns 0 when weeks is missing or zero', () => {
    expect(weeklyPaymentAmount(project({ plannedLabor: 1000 }))).toBe(0);
    expect(
      weeklyPaymentAmount(project({ plannedLabor: 1000, contractWeeks: 0 })),
    ).toBe(0);
  });

  it('clamps to 0 when upfront > contract amount', () => {
    expect(
      weeklyPaymentAmount(
        project({
          plannedLabor: 1000,
          contractUpfront: 2000,
          contractWeeks: 3,
        }),
      ),
    ).toBe(0);
  });
});

describe('schedule', () => {
  it('returns an empty array when contract is not configured', () => {
    expect(schedule(project())).toEqual([]);
    expect(schedule(project({ plannedLabor: 1000 }))).toEqual([]);
    expect(
      schedule(project({ plannedLabor: 1000, contractWeeks: 2 })),
    ).toEqual([]);
  });

  it('emits one upfront row + one row per week when upfront > 0', () => {
    const rows = schedule(
      project({
        plannedLabor: 15800,
        contractUpfront: 2000,
        contractStartDate: '2026-05-01',
        contractWeeks: 3,
      }),
    );
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({
      key: 'upfront',
      kind: 'upfront',
      date: '2026-05-01',
      amount: 2000,
      approved: false,
    });
    expect(rows[1]).toMatchObject({
      key: 'week_0',
      kind: 'weekly',
      date: '2026-05-08',
      approved: false,
    });
    expect(rows[3]).toMatchObject({
      key: 'week_2',
      date: '2026-05-22',
    });
    // Sum of all rows equals the contract amount within a cent.
    const total = rows.reduce((s, r) => s + r.amount, 0);
    expect(total).toBeCloseTo(15800);
  });

  it('omits the upfront row when upfront is 0', () => {
    const rows = schedule(
      project({
        plannedLabor: 9000,
        contractStartDate: '2026-05-01',
        contractWeeks: 3,
      }),
    );
    expect(rows).toHaveLength(3);
    expect(rows[0].kind).toBe('weekly');
  });

  it('reflects approval state from approvedCheckpoints', () => {
    const rows = schedule(
      project({
        plannedLabor: 1000,
        contractStartDate: '2026-05-01',
        contractWeeks: 2,
        approvedCheckpoints: ['week_0'],
      }),
    );
    expect(rows.find((r) => r.key === 'week_0')?.approved).toBe(true);
    expect(rows.find((r) => r.key === 'week_1')?.approved).toBe(false);
  });
});

describe('nextPayment', () => {
  it('returns the first unapproved row', () => {
    const data = project({
      plannedLabor: 1000,
      contractStartDate: '2026-05-01',
      contractWeeks: 3,
      approvedCheckpoints: ['week_0'],
    });
    expect(nextPayment(data)?.key).toBe('week_1');
  });

  it('skips approved upfront and returns the first week', () => {
    const data = project({
      plannedLabor: 1000,
      contractUpfront: 100,
      contractStartDate: '2026-05-01',
      contractWeeks: 2,
      approvedCheckpoints: ['upfront'],
    });
    expect(nextPayment(data)?.key).toBe('week_0');
  });

  it('returns null when everything is approved', () => {
    const data = project({
      plannedLabor: 1000,
      contractStartDate: '2026-05-01',
      contractWeeks: 2,
      approvedCheckpoints: ['week_0', 'week_1'],
    });
    expect(nextPayment(data)).toBeNull();
  });

  it('returns null when the contract is not configured', () => {
    expect(nextPayment(project())).toBeNull();
  });
});

describe('toggleApproval', () => {
  it('adds a key that is not present', () => {
    expect(toggleApproval([], 'week_0')).toEqual(['week_0']);
  });

  it('removes a key that is present', () => {
    expect(toggleApproval(['week_0'], 'week_0')).toEqual([]);
  });

  it('honors an explicit next value', () => {
    expect(toggleApproval([], 'week_0', false)).toEqual([]);
    expect(toggleApproval(['week_0'], 'week_0', true)).toEqual(['week_0']);
  });

  it('handles undefined input', () => {
    expect(toggleApproval(undefined, 'upfront')).toEqual(['upfront']);
  });
});
