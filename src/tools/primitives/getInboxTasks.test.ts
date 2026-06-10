import assert from 'node:assert/strict';
import test from 'node:test';
import { formatInboxTask } from './getInboxTasks.js';

test('formatInboxTask includes task id when present', () => {
  const out = formatInboxTask({ id: 'aQ6326380mb', name: 'X', taskStatus: 'Available' }, 0);
  assert.ok(out.includes('🆔 aQ6326380mb'));
});

test('formatInboxTask omits id line when task.id is missing', () => {
  const out = formatInboxTask({ name: 'X', taskStatus: 'Available' }, 0);
  assert.ok(!out.includes('🆔'));
});

test('formatInboxTask preserves 1-based numbering', () => {
  const out = formatInboxTask({ id: 'a1', name: 'first', taskStatus: 'Available' }, 0);
  assert.ok(out.startsWith('1. '));
});
