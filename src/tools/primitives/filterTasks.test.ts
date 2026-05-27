import assert from 'node:assert/strict';
import test from 'node:test';
import { applyClientSideFilters } from './filterTasks.js';

function isoWithOffset(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

test('applyClientSideFilters applies exact tag filter', () => {
  const tasks = [
    { id: '1', name: 'watch video', tags: [{ name: 'watching' }] },
    { id: '2', name: 'read article', tags: [{ name: 'reading' }] },
  ];

  const filtered = applyClientSideFilters(tasks as any[], {
    tagFilter: 'watching',
    exactTagMatch: true,
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, '1');
});

test('applyClientSideFilters applies deferToday without including yesterday', () => {
  const tasks = [
    { id: 'today', name: 'today task', deferDate: isoWithOffset(0), tags: [] },
    { id: 'yesterday', name: 'yesterday task', deferDate: isoWithOffset(-1), tags: [] },
  ];

  const filtered = applyClientSideFilters(tasks as any[], {
    deferToday: true,
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'today');
});

test('applyClientSideFilters applies plannedToday without including yesterday', () => {
  const tasks = [
    { id: 'today', name: 'today task', plannedDate: isoWithOffset(0), tags: [] },
    { id: 'yesterday', name: 'yesterday task', plannedDate: isoWithOffset(-1), tags: [] },
  ];

  const filtered = applyClientSideFilters(tasks as any[], {
    plannedToday: true,
  } as any);

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'today');
});

test('applyClientSideFilters applies plannedBefore and plannedAfter window', () => {
  const tasks = [
    { id: 'early', name: 'early task', plannedDate: '2026-02-10T09:00:00.000Z', tags: [] },
    { id: 'in-window', name: 'window task', plannedDate: '2026-02-15T09:00:00.000Z', tags: [] },
    { id: 'late', name: 'late task', plannedDate: '2026-02-22T09:00:00.000Z', tags: [] },
  ];

  const filtered = applyClientSideFilters(tasks as any[], {
    plannedAfter: '2026-02-12',
    plannedBefore: '2026-02-20',
  } as any);

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'in-window');
});

test('applyClientSideFilters applies addedToday', () => {
  const tasks = [
    { id: 'today', name: 'today task', addedDate: isoWithOffset(0), tags: [] },
    { id: 'yesterday', name: 'yesterday task', addedDate: isoWithOffset(-1), tags: [] },
    { id: 'no-date', name: 'no date task', tags: [] },
  ];

  const filtered = applyClientSideFilters(tasks as any[], {
    addedToday: true,
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'today');
});

test('applyClientSideFilters applies addedBefore as exclusive upper bound', () => {
  const tasks = [
    { id: 'before', name: 'before', addedDate: '2026-02-10T09:00:00.000Z', tags: [] },
    { id: 'after', name: 'after', addedDate: '2026-02-15T09:00:00.000Z', tags: [] },
  ];

  const filtered = applyClientSideFilters(tasks as any[], {
    addedBefore: '2026-02-12',
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'before');
});

test('applyClientSideFilters applies modifiedBefore as exclusive upper bound', () => {
  const tasks = [
    { id: 'old', name: 'old', modifiedDate: '2026-02-10T09:00:00.000Z', tags: [] },
    { id: 'recent', name: 'recent', modifiedDate: '2026-02-25T09:00:00.000Z', tags: [] },
  ];

  const filtered = applyClientSideFilters(tasks as any[], {
    modifiedBefore: '2026-02-20',
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'old');
});

test('applyClientSideFilters applies addedAfter as exclusive lower bound', () => {
  const tasks = [
    { id: 'before', name: 'before', addedDate: '2026-02-10T09:00:00.000Z', tags: [] },
    { id: 'after', name: 'after', addedDate: '2026-02-15T09:00:00.000Z', tags: [] },
  ];

  const filtered = applyClientSideFilters(tasks as any[], {
    addedAfter: '2026-02-12',
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'after');
});

test('applyClientSideFilters applies addedThisWeek and excludes outside-week tasks', () => {
  const tasks = [
    { id: 'this-week', name: 't1', addedDate: isoWithOffset(0), tags: [] },
    { id: 'last-month', name: 't2', addedDate: isoWithOffset(-40), tags: [] },
    { id: 'no-date', name: 't3', tags: [] },
  ];

  const filtered = applyClientSideFilters(tasks as any[], {
    addedThisWeek: true,
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'this-week');
});

test('applyClientSideFilters applies modifiedAfter for incremental sync use case', () => {
  const tasks = [
    { id: 'old', name: 'old', modifiedDate: '2026-02-10T09:00:00.000Z', tags: [] },
    { id: 'recent', name: 'recent', modifiedDate: '2026-02-25T09:00:00.000Z', tags: [] },
    { id: 'no-mod', name: 'never modified', tags: [] },
  ];

  const filtered = applyClientSideFilters(tasks as any[], {
    modifiedAfter: '2026-02-20',
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'recent');
});

test('applyClientSideFilters applies modifiedToday', () => {
  const tasks = [
    { id: 'today', name: 'today task', modifiedDate: isoWithOffset(0), tags: [] },
    { id: 'two-days-ago', name: 'old task', modifiedDate: isoWithOffset(-2), tags: [] },
  ];

  const filtered = applyClientSideFilters(tasks as any[], {
    modifiedToday: true,
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'today');
});

test('applyClientSideFilters combines addedAfter with modifiedAfter (intersection)', () => {
  const tasks = [
    { id: 'old-edit', name: 't1', addedDate: '2026-01-10T09:00:00.000Z', modifiedDate: '2026-02-25T09:00:00.000Z', tags: [] },
    { id: 'new-task', name: 't2', addedDate: '2026-02-22T09:00:00.000Z', modifiedDate: '2026-02-25T09:00:00.000Z', tags: [] },
    { id: 'old-task', name: 't3', addedDate: '2026-01-10T09:00:00.000Z', modifiedDate: '2026-01-12T09:00:00.000Z', tags: [] },
  ];

  const filtered = applyClientSideFilters(tasks as any[], {
    addedAfter: '2026-02-20',
    modifiedAfter: '2026-02-20',
  });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'new-task');
});
