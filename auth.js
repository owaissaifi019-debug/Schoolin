// auth.js
// SchoolIn Authentication Module
// Provides signup, login, logout, session management, and auth guards.
// Depends on supabase.js being loaded first (sets window.CampusLink.supabase).

(function () {
  'use strict';

  const AUTH_REDIRECT_LOGIN = 'login.html';
  const AUTH_REDIRECT_DASHBOARD = 'dashboard.html';
  const AUTH_REDIRECT_HOME = 'index.html';

  // Valid user types that can be selected during signup
  const VALID_USER_TYPES = ['student', 'teacher', 'parent', 'alumni', 'school_representative'];

  function getClient() {
    return window.CampusLink && window.CampusLink.supabase;
  }

  // ── Sign Up ──────────────────────────────────────────────
  // Creates a Supabase auth user with profile metadata.
  // platform_role is NEVER sent from client — the DB trigger forces 'user'.
  async function signUp(email, password, fullName, userType, avatarFile) {
    const sb = getClient();
    if (!sb) throw new Error('Supabase client not initialised');

    // Validate user type
    if (!VALID_USER_TYPES.includes(userType)) {
      throw new Error('Invalid user type selected');
    }

    // 1. Upload avatar if provided
    let avatarUrl = null;
    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await sb.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.warn('Avatar upload failed:', uploadError.message);
        // Continue without avatar — don't block signup
      } else {
        const { data: urlData } = sb.storage.from('avatars').getPublicUrl(filePath);
        avatarUrl = urlData?.publicUrl || null;
      }
    }

    // 2. Create auth user
    const { data: authData, error: authError } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          user_type: userType,
          avatar_url: avatarUrl
          // NOTE: platform_role is intentionally NOT sent here.
          // The DB trigger always sets it to 'user'.
        }
      }
    });

    if (authError) throw authError;

    const user = authData.user;
    if (!user) throw new Error('Signup succeeded but no user returned');

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

    if (data) {
      try {
        const { data: profile } = await sb
          .from('profiles')
          .select('school_id')
          .eq('id', userId)
          .maybeSingle();
        
        if (profile && profile.school_id !== data.id) {
          console.log('Syncing school_id on profile for user:', userId);
          await sb
            .from('profiles')
            .update({ school_id: data.id })
            .eq('id', userId);
        }
      } catch (syncErr) {
        console.warn('Failed to sync school_id on profile:', syncErr);
      }
    }

    // Auto-provisioning fallback: if school row is missing, insert it now
    // Only for school_representative users with school_admin platform_role
    if (!data) {
      try {
        const profile = await getProfile(userId);
        const { data: { user } } = await sb.auth.getUser();

        if (user && user.id === userId && profile) {
          // Only provision a school record for school_admin platform_role users
          if (profile.platform_role === 'school_admin' && profile.user_type === 'school_representative') {
            const meta = user.user_metadata;
            const schoolName = meta?.school_name || profile.full_name || 'My School';
            console.log('School row missing for authenticated school admin. Attempting to provision...');

            const { data: newSchool, error: insertError } = await sb
              .from('schools')
              .insert({
                name: schoolName,
                city: meta?.school_city || '',
                board: meta?.school_board || null,
                admin_user_id: userId,
                contact_email: user.email,
                logo_letter: schoolName.charAt(0).toUpperCase(),
                color_class: 'bg-gradient-1'
              })
              .select()
              .maybeSingle();

            if (!insertError && newSchool) {
              console.log('Successfully provisioned school row:', newSchool);
              // Associate the new school with the admin's profile
              await sb
                .from('profiles')
                .update({ school_id: newSchool.id })
                .eq('id', userId);
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

  // ── Get Role/Profile helpers ─────────────────────────────
  async function getProfile(userId) {
    const sb = getClient();
    if (!sb) return null;
    const { data, error } = await sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('Could not fetch user profile:', error.message);
      return null;
    }
    return data;
  }

  async function getUserRole() {
    const session = await getSession();
    if (!session || !session.user) return null;

    // Fail-safe check for primary super admin
    if (session.user.email === 'owaissaifi019@gmail.com') {
      return 'super_admin';
    }

    // Attempt profile query for platform_role
    const profile = await getProfile(session.user.id);
    if (profile) return profile.platform_role;

    // Fallback — all new users are 'user'
    return 'user';
  }

  async function getUserType() {
    const session = await getSession();
    if (!session || !session.user) return null;

    const profile = await getProfile(session.user.id);
    if (profile) return profile.user_type;

    // Fallback to metadata
    return session.user.user_metadata?.user_type || 'student';
  }

  // ── User Type Display Helpers ────────────────────────────
  function getUserTypeLabel(userType) {
    const labels = {
      student: 'Student',
      teacher: 'Teacher',
      parent: 'Parent',
      alumni: 'Alumni',
      school_representative: 'School Rep'
    };
    return labels[userType] || 'User';
  }

  function getPlatformRoleLabel(platformRole) {
    const labels = {
      user: 'Member',
      school_admin: 'School Admin',
      super_admin: 'Super Admin'
    };
    return labels[platformRole] || 'Member';
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
      const profile = await getProfile(user.id);
      const platformRole = (user.email === 'owaissaifi019@gmail.com') ? 'super_admin' : (profile?.platform_role || 'user');
      const userType = profile?.user_type || user.user_metadata?.user_type || 'student';
      const displayName = profile?.full_name || user.user_metadata?.full_name || user.email;
      const initial = displayName.charAt(0).toUpperCase();
      const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;

      // Desktop nav
      if (loginBtn) {
        if (platformRole === 'school_admin' || platformRole === 'super_admin') {
          loginBtn.style.display = 'inline-flex';
          loginBtn.href = platformRole === 'super_admin' ? 'admin/index.html' : AUTH_REDIRECT_DASHBOARD;
          loginBtn.textContent = 'Dashboard';
        } else {
          loginBtn.style.display = 'none';
        }
        loginBtn.classList.remove('btn-secondary');
        loginBtn.classList.add('btn-primary');
      }

      if (joinBtn) {
        // Replace Register button with avatar + logout
        const parent = joinBtn.parentElement;
        joinBtn.style.display = 'none';

        // Check if user pill already exists to avoid duplication
        let userPill = parent.querySelector('.nav-user-pill');
        if (!userPill) {
          userPill = document.createElement('div');
          userPill.className = 'nav-user-pill';
          parent.appendChild(userPill);
        }

        const typeLabel = getUserTypeLabel(userType);
        const avatarHtml = avatarUrl
          ? `<img src="${avatarUrl}" alt="${displayName}" class="nav-user-avatar-img" title="${typeLabel}">`
          : `<div class="nav-user-avatar" title="${typeLabel}">${initial}</div>`;

        let profileUrl = `profile.html?id=${user.id}`;
        if (userType === 'school_representative' || platformRole === 'school_admin') {
          profileUrl = profile?.school_id ? `school-profile.html?id=${profile.school_id}` : `dashboard.html`;
        }
        userPill.innerHTML = `
          <a href="${profileUrl}" class="nav-profile-link" style="display: flex; align-items: center; gap: 8px; text-decoration: none; color: inherit;">
            ${avatarHtml}
            <span class="nav-user-name">${displayName} <span class="nav-role-badge ${userType}">${typeLabel}</span></span>
          </a>
          <button class="nav-logout-btn" id="nav-logout-btn" title="Logout">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        `;

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
        if (platformRole === 'school_admin' || platformRole === 'super_admin') {
          mobileLogin.style.display = 'block';
          mobileLogin.href = platformRole === 'super_admin' ? 'admin/index.html' : AUTH_REDIRECT_DASHBOARD;
          mobileLogin.textContent = 'Dashboard';
        } else {
          mobileLogin.style.display = 'none';
        }
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
        loginBtn.style.display = 'inline-flex';
        loginBtn.href = AUTH_REDIRECT_LOGIN;
        loginBtn.textContent = 'Login';
        loginBtn.classList.remove('btn-primary');
        loginBtn.classList.add('btn-secondary');
      }
      if (joinBtn) {
        joinBtn.style.display = 'inline-flex';
        // Remove user pill if any
        const parent = joinBtn.parentElement;
        const userPill = parent.querySelector('.nav-user-pill');
        if (userPill) userPill.remove();
      }
      if (mobileLogin) {
        mobileLogin.style.display = 'block';
        mobileLogin.href = AUTH_REDIRECT_LOGIN;
      }
      if (mobileRegister) {
        mobileRegister.textContent = 'Register';
        mobileRegister.classList.add('btn-modal-trigger');
        mobileRegister.href = 'login.html#register';
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
    updateNavAuthState,
    getProfile,
    getUserRole,
    getUserType,
    getUserTypeLabel,
    getPlatformRoleLabel
  };

})();
