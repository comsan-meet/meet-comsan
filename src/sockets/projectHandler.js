const stateService = require('../services/stateService');

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
      const newProject = {
        id: data.id || `PRJ-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
        projectDocument: data.projectDocument || { title: '', url: '', updatedAt: todayISO },
        budgetDocument: data.budgetDocument || { title: '', url: '', totalBudget: '', updatedAt: todayISO },
        leaders: Array.isArray(data.leaders) ? data.leaders : [],
        members: Array.isArray(data.members) ? data.members : [],
        advisors: Array.isArray(data.advisors) ? data.advisors : [],
        smoOfficers: Array.isArray(data.smoOfficers) ? data.smoOfficers : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      state.projects.unshift(newProject);
      stateService.persistAndBroadcast();
      socket.emit('admin:projectCreated', { success: true, project: newProject });
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

      const index = state.projects.findIndex(p => p.id === data.id);
      if (index === -1) {
        return socket.emit('admin:projectError', { message: 'ไม่พบโครงการที่ต้องการแก้ไข' });
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
        projectDocument: data.projectDocument || state.projects[index].projectDocument,
        budgetDocument: data.budgetDocument || state.projects[index].budgetDocument,
        leaders: Array.isArray(data.leaders) ? data.leaders : state.projects[index].leaders,
        members: Array.isArray(data.members) ? data.members : state.projects[index].members,
        advisors: Array.isArray(data.advisors) ? data.advisors : state.projects[index].advisors,
        smoOfficers: Array.isArray(data.smoOfficers) ? data.smoOfficers : state.projects[index].smoOfficers,
        updatedAt: new Date().toISOString()
      };

      stateService.persistAndBroadcast();
      socket.emit('admin:projectUpdated', { success: true, project: state.projects[index] });
    } catch (err) {
      console.error('Error updating project:', err);
      socket.emit('admin:projectError', { message: 'เกิดข้อผิดพลาดในการแก้ไขโครงการ' });
    }
  });

  // 3. Admin deletes a project
  socket.on('admin:deleteProject', ({ projectId }) => {
    try {
      const state = stateService.getState();
      if (!Array.isArray(state.projects)) return;

      const beforeLen = state.projects.length;
      state.projects = state.projects.filter(p => p.id !== projectId);
      if (state.projects.length !== beforeLen) {
        stateService.persistAndBroadcast();
        socket.emit('admin:projectDeleted', { success: true, projectId });
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      socket.emit('admin:projectError', { message: 'เกิดข้อผิดพลาดในการลบโครงการ' });
    }
  });
}

module.exports = registerProjectHandlers;
