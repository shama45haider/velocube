/* Velocube Client Portal — configuration
   Same Supabase project as the staff panel: clients and agents share one
   database, and row-level security (see admin/supabase-portal.sql) is what
   keeps each client's data private.

   The anon key is safe to ship in front-end code. */
window.VELO_PORTAL_CONFIG = {
  SUPABASE_URL: "https://xfgubbtkajndzzslbuzi.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3ViYnRrYWpuZHp6c2xidXppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNDQwODMsImV4cCI6MjA5OTgyMDA4M30.XLO-N5lm6pc7BEIlXInEg8yMXxzT5l7lSPwzOhfntGk"
};
