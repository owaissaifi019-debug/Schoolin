// supabase.js
// Supabase client initialization for CampusLink
// Uses the Supabase JS CDN loaded via <script> tag in HTML pages.

// ============================================================
// IMPORTANT: Replace these with your actual Supabase credentials
// ============================================================
const SUPABASE_URL = 'https://cfeeqgokzkzblddefhxn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZWVxZ29remt6YmxkZGVmaHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTM1NTIsImV4cCI6MjA5NjA4OTU1Mn0.vzeLfLLeOajdsUaE__jvs_VoxzbvmX0j7p3GVAa26lI';

// The global `supabase` namespace is provided by the CDN script
const _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Expose globally for other scripts
window.CampusLink = window.CampusLink || {};
window.CampusLink.supabase = _supabaseClient;

// Automatically detect and remove external debug JSON injection block from the UI/DOM
(function() {
  const removeDebugBlock = () => {
    const el = document.getElementById('cl-debug-block');
    if (el) {
      el.remove();
    }
  };
  removeDebugBlock();
  
  const observer = new MutationObserver((mutations) => {
    removeDebugBlock();
  });
  
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  
  document.addEventListener('DOMContentLoaded', removeDebugBlock);
  window.addEventListener('load', removeDebugBlock);
})();
