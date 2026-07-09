async function initAdmin() {
  'use strict';

  // Hide the body by default for security to prevent layout leaks
  document.body.classList.remove('auth-passed');

  // ── Element References ──────────────────────────────────
  const authOverlay = document.getElementById('auth-loading-overlay');
  const goSchoolBtn = document.getElementById('go-to-schools-btn');
  
  // Tabs
  const tabLinks = document.querySelectorAll('.dashboard-nav-link[data-tab]');
  const tabPanels = document.querySelectorAll('.dashboard-tab-panel');
  const topBarTitle = document.getElementById('top-bar-title');
  const currentDateDisplay = document.getElementById('current-date-display');
  
  // Metrics
  const statSchools = document.getElementById('stat-total-schools');
  const statUsers = document.getElementById('stat-total-users');
  const statEvents = document.getElementById('stat-total-events');
  const statAdmissions = document.getElementById('stat-total-admissions');
  const statSuggestions = document.getElementById('stat-total-suggestions');
  
  // Suggestions
  const suggestionsTbody = document.getElementById('suggestions-tbody');
  const suggestionSearch = document.getElementById('suggestion-search');
  
  // School Registry Table & Filters
  const schoolsTbody = document.getElementById('schools-tbody');
  const schoolSearch = document.getElementById('school-search');
  const schoolCityFilter = document.getElementById('school-city-filter');

  // Event Table & Filters
  const eventsTbody = document.getElementById('events-tbody');
  const eventSearch = document.getElementById('event-search');
  const eventCategoryFilter = document.getElementById('event-category-filter');

  // Admission Table & Filters
  const admissionsTbody = document.getElementById('admissions-tbody');
  const admissionSearch = document.getElementById('admission-search');
  const admissionStatusFilter = document.getElementById('admission-status-filter');

  // Admission Applications Table & Filters
  const applicationsTbody = document.getElementById('applications-tbody');
  const applicationSearch = document.getElementById('application-search');
  const applicationStatusFilter = document.getElementById('application-status-filter');

  // User Table & Filters
  const usersTbody = document.getElementById('users-tbody');
  const userSearch = document.getElementById('user-search');

  // Posts Table & Filters
  const postsTbody = document.getElementById('posts-tbody');
  const postSearch = document.getElementById('post-search');
  const postTypeFilter = document.getElementById('post-type-filter');
  const postTopicFilter = document.getElementById('post-topic-filter');

  // Contact Requests Table & Filters
  const contactRequestsTbody = document.getElementById('contact-requests-tbody');
  const contactRequestSearch = document.getElementById('contact-request-search');
  const contactRequestStatusFilter = document.getElementById('contact-request-status-filter');
  
  // Event Registrations Table & Filters
  const registrationsTbody = document.getElementById('registrations-tbody');
  const registrationSearch = document.getElementById('registration-search');
  const registrationStatusFilter = document.getElementById('registration-status-filter');
  
  // Modal
  const modal = document.getElementById('school-details-modal');
  const modalCloseBtns = [
    document.getElementById('modal-close'),
    document.getElementById('modal-close-btn')
  ];
  
  // Modal Fields
  const modalName = document.getElementById('modal-school-name');
  const modalBoard = document.getElementById('modal-school-board');
  const modalCity = document.getElementById('modal-school-city');
  const modalStatus = document.getElementById('modal-school-status');
  const modalAbout = document.getElementById('modal-school-about');
  const modalWebsite = document.getElementById('modal-school-website');
  const modalEmail = document.getElementById('modal-school-email');
  const modalAdminId = document.getElementById('modal-school-admin-id');
  const modalCreated = document.getElementById('modal-school-created');
  
  // Logout
  const logoutBtn = document.getElementById('sidebar-logout-btn');

  // Global Caches
  let allSchools = [];
  let allEvents = [];
  let allAdmissions = [];
  let allUsers = [];
  let allSuggestions = [];
  let allPosts = [];
  let allApplications = [];
  let allContactRequests = [];
  let allRegistrations = [];

  // Alumni Caches
  let allAlumniBatches = [];
  let allAlumniRequests = [];
  let allAlumniInvites = [];
  let allAlumniMembers = [];
  
  // ── Auth Page Guard ──────────────────────────────────────
  const auth = window.CampusLink && window.CampusLink.auth;
  const supabase = window.CampusLink && window.CampusLink.supabase;
  let session = null;
  let currentUserProfile = null;
  let userSchool = null;

  // Retrieve current active session from Supabase
  if (auth) {
    try {
      session = await auth.getSession();
    } catch (e) {
      console.error('[Admin Auth] Error getting session:', e);
    }
  }

  // Fetch active user profile from profiles table to check role
  if (supabase && session && session.user) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      
      if (!profileError && profile) {
        currentUserProfile = profile;
        console.log('[Admin Auth] Session loaded for profile:', profile.email, 'Role:', profile.platform_role);
      } else if (profileError) {
        console.error('[Admin Auth] Error fetching profile:', profileError);
      }
    } catch (e) {
      console.error('[Admin Auth] Error calling profiles table:', e);
    }
  }

  // Fallback for development if no session or profile is found (only on localhost)
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if ((!session || !currentUserProfile) && isLocalhost) {
    console.log('[Admin Auth] Fallback: No session found on localhost. Bypassing auth check for development.');
    session = { user: { email: 'owaissaifi003@gmail.com', id: 'super-admin-dev-id' } };
    currentUserProfile = {
      email: 'owaissaifi003@gmail.com',
      platform_role: 'super_admin',
      user_type: 'school_representative'
    };
  }

  // Strict check: redirect if not logged in
  if (!session || !currentUserProfile) {
    window.location.href = '../login.html';
    return;
  }

  const role = currentUserProfile.platform_role;
  if (role !== 'super_admin' && role !== 'school_admin') {
    alert('Access Denied: You do not have permission to access this console.');
    window.location.href = '../index.html';
    return;
  }

    window.hideAuthOverlayTransition = function() {
      const authOverlay = document.getElementById('auth-loading-overlay');
      const sidebarLogo = document.querySelector('.dashboard-sidebar .logo-brand-wrapper');
      const loadingTextEl = document.querySelector('.loading-logo-text');
      const loaderCard = document.querySelector('.auth-loading-card');

      // A. Reveal dashboard content first so the browser can calculate its layout & positions
      document.body.classList.add('auth-passed');

      if (sidebarLogo && loadingTextEl && window.getComputedStyle(sidebarLogo.closest('.dashboard-sidebar')).display !== 'none') {
        const startRect = loadingTextEl.getBoundingClientRect();
        const targetRect = sidebarLogo.getBoundingClientRect();

        const deltaX = targetRect.left - startRect.left;
        const deltaY = targetRect.top - startRect.top;
        
        const startFontSize = parseFloat(window.getComputedStyle(loadingTextEl).fontSize) || 35;
        const targetFontSize = parseFloat(window.getComputedStyle(sidebarLogo.querySelector('.logo') || sidebarLogo).fontSize) || 21;
        const scale = targetFontSize / startFontSize;

        // B. Temporarily hide sidebar logo so there are no duplicate overlapping logos during transition
        sidebarLogo.style.opacity = '0';

        if (loaderCard) {
          const sub = loaderCard.querySelector('.auth-loading-text');
          const bar = loaderCard.querySelector('.auth-loading-bar-wrapper');
          if (sub) sub.style.opacity = '0';
          if (bar) bar.style.opacity = '0';
        }

        const dotsEl = loadingTextEl.querySelector('.loading-dots');
        if (dotsEl) {
          dotsEl.style.transition = 'opacity 0.3s ease';
          dotsEl.style.opacity = '0';
        }

        if (authOverlay) {
          authOverlay.style.transition = 'background-color 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
          authOverlay.style.backgroundColor = 'transparent';
        }

        // C. Animate text position & scale
        loadingTextEl.style.transition = 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.8s ease';
        loadingTextEl.style.transformOrigin = 'top left';
        loadingTextEl.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scale})`;

        setTimeout(() => {
          sidebarLogo.style.opacity = '';
          if (authOverlay) authOverlay.remove();
        }, 850);
      } else {
        if (authOverlay) {
          authOverlay.classList.add('fade-out');
          setTimeout(() => { authOverlay.remove(); }, 400);
        }
      }
    };

  // Dynamic UI Setup depending on Role
  if (role === 'school_admin') {
    // Hide forbidden sidebar links
    const hideLinks = ['tab-link-schools', 'tab-link-suggestions', 'tab-link-users', 'tab-link-posts', 'tab-link-moderation'];
    hideLinks.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    
    // Hide 'System Control' text header
    const sideHeaders = document.querySelectorAll('aside div');
    sideHeaders.forEach(el => {
      if (el.textContent.includes('SYSTEM CONTROL')) {
        el.style.display = 'none';
      }
    });
    
    // Show school admin sidebar links
    const showLinks = ['tab-link-profile', 'tab-link-settings', 'tab-link-alumni', 'school-admin-community-header'];
    showLinks.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (id === 'school-admin-community-header') {
          el.style.display = 'block';
        } else {
          el.style.display = 'flex';
        }
      }
    });
    
    // Hide global statistics cards on Overview
    const hideStats = ['stat-card-schools', 'stat-card-suggestions'];
    hideStats.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    
    // Rename 'Total Users' to 'Registrations'
    const cardUsersTitle = document.querySelector('#stat-card-users h4');
    if (cardUsersTitle) cardUsersTitle.textContent = 'Registrations';
    const cardUsersIcon = document.querySelector('#stat-card-users .dash-stat-icon');
    if (cardUsersIcon) cardUsersIcon.textContent = '👥';

    // Adjust grid structure of stats cards to 3 columns on desktop
    const statsGrid = document.getElementById('dashboard-stats-grid');
    if (statsGrid) {
      statsGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
    }

    // Hide overview action cards grid
    const actionCardsGrid = document.getElementById('overview-cards-grid');
    if (actionCardsGrid) {
      actionCardsGrid.style.display = 'none';
    }

    // Hide system controls / status card
    const sysCard = document.getElementById('system-status-card');
    if (sysCard) sysCard.style.display = 'none';
    
    const qaCard = document.getElementById('quick-actions-card');
    if (qaCard) qaCard.style.display = 'none';

    // Update top bar title
    if (topBarTitle) topBarTitle.textContent = 'School Admin Dashboard';
    const mobTitle = document.getElementById('mobile-header-title');
    if (mobTitle) mobTitle.textContent = 'School Admin Dashboard';
    
    // Update sidebar role badge
    const sideBadge = document.getElementById('sidebar-role-badge');
    if (sideBadge) {
      sideBadge.textContent = 'SCHOOL ADMIN';
      sideBadge.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
      sideBadge.style.color = '#10B981';
    }

    // Fetch school
    if (auth && session.user) {
      try {
        userSchool = await auth.getSchoolForUser(session.user.id);
        if (userSchool) {
          console.log('[Admin Auth] Loaded school for representative:', userSchool.name);
          
          // Update Top Bar & Hero Card
          const adminUsername = document.getElementById('admin-username');
          if (adminUsername) adminUsername.textContent = userSchool.name;
          
          const adminRoleBadge = document.getElementById('admin-role-badge');
          if (adminRoleBadge) {
            adminRoleBadge.textContent = userSchool.board ? `${userSchool.board} BOARD` : 'SCHOOL ADMIN';
            adminRoleBadge.style.color = '#10B981';
          }
          
          // Hero Card Details
          const heroName = document.getElementById('hero-admin-name');
          if (heroName) heroName.textContent = userSchool.name;
          
          const heroRole = document.getElementById('hero-admin-role');
          if (heroRole) heroRole.textContent = `Role: School Administrator`;
          
          const heroBadge = document.getElementById('hero-role-badge');
          if (heroBadge) {
            heroBadge.textContent = userSchool.city || 'Verified School';
            heroBadge.style.background = 'linear-gradient(135deg, #10B981, #059669)';
            heroBadge.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
          }

          // Set up Profile Form values
          const profName = document.getElementById('profile-school-name');
          if (profName) profName.value = userSchool.name || '';
          const profCity = document.getElementById('profile-city');
          if (profCity) profCity.value = userSchool.city || '';
          const profState = document.getElementById('profile-state');
          if (profState) profState.value = userSchool.state || '';
          const profBoard = document.getElementById('profile-board');
          if (profBoard) profBoard.value = userSchool.board || 'CBSE';
          const profLogo = document.getElementById('profile-logo-char');
          if (profLogo) profLogo.value = userSchool.logo_letter || userSchool.name.charAt(0).toUpperCase();
          const profAbout = document.getElementById('profile-about');
          if (profAbout) profAbout.value = userSchool.about || '';
        }
      } catch (e) {
        console.error('[Admin Auth] Error fetching school details:', e);
      }
    }
  } else {
    // Super admin layout
    const sideBadge = document.getElementById('sidebar-role-badge');
    if (sideBadge) {
      sideBadge.textContent = 'SUPER ADMIN';
      sideBadge.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
      sideBadge.style.color = '#EF4444';
    }
    const mobTitle = document.getElementById('mobile-header-title');
    if (mobTitle) mobTitle.textContent = 'Super Admin Dashboard';
  }

  // Bind Profile Form Submit
  const profileForm = document.getElementById('dashboard-profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!supabase || !userSchool) return;

      const updatedName = document.getElementById('profile-school-name').value.trim();
      const updatedCity = document.getElementById('profile-city').value.trim();
      const updatedState = document.getElementById('profile-state').value.trim();
      const updatedBoard = document.getElementById('profile-board').value;
      const updatedLogo = document.getElementById('profile-logo-char').value.trim().toUpperCase();
      const updatedAbout = document.getElementById('profile-about').value.trim();

      showToast('Updating profile settings...', 'info');

      try {
        const { error } = await supabase
          .from('schools')
          .update({
            name: updatedName,
            city: updatedCity,
            state: updatedState,
            board: updatedBoard,
            logo_letter: updatedLogo,
            about: updatedAbout
          })
          .eq('id', userSchool.id);

        if (error) throw error;

        showToast('School profile updated successfully!', 'success');
        // Update local object
        userSchool.name = updatedName;
        userSchool.city = updatedCity;
        userSchool.state = updatedState;
        userSchool.board = updatedBoard;
        userSchool.logo_letter = updatedLogo;
        userSchool.about = updatedAbout;

        // Refresh header/hero
        const heroName = document.getElementById('hero-admin-name');
        if (heroName) heroName.textContent = updatedName;
        const adminUsername = document.getElementById('admin-username');
        if (adminUsername) adminUsername.textContent = updatedName;
      } catch (err) {
        console.error('Failed to update profile:', err);
        showToast(`Failed to update profile: ${err.message}`, 'error');
      }
    });
  }

  // Bind Overview Click Navigation
  const clickTab = (tabId) => {
    const link = document.getElementById(tabId);
    if (link) link.click();
  };
  document.getElementById('card-overview-suggestions')?.addEventListener('click', () => clickTab('tab-link-suggestions'));
  document.getElementById('card-overview-contacts')?.addEventListener('click', () => clickTab('tab-link-contact-requests'));
  document.getElementById('card-overview-registrations')?.addEventListener('click', () => clickTab('tab-link-registrations'));
  document.getElementById('card-overview-moderation')?.addEventListener('click', () => clickTab('tab-link-moderation'));

  function updateOverviewActionCardsCounts() {
    if (currentUserProfile?.platform_role !== 'super_admin') return;
    
    const suggCount = document.getElementById('overview-suggestions-count');
    if (suggCount) suggCount.textContent = allSuggestions.length;
    
    const contactCount = document.getElementById('overview-contacts-count');
    if (contactCount) contactCount.textContent = allContactRequests.length;
    
    const regCount = document.getElementById('overview-registrations-count');
    if (regCount) regCount.textContent = allRegistrations.length;
  }

  if (window.hideAuthOverlayTransition) {
    window.hideAuthOverlayTransition();
  }

  // ── Date Display ─────────────────────────────────────────
  function displayCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    if (currentDateDisplay) {
      currentDateDisplay.textContent = today.toLocaleDateString('en-US', options);
    }
  }
  displayCurrentDate();

  // ── Tab Navigation ───────────────────────────────────────
  tabLinks.forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const tabTarget = link.getAttribute('data-tab');
      
      tabLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      tabPanels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === `${tabTarget}-tab`) {
          panel.classList.add('active');
        }
      });

       let pageTitle = currentUserProfile.platform_role === 'school_admin' ? 'School Admin Dashboard' : 'Super Admin Dashboard';
      if (tabTarget === 'profile') pageTitle = 'School Profile Settings';
      if (tabTarget === 'settings') pageTitle = 'School Settings';
      if (tabTarget === 'alumni') {
        pageTitle = 'Alumni Management';
        loadAlumniDashboard();
      }
      if (tabTarget === 'schools') pageTitle = 'School Registry Management';
      if (tabTarget === 'suggestions') pageTitle = 'School Suggestions Inbox';
      if (tabTarget === 'events') pageTitle = 'Event & Fest Registry';
      if (tabTarget === 'registrations') {
        pageTitle = 'Event Registrations Registry';
        await loadRegistrationsData();
      }
      if (tabTarget === 'admissions') pageTitle = 'Admission Management';
      if (tabTarget === 'applications') pageTitle = 'Global Admission Applications';
      if (tabTarget === 'contact-requests') pageTitle = 'Global Contact Requests';
      if (tabTarget === 'users') pageTitle = 'User Account Directory';
      if (tabTarget === 'posts') pageTitle = 'Feed Posts Management';
      if (tabTarget === 'moderation') {
        pageTitle = 'Content Moderation Panel';
        await loadModerationReports();
      }
      if (tabTarget === 'user-reports') {
        pageTitle = 'User Reports Moderation';
        await loadUserReports();
      }
      if (topBarTitle) topBarTitle.textContent = pageTitle;
      const mobTitle = document.getElementById('mobile-header-title');
      if (mobTitle) mobTitle.textContent = pageTitle;
    });
  });

  if (goSchoolBtn) {
    goSchoolBtn.addEventListener('click', () => {
      const schoolsTabLink = document.getElementById('tab-link-schools');
      if (schoolsTabLink) schoolsTabLink.click();
    });
  }

  // ── Event Registrations Management ─────────────────────────
  async function loadRegistrationsData() {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          id,
          school_id,
          student_name,
          student_grade,
          created_at,
          status,
          is_team,
          team_name,
          team_size,
          team_members,
          project_details,
          parent_name,
          parent_phone,
          competition_category,
          student_school_name,
          events(title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        allRegistrations = currentUserProfile.platform_role === 'school_admin'
          ? data.filter(r => r.school_id === userSchool?.id)
          : data;
        renderRegistrations(allRegistrations);
        updateOverviewActionCardsCounts();
        
        // Update metric card for school admin
        if (currentUserProfile.platform_role === 'school_admin' && statUsers) {
          statUsers.textContent = allRegistrations.length;
        }
      }
    } catch (e) {
      console.error('Failed to load event registrations from Supabase:', e);
      if (registrationsTbody) {
        registrationsTbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 40px; color: #EF4444;">
              Failed to fetch event registration records: ${e.message}
            </td>
          </tr>
        `;
      }
    }
  }

  function renderRegistrations(regsList) {
    if (!registrationsTbody) return;
    registrationsTbody.innerHTML = '';

    if (regsList.length === 0) {
      registrationsTbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No registration records found matching filters.
          </td>
        </tr>
      `;
      return;
    }

    regsList.forEach(reg => {
      const tr = document.createElement('tr');
      const dateApplied = new Date(reg.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      let statusBadgeClass = 'status-pending';
      if (reg.status === 'approved') statusBadgeClass = 'status-approved';
      if (reg.status === 'rejected') statusBadgeClass = 'status-rejected';

      const typeText = reg.is_team ? `Team (${reg.team_size})` : 'Individual';
      const eventTitle = reg.events ? reg.events.title : 'General Event';

      const approveBtn = reg.status === 'pending'
        ? `<button class="btn btn-primary btn-approve-reg" data-id="${reg.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm);">Approve</button>`
        : '';
      const rejectBtn = reg.status === 'pending'
        ? `<button class="btn btn-secondary btn-reject-reg" data-id="${reg.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); background-color: #FEF2F2; color: #EF4444; border-color: rgba(239, 68, 68, 0.2);">Reject</button>`
        : '';

      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--dark-bg);">${reg.student_name}</td>
        <td>${reg.student_school_name || 'N/A'}</td>
        <td>${eventTitle}</td>
        <td>${dateApplied}</td>
        <td><span class="badge-status status-approved" style="background-color: rgba(59, 130, 246, 0.1); color: var(--primary); font-weight:700;">${typeText}</span></td>
        <td><span class="badge-status ${statusBadgeClass}" style="font-weight:700;">${reg.status.toUpperCase()}</span></td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="btn btn-secondary btn-view-reg-details" data-id="${reg.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm);">View</button>
            ${approveBtn}
            ${rejectBtn}
            <button class="btn btn-secondary btn-delete-reg" data-id="${reg.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); background-color: #FEF2F2; color: #EF4444; border-color: rgba(239, 68, 68, 0.2);">Delete</button>
          </div>
        </td>
      `;
      registrationsTbody.appendChild(tr);
    });

    // Action listeners
    registrationsTbody.querySelectorAll('.btn-view-reg-details').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openRegistrationDetailsModal(id);
      });
    });

    registrationsTbody.querySelectorAll('.btn-approve-reg').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await updateRegistrationStatus(id, 'approved');
      });
    });

    registrationsTbody.querySelectorAll('.btn-reject-reg').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        await updateRegistrationStatus(id, 'rejected');
      });
    });

    registrationsTbody.querySelectorAll('.btn-delete-reg').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this event registration permanently?')) {
          await deleteRegistration(id);
        }
      });
    });
  }

  function filterRegistrations() {
    if (!registrationSearch || !registrationStatusFilter) return;
    const query = registrationSearch.value.trim().toLowerCase();
    const status = registrationStatusFilter.value;

    const filtered = allRegistrations.filter(reg => {
      const eventTitle = reg.events ? reg.events.title.toLowerCase() : 'general event';
      const matchesSearch = reg.student_name.toLowerCase().includes(query) ||
                            (reg.student_school_name && reg.student_school_name.toLowerCase().includes(query)) ||
                            eventTitle.includes(query);
      
      const matchesStatus = !status || reg.status === status;
      return matchesSearch && matchesStatus;
    });

    renderRegistrations(filtered);
  }

  async function updateRegistrationStatus(id, newStatus) {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('event_registrations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      showToast(`Registration successfully ${newStatus}!`, 'success');
      await loadRegistrationsData();
    } catch (e) {
      console.error(`Failed to update registration status:`, e);
      showToast(`Failed to update registration: ${e.message}`, 'error');
    }
  }

  async function deleteRegistration(id) {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('event_registrations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast('Registration successfully deleted!', 'success');
      await loadRegistrationsData();
    } catch (e) {
      console.error('Failed to delete registration:', e);
      showToast(`Failed to delete registration: ${e.message}`, 'error');
    }
  }

  // --- Registration Details Modal ---
  const regDetailsModal = document.getElementById('reg-details-modal');
  const regDetailsContent = document.getElementById('reg-details-content');
  const regDetailsActions = document.getElementById('reg-details-actions');
  const closeRegDetailsBtn = document.getElementById('close-reg-details-btn');

  function openRegistrationDetailsModal(id) {
    if (!regDetailsModal || !regDetailsContent) return;
    
    const reg = allRegistrations.find(r => r.id === id);
    if (!reg) return;

    let teamHtml = '';
    if (reg.is_team) {
      teamHtml = `
        <div style="margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 16px;">
          <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Team Information</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">Team Name</span>
              <strong style="color: var(--dark-bg); font-weight: 700;">${reg.team_name || 'N/A'}</strong>
            </div>
            <div>
              <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">Team Size</span>
              <strong style="color: var(--dark-bg); font-weight: 700;">${reg.team_size || 1} Members</strong>
            </div>
          </div>
          <div style="margin-top: 12px;">
            <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">Team Members / Details</span>
            <p style="margin: 4px 0 0 0; background: var(--bg-light); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.85rem; font-style: italic;">${reg.team_members || 'No details specified.'}</p>
          </div>
        </div>
      `;
    }

    const eventTitle = reg.events ? reg.events.title : 'General Event';

    regDetailsContent.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div>
          <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Student Info</h4>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div><span style="color: var(--text-muted);">Name:</span> <strong>${reg.student_name}</strong></div>
            <div><span style="color: var(--text-muted);">Grade:</span> <strong>${reg.student_grade}</strong></div>
            <div><span style="color: var(--text-muted);">School:</span> <strong>${reg.student_school_name || 'N/A'}</strong></div>
          </div>
        </div>
        <div>
          <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Parent Consent</h4>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div><span style="color: var(--text-muted);">Parent Name:</span> <strong>${reg.parent_name || 'N/A'}</strong></div>
            <div><span style="color: var(--text-muted);">Phone:</span> <strong>${reg.parent_phone || 'N/A'}</strong></div>
            <div><span style="color: var(--text-muted);">Consent Given:</span> <strong style="color: #10B981;">YES ✓</strong></div>
          </div>
        </div>
      </div>

      ${teamHtml}

      <div style="margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 16px;">
        <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Competition Synopsis / Project Details</h4>
        <p style="margin: 0; background: var(--bg-light); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.85rem; font-style: italic; white-space: pre-wrap;">${reg.project_details || 'No synopsis provided.'}</p>
      </div>

      <div style="margin-top: 16px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 16px;">
        <div>
          <span style="font-size: 0.8rem; color: var(--text-muted);">Event Registered</span>
          <span style="display: block; font-weight: 700; color: var(--primary);">${eventTitle}</span>
        </div>
        <div>
          <span style="font-size: 0.8rem; color: var(--text-muted); display: block; text-align: right;">Registration Status</span>
          <span class="badge-status status-${reg.status}" style="font-weight: 700; display: inline-block; padding: 4px 10px; border-radius: var(--radius-sm); text-transform: uppercase;">${reg.status}</span>
        </div>
      </div>
    `;

    if (reg.status === 'pending') {
      regDetailsActions.innerHTML = `
        <button class="btn btn-secondary btn-modal-reject" style="background-color: #FEF2F2; color: #EF4444; border-color: rgba(239, 68, 68, 0.2); padding: 10px 20px; font-size: 0.85rem; border-radius: var(--radius-sm); cursor: pointer;">Reject</button>
        <button class="btn btn-primary btn-modal-approve" style="padding: 10px 20px; font-size: 0.85rem; border-radius: var(--radius-sm); cursor: pointer;">Approve</button>
      `;
      
      regDetailsActions.querySelector('.btn-modal-approve').onclick = async () => {
        await updateRegistrationStatus(id, 'approved');
        closeRegistrationDetailsModal();
      };
      
      regDetailsActions.querySelector('.btn-modal-reject').onclick = async () => {
        await updateRegistrationStatus(id, 'rejected');
        closeRegistrationDetailsModal();
      };
    } else {
      regDetailsActions.innerHTML = `
        <button class="btn btn-secondary btn-modal-close" style="padding: 10px 20px; font-size: 0.85rem; border-radius: var(--radius-sm); cursor: pointer;">Close</button>
      `;
      regDetailsActions.querySelector('.btn-modal-close').onclick = closeRegistrationDetailsModal;
    }

    regDetailsModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeRegistrationDetailsModal() {
    if (regDetailsModal) {
      regDetailsModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }

  if (closeRegDetailsBtn) {
    closeRegDetailsBtn.onclick = closeRegistrationDetailsModal;
  }
  if (regDetailsModal) {
    regDetailsModal.onclick = (e) => {
      if (e.target === regDetailsModal) closeRegistrationDetailsModal();
    };
  }

  if (registrationSearch) registrationSearch.addEventListener('input', filterRegistrations);
  if (registrationStatusFilter) registrationStatusFilter.addEventListener('change', filterRegistrations);

  // ── Supabase Data Loading ────────────────────────────────
  async function loadSystemStats() {
    if (!supabase) return;

    try {
      // 1. Total Schools count
      const { count: countSch, error: errSch } = await supabase
        .from('schools')
        .select('*', { count: 'exact', head: true });
      if (!errSch && statSchools) statSchools.textContent = countSch;

      // 2. Total Users count
      const { count: countUsr, error: errUsr } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (!errUsr && statUsers) statUsers.textContent = countUsr;

      // 3. Total Events count
      const { count: countEvt, error: errEvt } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true });
      if (!errEvt && statEvents) statEvents.textContent = countEvt;

      // 4. Total Admissions count
      const { count: countAdm, error: errAdm } = await supabase
        .from('admissions')
        .select('*', { count: 'exact', head: true });
      if (!errAdm && statAdmissions) statAdmissions.textContent = countAdm;

      // 5. Total Suggestions count
      const { count: countSug, error: errSug } = await supabase
        .from('school_suggestions')
        .select('*', { count: 'exact', head: true });
      if (!errSug && statSuggestions) statSuggestions.textContent = countSug;

    } catch (e) {
      console.error('Failed to load metric counts from Supabase:', e);
    }
  }

  async function loadSchoolsData() {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        allSchools = data;
        populateCityFilter(data);
        renderSchools(data);
        if (typeof renderAnalytics === 'function') renderAnalytics();
      }
    } catch (e) {
      console.error('Failed to load schools from Supabase:', e);
      if (schoolsTbody) {
        schoolsTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 40px; color: #EF4444;">
              Failed to fetch school records: ${e.message}
            </td>
          </tr>
        `;
      }
    }
  }

  // ── Render School Management Table ──────────────────────
  function renderSchools(schoolsList) {
    if (!schoolsTbody) return;
    schoolsTbody.innerHTML = '';

    if (schoolsList.length === 0) {
      schoolsTbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No school records found matching filters.
          </td>
        </tr>
      `;
      return;
    }

    schoolsList.forEach(school => {
      const tr = document.createElement('tr');
      const createdDate = new Date(school.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      let statusBadgeClass = 'status-pending';
      if (school.status === 'approved') statusBadgeClass = 'status-approved';
      if (school.status === 'rejected') statusBadgeClass = 'status-rejected';
      
      const statusLabel = (school.status || 'pending').toUpperCase();
      const canChangeStatus = currentUserProfile && currentUserProfile.platform_role === 'super_admin';
      const approveBtn = canChangeStatus 
        ? `<button class="btn btn-primary btn-approve-school" data-id="${school.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); display: ${school.status === 'approved' ? 'none' : 'inline-block'};">Approve</button>` 
        : '';
      const rejectBtn = canChangeStatus 
        ? `<button class="btn btn-secondary btn-reject-school" data-id="${school.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); background-color: #FEF2F2; color: #EF4444; border-color: rgba(239, 68, 68, 0.2); display: ${school.status === 'rejected' ? 'none' : 'inline-block'};">Reject</button>` 
        : '';

      const canChangeBadge = currentUserProfile && currentUserProfile.platform_role === 'super_admin';
      const selectDisabledAttr = canChangeBadge ? '' : 'disabled';
      const selectCursor = canChangeBadge ? 'pointer' : 'not-allowed';
      const selectBackground = canChangeBadge ? 'white' : '#F1F5F9';
      const selectColor = canChangeBadge ? 'inherit' : '#64748B';

      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--dark-bg);">${school.name}</td>
        <td>${school.city || 'N/A'}</td>
        <td><span class="badge-status status-approved" style="background-color: rgba(59, 130, 246, 0.1); color: var(--primary); font-weight:700;">${school.board || 'CBSE'}</span></td>
        <td>
          <select class="select-institution-type" data-id="${school.id}" ${selectDisabledAttr} style="padding: 4px 8px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.8rem; background: ${selectBackground}; color: ${selectColor}; outline: none; cursor: ${selectCursor};">
            <option value="school" ${school.institution_type === 'school' || !school.institution_type ? 'selected' : ''}>School</option>
            <option value="Central University" ${school.institution_type === 'Central University' ? 'selected' : ''}>Central University</option>
            <option value="State University" ${school.institution_type === 'State University' ? 'selected' : ''}>State University</option>
            <option value="Private University" ${school.institution_type === 'Private University' ? 'selected' : ''}>Private University</option>
            <option value="Deemed-to-be University" ${school.institution_type === 'Deemed-to-be University' ? 'selected' : ''}>Deemed-to-be University</option>
            <option value="Institute of National Importance (IIT, NIT, IIIT, AIIMS, etc.)" ${school.institution_type === 'Institute of National Importance (IIT, NIT, IIIT, AIIMS, etc.)' ? 'selected' : ''}>Institute of National Importance</option>
            <option value="Government College" ${school.institution_type === 'Government College' ? 'selected' : ''}>Government College</option>
            <option value="Private College" ${school.institution_type === 'Private College' ? 'selected' : ''}>Private College</option>
            <option value="Polytechnic" ${school.institution_type === 'Polytechnic' ? 'selected' : ''}>Polytechnic</option>
            <option value="Other" ${school.institution_type === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </td>
        <td><span class="badge-status ${statusBadgeClass}" style="font-weight:700;">${statusLabel}</span></td>
        <td>
          <select class="select-school-badge" data-id="${school.id}" ${selectDisabledAttr} style="padding: 4px 8px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.8rem; background: ${selectBackground}; color: ${selectColor}; outline: none; cursor: ${selectCursor};">
            <option value="none" ${school.verification_badge === 'none' ? 'selected' : ''}>None</option>
            <option value="blue" ${school.verification_badge === 'blue' || !school.verification_badge ? 'selected' : ''}>Blue (Verified)</option>
            <option value="gold" ${school.verification_badge === 'gold' ? 'selected' : ''}>Gold (Partner)</option>
          </select>
        </td>
        <td>${createdDate}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-view-details" data-id="${school.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm);">View</button>
            ${approveBtn}
            ${rejectBtn}
          </div>
        </td>
      `;
      schoolsTbody.appendChild(tr);
    });

    // Bind details buttons
    schoolsTbody.querySelectorAll('.btn-view-details').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const schoolId = btn.getAttribute('data-id');
        openSchoolDetailsModal(schoolId);
      });
    });

    // Bind approve buttons
    schoolsTbody.querySelectorAll('.btn-approve-school').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const schoolId = btn.getAttribute('data-id');
        await updateSchoolStatus(schoolId, 'approved');
      });
    });

    // Bind reject buttons
    schoolsTbody.querySelectorAll('.btn-reject-school').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const schoolId = btn.getAttribute('data-id');
        await updateSchoolStatus(schoolId, 'rejected');
      });
    });

    // Bind badge change dropdowns
    schoolsTbody.querySelectorAll('.select-school-badge').forEach(select => {
      select.addEventListener('change', async (e) => {
        const id = select.getAttribute('data-id');
        const newBadge = select.value;
        await updateSchoolBadge(id, newBadge);
      });
    });

    // Bind institution type change dropdowns
    schoolsTbody.querySelectorAll('.select-institution-type').forEach(select => {
      select.addEventListener('change', async (e) => {
        const id = select.getAttribute('data-id');
        const newType = select.value;
        await updateInstitutionType(id, newType);
      });
    });
  }

  // ── Populate City Dropdown ───────────────────────────────
  function populateCityFilter(schoolsList) {
    if (!schoolCityFilter) return;
    
    // Extract unique cities
    const cities = [...new Set(schoolsList.map(s => s.city).filter(Boolean))].sort();
    
    // Keep the default first "All Cities" option
    schoolCityFilter.innerHTML = '<option value="">All Cities</option>';
    
    cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      schoolCityFilter.appendChild(option);
    });
  }

  // ── Filtering Logic ──────────────────────────────────────
  function filterSchools() {
    const query = schoolSearch.value.trim().toLowerCase();
    const city = schoolCityFilter.value;

    const filtered = allSchools.filter(school => {
      const matchesSearch = school.name.toLowerCase().includes(query);
      const matchesCity = !city || school.city === city;
      return matchesSearch && matchesCity;
    });

    renderSchools(filtered);
  }

  if (schoolSearch) schoolSearch.addEventListener('input', filterSchools);
  if (schoolCityFilter) schoolCityFilter.addEventListener('change', filterSchools);

  // ── Modal Handlers ───────────────────────────────────────
  function openSchoolDetailsModal(schoolId) {
    const school = allSchools.find(s => s.id === schoolId);
    if (!school) return;

    modalName.textContent = school.name;
    modalBoard.textContent = `${school.board || 'CBSE'} Board`;
    modalCity.textContent = school.city || 'N/A';
    
    const statusLabel = (school.status || 'pending').toUpperCase();
    if (modalStatus) {
      modalStatus.textContent = statusLabel;
      let statusClass = 'status-pending';
      if (school.status === 'approved') statusClass = 'status-approved';
      if (school.status === 'rejected') statusClass = 'status-rejected';
      modalStatus.className = `badge badge-status ${statusClass}`;
    }

    modalAbout.textContent = school.about || 'No description available for this school.';
    
    if (school.website) {
      modalWebsite.style.display = 'inline-block';
      modalWebsite.href = school.website.startsWith('http') ? school.website : `https://${school.website}`;
      modalWebsite.textContent = school.website;
    } else {
      modalWebsite.style.display = 'none';
    }
    
    modalEmail.textContent = school.contact_email || 'N/A';
    modalAdminId.textContent = school.admin_user_id || 'N/A';
    
    modalCreated.textContent = new Date(school.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeSchoolDetailsModal() {
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = 'auto';
    }
  }

  modalCloseBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', closeSchoolDetailsModal);
  });

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeSchoolDetailsModal();
    });
  }

  // ── Update School Status & Toast ─────────────────────────
  const toastContainer = document.getElementById('toast-container');
  function showToast(message, type = 'success') {
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast-alert toast-alert-${type}`;
    
    let icon = '✓';
    if (type === 'error') icon = '⚠';

    toast.innerHTML = `
      <span style="font-weight:700; font-size:1.1rem;">${icon}</span>
      <div>${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 50);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 400);
    }, 3500);
  }

  async function updateSchoolStatus(schoolId, newStatus) {
    if (!supabase) return;
    const canChangeStatus = currentUserProfile && currentUserProfile.platform_role === 'super_admin';
    if (!canChangeStatus) {
      showToast('Access Denied: Only super admins can approve or reject schools.', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('schools')
        .update({ status: newStatus })
        .eq('id', schoolId);

      if (error) throw error;

      showToast(`School successfully ${newStatus}!`, 'success');
      
      // Reload stats and data
      await loadSystemStats();
      await loadSchoolsData();
    } catch (e) {
      console.error(`Failed to update school status to ${newStatus}:`, e);
      showToast(`Failed to update status: ${e.message}`, 'error');
    }
  }

  async function updateSchoolBadge(schoolId, newBadge) {
    if (!supabase) return;
    const canChange = currentUserProfile && currentUserProfile.platform_role === 'super_admin';
    if (!canChange) {
      showToast('Access Denied: Only super admins can change school verification badges.', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('schools')
        .update({ verification_badge: newBadge })
        .eq('id', schoolId);

      if (error) throw error;

      showToast(`School verification badge updated to ${newBadge.toUpperCase()}!`, 'success');
      await loadSchoolsData();
    } catch (e) {
      console.error('Failed to update school badge:', e);
      showToast(`Failed to update school badge: ${e.message}`, 'error');
    }
  }

  async function updateInstitutionType(schoolId, newType) {
    if (!supabase) return;
    const canChange = currentUserProfile && currentUserProfile.platform_role === 'super_admin';
    if (!canChange) {
      showToast('Access Denied: Only super admins can change institution types.', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('schools')
        .update({ institution_type: newType })
        .eq('id', schoolId);

      if (error) throw error;

      showToast(`Institution type updated to ${newType.toUpperCase()}!`, 'success');
      await loadSchoolsData();
    } catch (e) {
      console.error('Failed to update institution type:', e);
      showToast(`Failed to update institution type: ${e.message}`, 'error');
    }
  }

  // ── Event Management ──────────────────────────────────────
  async function loadEventsData() {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        allEvents = currentUserProfile.platform_role === 'school_admin'
          ? data.filter(e => e.school_id === userSchool?.id)
          : data;
        renderEvents(allEvents);
        
        if (currentUserProfile.platform_role === 'school_admin' && statEvents) {
          statEvents.textContent = allEvents.length;
        }
      }
    } catch (e) {
      console.error('Failed to load events from Supabase:', e);
      if (eventsTbody) {
        eventsTbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 40px; color: #EF4444;">
              Failed to fetch event records: ${e.message}
            </td>
          </tr>
        `;
      }
    }
  }

  function renderEvents(eventsList) {
    if (!eventsTbody) return;
    eventsTbody.innerHTML = '';

    if (eventsList.length === 0) {
      eventsTbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No event records found matching filters.
          </td>
        </tr>
      `;
      return;
    }

    eventsList.forEach(event => {
      const tr = document.createElement('tr');
      const eventDateStr = event.event_date || 'N/A';

      let categoryLabel = 'Competition';
      if (event.category === 'cultural') categoryLabel = 'Cultural Fest';
      if (event.category === 'workshop') categoryLabel = 'Workshop';

      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--dark-bg);">${event.title}</td>
        <td>${event.school_name || 'Partner School'}</td>
        <td><span class="badge-status status-approved" style="background-color: rgba(59, 130, 246, 0.1); color: var(--primary); font-weight:700;">${categoryLabel}</span></td>
        <td>${eventDateStr}</td>
        <td>${event.registrations || '0 Registered'}</td>
        <td>
          <button class="btn btn-secondary btn-delete-event" data-id="${event.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); background-color: #FEF2F2; color: #EF4444; border-color: rgba(239, 68, 68, 0.2);">Delete</button>
        </td>
      `;
      eventsTbody.appendChild(tr);
    });

    // Bind delete buttons
    eventsTbody.querySelectorAll('.btn-delete-event').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const eventId = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this event opportunity?')) {
          await deleteEvent(eventId);
        }
      });
    });
  }

  function filterEvents() {
    const query = eventSearch.value.trim().toLowerCase();
    const category = eventCategoryFilter.value;

    const filtered = allEvents.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(query) || 
                            (event.school_name && event.school_name.toLowerCase().includes(query));
      
      const matchesCategory = !category || event.category === category;
      return matchesSearch && matchesCategory;
    });

    renderEvents(filtered);
  }

  async function deleteEvent(eventId) {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      showToast('Event successfully deleted!', 'success');
      await loadSystemStats();
      await loadEventsData();
    } catch (e) {
      console.error('Failed to delete event:', e);
      showToast(`Failed to delete event: ${e.message}`, 'error');
    }
  }

  // ── Admission Management ──────────────────────────────────
  async function loadAdmissionsData() {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('admissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        allAdmissions = currentUserProfile.platform_role === 'school_admin'
          ? data.filter(a => a.school_id === userSchool?.id)
          : data;
        renderAdmissions(allAdmissions);
        
        if (currentUserProfile.platform_role === 'school_admin' && statAdmissions) {
          statAdmissions.textContent = allAdmissions.length;
        }
      }
    } catch (e) {
      console.error('Failed to load admissions from Supabase:', e);
      if (admissionsTbody) {
        admissionsTbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 40px; color: #EF4444;">
              Failed to fetch admission records: ${e.message}
            </td>
          </tr>
        `;
      }
    }
  }

  function renderAdmissions(admissionsList) {
    if (!admissionsTbody) return;
    admissionsTbody.innerHTML = '';

    if (admissionsList.length === 0) {
      admissionsTbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No admission records found matching filters.
          </td>
        </tr>
      `;
      return;
    }

    admissionsList.forEach(adm => {
      const tr = document.createElement('tr');
      const isClosed = adm.status === 'closed';

      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--dark-bg);">${adm.school_name || 'Partner School'}</td>
        <td>${adm.classes_open || 'N/A'}</td>
        <td>${adm.academic_year || '2026-27'}</td>
        <td>${adm.last_date || 'N/A'}</td>
        <td><span class="badge-status ${isClosed ? 'status-rejected' : 'status-approved'}" style="font-weight:700;">${(adm.status || 'open').toUpperCase()}</span></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-toggle-admission" data-id="${adm.id}" data-status="${adm.status || 'open'}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm);">${isClosed ? 'Open' : 'Close'}</button>
            <button class="btn btn-secondary btn-delete-admission" data-id="${adm.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); background-color: #FEF2F2; color: #EF4444; border-color: rgba(239, 68, 68, 0.2);">Delete</button>
          </div>
        </td>
      `;
      admissionsTbody.appendChild(tr);
    });

    // Bind action buttons
    admissionsTbody.querySelectorAll('.btn-toggle-admission').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        const currentStatus = btn.getAttribute('data-status');
        const nextStatus = currentStatus === 'closed' ? 'open' : 'closed';
        await toggleAdmissionStatus(id, nextStatus);
      });
    });

    admissionsTbody.querySelectorAll('.btn-delete-admission').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this admission posting?')) {
          await deleteAdmission(id);
        }
      });
    });
  }

  function filterAdmissions() {
    const query = admissionSearch.value.trim().toLowerCase();
    const status = admissionStatusFilter.value;

    const filtered = allAdmissions.filter(adm => {
      const matchesSearch = (adm.school_name && adm.school_name.toLowerCase().includes(query)) ||
                            (adm.classes_open && adm.classes_open.toLowerCase().includes(query));
      
      const matchesStatus = !status || adm.status === status;
      return matchesSearch && matchesStatus;
    });

    renderAdmissions(filtered);
  }

  async function toggleAdmissionStatus(admissionId, newStatus) {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('admissions')
        .update({ status: newStatus })
        .eq('id', admissionId);

      if (error) throw error;

      showToast(`Admission successfully ${newStatus === 'open' ? 'opened' : 'closed'}!`, 'success');
      await loadSystemStats();
      await loadAdmissionsData();
    } catch (e) {
      console.error('Failed to toggle admission status:', e);
      showToast(`Failed to update status: ${e.message}`, 'error');
    }
  }

  async function deleteAdmission(admissionId) {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('admissions')
        .delete()
        .eq('id', admissionId);

      if (error) throw error;

      showToast('Admission posting successfully deleted!', 'success');
      await loadSystemStats();
      await loadAdmissionsData();
    } catch (e) {
      console.error('Failed to delete admission posting:', e);
      showToast(`Failed to delete: ${e.message}`, 'error');
    }
  }

  // ── User Management ───────────────────────────────────────
  async function loadUsersData() {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        allUsers = data;
        renderUsers(data);
        if (typeof renderAnalytics === 'function') renderAnalytics();
      }
    } catch (e) {
      console.error('Failed to load user profiles from Supabase:', e);
      if (usersTbody) {
        usersTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 40px; color: #EF4444;">
              Failed to fetch user accounts: ${e.message}
            </td>
          </tr>
        `;
      }
    }
  }

  function renderUsers(usersList) {
    if (!usersTbody) return;
    usersTbody.innerHTML = '';

    if (usersList.length === 0) {
      usersTbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No user accounts found matching search filters.
          </td>
        </tr>
      `;
      return;
    }

    usersList.forEach(profile => {
      const tr = document.createElement('tr');
      const createdDate = new Date(profile.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      const userTypeLabel = auth ? auth.getUserTypeLabel(profile.user_type) : (profile.user_type || 'N/A');
      const platformRoleLabel = auth ? auth.getPlatformRoleLabel(profile.platform_role) : (profile.platform_role || 'user');

      let roleBadgeClass = 'status-pending'; // Member/user default
      if (profile.platform_role === 'super_admin') roleBadgeClass = 'status-rejected';
      if (profile.platform_role === 'school_admin') roleBadgeClass = 'status-approved';

      const displayName = profile.full_name || 'N/A';
      const displayEmail = profile.email || 'N/A';
      const verifiedBadge = profile.is_verified ? `
        <svg class="verified-badge verified-badge-sm" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Profile">
          <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
          <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
        </svg>
      ` : '';

      const canChangeStatus = currentUserProfile && currentUserProfile.platform_role === 'super_admin';
      const selectDisabledAttr = canChangeStatus ? '' : 'disabled';
      const selectCursor = canChangeStatus ? 'pointer' : 'not-allowed';
      const selectBackground = canChangeStatus ? 'white' : '#F1F5F9';
      const selectColor = canChangeStatus ? 'inherit' : '#64748B';

      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--dark-bg);">${displayName}${verifiedBadge}</td>
        <td>${displayEmail}</td>
        <td><span class="badge-status status-approved" style="background-color: rgba(59, 130, 246, 0.1); color: var(--primary); font-weight:700;">${userTypeLabel}</span></td>
        <td><span class="badge-status ${roleBadgeClass}" style="font-weight:700;">${platformRoleLabel.toUpperCase()}</span></td>
        <td>${createdDate}</td>
        <td>
          <select class="select-role-change" data-id="${profile.id}" ${selectDisabledAttr} style="padding: 4px 8px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.8rem; background: ${selectBackground}; color: ${selectColor}; outline: none; cursor: ${selectCursor};">
            <option value="user" ${profile.platform_role === 'user' ? 'selected' : ''}>Member</option>
            <option value="school_admin" ${profile.platform_role === 'school_admin' ? 'selected' : ''}>School Admin</option>
            <option value="super_admin" ${profile.platform_role === 'super_admin' ? 'selected' : ''}>Super Admin</option>
          </select>
        </td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-toggle-verify" data-id="${profile.id}" data-verified="${profile.is_verified ? 'true' : 'false'}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); ${profile.is_verified ? 'border-color: #D1D5DB; color: #374151; background: transparent;' : 'background-color: #10B981; border-color: #10B981; color: white;'}">
              ${profile.is_verified ? 'Unverify' : 'Verify'}
            </button>
            <button class="btn btn-secondary btn-delete-user" data-id="${profile.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); background-color: #FEF2F2; color: #EF4444; border-color: rgba(239, 68, 68, 0.2);">Delete</button>
          </div>
        </td>
      `;
      usersTbody.appendChild(tr);
    });

    // Bind role change dropdowns
    usersTbody.querySelectorAll('.select-role-change').forEach(select => {
      select.addEventListener('change', async (e) => {
        const id = select.getAttribute('data-id');
        const newRole = select.value;
        await updateUserRole(id, newRole);
      });
    });

    // Bind delete user profile buttons
    usersTbody.querySelectorAll('.btn-delete-user').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm('Are you sure you want to permanently delete this user? This will remove their authentication record and cascade delete their profile and associated data.')) {
          await deleteUserProfile(id);
        }
      });
    });

    // Bind verify toggle buttons
    usersTbody.querySelectorAll('.btn-toggle-verify').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        const isVerified = btn.getAttribute('data-verified') === 'true';
        await toggleUserVerification(id, isVerified);
      });
    });
  }

  function filterUsers() {
    const query = userSearch.value.trim().toLowerCase();

    const filtered = allUsers.filter(user => {
      const emailMatch = user.email && user.email.toLowerCase().includes(query);
      const nameMatch = user.full_name && user.full_name.toLowerCase().includes(query);
      return emailMatch || nameMatch;
    });

    renderUsers(filtered);
  }

  async function updateUserRole(userId, newRole) {
    if (!supabase) return;
    const canChangeStatus = currentUserProfile && currentUserProfile.platform_role === 'super_admin';
    if (!canChangeStatus) {
      showToast('Access Denied: Only super admins can change user platform roles.', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ platform_role: newRole })
        .eq('id', userId);

      if (error) throw error;

      showToast(`User role successfully updated to ${newRole.replace('_', ' ')}!`, 'success');
      await loadSystemStats();
      await loadUsersData();
    } catch (e) {
      console.error('Failed to update user role:', e);
      showToast(`Failed to update user role: ${e.message}`, 'error');
    }
  }

  async function deleteUserProfile(userId) {
    if (!supabase) return;

    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) throw error;

      showToast('User permanently deleted!', 'success');
      await loadSystemStats();
      await loadUsersData();
    } catch (e) {
      console.warn('Failed to delete user via Edge Function, trying database fallback:', e);
      try {
        const { error: dbError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);
        if (dbError) throw dbError;

        showToast('User profile deleted from database (fallback)!', 'success');
        await loadSystemStats();
        await loadUsersData();
      } catch (fallbackErr) {
        console.error('Failed delete fallback:', fallbackErr);
        showToast(`Failed to delete user: ${e.message}`, 'error');
      }
    }
  }

  async function toggleUserVerification(userId, currentVerifiedState) {
    if (!supabase) return;
    const canChangeStatus = currentUserProfile && currentUserProfile.platform_role === 'super_admin';
    if (!canChangeStatus) {
      showToast('Access Denied: Only super admins can verify or unverify users.', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: !currentVerifiedState })
        .eq('id', userId);

      if (error) throw error;

      showToast(`User successfully ${!currentVerifiedState ? 'verified' : 'unverified'}!`, 'success');
      await loadSystemStats();
      await loadUsersData();
    } catch (e) {
      console.error('Failed to update user verification:', e);
      showToast(`Failed to update verification: ${e.message}`, 'error');
    }
  }

  // Bind new filter listeners
  if (eventSearch) eventSearch.addEventListener('input', filterEvents);
  if (eventCategoryFilter) eventCategoryFilter.addEventListener('change', filterEvents);
  if (admissionSearch) admissionSearch.addEventListener('input', filterAdmissions);
  if (admissionStatusFilter) admissionStatusFilter.addEventListener('change', filterAdmissions);
  if (userSearch) userSearch.addEventListener('input', filterUsers);

  // ── School Suggestions Management ─────────────────────────
  async function loadSuggestionsData() {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('school_suggestions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        allSuggestions = data;
        renderSuggestions(data);
      }
    } catch (e) {
      console.error('Failed to load suggestions from Supabase:', e);
      if (suggestionsTbody) {
        let errorMsg = e.message;
        if (e.code === 'PGRST205' || (e.message && e.message.includes('schema cache'))) {
          errorMsg = "Database table 'school_suggestions' not found. Please run the SQL migration statements in 'supabase_schema.sql' in your Supabase SQL Editor to create it.";
        }
        suggestionsTbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 40px; color: #EF4444; line-height: 1.5;">
              <span style="font-weight: 700; display: block; margin-bottom: 8px;">Database Migration Required</span>
              ${errorMsg}
            </td>
          </tr>
        `;
      }
    }
  }

  function renderSuggestions(suggestionsList) {
    if (!suggestionsTbody) return;
    suggestionsTbody.innerHTML = '';

    if (suggestionsList.length === 0) {
      suggestionsTbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No school suggestions found.
          </td>
        </tr>
      `;
      return;
    }

    suggestionsList.forEach(sug => {
      const tr = document.createElement('tr');
      const createdDate = new Date(sug.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      // Find suggester email from allUsers cache
      const suggesterProfile = allUsers.find(u => u.id === sug.suggested_by);
      const suggestedByEmail = suggesterProfile ? suggesterProfile.email : (sug.suggested_by ? 'Registered User' : 'Guest Visitor');

      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--dark-bg);">${sug.name}</td>
        <td>${sug.city || 'N/A'}</td>
        <td><span class="badge-status status-approved" style="background-color: rgba(59, 130, 246, 0.1); color: var(--primary); font-weight:700;">${sug.board || 'CBSE'}</span></td>
        <td style="font-size: 0.85rem; color: var(--text-muted);">${suggestedByEmail}</td>
        <td>${createdDate}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-primary btn-approve-suggestion" data-id="${sug.id}" data-name="${sug.name}" data-city="${sug.city}" data-board="${sug.board || ''}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm);">Approve & Register</button>
            <button class="btn btn-secondary btn-delete-suggestion" data-id="${sug.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); background-color: #FEF2F2; color: #EF4444; border-color: rgba(239, 68, 68, 0.2);">Reject</button>
          </div>
        </td>
      `;
      suggestionsTbody.appendChild(tr);
    });

    // Bind approve buttons
    suggestionsTbody.querySelectorAll('.btn-approve-suggestion').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        const city = btn.getAttribute('data-city');
        const board = btn.getAttribute('data-board');
        if (confirm(`Approve suggestion and register "${name}" as a verified school?`)) {
          await approveSuggestedSchool(id, name, city, board);
        }
      });
    });

    // Bind delete buttons
    suggestionsTbody.querySelectorAll('.btn-delete-suggestion').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to reject and delete this suggestion?')) {
          await deleteSuggestion(id);
        }
      });
    });
  }

  function filterSuggestions() {
    const query = suggestionSearch.value.trim().toLowerCase();

    const filtered = allSuggestions.filter(sug => {
      const nameMatch = sug.name && sug.name.toLowerCase().includes(query);
      const cityMatch = sug.city && sug.city.toLowerCase().includes(query);
      return nameMatch || cityMatch;
    });

    renderSuggestions(filtered);
  }

  async function approveSuggestedSchool(suggestionId, name, city, board) {
    if (!supabase) return;

    try {
      // 1. Insert into schools table as approved
      const { error: insertError } = await supabase
        .from('schools')
        .insert({
          name,
          city,
          board: board || 'CBSE',
          status: 'approved',
          admin_user_id: null,
          logo_letter: name.charAt(0).toUpperCase(),
          color_class: 'bg-gradient-' + (Math.floor(Math.random() * 5) + 1)
        });

      if (insertError) throw insertError;

      // 2. Delete from suggestions table
      const { error: deleteError } = await supabase
        .from('school_suggestions')
        .delete()
        .eq('id', suggestionId);

      if (deleteError) throw deleteError;

      showToast(`"${name}" successfully registered as a verified school!`, 'success');
      
      // Reload stats and datasets
      await loadSystemStats();
      await loadSchoolsData();
      await loadSuggestionsData();
    } catch (e) {
      console.error('Failed to approve suggestion:', e);
      showToast(`Failed to approve suggestion: ${e.message}`, 'error');
    }
  }

  async function deleteSuggestion(suggestionId) {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('school_suggestions')
        .delete()
        .eq('id', suggestionId);

      if (error) throw error;

      showToast('School suggestion successfully rejected and removed.', 'success');
      await loadSystemStats();
      await loadSuggestionsData();
    } catch (e) {
      console.error('Failed to delete suggestion:', e);
      showToast(`Failed to reject suggestion: ${e.message}`, 'error');
    }
  }

  if (suggestionSearch) suggestionSearch.addEventListener('input', filterSuggestions);

  // ── Post Management Functions ────────────────────────────
  async function loadPostsData() {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey(full_name, email)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        allPosts = data;
        renderPosts(data);
        if (typeof renderAnalytics === 'function') renderAnalytics();
      }
    } catch (e) {
      console.error('Failed to load posts from Supabase:', e);
      if (postsTbody) {
        postsTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 40px; color: #EF4444;">
              Failed to fetch feed posts: ${e.message}
            </td>
          </tr>
        `;
      }
    }
  }

  function renderPosts(postsList) {
    if (!postsTbody) return;
    postsTbody.innerHTML = '';

    if (postsList.length === 0) {
      postsTbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No feed posts found matching filters.
          </td>
        </tr>
      `;
      return;
    }

    postsList.forEach(post => {
      const tr = document.createElement('tr');
      const createdDate = new Date(post.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const authorName = post.profiles ? (post.profiles.full_name || 'Anonymous') : 'Anonymous';
      const authorEmail = post.profiles ? (post.profiles.email || '') : '';
      
      let typeBadgeClass = 'status-pending';
      if (post.post_type === 'school') typeBadgeClass = 'status-approved';

      const typeLabel = post.post_type === 'school' ? 'School' : 'Personal';
      const topicLabel = post.topic || 'general';

      tr.innerHTML = `
        <td style="padding: 12px 16px;">
          <div style="font-weight: 700; color: var(--dark-bg);">${authorName}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${authorEmail}</div>
        </td>
        <td style="padding: 12px 16px; max-width: 380px;">
          <div style="font-size: 0.85rem; color: var(--text-main); line-height: 1.4; white-space: pre-wrap; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;" title="${post.content.replace(/"/g, '&quot;')}">${post.content}</div>
        </td>
        <td style="padding: 12px 16px;">
          <span class="badge-status ${typeBadgeClass}" style="font-weight:700; margin-right:4px;">${typeLabel.toUpperCase()}</span>
          <span class="badge-status" style="font-weight:700; background-color:#F3F4F6; color:#374151; border:1px solid #D1D5DB; text-transform: uppercase; font-size: 0.72rem; padding: 4px 8px; border-radius: 4px; display:inline-block;">${topicLabel}</span>
        </td>
        <td style="padding: 12px 16px; font-size: 0.85rem; color: var(--text-muted);">${createdDate}</td>
        <td style="padding: 12px 16px;">
          <button class="btn btn-secondary btn-delete-post" data-id="${post.id}" data-author-id="${post.user_id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); background-color: #FEF2F2; color: #EF4444; border-color: rgba(239, 68, 68, 0.2);">Delete</button>
        </td>
      `;
      postsTbody.appendChild(tr);
    });

    // Bind delete buttons
    postsTbody.querySelectorAll('.btn-delete-post').forEach(btn => {
      console.log('[Delete Binding] Binding click handler for post delete button:', btn.getAttribute('data-id'));
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('[Delete Click] Post delete button clicked:', btn);
        const postId = btn.getAttribute('data-id');
        const authorId = btn.getAttribute('data-author-id');
        console.log('[Delete Click] Retrieved attributes - postId:', postId, 'authorId:', authorId);
        await deletePostWorkflow(postId, authorId);
      });
    });
  }

  function filterPosts() {
    if (!postSearch || !postTypeFilter) return;
    const query = postSearch.value.trim().toLowerCase();
    const type = postTypeFilter.value;
    const topic = postTopicFilter ? postTopicFilter.value : '';

    const filtered = allPosts.filter(post => {
      const authorName = post.profiles ? (post.profiles.full_name || '').toLowerCase() : '';
      const authorEmail = post.profiles ? (post.profiles.email || '').toLowerCase() : '';
      const content = (post.content || '').toLowerCase();
      
      const matchesSearch = authorName.includes(query) || authorEmail.includes(query) || content.includes(query);
      const matchesType = !type || post.post_type === type;
      const matchesTopic = !topic || (post.topic || 'general') === topic;
      
      return matchesSearch && matchesType && matchesTopic;
    });

    renderPosts(filtered);
  }

  async function deletePostWorkflow(postId, postAuthorId) {
    if (!supabase) return;

    const currentUserId = session && session.user ? session.user.id : null;

    console.log("Delete clicked");
    console.log("Post ID:", postId);
    console.log("User ID:", currentUserId);

    // 5. Confirmation Modal
    if (!confirm('Are you sure you want to permanently delete this post?')) {
      return;
    }

    console.log("Delete request sent");

    // Check if we are in fallback mock mode
    const isMockMode = session && session.user && session.user.id === 'super-admin-dev-id';

    if (isMockMode) {
      console.log(`[Delete Debug] Mock mode active. Simulating local deletion for post: ${postId}`);
      
      // Simulate post removal from local cache
      allPosts = allPosts.filter(p => p.id !== postId);
      filterPosts(); // Re-render posts list

      // Refresh other systems locally (safely)
      try {
        await loadModerationReports();
      } catch (err) {
        console.warn('[Delete Debug] Failed to reload moderation reports locally:', err);
      }

      showToast('Post successfully deleted (Simulated in Dev Mode)!', 'success');
      return;
    }

    // 4. Permission Verification
    const isSuperAdmin = currentUserProfile && currentUserProfile.platform_role === 'super_admin';
    const isPostOwner = session && session.user && session.user.id === postAuthorId;

    if (!isSuperAdmin && !isPostOwner) {
      const errMsg = 'Permission Denied: Only Super Admins or the post author can delete this post.';
      console.error(`[Delete Debug] ${errMsg}`);
      console.group('Delete Diagnostic Info');
      console.log('Post ID:', postId);
      console.log('Post Author ID:', postAuthorId);
      console.log('Logged In User ID:', session && session.user && session.user.id);
      console.log('Logged In User Email:', session && session.user && session.user.email);
      console.log('User Profile Role:', currentUserProfile && currentUserProfile.platform_role);
      console.groupEnd();
      showToast(errMsg, 'error');
      return;
    }

    try {
      // 3. Remove post from database
      const { data: response, error: error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .select();

      console.log("Delete response:", response);
      console.log("Delete error:", error);

      if (error) {
        throw error;
      }

      if (!response || response.length === 0) {
        throw new Error('RLS policy violation or post not found. Deletion failed.');
      }

      // 7. Debugging: Delete response received
      console.log(`[Delete Debug] Delete response received. Deleted data:`, response);

      // 3. Remove post from moderation queue
      const resolvedById = (session && session.user && session.user.id && session.user.id !== 'super-admin-dev-id') ? session.user.id : null;
      const { error: updateError } = await supabase
        .from('post_reports')
        .update({
          status: 'deleted',
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedById
        })
        .eq('post_id', postId)
        .eq('status', 'pending');

      if (updateError) {
        console.warn('[Delete Debug] Warning: Failed to update post reports (might not exist):', updateError.message);
      }

      // 3. Remove post from admin list immediately
      allPosts = allPosts.filter(p => p.id !== postId);
      filterPosts(); // Re-renders the list immediately

      // Refresh other system states and lists
      showToast('Post successfully deleted!', 'success');
      
      try {
        await loadSystemStats();
      } catch (err) {
        console.warn('[Delete Debug] Failed to reload system stats:', err);
      }
      
      try {
        await loadModerationReports();
      } catch (err) {
        console.warn('[Delete Debug] Failed to reload moderation reports:', err);
      }
      
      try {
        renderAnalytics();
      } catch (err) {
        console.warn('[Delete Debug] Failed to render analytics:', err);
      }

    } catch (e) {
      // 2. Error Handling
      console.error(`[Delete Debug] Failed to delete post:`, e);
      showToast(`Failed to delete post: ${e.message || e}`, 'error');
    }
  }

  // Bind post filters
  if (postSearch) postSearch.addEventListener('input', filterPosts);
  if (postTypeFilter) postTypeFilter.addEventListener('change', filterPosts);
  if (postTopicFilter) postTopicFilter.addEventListener('change', filterPosts);

  // ── Platform Analytics Rendering ─────────────────────────
  function renderAnalytics() {
    // 1. User breakdown
    const userTypeCounts = {
      student: 0,
      teacher: 0,
      parent: 0,
      alumni: 0,
      school_representative: 0
    };
    allUsers.forEach(u => {
      if (userTypeCounts[u.user_type] !== undefined) {
        userTypeCounts[u.user_type]++;
      }
    });

    const totalUsers = allUsers.length || 1;
    const userLabels = {
      student: 'Students',
      teacher: 'Teachers',
      parent: 'Parents',
      alumni: 'Alumni',
      school_representative: 'School Reps'
    };

    const usersBox = document.getElementById('analytics-users-box');
    if (usersBox) {
      usersBox.innerHTML = '';
      Object.keys(userTypeCounts).forEach(type => {
        const count = userTypeCounts[type];
        const percent = Math.round((count / totalUsers) * 100);
        const bar = document.createElement('div');
        bar.style.display = 'flex';
        bar.style.flexDirection = 'column';
        bar.style.gap = '4px';
        bar.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; color: var(--dark-bg);">
            <span>${userLabels[type]}</span>
            <span>${percent}% (${count})</span>
          </div>
          <div style="width: 100%; height: 6px; background-color: #F1F5F9; border-radius: 3px; overflow: hidden;">
            <div style="width: ${percent}%; height: 100%; background-color: var(--primary); border-radius: 3px;"></div>
          </div>
        `;
        usersBox.appendChild(bar);
      });
    }

    // 2. School Board distribution
    const boardCounts = {
      CBSE: 0,
      ICSE: 0,
      IB: 0
    };
    let otherBoards = 0;
    allSchools.forEach(s => {
      const b = (s.board || 'CBSE').toUpperCase();
      if (boardCounts[b] !== undefined) {
        boardCounts[b]++;
      } else {
        otherBoards++;
      }
    });

    const totalSchools = allSchools.length || 1;
    const boardsBox = document.getElementById('analytics-boards-box');
    if (boardsBox) {
      boardsBox.innerHTML = '';
      const boardsToRender = { ...boardCounts };
      if (otherBoards > 0) {
        boardsToRender['Other'] = otherBoards;
      }
      
      const colors = {
        CBSE: 'var(--primary)',
        ICSE: '#10B981',
        IB: '#F59E0B',
        Other: '#64748B'
      };

      Object.keys(boardsToRender).forEach(board => {
        const count = boardsToRender[board];
        const percent = Math.round((count / totalSchools) * 100);
        const bar = document.createElement('div');
        bar.style.display = 'flex';
        bar.style.flexDirection = 'column';
        bar.style.gap = '4px';
        bar.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; color: var(--dark-bg);">
            <span>${board} Board</span>
            <span>${percent}% (${count})</span>
          </div>
          <div style="width: 100%; height: 6px; background-color: #F1F5F9; border-radius: 3px; overflow: hidden;">
            <div style="width: ${percent}%; height: 100%; background-color: ${colors[board] || 'var(--primary)'}; border-radius: 3px;"></div>
          </div>
        `;
        boardsBox.appendChild(bar);
      });
    }

    // 3. Post Activity breakdown
    const postTopicCounts = {
      general: 0,
      achievement: 0,
      competition_win: 0,
      project: 0,
      event: 0
    };
    allPosts.forEach(p => {
      const topic = p.topic || 'general';
      if (postTopicCounts[topic] !== undefined) {
        postTopicCounts[topic]++;
      }
    });

    const totalPosts = allPosts.length || 1;
    const postLabels = {
      general: 'General',
      achievement: 'Achievements',
      competition_win: 'Competitions',
      project: 'Projects',
      event: 'Events'
    };
    
    const postColors = {
      general: '#64748B',
      achievement: 'var(--primary)',
      competition_win: '#8B5CF6',
      project: '#EC4899',
      event: '#10B981'
    };

    const postsBox = document.getElementById('analytics-posts-box');
    if (postsBox) {
      postsBox.innerHTML = '';
      Object.keys(postTopicCounts).forEach(type => {
        const count = postTopicCounts[type];
        const percent = Math.round((count / totalPosts) * 100);
        const bar = document.createElement('div');
        bar.style.display = 'flex';
        bar.style.flexDirection = 'column';
        bar.style.gap = '4px';
        bar.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; color: var(--dark-bg);">
            <span>${postLabels[type]}</span>
            <span>${percent}% (${count})</span>
          </div>
          <div style="width: 100%; height: 6px; background-color: #F1F5F9; border-radius: 3px; overflow: hidden;">
            <div style="width: ${percent}%; height: 100%; background-color: ${postColors[type] || 'var(--primary)'}; border-radius: 3px;"></div>
          </div>
        `;
        postsBox.appendChild(bar);
      });
    }

    // 4. Top Active Cities
    const cityCounts = {};
    allSchools.forEach(s => {
      if (s.city) {
        const c = s.city.trim();
        cityCounts[c] = (cityCounts[c] || 0) + 1;
      }
    });

    const sortedCities = Object.keys(cityCounts).sort((a, b) => cityCounts[b] - cityCounts[a]).slice(0, 4);
    const citiesBox = document.getElementById('analytics-cities-box');
    if (citiesBox) {
      citiesBox.innerHTML = '';
      
      if (sortedCities.length === 0) {
        citiesBox.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 20px 0;">No school locations recorded.</div>';
        return;
      }

      sortedCities.forEach((city, index) => {
        const count = cityCounts[city];
        const percent = Math.round((count / totalSchools) * 100);
        
        const cityColors = ['#3B82F6', '#10B981', '#F59E0B', '#64748B'];
        const color = cityColors[index] || '#64748B';

        const bar = document.createElement('div');
        bar.style.display = 'flex';
        bar.style.flexDirection = 'column';
        bar.style.gap = '4px';
        bar.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 600; color: var(--dark-bg);">
            <span>${city}</span>
            <span>${count} school${count !== 1 ? 's' : ''} (${percent}%)</span>
          </div>
          <div style="width: 100%; height: 6px; background-color: #F1F5F9; border-radius: 3px; overflow: hidden;">
            <div style="width: ${percent}%; height: 100%; background-color: ${color}; border-radius: 3px;"></div>
          </div>
        `;
        citiesBox.appendChild(bar);
      });
    }
  }

  // ── Admission Applications Management ─────────────────────
  async function loadApplicationsData() {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('admission_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        allApplications = currentUserProfile.platform_role === 'school_admin'
          ? data.filter(a => a.school_id === userSchool?.id)
          : data;
        renderApplications(allApplications);
      }
    } catch (e) {
      console.error('Failed to load admission applications from Supabase:', e);
      // Fallback to LocalStorage
      const localApps = localStorage.getItem('campuslink_admission_applications');
      if (localApps) {
        allApplications = JSON.parse(localApps);
        renderApplications(allApplications);
      } else if (applicationsTbody) {
        applicationsTbody.innerHTML = `
          <tr>
            <td colspan="9" style="text-align: center; padding: 40px; color: #EF4444;">
              Failed to fetch admission applications: ${e.message}
            </td>
          </tr>
        `;
      }
    }
  }

  function renderApplications(appsList) {
    if (!applicationsTbody) return;
    applicationsTbody.innerHTML = '';

    if (appsList.length === 0) {
      applicationsTbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No admission applications found.
          </td>
        </tr>
      `;
      return;
    }

    appsList.forEach(app => {
      const tr = document.createElement('tr');
      const createdDate = app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A';

      let statusBadgeClass = 'status-pending';
      if (app.status === 'approved') statusBadgeClass = 'status-approved';
      if (app.status === 'rejected') statusBadgeClass = 'status-rejected';

      const statusLabel = (app.status || 'pending').toUpperCase();

      let actionsHtml = '';
      if (app.status === 'pending') {
        actionsHtml = `
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-primary btn-approve-app" data-id="${app.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm);">Approve</button>
            <button class="btn btn-secondary btn-reject-app" data-id="${app.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); background-color: #FEF2F2; color: #EF4444; border-color: rgba(239, 68, 68, 0.2);">Reject</button>
          </div>
        `;
      } else {
        actionsHtml = `<span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Processed</span>`;
      }

      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--dark-bg);">${app.school_name || 'N/A'}</td>
        <td style="font-weight: 600;">${app.student_name}</td>
        <td>${app.parent_name}</td>
        <td>${app.grade_applied}</td>
        <td>${app.email}</td>
        <td>${app.phone}</td>
        <td>${createdDate}</td>
        <td><span class="badge-status ${statusBadgeClass}" style="font-weight:700;">${statusLabel}</span></td>
        <td>${actionsHtml}</td>
      `;
      applicationsTbody.appendChild(tr);
    });

    // Bind action buttons
    applicationsTbody.querySelectorAll('.btn-approve-app').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        await updateApplicationStatus(id, 'approved');
      });
    });

    applicationsTbody.querySelectorAll('.btn-reject-app').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        await updateApplicationStatus(id, 'rejected');
      });
    });
  }

  async function updateApplicationStatus(appId, newStatus) {
    showToast('Updating status...', 'info');

    // 1. Update in Supabase
    if (supabase && String(appId).length > 8) {
      try {
        const { error } = await supabase
          .from('admission_applications')
          .update({ status: newStatus })
          .eq('id', appId);
        if (error) throw error;
      } catch (err) {
        console.warn('Failed to update application status in Supabase:', err);
      }
    }

    // 2. Update in LocalStorage fallback
    const localApps = localStorage.getItem('campuslink_admission_applications');
    if (localApps) {
      let apps = JSON.parse(localApps);
      apps = apps.map(app => {
        if (String(app.id) === String(appId)) {
          return { ...app, status: newStatus };
        }
        return app;
      });
      localStorage.setItem('campuslink_admission_applications', JSON.stringify(apps));
    }

    // Update local state and re-render
    allApplications = allApplications.map(app => {
      if (String(app.id) === String(appId)) {
        return { ...app, status: newStatus };
      }
      return app;
    });

    filterApplications();
    showToast(`Application successfully ${newStatus}!`, 'success');
  }

  function filterApplications() {
    if (!applicationSearch || !applicationStatusFilter) return;
    const query = applicationSearch.value.trim().toLowerCase();
    const status = applicationStatusFilter.value;

    const filtered = allApplications.filter(app => {
      const studentMatch = app.student_name && app.student_name.toLowerCase().includes(query);
      const parentMatch = app.parent_name && app.parent_name.toLowerCase().includes(query);
      const schoolMatch = app.school_name && app.school_name.toLowerCase().includes(query);
      const matchesSearch = studentMatch || parentMatch || schoolMatch;
      
      const matchesStatus = !status || app.status === status;
      return matchesSearch && matchesStatus;
    });

    renderApplications(filtered);
  }

  if (applicationSearch) applicationSearch.addEventListener('input', filterApplications);
  if (applicationStatusFilter) applicationStatusFilter.addEventListener('change', filterApplications);

  // ── Contact Requests Management ───────────────────────────
  async function loadContactRequestsData() {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          status,
          inquiry_type,
          created_at,
          school_id,
          school:schools(name),
          initiator:profiles!initiator_id(full_name, email),
          messages(message, created_at, sender_id)
        `)
        .not('school_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        allContactRequests = currentUserProfile.platform_role === 'school_admin'
          ? data.filter(c => c.school_id === userSchool?.id)
          : data;
        renderContactRequests(allContactRequests);
        updateOverviewActionCardsCounts();
      }
    } catch (e) {
      console.error('Failed to load contact requests from Supabase:', e);
      // Fallback to LocalStorage
      const localReqs = localStorage.getItem('campuslink_global_contact_requests');
      if (localReqs) {
        allContactRequests = JSON.parse(localReqs);
        renderContactRequests(allContactRequests);
      } else if (contactRequestsTbody) {
        contactRequestsTbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 40px; color: #EF4444;">
              Failed to fetch contact requests: ${e.message}
            </td>
          </tr>
        `;
      }
    }
  }

  function renderContactRequests(reqsList) {
    if (!contactRequestsTbody) return;
    contactRequestsTbody.innerHTML = '';

    if (reqsList.length === 0) {
      contactRequestsTbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No contact requests found.
          </td>
        </tr>
      `;
      return;
    }

    reqsList.forEach(req => {
      const tr = document.createElement('tr');
      const schoolName = req.school ? req.school.name : 'Unknown School';
      const senderName = req.initiator ? req.initiator.full_name : 'Anonymous';
      const senderEmail = req.initiator ? req.initiator.email : 'N/A';
      
      const inquiryTypeLabels = {
        admissions: 'Admissions',
        events: 'Events',
        general_inquiry: 'General Inquiry'
      };
      const inquiryLabel = inquiryTypeLabels[req.inquiry_type] || 'General';

      // Get initial message
      const sortedMessages = (req.messages || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      let rawMsg = sortedMessages.length > 0 ? sortedMessages[0].message : 'No message';
      if (rawMsg.startsWith('[Inquiry:')) {
        rawMsg = rawMsg.substring(rawMsg.indexOf(']') + 2);
      }

      const createdDate = new Date(req.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      let statusClass = 'status-pending';
      if (req.status === 'accepted') statusClass = 'status-approved';
      if (req.status === 'ignored') statusClass = 'status-rejected';

      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--dark-bg);">${schoolName}</td>
        <td style="font-weight: 600;">${senderName}</td>
        <td>${senderEmail}</td>
        <td><span class="badge-status status-approved" style="background-color: rgba(59, 130, 246, 0.1); color: var(--primary); font-weight:700;">${inquiryLabel}</span></td>
        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${rawMsg}">${rawMsg}</td>
        <td>${createdDate}</td>
        <td><span class="badge-status ${statusClass}" style="font-weight:700;">${req.status.toUpperCase()}</span></td>
      `;
      contactRequestsTbody.appendChild(tr);
    });
  }

  function filterContactRequests() {
    if (!contactRequestSearch || !contactRequestStatusFilter) return;
    const query = contactRequestSearch.value.trim().toLowerCase();
    const status = contactRequestStatusFilter.value;

    const filtered = allContactRequests.filter(req => {
      const schoolMatch = req.school && req.school.name.toLowerCase().includes(query);
      const studentMatch = req.initiator && req.initiator.full_name.toLowerCase().includes(query);
      const emailMatch = req.initiator && req.initiator.email.toLowerCase().includes(query);
      const matchesSearch = schoolMatch || studentMatch || emailMatch;
      
      const matchesStatus = !status || req.status === status;
      return matchesSearch && matchesStatus;
    });

    renderContactRequests(filtered);
  }

  if (contactRequestSearch) contactRequestSearch.addEventListener('input', filterContactRequests);
  if (contactRequestStatusFilter) contactRequestStatusFilter.addEventListener('change', filterContactRequests);

  // Seed global contact requests fallback
  if (!localStorage.getItem('campuslink_global_contact_requests')) {
    localStorage.setItem('campuslink_global_contact_requests', JSON.stringify([
      {
        id: "mock-conv-1",
        status: "pending",
        inquiry_type: "general_inquiry",
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        school: { name: "St. Joseph's Academy" },
        initiator: { full_name: "Rahul Verma", email: "rahul.verma@gmail.com" },
        messages: [{ message: "[Inquiry: general_inquiry] Hello, I would like to know about the school bus routes for Rajpur Road.", created_at: new Date(Date.now() - 3600000 * 2).toISOString() }]
      },
      {
        id: "mock-conv-2",
        status: "accepted",
        inquiry_type: "admissions",
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        school: { name: "Doon School" },
        initiator: { full_name: "Pooja Sen", email: "pooja.sen@yahoo.com" },
        messages: [{ message: "[Inquiry: admissions] Dear Admission Team, does the school offer IB curriculum options for Grade XI?", created_at: new Date(Date.now() - 3600000 * 24).toISOString() }]
      }
    ]));
  }

  // ── Logout ───────────────────────────────────────────────
  if (logoutBtn && auth) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await auth.signOut();
    });
  }

  // ── Content Moderation Functions ─────────────────────────
  let currentModerationFilter = 'pending';
  let allModerationReports = {};

  async function loadModerationReports() {
    if (!supabase) return;
    const listContainer = document.getElementById('moderation-list');
    if (!listContainer) return;

    try {
      const { data, error } = await supabase
        .from('post_reports')
        .select(`
          *,
          reporter:profiles!reporter_id (
            full_name,
            email
          ),
          author:profiles!post_author_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group reports by post_id
      const grouped = {};
      (data || []).forEach(r => {
        if (!grouped[r.post_id]) {
          grouped[r.post_id] = [];
        }
        grouped[r.post_id].push(r);
      });

      allModerationReports = grouped;
      renderModerationReports();
    } catch (e) {
      console.error('Failed to load moderation reports:', e);
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #EF4444;">
          Failed to fetch moderation reports: ${e.message}
        </div>
      `;
    }
  }

  function renderModerationReports() {
    const listContainer = document.getElementById('moderation-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const postIds = Object.keys(allModerationReports);
    // Filter only postIds that have at least one report matching the current filter status
    const filteredPostIds = postIds.filter(postId => 
      allModerationReports[postId].some(r => r.status === currentModerationFilter)
    );

    if (filteredPostIds.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 0.9rem; font-weight: 500;">
          🎉 No reported content in this category. All clear!
        </div>
      `;
      return;
    }

    filteredPostIds.forEach(postId => {
      const reports = allModerationReports[postId].filter(r => r.status === currentModerationFilter);
      const firstReport = reports[0];
      const postContent = firstReport.post_content || '[No Content]';
      const authorName = firstReport.author ? (firstReport.author.full_name || 'Anonymous') : 'Anonymous';
      const authorEmail = firstReport.author ? (firstReport.author.email || 'N/A') : 'N/A';
      const authorId = firstReport.post_author_id || 'N/A';
      
      const reportCount = reports.length;
      const reasonsSet = new Set(reports.map(r => r.reason));
      const reasons = Array.from(reasonsSet).join(', ');
      
      const reporterList = reports.map(r => {
        const name = r.reporter ? (r.reporter.full_name || 'Anonymous') : 'Anonymous';
        const email = r.reporter ? ` (${r.reporter.email || 'N/A'})` : '';
        return `${name}${email}`;
      }).join(', ');

      const latestReportDate = new Date(Math.max(...reports.map(r => new Date(r.created_at))));
      const formattedDate = latestReportDate.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      let badgeText = 'PENDING REVIEW';
      let badgeClass = 'status-rejected';
      if (currentModerationFilter === 'ignored') {
        badgeText = 'IGNORED';
        badgeClass = 'status-approved';
      } else if (currentModerationFilter === 'deleted') {
        badgeText = 'REMOVED';
        badgeClass = 'status-rejected';
      }

      let actionButtonsHtml = '';
      if (currentModerationFilter === 'pending') {
        actionButtonsHtml = `
          <button class="btn btn-secondary btn-view-reported-post" data-post-id="${postId}" style="padding: 6px 12px; font-size: 0.8rem; border-radius: var(--radius-sm);">View Details</button>
          <button class="btn btn-secondary btn-ignore-report" data-post-id="${postId}" style="padding: 6px 12px; font-size: 0.8rem; border-radius: var(--radius-sm); border-color: #D1D5DB; color: #374151; background: transparent;">Ignore Report</button>
          <button class="btn btn-primary btn-delete-reported-post" data-post-id="${postId}" data-author-id="${authorId}" style="padding: 6px 12px; font-size: 0.8rem; border-radius: var(--radius-sm); background-color: #EF4444; border-color: #EF4444; color: white;">Delete Post</button>
        `;
      } else {
        actionButtonsHtml = `<span style="font-size: 0.8rem; color: var(--text-muted);">Resolved</span>`;
      }

      const card = document.createElement('div');
      card.className = 'dash-table-card moderation-card';
      card.style = 'padding: 20px; border-left: 4px solid #EF4444; margin-bottom: 16px; transition: all 0.3s ease; text-align: left;';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <div>
            <span class="badge-status ${badgeClass}" style="font-weight: 700; border-radius: 4px; padding: 4px 8px; font-size: 0.75rem;">${badgeText}</span>
            <span style="margin-left: 8px; font-weight: 700; color: #EF4444; font-size: 0.8rem; background-color: #FEF2F2; padding: 3px 8px; border-radius: 4px;">Reports: ${reportCount}</span>
          </div>
          <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">Latest report: ${formattedDate}</span>
        </div>
        
        <div style="background-color: var(--light-bg); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--dark-bg);">${authorName} <span style="font-weight: 500; color: var(--text-muted); font-size: 0.75rem;">(${authorEmail})</span></div>
            <span style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace; margin-left: auto;">Owner ID: ${authorId}</span>
          </div>
          <p style="font-size: 0.88rem; line-height: 1.5; color: var(--text-main); margin: 0; white-space: pre-wrap;">${postContent}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 0.82rem; color: var(--text-main); margin-bottom: 16px; padding-top: 12px; border-top: 1px dashed var(--border-color);">
          <div>
            <span style="font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 4px; text-transform: uppercase;">Reporter(s)</span>
            <span style="line-height: 1.4;">${reporterList}</span>
          </div>
          <div>
            <span style="font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 4px; text-transform: uppercase;">Reason(s)</span>
            <span style="color: #EF4444; font-weight: 700; line-height: 1.4;">${reasons}</span>
          </div>
        </div>
        
        <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border-color); padding-top: 16px; flex-wrap: wrap;">
          ${actionButtonsHtml}
        </div>
      `;
      listContainer.appendChild(card);
    });

    // Bind moderation actions
    listContainer.querySelectorAll('.btn-view-reported-post').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const postId = btn.getAttribute('data-post-id');
        openReportedPostDetailsModal(postId, allModerationReports[postId]);
      });
    });

    listContainer.querySelectorAll('.btn-ignore-report').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const postId = btn.getAttribute('data-post-id');
        if (confirm('Are you sure you want to ignore all reports for this post? This will keep the post active and resolve these reports.')) {
          await ignorePostReports(postId);
        }
      });
    });

    listContainer.querySelectorAll('.btn-delete-reported-post').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const postId = btn.getAttribute('data-post-id');
        const authorId = btn.getAttribute('data-author-id');
        await deletePostWorkflow(postId, authorId);
      });
    });
  }

  // Expose filter helper globally
  window.setModerationFilter = function(filter) {
    currentModerationFilter = filter;
    
    // Toggle active classes on filter buttons
    const btnPending = document.getElementById('btn-mod-pending');
    const btnIgnored = document.getElementById('btn-mod-ignored');
    const btnDeleted = document.getElementById('btn-mod-deleted');
    
    if (btnPending) btnPending.classList.remove('active');
    if (btnIgnored) btnIgnored.classList.remove('active');
    if (btnDeleted) btnDeleted.classList.remove('active');
    
    if (filter === 'pending' && btnPending) btnPending.classList.add('active');
    if (filter === 'ignored' && btnIgnored) btnIgnored.classList.add('active');
    if (filter === 'deleted' && btnDeleted) btnDeleted.classList.add('active');
    
    renderModerationReports();
  };

  async function ignorePostReports(postId) {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('post_reports')
        .update({
          status: 'ignored',
          resolved_at: new Date().toISOString(),
          resolved_by: session?.user?.id || null
        })
        .eq('post_id', postId)
        .eq('status', 'pending');

      if (error) throw error;

      showToast('Reports successfully ignored!', 'success');
      await loadModerationReports();
    } catch (e) {
      console.error('Failed to ignore post reports:', e);
      showToast(`Failed to ignore reports: ${e.message}`, 'error');
    }
  }

  function openReportedPostDetailsModal(postId, postReports) {
    const postDetailsModal = document.getElementById('reported-post-details-modal');
    if (!postDetailsModal) return;

    const modalAuthor = document.getElementById('modal-post-author');
    const modalReportsCount = document.getElementById('modal-reports-count');
    const modalPostContent = document.getElementById('modal-post-content');
    const modalReportsLog = document.getElementById('modal-reports-log');

    const firstReport = postReports[0];
    const authorName = firstReport.author ? (firstReport.author.full_name || 'Anonymous') : 'Anonymous';
    
    if (modalAuthor) modalAuthor.textContent = `Author: ${authorName}`;
    if (modalReportsCount) modalReportsCount.textContent = `Reports: ${postReports.length}`;
    if (modalPostContent) modalPostContent.textContent = firstReport.post_content || '';

    if (modalReportsLog) {
      modalReportsLog.innerHTML = '';
      postReports.forEach(r => {
        const reporterName = r.reporter ? (r.reporter.full_name || 'Anonymous') : 'Anonymous';
        const dateStr = new Date(r.created_at).toLocaleString();
        const detailsStr = r.details ? `<div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px; border-left: 2px solid var(--border-color); padding-left: 8px;">${r.details}</div>` : '';
        
        const item = document.createElement('div');
        item.style = 'background: #f8fafc; padding: 10px; border-radius: 4px; border: 1px solid var(--border-color); font-size: 0.82rem; margin-bottom: 8px; text-align: left;';
        item.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 2px;">
            <span>${reporterName}</span>
            <span style="color: #EF4444;">${r.reason}</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${dateStr}</div>
          ${detailsStr}
        `;
        modalReportsLog.appendChild(item);
      });
    }

    postDetailsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // Bind close buttons for post details modal
  const postDetailsCloseBtns = [
    document.getElementById('post-details-modal-close'),
    document.getElementById('post-details-modal-close-btn')
  ];
  postDetailsCloseBtns.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        const postDetailsModal = document.getElementById('reported-post-details-modal');
        if (postDetailsModal) {
          postDetailsModal.classList.remove('active');
          document.body.style.overflow = 'auto';
        }
      });
    }
  });

  // ── User Reports Moderation Functions ─────────────────────────
  let currentUserReportsFilter = 'pending';
  let allUserReports = [];

  async function loadUserReports() {
    if (!supabase) return;
    const tbody = document.getElementById('user-reports-tbody');
    if (!tbody) return;

    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select(`
          *,
          reported_user:profiles!reported_user_id (
            id,
            full_name,
            email
          ),
          reporter:profiles!reporter_id (
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      allUserReports = data || [];
      renderUserReports();
    } catch (e) {
      console.error('Failed to load user reports:', e);
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: #EF4444;">
            Failed to fetch user reports: ${e.message}
          </td>
        </tr>
      `;
    }
  }

  function renderUserReports() {
    const tbody = document.getElementById('user-reports-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const filtered = allUserReports.filter(r => r.status === currentUserReportsFilter);

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No user reports found in this category.
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach(r => {
      const tr = document.createElement('tr');
      const createdDate = new Date(r.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      const reportedName = r.reported_user ? (r.reported_user.full_name || 'N/A') : 'Deleted User';
      const reportedEmail = r.reported_user ? (r.reported_user.email || 'N/A') : 'N/A';
      const reporterName = r.reporter ? (r.reporter.full_name || 'Anonymous') : 'Anonymous';

      let statusBadgeClass = 'status-pending';
      if (r.status === 'dismissed') statusBadgeClass = 'status-approved';
      if (r.status === 'action_taken') statusBadgeClass = 'status-rejected';

      let actionButtons = '';
      if (r.status === 'pending') {
        actionButtons = `
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-dismiss-user-report" data-id="${r.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); border-color: #D1D5DB; color: #374151;">
              Dismiss
            </button>
            <button class="btn btn-secondary btn-delete-reported-user" data-id="${r.id}" data-user-id="${r.reported_user_id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); background-color: #FEF2F2; color: #EF4444; border-color: rgba(239, 68, 68, 0.2);">
              Delete Account
            </button>
          </div>
        `;
      } else {
        actionButtons = `<span style="font-size: 0.8rem; color: var(--text-muted);">Resolved</span>`;
      }

      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--dark-bg);">${reportedName}<br><span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 400;">${reportedEmail}</span></td>
        <td>${reporterName}</td>
        <td><span class="badge-status status-pending" style="background-color: rgba(239, 68, 68, 0.08); color: #EF4444; font-weight:700;">${r.reason}</span></td>
        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${r.details || ''}">${r.details || 'N/A'}</td>
        <td>${createdDate}</td>
        <td><span class="badge-status ${statusBadgeClass}" style="font-weight:700;">${r.status.toUpperCase()}</span></td>
        <td>${actionButtons}</td>
      `;
      tbody.appendChild(tr);
    });

    // Bind action buttons
    tbody.querySelectorAll('.btn-dismiss-user-report').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        await resolveUserReport(id, 'dismissed');
      });
    });

    tbody.querySelectorAll('.btn-delete-reported-user').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const reportId = btn.getAttribute('data-id');
        const userId = btn.getAttribute('data-user-id');
        if (confirm('Are you sure you want to permanently delete this user account? This will remove their authentication record, cascade delete their profile, and delete all associated data across the entire platform.')) {
          await resolveUserReport(reportId, 'action_taken', userId);
        }
      });
    });
  }

  async function resolveUserReport(reportId, action, userId = null) {
    if (!supabase) return;

    try {
      if (action === 'action_taken' && userId) {
        // Try deleting the user using our edge function
        try {
          const { error: deleteError } = await supabase.functions.invoke('delete-user', {
            body: { userId }
          });
          if (deleteError) throw deleteError;
          showToast('User account successfully deleted from database and platform!', 'success');
        } catch (funcErr) {
          console.warn('Failed to delete user via Edge Function, trying database fallback:', funcErr);
          // Try fallback database delete
          const { error: dbError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);
          if (dbError) throw dbError;
          showToast('User profile deleted from database (fallback)!', 'success');
        }
      } else if (action === 'dismissed') {
        const { error } = await supabase
          .from('user_reports')
          .update({
            status: 'dismissed',
            resolved_at: new Date().toISOString(),
            resolved_by: (await supabase.auth.getSession()).data.session?.user?.id || null
          })
          .eq('id', reportId);

        if (error) throw error;
        showToast('Report dismissed successfully.', 'success');
      }

      await loadUserReports();
      await loadSystemStats();
      await loadUsersData();
    } catch (e) {
      console.error('Failed to resolve user report:', e);
      showToast(`Failed to resolve report: ${e.message}`, 'error');
    }
  }

  // Expose filter helper globally
  window.setUserReportsFilter = function(filter) {
    currentUserReportsFilter = filter;
    
    // Toggle active classes on filter buttons
    const btnPending = document.getElementById('btn-user-rep-pending');
    const btnDismissed = document.getElementById('btn-user-rep-dismissed');
    const btnAction = document.getElementById('btn-user-rep-action');
    
    if (btnPending) btnPending.classList.remove('active');
    if (btnDismissed) btnDismissed.classList.remove('active');
    if (btnAction) btnAction.classList.remove('active');
    
    if (filter === 'pending' && btnPending) btnPending.classList.add('active');
    if (filter === 'dismissed' && btnDismissed) btnDismissed.classList.add('active');
    if (filter === 'action_taken' && btnAction) btnAction.classList.add('active');
    
    renderUserReports();
  };

  // ── Alumni Management Functions ──────────────────────────────────

  // Local beautiful toast implementation
  function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast-alert toast-alert-${type}`;
    let icon = '✓';
    if (type === 'info') icon = 'ℹ';
    if (type === 'error') icon = '⚠';
    toast.innerHTML = `
      <span style="font-weight:700; font-size:1.1rem; margin-right:8px;">${icon}</span>
      <div>${message}</div>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  // Setup Subtab navigation clicks
  const alumniSubTabBtns = document.querySelectorAll('.alumni-sub-tab-btn');
  const alumniSubPanels = document.querySelectorAll('.alumni-sub-panel');
  
  alumniSubTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-subtab');
      alumniSubTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      alumniSubPanels.forEach(p => {
        p.classList.remove('active');
        if (p.id === `${target}-subtab`) {
          p.classList.add('active');
        }
      });
    });
  });

  async function loadAlumniDashboard() {
    if (!supabase || !userSchool) return;

    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isRealUUID = uuidRegex.test(userSchool.id);

      // 1. Fetch batches
      let batches = [];
      if (isRealUUID) {
        try {
          const { data, error: bErr } = await supabase
            .from('alumni_batches')
            .select('*')
            .eq('school_id', userSchool.id)
            .order('passing_year', { ascending: false });
          if (!bErr) batches = data || [];
        } catch(e) {}
      }
      let localBatches = [];
      try { localBatches = JSON.parse(localStorage.getItem('campuslink_alumni_batches') || '[]'); } catch(e) {}
      const mappedLocalBatches = localBatches.filter(b => b.school_id === userSchool.id || b.schoolId === userSchool.id).map(b => ({
        id: b.id,
        school_id: b.school_id || b.schoolId,
        passing_year: b.passing_year || b.passingYear,
        department: b.department || null,
        program: b.program || null,
        description: b.description || null,
        cover_image: b.cover_image || b.coverImage || null,
        created_at: b.created_at || b.createdAt || new Date().toISOString()
      }));
      allAlumniBatches = [...batches, ...mappedLocalBatches];

      // 2. Fetch invites
      let invites = [];
      if (isRealUUID) {
        try {
          const { data, error: iErr } = await supabase
            .from('alumni_invites')
            .select('*')
            .eq('school_id', userSchool.id);
          if (!iErr) invites = data || [];
        } catch(e) {}
      }
      let localInvites = [];
      try { localInvites = JSON.parse(localStorage.getItem('campuslink_alumni_invites') || '[]'); } catch(e) {}
      const mappedLocalInvites = localInvites.filter(i => i.schoolId === userSchool.id || i.school_id === userSchool.id).map(i => ({
        id: i.id,
        school_id: i.schoolId || i.school_id,
        batch_id: i.batchId || i.batch_id || null,
        invite_code: i.inviteCode || i.invite_code,
        status: i.status || 'active',
        uses_count: i.usesCount || i.uses_count || 0,
        created_at: i.createdAt || i.created_at || new Date().toISOString()
      }));
      allAlumniInvites = [...invites, ...mappedLocalInvites];

      // 3. Fetch requests
      let requests = [];
      if (isRealUUID) {
        try {
          const { data, error: rErr } = await supabase
            .from('alumni_requests')
            .select('*')
            .eq('school_id', userSchool.id)
            .order('created_at', { ascending: false });
          if (!rErr) requests = data || [];
        } catch(e) {}
      }
      let localRequests = [];
      try { localRequests = JSON.parse(localStorage.getItem('campuslink_alumni_requests') || '[]'); } catch(e) {}
      const mappedLocalRequests = localRequests.filter(r => r.school_id === userSchool.id).map(r => ({
        id: r.id,
        school_id: r.school_id,
        batch_id: r.batch_id,
        invite_id: r.invite_id,
        user_id: r.user_id,
        full_name: r.full_name,
        email: r.email,
        username: r.username,
        passing_year: r.passing_year,
        department: r.department,
        program: r.program,
        status: r.status,
        created_at: r.created_at || new Date().toISOString()
      }));
      allAlumniRequests = [...requests, ...mappedLocalRequests];

      // 4. Fetch members
      let members = [];
      if (isRealUUID) {
        try {
          const { data, error: mErr } = await supabase
            .from('alumni_members')
            .select('id, batch_id, user_id')
            .eq('school_id', userSchool.id);
          if (!mErr) members = data || [];
        } catch(e) {}
      }
      let localMembers = [];
      try { localMembers = JSON.parse(localStorage.getItem('campuslink_alumni_members') || '[]'); } catch(e) {}
      const mappedLocalMembers = localMembers.filter(m => m.school_id === userSchool.id).map(m => ({
        id: m.id,
        batch_id: m.batch_id,
        user_id: m.user_id
      }));
      allAlumniMembers = [...members, ...mappedLocalMembers];

      // Update badge counts & statistics
      updateAlumniStats();
      renderAlumniBatches();
      renderAlumniInvites();
      renderAlumniRequests();

    } catch (err) {
      console.error('Error loading alumni dashboard:', err);
      showToast('Failed to load alumni dashboard: ' + err.message, 'error');
    }
  }

  function updateAlumniStats() {
    // Total Alumni
    const totalAlumni = allAlumniMembers.length;
    document.getElementById('alumni-stat-total').textContent = totalAlumni;

    // Total Batches
    const totalBatches = allAlumniBatches.length;
    document.getElementById('alumni-stat-batches').textContent = totalBatches;

    // Pending Requests
    const pendingRequests = allAlumniRequests.filter(r => r.status === 'pending');
    document.getElementById('alumni-stat-pending').textContent = pendingRequests.length;

    // Update Pending Requests Badges in subtabs
    const badge = document.getElementById('alumni-req-count-badge');
    if (badge) {
      if (pendingRequests.length > 0) {
        badge.textContent = pendingRequests.length;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }

    // Most Active Batch (batch with highest members)
    let activeBatchText = 'None';
    if (allAlumniBatches.length > 0 && allAlumniMembers.length > 0) {
      const counts = {};
      allAlumniMembers.forEach(m => {
        counts[m.batch_id] = (counts[m.batch_id] || 0) + 1;
      });
      let maxCount = 0;
      let maxBatchId = null;
      Object.keys(counts).forEach(bid => {
        if (counts[bid] > maxCount) {
          maxCount = counts[bid];
          maxBatchId = bid;
        }
      });
      if (maxBatchId) {
        const activeBatch = allAlumniBatches.find(b => b.id === maxBatchId);
        if (activeBatch) {
          activeBatchText = `Batch ${activeBatch.passing_year} (${maxCount} members)`;
        }
      }
    }
    document.getElementById('alumni-stat-active-batch').textContent = activeBatchText;

    // Newest Batch (most recently created batch)
    let newestBatchText = 'None';
    if (allAlumniBatches.length > 0) {
      const sorted = [...allAlumniBatches].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const newest = sorted[0];
      newestBatchText = `Batch ${newest.passing_year}`;
      if (newest.department) newestBatchText += ` (${newest.department})`;
    }
    document.getElementById('alumni-stat-newest-batch').textContent = newestBatchText;
  }

  function renderAlumniBatches() {
    const tbody = document.getElementById('alumni-batches-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (allAlumniBatches.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">No graduation batches created yet. Click "+ Create Batch" to get started.</td></tr>`;
      return;
    }

    allAlumniBatches.forEach(b => {
      // Find members count
      const memberCount = allAlumniMembers.filter(m => m.batch_id === b.id).length;
      
      // Find invite link details
      const invite = allAlumniInvites.find(i => i.batch_id === b.id);
      let inviteStatusHtml = '<span class="badge-status status-pending">No Link</span>';

      if (invite) {
        const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date();
        if (invite.status === 'disabled') {
          inviteStatusHtml = '<span class="badge-status status-rejected">Disabled</span>';
        } else if (isExpired) {
          inviteStatusHtml = '<span class="badge-status status-rejected">Expired</span>';
        } else {
          inviteStatusHtml = '<span class="badge-status status-approved">Active</span>';
        }
      }

      const dateStr = new Date(b.created_at).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--dark-bg);">Batch ${b.passing_year}</td>
        <td>${b.department || '—'}</td>
        <td>${b.program || '—'}</td>
        <td><span class="badge-status status-approved" style="font-weight:700;">${memberCount} Members</span></td>
        <td>${inviteStatusHtml}</td>
        <td>${dateStr}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-members" data-id="${b.id}" data-year="${b.passing_year}" style="padding: 4px 8px; font-size: 0.75rem;">View Members</button>
            <button class="btn btn-secondary btn-edit-batch" data-id="${b.id}" style="padding: 4px 8px; font-size: 0.75rem;">Edit</button>
            ${invite ? `
              <button class="btn btn-secondary btn-copy-invite" data-code="${invite.invite_code}" style="padding: 4px 8px; font-size: 0.75rem;">📋 Copy Link</button>
              <button class="btn btn-secondary btn-qr-invite" data-code="${invite.invite_code}" data-year="${b.passing_year}" style="padding: 4px 8px; font-size: 0.75rem;">📱 QR</button>
              <button class="btn btn-secondary btn-toggle-invite" data-id="${invite.id}" data-status="${invite.status}" style="padding: 4px 8px; font-size: 0.75rem;">
                ${invite.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
            ` : ''}
            <button class="btn btn-secondary btn-delete-batch" data-id="${b.id}" style="padding: 4px 8px; font-size: 0.75rem; border-color: rgba(239, 68, 68, 0.2); color: #EF4444;">Delete</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Bind action buttons
    tbody.querySelectorAll('.btn-members').forEach(btn => {
      btn.addEventListener('click', () => openViewMembersModal(btn.getAttribute('data-id'), btn.getAttribute('data-year')));
    });

    tbody.querySelectorAll('.btn-edit-batch').forEach(btn => {
      btn.addEventListener('click', () => openEditBatchModal(btn.getAttribute('data-id')));
    });

    tbody.querySelectorAll('.btn-copy-invite').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-code');
        const url = `${window.location.origin}/join-alumni.html?code=${code}`;
        navigator.clipboard.writeText(url).then(() => {
          showToast('Alumni invite link copied to clipboard!');
        }).catch(err => {
          showToast('Failed to copy: ' + err.message, 'error');
        });
      });
    });

    tbody.querySelectorAll('.btn-qr-invite').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-code');
        const year = btn.getAttribute('data-year');
        openQRCodeModal(code, `Batch of ${year}`);
      });
    });

    tbody.querySelectorAll('.btn-toggle-invite').forEach(btn => {
      btn.addEventListener('click', () => toggleInviteLink(btn.getAttribute('data-id'), btn.getAttribute('data-status')));
    });

    tbody.querySelectorAll('.btn-delete-batch').forEach(btn => {
      btn.addEventListener('click', () => deleteBatch(btn.getAttribute('data-id')));
    });
  }

  function renderAlumniInvites() {
    const tbody = document.getElementById('alumni-invites-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (allAlumniInvites.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">No invite links found. Create a batch to automatically generate invite links.</td></tr>`;
      return;
    }

    allAlumniInvites.forEach(invite => {
      const batch = allAlumniBatches.find(b => b.id === invite.batch_id);
      const batchYear = batch ? batch.passing_year : 'Unknown';
      const deptDetails = batch ? `${batch.department || '—'} / ${batch.program || '—'}` : '—';
      
      const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date();
      let statusHtml = '';
      if (invite.status === 'disabled') {
        statusHtml = '<span class="badge-status status-rejected">Disabled</span>';
      } else if (isExpired) {
        statusHtml = '<span class="badge-status status-rejected">Expired</span>';
      } else {
        statusHtml = '<span class="badge-status status-approved">Active</span>';
      }

      const expiryStr = invite.expires_at ? new Date(invite.expires_at).toLocaleDateString('en-IN') : 'Never';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: monospace; font-size: 0.9rem; font-weight:700; color:var(--primary);">${invite.invite_code}</td>
        <td style="font-weight: 700;">Batch ${batchYear}</td>
        <td>${deptDetails}</td>
        <td>${statusHtml}</td>
        <td><span class="badge-status status-approved">${invite.uses_count} Uses</span></td>
        <td>${expiryStr}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-copy" data-code="${invite.invite_code}" style="padding: 4px 8px; font-size: 0.75rem;">Copy URL</button>
            <button class="btn btn-secondary btn-qr" data-code="${invite.invite_code}" data-year="${batchYear}" style="padding: 4px 8px; font-size: 0.75rem;">QR Code</button>
            <button class="btn btn-secondary btn-toggle" data-id="${invite.id}" data-status="${invite.status}" style="padding: 4px 8px; font-size: 0.75rem;">
              ${invite.status === 'active' ? 'Disable' : 'Enable'}
            </button>
            <button class="btn btn-secondary btn-regenerate" data-id="${invite.id}" style="padding: 4px 8px; font-size: 0.75rem; border-color: rgba(245, 158, 11, 0.2); color: #D97706;">Regenerate</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-code');
        const url = `${window.location.origin}/join-alumni.html?code=${code}`;
        navigator.clipboard.writeText(url).then(() => {
          showToast('Alumni invite URL copied to clipboard!');
        });
      });
    });

    tbody.querySelectorAll('.btn-qr').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-code');
        const year = btn.getAttribute('data-year');
        openQRCodeModal(code, `Batch of ${year}`);
      });
    });

    tbody.querySelectorAll('.btn-toggle').forEach(btn => {
      btn.addEventListener('click', () => toggleInviteLink(btn.getAttribute('data-id'), btn.getAttribute('data-status')));
    });

    tbody.querySelectorAll('.btn-regenerate').forEach(btn => {
      btn.addEventListener('click', () => regenerateInviteLink(btn.getAttribute('data-id')));
    });
  }

  function renderAlumniRequests() {
    const tbody = document.getElementById('alumni-requests-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (allAlumniRequests.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">No alumni requests found.</td></tr>`;
      return;
    }

    allAlumniRequests.forEach(r => {
      const gradDetails = `Batch ${r.passing_year} ${r.department ? `(${r.department})` : ''}`;
      const dateStr = new Date(r.created_at).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });

      let statusHtml = '';
      if (r.status === 'approved') {
        statusHtml = '<span class="badge-status status-approved">Approved</span>';
      } else if (r.status === 'rejected') {
        statusHtml = '<span class="badge-status status-rejected">Rejected</span>';
      } else if (r.status === 'info_requested') {
        statusHtml = '<span class="badge-status status-pending" style="background-color: rgba(245, 158, 11, 0.1); color: #D97706;">Info Requested</span>';
      } else {
        statusHtml = '<span class="badge-status status-pending">Pending</span>';
      }

      const isPending = r.status === 'pending' || r.status === 'info_requested';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--dark-bg);">${r.full_name}</td>
        <td>@${r.username}</td>
        <td>${r.email}</td>
        <td>${gradDetails}</td>
        <td>${dateStr}</td>
        <td>${statusHtml}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            ${isPending ? `
              <button class="btn btn-primary btn-approve" data-id="${r.id}" style="padding: 4px 8px; font-size: 0.75rem; background: var(--success);">Approve</button>
              <button class="btn btn-secondary btn-reject" data-id="${r.id}" style="padding: 4px 8px; font-size: 0.75rem; color: #EF4444; border-color: rgba(239, 68, 68, 0.2);">Reject</button>
              <button class="btn btn-secondary btn-info" data-id="${r.id}" style="padding: 4px 8px; font-size: 0.75rem;">Request Info</button>
            ` : `
              <span style="font-size: 0.8rem; color: var(--text-muted); padding: 4px 8px;">Action Completed</span>
            `}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-approve').forEach(btn => {
      btn.addEventListener('click', () => approveAlumniRequest(btn.getAttribute('data-id')));
    });

    tbody.querySelectorAll('.btn-reject').forEach(btn => {
      btn.addEventListener('click', () => rejectAlumniRequest(btn.getAttribute('data-id')));
    });

    tbody.querySelectorAll('.btn-info').forEach(btn => {
      btn.addEventListener('click', () => requestMoreInfo(btn.getAttribute('data-id')));
    });
  }

  // --- Modal actions ---
  const createBatchModal = document.getElementById('create-alumni-batch-modal');
  const editBatchModal = document.getElementById('edit-alumni-batch-modal');
  const qrCodeModal = document.getElementById('alumni-qr-code-modal');
  const viewMembersModal = document.getElementById('view-alumni-members-modal');

  // Bind close buttons
  document.getElementById('btn-create-alumni-batch')?.addEventListener('click', () => {
    if (createBatchModal) createBatchModal.style.display = 'flex';
  });
  document.getElementById('create-batch-modal-close')?.addEventListener('click', () => {
    if (createBatchModal) createBatchModal.style.display = 'none';
  });
  document.getElementById('btn-cancel-create-batch')?.addEventListener('click', () => {
    if (createBatchModal) createBatchModal.style.display = 'none';
  });
  
  document.getElementById('edit-batch-modal-close')?.addEventListener('click', () => {
    if (editBatchModal) editBatchModal.style.display = 'none';
  });
  document.getElementById('btn-cancel-edit-batch')?.addEventListener('click', () => {
    if (editBatchModal) editBatchModal.style.display = 'none';
  });

  document.getElementById('qr-modal-close')?.addEventListener('click', () => {
    if (qrCodeModal) qrCodeModal.style.display = 'none';
  });

  document.getElementById('view-members-modal-close')?.addEventListener('click', () => {
    if (viewMembersModal) viewMembersModal.style.display = 'none';
  });

  // Batch Form Submissions
  document.getElementById('create-alumni-batch-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!supabase || !userSchool) return;

    const passingYear = parseInt(document.getElementById('create-batch-year').value);
    const department = document.getElementById('create-batch-dept').value.trim();
    const program = document.getElementById('create-batch-prog').value.trim();
    const description = document.getElementById('create-batch-desc').value.trim();
    const coverImage = document.getElementById('create-batch-cover').value.trim();

    try {
      // 1. Create batch
      const { data: newBatch, error: bErr } = await supabase
        .from('alumni_batches')
        .insert({
          school_id: userSchool.id,
          passing_year: passingYear,
          department: department || null,
          program: program || null,
          description: description || null,
          cover_image: coverImage || null,
          created_by: session.user.id
        })
        .select()
        .single();
      
      if (bErr) {
        if (bErr.code === '23505') {
          throw new Error('A batch with this graduation year, department, and program already exists.');
        }
        throw bErr;
      }

      // 2. Automatically generate secure random invite link code
      const randStr = Math.random().toString(36).substring(2, 8).toUpperCase();
      const inviteCode = `ALM-${randStr}-${passingYear}`;

      const { error: iErr } = await supabase
        .from('alumni_invites')
        .insert({
          batch_id: newBatch.id,
          school_id: userSchool.id,
          invite_code: inviteCode,
          status: 'active',
          created_by: session.user.id
        });

      if (iErr) throw iErr;

      showToast('Graduation batch and invite link successfully created!');
      if (createBatchModal) createBatchModal.style.display = 'none';
      document.getElementById('create-alumni-batch-form').reset();
      await loadAlumniDashboard();
      openQRCodeModal(inviteCode, `Batch of ${passingYear}`);

    } catch (err) {
      console.error('Failed to create batch', err);
      showToast('Error creating batch: ' + err.message, 'error');
    }
  });

  function openEditBatchModal(batchId) {
    const batch = allAlumniBatches.find(b => b.id === batchId);
    if (!batch) return;

    document.getElementById('edit-batch-id').value = batch.id;
    document.getElementById('edit-batch-year').value = batch.passing_year;
    document.getElementById('edit-batch-dept').value = batch.department || '';
    document.getElementById('edit-batch-prog').value = batch.program || '';
    document.getElementById('edit-batch-desc').value = batch.description || '';
    document.getElementById('edit-batch-cover').value = batch.cover_image || '';

    if (editBatchModal) editBatchModal.style.display = 'flex';
  }

  document.getElementById('edit-alumni-batch-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!supabase) return;

    const id = document.getElementById('edit-batch-id').value;
    const passingYear = parseInt(document.getElementById('edit-batch-year').value);
    const department = document.getElementById('edit-batch-dept').value.trim();
    const program = document.getElementById('edit-batch-prog').value.trim();
    const description = document.getElementById('edit-batch-desc').value.trim();
    const coverImage = document.getElementById('edit-batch-cover').value.trim();

    try {
      const { error } = await supabase
        .from('alumni_batches')
        .update({
          passing_year: passingYear,
          department: department || null,
          program: program || null,
          description: description || null,
          cover_image: coverImage || null
        })
        .eq('id', id);

      if (error) throw error;

      showToast('Graduation batch successfully updated!');
      if (editBatchModal) editBatchModal.style.display = 'none';
      await loadAlumniDashboard();

    } catch (err) {
      console.error('Failed to update batch', err);
      showToast('Error updating batch: ' + err.message, 'error');
    }
  });

  async function deleteBatch(batchId) {
    if (!supabase) return;
    if (!confirm('Are you sure you want to delete this batch? All members, invitations, and requests associated with this batch will be permanently removed.')) return;

    try {
      const { error } = await supabase
        .from('alumni_batches')
        .delete()
        .eq('id', batchId);
      if (error) throw error;

      showToast('Graduation batch deleted successfully.');
      await loadAlumniDashboard();
    } catch (err) {
      console.error('Failed to delete batch', err);
      showToast('Error deleting batch: ' + err.message, 'error');
    }
  }

  async function toggleInviteLink(inviteId, currentStatus) {
    if (!supabase) return;
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';

    try {
      const { error } = await supabase
        .from('alumni_invites')
        .update({ status: newStatus })
        .eq('id', inviteId);
      if (error) throw error;

      showToast(`Invite link ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      await loadAlumniDashboard();
    } catch (err) {
      console.error('Failed to update invite status', err);
      showToast('Error updating invite status: ' + err.message, 'error');
    }
  }

  async function regenerateInviteLink(inviteId) {
    if (!supabase) return;
    if (!confirm('Are you sure you want to regenerate this invite link? The old link code will stop working immediately, and a new code will be generated.')) return;

    try {
      const invite = allAlumniInvites.find(i => i.id === inviteId);
      if (!invite) return;
      const batch = allAlumniBatches.find(b => b.id === invite.batch_id);
      const batchYear = batch ? batch.passing_year : '2024';

      const randStr = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newCode = `ALM-${randStr}-${batchYear}`;

      const { error } = await supabase
        .from('alumni_invites')
        .update({
          invite_code: newCode,
          status: 'active',
          uses_count: 0
        })
        .eq('id', inviteId);
      
      if (error) throw error;

      showToast('Invite link regenerated successfully!');
      await loadAlumniDashboard();
    } catch (err) {
      console.error('Failed to regenerate invite link', err);
      showToast('Error regenerating invite link: ' + err.message, 'error');
    }
  }

  function openQRCodeModal(code, title) {
    const url = `${window.location.origin}/join-alumni.html?code=${code}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;
    
    document.getElementById('qr-modal-title').textContent = `${title} Invite QR`;
    document.getElementById('qr-modal-url').textContent = url;
    
    const qrImg = document.getElementById('qr-modal-img');
    if (qrImg) qrImg.src = qrUrl;

    // Bind action handlers
    const btnDownload = document.getElementById('btn-download-qr');
    if (btnDownload) {
      // Clear previous listeners by cloning button
      const newBtn = btnDownload.cloneNode(true);
      btnDownload.parentNode.replaceChild(newBtn, btnDownload);
      newBtn.addEventListener('click', () => downloadQRCode(qrUrl, `QR_${code}.png`));
    }

    const btnPrint = document.getElementById('btn-print-qr');
    if (btnPrint) {
      const newBtn = btnPrint.cloneNode(true);
      btnPrint.parentNode.replaceChild(newBtn, btnPrint);
      newBtn.addEventListener('click', () => printQRCode(qrUrl, title));
    }

    if (qrCodeModal) qrCodeModal.style.display = 'flex';
  }

  function printQRCode(imageUrl, title) {
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Print QR Code - ${title}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 90vh; }
            img { width: 300px; height: 300px; border: 1px solid #ccc; padding: 10px; margin-bottom: 20px; }
            h2 { margin: 0 0 10px 0; }
            p { margin: 0; color: #666; font-size: 0.9rem; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h2>${title}</h2>
          <img src="${imageUrl}">
          <p>Scan to join the alumni community</p>
        </body>
      </html>
    `);
    win.document.close();
  }

  async function downloadQRCode(imageUrl, filename) {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download QR code', err);
      window.open(imageUrl, '_blank');
    }
  }

  async function openViewMembersModal(batchId, batchYear) {
    if (!supabase) return;
    document.getElementById('view-members-title').textContent = `Batch of ${batchYear} Members`;
    const tbody = document.getElementById('batch-members-tbody');
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;">Loading members...</td></tr>`;

    if (viewMembersModal) viewMembersModal.style.display = 'flex';

    try {
      const { data: members, error } = await supabase
        .from('alumni_members')
        .select(`
          id, joined_at,
          user:profiles!user_id(id, full_name, email, username)
        `)
        .eq('batch_id', batchId)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      const renderMembers = (filterText = '') => {
        tbody.innerHTML = '';
        const list = (members || []).filter(m => {
          const u = m.user || {};
          const name = (u.full_name || '').toLowerCase();
          const username = (u.username || '').toLowerCase();
          const email = (u.email || '').toLowerCase();
          const query = filterText.toLowerCase();
          return name.includes(query) || username.includes(query) || email.includes(query);
        });

        if (list.length === 0) {
          tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--text-muted);">No members matched.</td></tr>`;
          return;
        }

        list.forEach(m => {
          const u = m.user || {};
          const name = u.full_name || 'Unknown';
          const username = u.username || '—';
          const email = u.email || '—';
          const dateStr = new Date(m.joined_at).toLocaleDateString('en-IN');

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td style="font-weight: 700; color: var(--dark-bg);">${name}</td>
            <td>@${username}</td>
            <td>${email}</td>
            <td>${dateStr}</td>
          `;
          tbody.appendChild(tr);
        });
      };

      renderMembers();

      // Bind search field
      const searchInput = document.getElementById('batch-member-search');
      if (searchInput) {
        searchInput.value = '';
        const newSearch = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearch, searchInput);
        newSearch.addEventListener('input', (e) => renderMembers(e.target.value));
      }

    } catch (err) {
      console.error('Failed to load batch members', err);
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #EF4444;">Error loading members: ${err.message}</td></tr>`;
    }
  }

  async function approveAlumniRequest(requestId) {
    if (!supabase) return;
    if (!confirm('Are you sure you want to approve this request? This will automatically grant the user the Alumni role, set their school and batch, and add them as a batch member.')) return;

    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (uuidRegex.test(requestId)) {
        const { error } = await supabase
          .from('alumni_requests')
          .update({ status: 'approved' })
          .eq('id', requestId);
        if (error) throw error;
      } else {
        // Mock fallback
        let localRequests = [];
        try { localRequests = JSON.parse(localStorage.getItem('campuslink_alumni_requests') || '[]'); } catch(e) {}
        const req = localRequests.find(r => r.id === requestId);
        if (req) {
          req.status = 'approved';
          localStorage.setItem('campuslink_alumni_requests', JSON.stringify(localRequests));

          // Increment usesCount of the invitation link in localStorage
          if (req.invite_id) {
            let localInvites = [];
            try { localInvites = JSON.parse(localStorage.getItem('campuslink_alumni_invites') || '[]'); } catch(e) {}
            const invite = localInvites.find(i => i.id === req.invite_id);
            if (invite) {
              invite.usesCount = (invite.usesCount || 0) + 1;
              invite.uses_count = (invite.uses_count || 0) + 1;
              localStorage.setItem('campuslink_alumni_invites', JSON.stringify(localInvites));
            }
          }

          // Also add to local alumni members
          let localMembers = [];
          try { localMembers = JSON.parse(localStorage.getItem('campuslink_alumni_members') || '[]'); } catch(e) {}
          if (!localMembers.find(m => m.user_id === req.user_id && m.batch_id === req.batch_id)) {
            localMembers.push({
              id: 'amem_' + Date.now(),
              school_id: req.school_id,
              batch_id: req.batch_id,
              user_id: req.user_id,
              joined_at: new Date().toISOString()
            });
            localStorage.setItem('campuslink_alumni_members', JSON.stringify(localMembers));
          }

          // Also add to local alumni list (campuslink_alumni)
          let localAlumni = [];
          try { localAlumni = JSON.parse(localStorage.getItem('campuslink_alumni') || '[]'); } catch(e) {}
          if (!localAlumni.find(a => a.username === req.username)) {
            localAlumni.push({
              id: req.user_id,
              schoolId: req.school_id,
              userId: req.user_id,
              campuslinkId: 'CL-ALM-' + Math.floor(1000 + Math.random() * 9000),
              fullName: req.full_name,
              username: req.username,
              email: req.email,
              phone: '',
              gender: '',
              graduatingYear: req.passing_year,
              graduatingClass: req.department || req.program || 'General',
              section: '',
              admissionNumber: '',
              rollNumber: '',
              dateOfBirth: '',
              currentOccupation: '',
              currentLocation: '',
              achievements: '',
              status: 'verified',
              verificationStatus: 'verified',
              createdAt: new Date().toISOString()
            });
            localStorage.setItem('campuslink_alumni', JSON.stringify(localAlumni));
          }

          // Move user to graduated section
          let students = [];
          try { students = JSON.parse(localStorage.getItem('campuslink_students') || '[]'); } catch(e) {}
          const student = students.find(s => s.id === req.user_id || s.username === req.username);
          if (student) {
            student.status = 'graduated';
            localStorage.setItem('campuslink_students', JSON.stringify(students));
          }
        }
      }

      showToast('Alumni request approved successfully!');
      await loadAlumniDashboard();
    } catch (err) {
      console.error('Failed to approve request', err);
      showToast('Error approving request: ' + err.message, 'error');
    }
  }

  async function rejectAlumniRequest(requestId) {
    if (!supabase) return;
    if (!confirm('Are you sure you want to reject this joining request?')) return;

    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(requestId)) {
        const { error } = await supabase
          .from('alumni_requests')
          .update({ status: 'rejected' })
          .eq('id', requestId);
        if (error) throw error;
      } else {
        // Mock fallback
        let localRequests = [];
        try { localRequests = JSON.parse(localStorage.getItem('campuslink_alumni_requests') || '[]'); } catch(e) {}
        const req = localRequests.find(r => r.id === requestId);
        if (req) {
          req.status = 'rejected';
          localStorage.setItem('campuslink_alumni_requests', JSON.stringify(localRequests));
        }
      }

      showToast('Alumni request rejected.');
      await loadAlumniDashboard();
    } catch (err) {
      console.error('Failed to reject request', err);
      showToast('Error rejecting request: ' + err.message, 'error');
    }
  }

  async function requestMoreInfo(requestId) {
    if (!supabase) return;
    const msg = prompt('Enter a message explaining what additional information is required from the applicant:');
    if (msg === null) return; // Cancelled
    if (!msg.trim()) return alert('Message is required to request more information.');

    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(requestId)) {
        const { error } = await supabase
          .from('alumni_requests')
          .update({
            status: 'info_requested',
            info_request_details: msg.trim()
          })
          .eq('id', requestId);
        if (error) throw error;
      } else {
        // Mock fallback
        let localRequests = [];
        try { localRequests = JSON.parse(localStorage.getItem('campuslink_alumni_requests') || '[]'); } catch(e) {}
        const req = localRequests.find(r => r.id === requestId);
        if (req) {
          req.status = 'info_requested';
          req.info_request_details = msg.trim();
          localStorage.setItem('campuslink_alumni_requests', JSON.stringify(localRequests));
        }
      }

      showToast('More information requested from applicant.');
      await loadAlumniDashboard();
    } catch (err) {
      console.error('Failed to request more info', err);
      showToast('Error: ' + err.message, 'error');
    }
  }

  // ── Initial Data Load ────────────────────────────────────
  if (supabase) {
    try {
      if (currentUserProfile.platform_role === 'school_admin') {
        // For school admin, load events, registrations, admissions, applications, contact requests, and alumni
        await loadEventsData();
        await loadRegistrationsData();
        await loadAdmissionsData();
        await loadApplicationsData();
        await loadContactRequestsData();
        
        // Load pending requests count for navigation badge
        try {
          const { data: requests } = await supabase
            .from('alumni_requests')
            .select('id')
            .eq('school_id', userSchool.id)
            .eq('status', 'pending');
          const badge = document.getElementById('alumni-req-count-badge');
          if (badge && requests && requests.length > 0) {
            badge.textContent = requests.length;
            badge.style.display = 'inline-block';
          }
        } catch (err) {
          console.warn('Failed to retrieve initial requests count badge', err);
        }
      } else {
        await loadSystemStats();
        await loadSchoolsData();
        await loadUsersData(); // Loaded before suggestions so email lookup works
        await loadSuggestionsData();
        await loadEventsData();
        await loadRegistrationsData();
        await loadAdmissionsData();
        await loadApplicationsData();
        await loadPostsData();
        await loadContactRequestsData();
        await loadModerationReports();
        await loadUserReports();
        renderAnalytics();
      }
    } catch (loadErr) {
      console.warn('[Admin Init] Error loading startup statistics/data:', loadErr);
    } finally {
      if (window.hideAuthOverlayTransition) {
        window.hideAuthOverlayTransition();
      }
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}
