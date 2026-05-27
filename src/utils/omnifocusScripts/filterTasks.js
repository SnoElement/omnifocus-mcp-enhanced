// 修复版本的 filter_tasks
(() => {
  try {
    // 获取参数
    const args = typeof injectedArgs !== 'undefined' ? injectedArgs : {};
    
    const filters = {
      taskStatus: args.taskStatus || null,
      perspective: args.perspective || "all",
      flagged: args.flagged !== undefined ? args.flagged : null,

      // 完成日期过滤器
      completedToday: args.completedToday || false,
      completedYesterday: args.completedYesterday || false,
      completedThisWeek: args.completedThisWeek || false,
      completedThisMonth: args.completedThisMonth || false,
      completedBefore: args.completedBefore || null,
      completedAfter: args.completedAfter || null,

      // 创建日期过滤器
      addedToday: args.addedToday || false,
      addedThisWeek: args.addedThisWeek || false,
      addedThisMonth: args.addedThisMonth || false,
      addedBefore: args.addedBefore || null,
      addedAfter: args.addedAfter || null,

      // 修改日期过滤器
      modifiedToday: args.modifiedToday || false,
      modifiedThisWeek: args.modifiedThisWeek || false,
      modifiedThisMonth: args.modifiedThisMonth || false,
      modifiedBefore: args.modifiedBefore || null,
      modifiedAfter: args.modifiedAfter || null,

      // 其他过滤器
      projectFilter: args.projectFilter || null,
      searchText: args.searchText || null,
      limit: args.limit || 100,
      sortBy: args.sortBy || "name",
      sortOrder: args.sortOrder || "asc"
    };
    
    // 辅助函数
    function getTaskStatus(status) {
      const taskStatusMap = {
        [Task.Status.Available]: "Available",
        [Task.Status.Blocked]: "Blocked",
        [Task.Status.Completed]: "Completed", 
        [Task.Status.Dropped]: "Dropped",
        [Task.Status.DueSoon]: "DueSoon",
        [Task.Status.Next]: "Next",
        [Task.Status.Overdue]: "Overdue"
      };
      return taskStatusMap[status] || "Unknown";
    }
    
    function formatDate(date) {
      if (!date) return null;
      return date.toISOString();
    }
    
    function isToday(date) {
      if (!date) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const checkDate = new Date(date);
      return checkDate >= today && checkDate < tomorrow;
    }
    
    function isYesterday(date) {
      if (!date) return false;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const today = new Date(yesterday);
      today.setDate(yesterday.getDate() + 1);
      const checkDate = new Date(date);
      return checkDate >= yesterday && checkDate < today;
    }

    function isThisWeek(date) {
      if (!date) return false;
      const now = new Date();
      const dayOfWeek = now.getDay(); // Sunday = 0
      const mondayOffset = (dayOfWeek + 6) % 7;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - mondayOffset);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const checkDate = new Date(date);
      return checkDate >= weekStart && checkDate < weekEnd;
    }

    function isThisMonth(date) {
      if (!date) return false;
      const now = new Date();
      const checkDate = new Date(date);
      return checkDate.getFullYear() === now.getFullYear() &&
             checkDate.getMonth() === now.getMonth();
    }
    
    // 获取所有任务
    const allTasks = flattenedTasks;
    
    // 判断是否需要包含完成的任务
    const wantsCompletedTasks = filters.completedToday || filters.completedYesterday ||
                               filters.completedThisWeek || filters.completedThisMonth ||
                               filters.completedBefore || filters.completedAfter;
    const wantsAddedFilter = filters.addedToday || filters.addedThisWeek ||
                            filters.addedThisMonth || filters.addedBefore || filters.addedAfter;
    const wantsModifiedFilter = filters.modifiedToday || filters.modifiedThisWeek ||
                               filters.modifiedThisMonth || filters.modifiedBefore || filters.modifiedAfter;
    const includeCompletedByStatus = filters.taskStatus &&
      (filters.taskStatus.includes("Completed") || filters.taskStatus.includes("Dropped"));

    // 选择任务集 - addedX/modifiedX 也包含已完成任务（与 completedX 行为一致）
    let availableTasks;
    if (wantsCompletedTasks || wantsAddedFilter || wantsModifiedFilter || includeCompletedByStatus) {
      availableTasks = allTasks;
    } else {
      availableTasks = allTasks.filter(task =>
        task.taskStatus !== Task.Status.Completed &&
        task.taskStatus !== Task.Status.Dropped
      );
    }
    
    // 应用透视过滤
    let baseTasks = [];
    switch (filters.perspective) {
      case "inbox":
        baseTasks = availableTasks.filter(task => task.inInbox);
        break;
      case "flagged":
        baseTasks = availableTasks.filter(task => task.flagged);
        break;
      default:
        baseTasks = availableTasks;
        break;
    }
    
    // 应用所有过滤器
    let filteredTasks = baseTasks.filter(task => {
      try {
        const taskStatus = getTaskStatus(task.taskStatus);
        
        // 完成任务逻辑
        if (wantsCompletedTasks) {
          // 只要完成任务
          if (taskStatus !== "Completed") {
            return false;
          }
        } else if (!wantsAddedFilter && !wantsModifiedFilter && !includeCompletedByStatus) {
          // 排除完成任务（除非明确指定状态或正在按 added/modified 过滤）
          if (taskStatus === "Completed" || taskStatus === "Dropped") {
            return false;
          }
        }
        
        // 状态过滤
        if (filters.taskStatus && filters.taskStatus.length > 0) {
          if (!filters.taskStatus.includes(taskStatus)) {
            return false;
          }
        }
        
        // 标记过滤
        if (filters.flagged !== null && task.flagged !== filters.flagged) {
          return false;
        }
        
        // 项目过滤
        if (filters.projectFilter) {
          const projectName = task.containingProject ? task.containingProject.name : '';
          if (!projectName.toLowerCase().includes(filters.projectFilter.toLowerCase())) {
            return false;
          }
        }
        
        // 搜索文本过滤
        if (filters.searchText) {
          const searchLower = filters.searchText.toLowerCase();
          const taskName = (task.name || '').toLowerCase();
          const taskNote = (task.note || '').toLowerCase();
          if (!taskName.includes(searchLower) && !taskNote.includes(searchLower)) {
            return false;
          }
        }
        
        // 完成日期过滤
        if (wantsCompletedTasks) {
          if (filters.completedToday && !isToday(task.completionDate)) {
            return false;
          }
          if (filters.completedYesterday && !isYesterday(task.completionDate)) {
            return false;
          }
          if (filters.completedBefore && task.completionDate &&
              new Date(task.completionDate) >= new Date(filters.completedBefore)) {
            return false;
          }
          if (filters.completedAfter && task.completionDate &&
              new Date(task.completionDate) <= new Date(filters.completedAfter)) {
            return false;
          }
        }

        // 创建日期过滤
        if (wantsAddedFilter) {
          const added = task.added;
          if (!added) return false;
          if (filters.addedToday && !isToday(added)) return false;
          if (filters.addedThisWeek && !isThisWeek(added)) return false;
          if (filters.addedThisMonth && !isThisMonth(added)) return false;
          if (filters.addedBefore && new Date(added) >= new Date(filters.addedBefore)) return false;
          if (filters.addedAfter && new Date(added) <= new Date(filters.addedAfter)) return false;
        }

        // 修改日期过滤
        if (wantsModifiedFilter) {
          const modified = task.modified;
          if (!modified) return false;
          if (filters.modifiedToday && !isToday(modified)) return false;
          if (filters.modifiedThisWeek && !isThisWeek(modified)) return false;
          if (filters.modifiedThisMonth && !isThisMonth(modified)) return false;
          if (filters.modifiedBefore && new Date(modified) >= new Date(filters.modifiedBefore)) return false;
          if (filters.modifiedAfter && new Date(modified) <= new Date(filters.modifiedAfter)) return false;
        }

        return true;
      } catch (error) {
        return false;
      }
    });
    
    // 排序
    if (filters.sortBy === "completedDate") {
      filteredTasks.sort((a, b) => {
        const dateA = a.completionDate || new Date('1900-01-01');
        const dateB = b.completionDate || new Date('1900-01-01');
        return filters.sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      });
    } else if (filters.sortBy === "addedDate") {
      filteredTasks.sort((a, b) => {
        const dateA = a.added || new Date('1900-01-01');
        const dateB = b.added || new Date('1900-01-01');
        return filters.sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      });
    } else if (filters.sortBy === "modifiedDate") {
      filteredTasks.sort((a, b) => {
        const dateA = a.modified || new Date('1900-01-01');
        const dateB = b.modified || new Date('1900-01-01');
        return filters.sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      });
    } else {
      filteredTasks.sort((a, b) => {
        const valueA = a.name || '';
        const valueB = b.name || '';
        if (valueA < valueB) return filters.sortOrder === "desc" ? 1 : -1;
        if (valueA > valueB) return filters.sortOrder === "desc" ? -1 : 1;
        return 0;
      });
    }
    
    // 限制结果数量
    if (filters.limit && filteredTasks.length > filters.limit) {
      filteredTasks = filteredTasks.slice(0, filters.limit);
    }
    
    // 构建返回数据
    const exportData = {
      exportDate: new Date().toISOString(),
      tasks: [],
      totalCount: baseTasks.length,
      filteredCount: filteredTasks.length,
      sortedBy: filters.sortBy,
      sortOrder: filters.sortOrder
    };
    
    // 处理每个任务
    filteredTasks.forEach(task => {
      try {
        const taskData = {
          id: task.id.primaryKey,
          name: task.name,
          note: task.note || "",
          taskStatus: getTaskStatus(task.taskStatus),
          flagged: task.flagged,
          dueDate: formatDate(task.dueDate),
          deferDate: formatDate(task.deferDate),
          plannedDate: formatDate(task.plannedDate),
          completedDate: formatDate(task.completionDate),
          addedDate: formatDate(task.added),
          modifiedDate: formatDate(task.modified),
          estimatedMinutes: task.estimatedMinutes,
          projectId: task.containingProject ? task.containingProject.id.primaryKey : null,
          projectName: task.containingProject ? task.containingProject.name : null,
          inInbox: task.inInbox,
          tags: task.tags.map(tag => ({
            id: tag.id.primaryKey,
            name: tag.name
          }))
        };
        
        exportData.tasks.push(taskData);
      } catch (taskError) {
        // 跳过处理错误的任务
      }
    });
    
    return JSON.stringify(exportData);
    
  } catch (error) {
    return JSON.stringify({
      success: false,
      error: `Error filtering tasks: ${error}`
    });
  }
})();