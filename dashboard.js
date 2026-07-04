document.addEventListener('DOMContentLoaded', async () => {
  console.log(window.location.pathname);
  console.log(document.body.className);

  // ── Auth Guard & Supabase Setup ────────────────────────
  const authOverlay = document.getElementById('auth-loading-overlay');
  const auth = window.CampusLink && window.CampusLink.auth;
  const supabase = window.CampusLink && window.CampusLink.supabase;
  let session = null;

  if (auth) {
    session = await auth.getSession();
    if (!session) {
      // Not authenticated — redirect to login
      window.location.href = 'login.html';
      return;
    }

    // Role-based authorization: redirect super_admin and block visitors
    const role = await auth.getUserRole();
    if (role === 'super_admin') {
      window.location.href = 'admin/index.html';
      return;
    } else if (role === 'user') {
      alert('Access Denied: Members do not have access to the School Admin Dashboard.');
      window.location.href = 'index.html';
      return;
    }

    // Authenticated — hide loading overlay
    if (authOverlay) {
      authOverlay.classList.add('fade-out');
      setTimeout(() => { authOverlay.style.display = 'none'; }, 400);
    }
  } else {
    // Auth module not loaded — hide overlay anyway (dev mode)
    if (authOverlay) authOverlay.style.display = 'none';
  }

  // ── Logout Button ──────────────────────────────────────
  const logoutBtn = document.getElementById('sidebar-logout-btn');
  if (logoutBtn && auth) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await auth.signOut();
    });
  }

  // ── Logout Button (Mobile) ──────────────────────────────
  const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
  if (mobileLogoutBtn && auth) {
    mobileLogoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await auth.signOut();
    });
  }

  // ── Supabase Dashboard Data Sync ────────────────────────
  async function loadDashboardData() {
    if (auth && supabase && session) {
      try {
        const user = session.user;
        const role = await auth.getUserRole();

        if (role === 'super_admin') {
          profile = {
            id: 'super-admin-global',
            name: "Super Admin Portal",
            city: "Global System",
            state: "All India",
            board: "Super Admin",
            logoLetter: "A",
            about: "Central control panel for managing the entire CampusLink platform."
          };

          // Super admin gets global events
          const { data: dbEvents, error: eErr } = await supabase.from('events').select('*');
          if (!eErr && dbEvents) {
            events = dbEvents.map(e => ({
              id: e.id,
              title: e.title,
              category: e.category,
              date: e.event_date,
              deadline: e.deadline || 'Varies',
              venue: e.venue,
              registrationLink: e.registration_link,
              description: e.description,
              school: e.school_name || 'Partner School',
              bannerImg: e.banner_url
            }));
          }

          // Super admin gets global admissions
          const { data: dbAdmissions, error: aErr } = await supabase.from('admissions').select('*');
          if (!aErr && dbAdmissions) {
            admissions = dbAdmissions.map(a => ({
              id: a.id,
              classesOpen: a.classes_open,
              startDate: a.start_date,
              lastDate: a.last_date,
              academicYear: a.academic_year || '2026-27',
              applyLink: a.apply_link,
              details: a.details,
              schoolName: a.school_name || 'Partner School',
              board: a.board || 'CBSE',
              city: a.city || 'India'
            }));
          }

          // Super admin gets global applications
          const { data: dbApps, error: appErr } = await supabase.from('admission_applications').select('*');
          if (!appErr && dbApps) {
            admissionApplications = dbApps;
            saveState('campuslink_admission_applications', admissionApplications);
          }
        } else {
          const school = await auth.getSchoolForUser(user.id);
          if (school) {
            profile = {
              id: school.id,
              name: school.name,
              city: school.city || '',
              state: school.state || '',
              board: school.board || '',
              logoLetter: school.logo_letter || school.name.charAt(0).toUpperCase(),
              logoUrl: school.logo_url || '',
              coverUrl: school.cover_url || '',
              about: school.about || '',
              admin_user_id: school.admin_user_id
            };
            saveState('campuslink_profile', profile);
            
            // Fetch events
            const { data: dbEvents, error: eErr } = await supabase.from('events').select('*').eq('school_id', school.id);
            if (!eErr && dbEvents) {
              events = dbEvents.map(e => ({
                id: e.id,
                title: e.title,
                category: e.category,
                date: e.event_date,
                deadline: e.deadline || 'Varies',
                venue: e.venue,
                registrationLink: e.registration_link,
                description: e.description,
                school: school.name,
                bannerImg: e.banner_url
              }));
              saveState('campuslink_events', events);
            }
            
            // Fetch admissions
            const { data: dbAdmissions, error: aErr } = await supabase.from('admissions').select('*').eq('school_id', school.id);
            if (!aErr && dbAdmissions) {
              admissions = dbAdmissions.map(a => ({
                id: a.id,
                classesOpen: a.classes_open,
                startDate: a.start_date,
                lastDate: a.last_date,
                academicYear: a.academic_year || '2026-27',
                applyLink: a.apply_link,
                details: a.details,
                schoolName: school.name,
                board: school.board,
                city: school.city
              }));
              saveState('campuslink_admissions', admissions);
            }

            // Fetch admission applications
            const { data: dbApps, error: appErr } = await supabase.from('admission_applications').select('*').eq('school_id', school.id);
            if (!appErr && dbApps) {
              admissionApplications = dbApps;
              saveState('campuslink_admission_applications', admissionApplications);
            }

            // Fetch contact requests
            const { data: dbConv, error: convErr } = await supabase
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
              .eq('school_id', school.id)
              .order('created_at', { ascending: false });
            
            if (!convErr && dbConv) {
              contactRequests = dbConv;
              saveState('campuslink_contact_requests', contactRequests);
            }

            // Fetch event registrations
            try {
              const { data: dbRegs, error: rErr } = await supabase
                .from('event_registrations')
                .select(`
                  id,
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
                .eq('school_id', school.id)
                .order('created_at', { ascending: false });
                
              if (!rErr && dbRegs) {
                registrations = dbRegs.map(r => ({
                  id: r.id,
                  studentName: r.student_name,
                  classGrade: r.student_grade,
                  eventTitle: r.events ? r.events.title : 'General Event',
                  dateApplied: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
                  status: r.status,
                  school_name: r.student_school_name,
                  is_team: r.is_team,
                  team_name: r.team_name,
                  team_size: r.team_size,
                  team_members: r.team_members,
                  project_details: r.project_details,
                  parent_name: r.parent_name,
                  parent_phone: r.parent_phone
                }));
                saveState('campuslink_registrations', registrations);
              } else if (rErr) {
                console.warn('Error fetching event_registrations:', rErr.message);
              }
            } catch (regFetchErr) {
              console.warn('Failed to query event_registrations:', regFetchErr);
            }

          }
        }
      } catch (err) {
        console.warn('Error loading dashboard data from Supabase, using defaults:', err);
      }
    }
    
    // Re-run rendering with latest data
    renderProfileHeader();
    populateProfileForm();
    updateDashboardStats();
    renderRegistrations();
    renderEvents();
    renderAdmissions();
    renderApplications();
    renderContactRequests();
    loadCommunityMembers();
  }

  // --- Seed Data Configuration ---
  const DEFAULT_PROFILE = {
    name: "Loading school...",
    city: "",
    state: "",
    board: "",
    logoLetter: "L",
    logoUrl: "",
    coverUrl: "",
    about: ""
  };

  const DEFAULT_EVENTS = [];
  const DEFAULT_ADMISSIONS = [];
  const DEFAULT_REGISTRATIONS = [];
  const DEFAULT_CONTACT_REQUESTS = [];

  // --- Initial Storage Sync ---
  function getStoredData(key, fallback) {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(data);
  }

  let profile = getStoredData('campuslink_profile', DEFAULT_PROFILE);
  let events = getStoredData('campuslink_events', DEFAULT_EVENTS);
  let admissions = getStoredData('campuslink_admissions', DEFAULT_ADMISSIONS);
  let registrations = getStoredData('campuslink_registrations', DEFAULT_REGISTRATIONS);
  let admissionApplications = getStoredData('campuslink_admission_applications', []);
  let contactRequests = getStoredData('campuslink_contact_requests', DEFAULT_CONTACT_REQUESTS);

  // Helper to persist data
  function saveState(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // --- UI Elements ---
  const tabLinks = document.querySelectorAll('.dashboard-nav-link[data-tab]');
  const tabPanels = document.querySelectorAll('.dashboard-tab-panel');
  const topBarTitle = document.getElementById('top-bar-title');
  const currentDateDisplay = document.getElementById('current-date-display');
  const toastContainer = document.getElementById('toast-container');

  // School profile header elements
  const avatarLetter = document.getElementById('school-avatar-letter');
  const usernameText = document.getElementById('school-username');
  const userboardText = document.getElementById('school-userboard');

  // --- Render Date ---
  function displayCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date();
    if (currentDateDisplay) {
      currentDateDisplay.textContent = today.toLocaleDateString('en-US', options);
    }
  }
  displayCurrentDate();

  // --- Toast Notification System ---
  function showToast(message, type = 'success') {
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast-alert toast-alert-${type}`;
    
    let icon = '✓';
    if (type === 'info') icon = 'ℹ';
    if (type === 'error') icon = '⚠';

    toast.innerHTML = `
      <span style="font-weight:700; font-size:1.1rem;">${icon}</span>
      <div>${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Trigger animation slide in
    setTimeout(() => {
      toast.classList.add('show');
    }, 50);

    // Fade out and remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 400);
    }, 3500);
  }

  // --- Update Profile Header ---
  function renderProfileHeader() {
    if (avatarLetter) {
      if (profile.logoUrl) {
        avatarLetter.style.backgroundImage = `url('${profile.logoUrl}')`;
        avatarLetter.style.backgroundSize = 'cover';
        avatarLetter.style.backgroundPosition = 'center';
        avatarLetter.textContent = '';
      } else {
        avatarLetter.style.backgroundImage = '';
        avatarLetter.textContent = profile.logoLetter || profile.name.charAt(0);
      }
    }
    if (usernameText) usernameText.textContent = profile.name;
    if (userboardText) userboardText.textContent = `${profile.board} Board • ${profile.city}`;

    // Populate Hero Card details
    const heroName = document.getElementById('hero-school-name');
    if (heroName) heroName.textContent = profile.name;
    const heroRole = document.getElementById('hero-school-role');
    if (heroRole) heroRole.textContent = `Role: School Administrator`;
    const heroBadge = document.getElementById('hero-school-badge');
    if (heroBadge) {
      heroBadge.textContent = profile.board ? `${profile.board} Board` : 'School Partner';
    }
    
    // Trigger custom event to sync with mobile header & sidebar
    window.dispatchEvent(new CustomEvent('profileUpdated'));
  }

  // --- Tab Switching Logic ---
  tabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tabTarget = link.getAttribute('data-tab');
      
      // Update active nav links (syncs both desktop sidebar and mobile drawer)
      tabLinks.forEach(l => {
        if (l.getAttribute('data-tab') === tabTarget) {
          l.classList.add('active');
        } else {
          l.classList.remove('active');
        }
      });

      // Update active tab panel
      tabPanels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === `${tabTarget}-tab`) {
          panel.classList.add('active');
        }
      });

      // Update title text
      let tabName = 'Dashboard Overview';
      if (tabTarget === 'events') tabName = 'Manage Events';
      if (tabTarget === 'registrations') tabName = 'Event Registrations';
      if (tabTarget === 'admissions') tabName = 'Admissions Announcements';
      if (tabTarget === 'applications') tabName = 'Admissions Applications Received';
      if (tabTarget === 'contact-requests') tabName = 'Contact Requests Received';
      if (tabTarget === 'community-members') tabName = 'Community Members';
      if (tabTarget === 'profile') tabName = 'School Profile Settings';
if (topBarTitle) topBarTitle.textContent = tabName;
    });
  });

  // --- Update Metric Statistics ---
  function updateDashboardStats() {
    const totalEvents = events.filter(e => e.school === profile.name).length;
    const totalRegistrations = registrations.length;
    const totalAdmissions = admissions.filter(a => a.schoolName === profile.name).length;
    const totalStudents = contactRequests.length;
    const totalApplications = admissionApplications.length;

    const statEventsEl = document.getElementById('stat-total-events');
    const statRegsEl = document.getElementById('stat-registrations');
    const statAdmissionsEl = document.getElementById('stat-admission-posts');

    if (statEventsEl) statEventsEl.textContent = totalEvents;
    if (statRegsEl) statRegsEl.textContent = totalRegistrations;
    if (statAdmissionsEl) statAdmissionsEl.textContent = totalAdmissions;

    // Pending count
    const pendingCount = registrations.filter(r => r.status === 'pending').length;
    const pendingTextEl = document.getElementById('pending-reg-count');
    if (pendingTextEl) {
      pendingTextEl.textContent = `${pendingCount} pending request${pendingCount === 1 ? '' : 's'}`;
    }

    // Sync mobile card counts
    const mobEventsEl = document.getElementById('mobile-stat-events');
    const mobRegsEl = document.getElementById('mobile-stat-registrations');
    const mobAdmissionsEl = document.getElementById('mobile-stat-admissions');
    const mobStudentsEl = document.getElementById('mobile-stat-students');
    const mobAppsEl = document.getElementById('mobile-stat-applications');

    if (mobEventsEl) mobEventsEl.textContent = totalEvents;
    if (mobRegsEl) mobRegsEl.textContent = totalRegistrations;
    if (mobAdmissionsEl) mobAdmissionsEl.textContent = totalAdmissions;
    if (mobStudentsEl) mobStudentsEl.textContent = totalStudents;
    if (mobAppsEl) mobAppsEl.textContent = totalApplications;

    // Sync mobile notification bell badge
    const mobNotifBadge = document.getElementById('mobile-notification-badge');
    if (mobNotifBadge) {
      if (pendingCount > 0) {
        mobNotifBadge.textContent = pendingCount;
        mobNotifBadge.style.display = 'block';
      } else {
        mobNotifBadge.style.display = 'none';
      }
    }
  }

  // --- Render Registrations Table ---
  const regsTbody = document.getElementById('registrations-tbody');
  const tabRegsTbody = document.getElementById('tab-registrations-tbody');
  
  function renderRegistrations() {
    // 1. Populate Overview (Recent) table
    if (regsTbody) {
      regsTbody.innerHTML = '';
      if (registrations.length === 0) {
        regsTbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">
              No registrations received yet.
            </td>
          </tr>
        `;
      } else {
        // Sort: pending first, limit to 5 recent on overview
        const sortedRegs = [...registrations].sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return 0;
        }).slice(0, 5);

        sortedRegs.forEach(reg => {
          const tr = document.createElement('tr');
          let statusClass = 'status-pending';
          if (reg.status === 'approved') statusClass = 'status-approved';
          if (reg.status === 'rejected') statusClass = 'status-rejected';

          let actionsHtml = '';
          if (reg.status === 'pending') {
            actionsHtml = `
              <div class="btn-action-group">
                <button class="btn-action btn-approve" data-id="${reg.id}">Approve</button>
                <button class="btn-action btn-reject" data-id="${reg.id}">Reject</button>
              </div>
            `;
          } else {
            actionsHtml = `<span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">No actions pending</span>`;
          }

          tr.innerHTML = `
            <td style="font-weight: 600; color: var(--dark-bg);">${reg.studentName}</td>
            <td>${reg.classGrade}</td>
            <td>${reg.eventTitle}</td>
            <td>${reg.dateApplied}</td>
            <td>
              <span class="badge-status ${statusClass}">${reg.status}</span>
            </td>
            <td>${actionsHtml}</td>
          `;
          regsTbody.appendChild(tr);
        });
      }
    }

    // 2. Populate Registrations Tab table
    if (tabRegsTbody) {
      tabRegsTbody.innerHTML = '';
      if (registrations.length === 0) {
        tabRegsTbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
              No registrations received yet.
            </td>
          </tr>
        `;
      } else {
        // Show all registrations
        const sortedRegs = [...registrations].sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return 0;
        });

        sortedRegs.forEach(reg => {
          const tr = document.createElement('tr');
          let statusClass = 'status-pending';
          if (reg.status === 'approved') statusClass = 'status-approved';
          if (reg.status === 'rejected') statusClass = 'status-rejected';

          let actionsHtml = '';
          const isPending = reg.status === 'pending';
          
          actionsHtml = `
            <div style="display: flex; gap: 6px; align-items: center;">
              <button class="btn btn-secondary btn-view-reg" data-id="${reg.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm);">View</button>
              ${isPending ? `
                <button class="btn btn-primary btn-approve" data-id="${reg.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm);">Approve</button>
                <button class="btn btn-secondary btn-reject" data-id="${reg.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); background-color: #FEF2F2; color: #EF4444; border-color: rgba(239, 68, 68, 0.2);">Reject</button>
              ` : ''}
            </div>
          `;

            const typeText = reg.is_team ? `Team (${reg.team_size || 1})` : 'Individual';

          tr.innerHTML = `
            <td style="font-weight: 700; color: var(--dark-bg);">${reg.studentName}</td>
            <td>${reg.classGrade}</td>
            <td>${reg.eventTitle}</td>
            <td>${reg.dateApplied}</td>
            <td><span class="badge-status status-approved" style="background-color: rgba(59, 130, 246, 0.1); color: var(--primary); font-weight:700;">${typeText}</span></td>
            <td>
              <span class="badge-status ${statusClass}" style="font-weight:700;">${reg.status.toUpperCase()}</span>
            </td>
            <td>${actionsHtml}</td>
          `;
          tabRegsTbody.appendChild(tr);
        });
      }
    }

    // Attach Action Listeners for both tables
    document.querySelectorAll('.btn-approve').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const parsedId = isNaN(id) ? id : parseInt(id, 10);
        updateRegistrationStatus(parsedId, 'approved');
      });
    });

    document.querySelectorAll('.btn-reject').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const parsedId = isNaN(id) ? id : parseInt(id, 10);
        updateRegistrationStatus(parsedId, 'rejected');
      });
    });

    document.querySelectorAll('.btn-view-reg').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const parsedId = isNaN(id) ? id : parseInt(id, 10);
        openRegistrationDetailsModal(parsedId);
      });
    });
  }

  // --- Registration Details Modal ---
  const regDetailsModal = document.getElementById('reg-details-modal');
  const regDetailsContent = document.getElementById('reg-details-content');
  const regDetailsActions = document.getElementById('reg-details-actions');
  const closeRegDetailsBtn = document.getElementById('close-reg-details-btn');

  function openRegistrationDetailsModal(id) {
    if (!regDetailsModal || !regDetailsContent) return;
    
    const reg = registrations.find(r => r.id === id);
    if (!reg) return;

    let teamHtml = '';
    if (reg.is_team) {
      teamHtml = `
        <div style="margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 16px;">
          <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Team Information</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">Team Name</span>
              <strong style="color: var(--dark-bg);">${reg.team_name || 'N/A'}</strong>
            </div>
            <div>
              <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">Team Size</span>
              <strong style="color: var(--dark-bg);">${reg.team_size || 1} Members</strong>
            </div>
          </div>
          <div style="margin-top: 12px;">
            <span style="font-size: 0.8rem; color: var(--text-muted); display: block;">Team Members / Details</span>
            <p style="margin: 4px 0 0 0; background: var(--bg-light); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); font-size: 0.85rem; font-style: italic;">${reg.team_members || 'No details specified.'}</p>
          </div>
        </div>
      `;
    }

    regDetailsContent.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div>
          <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Student Info</h4>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div><span style="color: var(--text-muted);">Name:</span> <strong>${reg.studentName}</strong></div>
            <div><span style="color: var(--text-muted);">Grade:</span> <strong>${reg.classGrade}</strong></div>
            <div><span style="color: var(--text-muted);">School:</span> <strong>${reg.school_name || 'N/A'}</strong></div>
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
          <span style="font-size: 0.8rem; color: var(--text-muted);">Date Applied</span>
          <span style="display: block; font-weight: 600;">${reg.dateApplied}</span>
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
      
      regDetailsActions.querySelector('.btn-modal-approve').onclick = () => {
        updateRegistrationStatus(id, 'approved');
        closeRegistrationDetailsModal();
      };
      
      regDetailsActions.querySelector('.btn-modal-reject').onclick = () => {
        updateRegistrationStatus(id, 'rejected');
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

  async function updateRegistrationStatus(id, newStatus) {
    let dbUpdated = false;
    if (auth && supabase && session) {
      try {
        if (id.toString().length > 8) {
          const { error } = await supabase
            .from('event_registrations')
            .update({ status: newStatus })
            .eq('id', id);
          if (error) throw error;
          dbUpdated = true;
        }
      } catch (err) {
        console.warn('Failed to update registration status in Supabase:', err.message);
      }
    }
    
    registrations = registrations.map(reg => {
      if (reg.id === id) {
        return { ...reg, status: newStatus };
      }
      return reg;
    });
    saveState('campuslink_registrations', registrations);
    renderRegistrations();
    updateDashboardStats();
    showToast(`Registration successfully ${newStatus}!`, newStatus === 'approved' ? 'success' : 'info');
  }

  // --- Render Events Tab ---
  const eventsGrid = document.getElementById('dashboard-events-grid');
  const eventFormContainer = document.getElementById('create-event-form-container');
  const toggleEventFormBtn = document.getElementById('btn-toggle-event-form');
  const cancelEventFormBtn = document.getElementById('btn-cancel-event-form');
  const dashboardEventForm = document.getElementById('dashboard-event-form');
  const editEventIdInput = document.getElementById('edit-event-id');
  const eventFormTitle = document.getElementById('event-form-title');
  const submitEventBtn = document.getElementById('btn-submit-event');

  function renderEvents() {
    if (!eventsGrid) return;
    eventsGrid.innerHTML = '';

    const myEvents = events.filter(e => e.school === profile.name);

    if (myEvents.length === 0) {
      eventsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; background-color: var(--white); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <p style="color: var(--text-muted); font-size: 1rem;">No events published by your school yet. Click 'Create New Event' to list one!</p>
        </div>
      `;
      return;
    }

    myEvents.forEach(evt => {
      const card = document.createElement('div');
      card.className = 'dash-item-card';

      // Pick an emoji based on category
      let emoji = '🎉';
      if (evt.category === 'sports') emoji = '🏀';
      if (evt.category === 'science') emoji = '🔬';
      if (evt.category === 'debate') emoji = '🗣️';
      if (evt.category === 'workshop') emoji = '💻';
      if (evt.category === 'cultural') emoji = '🎭';

      let bannerHtml = '';
      if (evt.bannerImg) {
        bannerHtml = `<div class="dash-item-img" style="background-image: url('${evt.bannerImg}'); background-size: cover; background-position: center; height: 140px;"></div>`;
      } else {
        bannerHtml = `<div class="dash-item-img-placeholder"><div>${emoji}</div></div>`;
      }

      card.innerHTML = `
        ${bannerHtml}
        <div class="dash-item-body">
          <span class="dash-item-tag">${evt.category}</span>
          <h4>${evt.title}</h4>
          <div class="dash-item-meta">
            <span>📅 <strong>Date:</strong> ${evt.date}</span>
            <span>⏱️ <strong>Deadline:</strong> ${evt.deadline}</span>
            <span>📍 <strong>Venue:</strong> ${evt.venue}</span>
          </div>
          <div class="dash-item-actions">
            <button class="btn-edit-action btn-edit-event" data-id="${evt.id}" style="flex-grow: 1;">Edit</button>
            <button class="btn-delete-action btn-delete-event" data-id="${evt.id}" style="flex-grow: 1;">Delete</button>
          </div>
        </div>
      `;
      eventsGrid.appendChild(card);
    });

    // Attach Edit/Delete Listeners
    eventsGrid.querySelectorAll('.btn-edit-event').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const evtId = parseInt(e.target.getAttribute('data-id'), 10);
        openEditEventForm(evtId);
      });
    });

    eventsGrid.querySelectorAll('.btn-delete-event').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (confirm("Are you sure you want to delete this event?")) {
          const evtId = parseInt(e.target.getAttribute('data-id'), 10);
          deleteEvent(evtId);
        }
      });
    });
  }

  // Toggle Event Form
  if (toggleEventFormBtn) {
    toggleEventFormBtn.addEventListener('click', () => {
      if (eventFormContainer.style.display === 'none') {
        openCreateEventForm();
      } else {
        closeEventForm();
      }
    });
  }

  if (cancelEventFormBtn) {
    cancelEventFormBtn.addEventListener('click', closeEventForm);
  }

  // --- Banner Dropzone and File Handlers ---
  const bannerDropzone = document.getElementById('banner-dropzone');
  const bannerInput = document.getElementById('event-banner');
  const bannerPreviewContainer = document.getElementById('banner-preview-container');
  const bannerPreviewImg = document.getElementById('banner-preview-img');
  const btnRemoveBanner = document.getElementById('btn-remove-banner');
  
  let bannerBase64 = '';

  if (bannerDropzone && bannerInput) {
    bannerDropzone.addEventListener('click', () => {
      bannerInput.click();
    });

    bannerInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleBannerFile(file);
      }
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      bannerDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        bannerDropzone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      bannerDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        bannerDropzone.classList.remove('dragover');
      }, false);
    });

    bannerDropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const file = dt.files[0];
      if (file && file.type.startsWith('image/')) {
        handleBannerFile(file);
      }
    });
  }

  function handleBannerFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      bannerBase64 = e.target.result;
      if (bannerPreviewImg) bannerPreviewImg.src = bannerBase64;
      if (bannerPreviewContainer) bannerPreviewContainer.style.display = 'block';
      if (bannerDropzone) bannerDropzone.style.display = 'none';
      
      const errEl = document.getElementById('err-event-banner');
      if (errEl) {
        errEl.textContent = '';
        errEl.style.display = 'none';
      }
      if (bannerDropzone) {
        bannerDropzone.style.borderColor = '';
      }
    };
    reader.readAsDataURL(file);
  }

  if (btnRemoveBanner) {
    btnRemoveBanner.addEventListener('click', () => {
      bannerBase64 = '';
      if (bannerInput) bannerInput.value = '';
      if (bannerPreviewImg) bannerPreviewImg.src = '';
      if (bannerPreviewContainer) bannerPreviewContainer.style.display = 'none';
      if (bannerDropzone) bannerDropzone.style.display = 'flex';
    });
  }

  function showError(fieldId, message) {
    const errorEl = document.getElementById(`err-${fieldId}`);
    const inputEl = document.getElementById(fieldId) || (fieldId === 'event-banner' ? document.getElementById('banner-dropzone') : null);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
    if (inputEl) {
      inputEl.style.borderColor = '#EF4444';
    }
  }

  function openCreateEventForm() {
    eventFormTitle.textContent = "Publish New Opportunity";
    submitEventBtn.textContent = "Publish Event";
    editEventIdInput.value = "";
    dashboardEventForm.reset();
    
    bannerBase64 = '';
    if (bannerInput) bannerInput.value = '';
    if (bannerPreviewImg) bannerPreviewImg.src = '';
    if (bannerPreviewContainer) bannerPreviewContainer.style.display = 'none';
    if (bannerDropzone) bannerDropzone.style.display = 'flex';

    // Clear error states
    const errorSpans = dashboardEventForm.querySelectorAll('.error-msg');
    errorSpans.forEach(span => {
      span.textContent = '';
      span.style.display = 'none';
    });
    const formInputs = dashboardEventForm.querySelectorAll('input, select, textarea');
    formInputs.forEach(input => {
      if (input.id !== 'event-banner') {
        input.style.borderColor = '';
      }
    });
    if (bannerDropzone) bannerDropzone.style.borderColor = '';

    eventFormContainer.style.display = 'block';
    toggleEventFormBtn.style.display = 'none';
    eventFormContainer.scrollIntoView({ behavior: 'smooth' });
  }

  function openEditEventForm(id) {
    const evt = events.find(e => e.id === id);
    if (!evt) return;

    eventFormTitle.textContent = "Edit Opportunity Details";
    submitEventBtn.textContent = "Save Changes";
    editEventIdInput.value = evt.id;

    document.getElementById('event-title').value = evt.title;
    document.getElementById('event-category').value = evt.category;
    document.getElementById('event-date').value = evt.date;
    document.getElementById('event-venue').value = evt.venue;
    document.getElementById('event-reg-link').value = evt.registrationLink || '';
    document.getElementById('event-description').value = evt.description;

    // Reset error styling
    const errorSpans = dashboardEventForm.querySelectorAll('.error-msg');
    errorSpans.forEach(span => {
      span.textContent = '';
      span.style.display = 'none';
    });
    const formInputs = dashboardEventForm.querySelectorAll('input, select, textarea');
    formInputs.forEach(input => {
      if (input.id !== 'event-banner') {
        input.style.borderColor = '';
      }
    });
    if (bannerDropzone) bannerDropzone.style.borderColor = '';

    if (evt.bannerImg) {
      bannerBase64 = evt.bannerImg;
      if (bannerPreviewImg) bannerPreviewImg.src = bannerBase64;
      if (bannerPreviewContainer) bannerPreviewContainer.style.display = 'block';
      if (bannerDropzone) bannerDropzone.style.display = 'none';
    } else {
      bannerBase64 = '';
      if (bannerPreviewContainer) bannerPreviewContainer.style.display = 'none';
      if (bannerDropzone) bannerDropzone.style.display = 'flex';
    }

    eventFormContainer.style.display = 'block';
    toggleEventFormBtn.style.display = 'none';
    eventFormContainer.scrollIntoView({ behavior: 'smooth' });
  }

  function closeEventForm() {
    eventFormContainer.style.display = 'none';
    toggleEventFormBtn.style.display = 'block';
    dashboardEventForm.reset();
    editEventIdInput.value = "";
    bannerBase64 = '';
    if (bannerInput) bannerInput.value = '';
    if (bannerPreviewImg) bannerPreviewImg.src = '';
    if (bannerPreviewContainer) bannerPreviewContainer.style.display = 'none';
    if (bannerDropzone) bannerDropzone.style.display = 'flex';
  }

  // Handle Event Submit (Create/Update)
  if (dashboardEventForm) {
    dashboardEventForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Clear all errors
      const errorSpans = dashboardEventForm.querySelectorAll('.error-msg');
      errorSpans.forEach(span => {
        span.textContent = '';
        span.style.display = 'none';
      });
      const formInputs = dashboardEventForm.querySelectorAll('input, select, textarea');
      formInputs.forEach(input => {
        if (input.id !== 'event-banner') {
          input.style.borderColor = '';
        }
      });
      if (bannerDropzone) bannerDropzone.style.borderColor = '';

      let isValid = true;

      const editId = editEventIdInput.value;
      const title = document.getElementById('event-title').value.trim();
      const category = document.getElementById('event-category').value;
      const date = document.getElementById('event-date').value.trim();
      const venue = document.getElementById('event-venue').value.trim();
      const registrationLink = document.getElementById('event-reg-link').value.trim();
      const description = document.getElementById('event-description').value.trim();

      // Custom Val: Title
      if (!title) {
        showError('event-title', 'Event Title is required.');
        isValid = false;
      } else if (title.length < 5) {
        showError('event-title', 'Title must be at least 5 characters.');
        isValid = false;
      }

      // Custom Val: Category
      if (!category) {
        showError('event-category', 'Please select an event category.');
        isValid = false;
      }

      // Custom Val: Date
      if (!date) {
        showError('event-date', 'Event Date is required.');
        isValid = false;
      }

      // Custom Val: Venue
      if (!venue) {
        showError('event-venue', 'Venue is required.');
        isValid = false;
      }

      // Custom Val: Registration Link
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
      if (!registrationLink) {
        showError('event-reg-link', 'Registration Link is required.');
        isValid = false;
      } else if (!urlPattern.test(registrationLink)) {
        showError('event-reg-link', 'Please enter a valid URL.');
        isValid = false;
      }

      // Custom Val: Description
      if (!description) {
        showError('event-description', 'Event description is required.');
        isValid = false;
      } else if (description.length < 15) {
        showError('event-description', 'Description must be at least 15 characters.');
        isValid = false;
      }

      // Custom Val: Banner Image
      if (!bannerBase64) {
        showError('event-banner', 'Banner image is required.');
        isValid = false;
      }

      if (!isValid) {
        showToast('Please fix the form errors before publishing.', 'error');
        return;
      }

      const performSaveEvent = async () => {
        if (supabase && profile.id && profile.id.length > 8) {
          try {
            if (editId) {
              const { error } = await supabase.from('events').update({
                title: title,
                category: category,
                event_date: date,
                venue: venue,
                registration_link: registrationLink,
                description: description,
                banner_url: bannerBase64
              }).eq('id', editId);
              
              if (error) throw error;
              showToast("Event updated successfully!");
            } else {
              let emoji = '🎉';
              let tag = 'Opportunity';
              if (category === 'sports') { emoji = '🏀'; tag = 'Sports'; }
              if (category === 'science') { emoji = '🔬'; tag = 'Science & Tech'; }
              if (category === 'debate') { emoji = '🗣️'; tag = 'Debate & Speech'; }
              if (category === 'workshop') { emoji = '💻'; tag = 'Technology'; }
              if (category === 'cultural') { emoji = '🎭'; tag = 'Arts & Culture'; }

              const { error } = await supabase.from('events').insert({
                school_id: profile.id,
                title: title,
                category: category,
                event_date: date,
                deadline: "Varies",
                venue: venue,
                registration_link: registrationLink,
                description: description,
                banner_url: bannerBase64,
                tag: tag,
                city: profile.city,
                school_name: profile.name,
                logo_letter: emoji
              });
              
              if (error) throw error;
              showToast("New event published successfully!");
            }
            await loadDashboardData();
            closeEventForm();
          } catch (err) {
            console.error('Supabase event save failed:', err);
            showToast('Failed to save event to database: ' + err.message, 'error');
          }
        } else {
          // LocalStorage fallback
          if (editId) {
            const targetId = parseInt(editId, 10);
            events = events.map(evt => {
              if (evt.id === targetId) {
                return {
                  ...evt,
                  title,
                  category,
                  date,
                  venue,
                  registrationLink,
                  description,
                  bannerImg: bannerBase64
                };
              }
              return evt;
            });
            showToast("Event updated successfully!");
          } else {
            let emoji = '🎉';
            let tag = 'Opportunity';
            if (category === 'sports') { emoji = '🏀'; tag = 'Sports'; }
            if (category === 'science') { emoji = '🔬'; tag = 'Science & Tech'; }
            if (category === 'debate') { emoji = '🗣️'; tag = 'Debate & Speech'; }
            if (category === 'workshop') { emoji = '💻'; tag = 'Technology'; }
            if (category === 'cultural') { emoji = '🎭'; tag = 'Arts & Culture'; }

            const newEvent = {
              id: Date.now(),
              title,
              category,
              date,
              deadline: "Varies",
              venue,
              registrationLink,
              description,
              school: profile.name,
              city: profile.city,
              tag: tag,
              registrations: "0 Registered",
              logoLetter: emoji,
              bannerImg: bannerBase64
            };
            events.push(newEvent);
            showToast("New event published successfully!");
          }
          saveState('campuslink_events', events);
          closeEventForm();
          renderEvents();
          updateDashboardStats();
        }
      };
      
      performSaveEvent();
    });
  }

  async function deleteEvent(id) {
    if (supabase && typeof id === 'string' && id.length > 8) {
      try {
        const { error } = await supabase.from('events').delete().eq('id', id);
        if (error) throw error;
        showToast("Event deleted successfully.", "info");
        await loadDashboardData();
        return;
      } catch (err) {
        console.error('Delete event failed:', err);
        showToast('Failed to delete event: ' + err.message, 'error');
      }
    }
    
    events = events.filter(e => e.id !== id);
    saveState('campuslink_events', events);
    renderEvents();
    updateDashboardStats();
    showToast("Event deleted successfully.", "info");
  }

  // --- Render Admissions Tab ---
  const admissionsGrid = document.getElementById('dashboard-admissions-grid');
  const admissionFormContainer = document.getElementById('create-admission-form-container');
  const toggleAdmissionFormBtn = document.getElementById('btn-toggle-admission-form');
  const cancelAdmissionFormBtn = document.getElementById('btn-cancel-admission-form');
  const dashboardAdmissionForm = document.getElementById('dashboard-admission-form');
  const editAdmissionIdInput = document.getElementById('edit-admission-id');
  const admissionFormTitle = document.getElementById('admission-form-title');
  const submitAdmissionBtn = document.getElementById('btn-submit-admission');

  function renderAdmissions() {
    if (!admissionsGrid) return;
    admissionsGrid.innerHTML = '';

    const myAdmissions = admissions.filter(a => a.schoolName === profile.name);

    if (myAdmissions.length === 0) {
      admissionsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; background-color: var(--white); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <p style="color: var(--text-muted); font-size: 1rem;">No admissions announcements posted. Click 'New Admission Post' to share your registration details!</p>
        </div>
      `;
      return;
    }

    myAdmissions.forEach(adm => {
      const card = document.createElement('div');
      card.className = 'dash-item-card';
      
      card.innerHTML = `
        <div class="dash-item-img-placeholder" style="background: linear-gradient(135deg, var(--accent-hover) 0%, var(--primary) 100%);">
          <div>🎓</div>
        </div>
        <div class="dash-item-body">
          <span class="dash-item-tag" style="background-color: var(--accent-light); color: var(--accent-hover);">Session 2026-27</span>
          <h4>Admissions Open: ${adm.classesOpen}</h4>
          <div class="dash-item-meta">
            <span>📅 <strong>Start Date:</strong> ${adm.startDate || 'N/A'}</span>
            <span>⏱️ <strong>Deadline:</strong> ${adm.lastDate}</span>
            <span>🔗 <strong>Apply Link:</strong> ${adm.applyLink ? `<a href="${adm.applyLink}" target="_blank" style="color: var(--primary); text-decoration: underline; font-weight: 600;">Link</a>` : 'Not Provided'}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;" title="${adm.details || ''}">
            <strong>Eligibility:</strong> ${adm.details || ''}
          </div>
          <div class="dash-item-actions" style="margin-top: 12px;">
            <button class="btn-edit-action btn-edit-admission" data-id="${adm.id}" style="flex-grow: 1;">Edit</button>
            <button class="btn-delete-action btn-delete-admission" data-id="${adm.id}" style="flex-grow: 1;">Delete</button>
          </div>
        </div>
      `;
      admissionsGrid.appendChild(card);
    });

    // Attach Listeners
    admissionsGrid.querySelectorAll('.btn-edit-admission').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const admId = parseInt(e.target.getAttribute('data-id'), 10);
        openEditAdmissionForm(admId);
      });
    });

    admissionsGrid.querySelectorAll('.btn-delete-admission').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (confirm("Are you sure you want to delete this admission post?")) {
          const admId = parseInt(e.target.getAttribute('data-id'), 10);
          deleteAdmission(admId);
        }
      });
    });
  }

  // Toggle Admission Form
  if (toggleAdmissionFormBtn) {
    toggleAdmissionFormBtn.addEventListener('click', () => {
      if (admissionFormContainer.style.display === 'none') {
        openCreateAdmissionForm();
      } else {
        closeAdmissionForm();
      }
    });
  }

  if (cancelAdmissionFormBtn) {
    cancelAdmissionFormBtn.addEventListener('click', closeAdmissionForm);
  }

  function openCreateAdmissionForm() {
    admissionFormTitle.textContent = "Publish Admission Cycle";
    submitAdmissionBtn.textContent = "Publish Post";
    editAdmissionIdInput.value = "";
    dashboardAdmissionForm.reset();
    
    // Set current profile school name
    const schoolNameInput = document.getElementById('admission-school-name');
    if (schoolNameInput) {
      schoolNameInput.value = profile.name;
    }

    // Reset error styling
    const errorSpans = dashboardAdmissionForm.querySelectorAll('.error-msg');
    errorSpans.forEach(span => {
      span.textContent = '';
      span.style.display = 'none';
    });
    const formInputs = dashboardAdmissionForm.querySelectorAll('input, textarea');
    formInputs.forEach(input => {
      input.style.borderColor = '';
    });

    // Reset checkboxes
    const checkboxes = document.querySelectorAll('input[name="admission_classes"]');
    checkboxes.forEach(cb => cb.checked = false);
    document.getElementById('admission-classes').value = '';

    admissionFormContainer.style.display = 'block';
    toggleAdmissionFormBtn.style.display = 'none';
    admissionFormContainer.scrollIntoView({ behavior: 'smooth' });
  }

  function openEditAdmissionForm(id) {
    const adm = admissions.find(a => a.id === id);
    if (!adm) return;

    admissionFormTitle.textContent = "Edit Admission Details";
    submitAdmissionBtn.textContent = "Save Changes";
    editAdmissionIdInput.value = adm.id;

    const schoolNameInput = document.getElementById('admission-school-name');
    if (schoolNameInput) {
      schoolNameInput.value = adm.schoolName || profile.name;
    }

    document.getElementById('admission-classes').value = adm.classesOpen || '';
    
    // Sync checkboxes based on classesOpen value
    const selectedClasses = (adm.classesOpen || '').split(',').map(s => s.trim()).filter(Boolean);
    const checkboxes = document.querySelectorAll('input[name="admission_classes"]');
    checkboxes.forEach(cb => {
      cb.checked = selectedClasses.includes(cb.value);
    });

    document.getElementById('admission-start-date').value = adm.startDate || '';
    document.getElementById('admission-end-date').value = adm.lastDate || '';
    document.getElementById('admission-apply-link').value = adm.applyLink || '';
    document.getElementById('admission-eligibility').value = adm.details || '';

    // Reset error styling
    const errorSpans = dashboardAdmissionForm.querySelectorAll('.error-msg');
    errorSpans.forEach(span => {
      span.textContent = '';
      span.style.display = 'none';
    });
    const formInputs = dashboardAdmissionForm.querySelectorAll('input, textarea');
    formInputs.forEach(input => {
      input.style.borderColor = '';
    });

    admissionFormContainer.style.display = 'block';
    toggleAdmissionFormBtn.style.display = 'none';
    admissionFormContainer.scrollIntoView({ behavior: 'smooth' });
  }

  function closeAdmissionForm() {
    admissionFormContainer.style.display = 'none';
    toggleAdmissionFormBtn.style.display = 'block';
    dashboardAdmissionForm.reset();
    editAdmissionIdInput.value = "";

    // Reset checkboxes
    const checkboxes = document.querySelectorAll('input[name="admission_classes"]');
    checkboxes.forEach(cb => cb.checked = false);
    document.getElementById('admission-classes').value = '';

    // Reset error styling
    const errorSpans = dashboardAdmissionForm.querySelectorAll('.error-msg');
    errorSpans.forEach(span => {
      span.textContent = '';
      span.style.display = 'none';
    });
    const formInputs = dashboardAdmissionForm.querySelectorAll('input, textarea');
    formInputs.forEach(input => {
      input.style.borderColor = '';
    });
  }

  // Handle Admission Submit
  if (dashboardAdmissionForm) {
    dashboardAdmissionForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Clear all errors
      const errorSpans = dashboardAdmissionForm.querySelectorAll('.error-msg');
      errorSpans.forEach(span => {
        span.textContent = '';
        span.style.display = 'none';
      });
      const formInputs = dashboardAdmissionForm.querySelectorAll('input, textarea');
      formInputs.forEach(input => {
        input.style.borderColor = '';
      });

      let isValid = true;

      const editId = editAdmissionIdInput.value;
      const schoolName = document.getElementById('admission-school-name').value.trim();
      const classesOpen = document.getElementById('admission-classes').value.trim();
      const startDate = document.getElementById('admission-start-date').value.trim();
      const endDate = document.getElementById('admission-end-date').value.trim();
      const applyLink = document.getElementById('admission-apply-link').value.trim();
      const eligibility = document.getElementById('admission-eligibility').value.trim();

      if (!schoolName) {
        showError('admission-school-name', 'School Name is required.');
        isValid = false;
      }

      if (!classesOpen) {
        showError('admission-classes', 'Classes Open is required.');
        isValid = false;
      }

      if (!startDate) {
        showError('admission-start-date', 'Admission Start Date is required.');
        isValid = false;
      }

      if (!endDate) {
        showError('admission-end-date', 'Admission End Date is required.');
        isValid = false;
      }

      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
      if (!applyLink) {
        showError('admission-apply-link', 'Apply Link is required.');
        isValid = false;
      } else if (!urlPattern.test(applyLink)) {
        showError('admission-apply-link', 'Please enter a valid URL.');
        isValid = false;
      }

      if (!eligibility) {
        showError('admission-eligibility', 'Eligibility criteria is required.');
        isValid = false;
      } else if (eligibility.length < 15) {
        showError('admission-eligibility', 'Eligibility criteria must be at least 15 characters.');
        isValid = false;
      }

      if (!isValid) {
        showToast('Please fix the form errors before publishing.', 'error');
        return;
      }

      const performSaveAdmission = async () => {
        const checkedCbs = document.querySelectorAll('input[name="admission_classes"]:checked');
        const specificClasses = Array.from(checkedCbs).map(cb => cb.value);
        const classLevels = [...specificClasses];

        const clsLower = classesOpen.toLowerCase();
        if (clsLower.includes('nursery') || clsLower.includes('kg') || clsLower.includes('kindergarten') || clsLower.includes('lkg') || clsLower.includes('ukg')) classLevels.push('nursery');
        if (clsLower.includes('primary') || clsLower.includes('grade 1') || clsLower.includes('grade 2') || clsLower.includes('grade 3') || clsLower.includes('grade 4') || clsLower.includes('grade 5') || clsLower.includes('class i') || clsLower.includes('v') || clsLower.includes('1') || clsLower.includes('2') || clsLower.includes('3') || clsLower.includes('4') || clsLower.includes('5')) classLevels.push('primary');
        if (clsLower.includes('secondary') || clsLower.includes('grade 6') || clsLower.includes('grade 7') || clsLower.includes('grade 8') || clsLower.includes('grade 9') || clsLower.includes('grade 10') || clsLower.includes('ix') || clsLower.includes('x') || clsLower.includes('6') || clsLower.includes('7') || clsLower.includes('8') || clsLower.includes('9') || clsLower.includes('10')) classLevels.push('secondary');
        if (clsLower.includes('senior') || clsLower.includes('grade 11') || clsLower.includes('grade 12') || clsLower.includes('xi') || clsLower.includes('xii') || clsLower.includes('11') || clsLower.includes('12')) classLevels.push('senior-secondary');
        if (classLevels.length === 0) classLevels.push('primary', 'secondary');

        if (supabase && profile.id && profile.id.length > 8) {
          try {
            if (editId) {
              const { error } = await supabase.from('admissions').update({
                classes_open: classesOpen,
                start_date: startDate,
                last_date: endDate,
                apply_link: applyLink,
                details: eligibility,
                class_levels: classLevels
              }).eq('id', editId);
              
              if (error) throw error;
              showToast("Admission cycle updated successfully!");
            } else {
              const { error } = await supabase.from('admissions').insert({
                school_id: profile.id,
                school_name: profile.name,
                city: profile.city,
                board: profile.board,
                classes_open: classesOpen,
                start_date: startDate,
                last_date: endDate,
                apply_link: applyLink,
                details: eligibility,
                academic_year: "2026-27",
                class_levels: classLevels,
                status: "open"
              });
              
              if (error) throw error;
              showToast("Admission cycle posted successfully!");
            }
            await loadDashboardData();
            closeAdmissionForm();
          } catch (err) {
            console.error('Supabase admission save failed:', err);
            showToast('Failed to save admission post: ' + err.message, 'error');
          }
        } else {
          // LocalStorage fallback
          if (editId) {
            const targetId = parseInt(editId, 10);
            admissions = admissions.map(adm => {
              if (adm.id === targetId) {
                return {
                  ...adm,
                  classesOpen,
                  startDate,
                  lastDate: endDate,
                  academicYear: "2026-27",
                  applyLink,
                  details: eligibility,
                  schoolName: profile.name,
                  board: profile.board,
                  city: profile.city
                };
              }
              return adm;
            });
            showToast("Admission cycle updated successfully!");
          } else {
            const newAdmission = {
              id: Date.now(),
              classesOpen,
              startDate,
              lastDate: endDate,
              academicYear: "2026-27",
              applyLink,
              details: eligibility,
              schoolName: profile.name,
              board: profile.board,
              city: profile.city,
              schoolId: 4,
              status: "open",
              classLevels: classLevels
            };
            admissions.push(newAdmission);
            showToast("Admission cycle posted successfully!");
          }
          saveState('campuslink_admissions', admissions);
          closeAdmissionForm();
          renderAdmissions();
          updateDashboardStats();
        }
      };
      
      performSaveAdmission();
    });
  }

  async function deleteAdmission(id) {
    if (supabase && typeof id === 'string' && id.length > 8) {
      try {
        const { error } = await supabase.from('admissions').delete().eq('id', id);
        if (error) throw error;
        showToast("Admission post deleted successfully.", "info");
        await loadDashboardData();
        return;
      } catch (err) {
        console.error('Delete admission failed:', err);
        showToast('Failed to delete admission post: ' + err.message, 'error');
      }
    }
    
    admissions = admissions.filter(a => a.id !== id);
    saveState('campuslink_admissions', admissions);
    renderAdmissions();
    updateDashboardStats();
    showToast("Admission post deleted successfully.", "info");
  }

  // --- Render Profile Settings Tab ---
  const profileForm = document.getElementById('dashboard-profile-form');
  
  function populateProfileForm() {
    if (!profileForm) return;
    
    document.getElementById('profile-school-name').value = profile.name || '';
    document.getElementById('profile-city').value = profile.city || '';
    document.getElementById('profile-state').value = profile.state || '';
    document.getElementById('profile-board').value = profile.board || 'CBSE';
    document.getElementById('profile-logo-char').value = profile.logoLetter || '';
    document.getElementById('profile-about').value = profile.about || '';

    // Update previews
    const logoPreview = document.getElementById('dashboard-logo-preview');
    if (logoPreview) {
      if (profile.logoUrl) {
        logoPreview.style.backgroundImage = `url('${profile.logoUrl}')`;
        logoPreview.textContent = '';
      } else {
        logoPreview.style.backgroundImage = '';
        logoPreview.textContent = profile.logoLetter || (profile.name ? profile.name.charAt(0).toUpperCase() : '');
      }
    }

    const coverPreview = document.getElementById('dashboard-cover-preview');
    if (coverPreview) {
      if (profile.coverUrl) {
        coverPreview.style.backgroundImage = `url('${profile.coverUrl}')`;
        coverPreview.textContent = '';
      } else {
        coverPreview.style.backgroundImage = '';
        coverPreview.textContent = 'No Banner';
      }
    }
  }

  // --- School Logo and Cover Upload Listeners ---
  const inputUploadLogo = document.getElementById('input-upload-logo');
  const inputUploadCover = document.getElementById('input-upload-cover');

  if (inputUploadLogo) {
    inputUploadLogo.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Size restriction (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        showToast('Logo image must be smaller than 2MB.', 'error');
        inputUploadLogo.value = '';
        return;
      }

      showToast('Uploading logo...', 'info');

      console.log('[UPLOAD-DEBUG] Logo upload started. supabase:', !!supabase, '| profile.id:', profile.id, '| profile.id.length:', profile.id?.length);
      if (supabase && profile.id && profile.id.length > 8) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${profile.id}/${fileName}`;
          console.log('[UPLOAD-DEBUG] Logo filePath:', filePath);

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('school-logos')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          console.log('[UPLOAD-DEBUG] Logo storage upload result:', { uploadData, uploadError });
          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from('school-logos').getPublicUrl(filePath);
          const publicUrl = urlData?.publicUrl;
          console.log('[UPLOAD-DEBUG] Logo publicUrl:', publicUrl);

          if (!publicUrl) throw new Error('Failed to get public URL');

          // Update database
          const { data: dbData, error: dbError } = await supabase.from('schools')
            .update({ logo_url: publicUrl })
            .eq('id', profile.id)
            .select();

          console.log('[UPLOAD-DEBUG] Logo DB update result:', { dbData, dbError, schoolId: profile.id });
          if (dbError) throw dbError;

          // Update local state
          profile.logoUrl = publicUrl;
          saveState('campuslink_profile', profile);

          // Update preview UI
          const logoPreview = document.getElementById('dashboard-logo-preview');
          if (logoPreview) {
            logoPreview.style.backgroundImage = `url('${publicUrl}')`;
            logoPreview.textContent = '';
          }

          showToast('School logo updated successfully!');
          // Dispatch event to update mobile components & dashboard header
          renderProfileHeader();
        } catch (err) {
          console.error('Logo upload failed:', err);
          showToast('Failed to upload logo: ' + err.message, 'error');
        }
      } else {
        // Local fallback (base64)
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Url = event.target.result;
          profile.logoUrl = base64Url;
          saveState('campuslink_profile', profile);

          const logoPreview = document.getElementById('dashboard-logo-preview');
          if (logoPreview) {
            logoPreview.style.backgroundImage = `url('${base64Url}')`;
            logoPreview.textContent = '';
          }

          showToast('School logo updated (local state)!');
          renderProfileHeader();
        };
        reader.readAsDataURL(file);
      }
      inputUploadLogo.value = '';
    });
  }

  if (inputUploadCover) {
    inputUploadCover.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Size restriction (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        showToast('Cover photo must be smaller than 2MB.', 'error');
        inputUploadCover.value = '';
        return;
      }

      showToast('Uploading cover banner...', 'info');

      console.log('[UPLOAD-DEBUG] Cover upload started. supabase:', !!supabase, '| profile.id:', profile.id, '| profile.id.length:', profile.id?.length);
      if (supabase && profile.id && profile.id.length > 8) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${profile.id}/${fileName}`;
          console.log('[UPLOAD-DEBUG] Cover filePath:', filePath);

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('school-covers')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          console.log('[UPLOAD-DEBUG] Cover storage upload result:', { uploadData, uploadError });
          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from('school-covers').getPublicUrl(filePath);
          const publicUrl = urlData?.publicUrl;
          console.log('[UPLOAD-DEBUG] Cover publicUrl:', publicUrl);

          if (!publicUrl) throw new Error('Failed to get public URL');

          // Update database
          const { data: dbData, error: dbError } = await supabase.from('schools')
            .update({ cover_url: publicUrl })
            .eq('id', profile.id)
            .select();

          console.log('[UPLOAD-DEBUG] Cover DB update result:', { dbData, dbError, schoolId: profile.id });
          if (dbError) throw dbError;

          // Update local state
          profile.coverUrl = publicUrl;
          saveState('campuslink_profile', profile);

          // Update preview UI
          const coverPreview = document.getElementById('dashboard-cover-preview');
          if (coverPreview) {
            coverPreview.style.backgroundImage = `url('${publicUrl}')`;
            coverPreview.textContent = '';
          }

          showToast('Cover banner updated successfully!');
          renderProfileHeader();
        } catch (err) {
          console.error('Cover upload failed:', err);
          showToast('Failed to upload cover banner: ' + err.message, 'error');
        }
      } else {
        // Local fallback (base64)
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Url = event.target.result;
          profile.coverUrl = base64Url;
          saveState('campuslink_profile', profile);

          const coverPreview = document.getElementById('dashboard-cover-preview');
          if (coverPreview) {
            coverPreview.style.backgroundImage = `url('${base64Url}')`;
            coverPreview.textContent = '';
          }

          showToast('Cover banner updated (local state)!');
          renderProfileHeader();
        };
        reader.readAsDataURL(file);
      }
      inputUploadCover.value = '';
    });
  }

  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('profile-school-name').value.trim();
      const city = document.getElementById('profile-city').value.trim();
      const state = document.getElementById('profile-state').value.trim();
      const board = document.getElementById('profile-board').value;
      const logoLetter = document.getElementById('profile-logo-char').value.trim().toUpperCase();
      const about = document.getElementById('profile-about').value.trim();

      if (supabase && profile.id && profile.id.length > 8) {
        try {
          const { error } = await supabase.from('schools').update({
            name,
            city,
            state,
            board,
            logo_letter: logoLetter,
            about,
            logo_url: profile.logoUrl || null,
            cover_url: profile.coverUrl || null
          }).eq('id', profile.id);
          
          if (error) throw error;
          showToast("School profile settings updated!");
          await loadDashboardData();
        } catch (err) {
          console.error('Supabase profile update failed:', err);
          showToast('Failed to update profile in database: ' + err.message, 'error');
        }
      } else {
        const oldName = profile.name;
        // Update school profile while preserving logo/cover URLs
        profile = {
          id: profile.id,
          name,
          city,
          state,
          board,
          logoLetter,
          logoUrl: profile.logoUrl || '',
          coverUrl: profile.coverUrl || '',
          about
        };
        saveState('campuslink_profile', profile);

        // Cascade school name change to user's events and admissions
        events = events.map(evt => {
          if (evt.school === oldName) {
            return { ...evt, school: name };
          }
          return evt;
        });
        saveState('campuslink_events', events);

        admissions = admissions.map(adm => {
          if (adm.schoolName === oldName) {
            return { ...adm, schoolName: name, board, city };
          }
          return adm;
        });
        saveState('campuslink_admissions', admissions);

        renderProfileHeader();
        updateDashboardStats();
        renderEvents();
        renderAdmissions();
        showToast("School profile settings updated!");
      }
    });
  }

  // --- Render Admission Applications Received ---
  const appsTbody = document.getElementById('applications-tbody');
  function renderApplications() {
    if (!appsTbody) return;
    appsTbody.innerHTML = '';

    const myApps = admissionApplications.filter(app => {
      // If school admin, profile.id holds the school id
      if (profile && profile.id !== 'super-admin-global') {
        return String(app.school_id) === String(profile.id);
      }
      return true;
    });

    if (myApps.length === 0) {
      appsTbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">
            No admission applications received yet.
          </td>
        </tr>
      `;
      return;
    }

    // Sort: pending first
    const sortedApps = [...myApps].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return 0;
    });

    sortedApps.forEach(app => {
      const tr = document.createElement('tr');
      
      let statusClass = 'status-pending';
      if (app.status === 'approved') statusClass = 'status-approved';
      if (app.status === 'rejected') statusClass = 'status-rejected';

      let actionsHtml = '';
      if (app.status === 'pending') {
        actionsHtml = `
          <div class="btn-action-group">
            <button class="btn-action btn-approve-app" data-id="${app.id}">Approve</button>
            <button class="btn-action btn-reject-app" data-id="${app.id}">Reject</button>
          </div>
        `;
      } else {
        actionsHtml = `<span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Processed</span>`;
      }

      const dateStr = app.created_at ? new Date(app.created_at).toLocaleDateString() : '-';

      tr.innerHTML = `
        <td style="font-weight: 600; color: var(--dark-bg);">${app.student_name}</td>
        <td>${app.parent_name}</td>
        <td>${app.grade_applied}</td>
        <td>${app.email}</td>
        <td>${app.phone}</td>
        <td>${dateStr}</td>
        <td>
          <span class="badge-status ${statusClass}">${app.status}</span>
        </td>
        <td>${actionsHtml}</td>
      `;
      appsTbody.appendChild(tr);
    });

    // Attach Action Listeners
    appsTbody.querySelectorAll('.btn-approve-app').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const appId = e.target.getAttribute('data-id');
        updateApplicationStatus(appId, 'approved');
      });
    });

    appsTbody.querySelectorAll('.btn-reject-app').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const appId = e.target.getAttribute('data-id');
        updateApplicationStatus(appId, 'rejected');
      });
    });
  }

  async function updateApplicationStatus(id, newStatus) {
    showToast('Updating status...', 'info');

    // 1. Update in Supabase if uuid
    if (supabase && String(id).length > 8) {
      try {
        const { error } = await supabase
          .from('admission_applications')
          .update({ status: newStatus })
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.warn('Failed to update status in Supabase:', err);
      }
    }

    // 2. Update in LocalStorage fallback
    admissionApplications = admissionApplications.map(app => {
      if (String(app.id) === String(id)) {
        return { ...app, status: newStatus };
      }
      return app;
    });

    saveState('campuslink_admission_applications', admissionApplications);
    renderApplications();
    showToast(`Application successfully ${newStatus}!`, newStatus === 'approved' ? 'success' : 'info');
  }

  // --- Render Contact Requests Table ---
  const contactRequestsTbody = document.getElementById('contact-requests-tbody');
  function renderContactRequests() {
    if (!contactRequestsTbody) return;
    contactRequestsTbody.innerHTML = '';

    if (contactRequests.length === 0) {
      contactRequestsTbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No contact requests received yet.
          </td>
        </tr>
      `;
      return;
    }

    contactRequests.forEach(req => {
      const tr = document.createElement('tr');
      const senderName = req.initiator ? req.initiator.full_name : 'Anonymous User';
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

      let actionsHtml = '';
      if (req.status === 'pending') {
        actionsHtml = `
          <div class="btn-action-group">
            <button class="btn-action btn-approve btn-accept-contact" data-id="${req.id}">Accept</button>
            <button class="btn-action btn-reject btn-ignore-contact" data-id="${req.id}">Ignore</button>
          </div>
        `;
      } else if (req.status === 'accepted') {
        actionsHtml = `
          <button class="btn btn-primary btn-reply-contact" data-id="${req.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm);">Reply / Chat</button>
        `;
      } else {
        actionsHtml = `<span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Ignored</span>`;
      }

      tr.innerHTML = `
        <td style="font-weight: 600; color: var(--dark-bg);">${senderName}</td>
        <td>${senderEmail}</td>
        <td><span class="badge-status status-approved" style="background-color: rgba(59, 130, 246, 0.1); color: var(--primary); font-weight:700;">${inquiryLabel}</span></td>
        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${rawMsg}">${rawMsg}</td>
        <td>${createdDate}</td>
        <td>
          <span class="badge-status ${statusClass}">${req.status}</span>
        </td>
        <td>${actionsHtml}</td>
      `;
      contactRequestsTbody.appendChild(tr);
    });

    // Attach listeners
    contactRequestsTbody.querySelectorAll('.btn-accept-contact').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        await updateContactRequestStatus(id, 'accepted');
      });
    });

    contactRequestsTbody.querySelectorAll('.btn-ignore-contact').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm('Are you sure you want to ignore this request?')) {
          await updateContactRequestStatus(id, 'ignored');
        }
      });
    });

    contactRequestsTbody.querySelectorAll('.btn-reply-contact').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        window.location.href = `messaging.html?chat_id=${id}`;
      });
    });
  }

  async function updateContactRequestStatus(id, newStatus) {
    showToast(`Updating request status...`, 'info');
    
    // 1. Update in Supabase
    if (supabase && !id.startsWith('mock-')) {
      try {
        const { error } = await supabase
          .from('conversations')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', id);
        
        if (error) throw error;
      } catch (err) {
        console.warn('Failed to update request status in Supabase:', err);
      }
    }

    // 2. Update local state
    contactRequests = contactRequests.map(req => {
      if (req.id === id) {
        return { ...req, status: newStatus };
      }
      return req;
    });
    saveState('campuslink_contact_requests', contactRequests);
    renderContactRequests();
    showToast(`Request successfully ${newStatus === 'accepted' ? 'accepted' : 'ignored'}!`, newStatus === 'accepted' ? 'success' : 'info');
  }

  // Bind change listeners to class selection checkboxes
  document.querySelectorAll('input[name="admission_classes"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const checkedCbs = document.querySelectorAll('input[name="admission_classes"]:checked');
      const selectedClasses = Array.from(checkedCbs).map(c => c.value);
      document.getElementById('admission-classes').value = selectedClasses.join(', ');
    });
  });

  // --- Mobile Dashboard Cards Event Listeners ---
  const mobileCards = document.querySelectorAll('.mobile-dash-card[data-tab]');
  mobileCards.forEach(card => {
    card.addEventListener('click', () => {
      const tabTarget = card.getAttribute('data-tab');
      // Find the corresponding navigation link and click it to switch tabs
      const desktopNavLink = document.querySelector(`.dashboard-layout .dashboard-nav-link[data-tab="${tabTarget}"]`);
      if (desktopNavLink) {
        desktopNavLink.click();
      }
      
      // Also update the active class on mobile sidebar drawer links
      const mobileNavLinks = document.querySelectorAll('.mobile-sidebar-nav .dashboard-nav-link');
      mobileNavLinks.forEach(l => {
        l.classList.remove('active');
        if (l.getAttribute('data-tab') === tabTarget) {
          l.classList.add('active');
        }
      });
    });
  });

  // ============================================================
  // COMMUNITY MEMBERS MODULE
  // ============================================================
  let communityMembers = getStoredData('campuslink_community_members', []);
  let cmFilterRole = 'all';
  let selectedCandidateId = null;

  const cmTbody = document.getElementById('community-members-tbody');
  const addMemberModal = document.getElementById('add-member-modal');
  const memberCandidatesList = document.getElementById('member-candidates-list');
  const memberRoleSelector = document.getElementById('member-role-selector');
  const memberRoleSelect = document.getElementById('member-role-select');
  const memberSearchInput = document.getElementById('member-search-input');
  const btnConfirmAddMember = document.getElementById('btn-confirm-add-member');

  // Role badge color map
  const ROLE_COLORS = {
    student: { bg: '#EFF6FF', color: '#2563EB', border: 'rgba(37, 99, 235, 0.15)' },
    teacher: { bg: '#F0FDF4', color: '#16A34A', border: 'rgba(22, 163, 74, 0.15)' },
    alumni: { bg: '#FFF7ED', color: '#EA580C', border: 'rgba(234, 88, 12, 0.15)' },
    staff: { bg: '#F5F3FF', color: '#7C3AED', border: 'rgba(124, 58, 237, 0.15)' },
    faculty: { bg: '#ECFDF5', color: '#059669', border: 'rgba(5, 150, 105, 0.15)' },
    counselor: { bg: '#FEF2F2', color: '#DC2626', border: 'rgba(220, 38, 38, 0.15)' }
  };

  function getRoleBadgeHtml(role) {
    const c = ROLE_COLORS[role] || ROLE_COLORS.student;
    return `<span style="display:inline-block; padding:3px 10px; border-radius:4px; font-size:0.75rem; font-weight:700; text-transform:capitalize; background:${c.bg}; color:${c.color}; border:1.5px solid ${c.border};">${role}</span>`;
  }

  // Load community members from Supabase
  async function loadCommunityMembers() {
    if (!supabase || !profile || !profile.id) return;
    const currentSchool = profile;
    try {
      // 1. Fetch school members
      const { data: members, error: memError } = await supabase
        .from('school_members')
        .select(`
          id, role, assigned_at,
          user:profiles!user_id(id, full_name, avatar_url, user_type, class, is_verified, school_id, username)
        `)
        .eq('school_id', profile.id);

      if (memError) throw memError;

      // 2. Fetch accepted conversations (connections)
      const { data: connections, error: connError } = await supabase
        .from('conversations')
        .select(`
          id,
          status,
          created_at,
          user:profiles!initiator_id(id, full_name, avatar_url, user_type, class, is_verified, school_id, username)
        `)
        .eq('school_id', profile.id)
        .eq('status', 'accepted');

      if (connError) throw connError;

      // Report if the query returns empty
      if (!connections || connections.length === 0) {
        console.warn("Failing Query: select id, status, created_at, user:profiles!initiator_id(...) from conversations where school_id = '" + profile.id + "' and status = 'accepted'");
      }

      // Map school members by user_id
      const memberMap = {};
      if (members) {
        members.forEach(m => {
          if (m.user && m.user.id) {
            memberMap[m.user.id] = m;
          }
        });
      }

      const combined = [];
      const studentsList = [];
      const seenUserIds = new Set();

      // Process accepted connections
      if (connections) {
        connections.forEach(conn => {
          const user = conn.user;
          if (!user) return;

          // Prevent duplicate rows if a user has multiple accepted connections/conversations
          if (seenUserIds.has(user.id)) return;
          seenUserIds.add(user.id);

          // Check if there is an explicit member record
          const memberRecord = memberMap[user.id];
          let role = null;
          let memberId = 'temp-' + user.id;
          let assignedAt = conn.created_at;

          if (memberRecord) {
            role = memberRecord.role;
            memberId = memberRecord.id;
            assignedAt = memberRecord.assigned_at || conn.created_at;
          } else {
            // Apply automatic rules
            if (user.school_id === profile.id) {
              role = 'student';
            } else if (user.user_type === 'teacher') {
              role = 'teacher';
            } else if (user.user_type === 'alumni') {
              role = 'alumni';
            } else if (user.user_type === 'staff') {
              role = 'staff';
            } else if (user.user_type === 'faculty') {
              role = 'faculty';
            } else if (user.user_type === 'counselor') {
              role = 'counselor';
            }
          }

          // If a valid role is found, add to combined list
          if (role) {
            const memberObj = {
              id: memberId,
              role: role,
              assigned_at: assignedAt,
              user: user
            };
            combined.push(memberObj);

            if (role === 'student') {
              studentsList.push(memberObj);
            }
          }
        });
      }

      communityMembers = combined;
      saveState('campuslink_community_members', communityMembers);

      // Debug logs exactly as requested
      const students = studentsList;
      console.log("School ID:", currentSchool.id);
      console.log("Accepted connections:", connections);
      console.log("Students:", students);

    } catch (err) {
      console.warn('Failed to load community members, loading from local fallback:', err.message);
      communityMembers = getStoredData('campuslink_community_members', []);
    }
    renderCommunityMembers();
  }

  // Render community members table
  function renderCommunityMembers() {
    if (!cmTbody) return;
    cmTbody.innerHTML = '';

    const filtered = cmFilterRole === 'all'
      ? communityMembers
      : communityMembers.filter(m => m.role === cmFilterRole);

    if (filtered.length === 0) {
      cmTbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 40px; color: var(--text-muted);">
            ${communityMembers.length === 0
              ? 'No community members assigned yet. Click <strong>+ Add Member</strong> to get started.'
              : 'No members found for the selected role filter.'}
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach(member => {
      const u = member.user || {};
      const name = u.full_name || 'Unknown';
      const initial = name.charAt(0).toUpperCase();
      const avatarHtml = u.avatar_url
        ? `<div style="width:36px;height:36px;border-radius:50%;background-image:url(${u.avatar_url});background-size:cover;background-position:center;flex-shrink:0;border:1px solid rgba(0,0,0,0.05);"></div>`
        : `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#EBF5FF,#DBEAFE);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--primary);flex-shrink:0;font-size:0.85rem;">${initial}</div>`;
      const dateStr = member.assigned_at ? new Date(member.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            ${avatarHtml}
            <div>
              <div style="font-weight:600;color:var(--dark-bg);font-size:0.88rem;">${name}</div>
              ${u.username ? `<div style="font-size:0.75rem;color:var(--text-muted);font-weight:400;margin-top:1px;">@${u.username}</div>` : ''}
              <div style="font-size:0.75rem;color:var(--text-muted);text-transform:capitalize;">${u.user_type || 'Member'}${u.class ? ' • ' + u.class : ''}</div>
            </div>
          </div>
        </td>
        <td>${getRoleBadgeHtml(member.role)}</td>
        <td style="font-size:0.85rem;color:var(--text-muted);">${dateStr}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <select class="cm-change-role-select" data-member-id="${member.id}" data-user-id="${u.id || ''}" style="padding:5px 8px;font-size:0.75rem;border:1px solid var(--border-color);border-radius:4px;outline:none;cursor:pointer;">
              <option value="student" ${member.role==='student'?'selected':''}>Student</option>
              <option value="teacher" ${member.role==='teacher'?'selected':''}>Teacher</option>
              <option value="alumni" ${member.role==='alumni'?'selected':''}>Alumni</option>
              <option value="staff" ${member.role==='staff'?'selected':''}>Staff</option>
              <option value="faculty" ${member.role==='faculty'?'selected':''}>Faculty</option>
              <option value="counselor" ${member.role==='counselor'?'selected':''}>Counselor</option>
            </select>
            <button class="btn-action btn-reject cm-remove-btn" data-member-id="${member.id}" data-user-id="${u.id || ''}" style="padding:5px 10px;font-size:0.72rem;">Remove</button>
          </div>
        </td>
      `;
      cmTbody.appendChild(tr);
    });

    // Attach change-role listeners
    cmTbody.querySelectorAll('.cm-change-role-select').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        const memberId = e.target.dataset.memberId;
        const userId = e.target.dataset.userId;
        const newRole = e.target.value;
        await changeRole(memberId, newRole, userId);
      });
    });

    // Attach remove listeners
    cmTbody.querySelectorAll('.cm-remove-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const memberId = e.target.dataset.memberId;
        const userId = e.target.dataset.userId;
        if (confirm('Remove this member from your school community?')) {
          await removeMember(memberId, userId);
        }
      });
    });
  }

  // Change member role
  async function changeRole(memberId, newRole, userId = null) {
    if (!supabase) return;
    try {
      let error = null;
      if (memberId && memberId.startsWith('temp-')) {
        const uId = userId || memberId.replace('temp-', '');
        const { error: err } = await supabase
          .from('school_members')
          .upsert({
            school_id: profile.id,
            user_id: uId,
            role: newRole,
            assigned_by: session?.user?.id
          }, { onConflict: 'school_id,user_id' });
        error = err;
      } else {
        const { error: err } = await supabase
          .from('school_members')
          .update({ role: newRole })
          .eq('id', memberId);
        error = err;
      }
      if (error) throw error;
      showToast(`Role updated to ${newRole}!`);
      await loadCommunityMembers();
    } catch (err) {
      console.error('Failed to change role:', err);
      showToast('Failed to update role: ' + err.message, 'error');
    }
  }

  // Remove member
  async function removeMember(memberId, userId = null) {
    if (!supabase) return;
    try {
      let error = null;
      if (memberId && memberId.startsWith('temp-')) {
        const uId = userId || memberId.replace('temp-', '');
        const { error: convErr } = await supabase
          .from('conversations')
          .update({ status: 'ignored' })
          .eq('school_id', profile.id)
          .eq('initiator_id', uId)
          .eq('status', 'accepted');
        error = convErr;
      } else {
        const { data: memberData, error: getErr } = await supabase
          .from('school_members')
          .select('user_id')
          .eq('id', memberId)
          .maybeSingle();

        if (!getErr && memberData) {
          await supabase
            .from('conversations')
            .update({ status: 'ignored' })
            .eq('school_id', profile.id)
            .eq('initiator_id', memberData.user_id)
            .eq('status', 'accepted');
        }

        const { error: delErr } = await supabase
          .from('school_members')
          .delete()
          .eq('id', memberId);
        error = delErr;
      }
      if (error) throw error;
      showToast('Member removed successfully.');
      await loadCommunityMembers();
    } catch (err) {
      console.error('Failed to remove member:', err);
      showToast('Failed to remove member: ' + err.message, 'error');
    }
  }

  // Filter buttons
  document.querySelectorAll('.cm-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cm-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      cmFilterRole = btn.dataset.role;
      renderCommunityMembers();
    });
  });

  // --- Add Member Modal ---
  const btnAddMember = document.getElementById('btn-add-member');
  if (btnAddMember) {
    btnAddMember.addEventListener('click', () => {
      console.log("Add Member clicked");
      openAddMemberModal();
    });
  }
  document.getElementById('close-add-member-modal')?.addEventListener('click', closeAddMemberModal);
  document.getElementById('btn-cancel-add-member')?.addEventListener('click', closeAddMemberModal);
  if (addMemberModal) {
    addMemberModal.addEventListener('click', (e) => {
      if (e.target === addMemberModal) closeAddMemberModal();
    });
  }

  async function openAddMemberModal() {
    if (!addMemberModal) return;
    selectedCandidateId = null;
    if (memberRoleSelector) memberRoleSelector.style.display = 'none';
    if (memberRoleSelect) memberRoleSelect.value = '';
    if (btnConfirmAddMember) btnConfirmAddMember.disabled = true;
    if (memberSearchInput) memberSearchInput.value = '';
    addMemberModal.style.display = 'flex';
    addMemberModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    await loadMemberCandidates();
  }

  function closeAddMemberModal() {
    if (addMemberModal) {
      addMemberModal.classList.remove('active');
      addMemberModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }

  // Load users who joined this school but are NOT already members
  async function loadMemberCandidates(searchQuery = '') {
    if (!memberCandidatesList) return;
    memberCandidatesList.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px 0;font-size:0.88rem;">Loading connections...</p>';

    try {
      const currentUserId = session?.user?.id;
      let explicitUserIds = [];

      // 1. Try to get existing school members from Supabase
      if (supabase && profile?.id) {
        try {
          const { data: explicitMembers, error: extError } = await supabase
            .from('school_members')
            .select('user_id')
            .eq('school_id', profile.id);

          if (!extError && explicitMembers) {
            explicitUserIds = explicitMembers.map(m => m.user_id);
          }
        } catch (e) {
          console.warn('Failed to fetch explicit school members from Supabase:', e);
        }
      }

      // Query Sources
      let connectionUsers = [];
      let schoolRelationshipUsers = [];
      let schoolLinkedStudents = [];

      if (supabase && profile?.id && currentUserId) {
        // Source A: User-to-User Connections from connections table
        try {
          const { data: conns, error: connErr } = await supabase
            .from('connections')
            .select(`
              requester:profiles!requester_id(id, full_name, avatar_url, user_type, class, school_id, platform_role, username),
              receiver:profiles!receiver_id(id, full_name, avatar_url, user_type, class, school_id, platform_role, username)
            `)
            .eq('status', 'accepted')
            .or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

          if (!connErr && conns) {
            conns.forEach(c => {
              const other = (c.requester && c.requester.id === currentUserId) ? c.receiver : c.requester;
              if (other && other.id) {
                connectionUsers.push(other);
              }
            });
          }
        } catch (e) {
          console.warn('Failed to query connections table:', e);
        }

        // Source B: Accepted School Conversations from conversations table
        try {
          const { data: convs, error: convErr } = await supabase
            .from('conversations')
            .select(`
              initiator:profiles!initiator_id(id, full_name, avatar_url, user_type, class, school_id, platform_role, username)
            `)
            .eq('school_id', profile.id)
            .eq('status', 'accepted');

          if (!convErr && convs) {
            convs.forEach(c => {
              if (c.initiator && c.initiator.id) {
                schoolRelationshipUsers.push(c.initiator);
              }
            });
          }
        } catch (e) {
          console.warn('Failed to query accepted school relationships:', e);
        }

        // Source C: Students linked to the school in profiles table
        try {
          const { data: students, error: studErr } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, user_type, class, school_id, platform_role, username')
            .eq('school_id', profile.id)
            .eq('user_type', 'student');

          if (!studErr && students) {
            schoolLinkedStudents = students;
          }
        } catch (e) {
          console.warn('Failed to query school-linked students:', e);
        }
      }

      // Merge and deduplicate candidates by user ID
      const candidateMap = new Map();

      schoolRelationshipUsers.forEach(u => candidateMap.set(u.id, u));
      connectionUsers.forEach(u => candidateMap.set(u.id, u));
      schoolLinkedStudents.forEach(u => candidateMap.set(u.id, u));

      // Local storage fallback if no candidates fetched from Supabase
      if (candidateMap.size === 0) {
        const localRequests = contactRequests || [];
        localRequests.forEach(req => {
          if (req.status === 'accepted' && req.initiator) {
            const init = req.initiator;
            const userId = init.id || req.initiator_id;
            if (userId) {
              candidateMap.set(userId, {
                id: userId,
                full_name: init.full_name || init.name || 'Connection',
                avatar_url: init.avatar_url,
                user_type: init.user_type || 'user',
                class: init.class,
                school_id: init.school_id,
                platform_role: init.platform_role || 'user',
                username: init.username
              });
            }
          }
        });
      }

      // Filter candidates based on exclusions
      let candidates = Array.from(candidateMap.values()).filter(p => {
        if (!p || !p.id) return false;
        
        // Exclude current logged in user
        if (p.id === currentUserId) return false;
        
        // Exclude school owner/admin by ID
        if (profile?.admin_user_id && p.id === profile.admin_user_id) return false;
        
        // Exclude school representative
        if (p.user_type === 'school_representative') return false;
        
        // Exclude school owner/admin by roles
        if (p.platform_role === 'school_admin' || p.platform_role === 'super_admin') return false;
        
        // Exclude users who are already members
        if (explicitUserIds.includes(p.id)) return false;

        return true;
      });

      // Filter by search query in-memory if provided
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase().trim();
        const cleanTerm = term.startsWith('@') ? term.slice(1) : term;
        candidates = candidates.filter(p => 
          (p.full_name && p.full_name.toLowerCase().includes(term)) ||
          (p.username && p.username.toLowerCase().includes(cleanTerm))
        );
      }

      if (candidates.length === 0) {
        memberCandidatesList.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px 0;font-size:0.88rem;">No eligible connections found.</p>';
        return;
      }

      memberCandidatesList.innerHTML = '';
      candidates.forEach(p => {
        const initial = (p.full_name || '?').charAt(0).toUpperCase();
        const avatarHtml = p.avatar_url
          ? `<div style="width:36px;height:36px;border-radius:50%;background-image:url(${p.avatar_url});background-size:cover;background-position:center;flex-shrink:0;border:1px solid rgba(0,0,0,0.05);"></div>`
          : `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#EBF5FF,#DBEAFE);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--primary);flex-shrink:0;font-size:0.85rem;">${initial}</div>`;

        const item = document.createElement('div');
        item.className = 'cm-candidate-item';
        item.dataset.userId = p.id;
        item.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:background 0.15s ease;border:1.5px solid transparent;';
        item.innerHTML = `
          ${avatarHtml}
          <div style="flex:1;">
            <div style="font-weight:600;font-size:0.88rem;color:var(--dark-bg);">${p.full_name}</div>
            ${p.username ? `<div style="font-size:0.75rem;color:var(--text-muted);font-weight:400;margin-top:1px;">@${p.username}</div>` : ''}
            <div style="font-size:0.75rem;color:var(--text-muted);text-transform:capitalize;">${p.user_type || 'Member'}${p.class ? ' • ' + p.class : ''}</div>
          </div>
        `;

        item.addEventListener('click', () => {
          // Deselect others
          memberCandidatesList.querySelectorAll('.cm-candidate-item').forEach(el => {
            el.style.borderColor = 'transparent';
            el.style.backgroundColor = '';
          });
          // Select this
          item.style.borderColor = 'var(--primary)';
          item.style.backgroundColor = 'var(--primary-light)';
          selectedCandidateId = p.id;

          // Update selected candidate details in role selector
          const nameEl = document.getElementById('selected-candidate-name');
          const statusEl = document.getElementById('selected-candidate-status');
          if (nameEl) nameEl.textContent = p.full_name || 'Selected User';
          if (statusEl) statusEl.textContent = 'Current status: ' + (p.user_type || 'Member');

          // Handle role options based on user type
          if (p.user_type === 'student') {
            // Students remain automatic - populate and select Student
            memberRoleSelect.innerHTML = `<option value="student" selected>Student (Automatic)</option>`;
            memberRoleSelect.disabled = true;
          } else {
            // For others, allow Teacher, Alumni, Staff, Faculty, Counselor
            memberRoleSelect.innerHTML = `
              <option value="">Select Role...</option>
              <option value="teacher">Teacher</option>
              <option value="alumni">Alumni</option>
              <option value="staff">Staff</option>
              <option value="faculty">Faculty</option>
              <option value="counselor">Counselor</option>
            `;
            memberRoleSelect.disabled = false;
          }

          // Show role selector
          if (memberRoleSelector) memberRoleSelector.style.display = 'block';
          updateConfirmBtn();
        });

        item.addEventListener('mouseenter', () => { if (item.style.borderColor !== 'var(--primary)') item.style.backgroundColor = 'var(--light-bg)'; });
        item.addEventListener('mouseleave', () => { if (item.style.borderColor !== 'var(--primary)') item.style.backgroundColor = ''; });

        memberCandidatesList.appendChild(item);
      });
    } catch (err) {
      console.error('Failed to load candidates:', err);
      memberCandidatesList.innerHTML = '<p style="text-align:center;color:#EF4444;padding:20px 0;font-size:0.88rem;">Error loading connections.</p>';
    }
  }

  // Search filter
  if (memberSearchInput) {
    let searchTimeout;
    memberSearchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => loadMemberCandidates(memberSearchInput.value), 300);
    });
  }

  // Role select change
  if (memberRoleSelect) {
    memberRoleSelect.addEventListener('change', updateConfirmBtn);
  }

  function updateConfirmBtn() {
    if (btnConfirmAddMember) {
      btnConfirmAddMember.disabled = !(selectedCandidateId && memberRoleSelect?.value);
    }
  }

  // Confirm add member
  if (btnConfirmAddMember) {
    btnConfirmAddMember.addEventListener('click', async () => {
      if (!selectedCandidateId || !memberRoleSelect?.value) return;
      btnConfirmAddMember.disabled = true;
      btnConfirmAddMember.textContent = 'Assigning...';
      try {
        if (supabase && profile?.id && session?.user?.id) {
          try {
            const { error } = await supabase
              .from('school_members')
              .insert({
                school_id: profile.id,
                user_id: selectedCandidateId,
                role: memberRoleSelect.value,
                assigned_by: session.user.id
              });
            if (error) throw error;
          } catch (dbErr) {
            console.warn('Database save failed, saving to local fallback:', dbErr);
          }
        }

        // Local fallback / sync
        const candidateItem = memberCandidatesList.querySelector(`.cm-candidate-item[data-user-id="${selectedCandidateId}"]`);
        const candidateName = candidateItem ? candidateItem.querySelector('div > div:first-child').textContent : 'New Member';
        const candidateUserType = candidateItem ? candidateItem.querySelector('div > div:last-child').textContent.split(' • ')[0] : 'user';

        const existingIdx = communityMembers.findIndex(m => m.user?.id === selectedCandidateId);
        const newMember = {
          id: existingIdx >= 0 ? communityMembers[existingIdx].id : 'local-' + Date.now(),
          role: memberRoleSelect.value,
          assigned_at: new Date().toISOString(),
          user: {
            id: selectedCandidateId,
            full_name: candidateName,
            user_type: candidateUserType,
            school_id: profile.id
          }
        };

        if (existingIdx >= 0) {
          communityMembers[existingIdx] = newMember;
        } else {
          communityMembers.push(newMember);
        }
        saveState('campuslink_community_members', communityMembers);
        showToast(`Member assigned as ${memberRoleSelect.value}!`);
        closeAddMemberModal();
        renderCommunityMembers();
      } catch (err) {
        console.error('Failed to add member:', err);
        showToast('Failed to add member: ' + err.message, 'error');
      } finally {
        btnConfirmAddMember.disabled = false;
        btnConfirmAddMember.textContent = 'Assign Role';
      }
    });
  }

  // Generic modal close handler for all modals with .close-modal-trigger class
  document.querySelectorAll('.close-modal-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const modal = trigger.closest('.modal-overlay');
      if (modal) modal.style.display = 'none';
    });
  });

  // --- Init Dashboard Rendering ---
  loadDashboardData().then(() => {
    // Check URL parameter to switch tab automatically on page load
    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get('tab');
    if (initialTab) {
      const targetLink = document.querySelector(`.dashboard-nav-link[data-tab="${initialTab}"]`);
      if (targetLink) {
        targetLink.click();
      }
    }
  });

});
