import { z } from 'zod/v3';
import { getTodayCompletedTasks } from '../primitives/getTodayCompletedTasks.js';
import { sortBySchema, sortOrderSchema, taskListOutputSchema } from '../../utils/readToolOutput.js';

export const schema = z.object({
  limit: z.number().min(1).max(100).default(20).optional().describe('返回的最大任务数量 (默认: 20)'),
  sortBy: sortBySchema.optional().describe("Sort field (default: completedDate)"),
  sortOrder: sortOrderSchema.optional().describe("Sort order (default: desc)")
});

export const outputSchema = taskListOutputSchema;

export async function handler(args: z.infer<typeof schema>) {
  try {
    const result = await getTodayCompletedTasks({
      limit: args.limit,
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
      content: [{ type: "text" as const, text: `Error getting today completed tasks: ${errorMessage}` }],
      structuredContent: { success: false, tasks: [], count: 0, totalCount: 0, error: errorMessage },
      isError: true
    };
  }
}