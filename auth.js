// auth.js
// CampusLink Authentication Module
// Provides signup, login, logout, session management, and auth guards.
// Depends on supabase.js being loaded first (sets window.CampusLink.supabase).

(function () {
  'use strict';

  const AUTH_REDIRECT_LOGIN = 'login.html';
  const AUTH_REDIRECT_DASHBOARD = 'dashboard.html';
  const AUTH_REDIRECT_HOME = 'index.html';

  function getClient() {
    return window.CampusLink && window.CampusLink.supabase;
  }

  // ── Sign Up ──────────────────────────────────────────────
  // Creates a Supabase auth user, then inserts a linked school row.
  async function signUp(email, password, schoolData) {
    const sb = getClient();
    if (!sb) throw new Error('Supabase client not initialised');

    // 1. Create auth user
    const { data: authData, error: authError } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          school_name: schoolData.name,
          school_city: schoolData.city,
          school_board: schoolData.board || null,
          role: 'school_admin'
        }
      }
    });

    if (authError) throw authError;

    const user = authData.user;
    if (!user) throw new Error('Signup succeeded but no user returned');

    // 2. Create school row linked to user
    let schoolError = null;
    // Only attempt insert if we have an active session (otherwise, it will fail due to RLS policies
    // and will instead be auto-provisioned upon their first login / dashboard load).
    if (authData.session) {
      const { error } = await sb.from('schools').insert({
        name: schoolData.name,
        city: schoolData.city,
        board: schoolData.board || null,
        admin_user_id: user.id,
        contact_email: email,
        logo_letter: schoolData.name.charAt(0).toUpperCase(),
        color_class: 'bg-gradient-1'
      });
      schoolError = error;
    }

    if (schoolError) {
      console.error('School insert failed:', schoolError);
    }

    return { 
      user, 
      session: authData.session,
      emailConfirmationRequired: !authData.session 
    };
  }

  // ── Sign In ──────────────────────────────────────────────
  async function signIn(email, password) {
    const sb = getClient();
    if (!sb) throw new Error('Supabase client not initialised');

    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data; // { user, session }
  }

  // ── Sign Out ─────────────────────────────────────────────
  async function signOut() {
    const sb = getClient();
    if (!sb) return;

    await sb.auth.signOut();
    window.location.href = AUTH_REDIRECT_HOME;
  }

  // ── Session Helpers ──────────────────────────────────────
  async function getSession() {
    const sb = getClient();
    if (!sb) return null;

    const { data: { session } } = await sb.auth.getSession();
    return session;
  }

  async function getUser() {
    const session = await getSession();
    return session ? session.user : null;
  }

  // ── Get School for Current User ──────────────────────────
  async function getSchoolForUser(userId) {
    const sb = getClient();
    if (!sb) return null;

    let { data, error } = await sb
      .from('schools')
      .select('*')
      .eq('admin_user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Could not fetch school for user:', error.message);
      return null;
    }

    // Auto-provisioning fallback: if school row is missing (e.g. signup occurred without session due to email verification),
    // we insert it now that the user is authenticated and RLS permits the insert.
    if (!data) {
      try {
        const { data: { user } } = await sb.auth.getUser();
        if (user && user.id === userId && user.user_metadata) {
          const meta = user.user_metadata;
          if (meta.school_name) {
            console.log('School row missing for authenticated user. Attempting to provision school from user metadata...');
            const { data: newSchool, error: insertError } = await sb
              .from('schools')
              .insert({
                name: meta.school_name,
                city: meta.school_city || '',
                board: meta.school_board || null,
                admin_user_id: userId,
                contact_email: user.email,
                logo_letter: meta.school_name.charAt(0).toUpperCase(),
                color_class: 'bg-gradient-1'
              })
              .select()
              .maybeSingle();

            if (!insertError && newSchool) {
              console.log('Successfully provisioned school row:', newSchool);
              return newSchool;
            } else {
              console.error('Failed to provision school row:', insertError);
            }
          }
        }
      } catch (err) {
        console.error('Error during auto-provisioning school row:', err);
      }
    }

    return data;
  }

  // ── Auth Guard ───────────────────────────────────────────
  // Call on protected pages (dashboard). Redirects if not authenticated.
  async function requireAuth() {
    const session = await getSession();
    if (!session) {
      window.location.href = AUTH_REDIRECT_LOGIN;
      return null;
    }
    return session;
  }

  // ── Auth State Listener ──────────────────────────────────
  function onAuthStateChange(callback) {
    const sb = getClient();
    if (!sb) return;

    sb.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }

  // ── Update Nav for Auth State ────────────────────────────
  // Called on every public page to swap Login/Register buttons
  // based on whether the user is signed in.
  async function updateNavAuthState() {
    const session = await getSession();
    const loginBtn = document.getElementById('nav-btn-signin');
    const joinBtn = document.getElementById('nav-btn-join');
    const mobileLogin = document.getElementById('mobile-nav-login');
    const mobileRegister = document.getElementById('mobile-nav-register');

    if (session && session.user) {
      // User is logged in
      const user = session.user;
      const schoolName = user.user_metadata?.school_name || 'My School';
      const initial = schoolName.charAt(0).toUpperCase();

      // Desktop nav
      if (loginBtn) {
        loginBtn.href = AUTH_REDIRECT_DASHBOARD;
        loginBtn.textContent = 'Dashboard';
        loginBtn.classList.remove('btn-secondary');
        loginBtn.classList.add('btn-primary');
      }

      if (joinBtn) {
        // Replace Register button with avatar + logout
        const parent = joinBtn.parentElement;
        joinBtn.style.display = 'none';

        const userPill = document.createElement('div');
        userPill.className = 'nav-user-pill';
        userPill.innerHTML = `
          <div class="nav-user-avatar">${initial}</div>
          <span class="nav-user-name">${schoolName}</span>
          <button class="nav-logout-btn" id="nav-logout-btn" title="Logout">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        `;
        parent.appendChild(userPill);

        // Bind logout
        const logoutBtn = document.getElementById('nav-logout-btn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await signOut();
          });
        }
      }

      // Mobile nav
      if (mobileLogin) {
        mobileLogin.href = AUTH_REDIRECT_DASHBOARD;
        mobileLogin.textContent = 'Dashboard';
      }
      if (mobileRegister) {
        mobileRegister.textContent = 'Logout';
        mobileRegister.classList.remove('btn-modal-trigger');
        mobileRegister.href = '#';
        mobileRegister.addEventListener('click', async (e) => {
          e.preventDefault();
          await signOut();
        });
      }
    } else {
      // Not logged in — point Login to login.html
      if (loginBtn) {
        loginBtn.href = AUTH_REDIRECT_LOGIN;
      }
      if (mobileLogin) {
        mobileLogin.href = AUTH_REDIRECT_LOGIN;
      }
    }
  }

  // ── Expose API ───────────────────────────────────────────
  window.CampusLink = window.CampusLink || {};
  window.CampusLink.auth = {
    signUp,
    signIn,
    signOut,
    getSession,
    getUser,
    getSchoolForUser,
    requireAuth,
    onAuthStateChange,
    updateNavAuthState
  };

})();
