import { z } from 'zod/v3';
import { removeItem, RemoveItemParams } from '../primitives/removeItem.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';

export const schema = z.object({
  id: z.string().optional().describe("The ID of the task or project to remove"),
  name: z.string().optional().describe("The name of the task or project to remove (as fallback if ID not provided)"),
  itemType: z.enum(['task', 'project']).describe("Type of item to remove ('task' or 'project')")
});

export const outputSchema = z.object({
  success: z.boolean(),
  id: z.string().optional(),
  name: z.string().optional(),
  itemType: z.enum(['task', 'project']),
  error: z.string().optional()
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  try {
    // Validate that either id or name is provided
    if (!args.id && !args.name) {
      return {
        content: [{
          type: "text" as const,
          text: "Either id or name must be provided to remove an item."
        }],
        structuredContent: { success: false, itemType: args.itemType, error: "Either id or name must be provided to remove an item." },
        isError: true
      };
    }

    if (!['task', 'project'].includes(args.itemType)) {
      return {
        content: [{
          type: "text" as const,
          text: `Invalid item type: ${args.itemType}. Must be either 'task' or 'project'.`
        }],
        structuredContent: { success: false, itemType: args.itemType, error: `Invalid item type: ${args.itemType}` },
        isError: true
      };
    }

    console.error(`Removing ${args.itemType} with ID: ${args.id || 'not provided'}, Name: ${args.name || 'not provided'}`);

    const result = await removeItem(args as RemoveItemParams);

    if (result.success) {
      const itemTypeLabel = args.itemType === 'task' ? 'Task' : 'Project';

      return {
        content: [{
          type: "text" as const,
          text: `✅ ${itemTypeLabel} "${result.name}" removed successfully.`
        }],
        structuredContent: { success: true, id: result.id, name: result.name, itemType: args.itemType }
      };
    } else {
      let errorMsg = `Failed to remove ${args.itemType}`;

      if (result.error) {
        if (result.error.includes("Item not found")) {
          errorMsg = `${args.itemType.charAt(0).toUpperCase() + args.itemType.slice(1)} not found`;
          if (args.id) errorMsg += ` with ID "${args.id}"`;
          if (args.name) errorMsg += `${args.id ? ' or' : ' with'} name "${args.name}"`;
          errorMsg += '.';
        } else {
          errorMsg += `: ${result.error}`;
        }
      }

      return {
        content: [{
          type: "text" as const,
          text: errorMsg
        }],
        structuredContent: { success: false, itemType: args.itemType, error: result.error || errorMsg },
        isError: true
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);

    return {
      content: [{
        type: "text" as const,
        text: `Error removing ${args.itemType}: ${error.message}`
      }],
      structuredContent: { success: false, itemType: args.itemType, error: error.message },
      isError: true
    };
  }
}