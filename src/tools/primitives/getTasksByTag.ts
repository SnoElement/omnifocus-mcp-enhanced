import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { sortTasks, TaskSortField, TaskSortOrder } from '../../utils/taskSorting.js';
import { formatTask } from '../../utils/taskFormatter.js';

export interface GetTasksByTagOptions {
  tagName: string;
  hideCompleted?: boolean;
  exactMatch?: boolean;
  sortBy?: TaskSortField | string;
  sortOrder?: TaskSortOrder;
  limit?: number;
}

export interface GetTasksByTagResult {
  tasks: any[];
  totalCount: number;
  matchedTags: string[];
  formatted: string;
}

export async function getTasksByTag(options: GetTasksByTagOptions): Promise<GetTasksByTagResult> {
  const { tagName, hideCompleted = true, exactMatch = false, sortBy = 'name', sortOrder = 'asc', limit = 100 } = options;

  if (!tagName || tagName.trim() === '') {
    throw new Error('Tag name is required');
  }

  try {
    const result = await executeOmniFocusScript('@tasksByTag.js', {
      tagName: tagName.trim(),
      hideCompleted: hideCompleted,
      exactMatch: exactMatch
    });

    if (typeof result === 'string') {
      return { tasks: [], totalCount: 0, matchedTags: [], formatted: result };
    }

    if (result && typeof result === 'object') {
      const data = result as any;

      if (data.error) {
        throw new Error(data.error);
      }

      const searchType = exactMatch ? 'exact match' : 'partial match';
      const matchedTags: string[] = data.matchedTags || [];
      let output = `# 🏷 TASKS WITH TAG: "${tagName}" (${searchType})\n\n`;

      if (matchedTags.length > 0) {
        output += `**Matched tags**: ${matchedTags.join(', ')}\n\n`;
      }

      if (data.tasks && Array.isArray(data.tasks)) {
        const sorted = sortTasks(data.tasks, sortBy, sortOrder);
        const totalCount = sorted.length;
        const limited = limit > 0 ? sorted.slice(0, limit) : sorted;

        if (limited.length === 0) {
          output += `No tasks found with tag "${tagName}"\n`;
          if (data.availableTags && data.availableTags.length > 0) {
            output += `\n**Available tags**: ${data.availableTags.slice(0, 10).join(', ')}`;
            if (data.availableTags.length > 10) {
              output += ` ... and ${data.availableTags.length - 10} more`;
            }
            output += '\n';
          }
        } else {
          output += `Found ${totalCount} task${totalCount === 1 ? '' : 's'}`;
          if (limited.length < totalCount) {
            output += ` (showing first ${limited.length})`;
          }
          output += ':\n\n';

          const tasksByProject = new Map<string, any[]>();

          limited.forEach((task: any) => {
            const projectName = task.projectName || '📥 Inbox';
            if (!tasksByProject.has(projectName)) {
              tasksByProject.set(projectName, []);
            }
            tasksByProject.get(projectName)!.push(task);
          });

          tasksByProject.forEach((tasks, projectName) => {
            if (tasksByProject.size > 1) {
              output += `## 📁 ${projectName}\n`;
            }

            tasks.forEach((task: any) => {
              output += formatTask(task, { emphasizeTags: matchedTags });
              output += '\n';
            });
          });

          output += `📊 **Summary**: ${totalCount} task${totalCount === 1 ? '' : 's'} with tag "${tagName}"\n`;
        }

        return { tasks: limited, totalCount, matchedTags, formatted: output };
      }

      output += "No tasks data available\n";
      return { tasks: [], totalCount: 0, matchedTags, formatted: output };
    }

    return { tasks: [], totalCount: 0, matchedTags: [], formatted: "Unexpected result format from OmniFocus" };
  } catch (error) {
    console.error("Error in getTasksByTag:", error);
    throw new Error(`Failed to get tasks by tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}