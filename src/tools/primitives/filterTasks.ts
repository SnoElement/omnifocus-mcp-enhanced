import { executeOmniFocusScript } from '../../utils/scriptExecution.js';
import { sortTasks as sharedSortTasks } from '../../utils/taskSorting.js';
import { formatTask as renderTask } from '../../utils/taskFormatter.js';

export interface FilterTasksResult {
  tasks: any[];
  totalCount: number;
  formatted: string;
}

export interface FilterTasksOptions {
  // 🎯 任务状态过滤
  taskStatus?: string[];

  // 📍 透视范围
  perspective?: 'inbox' | 'flagged' | 'all' | 'custom';

  // 💫 自定义透视参数
  customPerspectiveName?: string;
  customPerspectiveId?: string;

  // 📁 项目/标签过滤
  projectFilter?: string;
  tagFilter?: string | string[];
  exactTagMatch?: boolean;

  // 📅 截止日期过滤
  dueBefore?: string;
  dueAfter?: string;
  dueToday?: boolean;
  dueThisWeek?: boolean;
  dueThisMonth?: boolean;
  overdue?: boolean;

  // 🚀 推迟日期过滤
  deferBefore?: string;
  deferAfter?: string;
  deferToday?: boolean;
  deferThisWeek?: boolean;
  deferAvailable?: boolean;

  // 🗓 计划日期过滤
  plannedBefore?: string;
  plannedAfter?: string;
  plannedToday?: boolean;
  plannedThisWeek?: boolean;
  plannedThisMonth?: boolean;

  // ✅ 完成日期过滤
  completedBefore?: string;
  completedAfter?: string;
  completedToday?: boolean;
  completedYesterday?: boolean;
  completedThisWeek?: boolean;
  completedThisMonth?: boolean;

  // 🆕 创建日期过滤
  addedBefore?: string;
  addedAfter?: string;
  addedToday?: boolean;
  addedThisWeek?: boolean;
  addedThisMonth?: boolean;

  // 🔄 修改日期过滤
  modifiedBefore?: string;
  modifiedAfter?: string;
  modifiedToday?: boolean;
  modifiedThisWeek?: boolean;
  modifiedThisMonth?: boolean;

  // 🚩 其他维度
  flagged?: boolean;
  searchText?: string;
  hasEstimate?: boolean;
  estimateMin?: number;
  estimateMax?: number;
  hasNote?: boolean;
  inInbox?: boolean;

  // 📊 输出控制
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function isDateInTodayRange(date: Date): boolean {
  const todayStart = startOfDay(new Date());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);
  return date >= todayStart && date < tomorrowStart;
}

function isDateInCurrentWeek(date: Date): boolean {
  const today = new Date();
  const currentDay = today.getDay(); // Sunday = 0
  const mondayOffset = (currentDay + 6) % 7;
  const weekStart = startOfDay(today);
  weekStart.setDate(today.getDate() - mondayOffset);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return date >= weekStart && date < weekEnd;
}

function isDateInCurrentMonth(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function normalizeTaskTagNames(task: any): string[] {
  if (!Array.isArray(task?.tags)) {
    return [];
  }

  return task.tags
    .map((tag: any) => {
      if (typeof tag === 'string') return tag;
      if (tag && typeof tag.name === 'string') return tag.name;
      return '';
    })
    .filter((name: string) => name.trim() !== '')
    .map((name: string) => name.toLowerCase());
}

function matchesTagFilter(task: any, tagFilters: string[], exactTagMatch: boolean): boolean {
  const taskTagNames = normalizeTaskTagNames(task);
  if (taskTagNames.length === 0) return false;

  return tagFilters.some(filterTag => {
    return taskTagNames.some(taskTagName => {
      if (exactTagMatch) {
        return taskTagName === filterTag;
      }
      return taskTagName.includes(filterTag);
    });
  });
}

function shouldApplyClientSideFilters(options: FilterTasksOptions): boolean {
  return Boolean(
    options.tagFilter ||
    options.deferToday ||
    options.deferThisWeek ||
    options.deferAvailable ||
    options.deferBefore ||
    options.deferAfter ||
    options.plannedToday ||
    options.plannedThisWeek ||
    options.plannedThisMonth ||
    options.plannedBefore ||
    options.plannedAfter ||
    options.addedToday ||
    options.addedThisWeek ||
    options.addedThisMonth ||
    options.addedBefore ||
    options.addedAfter ||
    options.modifiedToday ||
    options.modifiedThisWeek ||
    options.modifiedThisMonth ||
    options.modifiedBefore ||
    options.modifiedAfter ||
    options.completedToday ||
    options.completedYesterday ||
    options.completedThisWeek ||
    options.completedThisMonth ||
    options.completedBefore ||
    options.completedAfter
  );
}

const sortTasks = sharedSortTasks;

export function applyClientSideFilters(tasks: any[], options: FilterTasksOptions): any[] {
  let filteredTasks = tasks;

  if (options.tagFilter) {
    const exactTagMatch = options.exactTagMatch ?? false;
    const rawFilters = Array.isArray(options.tagFilter) ? options.tagFilter : [options.tagFilter];
    const normalizedFilters = rawFilters
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);

    if (normalizedFilters.length > 0) {
      filteredTasks = filteredTasks.filter(task =>
        matchesTagFilter(task, normalizedFilters, exactTagMatch)
      );
    }
  }

  if (options.deferToday) {
    filteredTasks = filteredTasks.filter(task => {
      const deferDate = parseDate(task?.deferDate);
      return deferDate ? isDateInTodayRange(deferDate) : false;
    });
  }

  if (options.deferThisWeek) {
    filteredTasks = filteredTasks.filter(task => {
      const deferDate = parseDate(task?.deferDate);
      return deferDate ? isDateInCurrentWeek(deferDate) : false;
    });
  }

  if (options.deferBefore) {
    const deferBefore = parseDate(options.deferBefore);
    if (deferBefore) {
      filteredTasks = filteredTasks.filter(task => {
        const deferDate = parseDate(task?.deferDate);
        return deferDate ? deferDate < deferBefore : false;
      });
    }
  }

  if (options.deferAfter) {
    const deferAfter = parseDate(options.deferAfter);
    if (deferAfter) {
      filteredTasks = filteredTasks.filter(task => {
        const deferDate = parseDate(task?.deferDate);
        return deferDate ? deferDate > deferAfter : false;
      });
    }
  }

  if (options.deferAvailable) {
    const now = new Date();
    filteredTasks = filteredTasks.filter(task => {
      const deferDate = parseDate(task?.deferDate);
      return !deferDate || deferDate <= now;
    });
  }

  if (options.plannedToday) {
    filteredTasks = filteredTasks.filter(task => {
      const plannedDate = parseDate(task?.plannedDate);
      return plannedDate ? isDateInTodayRange(plannedDate) : false;
    });
  }

  if (options.plannedThisWeek) {
    filteredTasks = filteredTasks.filter(task => {
      const plannedDate = parseDate(task?.plannedDate);
      return plannedDate ? isDateInCurrentWeek(plannedDate) : false;
    });
  }

  if (options.plannedThisMonth) {
    filteredTasks = filteredTasks.filter(task => {
      const plannedDate = parseDate(task?.plannedDate);
      return plannedDate ? isDateInCurrentMonth(plannedDate) : false;
    });
  }

  if (options.plannedBefore) {
    const plannedBefore = parseDate(options.plannedBefore);
    if (plannedBefore) {
      filteredTasks = filteredTasks.filter(task => {
        const plannedDate = parseDate(task?.plannedDate);
        return plannedDate ? plannedDate < plannedBefore : false;
      });
    }
  }

  if (options.plannedAfter) {
    const plannedAfter = parseDate(options.plannedAfter);
    if (plannedAfter) {
      filteredTasks = filteredTasks.filter(task => {
        const plannedDate = parseDate(task?.plannedDate);
        return plannedDate ? plannedDate > plannedAfter : false;
      });
    }
  }

  filteredTasks = applyDateRangeFilters(filteredTasks, options, 'addedDate', {
    today: options.addedToday,
    thisWeek: options.addedThisWeek,
    thisMonth: options.addedThisMonth,
    before: options.addedBefore,
    after: options.addedAfter,
  });

  filteredTasks = applyDateRangeFilters(filteredTasks, options, 'modifiedDate', {
    today: options.modifiedToday,
    thisWeek: options.modifiedThisWeek,
    thisMonth: options.modifiedThisMonth,
    before: options.modifiedBefore,
    after: options.modifiedAfter,
  });

  return filteredTasks;
}

interface DateRangeFilters {
  today?: boolean;
  thisWeek?: boolean;
  thisMonth?: boolean;
  before?: string;
  after?: string;
}

function applyDateRangeFilters(
  tasks: any[],
  _options: FilterTasksOptions,
  fieldKey: string,
  filters: DateRangeFilters,
): any[] {
  let result = tasks;

  if (filters.today) {
    result = result.filter(task => {
      const date = parseDate(task?.[fieldKey]);
      return date ? isDateInTodayRange(date) : false;
    });
  }

  if (filters.thisWeek) {
    result = result.filter(task => {
      const date = parseDate(task?.[fieldKey]);
      return date ? isDateInCurrentWeek(date) : false;
    });
  }

  if (filters.thisMonth) {
    result = result.filter(task => {
      const date = parseDate(task?.[fieldKey]);
      return date ? isDateInCurrentMonth(date) : false;
    });
  }

  if (filters.before) {
    const before = parseDate(filters.before);
    if (before) {
      result = result.filter(task => {
        const date = parseDate(task?.[fieldKey]);
        return date ? date < before : false;
      });
    }
  }

  if (filters.after) {
    const after = parseDate(filters.after);
    if (after) {
      result = result.filter(task => {
        const date = parseDate(task?.[fieldKey]);
        return date ? date > after : false;
      });
    }
  }

  return result;
}

export async function filterTasks(options: FilterTasksOptions = {}): Promise<FilterTasksResult> {
  try {
    const {
      perspective = 'all',
      exactTagMatch = false,
      limit = 100,
      sortBy = 'name',
      sortOrder = 'asc'
    } = options;

    const needsClientSideFiltering = shouldApplyClientSideFilters(options);
    const needsClientSideSorting = !['name', 'completedDate', 'addedDate', 'modifiedDate'].includes(sortBy);
    const sourceLimit = (needsClientSideFiltering || needsClientSideSorting) ? Math.max(limit * 20, 1000) : limit;

    const result = await executeOmniFocusScript('@filterTasks.js', {
      ...options,
      perspective,
      exactTagMatch,
      limit: sourceLimit,
      sortBy,
      sortOrder
    });

    if (typeof result === 'string') {
      return { tasks: [], totalCount: 0, formatted: result };
    }

    if (result && typeof result === 'object') {
      const data = result as any;

      if (data.error) {
        throw new Error(data.error);
      }

      let output = `# 🔍 FILTERED TASKS\n\n`;

      const filterSummary = buildFilterSummary(options);
      if (filterSummary) {
        output += `**Filter**: ${filterSummary}\n\n`;
      }

      if (data.tasks && Array.isArray(data.tasks)) {
        const postFilteredTasks = applyClientSideFilters(data.tasks, options);
        const sortedTasks = sortTasks(postFilteredTasks, sortBy, sortOrder);
        const limitedTasks = sortedTasks.slice(0, limit);
        const taskCount = limitedTasks.length;
        const totalCount = sortedTasks.length;

        if (taskCount === 0) {
          output += '🎯 No tasks match your filter criteria.\n';
          output += '\n**Tips**:\n';
          output += '- Try broadening your search criteria\n';
          output += '- Check if tasks exist in the specified project/tags\n';
          output += '- Use `get_inbox_tasks` or `get_flagged_tasks` for basic views\n';
        } else {
          output += `Found ${taskCount} task${taskCount === 1 ? '' : 's'}`;
          if (taskCount < totalCount) {
            output += ` (showing first ${taskCount} of ${totalCount})`;
          }
          output += ':\n\n';

          const tasksByProject = groupTasksByProject(limitedTasks);

          tasksByProject.forEach((tasks, projectName) => {
            if (tasksByProject.size > 1) {
              output += `## 📁 ${projectName}\n`;
            }

            tasks.forEach((task: any) => {
              output += renderTask(task);
              output += '\n';
            });

            if (tasksByProject.size > 1) {
              output += '\n';
            }
          });

          output += `\n📊 **Sorted by**: ${sortBy} (${sortOrder})\n`;
        }

        return { tasks: limitedTasks, totalCount, formatted: output };
      }

      output += 'No task data available\n';
      return { tasks: [], totalCount: 0, formatted: output };
    }

    return { tasks: [], totalCount: 0, formatted: 'Unexpected result format from OmniFocus' };
  } catch (error) {
    console.error('Error in filterTasks:', error);
    throw new Error(`Failed to filter tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// 构建过滤条件摘要
function buildFilterSummary(options: FilterTasksOptions): string {
  const conditions: string[] = [];

  if (options.taskStatus && options.taskStatus.length > 0) {
    conditions.push(`Status: ${options.taskStatus.join(', ')}`);
  }

  if (options.perspective && options.perspective !== 'all') {
    conditions.push(`Perspective: ${options.perspective}`);
  }

  if (options.projectFilter) {
    conditions.push(`Project: "${options.projectFilter}"`);
  }

  if (options.tagFilter) {
    const tags = Array.isArray(options.tagFilter) ? options.tagFilter.join(', ') : options.tagFilter;
    conditions.push(`Tags: ${tags}`);
  }

  if (options.flagged !== undefined) {
    conditions.push(`Flagged: ${options.flagged ? 'Yes' : 'No'}`);
  }

  if (options.dueToday) conditions.push('Due: Today');
  else if (options.dueThisWeek) conditions.push('Due: This Week');
  else if (options.dueThisMonth) conditions.push('Due: This Month');
  else if (options.overdue) conditions.push('Due: Overdue');

  if (options.completedToday) conditions.push('Completed: Today');
  else if (options.completedYesterday) conditions.push('Completed: Yesterday');
  else if (options.completedThisWeek) conditions.push('Completed: This Week');
  else if (options.completedThisMonth) conditions.push('Completed: This Month');

  if (options.deferAvailable) conditions.push('Defer: Available');
  else if (options.deferToday) conditions.push('Defer: Today');
  else if (options.deferThisWeek) conditions.push('Defer: This Week');

  if (options.plannedToday) conditions.push('Planned: Today');
  else if (options.plannedThisWeek) conditions.push('Planned: This Week');
  else if (options.plannedThisMonth) conditions.push('Planned: This Month');
  else if (options.plannedBefore) conditions.push(`Planned Before: ${options.plannedBefore}`);
  else if (options.plannedAfter) conditions.push(`Planned After: ${options.plannedAfter}`);

  if (options.estimateMin !== undefined || options.estimateMax !== undefined) {
    let estimate = 'Estimate: ';
    if (options.estimateMin !== undefined && options.estimateMax !== undefined) {
      estimate += `${options.estimateMin}-${options.estimateMax}min`;
    } else if (options.estimateMin !== undefined) {
      estimate += `≥${options.estimateMin}min`;
    } else {
      estimate += `≤${options.estimateMax}min`;
    }
    conditions.push(estimate);
  }

  if (options.searchText) {
    conditions.push(`Search: "${options.searchText}"`);
  }

  return conditions.length > 0 ? conditions.join(' | ') : '';
}

// 按项目分组任务
function groupTasksByProject(tasks: any[]): Map<string, any[]> {
  const grouped = new Map<string, any[]>();

  tasks.forEach(task => {
    const projectName = task.projectName || (task.inInbox ? '📥 Inbox' : '📂 No Project');

    if (!grouped.has(projectName)) {
      grouped.set(projectName, []);
    }
    grouped.get(projectName)!.push(task);
  });

  return grouped;
}

export { renderTask as formatTask };
