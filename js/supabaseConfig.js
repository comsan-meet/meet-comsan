/**
 * COMSAN Meeting System - Supabase Configuration & Credentials Provider
 */

window.COMSAN_SUPABASE_CONFIG = {
  // Hardcoded Supabase credentials for zero-config global client sync:
  url: 'https://ajqxzoiubsxvetexxnbq.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqcXh6b2l1YnN4dmV0ZXh4bmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4NjkzOTgsImV4cCI6MjEwODQ0NTM5OH0.xZBpsKg6gLMHevPssqDMy2l_nNbwXtVt3h_eqgXzxWY',
  channelName: 'comsan-meeting-room',
  tableName: 'comsan_meeting_state'
};

const SupabaseConfigManager = {
  /**
   * Retrieves active Supabase credentials with precedence:
   * 1. Window config (if provided)
   * 2. LocalStorage (configured via Admin Settings UI)
   * 3. Shared server database config (api/db_config.php)
   * 4. Serverless endpoint (/api/config)
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
      const endpoints = ['api/db_config.php', '/api/db_config.php', '../api/db_config.php', '/api/config'];
      for (const ep of endpoints) {
        try {
          const resp = await fetch(ep);
          if (resp.ok) {
            const data = await resp.json();
            const d = (data && data.data) ? data.data : data;
            if (d && (d.supabase_url || d.supabaseUrl) && (d.supabase_key || d.supabaseAnonKey)) {
              url = (d.supabase_url || d.supabaseUrl).trim();
              anonKey = (d.supabase_key || d.supabaseAnonKey).trim();
              if (url && anonKey) break;
            }
          }
        } catch (e) {}
      }
    }

    return {
      url,
      anonKey,
      isConfigured: Boolean(url && anonKey)
    };
  },

  async saveCredentials(url, anonKey) {
    if (url && anonKey) {
      const cleanUrl = url.trim();
      const cleanKey = anonKey.trim();
      localStorage.setItem('comsan_supabase_url', cleanUrl);
      localStorage.setItem('comsan_supabase_anon_key', cleanKey);

      // Sync to shared PHP server config so all clients connect to same Supabase
      const endpoints = ['api/db_config.php', '/api/db_config.php', '../api/db_config.php'];
      for (const ep of endpoints) {
        try {
          // Try POST first
          const r = await fetch(ep, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ supabase_url: cleanUrl, supabase_key: cleanKey })
          });
          if (r.ok) break;

          // If POST blocked by 403 on InfinityFree, fallback to GET query
          const getUrl = `${ep}?action=save&supabase_url=${encodeURIComponent(cleanUrl)}&supabase_key=${encodeURIComponent(cleanKey)}`;
          const r2 = await fetch(getUrl);
          if (r2.ok) break;
        } catch (e) {}
      }
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
