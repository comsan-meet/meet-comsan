/**
 * COMSAN Meeting System - Supabase Configuration & Credentials Provider
 */

window.COMSAN_SUPABASE_CONFIG = {
  // If you want to hardcode your Supabase credentials, paste them here:
  url: '',
  anonKey: '',
  channelName: 'comsan-meeting-room',
  tableName: 'comsan_meeting_state'
};

const SupabaseConfigManager = {
  /**
   * Retrieves active Supabase credentials with precedence:
   * 1. Window config (if provided)
   * 2. LocalStorage (configured via Admin Settings UI)
   * 3. Fetched from serverless /api/config
   */
  async getCredentials() {
    let url = (window.COMSAN_SUPABASE_CONFIG && window.COMSAN_SUPABASE_CONFIG.url) ? window.COMSAN_SUPABASE_CONFIG.url.trim() : '';
    let anonKey = (window.COMSAN_SUPABASE_CONFIG && window.COMSAN_SUPABASE_CONFIG.anonKey) ? window.COMSAN_SUPABASE_CONFIG.anonKey.trim() : '';

    if (!url || !anonKey) {
      try {
        const storedUrl = localStorage.getItem('comsan_supabase_url');
        const storedKey = localStorage.getItem('comsan_supabase_anon_key');
        if (storedUrl && storedKey) {
          url = storedUrl.trim();
          anonKey = storedKey.trim();
        }
      } catch (e) {}
    }

    if (!url || !anonKey) {
      try {
        const resp = await fetch('/api/config');
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.supabaseUrl && data.supabaseAnonKey) {
            url = data.supabaseUrl.trim();
            anonKey = data.supabaseAnonKey.trim();
          }
        }
      } catch (e) {}
    }

    return {
      url,
      anonKey,
      isConfigured: Boolean(url && anonKey)
    };
  },

  saveCredentials(url, anonKey) {
    if (url && anonKey) {
      localStorage.setItem('comsan_supabase_url', url.trim());
      localStorage.setItem('comsan_supabase_anon_key', anonKey.trim());
      return true;
    }
    return false;
  },

  clearCredentials() {
    localStorage.removeItem('comsan_supabase_url');
    localStorage.removeItem('comsan_supabase_anon_key');
  }
};

window.SupabaseConfigManager = SupabaseConfigManager;
