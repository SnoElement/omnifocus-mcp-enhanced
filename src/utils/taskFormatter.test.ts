import assert from 'node:assert/strict';
import test from 'node:test';
import { formatTask } from './taskFormatter.js';

const FULL_TASK = {
  id: 'aQ6326380mb',
  name: 'Rotate 1Password JWN-Claude service account token',
  taskStatus: 'Available',
  flagged: true,
  dueDate: '2026-12-25T17:00:00.000Z',
  deferDate: '2026-06-15T09:00:00.000Z',
  plannedDate: '2026-06-20T09:00:00.000Z',
  estimatedMinutes: 90,
  projectName: 'Security',
  note: 'Annual rotation per compliance schedule',
  tags: [{ name: 'security' }, { name: 'compliance' }],
};

const MINIMAL_TASK = {
  id: 'min-1',
  name: 'A bare task',
  taskStatus: 'Available',
};

test('formatTask renders id when present', () => {
  const out = formatTask(FULL_TASK);
  assert.ok(out.includes('🆔 aQ6326380mb'));
});

test('formatTask omits id line when id is missing', () => {
  const { id, ...noId } = FULL_TASK;
  const out = formatTask(noId);
  assert.ok(!out.includes('🆔'));
});

test('formatTask omits absent fields cleanly (no "undefined" substring)', () => {
  const out = formatTask(MINIMAL_TASK);
  assert.ok(!out.includes('undefined'), `output contained "undefined": ${out}`);
  assert.ok(!out.includes('NaN'), `output contained "NaN": ${out}`);
  assert.ok(!out.includes('null'), `output contained "null": ${out}`);
});

test('formatTask omits date markers when dates are absent', () => {
  const out = formatTask(MINIMAL_TASK);
  assert.ok(!out.includes('DUE:'), 'no due date should produce no DUE: marker');
  assert.ok(!out.includes('DEFER:'));
  assert.ok(!out.includes('PLAN:'));
  assert.ok(!out.includes('DONE:'));
});

test('formatTask omits note line when note is empty/missing', () => {
  const out = formatTask({ ...MINIMAL_TASK, note: '' });
  assert.ok(!out.includes('📝'), 'empty note should not render 📝 line');
});

test('formatTask omits note line when note is whitespace only', () => {
  const out = formatTask({ ...MINIMAL_TASK, note: '   \n  ' });
  assert.ok(!out.includes('📝'));
});

test('formatTask omits tag line when tags array is empty', () => {
  const out = formatTask({ ...MINIMAL_TASK, tags: [] });
  assert.ok(!out.includes('🏷'));
});

test('formatTask renders flag emoji when flagged=true', () => {
  const out = formatTask({ ...MINIMAL_TASK, flagged: true });
  assert.ok(out.includes('🚩'));
});

test('formatTask omits flag emoji when flagged=false', () => {
  const out = formatTask({ ...MINIMAL_TASK, flagged: false });
  assert.ok(!out.includes('🚩'));
});

test('formatTask renders 1-based number when index option is provided', () => {
  const out = formatTask(MINIMAL_TASK, { index: 0 });
  assert.ok(out.startsWith('1. '));
});

test('formatTask renders index 4 as "5. "', () => {
  const out = formatTask(MINIMAL_TASK, { index: 4 });
  assert.ok(out.startsWith('5. '));
});

test('formatTask omits number prefix when index option is absent', () => {
  const out = formatTask(MINIMAL_TASK);
  assert.ok(!out.startsWith('1. '));
});

test('formatTask emphasizes specified tags with bold markdown', () => {
  const task = { ...MINIMAL_TASK, tags: [{ name: 'foo' }, { name: 'bar' }] };
  const out = formatTask(task, { emphasizeTags: ['foo'] });
  assert.ok(out.includes('**foo**'));
  assert.ok(out.includes('bar'));
  assert.ok(!out.includes('**bar**'));
});

test('formatTask renders due date with overdue marker when in the past', () => {
  const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const out = formatTask({ ...MINIMAL_TASK, dueDate: past });
  assert.ok(out.includes('⚠️ DUE:'));
});

test('formatTask renders due date with future marker when in the future', () => {
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const out = formatTask({ ...MINIMAL_TASK, dueDate: future });
  assert.ok(out.includes('📅 DUE:'));
  assert.ok(!out.includes('⚠️ DUE:'));
});

test('formatTask handles missing taskStatus by defaulting to Available glyph', () => {
  const { taskStatus, ...noStatus } = MINIMAL_TASK;
  const out = formatTask(noStatus);
  assert.ok(out.includes('⚪'));
});

test('formatTask renders estimate as Xh when whole hours', () => {
  const out = formatTask({ ...MINIMAL_TASK, estimatedMinutes: 120 });
  assert.ok(out.includes('⏱ 2h'));
  assert.ok(!out.includes('⏱ 2h0m'));
});

test('formatTask renders estimate as XhYm when mixed', () => {
  const out = formatTask({ ...MINIMAL_TASK, estimatedMinutes: 90 });
  assert.ok(out.includes('⏱ 1h30m'));
});

test('formatTask renders estimate as Ym when under an hour', () => {
  const out = formatTask({ ...MINIMAL_TASK, estimatedMinutes: 25 });
  assert.ok(out.includes('⏱ 25m'));
});

test('formatTask renders all canonical fields in a fully populated task', () => {
  const out = formatTask(FULL_TASK);
  assert.ok(out.includes('Rotate 1Password JWN-Claude service account token'));
  assert.ok(out.includes('🚩'));
  assert.ok(out.includes('DUE:'));
  assert.ok(out.includes('DEFER:'));
  assert.ok(out.includes('PLAN:'));
  assert.ok(out.includes('📝 Annual rotation per compliance schedule'));
  assert.ok(out.includes('🏷 security, compliance'));
  assert.ok(out.includes('🆔 aQ6326380mb'));
  assert.ok(out.includes('⏱'));
});
