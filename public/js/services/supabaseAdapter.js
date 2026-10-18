/**
 * COMSAN Meeting System - Supabase Realtime & Persistence Adapter
 * Provides a 100% Socket.io-compatible interface over Supabase Realtime Channels & PostgreSQL
 */

(function () {
  class SupabaseSocketAdapter {
    constructor() {
      this.listeners = new Map();
      this.connected = false;
      this.supabase = null;
      this.channel = null;
      this.tableName = 'comsan_meeting_state';
      this.channelName = 'comsan-meeting-room';
      this.saveDebounceTimer = null;
      this.pendingStateToSave = null;
      this.attendanceTimer = null;
      this.lastSyncTimestamp = 0;
      this.isSaving = false;
    }

    on(event, callback) {
      if (typeof callback !== 'function') return;
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    }

    off(event, callback) {
      if (!this.listeners.has(event)) return;
      if (!callback) {
        this.listeners.delete(event);
      } else {
        const arr = this.listeners.get(event).filter(fn => fn !== callback);
        this.listeners.set(event, arr);
      }
    }

    triggerLocal(event, payload) {
      const handlers = this.listeners.get(event);
      if (Array.isArray(handlers)) {
        handlers.forEach(fn => {
          try { fn(payload); } catch (e) { console.error(`Error in listener for ${event}:`, e); }
        });
      }
    }

    emit(event, ...args) {
      let callback = null;
      let payload = undefined;

      if (args.length > 0 && typeof args[args.length - 1] === 'function') {
        callback = args.pop();
      }
      if (args.length > 0) {
        payload = args[0];
      }

      // 1. Process action locally through ActionReducer
      const currentState = (typeof window.appState === 'object' && window.appState) ? window.appState : {};
      
      const broadcastFn = (eventName, eventPayload) => {
        this.broadcastEvent(eventName, eventPayload);
      };

      if (typeof window.ActionReducer !== 'undefined' && typeof window.ActionReducer.applyAction === 'function') {
        const { state: newState, result, shouldPersist } = window.ActionReducer.applyAction(
          currentState,
          event,
          payload,
          broadcastFn
        );

        if (newState) {
          window.appState = newState;
          if (typeof window.saveLocalState === 'function') window.saveLocalState();
          if (typeof window.renderAll === 'function') window.renderAll();
        }

        // Return callback response immediately
        if (typeof callback === 'function') {
          callback(result);
        }

        // Persist to Supabase and broadcast state to all clients
        if (shouldPersist && this.supabase) {
          this.scheduleSaveToSupabase(window.appState);
          this.broadcastEvent('state:update', window.appState);
        }
      } else {
        console.warn('ActionReducer not available for action:', event);
        if (typeof callback === 'function') callback({ ok: false, message: 'Reducer unavailable' });
      }
    }

    broadcastEvent(eventName, eventPayload) {
      // Trigger locally
      this.triggerLocal(eventName, eventPayload);

      // Broadcast over Supabase Realtime channel
      if (this.channel) {
        try {
          this.channel.send({
            type: 'broadcast',
            event: eventName,
            payload: eventPayload
          });
        } catch (e) {
          console.warn(`Supabase broadcast failed for ${eventName}:`, e);
        }
      }
    }

    scheduleSaveToSupabase(state) {
      this.pendingStateToSave = state;
      if (this.saveDebounceTimer) clearTimeout(this.saveDebounceTimer);

      this.saveDebounceTimer = setTimeout(async () => {
        if (!this.pendingStateToSave || !this.supabase) return;
        const stateToSave = { ...this.pendingStateToSave, activeStream: null };
        this.pendingStateToSave = null;

        try {
          this.isSaving = true;
          const { error } = await this.supabase
            .from(this.tableName)
            .upsert({
              id: 'current',
              state: stateToSave,
              updated_at: new Date().toISOString()
            });

          if (error) {
            console.error('Supabase state upsert error:', error);
          } else {
            this.lastSyncTimestamp = Date.now();
            this.updateCloudStatusBadge(true, 'ซิงค์ข้อมูลกับ Supabase แล้ว');
          }
        } catch (err) {
          console.error('Failed to save to Supabase:', err);
        } finally {
          this.isSaving = false;
        }
      }, 350);
    }

    async init(credentials) {
      if (!credentials || !credentials.url || !credentials.anonKey) {
        console.warn('Supabase credentials missing.');
        this.updateCloudStatusBadge(false, 'ยังไม่ได้เชื่อมต่อ Supabase');
        return false;
      }

      if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
        console.error('Supabase JS library not loaded.');
        return false;
      }

      try {
        this.supabase = window.supabase.createClient(credentials.url, credentials.anonKey);
        this.connected = true;

        // 1. Fetch initial active state from Supabase
        await this.syncInitialState();

        // 2. Setup Realtime Channel
        this.setupRealtimeChannel();

        // 3. Start client-side attendance timer
        this.startAttendanceTimer();

        this.updateCloudStatusBadge(true, 'เชื่อมต่อ Supabase สำเร็จ');
        return true;
      } catch (err) {
        console.error('Supabase initialization failed:', err);
        this.connected = false;
        this.updateCloudStatusBadge(false, 'เชื่อมต่อ Supabase ล้มเหลว');
        return false;
      }
    }

    async syncInitialState() {
      if (!this.supabase) return;
      try {
        const { data, error } = await this.supabase
          .from(this.tableName)
          .select('state, updated_at')
          .eq('id', 'current')
          .maybeSingle();

        if (error) {
          console.error('Error fetching initial state from Supabase:', error);
          return;
        }

        if (data && data.state) {
          if (typeof window.normalizeState === 'function') {
            window.appState = window.normalizeState(data.state);
          } else {
            window.appState = data.state;
          }
          if (typeof window.saveLocalState === 'function') window.saveLocalState();
          this.triggerLocal('state:update', window.appState);
          if (typeof window.renderAll === 'function') window.renderAll();
        } else {
          // If no state exists in database yet, seed with current local state
          const stateToSeed = window.appState || {};
          await this.supabase.from(this.tableName).upsert({
            id: 'current',
            state: stateToSeed,
            updated_at: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error('Sync initial state failed:', err);
      }
    }

    setupRealtimeChannel() {
      if (!this.supabase) return;

      const myId = window.currentUserId || ('guest_' + Math.random().toString(36).slice(2, 8));

      this.channel = this.supabase.channel(this.channelName, {
        config: {
          presence: { key: myId },
          broadcast: { self: false }
        }
      });

      // Handle Broadcast events from other devices
      const broadcastEvents = [
        'state:update',
        'alert:raiseHand',
        'notify:chat',
        'notify:event',
        'random:spin',
        'stream:frameUpdate',
        'stream:stopped'
      ];

      broadcastEvents.forEach(evt => {
        this.channel.on('broadcast', { event: evt }, ({ payload }) => {
          if (evt === 'state:update' && payload) {
            if (typeof window.normalizeState === 'function') {
              window.appState = window.normalizeState(payload);
            } else {
              window.appState = payload;
            }
            if (typeof window.saveLocalState === 'function') window.saveLocalState();
            if (typeof window.renderAll === 'function') window.renderAll();
          }
          this.triggerLocal(evt, payload);
        });
      });

      // Presence for online count
      this.channel.on('presence', { event: 'sync' }, () => {
        const presenceState = this.channel.presenceState();
        const activeCount = Object.keys(presenceState).length || 1;
        this.triggerLocal('clients:count', activeCount);
      });

      // Postgres table changes as reliable fallback
      this.channel.on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: this.tableName,
        filter: 'id=eq.current'
      }, (payload) => {
        if (payload.new && payload.new.state && !this.isSaving) {
          if (typeof window.normalizeState === 'function') {
            window.appState = window.normalizeState(payload.new.state);
          } else {
            window.appState = payload.new.state;
          }
          if (typeof window.saveLocalState === 'function') window.saveLocalState();
          this.triggerLocal('state:update', window.appState);
          if (typeof window.renderAll === 'function') window.renderAll();
        }
      });

      // Subscribe to channel
      this.channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.channel.track({
            userId: myId,
            role: window.currentRole || 'USER',
            onlineAt: new Date().toISOString()
          });
        }
      });
    }

    startAttendanceTimer() {
      if (this.attendanceTimer) clearInterval(this.attendanceTimer);

      this.attendanceTimer = setInterval(() => {
        const state = window.appState;
        if (!state || !state.meeting || !state.meeting.isStarted || state.meeting.isEnded) return;

        // Only host/admin or active tab increments minutes
        const isAdmin = window.currentRole === 'ADMIN' && window.isAdminAuthenticated;
        if (!isAdmin) return;

        const nowMs = Date.now();
        let changed = false;

        (state.users || []).forEach(u => {
          if (u.checkedIn && u.checkInTimestamp && !u.isLeave) {
            const baseTime = Math.max(u.checkInTimestamp, state.meeting.startedAtMs || u.checkInTimestamp);
            const mins = Math.max(1, Math.floor((nowMs - baseTime) / 60000));
            if (u.attendedMinutes !== mins) {
              u.attendedMinutes = mins;
              changed = true;
            }
          }
        });

        if (changed) {
          if (typeof window.saveLocalState === 'function') window.saveLocalState();
          this.scheduleSaveToSupabase(state);
          this.broadcastEvent('state:update', state);
          if (typeof window.renderAll === 'function') window.renderAll();
        }
      }, 10000);
    }

    updateCloudStatusBadge(isConnected, message) {
      const badges = document.querySelectorAll('.supabase-status-badge');
      badges.forEach(badge => {
        if (isConnected) {
          badge.className = 'supabase-status-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
          badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span><span>Supabase เชื่อมต่อแล้ว</span>`;
          badge.title = message || 'เชื่อมต่อ Supabase Realtime & Database เรียบร้อย';
        } else {
          badge.className = 'supabase-status-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 cursor-pointer';
          badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span><span>ออฟไลน์ / รอตั้งค่า Supabase</span>`;
          badge.title = message || 'คลิกเพื่อตั้งค่าการเชื่อมต่อ Supabase';
        }
      });
    }
  }

  window.SupabaseSocketAdapter = SupabaseSocketAdapter;
})();
