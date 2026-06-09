import { z } from 'zod/v3';
import { getTasksByTag } from '../primitives/getTasksByTag.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';
import { sortBySchema, sortOrderSchema } from '../../utils/readToolOutput.js';

export const schema = z.object({
  tagName: z.string().describe("Name of the tag to filter tasks by"),
  hideCompleted: z.boolean().optional().describe("Set to false to show completed tasks with this tag (default: true)"),
  exactMatch: z.boolean().optional().describe("Set to true for exact tag name match, false for partial (default: false)"),
  sortBy: sortBySchema.optional().describe("Sort field (default: name)"),
  sortOrder: sortOrderSchema.optional().describe("Sort order (default: asc)"),
  limit: z.number().min(1).max(1000).optional().describe("Maximum number of tasks to return (default: 100)")
});

export const outputSchema = z.object({
  success: z.boolean(),
  tasks: z.array(z.any()),
  count: z.number(),
  totalCount: z.number(),
  matchedTags: z.array(z.string()).optional(),
  error: z.string().optional()
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  try {
    const result = await getTasksByTag({
      tagName: args.tagName,
      hideCompleted: args.hideCompleted !== false,
      exactMatch: args.exactMatch || false,
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
        matchedTags: result.matchedTags
      }
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      content: [{ type: "text" as const, text: `Error getting tasks by tag: ${errorMessage}` }],
      structuredContent: { success: false, tasks: [], count: 0, totalCount: 0, error: errorMessage },
      isError: true
    };
  }
}