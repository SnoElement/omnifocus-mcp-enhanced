// Single source of truth for rendering an OmniFocus task as a Markdown block.
// All listing tools (filterTasks, getInboxTasks, getFlaggedTasks, getForecastTasks,
// getTasksByTag, getTodayCompletedTasks) call formatTask() so output stays uniform
// and round-trip fields (id, dates, tags) cannot drift across tools.
//
// Doctrine: the structured `tasks[]` array on each tool's response is canonical.
// This formatter produces cosmetic Markdown for LLM-facing consumers. A missing
// field in formatted output is a rendering bug, never a correctness bug — the
// JSON body is the source of truth.

export interface FormatTaskOptions {
  index?: number;
  emphasizeTags?: string[];
}

const STATUS_EMOJI: Record<string, string> = {
  Available: '⚪',
  Next: '🔵',
  Blocked: '🔴',
  DueSoon: '🟡',
  Overdue: '🔴',
  Completed: '✅',
  Dropped: '⚫',
};

function statusEmojiFor(status?: string): string {
  return STATUS_EMOJI[status || ''] || '⚪';
}

function formatEstimate(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return mins > 0 ? `⏱ ${hours}h${mins}m` : `⏱ ${hours}h`;
  }
  return `⏱ ${mins}m`;
}

export function formatTask(task: any, options: FormatTaskOptions = {}): string {
  const flagSymbol = task.flagged ? '🚩 ' : '';
  const statusEmoji = statusEmojiFor(task.taskStatus);
  const numberPrefix = typeof options.index === 'number' ? `${options.index + 1}. ` : '';

  let output = `${numberPrefix}${statusEmoji} ${flagSymbol}${task.name}`;

  const dateInfo: string[] = [];
  if (task.dueDate) {
    const dueDateStr = new Date(task.dueDate).toLocaleDateString();
    const isOverdue = new Date(task.dueDate) < new Date();
    dateInfo.push(isOverdue ? `⚠️ DUE: ${dueDateStr}` : `📅 DUE: ${dueDateStr}`);
  }
  if (task.deferDate) {
    dateInfo.push(`🚀 DEFER: ${new Date(task.deferDate).toLocaleDateString()}`);
  }
  if (task.plannedDate) {
    dateInfo.push(`🗓 PLAN: ${new Date(task.plannedDate).toLocaleDateString()}`);
  }
  if (task.completedDate) {
    dateInfo.push(`✅ DONE: ${new Date(task.completedDate).toLocaleDateString()}`);
  }
  if (dateInfo.length > 0) {
    output += ` [${dateInfo.join(', ')}]`;
  }

  const additional: string[] = [];
  if (task.taskStatus && task.taskStatus !== 'Available' && task.taskStatus !== 'Completed') {
    additional.push(task.taskStatus);
  }
  if (typeof task.estimatedMinutes === 'number' && task.estimatedMinutes > 0) {
    additional.push(formatEstimate(task.estimatedMinutes));
  }
  if (additional.length > 0) {
    output += ` (${additional.join(', ')})`;
  }

  output += '\n';

  if (task.note && typeof task.note === 'string' && task.note.trim()) {
    output += `  📝 ${task.note.trim()}\n`;
  }

  if (Array.isArray(task.tags) && task.tags.length > 0) {
    const emphasized = new Set(options.emphasizeTags || []);
    const tagNames = task.tags
      .map((tag: any) => {
        const name = typeof tag === 'string' ? tag : tag?.name;
        if (!name) return '';
        return emphasized.has(name) ? `**${name}**` : name;
      })
      .filter((name: string) => name.length > 0)
      .join(', ');
    if (tagNames) {
      output += `  🏷 ${tagNames}\n`;
    }
  }

  if (task.id) {
    output += `  🆔 ${task.id}\n`;
  }

  return output;
}
