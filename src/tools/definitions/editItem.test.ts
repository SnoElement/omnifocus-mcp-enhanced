import assert from 'node:assert/strict';
import test from 'node:test';
import { formatUpdatedFields } from './editItem.js';

test('formatUpdatedFields renders newFlagged:false as flagged=false (not bare "flagged")', () => {
  const out = formatUpdatedFields({ itemType: 'task', id: 'X', newFlagged: false });
  assert.equal(out, 'flagged=false');
  assert.ok(!/(?:^|\s)flagged(?:,|$)/.test(out), 'must not contain bare "flagged" without value');
});

test('formatUpdatedFields renders newFlagged:true as flagged=true', () => {
  const out = formatUpdatedFields({ itemType: 'task', id: 'X', newFlagged: true });
  assert.equal(out, 'flagged=true');
});

test('formatUpdatedFields renders addTags as tags+=[...]', () => {
  const out = formatUpdatedFields({ itemType: 'task', id: 'X', addTags: ['x'] });
  assert.equal(out, 'tags+=[x]');
});

test('formatUpdatedFields renders removeTags as tags-=[...]', () => {
  const out = formatUpdatedFields({ itemType: 'task', id: 'X', removeTags: ['y'] });
  assert.equal(out, 'tags-=[y]');
});

test('formatUpdatedFields combines addTags and removeTags', () => {
  const out = formatUpdatedFields({
    itemType: 'task',
    id: 'X',
    addTags: ['x'],
    removeTags: ['y'],
  });
  assert.equal(out, 'tags+=[x], tags-=[y]');
});

test('formatUpdatedFields renders multi-element tag arrays', () => {
  const out = formatUpdatedFields({ itemType: 'task', id: 'X', addTags: ['a', 'b'] });
  assert.equal(out, 'tags+=[a, b]');
});

test('formatUpdatedFields renders replaceTags as tags=[...]', () => {
  const out = formatUpdatedFields({
    itemType: 'task',
    id: 'X',
    replaceTags: ['only'],
  });
  assert.equal(out, 'tags=[only]');
});

test('formatUpdatedFields renders newName as quoted string', () => {
  const out = formatUpdatedFields({ itemType: 'task', id: 'X', newName: 'abc' });
  assert.equal(out, 'name="abc"');
});

test('formatUpdatedFields truncates long string fields to 60 chars + ellipsis', () => {
  const longName = 'a'.repeat(80);
  const out = formatUpdatedFields({ itemType: 'task', id: 'X', newName: longName });
  assert.equal(out, `name="${'a'.repeat(60)}..."`);
});

test('formatUpdatedFields does not truncate short strings', () => {
  const out = formatUpdatedFields({ itemType: 'task', id: 'X', newName: 'short' });
  assert.equal(out, 'name="short"');
});

test('formatUpdatedFields renders date fields with their value', () => {
  const out = formatUpdatedFields({
    itemType: 'task',
    id: 'X',
    newDueDate: '2026-12-25',
  });
  assert.equal(out, 'dueDate=2026-12-25');
});

test('formatUpdatedFields renders empty-string dates as cleared', () => {
  const out = formatUpdatedFields({
    itemType: 'task',
    id: 'X',
    newDeferDate: '',
  });
  assert.equal(out, 'deferDate=cleared');
});

test('formatUpdatedFields combines flagged and tags into one comma-separated line', () => {
  const out = formatUpdatedFields({
    itemType: 'task',
    id: 'X',
    newFlagged: false,
    addTags: ['otter-reviewed'],
  });
  assert.equal(out, 'flagged=false, tags+=[otter-reviewed]');
});

test('formatUpdatedFields returns empty string when no fields changed', () => {
  const out = formatUpdatedFields({ itemType: 'task', id: 'X' });
  assert.equal(out, '');
});

test('formatUpdatedFields renders moveToInbox', () => {
  const out = formatUpdatedFields({ itemType: 'task', id: 'X', moveToInbox: true });
  assert.equal(out, 'movedTo=inbox');
});

test('formatUpdatedFields renders status changes', () => {
  const out = formatUpdatedFields({ itemType: 'task', id: 'X', newStatus: 'completed' });
  assert.equal(out, 'status=completed');
});

test('formatUpdatedFields renders project sequential flag with explicit value', () => {
  const out = formatUpdatedFields({ itemType: 'project', id: 'X', newSequential: true });
  assert.equal(out, 'sequential=true');
});
