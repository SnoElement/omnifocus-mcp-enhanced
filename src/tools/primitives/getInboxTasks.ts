import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { sortTasks, TaskSortField, TaskSortOrder } from '../../utils/taskSorting.js';
import { formatTask } from '../../utils/taskFormatter.js';

export interface GetInboxTasksOptions {
  hideCompleted?: boolean;
  sortBy?: TaskSortField | string;
  sortOrder?: TaskSortOrder;
  limit?: number;
}

export interface GetInboxTasksResult {
  tasks: any[];
  totalCount: number;
  formatted: string;
}

export async function getInboxTasks(options: GetInboxTasksOptions = {}): Promise<GetInboxTasksResult> {
  const { hideCompleted = true, sortBy = 'name', sortOrder = 'asc', limit = 100 } = options;

  try {
    const result = await executeOmniFocusScript('@inboxTasks.js', {
      hideCompleted: hideCompleted
    });

    if (typeof result === 'string') {
      return { tasks: [], totalCount: 0, formatted: result };
    }

    if (result && typeof result === 'object') {
      const data = result as any;

      if (data.error) {
        throw new Error(data.error);
      }

      let output = `# INBOX TASKS\n\n`;

      if (data.tasks && Array.isArray(data.tasks)) {
        const sorted = sortTasks(data.tasks, sortBy, sortOrder);
        const totalCount = sorted.length;
        const limited = limit > 0 ? sorted.slice(0, limit) : sorted;

        if (limited.length === 0) {
          output += '📪 Inbox is empty - well done!\n';
        } else {
          output += `📥 Found ${totalCount} task${totalCount === 1 ? '' : 's'} in inbox`;
          if (limited.length < totalCount) {
            output += ` (showing first ${limited.length})`;
          }
          output += ':\n\n';

          limited.forEach((task: any, index: number) => {
            output += formatTask(task, { index });
          });
        }

        return { tasks: limited, totalCount, formatted: output };
      }

      output += 'No inbox data available\n';
      return { tasks: [], totalCount: 0, formatted: output };
    }

    return { tasks: [], totalCount: 0, formatted: 'Unexpected result format from OmniFocus' };
  } catch (error) {
    console.error('Error in getInboxTasks:', error);
    throw new Error(`Failed to get inbox tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function formatInboxTask(task: any, index: number): string {
  return formatTask(task, { index });
}
