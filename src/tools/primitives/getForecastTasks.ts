import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { sortTasks, TaskSortField, TaskSortOrder } from '../../utils/taskSorting.js';
import { formatTask } from '../../utils/taskFormatter.js';

export interface GetForecastTasksOptions {
  days?: number;
  hideCompleted?: boolean;
  includeDeferredOnly?: boolean;
  sortBy?: TaskSortField | string;
  sortOrder?: TaskSortOrder;
  limit?: number;
}

export interface GetForecastTasksResult {
  tasks: any[];
  totalCount: number;
  tasksByDate: Record<string, any[]>;
  formatted: string;
}

export async function getForecastTasks(options: GetForecastTasksOptions = {}): Promise<GetForecastTasksResult> {
  const { days = 7, hideCompleted = true, includeDeferredOnly = false, sortBy = 'dueDate', sortOrder = 'asc', limit = 100 } = options;

  try {
    const result = await executeOmniFocusScript('@forecastTasks.js', {
      days: days,
      hideCompleted: hideCompleted,
      includeDeferredOnly: includeDeferredOnly
    });

    if (typeof result === 'string') {
      return { tasks: [], totalCount: 0, tasksByDate: {}, formatted: result };
    }

    if (result && typeof result === 'object') {
      const data = result as any;

      if (data.error) {
        throw new Error(data.error);
      }

      let output = `# 📅 FORECAST - Next ${days} days\n\n`;

      if (data.tasksByDate && typeof data.tasksByDate === 'object') {
        const dates = Object.keys(data.tasksByDate).sort();

        const flatAll: any[] = [];
        dates.forEach(dateStr => {
          (data.tasksByDate[dateStr] || []).forEach((t: any) => flatAll.push(t));
        });
        const sortedFlat = sortTasks(flatAll, sortBy, sortOrder);
        const totalCount = sortedFlat.length;
        const limitedFlat = limit > 0 ? sortedFlat.slice(0, limit) : sortedFlat;

        if (dates.length === 0) {
          output += "🎉 No tasks due in the forecast period - enjoy the calm!\n";
          return { tasks: [], totalCount: 0, tasksByDate: {}, formatted: output };
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        dates.forEach(dateStr => {
          const tasks = data.tasksByDate[dateStr];
          if (!tasks || tasks.length === 0) return;

          const taskDate = new Date(dateStr);
          const isToday = taskDate.getTime() === today.getTime();
          const isTomorrow = taskDate.getTime() === today.getTime() + 24 * 60 * 60 * 1000;
          const isOverdue = taskDate < today;

          let dateHeader = '';
          if (isOverdue) {
            dateHeader = `## ⚠️ OVERDUE - ${taskDate.toLocaleDateString()}`;
          } else if (isToday) {
            dateHeader = `## 🔥 TODAY - ${taskDate.toLocaleDateString()}`;
          } else if (isTomorrow) {
            dateHeader = `## ⏰ TOMORROW - ${taskDate.toLocaleDateString()}`;
          } else {
            const dayOfWeek = taskDate.toLocaleDateString('en-US', { weekday: 'long' });
            dateHeader = `## 📅 ${dayOfWeek} - ${taskDate.toLocaleDateString()}`;
          }

          output += `${dateHeader}\n`;

          tasks.forEach((task: any) => {
            output += formatTask(task);
          });

          output += '\n';
        });

        output += `📊 **Summary**: ${totalCount} task${totalCount === 1 ? '' : 's'} in forecast\n`;

        return { tasks: limitedFlat, totalCount, tasksByDate: data.tasksByDate, formatted: output };
      }

      output += "No forecast data available\n";
      return { tasks: [], totalCount: 0, tasksByDate: {}, formatted: output };
    }

    return { tasks: [], totalCount: 0, tasksByDate: {}, formatted: "Unexpected result format from OmniFocus" };
  } catch (error) {
    console.error("Error in getForecastTasks:", error);
    throw new Error(`Failed to get forecast tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}