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
    this.isUnifiedHub = true;
    if (initialEngine) this.setEngine(initialEngine);
  }

  get connected() {
    return this.engine ? Boolean(this.engine.connected) : true;
  }

  setEngine(newEngine) {
    if (!newEngine) return;
    if (this.engine === newEngine) return;

    // Stop polling on old engine if needed
    if (this.engine && typeof this.engine.stopPolling === 'function') {
      this.engine.stopPolling();
    } else if (this.engine && typeof this.engine.pollInterval === 'number') {
      clearInterval(this.engine.pollInterval);
    }

    this.engine = newEngine;
    this.engine.hub = this;

    // Mirror all registered listeners to newEngine so engine can notify directly if needed
    this.listeners.forEach((fns, evt) => {
      fns.forEach(fn => {
        if (typeof this.engine.on === 'function') {
          this.engine.on(evt, fn);
        }
      });
    });

    console.info(`[SocketHub] Engine switched to: ${newEngine.constructor ? newEngine.constructor.name : 'CustomEngine'}`);
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
    if (this.engine && typeof this.engine.on === 'function') {
      this.engine.on(event, callback);
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
    if (this.engine && typeof this.engine.off === 'function') {
      this.engine.off(event, callback);
    }
  }

  trigger(event, payload) {
    const handlers = this.listeners.get(event);
    if (Array.isArray(handlers)) {
      handlers.forEach(fn => {
        try {
          fn(payload);
        } catch (e) {
          console.error(`[SocketHub] Error in handler for '${event}':`, e);
        }
      });
    }
  }

  emit(event, ...args) {
    if (this.engine && typeof this.engine.emit === 'function') {
      return this.engine.emit(event, ...args);
    } else {
      console.warn(`[SocketHub] emit called with no active engine for event: ${event}`);
    }
  }
}

// Socket Connection Initialization
let activeEngine = null;

// If running in local Node.js environment with active Socket.io
if (typeof io !== 'undefined') {
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocalHost) {
    try {
      activeEngine = io({ autoConnect: true, reconnectionAttempts: 2, timeout: 2000 });
    } catch (e) {
      console.info('Local Socket.io error, falling back to HTTP sync bridge');
    }
  }
}

// Fallback to HTTP Socket Bridge for InfinityFree / Shared Hosting
if (!activeEngine) {
  activeEngine = new HttpSocketBridge();
  activeEngine.startPolling();
}

// Global permanent socket hub
window.socket = new UnifiedSocketHub(activeEngine);

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
