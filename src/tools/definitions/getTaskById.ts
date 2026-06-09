import { z } from 'zod/v3';
import { getTaskById, GetTaskByIdParams } from '../primitives/getTaskById.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';
import { formatAttachmentSize } from '../primitives/taskAttachments.js';

export const schema = z.object({
  taskId: z.string().optional().describe("The ID of the task to retrieve"),
  taskName: z.string().optional().describe("The name of the task to retrieve (alternative to taskId)")
});

const taskInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  note: z.string(),
  parentId: z.string().optional(),
  parentName: z.string().optional(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  hasChildren: z.boolean(),
  childrenCount: z.number(),
  tags: z.array(z.string()),
  dueDate: z.string().optional(),
  deferDate: z.string().optional(),
  plannedDate: z.string().optional(),
  flagged: z.boolean(),
  completed: z.boolean(),
  estimatedMinutes: z.number().optional(),
  attachments: z.array(z.any()),
  linkedFileURLs: z.array(z.string())
});

export const outputSchema = z.object({
  success: z.boolean(),
  task: taskInfoSchema.optional(),
  error: z.string().optional()
});

export function formatTaskInfo(task: Awaited<ReturnType<typeof getTaskById>> extends { task?: infer T } ? T : never): string {
  let infoText = `📋 **Task Information**\n`;
  infoText += `• **Name**: ${task.name}\n`;
  infoText += `• **ID**: ${task.id}\n`;

  if (task.note) {
    infoText += `• **Note**: ${task.note}\n`;
  }

  if (task.parentId && task.parentName) {
    infoText += `• **Parent Task**: ${task.parentName} (${task.parentId})\n`;
  }

  if (task.projectId && task.projectName) {
    infoText += `• **Project**: ${task.projectName} (${task.projectId})\n`;
  }

  if (task.dueDate) {
    infoText += `• **Due**: ${new Date(task.dueDate).toLocaleString()}\n`;
  }

  if (task.deferDate) {
    infoText += `• **Defer**: ${new Date(task.deferDate).toLocaleString()}\n`;
  }

  if (task.plannedDate) {
    infoText += `• **Planned**: ${new Date(task.plannedDate).toLocaleString()}\n`;
  }

  infoText += `• **Has Children**: ${task.hasChildren ? `Yes (${task.childrenCount} subtasks)` : 'No'}\n`;
  infoText += `• **Attachments**: ${task.attachments.length}\n`;

  if (task.attachments.length > 0) {
    task.attachments.forEach(attachment => {
      infoText += `  - ${attachment.id}: ${attachment.name} [${attachment.kind}, ${attachment.mimeType || 'unknown'}, ${attachment.source}, ${formatAttachmentSize(attachment.sizeBytes)}]\n`;
    });
    infoText += `• Use read_task_attachment with an attachment ID or name when you need to inspect the file.\n`;
  }

  return infoText;
}

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  try {
    // Validate that either taskId or taskName is provided
    if (!args.taskId && !args.taskName) {
      return {
        content: [{
          type: "text" as const,
          text: "Error: Either taskId or taskName must be provided."
        }],
        structuredContent: { success: false, error: "Either taskId or taskName must be provided." },
        isError: true
      };
    }

    const result = await getTaskById(args as GetTaskByIdParams);

    if (result.success && result.task) {
      return {
        content: [{
          type: "text" as const,
          text: formatTaskInfo(result.task)
        }],
        structuredContent: { success: true, task: result.task }
      };
    } else {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to retrieve task: ${result.error}`
        }],
        structuredContent: { success: false, error: result.error },
        isError: true
      };
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Tool execution error: ${error.message}`);
    return {
      content: [{
        type: "text" as const,
        text: `Error retrieving task: ${error.message}`
      }],
      structuredContent: { success: false, error: error.message },
      isError: true
    };
  }
}
