export type TaskSortField =
  | 'name'
  | 'project'
  | 'flagged'
  | 'dueDate'
  | 'deferDate'
  | 'plannedDate'
  | 'completedDate'
  | 'addedDate'
  | 'modifiedDate';

export type TaskSortOrder = 'asc' | 'desc';

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function sortTasks(tasks: any[], sortBy: TaskSortField | string = 'name', sortOrder: TaskSortOrder = 'asc'): any[] {
  const copy = [...tasks];
  const direction = sortOrder === 'desc' ? -1 : 1;

  const compareDate = (a: any, b: any, key: string) => {
    const dateA = parseDate(a?.[key]);
    const dateB = parseDate(b?.[key]);
    const valueA = dateA ? dateA.getTime() : Number.POSITIVE_INFINITY;
    const valueB = dateB ? dateB.getTime() : Number.POSITIVE_INFINITY;
    return (valueA - valueB) * direction;
  };

  copy.sort((a: any, b: any) => {
    switch (sortBy) {
      case 'dueDate':
      case 'deferDate':
      case 'plannedDate':
      case 'completedDate':
      case 'addedDate':
      case 'modifiedDate':
        return compareDate(a, b, sortBy);
      case 'flagged': {
        const flaggedA = a?.flagged ? 1 : 0;
        const flaggedB = b?.flagged ? 1 : 0;
        return (flaggedA - flaggedB) * direction;
      }
      case 'project': {
        const projectA = (a?.projectName || '').toLowerCase();
        const projectB = (b?.projectName || '').toLowerCase();
        return projectA.localeCompare(projectB) * direction;
      }
      case 'name':
      default: {
        const nameA = (a?.name || '').toLowerCase();
        const nameB = (b?.name || '').toLowerCase();
        return nameA.localeCompare(nameB) * direction;
      }
    }
  });

  return copy;
}
