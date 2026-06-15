document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

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

  // Contact Requests Table & Filters
  const contactRequestsTbody = document.getElementById('contact-requests-tbody');
  const contactRequestSearch = document.getElementById('contact-request-search');
  const contactRequestStatusFilter = document.getElementById('contact-request-status-filter');
  
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
  
  // ── Auth Page Guard ──────────────────────────────────────
  const auth = window.CampusLink && window.CampusLink.auth;
  const supabase = window.CampusLink && window.CampusLink.supabase;
  let session = null;
  let currentUserProfile = null;

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

  // Fallback for development if no session or profile is found
  if (!session || !currentUserProfile) {
    console.log('[Admin Auth] Fallback: No session found. Bypassing auth check for development using mock owaissaifi019@gmail.com.');
    session = { user: { email: 'owaissaifi019@gmail.com', id: 'super-admin-dev-id' } };
    currentUserProfile = {
      email: 'owaissaifi019@gmail.com',
      platform_role: 'super_admin',
      user_type: 'school_representative'
    };
  }

  if (authOverlay) {
    authOverlay.style.display = 'none';
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

       let pageTitle = 'Super Admin Dashboard';
      if (tabTarget === 'schools') pageTitle = 'School Registry Management';
      if (tabTarget === 'suggestions') pageTitle = 'School Suggestions Inbox';
      if (tabTarget === 'events') pageTitle = 'Event & Fest Registry';
      if (tabTarget === 'admissions') pageTitle = 'Admission Management';
      if (tabTarget === 'applications') pageTitle = 'Global Admission Applications';
      if (tabTarget === 'contact-requests') pageTitle = 'Global Contact Requests';
      if (tabTarget === 'users') pageTitle = 'User Account Directory';
      if (tabTarget === 'posts') pageTitle = 'Feed Posts Management';
      if (tabTarget === 'moderation') {
        pageTitle = 'Content Moderation Panel';
        await loadModerationReports();
      }
      if (topBarTitle) topBarTitle.textContent = pageTitle;
    });
  });

  if (goSchoolBtn) {
    goSchoolBtn.addEventListener('click', () => {
      const schoolsTabLink = document.getElementById('tab-link-schools');
      if (schoolsTabLink) schoolsTabLink.click();
    });
  }

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
      const canChangeStatus = session && session.user && session.user.email === 'owaissaifi019@gmail.com';
      const approveBtn = canChangeStatus 
        ? `<button class="btn btn-primary btn-approve-school" data-id="${school.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); display: ${school.status === 'approved' ? 'none' : 'inline-block'};">Approve</button>` 
        : '';
      const rejectBtn = canChangeStatus 
        ? `<button class="btn btn-secondary btn-reject-school" data-id="${school.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); background-color: #FEF2F2; color: #EF4444; border-color: rgba(239, 68, 68, 0.2); display: ${school.status === 'rejected' ? 'none' : 'inline-block'};">Reject</button>` 
        : '';

      const canChangeBadge = session && session.user && session.user.email === 'owaissaifi019@gmail.com';
      const selectDisabledAttr = canChangeBadge ? '' : 'disabled';
      const selectCursor = canChangeBadge ? 'pointer' : 'not-allowed';
      const selectBackground = canChangeBadge ? 'white' : '#F1F5F9';
      const selectColor = canChangeBadge ? 'inherit' : '#64748B';

      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--dark-bg);">${school.name}</td>
        <td>${school.city || 'N/A'}</td>
        <td><span class="badge-status status-approved" style="background-color: rgba(59, 130, 246, 0.1); color: var(--primary); font-weight:700;">${school.board || 'CBSE'}</span></td>
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
    const canChangeStatus = session && session.user && session.user.email === 'owaissaifi019@gmail.com';
    if (!canChangeStatus) {
      showToast('Access Denied: Only owaissaifi019@gmail.com can approve or reject schools.', 'error');
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
    const canChange = session && session.user && session.user.email === 'owaissaifi019@gmail.com';
    if (!canChange) {
      showToast('Access Denied: Only owaissaifi019@gmail.com can change school verification badges.', 'error');
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
        allEvents = data;
        renderEvents(data);
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
        allAdmissions = data;
        renderAdmissions(data);
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

      const canChangeStatus = session && session.user && session.user.email === 'owaissaifi019@gmail.com';
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
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this user profile? Note: This deletes the public profile, but the underlying Auth user remains.')) {
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
    const canChangeStatus = session && session.user && session.user.email === 'owaissaifi019@gmail.com';
    if (!canChangeStatus) {
      showToast('Access Denied: Only owaissaifi019@gmail.com can change user platform roles.', 'error');
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
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      showToast('User profile successfully deleted!', 'success');
      await loadSystemStats();
      await loadUsersData();
    } catch (e) {
      console.error('Failed to delete user profile:', e);
      showToast(`Failed to delete profile: ${e.message}`, 'error');
    }
  }

  async function toggleUserVerification(userId, currentVerifiedState) {
    if (!supabase) return;
    const canChangeStatus = session && session.user && session.user.email === 'owaissaifi019@gmail.com';
    if (!canChangeStatus) {
      showToast('Access Denied: Only owaissaifi019@gmail.com can verify or unverify users.', 'error');
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
      
      let typeBadgeClass = 'status-approved';
      if (post.post_type === 'achievement') typeBadgeClass = 'status-approved';
      if (post.post_type === 'competition_win') typeBadgeClass = 'status-approved';
      if (post.post_type === 'project') typeBadgeClass = 'status-pending';
      if (post.post_type === 'event') typeBadgeClass = 'status-approved';

      const typeLabels = {
        achievement: 'Achievement',
        competition_win: 'Competition Win',
        project: 'Project',
        event: 'Event'
      };
      const typeLabel = typeLabels[post.post_type] || post.post_type;

      tr.innerHTML = `
        <td style="padding: 12px 16px;">
          <div style="font-weight: 700; color: var(--dark-bg);">${authorName}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${authorEmail}</div>
        </td>
        <td style="padding: 12px 16px; max-width: 380px;">
          <div style="font-size: 0.85rem; color: var(--text-main); line-height: 1.4; white-space: pre-wrap; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;" title="${post.content.replace(/"/g, '&quot;')}">${post.content}</div>
        </td>
        <td style="padding: 12px 16px;"><span class="badge-status ${typeBadgeClass}" style="font-weight:700;">${typeLabel.toUpperCase()}</span></td>
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

    const filtered = allPosts.filter(post => {
      const authorName = post.profiles ? (post.profiles.full_name || '').toLowerCase() : '';
      const authorEmail = post.profiles ? (post.profiles.email || '').toLowerCase() : '';
      const content = (post.content || '').toLowerCase();
      
      const matchesSearch = authorName.includes(query) || authorEmail.includes(query) || content.includes(query);
      const matchesType = !type || post.post_type === type;
      
      return matchesSearch && matchesType;
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
    const postTypeCounts = {
      achievement: 0,
      competition_win: 0,
      project: 0,
      event: 0
    };
    allPosts.forEach(p => {
      if (postTypeCounts[p.post_type] !== undefined) {
        postTypeCounts[p.post_type]++;
      }
    });

    const totalPosts = allPosts.length || 1;
    const postLabels = {
      achievement: 'Achievements',
      competition_win: 'Competitions',
      project: 'Projects',
      event: 'Events'
    };
    
    const postColors = {
      achievement: 'var(--primary)',
      competition_win: '#8B5CF6',
      project: '#EC4899',
      event: '#10B981'
    };

    const postsBox = document.getElementById('analytics-posts-box');
    if (postsBox) {
      postsBox.innerHTML = '';
      Object.keys(postTypeCounts).forEach(type => {
        const count = postTypeCounts[type];
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
        allApplications = data;
        renderApplications(data);
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
        allContactRequests = data;
        renderContactRequests(data);
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
  async function loadModerationReports() {
    if (!supabase) return;
    const listContainer = document.getElementById('reported-posts-list');
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

      renderModerationReports(grouped);
    } catch (e) {
      console.error('Failed to load moderation reports:', e);
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #EF4444;">
          Failed to fetch moderation reports: ${e.message}
        </div>
      `;
    }
  }

  function renderModerationReports(groupedReports) {
    const listContainer = document.getElementById('reported-posts-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const postIds = Object.keys(groupedReports);
    // Filter only postIds that have at least one 'pending' report
    const pendingPostIds = postIds.filter(postId => 
      groupedReports[postId].some(r => r.status === 'pending')
    );

    if (pendingPostIds.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 0.9rem; font-weight: 500;">
          🎉 No reported content pending review. All clear!
        </div>
      `;
      return;
    }

    pendingPostIds.forEach(postId => {
      const reports = groupedReports[postId].filter(r => r.status === 'pending');
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

      const card = document.createElement('div');
      card.className = 'dash-table-card moderation-card';
      card.style = 'padding: 20px; border-left: 4px solid #EF4444; margin-bottom: 16px; transition: all 0.3s ease; text-align: left;';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <div>
            <span class="badge-status status-rejected" style="font-weight: 700; background-color: #FEF2F2; color: #EF4444; border-radius: 4px; padding: 4px 8px; font-size: 0.75rem;">PENDING REVIEW</span>
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
          <button class="btn btn-secondary btn-view-reported-post" data-post-id="${postId}" style="padding: 6px 12px; font-size: 0.8rem; border-radius: var(--radius-sm);">View Details</button>
          <button class="btn btn-secondary btn-ignore-report" data-post-id="${postId}" style="padding: 6px 12px; font-size: 0.8rem; border-radius: var(--radius-sm); border-color: #D1D5DB; color: #374151; background: transparent;">Ignore Report</button>
          <button class="btn btn-primary btn-delete-reported-post" data-post-id="${postId}" data-author-id="${authorId}" style="padding: 6px 12px; font-size: 0.8rem; border-radius: var(--radius-sm); background-color: #EF4444; border-color: #EF4444; color: white;">Delete Post</button>
        </div>
      `;
      listContainer.appendChild(card);
    });

    // Bind moderation actions
    listContainer.querySelectorAll('.btn-view-reported-post').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const postId = btn.getAttribute('data-post-id');
        openReportedPostDetailsModal(postId, groupedReports[postId]);
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
      console.log('[Delete Binding] Binding click handler for reported post delete button:', btn.getAttribute('data-post-id'));
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('[Delete Click] Reported post delete button clicked:', btn);
        const postId = btn.getAttribute('data-post-id');
        const authorId = btn.getAttribute('data-author-id');
        console.log('[Delete Click] Retrieved attributes - postId:', postId, 'authorId:', authorId);
        await deletePostWorkflow(postId, authorId);
      });
    });
  }

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

  // ── Initial Data Load ────────────────────────────────────
  if (supabase) {
    await loadSystemStats();
    await loadSchoolsData();
    await loadUsersData(); // Loaded before suggestions so email lookup works
    await loadSuggestionsData();
    await loadEventsData();
    await loadAdmissionsData();
    await loadApplicationsData();
    await loadPostsData();
    await loadContactRequestsData();
    await loadModerationReports();
    renderAnalytics();
  }
});
