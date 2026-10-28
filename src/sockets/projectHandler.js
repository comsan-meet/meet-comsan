const stateService = require('../services/stateService');

/**
 * Helper to deduplicate projects array by project id
 */
function deduplicateProjects(projects) {
  if (!Array.isArray(projects)) return [];
  const unique = [];
  const seen = new Set();
  projects.forEach(p => {
    if (p && p.id && !seen.has(p.id)) {
      seen.add(p.id);
      unique.push(p);
    }
  });
  return unique;
}

/**
 * Socket handlers for Club Projects Management
 */
function registerProjectHandlers(io, socket) {
  // 1. Admin creates a project
  socket.on('admin:createProject', (data) => {
    try {
      const state = stateService.getState();
      if (!Array.isArray(state.projects)) state.projects = [];

      const todayISO = new Date().toISOString().slice(0, 10);
      const targetId = (data && data.id ? String(data.id).trim() : '') || `PRJ-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const nowISO = new Date().toISOString();

      const newProject = {
        id: targetId,
        title: (data.title || 'โครงการใหม่').trim(),
        code: (data.code || '').trim(),
        academicYear: (data.academicYear || '').trim(),
        status: data.status || 'IN_PROGRESS', // 'IN_PROGRESS' | 'COMPLETED' | 'PLANNING'
        startDate: data.startDate || todayISO,
        endDate: data.endDate || data.startDate || todayISO,
        location: (data.location || '').trim(),
        budget: (data.budget || '').trim(),
        summary: (data.summary || '').trim(),
        description: (data.description || '').trim(),
        googleDriveUrl: (data.googleDriveUrl || '').trim(),
        photoFolderUrl: (data.photoFolderUrl || '').trim(),
        photoCatalog: Array.isArray(data.photoCatalog) ? data.photoCatalog : [],
        projectDocument: data.projectDocument || { title: '', url: '', updatedAt: todayISO },
        budgetDocument: data.budgetDocument || { title: '', url: '', totalBudget: '', updatedAt: todayISO },
        leaders: Array.isArray(data.leaders) ? data.leaders : [],
        members: Array.isArray(data.members) ? data.members : [],
        advisors: Array.isArray(data.advisors) ? data.advisors : [],
        smoOfficers: Array.isArray(data.smoOfficers) ? data.smoOfficers : [],
        calendarEvents: Array.isArray(data.calendarEvents) ? data.calendarEvents : [],
        showInMainCalendar: data.showInMainCalendar !== undefined ? Boolean(data.showInMainCalendar) : true,
        createdAt: data.createdAt || nowISO,
        updatedAt: nowISO
      };

      // Guard: if project with this ID already exists, update in place instead of duplicating!
      const existingIdx = state.projects.findIndex(p => p.id === targetId);
      if (existingIdx !== -1) {
        state.projects[existingIdx] = {
          ...state.projects[existingIdx],
          ...newProject,
          createdAt: state.projects[existingIdx].createdAt || nowISO,
          updatedAt: nowISO
        };
        state.projects = deduplicateProjects(state.projects);
        stateService.persistAndBroadcast();
        socket.emit('admin:projectUpdated', { success: true, project: state.projects[existingIdx] });
      } else {
        state.projects.unshift(newProject);
        state.projects = deduplicateProjects(state.projects);
        stateService.persistAndBroadcast();
        socket.emit('admin:projectCreated', { success: true, project: newProject });
      }
    } catch (err) {
      console.error('Error creating project:', err);
      socket.emit('admin:projectError', { message: 'เกิดข้อผิดพลาดในการสร้างโครงการ' });
    }
  });

  // 2. Admin updates an existing project
  socket.on('admin:updateProject', (data) => {
    try {
      const state = stateService.getState();
      if (!Array.isArray(state.projects)) state.projects = [];

      const targetId = data && data.id ? String(data.id).trim() : '';
      if (!targetId) {
        return socket.emit('admin:projectError', { message: 'ไม่พบรหัสโครงการที่ต้องการแก้ไข' });
      }

      const nowISO = new Date().toISOString();
      const index = state.projects.findIndex(p => p.id === targetId);

      if (index === -1) {
        // If not found, gracefully create it so edits are never lost
        const todayISO = nowISO.slice(0, 10);
        const fallbackProject = {
          id: targetId,
          title: (data.title || 'โครงการใหม่').trim(),
          code: (data.code || '').trim(),
          academicYear: (data.academicYear || '').trim(),
          status: data.status || 'IN_PROGRESS',
          startDate: data.startDate || todayISO,
          endDate: data.endDate || data.startDate || todayISO,
          location: (data.location || '').trim(),
          budget: (data.budget || '').trim(),
          summary: (data.summary || '').trim(),
          description: (data.description || '').trim(),
          googleDriveUrl: (data.googleDriveUrl || '').trim(),
          photoFolderUrl: (data.photoFolderUrl || '').trim(),
          photoCatalog: Array.isArray(data.photoCatalog) ? data.photoCatalog : [],
          projectDocument: data.projectDocument || { title: '', url: '', updatedAt: todayISO },
          budgetDocument: data.budgetDocument || { title: '', url: '', totalBudget: '', updatedAt: todayISO },
          leaders: Array.isArray(data.leaders) ? data.leaders : [],
          members: Array.isArray(data.members) ? data.members : [],
          advisors: Array.isArray(data.advisors) ? data.advisors : [],
          smoOfficers: Array.isArray(data.smoOfficers) ? data.smoOfficers : [],
          createdAt: data.createdAt || nowISO,
          updatedAt: nowISO
        };
        state.projects.unshift(fallbackProject);
        state.projects = deduplicateProjects(state.projects);
        stateService.persistAndBroadcast();
        return socket.emit('admin:projectCreated', { success: true, project: fallbackProject });
      }

      state.projects[index] = {
        ...state.projects[index],
        title: data.title !== undefined ? String(data.title).trim() : state.projects[index].title,
        code: data.code !== undefined ? String(data.code).trim() : state.projects[index].code,
        academicYear: data.academicYear !== undefined ? String(data.academicYear).trim() : state.projects[index].academicYear,
        status: data.status || state.projects[index].status,
        startDate: data.startDate || state.projects[index].startDate,
        endDate: data.endDate || state.projects[index].endDate,
        location: data.location !== undefined ? String(data.location).trim() : state.projects[index].location,
        budget: data.budget !== undefined ? String(data.budget).trim() : state.projects[index].budget,
        summary: data.summary !== undefined ? String(data.summary).trim() : state.projects[index].summary,
        description: data.description !== undefined ? String(data.description).trim() : state.projects[index].description,
        googleDriveUrl: data.googleDriveUrl !== undefined ? String(data.googleDriveUrl).trim() : state.projects[index].googleDriveUrl,
        photoFolderUrl: data.photoFolderUrl !== undefined ? String(data.photoFolderUrl).trim() : (state.projects[index].photoFolderUrl || ''),
        photoCatalog: Array.isArray(data.photoCatalog) ? data.photoCatalog : (state.projects[index].photoCatalog || []),
        projectDocument: data.projectDocument || state.projects[index].projectDocument,
        budgetDocument: data.budgetDocument || state.projects[index].budgetDocument,
        leaders: Array.isArray(data.leaders) ? data.leaders : state.projects[index].leaders,
        members: Array.isArray(data.members) ? data.members : state.projects[index].members,
        advisors: Array.isArray(data.advisors) ? data.advisors : state.projects[index].advisors,
        smoOfficers: Array.isArray(data.smoOfficers) ? data.smoOfficers : state.projects[index].smoOfficers,
        calendarEvents: Array.isArray(data.calendarEvents) ? data.calendarEvents : (state.projects[index].calendarEvents || []),
        showInMainCalendar: data.showInMainCalendar !== undefined ? Boolean(data.showInMainCalendar) : (state.projects[index].showInMainCalendar !== undefined ? state.projects[index].showInMainCalendar : true),
        updatedAt: nowISO
      };

      state.projects = deduplicateProjects(state.projects);
      stateService.persistAndBroadcast();
      socket.emit('admin:projectUpdated', { success: true, project: state.projects[index] });
    } catch (err) {
      console.error('Error updating project:', err);
      socket.emit('admin:projectError', { message: 'เกิดข้อผิดพลาดในการแก้ไขโครงการ' });
    }
  });

  // 3. Admin deletes a project
  socket.on('admin:deleteProject', (data) => {
    try {
      const state = stateService.getState();
      if (!Array.isArray(state.projects)) return;

      const targetId = (data && typeof data === 'object') ? data.projectId : data;
      if (!targetId) return;

      const beforeLen = state.projects.length;
      state.projects = state.projects.filter(p => p && p.id !== targetId);
      state.projects = deduplicateProjects(state.projects);

      if (state.projects.length !== beforeLen) {
        stateService.persistAndBroadcast();
        socket.emit('admin:projectDeleted', { success: true, projectId: targetId });
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      socket.emit('admin:projectError', { message: 'เกิดข้อผิดพลาดในการลบโครงการ' });
    }
  });

  // 4. Update Project Calendar & Main Calendar visibility
  socket.on('admin:updateProjectCalendar', (data) => {
    try {
      const state = stateService.getState();
      if (!Array.isArray(state.projects)) return;

      const targetId = (data && data.projectId) ? String(data.projectId).trim() : '';
      if (!targetId) return;

      const prj = state.projects.find(p => p && p.id === targetId);
      if (!prj) return;

      if (Array.isArray(data.calendarEvents)) {
        prj.calendarEvents = data.calendarEvents;
      }
      if (data.showInMainCalendar !== undefined) {
        prj.showInMainCalendar = Boolean(data.showInMainCalendar);
      }
      prj.updatedAt = new Date().toISOString();

      state.projects = deduplicateProjects(state.projects);
      stateService.persistAndBroadcast();
      socket.emit('admin:projectCalendarUpdated', { success: true, projectId: targetId, project: prj });
    } catch (err) {
      console.error('Error updating project calendar:', err);
      socket.emit('admin:projectError', { message: 'เกิดข้อผิดพลาดในการอัปเดตปฏิทินโครงการ' });
    }
  });
}

module.exports = registerProjectHandlers;
