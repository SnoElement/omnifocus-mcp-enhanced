import { z } from 'zod/v3';
import { getCustomPerspectiveTasks } from '../primitives/getCustomPerspectiveTasks.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';
import { PerspectiveDisplayMode } from '../primitives/perspectiveTaskTree.js';
import { sortBySchema, sortOrderSchema, taskListOutputSchema } from '../../utils/readToolOutput.js';

export const schema = z.object({
  perspectiveName: z.string().describe("Exact name of the OmniFocus custom perspective (e.g., '今日工作安排', '今日复盘', '本周项目'). This is NOT a tag name."),
  hideCompleted: z.boolean().optional().describe("Whether to hide completed tasks. Set to false to show all tasks including completed ones (default: true)"),
  limit: z.number().optional().describe("Maximum number of tasks to return in flat view mode (default: 1000, ignored in hierarchy mode)"),
  displayMode: z.enum(['project_tree', 'task_tree', 'flat']).optional().describe("Display mode for perspective tasks: project_tree (group by project + task hierarchy), task_tree (global task hierarchy), or flat (simple list). Default: project_tree"),
  showHierarchy: z.boolean().optional().describe("Display tasks in hierarchical tree structure showing parent-child relationships. Use this when user wants '层级显示' or 'tree view' (default: false)"),
  groupByProject: z.boolean().optional().describe("Legacy parameter. Group tasks by project when displayMode is not provided. Default: true"),
  sortBy: sortBySchema.optional().describe("Sort field (default: name)"),
  sortOrder: sortOrderSchema.optional().describe("Sort order (default: asc)")
});

export const outputSchema = taskListOutputSchema;

export function resolveCustomPerspectiveDisplayMode(args: Partial<z.infer<typeof schema>>): PerspectiveDisplayMode {
  if (args.displayMode) {
    return args.displayMode;
  }

  if (args.showHierarchy) {
    return 'task_tree';
  }

  if (args.groupByProject === false) {
    return 'flat';
  }

  return 'project_tree';
}

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  try {
    const result = await getCustomPerspectiveTasks({
      perspectiveName: args.perspectiveName,
      hideCompleted: args.hideCompleted !== false,
      limit: args.limit || 1000,
      displayMode: resolveCustomPerspectiveDisplayMode(args),
      showHierarchy: args.showHierarchy || false,
      groupByProject: args.groupByProject !== false,
      sortBy: args.sortBy,
      sortOrder: args.sortOrder
    });

    return {
      content: [{ type: "text" as const, text: result.formatted }],
      structuredContent: {
        success: true,
        tasks: result.tasks,
        count: result.tasks.length,
        totalCount: result.totalCount
      }
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      content: [{ type: "text" as const, text: `Error getting custom perspective tasks: ${errorMessage}` }],
      structuredContent: { success: false, tasks: [], count: 0, totalCount: 0, error: errorMessage },
      isError: true
    };
  }
}
