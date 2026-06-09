(() => {
  const taskId = injectedArgs && injectedArgs.taskId ? injectedArgs.taskId : null;
  const taskName = injectedArgs && injectedArgs.taskName ? injectedArgs.taskName : null;

  function formatDate(date) {
    if (!date) {
      return null;
    }

    try {
      return date.toISOString();
    } catch {
      return null;
    }
  }

  function serializeAttachment(wrapper, index) {
    let preferredFilename = null;

    try {
      preferredFilename = wrapper.preferredFilename || null;
    } catch {
      preferredFilename = null;
    }

    return {
      id: `embedded-${index + 1}`,
      name: preferredFilename || `attachment-${index + 1}`,
      sizeBytes: null
    };
  }

  function serializeLinkedFileURL(fileUrl) {
    try {
      return fileUrl.toString();
    } catch {
      return null;
    }
  }

  try {
    if (!taskId && !taskName) {
      throw new Error('Either taskId or taskName must be provided');
    }

    let task = null;

    if (taskId) {
      task = flattenedTasks.find(c => c.id.primaryKey === taskId) || null;
      if (!task) {
        const inbox = (typeof inboxTasks !== 'undefined') ? inboxTasks : [];
        task = inbox.find(c => c.id.primaryKey === taskId) || null;
      }
      if (!task) {
        throw new Error('Task not found with ID "' + taskId + '"');
      }
    } else {
      const flatMatches = flattenedTasks.filter(c => c.name === taskName);
      const inbox = (typeof inboxTasks !== 'undefined') ? inboxTasks : [];
      const inboxMatches = inbox.filter(c => c.name === taskName);
      const matches = flatMatches.concat(inboxMatches);

      if (matches.length === 0) {
        throw new Error('Task not found with name "' + taskName + '"');
      }

      if (matches.length > 1) {
        const summary = matches.slice(0, 5).map(m => {
          const proj = m.containingProject ? m.containingProject.name : 'Inbox';
          return m.id.primaryKey + ' (' + proj + ')';
        }).join('; ');
        throw new Error('Ambiguous match: ' + matches.length + ' tasks named "' + taskName + '". Use taskId to disambiguate. First matches: ' + summary);
      }

      task = matches[0];
    }

    const parentTask = task.parent || null;
    const containingProject = task.containingProject || null;
    const attachments = (task.attachments || []).map((wrapper, index) => serializeAttachment(wrapper, index));
    const linkedFileURLs = (task.linkedFileURLs || [])
      .map(fileUrl => serializeLinkedFileURL(fileUrl))
      .filter(Boolean);

    return JSON.stringify({
      success: true,
      task: {
        id: task.id.primaryKey,
        name: task.name,
        note: task.note || '',
        parentId: parentTask ? parentTask.id.primaryKey : null,
        parentName: parentTask ? parentTask.name : null,
        projectId: containingProject ? containingProject.id.primaryKey : null,
        projectName: containingProject ? containingProject.name : null,
        hasChildren: (task.children || []).length > 0,
        childrenCount: (task.children || []).length,
        tags: (task.tags || []).map(tag => tag.name),
        dueDate: formatDate(task.dueDate),
        deferDate: formatDate(task.deferDate),
        plannedDate: formatDate(task.plannedDate),
        flagged: !!task.flagged,
        completed: !!task.completed,
        estimatedMinutes: task.estimatedMinutes || null,
        attachments,
        linkedFileURLs
      }
    });
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: error && error.message ? error.message : String(error)
    });
  }
})();
