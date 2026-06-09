import { z } from 'zod/v3';
import { getInboxTasks } from '../primitives/getInboxTasks.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';
import { sortBySchema, sortOrderSchema, taskListOutputSchema } from '../../utils/readToolOutput.js';

export const schema = z.object({
  hideCompleted: z.boolean().optional().describe("Set to false to show completed tasks in inbox (default: true)"),
  sortBy: sortBySchema.optional().describe("Sort field (default: name)"),
  sortOrder: sortOrderSchema.optional().describe("Sort order (default: asc)"),
  limit: z.number().min(1).max(1000).optional().describe("Maximum number of tasks to return (default: 100)")
});

export const outputSchema = taskListOutputSchema;

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  try {
    const result = await getInboxTasks({
      hideCompleted: args.hideCompleted !== false,
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
        totalCount: result.totalCount
      }
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      content: [{ type: "text" as const, text: `Error getting inbox tasks: ${errorMessage}` }],
      structuredContent: { success: false, tasks: [], count: 0, totalCount: 0, error: errorMessage },
      isError: true
    };
  }
}