import { z } from 'zod/v3';
import { listCustomPerspectives } from '../primitives/listCustomPerspectives.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';

export const schema = z.object({
  format: z.enum(['simple', 'detailed']).optional().describe("Output format: simple (names only) or detailed (with identifiers) - default: simple")
});

export const outputSchema = z.object({
  success: z.boolean(),
  perspectives: z.array(z.object({
    name: z.string(),
    identifier: z.string()
  })),
  count: z.number(),
  error: z.string().optional()
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  try {
    const result = await listCustomPerspectives({
      format: args.format || 'simple'
    });

    if (!result.success) {
      return {
        content: [{
          type: "text" as const,
          text: result.formatted
        }],
        structuredContent: { success: false, perspectives: [], count: 0, error: result.error },
        isError: true
      };
    }

    return {
      content: [{
        type: "text" as const,
        text: result.formatted
      }],
      structuredContent: {
        success: true,
        perspectives: result.perspectives,
        count: result.count
      }
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      content: [{
        type: "text" as const,
        text: `Error listing custom perspectives: ${errorMessage}`
      }],
      structuredContent: { success: false, perspectives: [], count: 0, error: errorMessage },
      isError: true
    };
  }
}