#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v3";

// Import tool definitions
import * as dumpDatabaseTool from './tools/definitions/dumpDatabase.js';
import * as addOmniFocusTaskTool from './tools/definitions/addOmniFocusTask.js';
import * as addProjectTool from './tools/definitions/addProject.js';
import * as removeItemTool from './tools/definitions/removeItem.js';
import * as editItemTool from './tools/definitions/editItem.js';
import * as moveTaskTool from './tools/definitions/moveTask.js';
import * as batchAddItemsTool from './tools/definitions/batchAddItems.js';
import * as batchRemoveItemsTool from './tools/definitions/batchRemoveItems.js';
import * as getTaskByIdTool from './tools/definitions/getTaskById.js';
import * as readTaskAttachmentTool from './tools/definitions/readTaskAttachment.js';
import * as getTodayCompletedTasksTool from './tools/definitions/getTodayCompletedTasks.js';
// Import perspective tools
import * as getInboxTasksTool from './tools/definitions/getInboxTasks.js';
import * as getFlaggedTasksTool from './tools/definitions/getFlaggedTasks.js';
import * as getForecastTasksTool from './tools/definitions/getForecastTasks.js';
import * as getTasksByTagTool from './tools/definitions/getTasksByTag.js';
// Import ultimate filter tool
import * as filterTasksTool from './tools/definitions/filterTasks.js';
// Import custom perspective tools
import * as listCustomPerspectivesTool from './tools/definitions/listCustomPerspectives.js';
import * as getCustomPerspectiveTasksTool from './tools/definitions/getCustomPerspectiveTasks.js';

// Create an MCP server
const server = new McpServer({
  name: "OmniFocus MCP",
  version: "1.7.0"
});

const FORMAT_FIELD = {
  format: z.enum(['text', 'json']).optional().describe("Output format for content[0].text. 'text' (default) returns human-readable text; 'json' returns JSON-serialized structured payload. structuredContent is populated regardless.")
};

function register(name: string, description: string, mod: any) {
  const baseInputShape = mod.schema?.shape ?? mod.schema ?? {};
  const inputSchema = { ...baseInputShape, ...FORMAT_FIELD };

  const config: any = { description, inputSchema };
  if (mod.outputSchema) {
    config.outputSchema = mod.outputSchema.shape ?? mod.outputSchema;
  }

  const wrappedHandler = async (args: any, extra: any) => {
    const { format, ...rest } = args || {};
    const result = await mod.handler(rest, extra);

    if (format === 'json' && result?.structuredContent) {
      const jsonText = JSON.stringify(result.structuredContent, null, 2);
      return {
        ...result,
        content: [{ type: 'text' as const, text: jsonText }]
      };
    }

    return result;
  };

  server.registerTool(name, config, wrappedHandler as any);
}

register("dump_database", "Gets the current state of your OmniFocus database", dumpDatabaseTool);
register("add_omnifocus_task", "Add a new task to OmniFocus", addOmniFocusTaskTool);
register("add_project", "Add a new project to OmniFocus", addProjectTool);
register("remove_item", "Remove a task or project from OmniFocus", removeItemTool);
register("edit_item", "Edit a task or project in OmniFocus", editItemTool);
register("move_task", "Move an existing task to a project, parent task, or inbox", moveTaskTool);
register("batch_add_items", "Add multiple tasks or projects to OmniFocus in a single operation", batchAddItemsTool);
register("batch_remove_items", "Remove multiple tasks or projects from OmniFocus in a single operation", batchRemoveItemsTool);
register("get_task_by_id", "Get information about a specific task by ID or name", getTaskByIdTool);
register("read_task_attachment", "Read a task attachment reported by get_task_by_id. Images are returned as MCP image content when possible.", readTaskAttachmentTool);
register("get_today_completed_tasks", "Get tasks completed today - view today's accomplishments", getTodayCompletedTasksTool);
register("get_inbox_tasks", "Get tasks from OmniFocus inbox perspective", getInboxTasksTool);
register("get_flagged_tasks", "Get flagged tasks from OmniFocus with optional project filtering", getFlaggedTasksTool);
register("get_forecast_tasks", "Get tasks from OmniFocus forecast perspective (due/deferred tasks in date range)", getForecastTasksTool);
register("get_tasks_by_tag", "Get tasks filtered by OmniFocus tags (labels like @home, @work, @urgent). Use this for tag-based filtering, NOT for custom perspective names. Tags are labels assigned to individual tasks.", getTasksByTagTool);
register("filter_tasks", "Advanced task filtering with unlimited perspective combinations - status, dates, projects, tags, search, and more", filterTasksTool);
register("list_custom_perspectives", "List all custom perspectives defined in OmniFocus", listCustomPerspectivesTool);
register("get_custom_perspective_tasks", "Get tasks from a specific OmniFocus custom perspective by name. Use this when user refers to perspective names like '今日工作安排', '今日复盘', '本周项目' etc. - these are custom views created in OmniFocus, NOT tags. Supports hierarchical tree display of task relationships.", getCustomPerspectiveTasksTool);

// Start the MCP server
const transport = new StdioServerTransport();

// Use await with server.connect to ensure proper connection
(async function() {
  try {
    await server.connect(transport);
  } catch (err) {
    console.error(`Failed to start MCP server: ${err}`);
  }
})();

// For a cleaner shutdown if the process is terminated
