import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { sortTasks, TaskSortField, TaskSortOrder } from '../../utils/taskSorting.js';

export interface GetFlaggedTasksOptions {
  hideCompleted?: boolean;
  projectFilter?: string;
  sortBy?: TaskSortField | string;
  sortOrder?: TaskSortOrder;
  limit?: number;
}

export interface GetFlaggedTasksResult {
  tasks: any[];
  totalCount: number;
  formatted: string;
}

export async function getFlaggedTasks(options: GetFlaggedTasksOptions = {}): Promise<GetFlaggedTasksResult> {
  const { hideCompleted = true, projectFilter, sortBy = 'name', sortOrder = 'asc', limit = 100 } = options;

  try {
    const result = await executeOmniFocusScript('@flaggedTasks.js', {
      hideCompleted: hideCompleted,
      projectFilter: projectFilter
    });

    if (typeof result === 'string') {
      return { tasks: [], totalCount: 0, formatted: result };
    }

    if (result && typeof result === 'object') {
      const data = result as any;

      if (data.error) {
        throw new Error(data.error);
      }

      let output = projectFilter
        ? `# 🚩 FLAGGED TASKS - Project: ${projectFilter}\n\n`
        : `# 🚩 FLAGGED TASKS\n\n`;

      if (data.tasks && Array.isArray(data.tasks)) {
        const sorted = sortTasks(data.tasks, sortBy, sortOrder);
        const totalCount = sorted.length;
        const limited = limit > 0 ? sorted.slice(0, limit) : sorted;

        if (limited.length === 0) {
          output += projectFilter
            ? `No flagged tasks found in project "${projectFilter}"\n`
            : "🎉 No flagged tasks - nice and clean!\n";
        } else {
          output += `Found ${totalCount} flagged task${totalCount === 1 ? '' : 's'}`;
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
              const dueDateStr = task.dueDate ? ` [DUE: ${new Date(task.dueDate).toLocaleDateString()}]` : '';
              const deferDateStr = task.deferDate ? ` [DEFER: ${new Date(task.deferDate).toLocaleDateString()}]` : '';
              const plannedDateStr = task.plannedDate ? ` [PLAN: ${new Date(task.plannedDate).toLocaleDateString()}]` : '';
              const statusStr = task.taskStatus !== 'Available' ? ` (${task.taskStatus})` : '';
              const estimateStr = task.estimatedMinutes ? ` ⏱${task.estimatedMinutes}m` : '';

              output += `• 🚩 ${task.name}${dueDateStr}${deferDateStr}${plannedDateStr}${statusStr}${estimateStr}\n`;

              if (task.note && task.note.trim()) {
                output += `  📝 ${task.note.trim()}\n`;
              }

              if (task.tags && task.tags.length > 0) {
                const tagNames = task.tags.map((tag: any) => tag.name).join(', ');
                output += `  🏷 ${tagNames}\n`;
              }

              output += '\n';
            });
          });
        }

        return { tasks: limited, totalCount, formatted: output };
      }

      output += "No flagged tasks data available\n";
      return { tasks: [], totalCount: 0, formatted: output };
    }

    return { tasks: [], totalCount: 0, formatted: "Unexpected result format from OmniFocus" };
  } catch (error) {
    console.error("Error in getFlaggedTasks:", error);
    throw new Error(`Failed to get flagged tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}