import { z } from 'zod/v3';
import { getForecastTasks } from '../primitives/getForecastTasks.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';
import { sortBySchema, sortOrderSchema } from '../../utils/readToolOutput.js';

export const schema = z.object({
  days: z.number().min(1).max(30).optional().describe("Number of days to look ahead for forecast (default: 7)"),
  hideCompleted: z.boolean().optional().describe("Set to false to show completed tasks in forecast (default: true)"),
  includeDeferredOnly: z.boolean().optional().describe("Set to true to show only deferred tasks becoming available (default: false)"),
  sortBy: sortBySchema.optional().describe("Sort field (default: dueDate)"),
  sortOrder: sortOrderSchema.optional().describe("Sort order (default: asc)"),
  limit: z.number().min(1).max(1000).optional().describe("Maximum number of tasks to return (default: 100)")
});

export const outputSchema = z.object({
  success: z.boolean(),
  tasks: z.array(z.any()),
  count: z.number(),
  totalCount: z.number(),
  tasksByDate: z.record(z.array(z.any())).optional(),
  error: z.string().optional()
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  try {
    const result = await getForecastTasks({
      days: args.days || 7,
      hideCompleted: args.hideCompleted !== false,
      includeDeferredOnly: args.includeDeferredOnly || false,
      sortBy: args.sortBy,
      sortOrder: args.sortOrder,
      limit: args.limit
    });

    return {
      content: [{ type: "text" as const, text: result.formatted }],
      structuredContent: {
        success: true,
        tasks: result.tasks,
        count: result.tasks.length,
        totalCount: result.totalCount,
        tasksByDate: result.tasksByDate
      }
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      content: [{ type: "text" as const, text: `Error getting forecast tasks: ${errorMessage}` }],
      structuredContent: { success: false, tasks: [], count: 0, totalCount: 0, error: errorMessage },
      isError: true
    };
  }
}