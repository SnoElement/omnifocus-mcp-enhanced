import { z } from 'zod/v3';

export const sortBySchema = z.enum([
  'name',
  'dueDate',
  'deferDate',
  'plannedDate',
  'completedDate',
  'addedDate',
  'modifiedDate',
  'flagged',
  'project'
]);

export const sortOrderSchema = z.enum(['asc', 'desc']);

export const taskListOutputSchema = z.object({
  success: z.boolean(),
  tasks: z.array(z.any()),
  count: z.number(),
  totalCount: z.number(),
  error: z.string().optional()
});
