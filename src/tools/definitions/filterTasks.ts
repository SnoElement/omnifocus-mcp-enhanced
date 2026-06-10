import { z } from 'zod/v3';
import { filterTasks } from '../primitives/filterTasks.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';

// 任务状态枚举
const TaskStatusEnum = z.enum([
  "Available",
  "Next",
  "Blocked",
  "DueSoon",
  "Overdue",
  "Completed",
  "Dropped"
]);

// 透视范围枚举
const PerspectiveEnum = z.enum(["inbox", "flagged", "all"]);

export const schema = z.object({
  // 🎯 任务状态过滤
  taskStatus: z.array(TaskStatusEnum).optional().describe("Filter by task status. Can specify multiple statuses"),

  // 📍 透视范围
  perspective: PerspectiveEnum.optional().describe("Limit search to specific perspective: inbox, flagged, all tasks"),

  // 📁 项目/标签过滤
  projectFilter: z.string().optional().describe(
    "Filter by project name (single substring, case-insensitive partial match). " +
    "For matching multiple projects, use projectFilters."
  ),
  projectFilters: z.array(z.string()).optional().describe(
    "Match tasks whose project name matches ANY of these names (OR semantics, " +
    "case-insensitive partial match). Independent of projectFilter — when both " +
    "are set, a task must match projectFilter AND at least one of projectFilters."
  ),
  tagFilter: z.union([z.string(), z.array(z.string())]).optional().describe(
    "Filter by tag name(s). Single string matches that one tag. " +
    "Array matches tasks whose tags include ANY of the listed names (OR semantics). " +
    "For AND semantics (task must have all listed tags), use tagFiltersAll instead."
  ),
  tagFiltersAll: z.array(z.string()).optional().describe(
    "Match tasks whose tags include ALL of these names (AND semantics). " +
    "Independent of tagFilter (OR) — when both are set, a task must match " +
    "all of tagFiltersAll AND at least one of tagFilter."
  ),
  exactTagMatch: z.boolean().optional().describe("Set to true for exact tag name match, false for partial. Applies to both tagFilter and tagFiltersAll (default: false)"),

  // 📅 截止日期过滤
  dueBefore: z.string().optional().describe("Show tasks due before this date (ISO format: YYYY-MM-DD)"),
  dueAfter: z.string().optional().describe("Show tasks due after this date (ISO format: YYYY-MM-DD)"),
  dueToday: z.boolean().optional().describe("Show tasks due today"),
  dueThisWeek: z.boolean().optional().describe("Show tasks due this week"),
  dueThisMonth: z.boolean().optional().describe("Show tasks due this month"),
  overdue: z.boolean().optional().describe("Show overdue tasks only"),

  // 🚀 推迟日期过滤
  deferBefore: z.string().optional().describe("Show tasks with defer date before this date (ISO format: YYYY-MM-DD)"),
  deferAfter: z.string().optional().describe("Show tasks with defer date after this date (ISO format: YYYY-MM-DD)"),
  deferToday: z.boolean().optional().describe("Show tasks deferred to today"),
  deferThisWeek: z.boolean().optional().describe("Show tasks deferred to this week"),
  deferAvailable: z.boolean().optional().describe("Show tasks whose defer date has passed (now available)"),

  // 🗓 计划日期过滤
  plannedBefore: z.string().optional().describe("Show tasks planned before this date (ISO format: YYYY-MM-DD)"),
  plannedAfter: z.string().optional().describe("Show tasks planned after this date (ISO format: YYYY-MM-DD)"),
  plannedToday: z.boolean().optional().describe("Show tasks planned for today"),
  plannedThisWeek: z.boolean().optional().describe("Show tasks planned for this week"),
  plannedThisMonth: z.boolean().optional().describe("Show tasks planned for this month"),

  // ✅ 完成日期过滤
  completedBefore: z.string().optional().describe("Show tasks completed before this date (ISO format: YYYY-MM-DD)"),
  completedAfter: z.string().optional().describe("Show tasks completed after this date (ISO format: YYYY-MM-DD)"),
  completedToday: z.boolean().optional().describe("Show tasks completed today"),
  completedThisWeek: z.boolean().optional().describe("Show tasks completed this week"),
  completedThisMonth: z.boolean().optional().describe("Show tasks completed this month"),

  // 🆕 创建日期过滤
  addedBefore: z.string().optional().describe("Show tasks added before this date (ISO format: YYYY-MM-DD). Like completedX filters, this also includes completed tasks in the candidate set."),
  addedAfter: z.string().optional().describe("Show tasks added after this date (ISO format: YYYY-MM-DD). Like completedX filters, this also includes completed tasks in the candidate set."),
  addedToday: z.boolean().optional().describe("Show tasks added today. Includes completed tasks added today."),
  addedThisWeek: z.boolean().optional().describe("Show tasks added this week. Includes completed tasks added this week."),
  addedThisMonth: z.boolean().optional().describe("Show tasks added this month. Includes completed tasks added this month."),

  // 🔄 修改日期过滤 (any mutation: edit, retag, complete, reopen, defer change)
  modifiedBefore: z.string().optional().describe("Show tasks modified before this date (ISO format: YYYY-MM-DD). Modification covers any change including completion, edits, tag changes, and date changes. Like completedX filters, this also includes completed tasks in the candidate set."),
  modifiedAfter: z.string().optional().describe("Show tasks modified after this date (ISO format: YYYY-MM-DD). Modification covers any change including completion, edits, tag changes, and date changes. Useful for incremental sync ('what changed since X'). Like completedX filters, this also includes completed tasks in the candidate set."),
  modifiedToday: z.boolean().optional().describe("Show tasks modified today (any mutation). Includes completed tasks."),
  modifiedThisWeek: z.boolean().optional().describe("Show tasks modified this week (any mutation). Includes completed tasks."),
  modifiedThisMonth: z.boolean().optional().describe("Show tasks modified this month (any mutation). Includes completed tasks."),

  // 🚩 其他维度
  flagged: z.boolean().optional().describe("Filter by flagged status"),
  searchText: z.string().optional().describe("Search in task names and notes"),
  hasEstimate: z.boolean().optional().describe("Filter tasks that have time estimates"),
  estimateMin: z.number().optional().describe("Minimum estimated minutes"),
  estimateMax: z.number().optional().describe("Maximum estimated minutes"),
  hasNote: z.boolean().optional().describe("Filter tasks that have notes"),
  inInbox: z.boolean().optional().describe("Filter tasks in inbox"),

  // 📊 输出控制
  limit: z.number().max(1000).optional().describe("Maximum number of tasks to return (default: 100)"),
  sortBy: z.enum(["name", "dueDate", "deferDate", "plannedDate", "completedDate", "addedDate", "modifiedDate", "flagged", "project"]).optional().describe("Sort results by field"),
  sortOrder: z.enum(["asc", "desc"]).optional().describe("Sort order (default: asc)")
});

export const outputSchema = z.object({
  success: z.boolean(),
  tasks: z.array(z.any()),
  count: z.number(),
  totalCount: z.number(),
  error: z.string().optional()
});

export async function handler(args: z.infer<typeof schema>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  try {
    const result = await filterTasks(args);

    return {
      content: [{ type: "text" as const, text: result.formatted }],
      structuredContent: {
        success: true,
        tasks: result.tasks,
        count: result.tasks.length,
        totalCount: result.totalCount
      }
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return {
      content: [{ type: "text" as const, text: `Error filtering tasks: ${errorMessage}` }],
      structuredContent: { success: false, tasks: [], count: 0, totalCount: 0, error: errorMessage },
      isError: true
    };
  }
}
