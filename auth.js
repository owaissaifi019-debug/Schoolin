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
  async function updateNavAuthState() {
    try {
      const session = await getSession();
      
      // Toggle guest-only and member-only visibility
      const memberOnlyEls = document.querySelectorAll('.member-only');
      const guestOnlyEls = document.querySelectorAll('.guest-only');
      
      if (session && session.user) {
        // User is logged in
        memberOnlyEls.forEach(el => { 
          if (el.tagName === 'LI') {
            el.style.setProperty('display', 'inline-flex', 'important');
          } else {
            el.style.setProperty('display', 'block', 'important');
          }
        });
        guestOnlyEls.forEach(el => { el.style.setProperty('display', 'none', 'important'); });

        const user = session.user;
        const profile = await getProfile(user.id);
        const platformRole = (user.email === 'owaissaifi019@gmail.com') ? 'super_admin' : (profile?.platform_role || 'user');
        const userType = profile?.user_type || user.user_metadata?.user_type || 'student';
        const displayName = profile?.full_name || user.user_metadata?.full_name || user.email || 'User';
        const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U';
        const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;
        const typeLabel = getUserTypeLabel(userType);

        // Update Me Button and Dropdown elements if they exist
        const meAvatar = document.getElementById('nav-me-avatar-img');
        const meDropdownAvatar = document.getElementById('me-dropdown-avatar-img');
        const meName = document.getElementById('me-dropdown-name');
        const meHeadline = document.getElementById('me-dropdown-headline');
        const meProfileLink = document.getElementById('me-dropdown-profile-link');
        const meDashboardLink = document.getElementById('me-dropdown-dashboard-link');
        
        if (meAvatar) {
          if (avatarUrl) {
            meAvatar.style.backgroundImage = `url(${avatarUrl})`;
            meAvatar.textContent = '';
          } else {
            meAvatar.style.backgroundImage = 'none';
            meAvatar.textContent = initial;
          }
        }

        if (meDropdownAvatar) {
          if (avatarUrl) {
            meDropdownAvatar.style.backgroundImage = `url(${avatarUrl})`;
            meDropdownAvatar.textContent = '';
          } else {
            meDropdownAvatar.style.backgroundImage = 'none';
            meDropdownAvatar.textContent = initial;
          }
        }

        if (meName) meName.textContent = displayName;
        if (meHeadline) meHeadline.textContent = typeLabel;

        let profileUrl = `profile.html?id=${user.id}`;
        if (userType === 'school_representative' || platformRole === 'school_admin') {
          profileUrl = profile?.school_id ? `school-profile.html?id=${profile.school_id}` : `dashboard.html`;
        }
        if (meProfileLink) meProfileLink.href = profileUrl;

        if (meDashboardLink) {
          if (platformRole === 'school_admin' || platformRole === 'super_admin') {
            meDashboardLink.style.display = 'block';
            meDashboardLink.href = platformRole === 'super_admin' ? 'admin/index.html' : 'dashboard.html';
          } else {
            meDashboardLink.style.display = 'none';
          }
        }

        // Bind dropdown toggle
        const meBtn = document.getElementById('nav-me-btn');
        const meDropdown = document.getElementById('me-dropdown');
        if (meBtn && meDropdown && !meBtn.dataset.listenerBound) {
          meBtn.dataset.listenerBound = 'true';
          meBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            meDropdown.classList.toggle('active');
          });

          document.addEventListener('click', (e) => {
            if (!meDropdown.contains(e.target) && !meBtn.contains(e.target)) {
              meDropdown.classList.remove('active');
            }
          });
        }

        // Bind signout button
        const signoutBtn = document.getElementById('me-dropdown-signout-btn');
        if (signoutBtn && !signoutBtn.dataset.listenerBound) {
          signoutBtn.dataset.listenerBound = 'true';
          signoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await signOut();
          });
        }

        // Backward compatibility for legacy elements if present on some pages
        const loginBtn = document.getElementById('nav-btn-signin');
        const joinBtn = document.getElementById('nav-btn-join');
        if (loginBtn) loginBtn.style.display = 'none';
        if (joinBtn) joinBtn.style.display = 'none';

      } else {
        // User is not logged in
        memberOnlyEls.forEach(el => { el.style.setProperty('display', 'none', 'important'); });
        guestOnlyEls.forEach(el => { 
          if (el.tagName === 'LI') {
            el.style.setProperty('display', 'inline-flex', 'important');
          } else {
            el.style.setProperty('display', 'block', 'important');
          }
        });

        // Backward compatibility for legacy elements
        const loginBtn = document.getElementById('nav-btn-signin');
        const joinBtn = document.getElementById('nav-btn-join');
        if (loginBtn) {
          loginBtn.style.display = 'inline-flex';
          loginBtn.href = AUTH_REDIRECT_LOGIN;
          if (!loginBtn.querySelector('svg')) {
            loginBtn.textContent = 'Sign In';
          }
        }
        if (joinBtn) {
          joinBtn.style.display = 'inline-flex';
        }
      }
    } catch (err) {
      console.error('Error updating auth nav state:', err);
    }
  }
  // Global search input handling
  document.addEventListener('DOMContentLoaded', () => {
    const globalSearch = document.getElementById('global-search-input');
    if (globalSearch) {
      // Check if there is a 'search' parameter in the URL on load
      const urlParams = new URLSearchParams(window.location.search);
      const searchParam = urlParams.get('search');
      if (searchParam) {
        globalSearch.value = searchParam;
        
        // Auto-populate local page search inputs if they exist
        const pageSearchInputs = [
          'net-search-input',
          'school-search-input',
          'event-search-input',
          'admission-search-input'
        ];
        
        for (const id of pageSearchInputs) {
          const localInput = document.getElementById(id);
          if (localInput) {
            localInput.value = searchParam;
            // Let the local page script load and bind first
            setTimeout(() => {
              localInput.value = searchParam;
              localInput.dispatchEvent(new Event('input', { bubbles: true }));
            }, 100);
            break; // assume one search page input per page
          }
        }
      }

      globalSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const query = globalSearch.value.trim();
          
          // Determine if we are on a page that already has search
          const pageSearchInputs = [
            'net-search-input',
            'school-search-input',
            'event-search-input',
            'admission-search-input'
          ];
          let localInputFound = false;
          for (const id of pageSearchInputs) {
            const localInput = document.getElementById(id);
            if (localInput) {
              localInput.value = query;
              localInput.dispatchEvent(new Event('input', { bubbles: true }));
              localInputFound = true;
              break;
            }
          }
          
          if (!localInputFound) {
            // If we are not on a search page, redirect to networking.html with search query
            window.location.href = `networking.html?search=${encodeURIComponent(query)}`;
          }
        }
      });
    }
  });

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
