const stateService = require('../services/stateService');

/**
 * Socket handlers for Club Calendar & Tasks Management
 */
function registerCalendarHandlers(io, socket) {
  // 1. Admin creates calendar event manually
  socket.on('admin:addCalendarEvent', (data) => {
    try {
      const state = stateService.getState();
      if (!Array.isArray(state.calendarEvents)) state.calendarEvents = [];

      const newEvent = {
        id: data.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: (data.title || 'กิจกรรมใหม่').trim(),
        description: (data.description || '').trim(),
        startDate: data.startDate || new Date().toISOString().slice(0, 10),
        startTime: data.startTime || '09:00',
        endDate: data.endDate || data.startDate || new Date().toISOString().slice(0, 10),
        endTime: data.endTime || '12:00',
        isAllDay: Boolean(data.isAllDay),
        location: (data.location || '').trim(),
        category: data.category || 'EVENT', // 'EVENT' | 'MEETING' | 'DEADLINE' | 'WORKSHOP' | 'OTHER'
        color: data.color || 'indigo',
        assignees: Array.isArray(data.assignees) ? data.assignees : [],
        createdSource: data.createdSource || 'MANUAL',
        createdAt: new Date().toISOString()
      };

      state.calendarEvents.unshift(newEvent);
      stateService.persistAndBroadcast();
      socket.emit('admin:calendarEventAdded', { success: true, event: newEvent });
    } catch (err) {
      console.error('Error adding calendar event:', err);
      socket.emit('admin:calendarError', { message: 'เกิดข้อผิดพลาดในการบันทึกงาน' });
    }
  });

  // 2. Admin updates an existing calendar event
  socket.on('admin:updateCalendarEvent', (data) => {
    try {
      const state = stateService.getState();
      if (!Array.isArray(state.calendarEvents)) state.calendarEvents = [];

      const index = state.calendarEvents.findIndex(e => e.id === data.id);
      if (index === -1) {
        return socket.emit('admin:calendarError', { message: 'ไม่พบกิจกรรมที่ต้องการแก้ไข' });
      }

      state.calendarEvents[index] = {
        ...state.calendarEvents[index],
        title: (data.title || state.calendarEvents[index].title).trim(),
        description: (data.description !== undefined ? data.description : state.calendarEvents[index].description).trim(),
        startDate: data.startDate || state.calendarEvents[index].startDate,
        startTime: data.startTime || state.calendarEvents[index].startTime,
        endDate: data.endDate || state.calendarEvents[index].endDate,
        endTime: data.endTime || state.calendarEvents[index].endTime,
        isAllDay: data.isAllDay !== undefined ? Boolean(data.isAllDay) : state.calendarEvents[index].isAllDay,
        location: (data.location !== undefined ? data.location : state.calendarEvents[index].location).trim(),
        category: data.category || state.calendarEvents[index].category,
        color: data.color || state.calendarEvents[index].color,
        assignees: Array.isArray(data.assignees) ? data.assignees : state.calendarEvents[index].assignees,
        updatedAt: new Date().toISOString()
      };

      stateService.persistAndBroadcast();
      socket.emit('admin:calendarEventUpdated', { success: true, event: state.calendarEvents[index] });
    } catch (err) {
      console.error('Error updating calendar event:', err);
      socket.emit('admin:calendarError', { message: 'เกิดข้อผิดพลาดในการแก้ไขงาน' });
    }
  });

  // 3. Admin deletes a calendar event
  socket.on('admin:deleteCalendarEvent', ({ eventId }) => {
    try {
      const state = stateService.getState();
      if (!Array.isArray(state.calendarEvents)) return;

      const beforeLen = state.calendarEvents.length;
      state.calendarEvents = state.calendarEvents.filter(e => e.id !== eventId);
      if (state.calendarEvents.length !== beforeLen) {
        stateService.persistAndBroadcast();
        socket.emit('admin:calendarEventDeleted', { success: true, eventId });
      }
    } catch (err) {
      console.error('Error deleting calendar event:', err);
      socket.emit('admin:calendarError', { message: 'เกิดข้อผิดพลาดในการลบงาน' });
    }
  });

  // 4. Admin bulk imports events from ICS
  socket.on('admin:importCalendarEvents', ({ events }) => {
    try {
      if (!Array.isArray(events) || events.length === 0) {
        return socket.emit('admin:calendarError', { message: 'ไม่พบรายการกิจกรรมสำหรับนำเข้า' });
      }

      const state = stateService.getState();
      if (!Array.isArray(state.calendarEvents)) state.calendarEvents = [];

      let addedCount = 0;
      for (const raw of events) {
        if (!raw.title) continue;
        const newEvent = {
          id: raw.id || `evt_ics_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: String(raw.title || 'กิจกรรมชมรม').trim(),
          description: String(raw.description || '').trim(),
          startDate: raw.startDate || new Date().toISOString().slice(0, 10),
          startTime: raw.startTime || '09:00',
          endDate: raw.endDate || raw.startDate || new Date().toISOString().slice(0, 10),
          endTime: raw.endTime || '10:00',
          isAllDay: Boolean(raw.isAllDay),
          location: String(raw.location || '').trim(),
          category: raw.category || 'EVENT',
          color: raw.color || 'indigo',
          assignees: Array.isArray(raw.assignees) ? raw.assignees : [],
          createdSource: 'ICS_IMPORT',
          createdAt: new Date().toISOString()
        };
        state.calendarEvents.push(newEvent);
        addedCount++;
      }

      stateService.persistAndBroadcast();
      socket.emit('admin:calendarImportSuccess', { success: true, addedCount });
    } catch (err) {
      console.error('Error importing calendar events:', err);
      socket.emit('admin:calendarError', { message: 'เกิดข้อผิดพลาดในการนำเข้าไฟล์ ICS' });
    }
  });

  // 5. Admin clears all calendar events
  socket.on('admin:clearAllCalendarEvents', () => {
    try {
      const state = stateService.getState();
      state.calendarEvents = [];
      stateService.persistAndBroadcast();
      socket.emit('admin:calendarCleared', { success: true });
    } catch (err) {
      console.error('Error clearing calendar events:', err);
      socket.emit('admin:calendarError', { message: 'เกิดข้อผิดพลาดในการล้างข้อมูลปฏิทิน' });
    }
  });
}

module.exports = registerCalendarHandlers;
