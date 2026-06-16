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
    if (session.user.email === 'owaissaifi003@gmail.com') {
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
        const platformRole = (user.email === 'owaissaifi003@gmail.com') ? 'super_admin' : (profile?.platform_role || 'user');
        const userType = profile?.user_type || user.user_metadata?.user_type || 'student';
        const displayName = profile?.full_name || user.user_metadata?.full_name || user.email || 'User';
        const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U';
        const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;
        const typeLabel = getUserTypeLabel(userType);

        // Update Me Button and Dropdown elements if they exist
        const meAvatar = document.getElementById('nav-me-avatar-img');
        const meBtn = document.getElementById('nav-me-btn');
        const meDropdown = document.getElementById('me-dropdown');
        
        if (meAvatar) {
          if (avatarUrl) {
            meAvatar.style.backgroundImage = `url(${avatarUrl})`;
            meAvatar.textContent = '';
          } else {
            meAvatar.style.backgroundImage = 'none';
            meAvatar.textContent = initial;
          }
        }

        if (meDropdown) {
          // If we haven't rendered the premium dropdown card structure, render it
          if (!meDropdown.dataset.renderedNewLayout) {
            meDropdown.dataset.renderedNewLayout = 'true';
            meDropdown.innerHTML = `
              <div class="me-dropdown-card">
                <!-- Header Section -->
                <div class="me-dropdown-header">
                  <div class="me-dropdown-avatar-wrapper">
                    <div class="me-dropdown-avatar" id="me-dropdown-avatar-img"></div>
                    <span class="me-dropdown-status-dot"></span>
                  </div>
                  <div class="me-dropdown-user-details">
                    <div class="me-dropdown-name-row">
                      <span class="me-dropdown-name" id="me-dropdown-name">User Name</span>
                      <span id="me-dropdown-verify-badge"></span>
                    </div>
                    <span class="me-dropdown-role" id="me-dropdown-role">User Role</span>
                  </div>
                </div>

                <!-- Menu Items Section -->
                <div class="me-dropdown-menu">
                  <a href="#" class="me-menu-item" id="me-menu-view-profile">
                    <svg class="me-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span>View Profile</span>
                  </a>
                  <a href="#" class="me-menu-item" id="me-menu-edit-profile">
                    <svg class="me-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    <span>Edit Profile</span>
                  </a>
                  <a href="dashboard.html" class="me-menu-item" id="me-menu-dashboard" style="display: none;">
                    <svg class="me-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
                    <span>Dashboard</span>
                  </a>
                  <a href="#" class="me-menu-item" id="me-menu-notifications">
                    <svg class="me-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    <span>Notifications</span>
                  </a>
                  <a href="messaging.html" class="me-menu-item" id="me-menu-messages">
                    <svg class="me-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span>Messages</span>
                  </a>
                  <a href="#" class="me-menu-item" id="me-menu-settings">
                    <svg class="me-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    <span>Settings</span>
                  </a>
                </div>

                <!-- Footer Section -->
                <div class="me-dropdown-footer">
                  <button class="me-dropdown-signout" id="me-dropdown-signout-btn">
                    <svg class="me-signout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            `;
          }

          // Populate components
          const meDropdownAvatar = document.getElementById('me-dropdown-avatar-img');
          const meName = document.getElementById('me-dropdown-name');
          const meRole = document.getElementById('me-dropdown-role');
          const meVerifyBadge = document.getElementById('me-dropdown-verify-badge');

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
          if (meRole) meRole.textContent = getPlatformRoleLabel(platformRole);

          if (meVerifyBadge) {
            if (profile?.is_verified) {
              meVerifyBadge.innerHTML = `
                <svg class="verified-badge verified-badge-sm" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Profile" style="display:inline-block; vertical-align:middle; margin-left:4px; width:15px; height:15px;">
                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
                  <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
                </svg>
              `;
            } else {
              meVerifyBadge.innerHTML = '';
            }
          }

          let profileUrl = `profile.html?id=${user.id}`;
          if (userType === 'school_representative' || platformRole === 'school_admin') {
            profileUrl = profile?.school_id ? `school-profile.html?id=${profile.school_id}` : `dashboard.html`;
          }

          const meMenuProfile = document.getElementById('me-menu-view-profile');
          if (meMenuProfile) meMenuProfile.href = profileUrl;

          const meMenuEditProfile = document.getElementById('me-menu-edit-profile');
          if (meMenuEditProfile) {
            if (userType === 'school_representative' || platformRole === 'school_admin') {
              meMenuEditProfile.href = profile?.school_id ? `school-profile.html?id=${profile.school_id}` : `dashboard.html`;
            } else {
              meMenuEditProfile.href = `profile.html?id=${user.id}&open_edit=true`;
              meMenuEditProfile.addEventListener('click', (e) => {
                if (window.location.pathname.includes('profile.html') && window.CampusLink && window.CampusLink.openEditProfileModal) {
                  const urlParams = new URLSearchParams(window.location.search);
                  if (urlParams.get('id') === user.id) {
                    e.preventDefault();
                    e.stopPropagation();
                    meDropdown.classList.remove('active');
                    window.CampusLink.openEditProfileModal();
                  }
                }
              });
            }
          }

          const meMenuSettings = document.getElementById('me-menu-settings');
          if (meMenuSettings) {
            if (userType === 'school_representative' || platformRole === 'school_admin') {
              meMenuSettings.href = profile?.school_id ? `school-profile.html?id=${profile.school_id}` : `dashboard.html`;
            } else {
              meMenuSettings.href = `profile.html?id=${user.id}&open_edit=true`;
              meMenuSettings.addEventListener('click', (e) => {
                if (window.location.pathname.includes('profile.html') && window.CampusLink && window.CampusLink.openEditProfileModal) {
                  const urlParams = new URLSearchParams(window.location.search);
                  if (urlParams.get('id') === user.id) {
                    e.preventDefault();
                    e.stopPropagation();
                    meDropdown.classList.remove('active');
                    window.CampusLink.openEditProfileModal();
                  }
                }
              });
            }
          }

          const meMenuDashboard = document.getElementById('me-menu-dashboard');
          if (meMenuDashboard) {
            if (platformRole === 'school_admin' || platformRole === 'super_admin') {
              meMenuDashboard.style.display = 'flex';
              meMenuDashboard.href = platformRole === 'super_admin' ? 'admin/index.html' : 'dashboard.html';
            } else {
              meMenuDashboard.style.display = 'none';
            }
          }

          const meMenuNotifications = document.getElementById('me-menu-notifications');
          if (meMenuNotifications) {
            meMenuNotifications.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              meDropdown.classList.remove('active');
              const bell = document.getElementById('notif-bell-btn');
              if (bell) bell.click();
            });
          }

          // Bind dropdown toggle
          if (meBtn && !meBtn.dataset.listenerBound) {
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

            document.addEventListener('keydown', (e) => {
              if (e.key === 'Escape') {
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
        }

        // Show mobile bottom navigation
        const mobileNav = document.querySelector('.mobile-bottom-nav');
        if (mobileNav) {
          mobileNav.classList.add('visible');
          document.body.classList.add('has-bottom-nav');
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

        // Hide mobile bottom navigation
        const mobileNav = document.querySelector('.mobile-bottom-nav');
        if (mobileNav) {
          mobileNav.classList.remove('visible');
          document.body.classList.remove('has-bottom-nav');
        }

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

  function initMobileBottomNav() {
    const mobileNav = document.querySelector('.mobile-bottom-nav');
    if (!mobileNav) return;

    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';

    let activeId = 'mobile-nav-home';
    if (page.includes('schools.html') || page.includes('school-profile.html')) {
      activeId = 'mobile-nav-schools';
    } else if (page.includes('networking.html')) {
      activeId = 'mobile-nav-network';
    } else if (page.includes('messaging.html')) {
      activeId = 'mobile-nav-messages';
    } else if (page.includes('profile.html')) {
      activeId = 'mobile-nav-profile';
    }

    const activeItem = document.getElementById(activeId);
    if (activeItem) {
      activeItem.classList.add('active');
    }
  }

  // Global search input handling
  document.addEventListener('DOMContentLoaded', () => {
    initMobileBottomNav();

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
