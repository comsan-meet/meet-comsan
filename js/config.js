/**
 * COMSAN Meeting System - Client Configuration & Network Bridge
 * Supports Socket.io (Node.js), Supabase Realtime (Cloud WebSockets),
 * and Resilient HTTP/PHP Sync Fallback with GET Action Protocol (Bypasses InfinityFree OpenResty 403 errors)
 */

class HttpSocketBridge {
  constructor() {
    this.listeners = new Map();
    this.connected = true;
    this.lastVersion = 0;
    this.pollInterval = null;
    this.isPolling = false;
    this.isHttpBridge = true;
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
      this.listeners.set(event, this.listeners.get(event).filter(fn => fn !== callback));
    }
  }

  trigger(event, payload) {
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

    // 1. Process action locally through ActionReducer immediately for instant UI response
    let reducerResult = { success: true };
    if (typeof window.ActionReducer !== 'undefined') {
      const currentState = (typeof window.appState === 'object' && window.appState) ? window.appState : {};
      try {
        const broadcastFn = (eName, ePayload) => this.trigger(eName, ePayload);
        let res = null;
        if (typeof window.ActionReducer.applyAction === 'function') {
          res = window.ActionReducer.applyAction(currentState, event, payload, broadcastFn);
        } else if (typeof window.ActionReducer.reduce === 'function') {
          res = window.ActionReducer.reduce(currentState, { type: event, payload }, broadcastFn);
        }

        if (res && res.state) {
          window.appState = res.state;
          if (typeof window.saveLocalState === 'function') window.saveLocalState();
          this.trigger('state:update', window.appState);
          if (typeof window.renderAll === 'function') window.renderAll();
        }
        if (res && res.result !== undefined) {
          reducerResult = res.result;
        }
      } catch (e) {
        console.warn('ActionReducer execution error:', e);
      }
    }

    // 2. Invoke callback
    if (typeof callback === 'function') {
      try { callback(reducerResult); } catch (e) {}
    }

    // 3. Persist and sync action to PHP backend
    this.syncActionToServer(event, payload);
  }

  /**
   * Syncs action to PHP backend.
   * Tries lightweight POST first. If InfinityFree OpenResty blocks POST with 403,
   * automatically falls back to GET query parameters.
   */
  async syncActionToServer(action, payload) {
    const endpoints = ['api/state.php', '/api/state.php', '../api/state.php'];
    const u = window.currentUserId || '';
    const r = window.currentRole || 'USER';

    for (const ep of endpoints) {
      let succeeded = false;

      // ATTEMPT 1: Lightweight POST
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, payload, userId: u, role: r })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.version) {
            this.lastVersion = data.version;
          }
          succeeded = true;
          break;
        }
      } catch (postErr) {
        // Fallback to GET on any network or HTTP POST rejection
      }

      // ATTEMPT 2: GET Action Protocol (Bypasses InfinityFree OpenResty 403 POST block)
      if (!succeeded) {
        try {
          let payloadStr = '';
          try {
            payloadStr = encodeURIComponent(JSON.stringify(payload !== undefined ? payload : {}));
          } catch (e) {
            payloadStr = encodeURIComponent(String(payload || ''));
          }

          if (payloadStr.length < 4000) {
            const getUrl = `${ep}?act=${encodeURIComponent(action)}&p=${payloadStr}&u=${encodeURIComponent(u)}&r=${encodeURIComponent(r)}&_t=${Date.now()}`;
            const getRes = await fetch(getUrl);
            if (getRes.ok) {
              const getData = await getRes.json();
              if (getData && getData.version) {
                this.lastVersion = getData.version;
              }
              succeeded = true;
              break;
            }
          }
        } catch (getErr) {
          console.warn('GET Action sync fallback error:', getErr);
        }
      }
    }
  }

  syncStateToServer(action, payload) {
    return this.syncActionToServer(action, payload);
  }

  startPolling() {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(() => this.poll(), 1500);
    this.poll(); // immediate initial poll
  }

  async poll() {
    if (this.isPolling) return;
    this.isPolling = true;
    try {
      const endpoints = [
        `api/state.php?v=${this.lastVersion}&_t=${Date.now()}`,
        `/api/state.php?v=${this.lastVersion}&_t=${Date.now()}`,
        `../api/state.php?v=${this.lastVersion}&_t=${Date.now()}`
      ];
      for (const ep of endpoints) {
        try {
          const r = await fetch(ep);
          if (r.ok) {
            const data = await r.json();
            if (data && data.status === 'success' && data.state && data.version > this.lastVersion) {
              this.lastVersion = data.version;
              const merger = typeof window.mergeProjectsSafely === 'function' ? window.mergeProjectsSafely : null;
              const localProjects = (window.appState && Array.isArray(window.appState.projects)) ? window.appState.projects : [];
              data.state.projects = merger ? merger(localProjects, data.state.projects || []) : (localProjects.length > 0 ? localProjects : (data.state.projects || []));

              if (typeof window.normalizeState === 'function') {
                window.appState = window.normalizeState(data.state);
              } else {
                window.appState = data.state;
              }
              if (typeof window.saveLocalState === 'function') window.saveLocalState();
              this.trigger('state:update', window.appState);
              if (typeof window.renderAll === 'function') window.renderAll();
            }
            break;
          }
        } catch (err) {}
      }
    } catch (e) {
      // Ignore network errors in polling loop
    } finally {
      this.isPolling = false;
    }
  }
}

/**
 * UnifiedSocketHub
 * Ensures window.socket reference NEVER changes, preserving all event listeners
 * registered by app.js or any component across engine switches (Local Socket.io -> HTTP Bridge -> Supabase)
 */
class UnifiedSocketHub {
  constructor(initialEngine) {
    this.listeners = new Map();
    this.engine = null;
    this.localEngine = initialEngine || null;
    this.cloudEngine = null;
    this.isUnifiedHub = true;
    if (initialEngine) this.setEngine(initialEngine);
  }

  get connected() {
    return (this.engine && Boolean(this.engine.connected)) || (this.localEngine && Boolean(this.localEngine.connected));
  }

  setEngine(newEngine) {
    if (!newEngine) return;
    if (this.engine === newEngine) return;

    if (newEngine.constructor && newEngine.constructor.name === 'SupabaseSocketAdapter') {
      this.cloudEngine = newEngine;
    }

    // Stop polling on old engine if needed (only if it's HttpSocketBridge)
    if (this.engine && this.engine !== this.localEngine && typeof this.engine.stopPolling === 'function') {
      this.engine.stopPolling();
    }

    this.engine = newEngine;
    this.engine.hub = this;

    // Forward incoming events from new engine to hub listeners
    if (typeof this.engine.onAny === 'function') {
      this.engine.onAny((event, ...args) => {
        this.trigger(event, ...args);
      });
    } else if (typeof this.engine.on === 'function') {
      for (const event of this.listeners.keys()) {
        this.engine.on(event, (...args) => this.trigger(event, ...args));
      }
    }

    // Reserved socket.io events not handled by onAny
    ['connect', 'disconnect', 'connect_error', 'reconnect'].forEach(resEvent => {
      if (this.engine && typeof this.engine.on === 'function') {
        this.engine.on(resEvent, (...args) => this.trigger(resEvent, ...args));
      }
    });

    // CRITICAL DUAL-HUB: Keep local Socket.io engine alive and receiving events!
    if (this.localEngine && this.localEngine !== this.engine) {
      if (typeof this.localEngine.onAny === 'function') {
        this.localEngine.onAny((event, ...args) => {
          this.trigger(event, ...args);
        });
      }
      ['connect', 'disconnect', 'connect_error', 'reconnect'].forEach(resEvent => {
        if (typeof this.localEngine.on === 'function') {
          this.localEngine.on(resEvent, (...args) => this.trigger(resEvent, ...args));
        }
      });
    }

    console.info(`[SocketHub] Dual-Hub active. Primary: ${newEngine.constructor ? newEngine.constructor.name : 'CustomEngine'}, Local: ${this.localEngine ? (this.localEngine.constructor ? this.localEngine.constructor.name : 'Socket.io') : 'None'}`);
  }

  on(event, callback) {
    if (typeof callback !== 'function') return;
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    const arr = this.listeners.get(event);
    if (!arr.includes(callback)) {
      arr.push(callback);
    }

    // If registering for 'connect' and either engine is already connected, trigger callback immediately
    if (event === 'connect' && this.connected) {
      setTimeout(() => {
        try { callback(); } catch (e) {}
      }, 0);
    }

    // Register on active engine
    if (this.engine && typeof this.engine.on === 'function') {
      if (!this._registeredEvents) this._registeredEvents = new Set();
      if (!this._registeredEvents.has(event)) {
        this._registeredEvents.add(event);
        this.engine.on(event, (...args) => this.trigger(event, ...args));
      }
    }

    // Also register on localEngine if different
    if (this.localEngine && this.localEngine !== this.engine && typeof this.localEngine.on === 'function') {
      this.localEngine.on(event, (...args) => this.trigger(event, ...args));
    }
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

  trigger(event, ...args) {
    const handlers = this.listeners.get(event);
    if (Array.isArray(handlers)) {
      handlers.forEach(fn => {
        try {
          fn(...args);
        } catch (e) {
          console.error(`[SocketHub] Error in handler for '${event}':`, e);
        }
      });
    }
  }

  emit(event, ...args) {
    let res = undefined;

    // 1. Emit to local Socket.io engine (for instant LAN Live Dashboard / Remote control)
    if (this.localEngine && typeof this.localEngine.emit === 'function') {
      try {
        res = this.localEngine.emit(event, ...args);
      } catch (e) {
        console.warn(`[SocketHub] localEngine emit error for ${event}:`, e);
      }
    }

    // 2. Also emit to active engine (e.g. Supabase) if different
    if (this.engine && this.engine !== this.localEngine && typeof this.engine.emit === 'function') {
      try {
        res = this.engine.emit(event, ...args);
      } catch (e) {
        console.warn(`[SocketHub] engine emit error for ${event}:`, e);
      }
    }

    return res;
  }

  scheduleSaveToSupabase(state, immediate = false) {
    if (this.engine && typeof this.engine.scheduleSaveToSupabase === 'function') {
      return this.engine.scheduleSaveToSupabase(state, immediate);
    } else if (window.supabaseSocketAdapter && typeof window.supabaseSocketAdapter.scheduleSaveToSupabase === 'function') {
      return window.supabaseSocketAdapter.scheduleSaveToSupabase(state, immediate);
    }
  }

  get lastKnownProjects() {
    if (this.engine && this.engine.lastKnownProjects) return this.engine.lastKnownProjects;
    if (window.supabaseSocketAdapter && window.supabaseSocketAdapter.lastKnownProjects) return window.supabaseSocketAdapter.lastKnownProjects;
    return (window.appState && Array.isArray(window.appState.projects)) ? window.appState.projects : [];
  }

  set lastKnownProjects(val) {
    if (this.engine) this.engine.lastKnownProjects = val;
    if (window.supabaseSocketAdapter) window.supabaseSocketAdapter.lastKnownProjects = val;
  }
}

// Socket Connection Initialization
let activeEngine = null;

// If running in Node.js environment with active Socket.io (supports localhost, LAN IP, and mobile devices)
if (typeof io !== 'undefined') {
  try {
    activeEngine = io({ autoConnect: true, reconnectionAttempts: 5, timeout: 4000 });
  } catch (e) {
    console.info('Socket.io initialization error, falling back to HTTP sync bridge', e);
  }
}

// Fallback to HTTP Socket Bridge for InfinityFree / Shared Hosting
if (!activeEngine) {
  activeEngine = new HttpSocketBridge();
  activeEngine.startPolling();
}

// Global permanent socket hub
window.socket = new UnifiedSocketHub(activeEngine);

// Guaranteed Cloud Persistence for Projects
window.persistProjectsToCloud = async function(immediate = true) {
  try {
    if (typeof window.saveLocalState === 'function') window.saveLocalState();

    // 1. Supabase adapter scheduleSave
    const sb = (window.supabaseSocketAdapter)
      ? window.supabaseSocketAdapter
      : ((window.socket && window.socket.engine && typeof window.socket.engine.scheduleSaveToSupabase === 'function')
        ? window.socket.engine
        : ((window.socket && typeof window.socket.scheduleSaveToSupabase === 'function') ? window.socket : null));

    if (sb) {
      if (window.appState && Array.isArray(window.appState.projects)) {
        sb.lastKnownProjects = window.appState.projects;
      }
      sb.scheduleSaveToSupabase(window.appState, immediate);
    }

    // 2. Direct REST API fail-safe push to Supabase
    const cfg = window.COMSAN_SUPABASE_CONFIG;
    if (cfg && cfg.url && cfg.anonKey && window.appState) {
      const stateToPush = (sb && typeof sb.prepareStateForBroadcast === 'function')
        ? sb.prepareStateForBroadcast(window.appState)
        : { ...window.appState, activeStream: null };

      stateToPush.projects = Array.isArray(window.appState.projects) ? window.appState.projects : [];

      fetch(`${cfg.url}/rest/v1/comsan_meeting_state?id=eq.current`, {
        method: 'POST',
        headers: {
          'apikey': cfg.anonKey,
          'Authorization': `Bearer ${cfg.anonKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          id: 'current',
          state: stateToPush,
          updated_at: new Date().toISOString()
        })
      }).catch(err => console.warn('Direct cloud persist warning:', err));
    }
  } catch (e) {
    console.warn('persistProjectsToCloud error:', e);
  }
};

// Auto-check and upgrade to Supabase Realtime if credentials exist
(async function initSupabaseCloudIfAvailable() {
  if (typeof window.SupabaseConfigManager !== 'undefined' && typeof window.SupabaseSocketAdapter !== 'undefined') {
    try {
      const creds = await window.SupabaseConfigManager.getCredentials();
      if (creds && creds.isConfigured) {
        console.info('Supabase credentials detected. Connecting to Supabase Cloud Realtime...');
        const supabaseSocket = new window.SupabaseSocketAdapter();
        const ok = await supabaseSocket.init(creds);
        if (ok) {
          if (window.socket && typeof window.socket.setEngine === 'function') {
            window.socket.setEngine(supabaseSocket);
          } else {
            window.socket = supabaseSocket;
          }
          console.info('Switched active socket to Supabase Realtime WebSockets.');
        }
      }
    } catch (err) {
      console.warn('Auto Supabase initialization skipped:', err);
    }
  }
})();

// Audio Notification System (with synthesis fallback)
const audioAssets = {
  notification: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  alert: 'https://assets.mixkit.co/active_storage/sfx/2874/2874-preview.mp3',
  vote: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3',
  spin: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
  win: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'
};

const audioCache = {};
Object.entries(audioAssets).forEach(([key, url]) => {
  try {
    const audio = new Audio(url);
    audio.preload = 'auto';
    audioCache[key] = audio;
  } catch (e) {
    console.warn(`Could not preload audio: ${key}`, e);
  }
});

window.audioCache = audioCache;
