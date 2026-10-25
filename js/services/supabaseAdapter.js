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
      if (this.hub && typeof this.hub.trigger === 'function') {
        this.hub.trigger(event, payload);
        return;
      }
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
          if (event === 'file:upload') {
            this.scheduleSaveToSupabase(window.appState, true);
          } else {
            this.scheduleSaveToSupabase(window.appState);
          }
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
          let payloadToSend = eventPayload;
          if (eventName === 'state:update' && eventPayload) {
            payloadToSend = this.prepareStateForBroadcast(eventPayload);
          } else if (eventName === 'file:upload' && eventPayload) {
            payloadToSend = { ...eventPayload, dataUrl: null, hasContent: true };
          }
          this.channel.send({
            type: 'broadcast',
            event: eventName,
            payload: payloadToSend
          });
        } catch (e) {
          console.warn(`Supabase broadcast failed for ${eventName}:`, e);
        }
      }
    }

    prepareStateForBroadcast(state) {
      if (!state) return state;
      const clone = { ...state, activeStream: null };
      if (Array.isArray(clone.files)) {
        clone.files = clone.files.map(f => {
          if (f.dataUrl && f.dataUrl.length > 25000) {
            return { ...f, dataUrl: null, hasContent: true };
          }
          return f;
        });
      }
      return clone;
    }

    scheduleSaveToSupabase(state, immediate = false) {
      this.pendingStateToSave = state;
      if (this.saveDebounceTimer) clearTimeout(this.saveDebounceTimer);

      const delay = immediate ? 0 : 350;
      this.saveDebounceTimer = setTimeout(async () => {
        if (!this.pendingStateToSave || !this.supabase) return;
        const stateToSave = { ...this.pendingStateToSave, activeStream: null };
        this.pendingStateToSave = null;

        try {
          this.isSaving = true;
          const newUpdatedAt = new Date().toISOString();
          const { error } = await this.supabase
            .from(this.tableName)
            .upsert({
              id: 'current',
              state: stateToSave,
              updated_at: newUpdatedAt
            });

          if (error) {
            console.error('Supabase state upsert error:', error);
          } else {
            this.lastSyncedUpdatedAt = newUpdatedAt;
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
        if (typeof window.SupabaseConfigManager !== 'undefined') {
          credentials = await window.SupabaseConfigManager.getCredentials();
        }
      }

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

        // 4. Start active background state sync polling (every 1.5s - guarantees auto-updates without refresh)
        this.startPolling();

        this.updateCloudStatusBadge(true, 'เชื่อมต่อ Supabase สำเร็จ');
        return true;
      } catch (err) {
        console.error('Supabase initialization failed:', err);
        this.connected = false;
        this.updateCloudStatusBadge(false, 'เชื่อมต่อ Supabase ล้มเหลว');
        return false;
      }
    }

    startPolling() {
      if (this.pollInterval) return;
      this.pollInterval = setInterval(() => this.pollRemoteState(), 1500);
    }

    stopPolling() {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
    }

    async pollRemoteState() {
      if (this.isPolling || this.isSaving || !this.supabase) return;
      this.isPolling = true;
      try {
        const { data, error } = await this.supabase
          .from(this.tableName)
          .select('updated_at')
          .eq('id', 'current')
          .maybeSingle();

        if (!error && data && data.updated_at) {
          // If updated_at is different from our last synced record
          if (data.updated_at !== this.lastSyncedUpdatedAt) {
            const { data: full, error: fullErr } = await this.supabase
              .from(this.tableName)
              .select('state, updated_at')
              .eq('id', 'current')
              .maybeSingle();

            if (!fullErr && full && full.state) {
              this.lastSyncedUpdatedAt = full.updated_at;
              this.lastSyncTimestamp = new Date(full.updated_at).getTime();

              if (typeof window.normalizeState === 'function') {
                window.appState = window.normalizeState(full.state);
              } else {
                window.appState = full.state;
              }
              if (typeof window.saveLocalState === 'function') window.saveLocalState();
              this.triggerLocal('state:update', window.appState);
              if (typeof window.renderAll === 'function') window.renderAll();
            }
          }
        }
      } catch (e) {
        // Ignore background polling glitches
      } finally {
        this.isPolling = false;
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
          this.lastSyncTimestamp = data.updated_at ? new Date(data.updated_at).getTime() : Date.now();
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
          this.lastSyncTimestamp = Date.now();
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
        'file:upload',
        'file:delete',
        'stream:frameUpdate',
        'stream:stopped'
      ];

      broadcastEvents.forEach(evt => {
        this.channel.on('broadcast', { event: evt }, ({ payload }) => {
          if (evt === 'state:update' && payload) {
            // Merge files to preserve local full dataUrl if broadcast omitted it
            if (Array.isArray(payload.files) && window.appState && Array.isArray(window.appState.files)) {
              payload.files.forEach(pf => {
                if (!pf.dataUrl) {
                  const existing = window.appState.files.find(ef => ef.id === pf.id);
                  if (existing && existing.dataUrl) pf.dataUrl = existing.dataUrl;
                }
              });
            }
            if (typeof window.normalizeState === 'function') {
              window.appState = window.normalizeState(payload);
            } else {
              window.appState = payload;
            }
            if (typeof window.saveLocalState === 'function') window.saveLocalState();
            if (typeof window.renderAll === 'function') window.renderAll();
          } else if (evt === 'file:upload' && payload) {
            const state = window.appState;
            if (state) {
              state.files = Array.isArray(state.files) ? state.files : [];
              const idx = state.files.findIndex(f => f.id === payload.id);
              if (idx !== -1) {
                state.files[idx] = payload;
              } else {
                state.files.push(payload);
              }
              if (typeof window.saveLocalState === 'function') window.saveLocalState();
              if (typeof window.renderFileDropSection === 'function') window.renderFileDropSection();
            }
          } else if (evt === 'file:delete' && payload) {
            const state = window.appState;
            if (state && Array.isArray(state.files)) {
              state.files = state.files.filter(f => f.id !== payload);
              if (typeof window.saveLocalState === 'function') window.saveLocalState();
              if (typeof window.renderFileDropSection === 'function') window.renderFileDropSection();
            }
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

        // If meeting is before scheduled start time (early check-in), do not increment minutes yet!
        if (typeof isMeetingBeforeScheduledTime === 'function' && isMeetingBeforeScheduledTime(state.meeting)) {
          return;
        }

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

  window.fetchFileContentFromCloud = async function(fileId) {
    try {
      if (window.socket && window.socket.engine && window.socket.engine.supabase) {
        const sb = window.socket.engine.supabase;
        const { data, error } = await sb
          .from('comsan_meeting_state')
          .select('state')
          .eq('id', 'current')
          .maybeSingle();

        if (!error && data && data.state && Array.isArray(data.state.files)) {
          const remoteF = data.state.files.find(item => item.id === fileId);
          if (remoteF && remoteF.dataUrl) {
            const localF = (window.appState && Array.isArray(window.appState.files))
              ? window.appState.files.find(item => item.id === fileId)
              : null;
            if (localF) localF.dataUrl = remoteF.dataUrl;
            return remoteF.dataUrl;
          }
        }
      }
    } catch (e) {
      console.warn('fetchFileContentFromCloud error:', e);
    }
    return null;
  };
})();
