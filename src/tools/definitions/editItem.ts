import { z } from 'zod/v3';
import { editItem, EditItemParams } from '../primitives/editItem.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';

export const schema = z.object({
  id: z.string().optional().describe("The ID of the task or project to edit"),
  name: z.string().optional().describe("The name of the task or project to edit (as fallback if ID not provided)"),
  itemType: z.enum(['task', 'project']).describe("Type of item to edit ('task' or 'project')"),

  // Common editable fields
  newName: z.string().optional().describe("New name for the item"),
  newNote: z.string().optional().describe("New note for the item"),
  newDueDate: z.string().optional().describe("New due date in ISO format (YYYY-MM-DD or full ISO date); set to empty string to clear"),
  newDeferDate: z.string().optional().describe("New defer date in ISO format (YYYY-MM-DD or full ISO date); set to empty string to clear"),
  newPlannedDate: z.string().optional().describe("New planned date in ISO format (YYYY-MM-DD or full ISO date); set to empty string to clear"),
  newFlagged: z.boolean().optional().describe("Set flagged status (set to false for no flag, true for flag)"),
  newEstimatedMinutes: z.number().optional().describe("New estimated minutes"),

  // Task-specific fields
  newStatus: z.enum(['incomplete', 'completed', 'dropped']).optional().describe("New status for tasks (incomplete, completed, dropped)"),
  addTags: z.array(z.string()).optional().describe("Tags to add to the task"),
  removeTags: z.array(z.string()).optional().describe("Tags to remove from the task"),
  replaceTags: z.array(z.string()).optional().describe("Tags to replace all existing tags with"),
  newProjectId: z.string().optional().describe("For tasks: move task to this project ID"),
  newProjectName: z.string().optional().describe("For tasks: move task to this project name (errors on duplicate names)"),
  newParentTaskId: z.string().optional().describe("For tasks: move task under this parent task ID"),
  newParentTaskName: z.string().optional().describe("For tasks: move task under this parent task name (errors on duplicate names)"),
  moveToInbox: z.boolean().optional().describe("For tasks: move task to inbox"),

  // Project-specific fields
  newSequential: z.boolean().optional().describe("Whether the project should be sequential"),
  newFolderName: z.string().optional().describe("New folder to move the project to"),
  newProjectStatus: z.enum(['active', 'completed', 'dropped', 'onHold']).optional().describe("New status for projects")
});

export const outputSchema = z.object({
  success: z.boolean(),
  id: z.string().optional(),
  name: z.string().optional(),
  itemType: z.enum(['task', 'project']),
  changedProperties: z.string().optional(),
  error: z.string().optional()
});

const STRING_FIELD_MAX = 60;

function truncateString(value: string): string {
  return value.length > STRING_FIELD_MAX
    ? `${value.slice(0, STRING_FIELD_MAX)}...`
    : value;
}

function formatDateValue(value: string): string {
  return value === '' ? 'cleared' : value;
}

export function formatUpdatedFields(args: z.infer<typeof schema>): string {
  const parts: string[] = [];

  if (args.newName !== undefined) {
    parts.push(`name="${truncateString(args.newName)}"`);
  }
  if (args.newNote !== undefined) {
    parts.push(`note="${truncateString(args.newNote)}"`);
  }
  if (args.newDueDate !== undefined) {
    parts.push(`dueDate=${formatDateValue(args.newDueDate)}`);
  }
  if (args.newDeferDate !== undefined) {
    parts.push(`deferDate=${formatDateValue(args.newDeferDate)}`);
  }
  if (args.newPlannedDate !== undefined) {
    parts.push(`plannedDate=${formatDateValue(args.newPlannedDate)}`);
  }
  if (args.newFlagged !== undefined) {
    parts.push(`flagged=${args.newFlagged}`);
  }
  if (args.newEstimatedMinutes !== undefined) {
    parts.push(`estimatedMinutes=${args.newEstimatedMinutes}`);
  }
  if (args.newStatus !== undefined) {
    parts.push(`status=${args.newStatus}`);
  }

  if (args.replaceTags !== undefined) {
    parts.push(`tags=[${args.replaceTags.join(', ')}]`);
  } else {
    const tagOps: string[] = [];
    if (args.addTags && args.addTags.length > 0) {
      tagOps.push(`tags+=[${args.addTags.join(', ')}]`);
    }
    if (args.removeTags && args.removeTags.length > 0) {
      tagOps.push(`tags-=[${args.removeTags.join(', ')}]`);
    }
    parts.push(...tagOps);
  }

  if (args.moveToInbox === true) {
    parts.push('movedTo=inbox');
  } else if (args.newProjectId !== undefined) {
    parts.push(`movedTo=project(id="${truncateString(args.newProjectId)}")`);
  } else if (args.newProjectName !== undefined) {
    parts.push(`movedTo=project("${truncateString(args.newProjectName)}")`);
  } else if (args.newParentTaskId !== undefined) {
    parts.push(`movedTo=parentTask(id="${truncateString(args.newParentTaskId)}")`);
  } else if (args.newParentTaskName !== undefined) {
    parts.push(`movedTo=parentTask("${truncateString(args.newParentTaskName)}")`);
  }

  if (args.newSequential !== undefined) {
    parts.push(`sequential=${args.newSequential}`);
  }
  if (args.newFolderName !== undefined) {
    parts.push(`folder="${truncateString(args.newFolderName)}"`);
  }
  if (args.newProjectStatus !== undefined) {
    parts.push(`status=${args.newProjectStatus}`);
  }

  return parts.join(', ');
}

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  try {
    // Validate that either id or name is provided
    if (!args.id && !args.name) {
      return {
        content: [{
          type: "text" as const,
          text: "Either id or name must be provided to edit an item."
        }],
        structuredContent: { success: false, itemType: args.itemType, error: "Either id or name must be provided to edit an item." },
        isError: true
      };
    }

    const result = await editItem(args as EditItemParams);

    if (result.success) {
      const itemTypeLabel = args.itemType === 'task' ? 'Task' : 'Project';
      const updatedFields = formatUpdatedFields(args);
      const text = updatedFields
        ? `✅ ${itemTypeLabel} "${result.name}" updated successfully.\nUpdated fields: ${updatedFields}`
        : `✅ ${itemTypeLabel} "${result.name}" updated successfully.`;

      return {
        content: [{
          type: "text" as const,
          text
        }],
        structuredContent: {
          success: true,
          id: result.id,
          name: result.name,
          itemType: args.itemType,
          changedProperties: result.changedProperties
        }
      };
    } else {
      let errorMsg = `Failed to update ${args.itemType}`;

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
        text: `Error updating ${args.itemType}: ${error.message}`
      }],
      structuredContent: { success: false, itemType: args.itemType, error: error.message },
      isError: true
    };
  }
}
