// auth.js
// CampusLink Authentication Module
// Provides signup, login, logout, session management, and auth guards.
// Depends on supabase.js being loaded first (sets window.CampusLink.supabase).

(function () {
  'use strict';

  console.log("NEW AUTH LOADED");
  console.log("Immediate body class:", document.body ? document.body.className : "No body element yet");
  document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded body class:", document.body ? document.body.className : "No body element yet");
  });

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
  async function signUp(email, password, fullName, userType, avatarFile, termsAccepted, username) {
    const sb = getClient();
    if (!sb) throw new Error('Supabase client not initialised');

    // Validate user type
    if (!VALID_USER_TYPES.includes(userType)) {
      throw new Error('Invalid user type selected');
    }

    // Validate terms acceptance
    if (!termsAccepted) {
      throw new Error('You must agree to the Terms & Conditions and Privacy Policy');
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
          avatar_url: avatarUrl,
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          username: username // Add username to metadata
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

    // Clear all profile cache from sessionStorage
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(PROFILE_CACHE_KEY)) {
          sessionStorage.removeItem(key);
          i--; // adjust index since we removed a key
        }
      }
    } catch (e) {
      console.warn('Failed to clear cached profiles:', e);
    }

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

  const PROFILE_CACHE_KEY = 'campuslink_cached_profile_';

  // ── Get Role/Profile helpers ─────────────────────────────
  async function getProfile(userId) {
    if (!userId) return null;

    // Check sessionStorage cache first
    try {
      const cached = sessionStorage.getItem(PROFILE_CACHE_KEY + userId);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Failed to parse cached profile:', e);
    }

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

    // Save to sessionStorage cache
    if (data) {
      try {
        sessionStorage.setItem(PROFILE_CACHE_KEY + userId, JSON.stringify(data));
      } catch (e) {
        console.warn('Failed to cache profile in sessionStorage:', e);
      }
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

        // Dynamically add Classroom link to the main navigation header
        const user = session.user;
        const profile = await getProfile(user.id);
        const userType = profile?.user_type || user.user_metadata?.user_type || 'student';

        // Hide "My Network" tab for parent role to restrict directory access
        const networkLink = document.getElementById('nav-network-link');
        if (networkLink) {
          const networkLi = networkLink.closest('li');
          if (networkLi) {
            if (userType === 'parent') {
              networkLi.style.setProperty('display', 'none', 'important');
            } else {
              networkLi.style.removeProperty('display');
            }
          }
        }

        let classroomHref = 'classroom.html';
        let label = 'Classroom';
        let isVerifiedTeacher = true; // default for non-teachers
        let lockedTitle = 'Join a school to access Classrooms.';

        const isDisallowedRole = (userType === 'student' || userType === 'parent' || userType === 'alumni');

        if (isDisallowedRole) {
          isVerifiedTeacher = false;
        } else if (userType === 'teacher') {
          isVerifiedTeacher = false; // default to false for teachers
          let isVerifiedStatus = false;
          let assignedClassroomId = null;

          // 1. Query teacher profile from database
          try {
            const { data, error } = await supabase
              .from('teachers')
              .select('*')
              .eq('user_id', profile.id)
              .maybeSingle();
            if (!error && data) {
              isVerifiedStatus = data.verification_status === 'verified';
            }
          } catch (e) {
            console.warn('Error fetching teacher info:', e);
          }

          // 2. Query assigned classroom from classrooms table in database (Class Teacher)
          try {
            const { data, error } = await supabase
              .from('classrooms')
              .select('id, grade, section')
              .eq('class_teacher_id', profile.id)
              .eq('is_archived', false)
              .maybeSingle();
            if (!error && data) {
              assignedClassroomId = data.id;
            }
          } catch (e) {
            console.warn('Error fetching assigned classroom:', e);
          }

          // 3. Query assigned classrooms where they are Subject Teacher
          if (!assignedClassroomId) {
            try {
              const { data, error } = await supabase
                .from('classroom_subject_teachers')
                .select('classroom_id')
                .eq('teacher_id', profile.id)
                .limit(1)
                .maybeSingle();
              if (!error && data) {
                assignedClassroomId = data.classroom_id;
              }
            } catch (e) {
              console.warn('Error fetching assigned subject classroom:', e);
            }
          }

          // Fallback to local storage if DB query yielded nothing
          if (!assignedClassroomId) {
            const displayName = profile?.full_name || user.user_metadata?.full_name || user.email || 'teacher';
            const teachersRaw = localStorage.getItem('campuslink_teachers');
            const teachers = teachersRaw ? JSON.parse(teachersRaw) : [];
            const matchingTeacher = teachers.find(t => 
              t.fullName.toLowerCase() === displayName?.toLowerCase() || 
              t.email?.toLowerCase() === user.email?.toLowerCase()
            );

            if (matchingTeacher) {
              isVerifiedStatus = matchingTeacher.verificationStatus === 'verified';
              const classroomsRaw = localStorage.getItem('campuslink_classrooms');
              const classrooms = classroomsRaw ? JSON.parse(classroomsRaw) : [];
              const assignedClassroomLocal = classrooms.find(cr => cr.classTeacherId === matchingTeacher.id);
              if (assignedClassroomLocal) {
                assignedClassroomId = assignedClassroomLocal.id;
              } else {
                const subjectsRaw = localStorage.getItem('campuslink_classroom_subjects');
                const subjects = subjectsRaw ? JSON.parse(subjectsRaw) : [];
                const assignedSubLocal = subjects.find(cs => cs.teacherId === matchingTeacher.id && cs.status === 'active');
                if (assignedSubLocal) {
                  assignedClassroomId = assignedSubLocal.classroomId;
                }
              }
            } else if (profile?.school_id || (displayName && displayName.toLowerCase() === 'teacher')) {
              isVerifiedStatus = true;
              const classroomsRaw = localStorage.getItem('campuslink_classrooms');
              const classrooms = classroomsRaw ? JSON.parse(classroomsRaw) : [];
              const assignedClassroomLocal = classrooms[0];
              if (assignedClassroomLocal) {
                assignedClassroomId = assignedClassroomLocal.id;
              }
            }
          }

          if (isVerifiedStatus && assignedClassroomId) {
            isVerifiedTeacher = true;
            // Redirect to classroom.html (Coming Soon page) instead of workspace query
            classroomHref = 'classroom.html';
          } else {
            isVerifiedTeacher = false;
            classroomHref = 'classroom.html'; // Always go to coming soon page
            if (isVerifiedStatus && !assignedClassroomId) {
              lockedTitle = 'Waiting for classroom assignment from admin.';
            } else {
              lockedTitle = 'Join a school to access Classrooms.';
            }
          }
        }

        const navLinkItem = document.getElementById('nav-classroom-item');
        const unverifiedNotice = document.getElementById('nav-classroom-unverified');

        if (isDisallowedRole) {
          if (navLinkItem) navLinkItem.remove();
          if (unverifiedNotice) unverifiedNotice.remove();
        } else if (userType === 'teacher' && !isVerifiedTeacher) {
          if (navLinkItem) navLinkItem.remove();

          if (!unverifiedNotice) {
            const msgItem = document.querySelector('.nav-msg-item');
            if (msgItem) {
              const noticeLi = document.createElement('li');
              noticeLi.id = 'nav-classroom-unverified';
              noticeLi.className = 'member-only nav-classroom-item';
              noticeLi.style.cssText = 'display: inline-flex !important; opacity: 0.7;';
              noticeLi.title = lockedTitle;
              noticeLi.innerHTML = `
                <a href="${classroomHref}" id="nav-classroom-link-unverified" style="display: flex; flex-direction: column; align-items: center; text-decoration: none; color: var(--text-muted); position: relative;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 3px;">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                    <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path>
                  </svg>
                  <span style="position: absolute; top: -5px; right: -5px; font-size: 0.65rem; background: var(--border-color); padding: 1px 3px; border-radius: 4px; border: 1px solid var(--white); line-height: 1;">🔒</span>
                  <span>Classroom</span>
                </a>
              `;
              msgItem.parentNode.insertBefore(noticeLi, msgItem.nextSibling);
            }
          } else {
            unverifiedNotice.style.setProperty('display', 'inline-flex', 'important');
            unverifiedNotice.title = lockedTitle;
          }
        } else {
          if (unverifiedNotice) unverifiedNotice.remove();

          if (!navLinkItem) {
            const msgItem = document.querySelector('.nav-msg-item');
            if (msgItem) {
              const classroomLi = document.createElement('li');
              classroomLi.id = 'nav-classroom-item';
              classroomLi.className = 'member-only nav-classroom-item';
              classroomLi.style.cssText = 'display: inline-flex !important;';
              classroomLi.innerHTML = `
                <a href="${classroomHref}" id="nav-classroom-link">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 3px;">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                    <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path>
                  </svg>
                  <span>${label}</span>
                </a>
              `;
              msgItem.parentNode.insertBefore(classroomLi, msgItem.nextSibling);
            }
          } else {
            navLinkItem.style.setProperty('display', 'inline-flex', 'important');
            const a = document.getElementById('nav-classroom-link');
            if (a) {
              a.href = classroomHref;
              const span = a.querySelector('span');
              if (span) span.textContent = label;
            }
          }
        }

        const platformRole = (user.email === 'owaissaifi003@gmail.com') ? 'super_admin' : (profile?.platform_role || 'user');
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
                  <a href="dashboard.html" class="me-menu-item" id="me-menu-dashboard" style="display: none;">
                    <svg class="me-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
                    <span>Dashboard</span>
                  </a>
                  <a href="#" class="me-menu-item" id="me-menu-settings">
                    <svg class="me-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    <span>Settings</span>
                  </a>
                </div>

                <!-- Footer Section -->
                <div class="me-dropdown-footer">
                  <button class="me-menu-item me-menu-item-theme" id="me-menu-theme-toggle-btn" title="Toggle dark mode">
                    <svg id="me-theme-icon" class="me-menu-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                    <span id="me-theme-label">Dark Mode</span>
                    <span class="me-theme-toggle-pill"><span class="me-theme-toggle-dot"></span></span>
                  </button>
                  <button class="me-menu-item me-menu-item-signout" id="me-dropdown-signout-btn">
                    <svg class="me-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
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

          const meMenuClassroom = document.getElementById('me-menu-classroom');
          if (meMenuClassroom) {
            if (isDisallowedRole) {
              meMenuClassroom.style.display = 'none';
              const notice = document.getElementById('me-menu-classroom-unverified-notice');
              if (notice) notice.remove();
            } else if (userType === 'teacher' && !isVerifiedTeacher) {
              meMenuClassroom.style.display = 'none';
              const existingNotice = document.getElementById('me-menu-classroom-unverified-notice');
              if (existingNotice) {
                existingNotice.innerHTML = `<span>⚠️</span> ${lockedTitle}`;
              } else {
                const notice = document.createElement('div');
                notice.id = 'me-menu-classroom-unverified-notice';
                notice.style.cssText = 'background: #FFFBEB; border: 1px dashed #F59E0B; border-radius: 8px; padding: 10px; margin: 8px; font-size: 0.75rem; color: #B45309; font-weight: 600; text-align: center; display: flex; align-items: center; gap: 6px; justify-content: center;';
                notice.innerHTML = `<span>⚠️</span> ${lockedTitle}`;
                meMenuClassroom.parentNode.insertBefore(notice, meMenuClassroom);
              }
            } else {
              meMenuClassroom.style.display = 'flex';
              const notice = document.getElementById('me-menu-classroom-unverified-notice');
              if (notice) notice.remove();
            }
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
            meMenuSettings.removeAttribute('href');
            meMenuSettings.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              meDropdown.classList.remove('active');
              openSettingsPanel(user, profile, platformRole);
            });
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

          // Bind theme toggle in menu
          const meMenuThemeBtn = document.getElementById('me-menu-theme-toggle-btn');
          if (meMenuThemeBtn) {
            const _updateMenuThemeBtn = (theme) => {
              const icon = document.getElementById('me-theme-icon');
              const label = document.getElementById('me-theme-label');
              const isDark = theme === 'dark';
              if (icon) {
                icon.innerHTML = isDark
                  ? `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`
                  : `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
              }
              if (label) label.textContent = isDark ? 'Light Mode' : 'Dark Mode';
              meMenuThemeBtn.style.borderColor = isDark ? 'rgba(255,255,255,0.2)' : 'var(--border-color)';
            };
            _updateMenuThemeBtn(document.documentElement.getAttribute('data-theme') || 'light');
            meMenuThemeBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const current = document.documentElement.getAttribute('data-theme') || 'light';
              const next = current === 'dark' ? 'light' : 'dark';
              document.documentElement.setAttribute('data-theme', next);
              localStorage.setItem('campuslink-theme', next);
              _updateMenuThemeBtn(next);
              // Sync all theme-toggle-btn icons on the page
              document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
                btn.innerHTML = next === 'dark'
                  ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
                  : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="theme-icon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
              });
            });
          }

          // Bind dropdown toggle
          if (meBtn && !meBtn.dataset.listenerBound) {
            meBtn.dataset.listenerBound = 'true';
            meBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              
              // Close notification panel if it is open
              if (window.CampusLink && window.CampusLink.notifications && window.CampusLink.notifications.closePanel) {
                window.CampusLink.notifications.closePanel();
              }
              
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

  // ── Capacitor Android Hardware Back Button Handling ─────────────────
  let lastBackPressTime = 0;

  function isRootPage() {
    const pathname = window.location.pathname.toLowerCase();
    return pathname === '' ||
           pathname.endsWith('/') ||
           pathname.endsWith('/index.html') ||
           pathname.endsWith('/admin/index.html') ||
           pathname.endsWith('/admin/');
  }

  function showExitToast(message) {
    let toast = document.getElementById('back-exit-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'back-exit-toast';
      toast.style.position = 'fixed';
      toast.style.bottom = '80px'; // above bottom nav
      toast.style.left = '50%';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      toast.style.backgroundColor = 'rgba(15, 23, 42, 0.9)'; // Premium dark slate
      toast.style.color = '#ffffff';
      toast.style.padding = '12px 24px';
      toast.style.borderRadius = '30px';
      toast.style.fontSize = '0.9rem';
      toast.style.fontWeight = '600';
      toast.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.1)';
      toast.style.zIndex = '99999';
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.pointerEvents = 'none';
      toast.style.textAlign = 'center';
      toast.style.whiteSpace = 'nowrap';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    
    // Force reflow
    toast.offsetHeight;
    
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    if (window.exitToastTimeout) {
      clearTimeout(window.exitToastTimeout);
    }
    window.exitToastTimeout = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2000);
  }

  function checkAndCloseOverlays() {
    // 1. Check open modals (elements with .modal-overlay that are visible/active)
    const activeModals = Array.from(document.querySelectorAll('.modal-overlay')).filter(modal => {
      return modal.classList.contains('active') || (modal.style.display && modal.style.display !== 'none');
    });

    if (activeModals.length > 0) {
      const activeModal = activeModals[activeModals.length - 1]; // Close topmost modal
      // Search for close/cancel buttons inside this modal
      const closeBtn = activeModal.querySelector('.modal-close-btn, [id*="close"], [id*="cancel"], .btn-modal-close, .epm-close, button[class*="close"], button[class*="cancel"]');
      if (closeBtn) {
        closeBtn.click();
      } else {
        // Fallback: click the overlay itself
        activeModal.click();
      }
      return true;
    }

    // 2. Check dialogs
    const activeDialogs = Array.from(document.querySelectorAll('[role="dialog"], .dialog, .dialog-overlay')).filter(dialog => {
      return dialog.classList.contains('active') || (dialog.style.display && dialog.style.display !== 'none');
    });

    if (activeDialogs.length > 0) {
      const activeDialog = activeDialogs[activeDialogs.length - 1];
      const closeBtn = activeDialog.querySelector('.close-btn, [id*="close"], [id*="cancel"], button[class*="close"], button[class*="cancel"]');
      if (closeBtn) {
        closeBtn.click();
      } else {
        activeDialog.click();
      }
      return true;
    }

    // 3. Check open sidebars
    // Admin dashboard / School Admin sidebar (uses .admin-sidebar-open class on body)
    const isAdminSidebarOpen = document.body.classList.contains('admin-sidebar-open') || 
                               document.querySelector('.admin-sidebar-open');
    if (isAdminSidebarOpen) {
      const closeBtn = document.getElementById('admin-sidebar-close') || 
                       document.querySelector('.admin-sidebar-close') || 
                       document.getElementById('admin-sidebar-overlay');
      if (closeBtn) {
        closeBtn.click();
        return true;
      }
      // Fallback manual removal
      document.querySelectorAll('.admin-sidebar-open').forEach(el => el.classList.remove('admin-sidebar-open'));
      document.querySelectorAll('.admin-sidebar-overlay-visible').forEach(el => el.classList.remove('admin-sidebar-overlay-visible'));
      document.body.classList.remove('admin-sidebar-open');
      document.body.style.overflow = '';
      return true;
    }

    // Student mobile navigation menu sidebar (uses mobile-nav-active class on body or .nav-links.active)
    const isMobileNavActive = document.body.classList.contains('mobile-nav-active') || 
                              document.querySelector('.nav-links.active');
    if (isMobileNavActive) {
      const mobileToggle = document.querySelector('.mobile-toggle');
      if (mobileToggle) {
        mobileToggle.click();
        return true;
      }
      // Fallback manual removal
      document.querySelectorAll('.nav-links.active').forEach(el => el.classList.remove('active'));
      document.body.classList.remove('mobile-nav-active');
      return true;
    }

    return false;
  }

  function handleBackButton() {
    if (checkAndCloseOverlays()) {
      console.log('[Capacitor BackButton] Overlay closed.');
      return;
    }

    const pathname = window.location.pathname.toLowerCase();
    if (pathname.endsWith('/dashboard.html')) {
      console.log('[Capacitor BackButton] Dashboard page. Navigating to home.');
      window.location.href = 'index.html';
      return;
    }

    if (isRootPage()) {
      const currentTime = Date.now();
      if (currentTime - lastBackPressTime < 2000) {
        console.log('[Capacitor BackButton] Exiting application.');
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
          window.Capacitor.Plugins.App.exitApp();
        }
      } else {
        lastBackPressTime = currentTime;
        showExitToast('Press back again to exit.');
      }
    } else {
      if (window.history && window.history.length > 1) {
        console.log('[Capacitor BackButton] Navigating back in history.');
        window.history.back();
      } else {
        console.log('[Capacitor BackButton] No history. Navigating to home.');
        window.location.href = 'index.html';
      }
    }
  }

  function initCapacitorEvents() {
    function registerAppListeners() {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        console.log('[Capacitor Events] Registering App plugin event listeners.');
        
        // 1. Hardware Back Button handler
        window.Capacitor.Plugins.App.addListener('backButton', () => {
          handleBackButton();
        });

        // 2. Deep Linking (App Link / Custom Scheme) handler
        window.Capacitor.Plugins.App.addListener('appUrlOpen', (data) => {
          console.log('[Capacitor DeepLink] URL opened app:', data.url);
          try {
            const urlStr = data.url;
            if (urlStr.includes('join-school.html') || urlStr.includes('join-school')) {
              let code = '';
              const match = urlStr.match(/[?&]code=([^&#]+)/);
              if (match && match[1]) {
                code = match[1];
              }
              if (code) {
                console.log('[Capacitor DeepLink] Matching code found, routing to join-school.html?code=' + code);
                window.location.href = 'join-school.html?code=' + encodeURIComponent(code);
              }
            }
          } catch (err) {
            console.error('[Capacitor DeepLink] Error handling deep link:', err);
          }
        });
      }
    }

    registerAppListeners();
    // Fallback in case registration timing is delayed
    document.addEventListener('DOMContentLoaded', registerAppListeners);
  }

  initCapacitorEvents();

  // ── Dynamic App Logo & Favicon Integration ───────────────────────
  function injectAppLogoAndFavicon() {
    const isInsideAdmin = window.location.pathname.includes('/admin/');
    const logoPath = isInsideAdmin ? '../logo.png' : 'logo.png';

    // 1. Inject Favicon
    let favicon = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      favicon.type = 'image/png';
      document.head.appendChild(favicon);
    }
    favicon.href = logoPath;
  }

  // Run as early as possible and retry on DOMContentLoaded
  injectAppLogoAndFavicon();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectAppLogoAndFavicon);
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

  /* ── Settings Panel ────────────────────────────────────────────── */
  function openSettingsPanel(user, profile, platformRole) {
    // Remove any existing panel
    const existing = document.getElementById('campuslink-settings-panel');
    if (existing) { existing.remove(); }
    const existingOverlay = document.getElementById('campuslink-settings-overlay');
    if (existingOverlay) { existingOverlay.remove(); }

    // Determine edit profile URL
    const isSchoolAdmin = profile?.user_type === 'school_representative' || platformRole === 'school_admin';
    const editProfileUrl = isSchoolAdmin
      ? (profile?.school_id ? `school-profile.html?id=${profile.school_id}` : `dashboard.html`)
      : `profile.html?id=${user.id}&open_edit=true`;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'campuslink-settings-overlay';
    overlay.className = 'settings-overlay';
    document.body.appendChild(overlay);

    // Create panel
    const panel = document.createElement('div');
    panel.id = 'campuslink-settings-panel';
    panel.className = 'settings-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Settings');
    panel.innerHTML = `
      <div class="settings-panel-handle"></div>
      <div class="settings-panel-header">
        <span class="settings-panel-title">⚙️ Settings</span>
        <button class="settings-panel-close" id="settings-panel-close-btn" aria-label="Close settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Account -->
      <div class="settings-section">
        <div class="settings-section-label">Account</div>
        <a href="${editProfileUrl}" class="settings-row">
          <span class="settings-row-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>
          <span class="settings-row-text">Edit Profile</span>
          <span class="settings-row-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
        </a>
        <a href="profile.html?id=${user.id}" class="settings-row">
          <span class="settings-row-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
          <span class="settings-row-text">View Profile</span>
          <span class="settings-row-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
        </a>
        <button class="settings-row" id="settings-blocked-users">
          <span class="settings-row-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></span>
          <span class="settings-row-text">Blocked Users</span>
          <span class="settings-row-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
        </button>
        <button class="settings-row" id="settings-theme-toggle">
          <span class="settings-row-icon" id="settings-theme-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </span>
          <span class="settings-row-text" id="settings-theme-label">Dark Mode</span>
          <span class="settings-row-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
        </button>
      </div>


      <!-- Legal & Info -->
      <div class="settings-section">
        <div class="settings-section-label">Legal & Info</div>
        <a href="about.html" class="settings-row">
          <span class="settings-row-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span>
          <span class="settings-row-text">About CampusLink</span>
          <span class="settings-row-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
        </a>
        <a href="privacy-policy.html" class="settings-row">
          <span class="settings-row-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></span>
          <span class="settings-row-text">Privacy Policy</span>
          <span class="settings-row-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
        </a>
        <a href="terms-and-conditions.html" class="settings-row">
          <span class="settings-row-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg></span>
          <span class="settings-row-text">Terms & Conditions</span>
          <span class="settings-row-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
        </a>
        <a href="child-safety.html" class="settings-row">
          <span class="settings-row-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg></span>
          <span class="settings-row-text">Child Safety</span>
          <span class="settings-row-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
        </a>
        <a href="delete-account.html" class="settings-row danger">
          <span class="settings-row-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></span>
          <span class="settings-row-text">Delete Account</span>
          <span class="settings-row-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
        </a>
      </div>

      <div class="settings-panel-bottom">
        CampusLink · © ${new Date().getFullYear()} · v1.0<br>
        India's Academic Social Network
      </div>
    `;
    document.body.appendChild(panel);

    // Animate in (next tick)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('active');
        panel.classList.add('active');
      });
    });

    // Theme toggle inside panel
    const themeBtn = document.getElementById('settings-theme-toggle');
    const themeIcon = document.getElementById('settings-theme-icon');
    const themeLabel = document.getElementById('settings-theme-label');
    function _syncThemeBtn() {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      themeLabel.textContent = isDark ? 'Light Mode' : 'Dark Mode';
      themeIcon.innerHTML = isDark
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    }
    _syncThemeBtn();
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('campuslink-theme', next);
        _syncThemeBtn();
        // Sync dropdown theme btn too
        const menuThemeBtn = document.getElementById('me-menu-theme-toggle-btn');
        if (menuThemeBtn) menuThemeBtn.click && undefined; // just sync label via existing handler
        const meThemeLabel = document.getElementById('me-theme-label');
        if (meThemeLabel) meThemeLabel.textContent = next === 'dark' ? 'Light Mode' : 'Dark Mode';
      });
    }

    // Blocked users click listener
    const blockedUsersBtn = document.getElementById('settings-blocked-users');
    if (blockedUsersBtn) {
      blockedUsersBtn.addEventListener('click', () => {
        openBlockedUsersModal(user);
      });
    }

    // Close function
    function closePanel() {
      overlay.classList.remove('active');
      panel.classList.remove('active');
      setTimeout(() => {
        overlay.remove();
        panel.remove();
      }, 320);
    }

    // Close handlers
    document.getElementById('settings-panel-close-btn').addEventListener('click', closePanel);
    overlay.addEventListener('click', closePanel);
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') {
        closePanel();
        document.removeEventListener('keydown', onEsc);
      }
    });
  }

  /* ── Blocked Users Modal ───────────────────────────────────────── */
  function openBlockedUsersModal(user) {
    const existing = document.getElementById('campuslink-blocked-panel');
    if (existing) { existing.remove(); }
    const existingOverlay = document.getElementById('campuslink-blocked-overlay');
    if (existingOverlay) { existingOverlay.remove(); }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'campuslink-blocked-overlay';
    overlay.className = 'settings-overlay';
    overlay.style.zIndex = '10001';
    document.body.appendChild(overlay);

    // Create panel
    const panel = document.createElement('div');
    panel.id = 'campuslink-blocked-panel';
    panel.className = 'settings-panel';
    panel.style.zIndex = '10002';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Blocked Users');
    panel.innerHTML = `
      <div class="settings-panel-handle"></div>
      <div class="settings-panel-header">
        <span class="settings-panel-title">🚫 Blocked Users</span>
        <button class="settings-panel-close" id="blocked-panel-close-btn" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="settings-section" style="padding-top:16px;">
        <div id="blocked-users-list" class="blocked-users-container" style="display:flex; flex-direction:column; gap:12px; min-height:100px;">
          <div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.88rem;">Loading blocked users...</div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('active');
        panel.classList.add('active');
      });
    });

    // Close function
    function closeBlockedPanel() {
      overlay.classList.remove('active');
      panel.classList.remove('active');
      setTimeout(() => {
        overlay.remove();
        panel.remove();
      }, 320);
    }

    document.getElementById('blocked-panel-close-btn').addEventListener('click', closeBlockedPanel);
    overlay.addEventListener('click', closeBlockedPanel);

    // Load blocked users data
    (async () => {
      const sb = getClient();
      const listContainer = document.getElementById('blocked-users-list');
      if (!sb || !listContainer) return;

      try {
        // 1. Fetch blocked IDs
        const { data: blocks, error: blocksError } = await sb
          .from('user_blocks')
          .select('blocked_id')
          .eq('blocker_id', user.id);

        if (blocksError) throw blocksError;

        if (!blocks || blocks.length === 0) {
          listContainer.innerHTML = `<div style="text-align:center; padding:30px 20px; color:var(--text-muted); font-size:0.88rem;">No blocked users.</div>`;
          return;
        }

        const blockedIds = blocks.map(b => b.blocked_id);

        // 2. Fetch profiles
        const { data: profiles, error: profilesError } = await sb
          .from('profiles')
          .select('id, full_name, avatar_url, user_type')
          .in('id', blockedIds);

        if (profilesError) throw profilesError;

        if (!profiles || profiles.length === 0) {
          listContainer.innerHTML = `<div style="text-align:center; padding:30px 20px; color:var(--text-muted); font-size:0.88rem;">No blocked users.</div>`;
          return;
        }

        listContainer.innerHTML = '';
        profiles.forEach(profile => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:12px; padding:8px 0; border-bottom:1px solid var(--border-color);';
          
          // Avatar
          let avatarHtml = `<div style="width:36px; height:36px; border-radius:50%; background:var(--light-bg); display:flex; align-items:center; justify-content:center; font-weight:700; color:var(--text-muted); font-size:0.9rem;">${(profile.full_name || '?').charAt(0).toUpperCase()}</div>`;
          if (profile.avatar_url) {
            avatarHtml = `<div style="width:36px; height:36px; border-radius:50%; background-image:url(${profile.avatar_url}); background-size:cover; background-position:center;"></div>`;
          }

          row.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; min-width:0; flex:1;">
              ${avatarHtml}
              <div style="min-width:0; flex:1;">
                <div style="font-weight:700; font-size:0.86rem; color:var(--dark-bg); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${profile.full_name || 'Anonymous User'}</div>
                <div style="font-size:0.72rem; color:var(--text-muted); text-transform:capitalize;">${profile.user_type || 'Student'}</div>
              </div>
            </div>
            <button class="unblock-btn" data-id="${profile.id}" style="background:none; border:1px solid var(--border-color); padding:6px 12px; border-radius:16px; font-size:0.75rem; font-weight:700; color:var(--text-main); cursor:pointer; transition:all 150ms;">
              Unblock
            </button>
          `;
          listContainer.appendChild(row);
        });

        // Add hover effects and unblock click listeners
        listContainer.querySelectorAll('.unblock-btn').forEach(btn => {
          btn.addEventListener('mouseenter', () => {
            btn.style.borderColor = '#EF4444';
            btn.style.color = '#EF4444';
            btn.style.background = '#FEF2F2';
          });
          btn.addEventListener('mouseleave', () => {
            btn.style.borderColor = 'var(--border-color)';
            btn.style.color = 'var(--text-main)';
            btn.style.background = 'none';
          });
          btn.addEventListener('click', async () => {
            const blockedId = btn.getAttribute('data-id');
            btn.disabled = true;
            btn.textContent = '...';

            try {
              const { error } = await sb
                .from('user_blocks')
                .delete()
                .eq('blocker_id', user.id)
                .eq('blocked_id', blockedId);

              if (error) throw error;
              
              // Remove the row from UI
              btn.parentElement.remove();
              
              // If no rows left, show empty state
              if (listContainer.children.length === 0) {
                listContainer.innerHTML = `<div style="text-align:center; padding:30px 20px; color:var(--text-muted); font-size:0.88rem;">No blocked users.</div>`;
              }
            } catch (err) {
              console.error('Failed to unblock user:', err);
              btn.disabled = false;
              btn.textContent = 'Unblock';
              alert('Failed to unblock: ' + err.message);
            }
          });
        });

      } catch (err) {
        console.error('Failed to load blocked users:', err);
        listContainer.innerHTML = `<div style="text-align:center; padding:20px; color:#EF4444; font-size:0.8rem;">Failed to load list.</div>`;
      }
    })();
  }

})();
