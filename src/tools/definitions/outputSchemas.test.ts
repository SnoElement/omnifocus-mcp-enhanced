import assert from 'node:assert/strict';
import test from 'node:test';

import * as addOmniFocusTaskTool from './addOmniFocusTask.js';
import * as addProjectTool from './addProject.js';
import * as editItemTool from './editItem.js';
import * as moveTaskTool from './moveTask.js';
import * as removeItemTool from './removeItem.js';
import * as batchAddItemsTool from './batchAddItems.js';
import * as batchRemoveItemsTool from './batchRemoveItems.js';
import * as getTaskByIdTool from './getTaskById.js';
import * as listCustomPerspectivesTool from './listCustomPerspectives.js';
import * as dumpDatabaseTool from './dumpDatabase.js';
import * as readTaskAttachmentTool from './readTaskAttachment.js';
import * as filterTasksTool from './filterTasks.js';
import * as getInboxTasksTool from './getInboxTasks.js';
import * as getFlaggedTasksTool from './getFlaggedTasks.js';
import * as getForecastTasksTool from './getForecastTasks.js';
import * as getTasksByTagTool from './getTasksByTag.js';
import * as getTodayCompletedTasksTool from './getTodayCompletedTasks.js';
import * as getCustomPerspectiveTasksTool from './getCustomPerspectiveTasks.js';

const tools: Array<{ name: string; mod: any; required: string[] }> = [
  { name: 'add_omnifocus_task', mod: addOmniFocusTaskTool, required: ['success', 'taskId', 'error'] },
  { name: 'add_project', mod: addProjectTool, required: ['success', 'projectId', 'error'] },
  { name: 'edit_item', mod: editItemTool, required: ['success', 'id', 'name', 'itemType', 'changedProperties', 'error'] },
  { name: 'move_task', mod: moveTaskTool, required: ['success', 'id', 'name', 'error'] },
  { name: 'remove_item', mod: removeItemTool, required: ['success', 'id', 'name', 'itemType', 'error'] },
  { name: 'batch_add_items', mod: batchAddItemsTool, required: ['success', 'results', 'error'] },
  { name: 'batch_remove_items', mod: batchRemoveItemsTool, required: ['success', 'results', 'error'] },
  { name: 'get_task_by_id', mod: getTaskByIdTool, required: ['success', 'task', 'error'] },
  { name: 'list_custom_perspectives', mod: listCustomPerspectivesTool, required: ['success', 'perspectives', 'count', 'error'] },
  { name: 'dump_database', mod: dumpDatabaseTool, required: ['success', 'database', 'error'] },
  { name: 'read_task_attachment', mod: readTaskAttachmentTool, required: ['success', 'attachment', 'hasContent', 'error'] },
  { name: 'filter_tasks', mod: filterTasksTool, required: ['success', 'tasks', 'count', 'totalCount', 'error'] },
  { name: 'get_inbox_tasks', mod: getInboxTasksTool, required: ['success', 'tasks', 'count', 'totalCount', 'error'] },
  { name: 'get_flagged_tasks', mod: getFlaggedTasksTool, required: ['success', 'tasks', 'count', 'totalCount', 'error'] },
  { name: 'get_forecast_tasks', mod: getForecastTasksTool, required: ['success', 'tasks', 'count', 'totalCount', 'tasksByDate', 'error'] },
  { name: 'get_tasks_by_tag', mod: getTasksByTagTool, required: ['success', 'tasks', 'count', 'totalCount', 'matchedTags', 'error'] },
  { name: 'get_today_completed_tasks', mod: getTodayCompletedTasksTool, required: ['success', 'tasks', 'count', 'totalCount', 'error'] },
  { name: 'get_custom_perspective_tasks', mod: getCustomPerspectiveTasksTool, required: ['success', 'tasks', 'count', 'totalCount', 'error'] }
];

for (const { name, mod, required } of tools) {
  test(`${name} exports outputSchema declaring expected fields`, () => {
    assert.ok(mod.outputSchema, `${name} must export outputSchema`);
    const shape = mod.outputSchema.shape;
    assert.ok(shape, `${name}.outputSchema must be a zod object`);
    for (const field of required) {
      assert.ok(field in shape, `${name}.outputSchema must declare "${field}"`);
    }
  });
}

test('mutation handlers populate structuredContent on validation errors', async () => {
  const editResult = await editItemTool.handler(
    { itemType: 'task' as const },
    {} as any
  );
  assert.equal(editResult.isError, true);
  assert.ok(editResult.structuredContent, 'edit_item error path must include structuredContent');
  assert.equal((editResult.structuredContent as any).success, false);
  assert.equal((editResult.structuredContent as any).itemType, 'task');

  const removeResult = await removeItemTool.handler(
    { itemType: 'project' as const },
    {} as any
  );
  assert.equal(removeResult.isError, true);
  assert.ok(removeResult.structuredContent, 'remove_item error path must include structuredContent');
  assert.equal((removeResult.structuredContent as any).success, false);
  assert.equal((removeResult.structuredContent as any).itemType, 'project');

  const getByIdResult = await getTaskByIdTool.handler({}, {} as any);
  assert.equal(getByIdResult.isError, true);
  assert.ok(getByIdResult.structuredContent);
  assert.equal((getByIdResult.structuredContent as any).success, false);
});
