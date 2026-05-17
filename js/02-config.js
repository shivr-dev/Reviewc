    const WEIGHT_DEFAULT = 100, WEIGHT_MAX = 600, WEIGHT_MIN = 5, REVIEW_BOOST_DAYS = 3;
    let masteryThreshold = 5;

    const SUPABASE_URL = 'https://ltnlmgtoqecvctyeetma.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0bmxtZ3RvcWVjdmN0eWVldG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjM4MTAsImV4cCI6MjA4OTYzOTgxMH0.OB5An1HAkEiASsE_cV1KoFCWBcyYQGUPa6BKsM6LwaI';
    const ALL_PANELS = ['setup-panel', 'wrong-sidebar', 'settings', 'resource-center', 'upload-modal'];

    var supabase = null;
    function initSupabase() {
      if (supabase) return supabase;
      if (!window.supabase) return null;
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      return supabase;
    }
    initSupabase();
    function db() {
      const sb = initSupabase();
      if (!sb) throw new Error('数据库 SDK 未加载，请刷新页面');
      return sb;
    }
