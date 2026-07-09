document.addEventListener('DOMContentLoaded', async () => {
  console.log(window.location.pathname);
  console.log(document.body.className);

  // ── Auth Guard & Supabase Setup ────────────────────────
  const authOverlay = document.getElementById('auth-loading-overlay');
  const auth = window.CampusLink && window.CampusLink.auth;
  const supabase = window.CampusLink && window.CampusLink.supabase;
  let session = null;

  // Enforce body hidden status until auth checks successfully pass
  document.body.classList.remove('auth-passed');

  if (!auth || !supabase) {
    // Fail-safe redirect if security scripts failed to load
    console.error('[Security Guard] Critical security modules not found. Redirecting to login.');
    window.location.href = 'login.html';
    return;
  }

  try {
    session = await auth.getSession();
    if (!session || !session.user) {
      console.warn('[Security Guard] Unauthenticated access attempt. Redirecting to login.');
      window.location.href = 'login.html?redirect=dashboard.html';
      return;
    }

    // Resolve user role
    const role = await auth.getUserRole();
    if (role === 'super_admin') {
      // Super admins belong to the Super Admin Console
      window.location.href = 'admin/index.html';
      return;
    } else if (role !== 'school_admin') {
      console.warn('[Security Guard] Unauthorized role access attempt:', role);
      alert('Access Denied: You do not have permission to access the School Admin Dashboard.');
      window.location.href = 'index.html';
      return;
    }

    // Verify school association for school_admin
    const school = await auth.getSchoolForUser(session.user.id);
    if (!school) {
      console.warn('[Security Guard] Administrator account has no associated school record.');
      alert('Access Denied: No school associated with this administrator account.');
      window.location.href = 'index.html';
      return;
    }

    if (school.institution_type && school.institution_type !== 'school') {
      window.location.href = 'college-dashboard.html';
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

    // Passed all authentication and authorization checks! Reveal page via flying transition.
    window.hideAuthOverlayTransition();
  } catch (err) {
    console.error('[Security Guard] Error during session/role validation:', err);
    window.location.href = 'login.html';
    return;
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
            // Trigger Classroom Management data load
            await loadClassroomManagementData();
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
    syncAcademicStateFromSupabase();
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
      if (tabTarget === 'contact-requests') {
        tabName = 'Student Management';
        if (typeof initStudentsTab === 'function') {
          initStudentsTab();
        }
      }
      if (tabTarget === 'community-members') tabName = 'Community Members';
      if (tabTarget === 'profile') tabName = 'School Profile Settings';
      if (tabTarget === 'teachers') {
        tabName = 'Teacher Management';
        if (typeof initTeachersTab === 'function') {
          initTeachersTab();
        }
      }
      if (tabTarget === 'academic') {
        tabName = 'Academic Management';
        if (typeof initAcademicTab === 'function') {
          initAcademicTab();
        }
      }
      if (tabTarget === 'classrooms') {
        tabName = 'Classroom Management';
        if (typeof initClassroomsTab === 'function') {
          initClassroomsTab();
        }
      }
      if (tabTarget === 'attendance') {
        tabName = 'Attendance Management';
        if (typeof initAttendanceTab === 'function') {
          initAttendanceTab();
        }
      }
      if (tabTarget === 'alumni') {
        tabName = 'Alumni Management';
        if (typeof initAlumniTab === 'function') {
          initAlumniTab();
        }
      }
    });
  });

  // --- Update Metric Statistics ---
  function updateDashboardStats() {
    const totalEvents = events.filter(e => e.school === profile.name).length;
    const totalRegistrations = registrations.length;
    const totalAdmissions = admissions.filter(a => a.schoolName === profile.name).length;
    
    // Determine if we are in live database mode
    const isLiveMode = window.CampusLink?.supabase && (localStorage.getItem('supabase.auth.token') || sessionStorage.getItem('sb-'));
    
    // Get actual student count from localStorage filtered by school_id
    let totalStudents = 0;
    try {
      const storedStus = localStorage.getItem('campuslink_students');
      if (storedStus) {
        const parsed = JSON.parse(storedStus);
        totalStudents = parsed.filter(s => s.schoolId === profile.id || s.school_id === profile.id).length;
      } else {
        totalStudents = isLiveMode ? 0 : 10;
      }
    } catch (e) {
      totalStudents = isLiveMode ? 0 : 10;
    }
    
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
            <span>🔗 <strong>Apply Link:</strong> ${adm.applyLink ? `<a href="${adm.applyLink}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); text-decoration: underline; font-weight: 600;">Link</a>` : 'Not Provided'}</span>
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

      const validator = window.CampusLink?.security?.validateImageFile;
      if (validator) {
        const err = await validator(file, 2 * 1024 * 1024);
        if (err) {
          showToast(err, 'error');
          inputUploadLogo.value = '';
          return;
        }
      }

      showToast('Uploading logo...', 'info');

      console.log('[UPLOAD-DEBUG] Logo upload started. supabase:', !!supabase, '| profile.id:', profile.id, '| profile.id.length:', profile.id?.length);
      if (supabase && profile.id && profile.id.length > 8) {
        try {
          const ext = file.name.split('.').pop().toLowerCase();
          const randomString = Math.random().toString(36).substring(2, 10);
          const fileName = `school_logo_${randomString}.${ext}`;
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

      const validator = window.CampusLink?.security?.validateImageFile;
      if (validator) {
        const err = await validator(file, 5 * 1024 * 1024); // 5MB limit
        if (err) {
          showToast(err, 'error');
          inputUploadCover.value = '';
          return;
        }
      }

      showToast('Uploading cover banner...', 'info');

      console.log('[UPLOAD-DEBUG] Cover upload started. supabase:', !!supabase, '| profile.id:', profile.id, '| profile.id.length:', profile.id?.length);
      if (supabase && profile.id && profile.id.length > 8) {
        try {
          const ext = file.name.split('.').pop().toLowerCase();
          const randomString = Math.random().toString(36).substring(2, 10);
          const fileName = `school_cover_${randomString}.${ext}`;
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

      const combined = [];
      const studentsList = [];
      const seenUserIds = new Set();

      // 1. Process explicit school members first
      if (members) {
        members.forEach(m => {
          if (!m.user || !m.user.id) return;
          seenUserIds.add(m.user.id);

          const memberObj = {
            id: m.id,
            role: m.role,
            assigned_at: m.assigned_at || new Date().toISOString(),
            user: m.user
          };
          combined.push(memberObj);

          if (m.role === 'student') {
            studentsList.push(memberObj);
          }
        });
      }

      // 2. Process accepted connections
      if (connections) {
        connections.forEach(conn => {
          const user = conn.user;
          if (!user) return;

          // Prevent duplicate rows if a user is already in school_members
          if (seenUserIds.has(user.id)) return;
          seenUserIds.add(user.id);

          let role = null;
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

          // If a valid role is found, add to combined list
          if (role) {
            const memberObj = {
              id: 'temp-' + user.id,
              role: role,
              assigned_at: conn.created_at,
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

  // ============================================================
  // ACADEMIC MANAGEMENT MODULE (PHASE 1)
  // ============================================================
  
  // Helper to load/save in-memory lists from/to localStorage
  function loadAcademicState(key, defaultVal) {
    const val = localStorage.getItem(key);
    if (val) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) {
          // Detect stale cached structure and refresh with new defaults
          if (key === 'campuslink_classes' && parsed.length > 0 && (!('classTeacher' in parsed[0]) || !('section' in parsed[0]))) {
            localStorage.setItem(key, JSON.stringify(defaultVal));
            return defaultVal;
          }
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse academic state for " + key, e);
      }
    }
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }

  function saveAcademicState(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // --- Normalized Mock Data ---
  const defaultYears = [
    { id: "ay_001", name: "2025–2026", startDate: "2025-04-01", endDate: "2026-03-31", status: "active", isCurrent: true },
    { id: "ay_002", name: "2024–2025", startDate: "2024-04-01", endDate: "2025-03-31", status: "inactive", isCurrent: false }
  ];

  const defaultClasses = [
    { id: "cls_001", name: "Class 9", displayOrder: 9, status: "active", academicYearId: "ay_001", section: "A", classTeacher: "John Doe" },
    { id: "cls_002", name: "Class 10", displayOrder: 10, status: "active", academicYearId: "ay_001", section: "B", classTeacher: "Sarah Smith" },
    { id: "cls_003", name: "Class 11", displayOrder: 11, status: "active", academicYearId: "ay_001", section: "A", classTeacher: "David Warner" },
    { id: "cls_004", name: "Class 12", displayOrder: 12, status: "active", academicYearId: "ay_001", section: "", classTeacher: "" }
  ];

  const defaultSubjects = [
    { id: "sub_001", name: "Mathematics", code: "MAT101", category: "core", status: "active", applicableClassIds: ["cls_001", "cls_002"] },
    { id: "sub_002", name: "English", code: "ENG101", category: "core", status: "active", applicableClassIds: ["cls_001", "cls_002", "cls_003"] },
    { id: "sub_003", name: "Science", code: "SCI101", category: "core", status: "active", applicableClassIds: ["cls_001", "cls_002"] },
    { id: "sub_004", name: "Computer Science", code: "CSC101", category: "elective", status: "active", applicableClassIds: ["cls_003", "cls_004"] },
    { id: "sub_005", name: "Islamic Studies", code: "ISL101", category: "optional", status: "inactive", applicableClassIds: ["cls_001"] }
  ];

  const allPlatformUsers = [
    { username: "ali.ahmad", fullName: "Ali Ahmad", email: "ali.ahmad@school.com", phone: "+91 9876543210", gender: "Male", department: "Mathematics", qualification: "M.Sc Mathematics", experience: 8 },
    { username: "priya.sharma", fullName: "Priya Sharma", email: "priya.sharma@school.com", phone: "+91 9876543211", gender: "Female", department: "English", qualification: "M.A English Literature", experience: 5 },
    { username: "amit.verma", fullName: "Amit Verma", email: "amit.verma@school.com", phone: "+91 9876543212", gender: "Male", department: "Science", qualification: "M.Sc Physics", experience: 12 },
    { username: "sneha.patel", fullName: "Sneha Patel", email: "sneha.patel@school.com", phone: "+91 9876543213", gender: "Female", department: "Computer Science", qualification: "B.Ed Computer Science", experience: 3 },
    { username: "rahul.singh", fullName: "Rahul Singh", email: "rahul.singh@school.com", phone: "+91 9876543214", gender: "Male", department: "Science", qualification: "M.Sc Chemistry", experience: 15 },
    { username: "john.watson", fullName: "John Watson", email: "john.watson@school.com", phone: "+91 9999999999", gender: "Male", department: "English", qualification: "Ph.D English", experience: 10 },
    { username: "sherlock.holmes", fullName: "Sherlock Holmes", email: "sherlock.holmes@school.com", phone: "+91 8888888888", gender: "Male", department: "Science", qualification: "Ph.D Chemistry", experience: 14 },
    { username: "jane.doe", fullName: "Jane Doe", email: "jane.doe@school.com", phone: "+91 7777777777", gender: "Female", department: "Arts", qualification: "B.FA", experience: 4 },
    { username: "ggg", fullName: "Tata", email: "tata@school.com", phone: "+91 9500000000", gender: "Male", department: "Science", qualification: "B.Ed", experience: 4 }
  ];

  const defaultTeachers = [
    {
      id: "tch_001",
      schoolId: "sch_001",
      username: "ali.ahmad",
      campuslinkId: "CL-TCH-0001",
      employeeId: "EMP-1001",
      fullName: "Ali Ahmad",
      email: "ali.ahmad@school.com",
      phone: "+91 9876543210",
      qualification: "M.Sc Mathematics",
      experience: 8,
      department: "Mathematics",
      gender: "Male",
      joiningDate: "2020-06-15",
      subjects: ["Mathematics", "Calculus"],
      classes: ["Class 9", "Class 10"],
      sections: ["A", "B"],
      isClassTeacher: true,
      status: "active",
      verificationStatus: "verified",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "tch_002",
      schoolId: "sch_001",
      username: "priya.sharma",
      campuslinkId: "CL-TCH-0002",
      employeeId: "EMP-1002",
      fullName: "Priya Sharma",
      email: "priya.sharma@school.com",
      phone: "+91 9876543211",
      qualification: "M.A English Literature",
      experience: 5,
      department: "English",
      gender: "Female",
      joiningDate: "2021-08-10",
      subjects: ["English", "Grammar"],
      classes: ["Class 9", "Class 11"],
      sections: ["A"],
      isClassTeacher: false,
      status: "active",
      verificationStatus: "verified",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "tch_003",
      schoolId: "sch_001",
      username: "amit.verma",
      campuslinkId: "CL-TCH-0003",
      employeeId: "EMP-1003",
      fullName: "Amit Verma",
      email: "amit.verma@school.com",
      phone: "+91 9876543212",
      qualification: "M.Sc Physics",
      experience: 12,
      department: "Science",
      gender: "Male",
      joiningDate: "2018-04-01",
      subjects: ["Physics", "General Science"],
      classes: ["Class 11", "Class 12"],
      sections: ["A", "B"],
      isClassTeacher: true,
      status: "active",
      verificationStatus: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "tch_004",
      schoolId: "sch_001",
      username: "sneha.patel",
      campuslinkId: "CL-TCH-0004",
      employeeId: "EMP-1004",
      fullName: "Sneha Patel",
      email: "sneha.patel@school.com",
      phone: "+91 9876543213",
      qualification: "B.Ed Computer Science",
      experience: 3,
      department: "Computer Science",
      gender: "Female",
      joiningDate: "2023-01-15",
      subjects: ["Computer Science", "Coding"],
      classes: ["Class 9", "Class 10"],
      sections: ["B"],
      isClassTeacher: false,
      status: "inactive",
      verificationStatus: "verified",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "tch_005",
      schoolId: "sch_001",
      username: "rahul.singh",
      campuslinkId: "CL-TCH-0005",
      employeeId: "EMP-1005",
      fullName: "Rahul Singh",
      email: "rahul.singh@school.com",
      phone: "+91 9876543214",
      qualification: "M.Sc Chemistry",
      experience: 15,
      department: "Science",
      gender: "Male",
      joiningDate: "2015-07-01",
      subjects: ["Chemistry"],
      classes: ["Class 11", "Class 12"],
      sections: ["A"],
      isClassTeacher: false,
      status: "suspended",
      verificationStatus: "verified",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // Determine if we are in live database mode
  const isLiveMode = window.CampusLink?.supabase && (localStorage.getItem('supabase.auth.token') || sessionStorage.getItem('sb-'));

  let academicYears = loadAcademicState('campuslink_academic_years', isLiveMode ? [] : defaultYears);
  let classes = loadAcademicState('campuslink_classes', isLiveMode ? [] : defaultClasses);
  let subjects = loadAcademicState('campuslink_subjects', isLiveMode ? [] : defaultSubjects);
  let teachers = loadAcademicState('campuslink_teachers', isLiveMode ? [] : defaultTeachers);

  // Sync Teachers from Supabase preserving all details
  async function syncTeachersFromSupabase() {
    if (!supabase || !profile || !profile.id || profile.id === 'super-admin-global') return;
    try {
      // 1. Fetch teachers
      const { data: dbTeachers, error: tErr } = await supabase
        .from('teachers')
        .select('*')
        .eq('school_id', profile.id);
        
      if (tErr) throw tErr;
      if (!dbTeachers) return;

      // 2. Fetch profiles to get user IDs / link matching username (strictly filtered by school_id)
      const { data: dbProfiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, username, full_name, email')
        .eq('school_id', profile.id)
        .eq('user_type', 'teacher');
        
      // 3. Fetch classrooms for the school (to map class teacher)
      const { data: dbClassrooms } = await supabase
        .from('classrooms')
        .select('*')
        .eq('school_id', profile.id);
        
      // 4. Fetch subject teachers for mapping subject assignments (only for classrooms in this school)
      const classroomIds = dbClassrooms ? dbClassrooms.map(c => c.id) : [];
      const { data: dbSubjectTeachers } = await supabase
        .from('classroom_subject_teachers')
        .select('*')
        .in('classroom_id', classroomIds.length > 0 ? classroomIds : ['00000000-0000-0000-0000-000000000000']);

      const mappedTeachers = dbTeachers.map(t => {
        const prof = dbProfiles ? dbProfiles.find(p => p.id === t.user_id || (p.username && p.username.toLowerCase() === t.username.toLowerCase())) : null;
        const profileId = prof ? prof.id : (t.user_id || t.id);

        // Find class teacher classrooms
        let isClassTeacher = false;
        let classTeacherClass = '';
        let classTeacherSection = '';
        
        if (dbClassrooms && profileId) {
          const classTeacherCr = dbClassrooms.find(cr => cr.class_teacher_id === profileId);
          if (classTeacherCr) {
            isClassTeacher = true;
            const cls = classes.find(c => c.id === classTeacherCr.class_id);
            classTeacherClass = cls ? cls.name : (classTeacherCr.grade || '');
            classTeacherSection = classTeacherCr.section_id || '';
          }
        }

        // Map assignments
        const assignments = [];
        const classesSet = new Set();
        const sectionsSet = new Set();
        const subjectsSet = new Set();

        if (dbSubjectTeachers && dbClassrooms && profileId) {
          dbSubjectTeachers.forEach(st => {
            if (st.teacher_id === profileId) {
              const cr = dbClassrooms.find(c => c.id === st.classroom_id);
              if (cr) {
                const cls = classes.find(c => c.id === cr.class_id);
                const className = cls ? cls.name : (cr.grade || '');
                const sectionName = cr.section_id || '';
                
                assignments.push({
                  class: className,
                  section: sectionName,
                  subject: st.subject
                });
                classesSet.add(className);
                if (sectionName) sectionsSet.add(sectionName);
                if (st.subject) subjectsSet.add(st.subject);
              }
            }
          });
        }

        return {
          id: profileId,
          schoolId: t.school_id,
          username: t.username,
          campuslinkId: t.employee_id ? 'CL-TCH-' + t.employee_id.replace(/\D/g, '') : 'CL-TCH-' + Math.floor(1000 + Math.random() * 9000),
          employeeId: t.employee_id || '',
          fullName: t.full_name || (prof ? prof.full_name : null) || t.username || 'Teacher',
          email: t.email || (prof ? prof.email : null) || '',
          phone: t.phone || '',
          qualification: t.qualification || '',
          experience: t.experience || 0,
          department: t.department || 'General',
          gender: t.gender || 'Male',
          joiningDate: t.joining_date || '',
          status: t.status || 'active',
          verificationStatus: t.verification_status || 'pending',
          isClassTeacher: isClassTeacher,
          classTeacherClass: classTeacherClass,
          classTeacherSection: classTeacherSection,
          assignments: assignments,
          classes: Array.from(classesSet),
          sections: Array.from(sectionsSet),
          subjects: Array.from(subjectsSet),
          createdAt: t.created_at || new Date().toISOString(),
          updatedAt: t.updated_at || new Date().toISOString()
        };
      });

      // Only replace local list if Supabase actually returned rows.
      // If 0 rows (e.g. RLS blocking admin read), keep existing local data.
      if (mappedTeachers.length > 0) {
        teachers = mappedTeachers;
        saveAcademicState('campuslink_teachers', teachers);
      }
    } catch (err) {
      console.warn("Error syncing teachers from Supabase:", err);
    }
  }

  // Sync Academic State from Supabase
  async function syncAcademicStateFromSupabase() {
    if (!supabase || !profile || !profile.id || profile.id === 'super-admin-global') return;
    try {
      // 1. Fetch academic years
      const { data: dbYears, error: yErr } = await supabase
        .from('academic_years')
        .select('*')
        .eq('school_id', profile.id);
        
      if (!yErr && dbYears) {
        academicYears = dbYears.map(y => ({
          id: y.id,
          name: y.name,
          startDate: y.start_date,
          endDate: y.end_date,
          status: y.status,
          isCurrent: y.is_current
        }));
        saveAcademicState('campuslink_academic_years', academicYears);
      }

      // 2. Fetch classes
      const { data: dbClasses, error: cErr } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', profile.id);
        
      if (!cErr && dbClasses) {
        // Fetch teacher profiles strictly belonging to this school
        const { data: dbTeachers, error: tErr } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('school_id', profile.id)
          .eq('user_type', 'teacher');
        
        const teacherMap = {};
        if (!tErr && dbTeachers) {
          dbTeachers.forEach(t => {
            teacherMap[t.id] = t.full_name;
          });
        }

        classes = dbClasses.map(c => ({
          id: c.id,
          name: c.name,
          displayOrder: c.display_order,
          status: c.status,
          academicYearId: c.academic_year_id,
          section: c.section || '',
          classTeacherId: c.class_teacher_id || '',
          classTeacher: c.class_teacher_id ? (teacherMap[c.class_teacher_id] || 'Unknown Teacher') : ''
        }));
        saveAcademicState('campuslink_classes', classes);
      }

      // Sync teachers after classes are loaded so class teacher details resolved correctly
      await syncTeachersFromSupabase();

      // 3. Fetch subjects and applicable subject_classes many-to-many relationship
      const { data: dbSubjects, error: sErr } = await supabase
        .from('subjects')
        .select('*')
        .eq('school_id', profile.id);

      if (!sErr && dbSubjects) {
        // Fetch class applicability mapping filtered by school classes
        const classIds = dbClasses.map(c => c.id);
        const { data: dbApplicability, error: aErr } = await supabase
          .from('subject_classes')
          .select('*')
          .in('class_id', classIds.length > 0 ? classIds : ['00000000-0000-0000-0000-000000000000']);

        const applicabilityMap = {};
        if (!aErr && dbApplicability) {
          dbApplicability.forEach(app => {
            if (!applicabilityMap[app.subject_id]) {
              applicabilityMap[app.subject_id] = [];
            }
            applicabilityMap[app.subject_id].push(app.class_id);
          });
        }

        subjects = dbSubjects.map(s => ({
          id: s.id,
          name: s.name,
          code: s.code,
          category: s.category,
          status: s.status,
          applicableClassIds: applicabilityMap[s.id] || []
        }));
        saveAcademicState('campuslink_subjects', subjects);
      }
      
      // Update UI
      populateAcademicDropdowns();
      renderActiveSubtabTable();
    } catch (err) {
      console.warn("Error syncing academic state from Supabase:", err);
    }
  }

  // Active sub-tab state ("years", "classes", "subjects")
  let activeAcademicSubtab = "years";
  let activeTeachersSubtab = "all";

  // --- Dropdown Population ---
  function populateAcademicDropdowns() {
    // 1. Populate academic year filters
    const filterClassYear = document.getElementById('filter-class-academic-year');
    const classYearSelect = document.getElementById('academic-class-year');
    
    if (filterClassYear) {
      filterClassYear.innerHTML = '<option value="all">All Academic Years</option>';
      academicYears.forEach(y => {
        filterClassYear.innerHTML += `<option value="${y.id}">${y.name}</option>`;
      });
    }
    if (classYearSelect) {
      classYearSelect.innerHTML = '';
      academicYears.forEach(y => {
        classYearSelect.innerHTML += `<option value="${y.id}">${y.name}</option>`;
      });
    }

    // Sort classes by displayOrder before populating dropdowns
    const sortedClasses = [...classes].sort((a, b) => a.displayOrder - b.displayOrder);

    // 3. Populate subject modal classes checkboxes
    const subjectClassesContainer = document.getElementById('subject-applicable-classes-container');
    if (subjectClassesContainer) {
      subjectClassesContainer.innerHTML = '';
      sortedClasses.forEach(c => {
        subjectClassesContainer.innerHTML += `
          <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer; user-select: none; margin-bottom: 2px;">
            <input type="checkbox" name="subject_classes" value="${c.id}" style="width: 14px; height: 14px; cursor: pointer; accent-color: var(--primary);">
            <span>${c.name}</span>
          </label>
        `;
      });
    }
  }

  // --- Render Tables ---
  function renderYearsTable() {
    const searchVal = document.getElementById('academic-search-input').value.toLowerCase().trim();
    const statusFilter = document.getElementById('filter-academic-year-status').value;
    const tbody = document.getElementById('years-tbody');
    const emptyState = document.getElementById('years-empty-state');
    const tableCard = tbody.closest('.dash-table-card');

    let filtered = academicYears.filter(y => {
      const matchSearch = y.name.toLowerCase().includes(searchVal);
      const matchStatus = statusFilter === 'all' || y.status === statusFilter;
      return matchSearch && matchStatus;
    });

    tbody.innerHTML = '';
    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      tbody.closest('table').style.display = 'none';
      tableCard.querySelector('.academic-pagination-placeholder').style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      tbody.closest('table').style.display = 'table';
      tableCard.querySelector('.academic-pagination-placeholder').style.display = 'flex';
      
      // Update pagination counts
      tableCard.querySelector('.range-start').textContent = '1';
      tableCard.querySelector('.range-end').textContent = filtered.length;
      tableCard.querySelector('.total-count').textContent = filtered.length;

      filtered.forEach(y => {
        const startFormatted = new Date(y.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const endFormatted = new Date(y.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const statusBadge = y.status === 'active' 
          ? `<span class="badge-status status-approved">Active</span>`
          : `<span class="badge-status status-rejected">Inactive</span>`;
        const currentBadge = y.isCurrent 
          ? `<span class="badge-status" style="background-color: rgba(0, 102, 200, 0.1); color: var(--primary);">Current</span>`
          : `-`;

        tbody.innerHTML += `
          <tr>
            <td style="font-weight: 700; color: var(--text-main);">${y.name}</td>
            <td>${startFormatted}</td>
            <td>${endFormatted}</td>
            <td>${statusBadge}</td>
            <td>${currentBadge}</td>
            <td style="text-align: right; white-space: nowrap;">
              <button class="btn btn-secondary btn-edit-year" data-id="${y.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); margin-right: 6px;">Edit</button>
              <button class="btn btn-secondary btn-delete-year" data-id="${y.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); background-color: #FEF2F2; color: #EF4444;">Delete</button>
            </td>
          </tr>
        `;
      });
      attachActionListeners('year');
    }
  }

  function renderClassesTable() {
    const searchVal = document.getElementById('academic-search-input').value.toLowerCase().trim();
    const yearFilter = document.getElementById('filter-class-academic-year').value;
    const tbody = document.getElementById('classes-tbody');
    const emptyState = document.getElementById('classes-empty-state');
    const tableCard = tbody.closest('.dash-table-card');

    let filtered = classes.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(searchVal) || 
                          (c.section && c.section.toLowerCase().includes(searchVal));
      const matchYear = yearFilter === 'all' || c.academicYearId === yearFilter;
      return matchSearch && matchYear;
    });

    // Sort classes by displayOrder
    filtered.sort((a, b) => a.displayOrder - b.displayOrder);

    // Load students from shared localStorage (same key used by students.js module)
    let allStudents = [];
    try { allStudents = JSON.parse(localStorage.getItem('campuslink_students') || '[]'); } catch(e) {}

    tbody.innerHTML = '';
    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      tbody.closest('table').style.display = 'none';
      tableCard.querySelector('.academic-pagination-placeholder').style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      tbody.closest('table').style.display = 'table';
      tableCard.querySelector('.academic-pagination-placeholder').style.display = 'flex';
      
      tableCard.querySelector('.range-start').textContent = '1';
      tableCard.querySelector('.range-end').textContent = filtered.length;
      tableCard.querySelector('.total-count').textContent = filtered.length;

      filtered.forEach(c => {
        const sectionName = c.section || '-';
        const statusBadge = c.status === 'active'
          ? `<span class="badge-status status-approved">Active</span>`
          : `<span class="badge-status status-rejected">Inactive</span>`;

        // Count only ACTIVE (verified) students enrolled in this class
        const classStudents = allStudents.filter(s => s.classId === c.id && s.status === 'active');
        const studentCount = classStudents.length;
        const studentCell = studentCount > 0
          ? `<button class="btn-view-class-students" data-class-id="${c.id}" data-class-name="${c.name}" data-section="${sectionName}" style="background:none;border:none;padding:0;cursor:pointer;color:#4f46e5;font-weight:700;font-size:0.88rem;text-decoration:underline;">${studentCount} Students</button>`
          : `<span style="color:#94a3b8;font-size:0.82rem;font-weight:500;">— None</span>`;

        tbody.innerHTML += `
          <tr>
            <td style="font-weight: 700; color: var(--text-main);">${c.name}</td>
            <td style="font-weight: 600;">${c.displayOrder}</td>
            <td>${sectionName}</td>
            <td>${studentCell}</td>
            <td>${statusBadge}</td>
            <td style="text-align: right; white-space: nowrap;">
              <button class="btn-promote-class" data-id="${c.id}" data-name="${c.name}" data-section="${sectionName}" data-year="${c.academicYearId}" data-order="${c.displayOrder}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); margin-right: 6px; background:#EDE9FE; color:#5B21B6; border:none; cursor:pointer; font-weight:600;">🎓 Promote</button>
              <button class="btn btn-secondary btn-edit-class" data-id="${c.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); margin-right: 6px;">Edit</button>
              <button class="btn btn-secondary btn-delete-class" data-id="${c.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); background-color: #FEF2F2; color: #EF4444;">Delete</button>
            </td>
          </tr>
        `;
      });
      attachActionListeners('class');

      // Bind "View Students" click events
      tbody.querySelectorAll('.btn-view-class-students').forEach(btn => {
        btn.onclick = function() {
          openClassStudentsDrawer(btn.dataset.classId, btn.dataset.className, btn.dataset.section);
        };
      });

      // Bind "Promote" click events
      tbody.querySelectorAll('.btn-promote-class').forEach(btn => {
        btn.onclick = function() {
          openPromoteModal(btn.dataset.id, btn.dataset.name, btn.dataset.section, btn.dataset.year, parseInt(btn.dataset.order, 10));
        };
      });
    }
  }

  // ─── Class Students Drawer ─────────────────────────────────────────────────
  function openClassStudentsDrawer(classId, className, section) {
    const drawer = document.getElementById('class-students-drawer');
    const panel  = document.getElementById('class-students-panel');
    if (!drawer || !panel) return;

    // Set title
    document.getElementById('class-drawer-title').textContent = className + (section && section !== '-' ? ' ' + section : '');

    // Load students
    let allStudents = [];
    try { allStudents = JSON.parse(localStorage.getItem('campuslink_students') || '[]'); } catch(e) {}
    const classStudents = allStudents.filter(s => s.classId === classId);

    // Update stat counters
    document.getElementById('class-drawer-total').textContent   = classStudents.length;
    document.getElementById('class-drawer-active').textContent  = classStudents.filter(s => s.status === 'active').length;
    document.getElementById('class-drawer-pending').textContent = classStudents.filter(s => s.status === 'pending').length;

    // Clear search
    const searchInput = document.getElementById('class-drawer-search');
    if (searchInput) searchInput.value = '';

    function renderDrawerRows(query) {
      query = (query || '').toLowerCase().trim();
      const list = classStudents.filter(s => !query ||
        (s.fullName && s.fullName.toLowerCase().includes(query)) ||
        (s.rollNumber && s.rollNumber.toLowerCase().includes(query)) ||
        (s.email && s.email.toLowerCase().includes(query))
      );

      const tbody = document.getElementById('class-drawer-tbody');
      const empty = document.getElementById('class-drawer-empty');
      if (!tbody) return;

      if (list.length === 0) {
        tbody.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
      }
      if (empty) empty.style.display = 'none';

      const statusStyles = {
        active:    'background:#D1FAE5;color:#065F46;',
        pending:   'background:#FEF3C7;color:#92400E;',
        inactive:  'background:#F3F4F6;color:#6B7280;',
        suspended: 'background:#FEE2E2;color:#991B1B;',
        graduated: 'background:#EDE9FE;color:#5B21B6;',
        transferred:'background:#E0F2FE;color:#0369A1;'
      };

      tbody.innerHTML = list.map(s => {
        const initials = (s.fullName || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
        const avatarColors = ['#4f46e5','#7c3aed','#2563eb','#0891b2','#059669','#d97706'];
        const bg = avatarColors[initials.charCodeAt(0) % avatarColors.length];
        const statusStyle = statusStyles[s.status] || statusStyles.inactive;
        const admDate = s.admissionDate || '—';

        return `<tr style="border-bottom:1px solid #f1f5f9;transition:background .15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
          <td style="padding:12px 20px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:36px;height:36px;border-radius:50%;background:${bg};color:#fff;font-weight:700;font-size:0.78rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${initials}</div>
              <div>
                <div style="font-weight:700;color:#0f172a;font-size:0.85rem;">${s.fullName || '—'}</div>
                <div style="font-size:0.72rem;color:#64748b;">${s.email || s.username || ''}</div>
              </div>
            </div>
          </td>
          <td style="padding:12px;font-family:monospace;font-size:0.78rem;color:#1e293b;font-weight:600;">${s.rollNumber || '—'}</td>
          <td style="padding:12px;"><span style="${statusStyle}padding:3px 8px;border-radius:20px;font-size:0.68rem;font-weight:700;">${(s.status || 'unknown').charAt(0).toUpperCase() + (s.status || '').slice(1)}</span></td>
          <td style="padding:12px 20px;text-align:right;font-size:0.78rem;color:#64748b;">${admDate}</td>
        </tr>`;
      }).join('');
    }

    renderDrawerRows('');

    if (searchInput) {
      searchInput.oninput = function() { renderDrawerRows(searchInput.value); };
    }

    // Show drawer with animation
    drawer.style.display = 'block';
    requestAnimationFrame(() => {
      panel.style.transform = 'translateX(0)';
    });
  }

  function closeClassStudentsDrawer() {
    const drawer = document.getElementById('class-students-drawer');
    const panel  = document.getElementById('class-students-panel');
    if (!panel) return;
    panel.style.transform = 'translateX(100%)';
    setTimeout(function() { if (drawer) drawer.style.display = 'none'; }, 340);
  }

  // Bind drawer close events directly (DOM is already loaded inside this IIFE)
  (function bindDrawerClose() {
    const backdrop = document.getElementById('class-students-backdrop');
    const closeBtn = document.getElementById('class-drawer-close');
    if (backdrop) backdrop.onclick = closeClassStudentsDrawer;
    if (closeBtn)  closeBtn.onclick  = closeClassStudentsDrawer;
  })();

  // ─── Promote Students Modal ────────────────────────────────────────────────

  let _promoteCurrentClassId  = null;
  let _promoteCurrentClassStudents = [];

  function getNextClassName(name) {
    // "Class 9" → "Class 10", "Class 10" → "Class 11", etc.
    return name.replace(/(\d+)$/, function(m, n) { return String(parseInt(n, 10) + 1); });
  }

  function openPromoteModal(classId, className, section, currentYearId, displayOrder) {
    const modal = document.getElementById('promote-modal');
    if (!modal) return;

    _promoteCurrentClassId = classId;

    // Compute next class name
    const nextClassName = getNextClassName(className);
    const sectionLabel  = section && section !== '-' ? ' ' + section : '';
    document.getElementById('promote-modal-title').textContent =
      className + sectionLabel + ' → ' + nextClassName + sectionLabel;
    document.getElementById('promote-target-class-name').textContent = nextClassName + sectionLabel;

    // Populate year dropdown (all years except current, prefer years after current)
    const yearSel = document.getElementById('promote-target-year');
    yearSel.innerHTML = '';
    const otherYears = academicYears.filter(y => y.id !== currentYearId);
    if (otherYears.length === 0) {
      // No other years — still show current with a note
      academicYears.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y.id;
        opt.textContent = y.name + (y.id === currentYearId ? ' (Current)' : '');
        yearSel.appendChild(opt);
      });
    } else {
      otherYears.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y.id;
        opt.textContent = y.name + (y.isCurrent ? ' (Current)' : '');
        yearSel.appendChild(opt);
      });
    }

    // Update target label when year changes
    function updateTargetLabel() {
      const selYearId = yearSel.value;
      const selYear   = academicYears.find(y => y.id === selYearId);
      document.getElementById('promote-target-class-name').textContent =
        nextClassName + sectionLabel + (selYear ? ' (' + selYear.name + ')' : '');
    }
    yearSel.onchange = updateTargetLabel;
    updateTargetLabel();

    // Load only ACTIVE (verified/approved) students — pending remain in Students section until approved
    let allStudents = [];
    try { allStudents = JSON.parse(localStorage.getItem('campuslink_students') || '[]'); } catch(e) {}
    _promoteCurrentClassStudents = allStudents.filter(s => s.classId === classId && s.status === 'active');

    const tbody       = document.getElementById('promote-students-tbody');
    const noStudents  = document.getElementById('promote-no-students');
    const selectAll   = document.getElementById('promote-select-all');
    const countLabel  = document.getElementById('promote-selected-count');

    function refreshCount() {
      const checked = tbody.querySelectorAll('.promote-stu-cb:checked').length;
      countLabel.textContent = checked + ' selected';
      selectAll.checked = checked === _promoteCurrentClassStudents.length && checked > 0;
      selectAll.indeterminate = checked > 0 && checked < _promoteCurrentClassStudents.length;
    }

    if (_promoteCurrentClassStudents.length === 0) {
      tbody.innerHTML = '';
      noStudents.style.display = 'block';
      selectAll.disabled = true;
    } else {
      noStudents.style.display = 'none';
      selectAll.disabled = false;

      const statusColors = {
        active:    '#065F46', pending:   '#92400E',
        inactive:  '#6B7280', suspended: '#991B1B',
        graduated: '#5B21B6', transferred:'#0369A1'
      };
      const statusBgs = {
        active:    '#D1FAE5', pending:   '#FEF3C7',
        inactive:  '#F3F4F6', suspended: '#FEE2E2',
        graduated: '#EDE9FE', transferred:'#E0F2FE'
      };

      tbody.innerHTML = _promoteCurrentClassStudents.map(s => {
        const initials = (s.fullName || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
        const colors = ['#4f46e5','#7c3aed','#2563eb','#0891b2','#059669','#d97706'];
        const bg = colors[initials.charCodeAt(0) % colors.length];
        const sc = statusColors[s.status] || '#6B7280';
        const sb = statusBgs[s.status]   || '#F3F4F6';
        return `<tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:10px 16px 10px 24px;width:40px;">
            <input type="checkbox" class="promote-stu-cb" data-id="${s.id}" checked style="width:15px;height:15px;cursor:pointer;accent-color:#4f46e5;">
          </td>
          <td style="padding:10px 12px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:34px;height:34px;border-radius:50%;background:${bg};color:#fff;font-weight:700;font-size:0.75rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${initials}</div>
              <div>
                <div style="font-weight:700;color:#0f172a;font-size:0.83rem;">${s.fullName || '—'}</div>
                <div style="font-size:0.7rem;color:#64748b;">${s.rollNumber ? 'Roll: ' + s.rollNumber : (s.email || s.username || '')}</div>
              </div>
            </div>
          </td>
          <td style="padding:10px 24px 10px 12px;text-align:right;">
            <span style="background:${sb};color:${sc};padding:3px 8px;border-radius:20px;font-size:0.68rem;font-weight:700;">${(s.status||'').charAt(0).toUpperCase()+(s.status||'').slice(1)}</span>
          </td>
        </tr>`;
      }).join('');

      // Pre-select all
      selectAll.checked = true;
      refreshCount();

      tbody.querySelectorAll('.promote-stu-cb').forEach(cb => {
        cb.onchange = refreshCount;
      });

      selectAll.onchange = function() {
        tbody.querySelectorAll('.promote-stu-cb').forEach(cb => { cb.checked = selectAll.checked; });
        refreshCount();
      };
    }

    // Confirm handler
    document.getElementById('promote-modal-confirm').onclick = function() {
      const targetYearId = yearSel.value;
      const selected = Array.from(tbody.querySelectorAll('.promote-stu-cb:checked')).map(cb => cb.dataset.id);
      if (selected.length === 0) {
        alert('Please select at least one student to promote.');
        return;
      }
      executePromotion(classId, className, section, displayOrder, currentYearId, targetYearId, selected, nextClassName);
    };

    modal.style.display = 'flex';
  }

  function closePromoteModal() {
    const modal = document.getElementById('promote-modal');
    if (modal) modal.style.display = 'none';
  }

  function executePromotion(fromClassId, fromClassName, section, fromDisplayOrder, fromYearId, toYearId, selectedStudentIds, toClassName) {
    // 1. Find or create the target class (toClassName, same section) in toYearId
    let allClasses = [...classes]; // live reference
    let targetClass = allClasses.find(c =>
      c.name === toClassName &&
      (c.section || '') === (section !== '-' ? section : '') &&
      c.academicYearId === toYearId
    );

    if (!targetClass) {
      // Create the target class
      targetClass = {
        id:             'cls_' + Date.now(),
        name:           toClassName,
        displayOrder:   fromDisplayOrder + 1,
        status:         'active',
        academicYearId: toYearId,
        section:        section !== '-' ? section : '',
        classTeacher:   ''
      };
      allClasses.push(targetClass);
      classes = allClasses;
      localStorage.setItem('campuslink_academic_years', localStorage.getItem('campuslink_academic_years') || '[]');
      localStorage.setItem('campuslink_classes', JSON.stringify(allClasses));
    }

    // 2. Update students
    let allStudents = [];
    try { allStudents = JSON.parse(localStorage.getItem('campuslink_students') || '[]'); } catch(e) {}

    const selectedSet = new Set(selectedStudentIds);
    allStudents = allStudents.map(s => {
      if (s.classId === fromClassId && selectedSet.has(s.id)) {
        return Object.assign({}, s, {
          classId:         targetClass.id,
          sectionId:       targetClass.section,
          academicYearId:  toYearId,
          updatedAt:       new Date().toISOString()
        });
      }
      return s; // unselected students stay unchanged
    });

    localStorage.setItem('campuslink_students', JSON.stringify(allStudents));

    closePromoteModal();
    renderClassesTable();

    // Toast
    const promoted = selectedStudentIds.length;
    const remaining = _promoteCurrentClassStudents.length - promoted;
    const toYear = academicYears.find(y => y.id === toYearId);
    const yearName = toYear ? toYear.name : toYearId;
    const msg = promoted + ' student' + (promoted !== 1 ? 's' : '') + ' promoted to ' + toClassName +
      (section && section !== '-' ? ' ' + section : '') + ' (' + yearName + ')' +
      (remaining > 0 ? '. ' + remaining + ' remain in ' + fromClassName + '.' : '.');

    if (typeof toast === 'function') toast(msg);
    else alert('✅ ' + msg);
  }

  // Bind promote modal close buttons
  (function bindPromoteModal() {
    const closeBtn  = document.getElementById('promote-modal-close');
    const cancelBtn = document.getElementById('promote-modal-cancel');
    if (closeBtn)  closeBtn.onclick  = closePromoteModal;
    if (cancelBtn) cancelBtn.onclick = closePromoteModal;
    // Click backdrop to close
    const modal = document.getElementById('promote-modal');
    if (modal) modal.addEventListener('click', function(e) {
      if (e.target === modal) closePromoteModal();
    });
  })();

  function renderSubjectsTable() {
    const searchVal = document.getElementById('academic-search-input').value.toLowerCase().trim();
    const categoryFilter = document.getElementById('filter-subject-category').value;
    const tbody = document.getElementById('subjects-tbody');
    const emptyState = document.getElementById('subjects-empty-state');
    const tableCard = tbody.closest('.dash-table-card');

    let filtered = subjects.filter(sub => {
      const matchSearch = sub.name.toLowerCase().includes(searchVal) || sub.code.toLowerCase().includes(searchVal);
      const matchCategory = categoryFilter === 'all' || sub.category === categoryFilter;
      return matchSearch && matchCategory;
    });

    tbody.innerHTML = '';
    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      tbody.closest('table').style.display = 'none';
      tableCard.querySelector('.academic-pagination-placeholder').style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      tbody.closest('table').style.display = 'table';
      tableCard.querySelector('.academic-pagination-placeholder').style.display = 'flex';
      
      tableCard.querySelector('.range-start').textContent = '1';
      tableCard.querySelector('.range-end').textContent = filtered.length;
      tableCard.querySelector('.total-count').textContent = filtered.length;

      filtered.forEach(sub => {
        // Map class IDs to class names
        const classNames = sub.applicableClassIds
          .map(cid => classes.find(c => c.id === cid))
          .filter(Boolean)
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map(c => c.name)
          .join(', ') || 'None';

        const categoryColors = {
          core: 'background-color: var(--primary-light); color: var(--primary);',
          elective: 'background-color: rgba(139, 92, 246, 0.1); color: #7C3AED;',
          optional: 'background-color: rgba(245, 158, 11, 0.1); color: #D97706;',
          'co-curricular': 'background-color: rgba(16, 185, 129, 0.1); color: #059669;'
        };

        const catBadge = `<span class="badge-status" style="${categoryColors[sub.category] || ''} text-transform: capitalize;">${sub.category}</span>`;
        const statusBadge = sub.status === 'active'
          ? `<span class="badge-status status-approved">Active</span>`
          : `<span class="badge-status status-rejected">Inactive</span>`;

        tbody.innerHTML += `
          <tr>
            <td style="font-weight: 700; color: var(--text-main);">${sub.name}</td>
            <td style="font-family: monospace; font-size: 0.8rem; font-weight: 700;">${sub.code}</td>
            <td>${catBadge}</td>
            <td>${classNames}</td>
            <td>${statusBadge}</td>
            <td style="text-align: right; white-space: nowrap;">
              <button class="btn btn-secondary btn-edit-subject" data-id="${sub.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); margin-right: 6px;">Edit</button>
              <button class="btn btn-secondary btn-delete-subject" data-id="${sub.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); background-color: #FEF2F2; color: #EF4444;">Delete</button>
            </td>
          </tr>
        `;
      });
      attachActionListeners('subject');
    }
  }

  function renderActiveSubtabTable() {
    if (activeAcademicSubtab === 'years') renderYearsTable();
    else if (activeAcademicSubtab === 'classes') renderClassesTable();
    else if (activeAcademicSubtab === 'subjects') renderSubjectsTable();
  }

  // --- Attach Action Edit/Delete Listeners ---
  function attachActionListeners(type) {
    if (type === 'year') {
      document.querySelectorAll('.btn-edit-year').forEach(btn => {
        btn.addEventListener('click', () => openEditYearModal(btn.getAttribute('data-id')));
      });
      document.querySelectorAll('.btn-delete-year').forEach(btn => {
        btn.addEventListener('click', () => deleteAcademicEntity('years', btn.getAttribute('data-id')));
      });
    } else if (type === 'class') {
      document.querySelectorAll('.btn-edit-class').forEach(btn => {
        btn.addEventListener('click', () => openEditClassModal(btn.getAttribute('data-id')));
      });
      document.querySelectorAll('.btn-delete-class').forEach(btn => {
        btn.addEventListener('click', () => deleteAcademicEntity('classes', btn.getAttribute('data-id')));
      });
    } else if (type === 'subject') {
      document.querySelectorAll('.btn-edit-subject').forEach(btn => {
        btn.addEventListener('click', () => openEditSubjectModal(btn.getAttribute('data-id')));
      });
      document.querySelectorAll('.btn-delete-subject').forEach(btn => {
        btn.addEventListener('click', () => deleteAcademicEntity('subjects', btn.getAttribute('data-id')));
      });
    }
  }

  // --- Edit Modals Population & Open ---
  function openEditYearModal(id) {
    const y = academicYears.find(item => item.id === id);
    if (!y) return;
    
    document.getElementById('academic-year-modal-title').textContent = "Edit Academic Year";
    document.getElementById('academic-year-id').value = y.id;
    document.getElementById('academic-year-name').value = y.name;
    document.getElementById('academic-year-start').value = y.startDate;
    document.getElementById('academic-year-end').value = y.endDate;
    document.getElementById('academic-year-status').value = y.status;
    document.getElementById('academic-year-current').checked = !!y.isCurrent;
    
    const modal = document.getElementById('academic-year-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  }

  function openEditClassModal(id) {
    const c = classes.find(item => item.id === id);
    if (!c) return;
    
    populateAcademicDropdowns();
    document.getElementById('academic-class-modal-title').textContent = "Edit Class";
    document.getElementById('academic-class-id').value = c.id;
    document.getElementById('academic-class-name').value = c.name;
    document.getElementById('academic-class-order').value = c.displayOrder;
    document.getElementById('academic-class-year').value = c.academicYearId;
    document.getElementById('academic-class-section').value = c.section || '';
    document.getElementById('academic-class-status').value = c.status;
    
    const modal = document.getElementById('academic-class-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  }

  function openEditSubjectModal(id) {
    const sub = subjects.find(item => item.id === id);
    if (!sub) return;
    
    populateAcademicDropdowns();
    document.getElementById('academic-subject-modal-title').textContent = "Edit Subject";
    document.getElementById('academic-subject-id').value = sub.id;
    document.getElementById('academic-subject-name').value = sub.name;
    document.getElementById('academic-subject-code').value = sub.code;
    document.getElementById('academic-subject-category').value = sub.category;
    document.getElementById('academic-subject-status').value = sub.status;
    
    // Check applicable class boxes
    document.querySelectorAll('#subject-applicable-classes-container input[type="checkbox"]').forEach(box => {
      box.checked = sub.applicableClassIds.includes(box.value);
    });
    document.getElementById('err-subject-classes').style.display = 'none';

    const modal = document.getElementById('academic-subject-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  }

  // --- Delete Handler ---
  async function deleteAcademicEntity(type, id) {
    let name = '';
    if (type === 'years') name = academicYears.find(y => y.id === id)?.name || 'Year';
    else if (type === 'classes') name = classes.find(c => c.id === id)?.name || 'Class';
    else if (type === 'subjects') name = subjects.find(sub => sub.id === id)?.name || 'Subject';

    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        if (type === 'years') {
          const { error } = await supabase.from('academic_years').delete().eq('id', id);
          if (error) throw error;
          
          await supabase.from('classes').update({ status: 'inactive' }).eq('academic_year_id', id);
          
          academicYears = academicYears.filter(y => y.id !== id);
          saveAcademicState('campuslink_academic_years', academicYears);
          classes.forEach(c => {
            if (c.academicYearId === id) c.status = 'inactive';
          });
          saveAcademicState('campuslink_classes', classes);
        } else if (type === 'classes') {
          const { error } = await supabase.from('classes').delete().eq('id', id);
          if (error) throw error;

          classes = classes.filter(c => c.id !== id);
          saveAcademicState('campuslink_classes', classes);
        } else if (type === 'subjects') {
          // Delete many-to-many subject applicability first
          await supabase.from('subject_classes').delete().eq('subject_id', id);
          const { error } = await supabase.from('subjects').delete().eq('id', id);
          if (error) throw error;

          subjects = subjects.filter(sub => sub.id !== id);
          saveAcademicState('campuslink_subjects', subjects);
        }

        showToast(`Deleted successfully!`);
        populateAcademicDropdowns();
        renderActiveSubtabTable();
      } catch (dbErr) {
        console.error("Database deletion failed:", dbErr);
        alert("Failed to delete entity from database: " + dbErr.message);
      }
    }
  }

  let academicListenersAttached = false;

  // --- Initialize Academic Management Tab Panels & Listeners ---
  window.initAcademicTab = function() {
    setupAcademicEventListeners();
    populateAcademicDropdowns();
    renderActiveSubtabTable();
  };

  // Setup DOM Event Listeners for Academic Sub-tabs & Modals
  function setupAcademicEventListeners() {
    if (academicListenersAttached) return;
    academicListenersAttached = true;

    // 1. Subtab button click switching
    document.querySelectorAll('.academic-subtab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.academic-subtab-btn').forEach(b => {
          b.classList.remove('active');
          b.style.color = 'var(--text-muted)';
          b.style.borderBottom = '3px solid transparent';
          b.style.fontWeight = '500';
        });
        btn.classList.add('active');
        btn.style.color = 'var(--primary)';
        btn.style.borderBottom = '3px solid var(--primary)';
        btn.style.fontWeight = '700';

        activeAcademicSubtab = btn.getAttribute('data-subtab');

        // Hide all subtab panels
        document.querySelectorAll('.academic-subtab-panel').forEach(p => p.style.display = 'none');
        // Show target panel
        const panel = document.getElementById(`subtab-panel-${activeAcademicSubtab}`);
        if (panel) panel.style.display = 'block';

        // Show/hide correct filter inputs
        document.querySelectorAll('.academic-filter-select').forEach(sel => sel.style.display = 'none');
        if (activeAcademicSubtab === 'years') {
          const filter = document.getElementById('filter-academic-year-status');
          if (filter) filter.style.display = 'block';
          const search = document.getElementById('academic-search-input');
          if (search) search.placeholder = 'Search academic years...';
        } else if (activeAcademicSubtab === 'classes') {
          const filter = document.getElementById('filter-class-academic-year');
          if (filter) filter.style.display = 'block';
          const search = document.getElementById('academic-search-input');
          if (search) search.placeholder = 'Search classes...';
        } else if (activeAcademicSubtab === 'subjects') {
          const filter = document.getElementById('filter-subject-category');
          if (filter) filter.style.display = 'block';
          const search = document.getElementById('academic-search-input');
          if (search) search.placeholder = 'Search subjects...';
        }

        // Reset search field and re-render
        const searchInput = document.getElementById('academic-search-input');
        if (searchInput) searchInput.value = '';
        renderActiveSubtabTable();
      });
    });

    // 2. Search inputs & Filter selectors reactivity
    const searchInput = document.getElementById('academic-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', renderActiveSubtabTable);
    }
    document.querySelectorAll('.academic-filter-select').forEach(sel => {
      sel.addEventListener('change', renderActiveSubtabTable);
    });

    // 3. Close modal clicks
    document.querySelectorAll('.academic-modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-modal');
        const modal = document.getElementById(modalId);
        if (modal) {
          modal.style.display = 'none';
          modal.classList.remove('active');
        }
      });
    });

    const academicModals = [
      'academic-year-modal',
      'academic-class-modal',
      'academic-subject-modal'
    ];
    academicModals.forEach(id => {
      const modal = document.getElementById(id);
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
          }
        });
      }
    });

    // 4. Add Entity Button trigger
    const btnAdd = document.getElementById('btn-add-academic-entity');
    if (btnAdd) {
      btnAdd.addEventListener('click', (e) => {
        e.preventDefault();
        
        if (activeAcademicSubtab === 'years') {
          const modalTitle = document.getElementById('academic-year-modal-title');
          if (modalTitle) modalTitle.textContent = "Add Academic Year";
          
          const modalId = document.getElementById('academic-year-id');
          if (modalId) modalId.value = "";
          
          const modalForm = document.getElementById('academic-year-form');
          if (modalForm) modalForm.reset();
          
          const modal = document.getElementById('academic-year-modal');
          if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
          }
        } else if (activeAcademicSubtab === 'classes') {
          if (!academicYears || academicYears.length === 0) {
            alert("Please add an Academic Year first before adding a Class.");
            return;
          }
          populateAcademicDropdowns();
          
          const modalTitle = document.getElementById('academic-class-modal-title');
          if (modalTitle) modalTitle.textContent = "Add Class";
          
          const modalId = document.getElementById('academic-class-id');
          if (modalId) modalId.value = "";
          
          const modalForm = document.getElementById('academic-class-form');
          if (modalForm) modalForm.reset();
          
          const sectionEl = document.getElementById('academic-class-section');
          if (sectionEl) sectionEl.value = "";

          const modal = document.getElementById('academic-class-modal');
          if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
          }
        } else if (activeAcademicSubtab === 'subjects') {
          if (!classes || classes.length === 0) {
            alert("Please add at least one Class first before adding a Subject.");
            return;
          }
          populateAcademicDropdowns();
          
          const modalTitle = document.getElementById('academic-subject-modal-title');
          if (modalTitle) modalTitle.textContent = "Add Subject";
          
          const modalId = document.getElementById('academic-subject-id');
          if (modalId) modalId.value = "";
          
          const modalForm = document.getElementById('academic-subject-form');
          if (modalForm) modalForm.reset();
          
          // Clear checkboxes
          document.querySelectorAll('#subject-applicable-classes-container input[type="checkbox"]').forEach(box => {
            box.checked = false;
          });
          
          const errDiv = document.getElementById('err-subject-classes');
          if (errDiv) errDiv.style.display = 'none';
          
          const modal = document.getElementById('academic-subject-modal');
          if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
          }
        }
      });
    }

    // 5. Form Submissions
    // Academic Year Form Submit
    const yearForm = document.getElementById('academic-year-form');
    if (yearForm) {
      yearForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const idEl = document.getElementById('academic-year-id');
        const nameEl = document.getElementById('academic-year-name');
        const startEl = document.getElementById('academic-year-start');
        const endEl = document.getElementById('academic-year-end');
        const statusEl = document.getElementById('academic-year-status');
        const currentEl = document.getElementById('academic-year-current');
        
        if (!nameEl || !startEl || !endEl || !statusEl || !currentEl) return;
        
        const id = idEl ? idEl.value : "";
        const name = nameEl.value.trim();
        const start = startEl.value;
        const end = endEl.value;
        const status = statusEl.value;
        const isCurrent = currentEl.checked;

        if (new Date(start) >= new Date(end)) {
          alert("Start Date must be before End Date.");
          return;
        }

        let finalIsCurrent = isCurrent;
        if (academicYears.length === 0) {
          finalIsCurrent = true;
        }

        if (finalIsCurrent) {
          // Enforce only one current academic year
          academicYears.forEach(y => y.isCurrent = false);
        } else {
          // Ensure at least one current year exists
          const currentCount = academicYears.filter(y => y.isCurrent && y.id !== id).length;
          if (currentCount === 0) {
            alert("At least one academic year must be marked as Current.");
            return;
          }
        }

        try {
          let finalId = id;
          if (id) {
            // Update Supabase
            const { error } = await supabase
              .from('academic_years')
              .update({
                name: name,
                start_date: start,
                end_date: end,
                status: status,
                is_current: finalIsCurrent
              })
              .eq('id', id);
            if (error) throw error;

            // Update local memory
            const y = academicYears.find(item => item.id === id);
            if (y) {
              y.name = name;
              y.startDate = start;
              y.endDate = end;
              y.status = status;
              y.isCurrent = finalIsCurrent;
            }
          } else {
            // Insert Supabase
            const { data: dbRes, error } = await supabase
              .from('academic_years')
              .insert({
                school_id: profile.id,
                name: name,
                start_date: start,
                end_date: end,
                status: status,
                is_current: finalIsCurrent
              })
              .select();
            if (error) throw error;
            if (!dbRes || dbRes.length === 0) throw new Error("No data returned from database insert");
            finalId = dbRes[0].id;

            // Insert local memory
            const newY = {
              id: finalId,
              name,
              startDate: start,
              endDate: end,
              status,
              isCurrent: finalIsCurrent
            };
            academicYears.push(newY);
          }

          if (finalIsCurrent) {
            // Enforce in Supabase too
            await supabase
              .from('academic_years')
              .update({ is_current: false })
              .eq('school_id', profile.id)
              .neq('id', finalId);
          }

          saveAcademicState('campuslink_academic_years', academicYears);
          const modal = document.getElementById('academic-year-modal');
          if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
          }
          showToast("Academic Year saved successfully!");
          populateAcademicDropdowns();
          renderYearsTable();
        } catch (dbErr) {
          console.error("Database save failed for academic year:", dbErr);
          alert("Failed to save academic year to database: " + dbErr.message);
        }
      });
    }

    // Class Form Submit
    const classForm = document.getElementById('academic-class-form');
    if (classForm) {
      classForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const idEl = document.getElementById('academic-class-id');
        const nameEl = document.getElementById('academic-class-name');
        const orderEl = document.getElementById('academic-class-order');
        const yearIdEl = document.getElementById('academic-class-year');
        const sectionEl = document.getElementById('academic-class-section');
        const statusEl = document.getElementById('academic-class-status');
        
        if (!nameEl || !orderEl || !yearIdEl || !statusEl) return;
        
        const id = idEl ? idEl.value : "";
        const name = nameEl.value.trim();
        const order = parseInt(orderEl.value);
        const yearId = yearIdEl.value;
        const section = sectionEl ? sectionEl.value.trim() : "";
        const status = statusEl.value;

        try {
          if (id) {
            // Update Supabase
            const { error } = await supabase
              .from('classes')
              .update({
                name: name,
                display_order: order,
                academic_year_id: yearId,
                section: section,
                status: status
              })
              .eq('id', id);
            if (error) throw error;

            // Update memory
            const c = classes.find(item => item.id === id);
            if (c) {
              c.name = name;
              c.displayOrder = order;
              c.academicYearId = yearId;
              c.section = section;
              c.status = status;
            }
          } else {
            // Insert Supabase
            const { data: dbRes, error } = await supabase
              .from('classes')
              .insert({
                school_id: profile.id,
                name: name,
                display_order: order,
                academic_year_id: yearId,
                section: section,
                status: status
              })
              .select();
            if (error) throw error;
            if (!dbRes || dbRes.length === 0) throw new Error("No data returned from database insert");
            const finalId = dbRes[0].id;

            // Insert memory
            const newC = {
              id: finalId,
              name,
              displayOrder: order,
              academicYearId: yearId,
              section,
              status
            };
            classes.push(newC);
          }

          saveAcademicState('campuslink_classes', classes);
          const modal = document.getElementById('academic-class-modal');
          if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
          }
          showToast("Class saved successfully!");
          populateAcademicDropdowns();
          renderClassesTable();
        } catch (dbErr) {
          console.error("Database save failed for class:", dbErr);
          alert("Failed to save class to database: " + dbErr.message);
        }
      });
    }

    // Subject Form Submit
    const subjectForm = document.getElementById('academic-subject-form');
    if (subjectForm) {
      subjectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const idEl = document.getElementById('academic-subject-id');
        const nameEl = document.getElementById('academic-subject-name');
        const codeEl = document.getElementById('academic-subject-code');
        const categoryEl = document.getElementById('academic-subject-category');
        const statusEl = document.getElementById('academic-subject-status');
        
        if (!nameEl || !codeEl || !categoryEl || !statusEl) return;
        
        const id = idEl ? idEl.value : "";
        const name = nameEl.value.trim();
        const code = codeEl.value.trim();
        const category = categoryEl.value;
        const status = statusEl.value;

        // Extract checked checkboxes
        const checkedBoxes = document.querySelectorAll('#subject-applicable-classes-container input[type="checkbox"]:checked');
        if (checkedBoxes.length === 0) {
          const errDiv = document.getElementById('err-subject-classes');
          if (errDiv) errDiv.style.display = 'block';
          return;
        }

        const classIds = Array.from(checkedBoxes).map(cb => cb.value);

        try {
          let finalId = id;
          if (id) {
            // Update Supabase subject
            const { error } = await supabase
              .from('subjects')
              .update({
                name: name,
                code: code,
                category: category,
                status: status
              })
              .eq('id', id);
            if (error) throw error;

            // Delete old class applicability & insert new ones
            await supabase.from('subject_classes').delete().eq('subject_id', id);
            const insertRows = classIds.map(cid => ({ subject_id: id, class_id: cid }));
            if (insertRows.length > 0) {
              const { error: appErr } = await supabase.from('subject_classes').insert(insertRows);
              if (appErr) throw appErr;
            }

            // Update local memory
            const sub = subjects.find(item => item.id === id);
            if (sub) {
              sub.name = name;
              sub.code = code;
              sub.category = category;
              sub.status = status;
              sub.applicableClassIds = classIds;
            }
          } else {
            // Insert Supabase subject
            const { data: dbRes, error } = await supabase
              .from('subjects')
              .insert({
                school_id: profile.id,
                name: name,
                code: code,
                category: category,
                status: status
              })
              .select();
            if (error) throw error;
            if (!dbRes || dbRes.length === 0) throw new Error("No data returned from database insert");
            finalId = dbRes[0].id;

            // Insert class applicability
            const insertRows = classIds.map(cid => ({ subject_id: finalId, class_id: cid }));
            if (insertRows.length > 0) {
              const { error: appErr } = await supabase.from('subject_classes').insert(insertRows);
              if (appErr) throw appErr;
            }

            // Insert local memory
            const newSub = {
              id: finalId,
              name,
              code,
              category,
              status,
              applicableClassIds: classIds
            };
            subjects.push(newSub);
          }

          saveAcademicState('campuslink_subjects', subjects);
          const modal = document.getElementById('academic-subject-modal');
          if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
          }
          showToast("Subject saved successfully!");
          renderSubjectsTable();
        } catch (dbErr) {
          console.error("Database save failed for subject:", dbErr);
          alert("Failed to save subject to database: " + dbErr.message);
        }
      });
    }
  }

  // =========================================================================
  // --- Teacher Management Module controllers (Phase 2 Foundation) ---
  // =========================================================================

  function renderTeachersAll() {
    const searchVal = document.getElementById('teachers-search-input').value.toLowerCase().trim();
    const statusFilter = document.getElementById('filter-teacher-status').value;
    const verificationFilter = document.getElementById('filter-teacher-verification').value;
    const tbody = document.getElementById('teachers-tbody-all');
    const emptyState = document.getElementById('teachers-empty-state-all');
    const tableCard = tbody.closest('.dash-table-card');

    let filtered = teachers.filter(t => {
      const matchSearch = t.fullName.toLowerCase().includes(searchVal) || 
                          t.username.toLowerCase().includes(searchVal) || 
                          t.employeeId.toLowerCase().includes(searchVal) || 
                          t.campuslinkId.toLowerCase().includes(searchVal);
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchVerify = verificationFilter === 'all' || t.verificationStatus === verificationFilter;
      return matchSearch && matchStatus && matchVerify;
    });

    tbody.innerHTML = '';
    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      tbody.closest('table').style.display = 'none';
      tableCard.querySelector('.teachers-pagination-placeholder').style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      tbody.closest('table').style.display = 'table';
      tableCard.querySelector('.teachers-pagination-placeholder').style.display = 'flex';

      tableCard.querySelector('.range-start').textContent = '1';
      tableCard.querySelector('.range-end').textContent = filtered.length;
      tableCard.querySelector('.total-count').textContent = filtered.length;

      filtered.forEach(t => {
        const photoLetter = t.fullName.charAt(0).toUpperCase();
        const statusClass = t.status === 'active' ? 'status-approved' : (t.status === 'suspended' ? 'status-rejected' : 'status-pending');
        const statusBadge = `<span class="badge-status ${statusClass}" style="text-transform: capitalize;">${t.status}</span>`;
        const verifyBadge = t.verificationStatus === 'verified'
          ? `<span class="badge-status status-approved">Verified</span>`
          : `<span class="badge-status" style="background-color: rgba(245, 158, 11, 0.1); color: #D97706;">Pending</span>`;

        tbody.innerHTML += `
          <tr>
            <td>
              <div style="width: 36px; height: 36px; border-radius: 50%; background-color: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.95rem;">${photoLetter}</div>
            </td>
            <td style="font-weight: 700; color: var(--text-main);">${t.fullName}</td>
            <td style="font-weight: 600;">@${t.username}</td>
            <td style="font-family: monospace; font-size: 0.8rem; font-weight: 700;">${t.campuslinkId}</td>
            <td style="font-family: monospace; font-size: 0.8rem; font-weight: 700;">${t.employeeId}</td>
            <td>${t.qualification || '-'}</td>
            <td>${statusBadge}</td>
            <td>${verifyBadge}</td>
            <td style="text-align: right; white-space: nowrap;">
              <button class="btn btn-secondary btn-view-teacher" data-id="${t.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); margin-right: 6px;">Profile</button>
              <button class="btn btn-secondary btn-edit-teacher" data-id="${t.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); margin-right: 6px;">Edit</button>
              <button class="btn btn-secondary btn-delete-teacher" data-id="${t.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); background-color: #FEF2F2; color: #EF4444;">Delete</button>
            </td>
          </tr>
        `;
      });
      attachTeacherActions();
    }
  }

  function renderTeachersPending() {
    const searchVal = document.getElementById('teachers-search-input').value.toLowerCase().trim();
    const tbody = document.getElementById('teachers-tbody-pending');
    const emptyState = document.getElementById('teachers-empty-state-pending');

    let filtered = teachers.filter(t => t.verificationStatus === 'pending' && 
                                       (t.fullName.toLowerCase().includes(searchVal) || 
                                        t.username.toLowerCase().includes(searchVal) || 
                                        (t.employeeId || '').toLowerCase().includes(searchVal)));

    tbody.innerHTML = '';
    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      tbody.closest('table').style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      tbody.closest('table').style.display = 'table';

      filtered.forEach(t => {
        const photoLetter = t.fullName.charAt(0).toUpperCase();
        const statusClass = t.status === 'active' ? 'status-approved' : (t.status === 'suspended' ? 'status-rejected' : 'status-pending');
        const statusBadge = `<span class="badge-status ${statusClass}" style="text-transform: capitalize;">${t.status}</span>`;

        tbody.innerHTML += `
          <tr>
            <td>
              <div style="width: 36px; height: 36px; border-radius: 50%; background-color: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.95rem;">${photoLetter}</div>
            </td>
            <td style="font-weight: 700; color: var(--text-main);">${t.fullName}</td>
            <td style="font-weight: 600;">@${t.username}</td>
            <td style="font-family: monospace; font-size: 0.8rem; font-weight: 700;">${t.campuslinkId}</td>
            <td style="font-family: monospace; font-size: 0.8rem; font-weight: 700;">${t.employeeId}</td>
            <td>${t.department || '-'}</td>
            <td>${statusBadge}</td>
            <td style="text-align: right; white-space: nowrap;">
              <button class="btn btn-secondary btn-approve-teacher" data-id="${t.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); margin-right: 6px; background-color: rgba(16, 185, 129, 0.1); color: #059669; border-color: rgba(16, 185, 129, 0.2);">Approve</button>
              <button class="btn btn-secondary btn-reject-teacher" data-id="${t.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); margin-right: 6px; background-color: rgba(239, 68, 68, 0.1); color: #EF4444; border-color: rgba(239, 68, 68, 0.2);">Reject</button>
              <button class="btn btn-secondary btn-view-teacher" data-id="${t.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm);">Profile</button>
            </td>
          </tr>
        `;
      });
      attachTeacherActions();
    }
  }

  function renderTeachersVerified() {
    const searchVal = document.getElementById('teachers-search-input').value.toLowerCase().trim();
    const tbody = document.getElementById('teachers-tbody-verified');
    const emptyState = document.getElementById('teachers-empty-state-verified');

    let filtered = teachers.filter(t => t.verificationStatus === 'verified' && 
                                       (t.fullName.toLowerCase().includes(searchVal) || 
                                        t.username.toLowerCase().includes(searchVal) || 
                                        t.employeeId.toLowerCase().includes(searchVal)));

    tbody.innerHTML = '';
    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      tbody.closest('table').style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      tbody.closest('table').style.display = 'table';

      filtered.forEach(t => {
        const photoLetter = t.fullName.charAt(0).toUpperCase();
        const statusClass = t.status === 'active' ? 'status-approved' : (t.status === 'suspended' ? 'status-rejected' : 'status-pending');
        const statusBadge = `<span class="badge-status ${statusClass}" style="text-transform: capitalize;">${t.status}</span>`;

        tbody.innerHTML += `
          <tr>
            <td>
              <div style="width: 36px; height: 36px; border-radius: 50%; background-color: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.95rem;">${photoLetter}</div>
            </td>
            <td style="font-weight: 700; color: var(--text-main);">${t.fullName}</td>
            <td style="font-weight: 600;">@${t.username}</td>
            <td style="font-family: monospace; font-size: 0.8rem; font-weight: 700;">${t.campuslinkId}</td>
            <td style="font-family: monospace; font-size: 0.8rem; font-weight: 700;">${t.employeeId}</td>
            <td>${t.department || '-'}</td>
            <td>${statusBadge}</td>
            <td style="text-align: right; white-space: nowrap;">
              <button class="btn btn-secondary btn-edit-teacher" data-id="${t.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); margin-right: 6px;">Edit</button>
              <button class="btn btn-secondary btn-suspend-teacher" data-id="${t.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); margin-right: 6px; background-color: rgba(245, 158, 11, 0.1); color: #D97706; border-color: rgba(245, 158, 11, 0.2);">Suspend</button>
              <button class="btn btn-secondary btn-deactivate-teacher" data-id="${t.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); margin-right: 6px; background-color: rgba(107, 114, 128, 0.1); color: #4B5563; border-color: rgba(107, 114, 128, 0.2);">Deactivate</button>
              <button class="btn btn-secondary btn-view-teacher" data-id="${t.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm);">Profile</button>
            </td>
          </tr>
        `;
      });
      attachTeacherActions();
    }
  }

  function renderTeachersAssignments() {
    const searchVal = document.getElementById('teachers-search-input').value.toLowerCase().trim();
    const tbody = document.getElementById('teachers-tbody-assignments');
    const emptyState = document.getElementById('teachers-empty-state-assignments');

    let filtered = teachers.filter(t => t.fullName.toLowerCase().includes(searchVal) || 
                                       t.username.toLowerCase().includes(searchVal) || 
                                       t.employeeId.toLowerCase().includes(searchVal));

    tbody.innerHTML = '';
    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      tbody.closest('table').style.display = 'none';
    } else {
      emptyState.style.display = 'none';
      tbody.closest('table').style.display = 'table';

      filtered.forEach(t => {
        const classList = (t.classes && t.classes.length > 0) ? t.classes.join(', ') : 'None';
        const sectionList = (t.sections && t.sections.length > 0) ? t.sections.join(', ') : 'None';
        const subjectList = (t.subjects && t.subjects.length > 0) ? t.subjects.join(', ') : 'None';
        
        const isClassTeacherBadge = t.isClassTeacher 
          ? `<span class="badge-status status-approved">Yes</span>` 
          : `<span class="badge-status" style="background-color: rgba(107, 114, 128, 0.1); color: #4B5563;">No</span>`;

        const statusClass = t.status === 'active' ? 'status-approved' : (t.status === 'suspended' ? 'status-rejected' : 'status-pending');
        const statusBadge = `<span class="badge-status ${statusClass}" style="text-transform: capitalize;">${t.status}</span>`;

        tbody.innerHTML += `
          <tr>
            <td style="font-weight: 700; color: var(--text-main);">${t.fullName} <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal; margin-left: 4px;">(@${t.username})</span></td>
            <td>${classList}</td>
            <td>${sectionList}</td>
            <td>${subjectList}</td>
            <td>${isClassTeacherBadge}</td>
            <td>${statusBadge}</td>
            <td style="text-align: right; white-space: nowrap;">
              <button class="btn btn-secondary btn-edit-assignments" data-id="${t.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm); margin-right: 6px;">Assign</button>
              <button class="btn btn-secondary btn-view-teacher" data-id="${t.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: var(--radius-sm);">Profile</button>
            </td>
          </tr>
        `;
      });
      attachTeacherActions();
    }
  }

  function renderActiveTeachersTable() {
    if (activeTeachersSubtab === 'all') renderTeachersAll();
    else if (activeTeachersSubtab === 'pending') renderTeachersPending();
    else if (activeTeachersSubtab === 'verified') renderTeachersVerified();
    else if (activeTeachersSubtab === 'assignments') renderTeachersAssignments();
    else if (activeTeachersSubtab === 'invite-links') renderTeacherInviteLinks();
  }

  function attachTeacherActions() {
    document.querySelectorAll('.btn-view-teacher').forEach(btn => {
      btn.onclick = () => openViewTeacherModal(btn.getAttribute('data-id'));
    });
    document.querySelectorAll('.btn-edit-teacher').forEach(btn => {
      btn.onclick = () => openEditTeacherModal(btn.getAttribute('data-id'));
    });
    document.querySelectorAll('.btn-edit-assignments').forEach(btn => {
      btn.onclick = () => openEditTeacherModal(btn.getAttribute('data-id'));
    });
    document.querySelectorAll('.btn-delete-teacher').forEach(btn => {
      btn.onclick = () => showConfirmModal('delete', btn.getAttribute('data-id'));
    });
    document.querySelectorAll('.btn-approve-teacher').forEach(btn => {
      btn.onclick = () => showConfirmModal('approve', btn.getAttribute('data-id'));
    });
    document.querySelectorAll('.btn-reject-teacher').forEach(btn => {
      btn.onclick = () => showConfirmModal('reject', btn.getAttribute('data-id'));
    });
    document.querySelectorAll('.btn-suspend-teacher').forEach(btn => {
      btn.onclick = () => showConfirmModal('suspend', btn.getAttribute('data-id'));
    });
    document.querySelectorAll('.btn-deactivate-teacher').forEach(btn => {
      btn.onclick = () => showConfirmModal('deactivate', btn.getAttribute('data-id'));
    });
  }

  let confirmCallback = null;

  function showConfirmModal(action, id) {
    const modal = document.getElementById('teachers-confirm-modal');
    const title = document.getElementById('confirm-title');
    const message = document.getElementById('confirm-message');
    const icon = document.getElementById('confirm-icon');
    const btnAction = document.getElementById('confirm-btn-action');

    const teacher = teachers.find(t => t.id === id);
    if (!teacher) return;

    if (action === 'delete') {
      icon.textContent = '🗑️';
      title.textContent = 'Delete Teacher Account';
      message.textContent = `Are you sure you want to delete ${teacher.fullName}'s teacher account? This action is permanent and cannot be undone.`;
      btnAction.textContent = 'Delete';
      btnAction.className = 'btn btn-primary';
      btnAction.style.backgroundColor = '#EF4444';
      btnAction.style.borderColor = '#EF4444';
      confirmCallback = async () => {
        // Sync delete to database
        if (window.CampusLink && window.CampusLink.supabase && profile?.id) {
          const sb = window.CampusLink.supabase;
          try {
            await sb.from('teachers').delete().eq('school_id', profile.id).eq('username', teacher.username);
          } catch (dbErr) {
            console.error("Database delete sync failed:", dbErr);
          }
        }

        teachers = teachers.filter(t => t.id !== id);
        saveAcademicState('campuslink_teachers', teachers);
        showToast(`Teacher "${teacher.fullName}" deleted successfully.`);
        renderActiveTeachersTable();
        closeConfirmModal();
      };
    } else if (action === 'suspend') {
      icon.textContent = '⚠️';
      title.textContent = 'Suspend Teacher Account';
      message.textContent = `Are you sure you want to suspend ${teacher.fullName}'s account? They will lose access to all classes and student portfolios.`;
      btnAction.textContent = 'Suspend';
      btnAction.className = 'btn btn-primary';
      btnAction.style.backgroundColor = '#D97706';
      btnAction.style.borderColor = '#D97706';
      confirmCallback = async () => {
        teacher.status = 'suspended';

        // Sync status to database
        if (window.CampusLink && window.CampusLink.supabase && profile?.id) {
          const sb = window.CampusLink.supabase;
          try {
            await sb
              .from('teachers')
              .update({ status: 'suspended' })
              .eq('school_id', profile.id)
              .eq('username', teacher.username);
          } catch (dbErr) {
            console.error("Database suspend sync failed:", dbErr);
          }
        }

        saveAcademicState('campuslink_teachers', teachers);
        showToast(`Teacher "${teacher.fullName}" suspended successfully.`);
        renderActiveTeachersTable();
        closeConfirmModal();
      };
    } else if (action === 'deactivate') {
      icon.textContent = '🔒';
      title.textContent = 'Deactivate Teacher Account';
      message.textContent = `Are you sure you want to deactivate ${teacher.fullName}'s account? You can reactivate it later.`;
      btnAction.textContent = 'Deactivate';
      btnAction.className = 'btn btn-primary';
      btnAction.style.backgroundColor = '#4B5563';
      btnAction.style.borderColor = '#4B5563';
      confirmCallback = async () => {
        teacher.status = 'inactive';

        // Sync status to database
        if (window.CampusLink && window.CampusLink.supabase && profile?.id) {
          const sb = window.CampusLink.supabase;
          try {
            await sb
              .from('teachers')
              .update({ status: 'inactive' })
              .eq('school_id', profile.id)
              .eq('username', teacher.username);
          } catch (dbErr) {
            console.error("Database deactivate sync failed:", dbErr);
          }
        }

        saveAcademicState('campuslink_teachers', teachers);
        showToast(`Teacher "${teacher.fullName}" deactivated successfully.`);
        renderActiveTeachersTable();
        closeConfirmModal();
      };
    } else if (action === 'approve') {
      icon.textContent = '✅';
      title.textContent = 'Verify Teacher Profile';
      message.textContent = `Do you want to verify and approve ${teacher.fullName}'s teacher account? They will receive full system access.`;
      btnAction.textContent = 'Verify & Approve';
      btnAction.className = 'btn btn-primary';
      btnAction.style.backgroundColor = '#10B981';
      btnAction.style.borderColor = '#10B981';
      confirmCallback = async () => {
        teacher.verificationStatus = 'verified';
        teacher.status = 'active';

        // Sync verification & link profile to school in database
        if (window.CampusLink && window.CampusLink.supabase && profile?.id) {
          const sb = window.CampusLink.supabase;
          try {
            // 1. Link profile to school
            await sb.rpc('link_teacher_to_school', {
              teacher_username: teacher.username,
              target_school_id: profile.id,
              assigned_by_id: session?.user?.id || profile.admin_user_id
            });

            // 2. Fetch linked user ID
            let linkedUserId = null;
            const { data: userProf } = await sb.from('profiles').select('id').ilike('username', teacher.username).maybeSingle();
            if (userProf) linkedUserId = userProf.id;

            // 3. Fetch existing DB record to avoid overwriting data with local blanks
            let existingDbTeacher = null;
            try {
              const { data: existingRow } = await sb.from('teachers').select('*').eq('school_id', profile.id).ilike('username', teacher.username).maybeSingle();
              existingDbTeacher = existingRow;
            } catch(_) {}

            // Upsert teacher record — prefer local values if set, fall back to DB values
            await sb.from('teachers').upsert({
              school_id: profile.id,
              user_id: linkedUserId || (existingDbTeacher ? existingDbTeacher.user_id : null),
              employee_id: teacher.employeeId || (existingDbTeacher ? existingDbTeacher.employee_id : null),
              full_name: teacher.fullName || (existingDbTeacher ? existingDbTeacher.full_name : null),
              username: teacher.username,
              email: teacher.email || (existingDbTeacher ? existingDbTeacher.email : null),
              phone: teacher.phone || (existingDbTeacher ? existingDbTeacher.phone : null),
              qualification: teacher.qualification || (existingDbTeacher ? existingDbTeacher.qualification : null),
              experience: teacher.experience !== undefined && teacher.experience !== 0 ? teacher.experience : (existingDbTeacher ? existingDbTeacher.experience : 0),
              department: teacher.department || (existingDbTeacher ? existingDbTeacher.department : null),
              joining_date: teacher.joiningDate || (existingDbTeacher ? existingDbTeacher.joining_date : null),
              gender: teacher.gender || (existingDbTeacher ? existingDbTeacher.gender : null),
              status: 'active',
              verification_status: 'verified'
            }, { onConflict: 'school_id,username' });
          } catch (dbErr) {
            console.error("Database verify sync failed:", dbErr);
          }
        }

        saveAcademicState('campuslink_teachers', teachers);

        // Sync local communityMembers state so they instantly appear in Community Members -> Teachers tab
        const existingCmIdx = communityMembers.findIndex(m => m.user && m.user.username === teacher.username);
        const cmObj = {
          id: existingCmIdx >= 0 ? communityMembers[existingCmIdx].id : 'local-' + Date.now(),
          role: 'teacher',
          assigned_at: new Date().toISOString(),
          user: {
            id: existingCmIdx >= 0 ? communityMembers[existingCmIdx].user.id : 'user-' + Date.now(),
            username: teacher.username,
            full_name: teacher.fullName,
            user_type: 'teacher',
            school_id: profile.id || 'sch_001',
            is_verified: true
          }
        };

        if (existingCmIdx >= 0) {
          communityMembers[existingCmIdx] = cmObj;
        } else {
          communityMembers.push(cmObj);
        }
        saveState('campuslink_community_members', communityMembers);
        showToast(`Teacher "${teacher.fullName}" verified successfully.`);
        renderActiveTeachersTable();
        closeConfirmModal();
      };
    } else if (action === 'reject') {
      icon.textContent = '❌';
      title.textContent = 'Reject Teacher Profile';
      message.textContent = `Are you sure you want to reject ${teacher.fullName}'s verification request?`;
      btnAction.textContent = 'Reject';
      btnAction.className = 'btn btn-primary';
      btnAction.style.backgroundColor = '#EF4444';
      btnAction.style.borderColor = '#EF4444';
      confirmCallback = async () => {
        teacher.verificationStatus = 'pending';
        teacher.status = 'inactive';

        // Sync rejected status to database
        if (window.CampusLink && window.CampusLink.supabase && profile?.id) {
          const sb = window.CampusLink.supabase;
          try {
            await sb
              .from('teachers')
              .update({ verification_status: 'pending', status: 'inactive' })
              .eq('school_id', profile.id)
              .eq('username', teacher.username);
          } catch (dbErr) {
            console.error("Database reject sync failed:", dbErr);
          }
        }

        saveAcademicState('campuslink_teachers', teachers);
        showToast(`Teacher verification request rejected.`);
        renderActiveTeachersTable();
        closeConfirmModal();
      };
    }

    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  }

  function closeConfirmModal() {
    const modal = document.getElementById('teachers-confirm-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
    confirmCallback = null;
  }

  function openViewTeacherModal(id) {
    const t = teachers.find(item => item.id === id);
    if (!t) return;

    const photoLetter = t.fullName.charAt(0).toUpperCase();
    const statusClass = t.status === 'active' ? 'status-approved' : (t.status === 'suspended' ? 'status-rejected' : 'status-pending');
    const verifyBadge = t.verificationStatus === 'verified'
      ? `<span class="badge-status status-approved" style="font-size:0.75rem;">✓ Verified</span>`
      : `<span class="badge-status" style="background-color: rgba(245, 158, 11, 0.1); color: #D97706; font-size:0.75rem;">⚠ Pending Verification</span>`;

    const classList = (t.classes && t.classes.length > 0) ? t.classes.join(', ') : 'None';
    const sectionList = (t.sections && t.sections.length > 0) ? t.sections.join(', ') : 'None';
    const subjectList = (t.subjects && t.subjects.length > 0) ? t.subjects.join(', ') : 'None';

    const cardContent = `
      <div style="display: flex; gap: 16px; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
        <div style="width: 64px; height: 64px; border-radius: 50%; background-color: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.6rem;">${photoLetter}</div>
        <div>
          <h4 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--text-main);">${t.fullName}</h4>
          <p style="margin: 2px 0 6px 0; font-size: 0.85rem; color: var(--text-muted);">@${t.username}</p>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span class="badge-status ${statusClass}" style="text-transform: capitalize; font-size:0.75rem;">${t.status}</span>
            ${verifyBadge}
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px 24px; font-size: 0.88rem;">
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.78rem; margin-bottom: 2px;">CampusLink ID</span>
          <strong style="color: var(--text-main); font-family: monospace;">${t.campuslinkId}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.78rem; margin-bottom: 2px;">Employee ID</span>
          <strong style="color: var(--text-main); font-family: monospace;">${t.employeeId}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.78rem; margin-bottom: 2px;">Email Address</span>
          <strong style="color: var(--text-main);">${t.email}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.78rem; margin-bottom: 2px;">Phone Number</span>
          <strong style="color: var(--text-main);">${t.phone}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.78rem; margin-bottom: 2px;">Gender</span>
          <strong style="color: var(--text-main);">${t.gender}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.78rem; margin-bottom: 2px;">Joining Date</span>
          <strong style="color: var(--text-main);">${t.joiningDate || '-'}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.78rem; margin-bottom: 2px;">Qualification</span>
          <strong style="color: var(--text-main);">${t.qualification || '-'}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.78rem; margin-bottom: 2px;">Experience</span>
          <strong style="color: var(--text-main);">${t.experience ? t.experience + ' Years' : '-'}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.78rem; margin-bottom: 2px;">Department</span>
          <strong style="color: var(--text-main);">${t.department || '-'}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.78rem; margin-bottom: 2px;">Class Teacher</span>
          <strong style="color: var(--text-main);">${t.isClassTeacher ? `Yes (${t.classTeacherClass || '-'} - ${t.classTeacherSection || '-'})` : 'No'}</strong>
        </div>
      </div>

      <div style="border-top: 1px solid var(--border-color); padding-top: 16px; margin-top: 4px; display: flex; flex-direction: column; gap: 10px; font-size: 0.88rem;">
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.78rem; margin-bottom: 2px;">Assigned Classes</span>
          <strong style="color: var(--text-main);">${classList}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.78rem; margin-bottom: 2px;">Assigned Sections</span>
          <strong style="color: var(--text-main);">${sectionList}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.78rem; margin-bottom: 2px;">Assigned Subjects</span>
          <strong style="color: var(--text-main);">${subjectList}</strong>
        </div>
      </div>
    `;

    document.getElementById('teacher-profile-card-content').innerHTML = cardContent;

    const modal = document.getElementById('teachers-view-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  }

  function createAssignmentRow(clsVal = '', secVal = '', subVal = '') {
    const container = document.getElementById('teachers-assignments-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'assignment-row';
    row.style.cssText = 'display: flex; gap: 8px; align-items: center;';

    let classOptionsHtml = `<option value="">Select Class...</option>`;
    if (typeof classes !== 'undefined' && classes) {
      const uniqueClasses = Array.from(new Set(classes.map(c => c.name)));
      uniqueClasses.forEach(name => {
        const isSel = name === clsVal ? 'selected' : '';
        classOptionsHtml += `<option value="${name}" ${isSel}>${name}</option>`;
      });
    }

    let subjectOptionsHtml = `<option value="">Select Subject...</option>`;
    if (typeof subjects !== 'undefined' && subjects) {
      const uniqueSubjects = Array.from(new Set(subjects.map(s => s.name)));
      uniqueSubjects.forEach(name => {
        const isSel = name === subVal ? 'selected' : '';
        subjectOptionsHtml += `<option value="${name}" ${isSel}>${name}</option>`;
      });
    }

    row.innerHTML = `
      <select class="assignment-class-select" required style="flex: 2; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.82rem; outline: none; background: var(--white); color: var(--text-main); cursor: pointer;">
        ${classOptionsHtml}
      </select>
      <input type="text" class="assignment-section-input" placeholder="e.g. A" value="${secVal}" style="width: 70px; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.82rem; outline: none; background: var(--white); color: var(--text-main);">
      <select class="assignment-subject-select" style="flex: 2; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.82rem; outline: none; background: var(--white); color: var(--text-main); cursor: pointer;">
        ${subjectOptionsHtml}
      </select>
      <button type="button" class="btn-remove-assignment-row" style="background: none; border: none; color: #EF4444; font-size: 1.25rem; cursor: pointer; padding: 4px 8px; font-weight: 300; line-height: 1; outline: none;">&times;</button>
    `;

    row.querySelector('.btn-remove-assignment-row').onclick = () => {
      row.remove();
    };

    container.appendChild(row);
  }

  function openEditTeacherModal(id) {
    const title = document.getElementById('teachers-modal-title');
    const form = document.getElementById('teachers-form');
    form.reset();

    const warningSpan = document.getElementById('teachers-username-warning');
    if (warningSpan) warningSpan.style.display = 'none';

    // Clear assignments container
    const container = document.getElementById('teachers-assignments-container');
    if (container) container.innerHTML = '';

    // Populate Class Teacher Class Dropdown Options
    const ctClassSelect = document.getElementById('teachers-class-teacher-class');
    const ctDetailsContainer = document.getElementById('class-teacher-details-container');
    if (ctClassSelect) {
      let optionsHtml = `<option value="">Select Class...</option>`;
      if (typeof classes !== 'undefined' && classes) {
        const uniqueClasses = Array.from(new Set(classes.map(c => c.name)));
        uniqueClasses.forEach(name => {
          optionsHtml += `<option value="${name}">${name}</option>`;
        });
      }
      ctClassSelect.innerHTML = optionsHtml;
    }

    if (id) {
      const t = teachers.find(item => item.id === id);
      if (!t) return;
      title.textContent = "Edit Teacher Profile";
      document.getElementById('teachers-id').value = t.id;
      document.getElementById('teachers-fullname').value = t.fullName;
      document.getElementById('teachers-username').value = t.username;
      document.getElementById('teachers-empid').value = t.employeeId;
      document.getElementById('teachers-email').value = t.email;
      document.getElementById('teachers-phone').value = t.phone;
      document.getElementById('teachers-gender').value = t.gender || 'Male';
      document.getElementById('teachers-qualification').value = t.qualification || '';
      document.getElementById('teachers-experience').value = t.experience || '';
      document.getElementById('teachers-department').value = t.department || '';
      document.getElementById('teachers-joiningdate').value = t.joiningDate || '';
      document.getElementById('teachers-status').value = t.status || 'active';
      document.getElementById('teachers-verification').value = t.verificationStatus || 'pending';
      
      // Load assignments
      if (t.assignments && t.assignments.length > 0) {
        t.assignments.forEach(a => {
          createAssignmentRow(a.class, a.section, a.subject);
        });
      } else if (t.classes && t.classes.length > 0) {
        // Zip legacy arrays
        t.classes.forEach((cls, idx) => {
          const sec = t.sections && t.sections[idx] ? t.sections[idx] : '';
          const sub = t.subjects && t.subjects[idx] ? t.subjects[idx] : '';
          createAssignmentRow(cls, sec, sub);
        });
      } else {
        createAssignmentRow();
      }
      
      const isCT = !!t.isClassTeacher;
      document.getElementById('teachers-isclassteacher').checked = isCT;
      
      if (ctDetailsContainer) {
        if (isCT) {
          ctDetailsContainer.style.display = 'grid';
          if (ctClassSelect) {
            ctClassSelect.value = t.classTeacherClass || '';
            ctClassSelect.required = true;
          }
          const ctSecInput = document.getElementById('teachers-class-teacher-section');
          if (ctSecInput) {
            ctSecInput.value = t.classTeacherSection || '';
            ctSecInput.required = true;
          }
        } else {
          ctDetailsContainer.style.display = 'none';
          if (ctClassSelect) {
            ctClassSelect.value = '';
            ctClassSelect.required = false;
          }
          const ctSecInput = document.getElementById('teachers-class-teacher-section');
          if (ctSecInput) {
            ctSecInput.value = '';
            ctSecInput.required = false;
          }
        }
      }
    } else {
      title.textContent = "Add Teacher Account";
      document.getElementById('teachers-id').value = '';
      document.getElementById('teachers-gender').value = 'Male';
      document.getElementById('teachers-status').value = 'active';
      document.getElementById('teachers-verification').value = 'verified';
      document.getElementById('teachers-isclassteacher').checked = false;
      
      if (ctDetailsContainer) {
        ctDetailsContainer.style.display = 'none';
        if (ctClassSelect) {
          ctClassSelect.value = '';
          ctClassSelect.required = false;
        }
        const ctSecInput = document.getElementById('teachers-class-teacher-section');
        if (ctSecInput) {
          ctSecInput.value = '';
          ctSecInput.required = false;
        }
      }
      
      // Default blank row
      createAssignmentRow();
    }

    const modal = document.getElementById('teachers-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  }

  let teachersListenersAttached = false;

  function setupTeachersEventListeners() {
    if (teachersListenersAttached) return;
    teachersListenersAttached = true;

    // 1. Subtab clicks
    document.querySelectorAll('.teachers-subtab-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.teachers-subtab-btn').forEach(b => {
          b.classList.remove('active');
          b.style.color = 'var(--text-muted)';
          b.style.borderBottom = '3px solid transparent';
          b.style.fontWeight = '500';
        });
        btn.classList.add('active');
        btn.style.color = 'var(--primary)';
        btn.style.borderBottom = '3px solid var(--primary)';
        btn.style.fontWeight = '700';

        activeTeachersSubtab = btn.getAttribute('data-subtab');
        
        // Hide all subtab panels
        document.querySelectorAll('.teachers-subtab-panel').forEach(p => p.style.display = 'none');
        // Show correct subtab panel
        const panel = document.getElementById(`teachers-subtab-panel-${activeTeachersSubtab}`);
        if (panel) panel.style.display = 'block';

        renderActiveTeachersTable();
      };
    });

    // 2. Filters & search
    const searchInput = document.getElementById('teachers-search-input');
    if (searchInput) {
      searchInput.oninput = renderActiveTeachersTable;
    }
    document.querySelectorAll('.teachers-filter-select').forEach(sel => {
      sel.onchange = renderActiveTeachersTable;
    });

    // Username input change/autofill listener
    const usernameInput = document.getElementById('teachers-username');
    const warningSpan = document.getElementById('teachers-username-warning');
    let usernameValidationTimeout;
    if (usernameInput) {
      usernameInput.addEventListener('input', (e) => {
        // Clear any previous pending validation
        clearTimeout(usernameValidationTimeout);

        // Only validate/autofill if we are in "Create" mode (id is empty)
        const idVal = document.getElementById('teachers-id').value;
        if (idVal) return;

        const val = e.target.value.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');

        if (!val) {
          if (warningSpan) warningSpan.style.display = 'none';
          return;
        }

        // Debounce before querying Supabase
        usernameValidationTimeout = setTimeout(async () => {
          // Check if the input value has changed while we were waiting
          const currentVal = usernameInput.value.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
          if (currentVal !== val) return;

          // Search in local mock database first (case-insensitive)
          let matchedUser = allPlatformUsers.find(u => u.username.toLowerCase() === val.toLowerCase());
          
          // Dynamically query Supabase public.profiles if connected (case-insensitive)
          if (!matchedUser && window.CampusLink && window.CampusLink.supabase) {
            try {
              const sb = window.CampusLink.supabase;
              const { data, error } = await sb
                .from('profiles')
                .select('id, username, full_name, email')
                .ilike('username', val)
                .maybeSingle();

              // Verify again that the input value hasn't changed during the async database call
              if (usernameInput.value.trim().toLowerCase().replace(/[^a-z0-9._]/g, '') !== val) return;

              if (!error && data) {
                matchedUser = {
                  username: data.username,
                  fullName: data.full_name || '',
                  email: data.email || (data.username + '@school.com'),
                  phone: '',
                  gender: 'Male',
                  qualification: '',
                  experience: '',
                  department: ''
                };
              }
            } catch (sbErr) {
              console.warn("Failed to check username on Supabase:", sbErr);
            }
          }

          if (!matchedUser && typeof communityMembers !== 'undefined' && communityMembers) {
            const cm = communityMembers.find(m => m.user && m.user.username.toLowerCase() === val.toLowerCase());
            if (cm && cm.user) {
              matchedUser = {
                username: cm.user.username,
                fullName: cm.user.full_name,
                email: cm.user.email || (cm.user.username + '@school.com'),
                phone: cm.user.phone || '',
                gender: cm.user.gender || 'Male'
              };
            }
          }

          if (!matchedUser && typeof teachers !== 'undefined' && teachers) {
            const t = teachers.find(item => item.username.toLowerCase() === val.toLowerCase());
            if (t) {
              matchedUser = t;
            }
          }

          // Double check input value once more before applying changes
          if (usernameInput.value.trim().toLowerCase().replace(/[^a-z0-9._]/g, '') !== val) return;

          if (matchedUser) {
            if (warningSpan) warningSpan.style.display = 'none';

            // Autofill fields
            const fullNameInput = document.getElementById('teachers-fullname');
            if (fullNameInput) {
              fullNameInput.value = matchedUser.fullName || matchedUser.fullName || '';
            }

            const emailInput = document.getElementById('teachers-email');
            if (emailInput) {
              emailInput.value = matchedUser.email || '';
            }

            const phoneInput = document.getElementById('teachers-phone');
            if (phoneInput) {
              phoneInput.value = matchedUser.phone || '';
            }

            const genderInput = document.getElementById('teachers-gender');
            if (genderInput && matchedUser.gender) {
              // Capitalize gender value to match select option
              const gVal = matchedUser.gender.charAt(0).toUpperCase() + matchedUser.gender.slice(1).toLowerCase();
              genderInput.value = gVal;
            }

            const qualInput = document.getElementById('teachers-qualification');
            if (qualInput) {
              qualInput.value = matchedUser.qualification || '';
            }

            const expInput = document.getElementById('teachers-experience');
            if (expInput) {
              expInput.value = matchedUser.experience || '';
            }

            const deptInput = document.getElementById('teachers-department');
            if (deptInput) {
              deptInput.value = matchedUser.department || '';
            }
          } else {
            // Username not found - show red warning
            if (warningSpan) {
              warningSpan.style.display = 'block';
            }
          }
        }, 300);
      });
    }

    // 3. Modal close buttons
    document.querySelectorAll('.teachers-modal-close').forEach(btn => {
      btn.onclick = () => {
        const modalId = btn.getAttribute('data-modal');
        const modal = document.getElementById(modalId);
        if (modal) {
          modal.style.display = 'none';
          modal.classList.remove('active');
        }
      };
    });

    // 4. Modal click backdrop dismissals
    const modals = ['teachers-modal', 'teachers-view-modal', 'teachers-confirm-modal'];
    modals.forEach(id => {
      const modal = document.getElementById(id);
      if (modal) {
        modal.onclick = (e) => {
          if (e.target === modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
          }
        };
      }
    });

    // 5. Add button click
    const btnAdd = document.getElementById('btn-add-teacher');
    if (btnAdd) {
      btnAdd.onclick = () => openEditTeacherModal('');
    }

    // Add assignment row click button
    const btnAddRow = document.getElementById('btn-add-assignment-row');
    if (btnAddRow) {
      btnAddRow.onclick = () => {
        createAssignmentRow();
      };
    }

    // Class teacher checkbox toggle listener
    const cbClassTeacher = document.getElementById('teachers-isclassteacher');
    const containerCT = document.getElementById('class-teacher-details-container');
    if (cbClassTeacher && containerCT) {
      cbClassTeacher.onchange = (e) => {
        const ctClassSelect = document.getElementById('teachers-class-teacher-class');
        const ctSecInput = document.getElementById('teachers-class-teacher-section');
        if (e.target.checked) {
          containerCT.style.display = 'grid';
          if (ctClassSelect) ctClassSelect.required = true;
          if (ctSecInput) ctSecInput.required = true;
        } else {
          containerCT.style.display = 'none';
          if (ctClassSelect) {
            ctClassSelect.value = '';
            ctClassSelect.required = false;
          }
          if (ctSecInput) {
            ctSecInput.value = '';
            ctSecInput.required = false;
          }
        }
      };
    }

    // 6. Confirmation buttons
    const btnCancel = document.getElementById('confirm-btn-cancel');
    if (btnCancel) btnCancel.onclick = closeConfirmModal;
    const btnConfirmAction = document.getElementById('confirm-btn-action');
    if (btnConfirmAction) {
      btnConfirmAction.onclick = () => {
        if (typeof confirmCallback === 'function') {
          confirmCallback();
        }
      };
    }

    // 7. Form submission submit
    const form = document.getElementById('teachers-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        
        const warningSpan = document.getElementById('teachers-username-warning');
        if (warningSpan && warningSpan.style.display === 'block') {
          showToast("Cannot save: Username does not exist in the system.", "error");
          return;
        }
        
        const id = document.getElementById('teachers-id').value;
        const fullName = document.getElementById('teachers-fullname').value.trim();
        const username = document.getElementById('teachers-username').value.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
        const employeeId = document.getElementById('teachers-empid').value.trim();
        const email = document.getElementById('teachers-email').value.trim();
        const phone = document.getElementById('teachers-phone').value.trim();
        const gender = document.getElementById('teachers-gender').value;
        const qualification = document.getElementById('teachers-qualification').value.trim();
        const experience = parseInt(document.getElementById('teachers-experience').value) || 0;
        const department = document.getElementById('teachers-department').value.trim();
        const joiningDate = document.getElementById('teachers-joiningdate').value;
        const status = document.getElementById('teachers-status').value;
        const verificationStatus = document.getElementById('teachers-verification').value;

        // Parse dynamic classroom assignments rows
        const assignments = [];
        document.querySelectorAll('.assignment-row').forEach(row => {
          const cls = row.querySelector('.assignment-class-select').value;
          const sec = row.querySelector('.assignment-section-input').value.trim();
          const sub = row.querySelector('.assignment-subject-select').value;
          if (cls) {
            assignments.push({ class: cls, section: sec, subject: sub });
          }
        });

        const classesVal = Array.from(new Set(assignments.map(a => a.class)));
        const sectionsVal = Array.from(new Set(assignments.map(a => a.section).filter(Boolean)));
        const subjectsVal = Array.from(new Set(assignments.map(a => a.subject).filter(Boolean)));
        const isClassTeacher = document.getElementById('teachers-isclassteacher').checked;
        const classTeacherClass = isClassTeacher ? document.getElementById('teachers-class-teacher-class').value : '';
        const classTeacherSection = isClassTeacher ? document.getElementById('teachers-class-teacher-section').value.trim() : '';

        // --- Supabase Database Sync ---
        if (window.CampusLink && window.CampusLink.supabase && profile?.id) {
          const sb = window.CampusLink.supabase;
          
          // 1. Link profile to school via secure definer RPC function
          try {
            await sb.rpc('link_teacher_to_school', {
              teacher_username: username,
              target_school_id: profile.id,
              assigned_by_id: session?.user?.id || profile.admin_user_id
            });
          } catch (rpcErr) {
            console.error("RPC profile link failed:", rpcErr);
          }

          // 2. Fetch target user profile ID for mapping
          let linkedUserId = null;
          try {
            const { data: userProf } = await sb
              .from('profiles')
              .select('id')
              .ilike('username', username)
              .maybeSingle();
            
            if (userProf) linkedUserId = userProf.id;
          } catch (uErr) {
            console.error("Failed to fetch linked user ID:", uErr);
          }

          // 3. Upsert teacher record in database
          try {
            const { error: upsertErr } = await sb
              .from('teachers')
              .upsert({
                school_id: profile.id,
                user_id: linkedUserId,
                employee_id: employeeId,
                full_name: fullName,
                username: username,
                email: email,
                phone: phone,
                qualification: qualification,
                experience: experience,
                department: department,
                joining_date: joiningDate || null,
                gender: gender,
                status: status,
                verification_status: verificationStatus
              }, { onConflict: 'school_id,username' });

            if (upsertErr) {
              console.error("Failed to upsert teacher details in DB:", upsertErr);
            } else if (linkedUserId) {
              // Sync class teacher assignment and classrooms in database
              try {
                // First, clear this teacher from any classes they were previously class teacher of
                await sb
                  .from('classes')
                  .update({ class_teacher_id: null })
                  .eq('school_id', profile.id)
                  .eq('class_teacher_id', linkedUserId);
                
                // Clear this teacher from classrooms
                await sb
                  .from('classrooms')
                  .update({ class_teacher_id: null })
                  .eq('school_id', profile.id)
                  .eq('class_teacher_id', linkedUserId);

                if (isClassTeacher && classTeacherClass) {
                  // Find the class row in Supabase
                  const { data: classRows } = await sb
                    .from('classes')
                    .select('*')
                    .eq('school_id', profile.id)
                    .eq('name', classTeacherClass)
                    .eq('section', classTeacherSection);
                  
                  if (classRows && classRows.length > 0) {
                    const targetClass = classRows[0];
                    
                    // Update class_teacher_id on the class
                    await sb
                      .from('classes')
                      .update({ class_teacher_id: linkedUserId })
                      .eq('id', targetClass.id);

                    // Upsert classroom record in Supabase
                    const { data: existingClassrooms } = await sb
                      .from('classrooms')
                      .select('id')
                      .eq('school_id', profile.id)
                      .eq('class_id', targetClass.id)
                      .eq('section', classTeacherSection);

                    if (existingClassrooms && existingClassrooms.length > 0) {
                      await sb
                        .from('classrooms')
                        .update({
                          class_teacher_id: linkedUserId,
                          status: 'active'
                        })
                        .eq('id', existingClassrooms[0].id);
                    } else {
                      await sb
                        .from('classrooms')
                        .insert({
                          school_id: profile.id,
                          academic_year_id: targetClass.academic_year_id,
                          class_id: targetClass.id,
                          section: classTeacherSection,
                          class_teacher_id: linkedUserId,
                          room: 'Room ' + (targetClass.name.replace(/\D/g, '') || '101') + (classTeacherSection || ''),
                          status: 'active'
                        });
                    }
                  }
                }
              } catch (teacherClassSyncErr) {
                console.error("Failed to sync teacher class teacher assignment:", teacherClassSyncErr);
              }
            }
          } catch (dbErr) {
            console.error("Database save failed for teacher details:", dbErr);
          }
        }

        // --- Local State Sync ---
        if (id) {
          // Edit
          const t = teachers.find(item => item.id === id);
          if (t) {
            t.fullName = fullName;
            t.username = username;
            t.employeeId = employeeId;
            t.email = email;
            t.phone = phone;
            t.gender = gender;
            t.qualification = qualification;
            t.experience = experience;
            t.department = department;
            t.joiningDate = joiningDate;
            t.status = status;
            t.verificationStatus = verificationStatus;
            t.assignments = assignments;
            t.classes = classesVal;
            t.sections = sectionsVal;
            t.subjects = subjectsVal;
            t.isClassTeacher = isClassTeacher;
            t.classTeacherClass = classTeacherClass;
            t.classTeacherSection = classTeacherSection;
            t.updatedAt = new Date().toISOString();
          }
        } else {
          // Create
          const randomIdNum = Math.floor(1000 + Math.random() * 9000);
          const newT = {
            id: 'tch_' + Date.now(),
            schoolId: profile.id || 'sch_001',
            username,
            campuslinkId: 'CL-TCH-' + randomIdNum,
            employeeId,
            fullName,
            email,
            phone,
            qualification,
            experience,
            department,
            gender,
            joiningDate,
            assignments,
            classes: classesVal,
            sections: sectionsVal,
            subjects: subjectsVal,
            isClassTeacher,
            classTeacherClass,
            classTeacherSection,
            status,
            verificationStatus,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          teachers.push(newT);
        }

        saveAcademicState('campuslink_teachers', teachers);

        // Sync local communityMembers state so they instantly appear in Community Members -> Teachers tab
        const existingCmIdx = communityMembers.findIndex(m => m.user && m.user.username === username);
        const cmObj = {
          id: existingCmIdx >= 0 ? communityMembers[existingCmIdx].id : 'local-' + Date.now(),
          role: 'teacher',
          assigned_at: new Date().toISOString(),
          user: {
            id: existingCmIdx >= 0 ? communityMembers[existingCmIdx].user.id : 'user-' + Date.now(),
            username,
            full_name: fullName,
            user_type: 'teacher',
            school_id: profile.id || 'sch_001',
            is_verified: true
          }
        };

        if (existingCmIdx >= 0) {
          communityMembers[existingCmIdx] = cmObj;
        } else {
          communityMembers.push(cmObj);
        }
        saveState('campuslink_community_members', communityMembers);
        
        const modal = document.getElementById('teachers-modal');
        if (modal) {
          modal.style.display = 'none';
          modal.classList.remove('active');
        }

        showToast("Teacher record saved successfully!");
        renderActiveTeachersTable();
      };
    }
  }

  // ─── Teacher Invitations State & Functions ──────────────────────────────────
  let teacherInvites = [];

  async function loadTeacherInvites() {
    // 1. Always load from localStorage first so we have locally generated links
    const raw = localStorage.getItem('campuslink_teacher_invites');
    teacherInvites = raw ? JSON.parse(raw) : [];

    // 2. Fetch from Supabase and merge
    if (window.CampusLink && window.CampusLink.supabase && profile?.id) {
      try {
        const sb = window.CampusLink.supabase;
        const { data, error } = await sb
          .from('teacher_invitations')
          .select('*')
          .eq('school_id', profile.id)
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          data.forEach(d => {
            const exists = teacherInvites.some(i => i.inviteCode === d.invite_code || i.id === d.id);
            if (!exists) {
              teacherInvites.push({
                id: d.id,
                schoolId: d.school_id,
                inviteCode: d.invite_code,
                status: d.status,
                createdAt: d.created_at
              });
            }
          });
          // Sort descending by createdAt
          teacherInvites.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          saveAcademicState('campuslink_teacher_invites', teacherInvites);
        }
      } catch (err) {
        console.warn("Failed to load teacher invites from database:", err);
      }
    }
  }

  function renderTeacherInviteLinks() {
    loadTeacherInvites().then(() => {
      const searchVal = (document.getElementById('teacher-invite-search')?.value || '').toLowerCase().trim();
      const statusFilter = document.getElementById('teacher-invite-status-filter')?.value || '';
      const tbody = document.getElementById('teacher-invites-tbody');
      if (!tbody) return;

      const filtered = teacherInvites.filter(inv => {
        const codeMatch = inv.inviteCode.toLowerCase().includes(searchVal);
        const statusMatch = !statusFilter || inv.status === statusFilter;
        return codeMatch && statusMatch;
      });

      // Update count
      const countEl = document.getElementById('teacher-invites-count');
      if (countEl) countEl.textContent = `${filtered.length} invitations generated`;

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--text-muted);">No teacher invitations found.</td></tr>`;
        return;
      }

      tbody.innerHTML = filtered.map(inv => {
        const formattedDate = new Date(inv.createdAt).toLocaleDateString(undefined, {
          year: 'numeric', month: 'short', day: 'numeric'
        });
        const statusColor = inv.status === 'active' ? '#10B981' : '#EF4444';
        const disableBtnText = inv.status === 'active' ? 'Disable' : 'Enable';
        const disableBtnStyle = inv.status === 'active' 
          ? 'background:#FFFBEB;color:#D97706;border:1px solid #FEF3C7;' 
          : 'background:#ECFDF5;color:#059669;border:1px solid #D1FAE5;';

        return `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 12px 16px;">
              <span style="font-family: monospace; font-weight: 700; color: var(--dark-bg); font-size: 0.9rem;">${inv.inviteCode}</span>
            </td>
            <td style="padding: 12px 16px;">
              <span style="display:inline-flex; align-items:center; gap:5px; font-weight:700; font-size:0.75rem; color:${statusColor};">
                <span style="display:inline-block; width:6px; height:6px; background:${statusColor}; border-radius:50%;"></span>
                ${inv.status.toUpperCase()}
              </span>
            </td>
            <td style="padding: 12px 16px; font-size: 0.8rem; color: var(--text-muted);">${formattedDate}</td>
            <td style="padding: 12px 16px;">
              <div style="display: flex; gap: 6px;">
                <button class="btn-teacher-invite-copy" data-code="${inv.inviteCode}" style="padding: 4px 8px; font-size: 0.72rem; background: #EEF2FF; color: #4F46E5; border: none; border-radius: 4px; cursor: pointer;">Copy</button>
                <button class="btn-teacher-invite-qr" data-code="${inv.inviteCode}" style="padding: 4px 8px; font-size: 0.72rem; background: #FFF7ED; color: #C2410C; border: none; border-radius: 4px; cursor: pointer;">QR</button>
                <button class="btn-teacher-invite-toggle" data-id="${inv.id}" style="padding: 4px 8px; font-size: 0.72rem; border-radius: 4px; cursor: pointer; ${disableBtnStyle}">${disableBtnText}</button>
                <button class="btn-teacher-invite-delete" data-id="${inv.id}" style="padding: 4px 8px; font-size: 0.72rem; background: #FEF2F2; color: #DC2626; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
                <button class="btn-teacher-invite-browse" data-code="${inv.inviteCode}" style="padding: 4px 8px; font-size: 0.72rem; background: #F1F5F9; color: #475569; border: none; border-radius: 4px; cursor: pointer;">Registered</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // Bind events
      tbody.querySelectorAll('.btn-teacher-invite-copy').forEach(btn => {
        btn.onclick = () => {
          const code = btn.dataset.code;
          const link = window.location.origin + '/join-school.html?code=' + code;
          navigator.clipboard.writeText(link).then(() => {
            showToast('Invitation link copied to clipboard!');
          });
        };
      });

      tbody.querySelectorAll('.btn-teacher-invite-qr').forEach(btn => {
        btn.onclick = () => {
          openTeacherQRModal(btn.dataset.code);
        };
      });

      tbody.querySelectorAll('.btn-teacher-invite-toggle').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.dataset.id;
          const inv = teacherInvites.find(i => i.id === id);
          if (inv) {
            const nextStatus = inv.status === 'active' ? 'disabled' : 'active';
            if (window.CampusLink && window.CampusLink.supabase) {
              const sb = window.CampusLink.supabase;
              try {
                await sb.from('teacher_invitations').update({ status: nextStatus }).eq('id', id);
              } catch (dbErr) {
                console.error("Database update status failed:", dbErr);
              }
            }
            inv.status = nextStatus;
            saveAcademicState('campuslink_teacher_invites', teacherInvites);
            renderTeacherInviteLinks();
            showToast('Invitation status updated.');
          }
        };
      });

      tbody.querySelectorAll('.btn-teacher-invite-delete').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.dataset.id;
          if (confirm('Are you sure you want to delete this invitation link?')) {
            if (window.CampusLink && window.CampusLink.supabase) {
              const sb = window.CampusLink.supabase;
              try {
                await sb.from('teacher_invitations').delete().eq('id', id);
              } catch (dbErr) {
                console.error("Database delete failed:", dbErr);
              }
            }
            teacherInvites = teacherInvites.filter(i => i.id !== id);
            saveAcademicState('campuslink_teacher_invites', teacherInvites);
            renderTeacherInviteLinks();
            showToast('Invitation link deleted.', 'info');
          }
        };
      });

      tbody.querySelectorAll('.btn-teacher-invite-browse').forEach(btn => {
        btn.onclick = () => {
          openBrowseTeachersModal(btn.dataset.code);
        };
      });
    });
  }

  function openTeacherInviteModal() {
    const formScreen = document.getElementById('teacher-invite-form-screen');
    const successScreen = document.getElementById('teacher-invite-success-screen');
    if (formScreen) formScreen.style.display = 'flex';
    if (successScreen) successScreen.style.display = 'none';

    const modal = document.getElementById('teacher-invite-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  }

  async function handleGenerateTeacherInvite() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codeRand = '';
    for (let i = 0; i < 5; i++) {
      codeRand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = 'TCH-' + codeRand;

    const newInvite = {
      id: 'inv_t_' + Date.now(),
      schoolId: profile.id || 'sch_001',
      inviteCode: code,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    if (window.CampusLink && window.CampusLink.supabase && profile?.id) {
      const sb = window.CampusLink.supabase;
      try {
        const { data, error } = await sb.from('teacher_invitations').insert({
          school_id: profile.id,
          invite_code: code,
          status: 'active'
        }).select().single();
        if (!error && data) {
          newInvite.id = data.id;
        }
      } catch (dbErr) {
        console.error("Database invite save failed:", dbErr);
      }
    }

    teacherInvites.unshift(newInvite);
    saveAcademicState('campuslink_teacher_invites', teacherInvites);

    const formScreen = document.getElementById('teacher-invite-form-screen');
    const successScreen = document.getElementById('teacher-invite-success-screen');
    if (formScreen) formScreen.style.display = 'none';
    if (successScreen) successScreen.style.display = 'flex';

    document.getElementById('success-teacher-invite-code').textContent = code;
    
    const shareLink = window.location.origin + '/join-school.html?code=' + code;
    document.getElementById('success-teacher-invite-link').value = shareLink;

    document.getElementById('btn-copy-teacher-success-link').onclick = () => {
      navigator.clipboard.writeText(shareLink).then(() => {
        showToast('Invitation link copied to clipboard!');
      });
    };

    document.getElementById('btn-show-teacher-success-qr').onclick = () => {
      openTeacherQRModal(code);
    };

    document.getElementById('btn-disable-teacher-success-invite').onclick = async () => {
      if (window.CampusLink && window.CampusLink.supabase) {
        const sb = window.CampusLink.supabase;
        try {
          await sb.from('teacher_invitations').update({ status: 'disabled' }).eq('id', newInvite.id);
        } catch (dbErr) {
          console.error("Database update status failed:", dbErr);
        }
      }
      newInvite.status = 'disabled';
      saveAcademicState('campuslink_teacher_invites', teacherInvites);
      showToast('Invitation link disabled.');
      if (activeTeachersSubtab === 'invite-links') renderTeacherInviteLinks();
    };

    document.getElementById('btn-generate-teacher-another').onclick = () => {
      openTeacherInviteModal();
    };

    if (activeTeachersSubtab === 'invite-links') renderTeacherInviteLinks();
    showToast('Invitation link generated successfully.');
  }

  function openTeacherQRModal(code) {
    const modal = document.getElementById('teacher-qr-modal');
    if (!modal) return;

    document.getElementById('teacher-qr-modal-code').textContent = code;

    const inviteUrl = window.location.origin + '/join-school.html?code=' + code;
    const linkEl = document.getElementById('teacher-qr-modal-link');
    if (linkEl) linkEl.textContent = inviteUrl;

    modal.style.display = 'flex';
    modal.classList.add('active');

    const copyBtn = document.getElementById('teacher-qr-copy-link-btn');
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(inviteUrl).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
        });
      };
    }

    function renderQR() {
      const canvas = document.getElementById('teacher-qr-canvas');
      if (!canvas) return;
      QRCode.toCanvas(canvas, inviteUrl, {
        width: 220,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
        errorCorrectionLevel: 'H'
      }, function(err) {
        if (err) console.error('QR render error:', err);
        const dlBtn = document.getElementById('teacher-qr-download-btn');
        if (dlBtn) {
          dlBtn.onclick = () => {
            const link = document.createElement('a');
            link.download = 'teacher-invite-' + code + '.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
          };
        }
      });
    }

    if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
      renderQR();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js';
      script.onload = renderQR;
      document.head.appendChild(script);
    }
  }

  function openBrowseTeachersModal(code) {
    const modal = document.getElementById('teacher-browse-invite-modal');
    if (!modal) return;

    document.getElementById('teacher-browse-modal-subtitle').textContent = 'Invite Code: ' + code;

    const searchInput = document.getElementById('teacher-browse-modal-search');
    if (searchInput) searchInput.value = '';

    function renderBrowseRows() {
      const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
      const matching = teachers.filter(t => {
        const codeMatch = (t.inviteCode || '').trim().toUpperCase() === code.trim().toUpperCase();
        const searchMatch = !query || 
          t.fullName.toLowerCase().includes(query) || 
          t.username.toLowerCase().includes(query);
        return codeMatch && searchMatch;
      });

      const tbody = document.getElementById('teacher-browse-modal-tbody');
      if (!tbody) return;

      if (matching.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--text-muted);">No registered teachers found using this code.</td></tr>';
        return;
      }

      tbody.innerHTML = matching.map(t => {
        const verifyBadge = t.verificationStatus === 'verified'
          ? `<span class="badge-status status-approved">Verified</span>`
          : `<span class="badge-status" style="background-color: rgba(245, 158, 11, 0.1); color: #D97706;">Pending</span>`;
        const joinedDate = t.joiningDate || new Date(t.createdAt || Date.now()).toLocaleDateString();

        const teacherCell = `
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background-color: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;">
              ${t.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-weight:700;color:#0f172a;">${t.fullName}</div>
              <div style="font-size:0.75rem;color:var(--text-muted);">${t.email || ''}</div>
            </div>
          </div>
        `;

        return `
          <tr style="border-bottom:1px solid var(--border-color);">
            <td style="padding:12px 16px;">${teacherCell}</td>
            <td style="padding:12px 16px;font-family:monospace;color:#1e293b;">@${t.username}</td>
            <td style="padding:12px 16px;">${verifyBadge}</td>
            <td style="padding:12px 16px;color:var(--text-muted);">${joinedDate}</td>
          </tr>
        `;
      }).join('');
    }

    if (searchInput) {
      searchInput.oninput = renderBrowseRows;
    }

    renderBrowseRows();
    modal.style.display = 'flex';
    modal.classList.add('active');
  }

  window.initTeachersTab = function() {
    setupTeachersEventListeners();
    
    // Bind Teacher Invite Actions
    const btnInviteTrigger = document.getElementById('btn-invite-teachers-trigger');
    if (btnInviteTrigger) btnInviteTrigger.onclick = openTeacherInviteModal;

    const actionToggle = document.getElementById('btn-teacher-actions-toggle');
    const actionMenu = document.getElementById('teacher-actions-dropdown-menu');
    if (actionToggle && actionMenu) {
      actionToggle.onclick = (e) => {
        e.stopPropagation();
        actionMenu.style.display = actionMenu.style.display === 'block' ? 'none' : 'block';
      };
      document.addEventListener('click', () => { actionMenu.style.display = 'none'; });
    }

    const btnDropdownInvite = document.getElementById('btn-dropdown-invite-teachers');
    if (btnDropdownInvite) {
      btnDropdownInvite.onclick = () => {
        if (actionMenu) actionMenu.style.display = 'none';
        openTeacherInviteModal();
      };
    }

    const btnDropdownAddManual = document.getElementById('btn-dropdown-add-teacher-manual');
    if (btnDropdownAddManual) {
      btnDropdownAddManual.onclick = () => {
        if (actionMenu) actionMenu.style.display = 'none';
        openEditTeacherModal('');
      };
    }

    const btnGenInvite = document.getElementById('btn-generate-teacher-invite-link');
    if (btnGenInvite) btnGenInvite.onclick = handleGenerateTeacherInvite;

    const inviteSearch = document.getElementById('teacher-invite-search');
    if (inviteSearch) inviteSearch.oninput = renderTeacherInviteLinks;

    const inviteFilter = document.getElementById('teacher-invite-status-filter');
    if (inviteFilter) inviteFilter.onchange = renderTeacherInviteLinks;

    // teacher-modal-close buttons
    document.querySelectorAll('.teacher-modal-close').forEach(btn => {
      btn.onclick = () => {
        const modalId = btn.getAttribute('data-modal');
        const modal = document.getElementById(modalId);
        if (modal) {
          modal.style.display = 'none';
          modal.classList.remove('active');
        }
      };
    });

    // Backdrop clicks for teacher modals
    ['teacher-invite-modal', 'teacher-qr-modal', 'teacher-browse-invite-modal'].forEach(id => {
      const modal = document.getElementById(id);
      if (modal) {
        modal.addEventListener('click', (ev) => {
          if (ev.target === modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
          }
        });
      }
    });

    syncTeachersFromSupabase().then(() => {
      renderActiveTeachersTable();
    });
  };

  // Run event listeners setup immediately
  setupAcademicEventListeners();

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

// ================================================================
// ALUMNI TAB — Full Implementation
// ================================================================
(function() {
  let alumniList = [];
  let alumniInvites = [];
  let alumniRequests = [];
  let alumniCurrentSubtab = 'all-alumni';
  let alumniInitialized = false;

  // ── Helpers ────────────────────────────────────────────────────
  function loadAlumni() {
    try {
      const raw = localStorage.getItem('campuslink_alumni');
      let list = raw ? JSON.parse(raw) : [];
      const profile = getProfile();
      const isLiveMode = window.CampusLink?.supabase && (localStorage.getItem('supabase.auth.token') || sessionStorage.getItem('sb-'));
      if (isLiveMode && profile && profile.id) {
        list = list.filter(a => a.schoolId === profile.id || a.school_id === profile.id);
      }
      alumniList = list;
    } catch(e) { alumniList = []; }
  }
  function saveAlumni() {
    localStorage.setItem('campuslink_alumni', JSON.stringify(alumniList));
  }
  function loadAlumniInvites() {
    try {
      const raw = localStorage.getItem('campuslink_alumni_invites');
      let list = raw ? JSON.parse(raw) : [];
      const profile = getProfile();
      const isLiveMode = window.CampusLink?.supabase && (localStorage.getItem('supabase.auth.token') || sessionStorage.getItem('sb-'));
      if (isLiveMode && profile && profile.id) {
        list = list.filter(i => i.schoolId === profile.id || i.school_id === profile.id);
      }
      alumniInvites = list;
    } catch(e) { alumniInvites = []; }
  }
  function saveAlumniInvites() {
    localStorage.setItem('campuslink_alumni_invites', JSON.stringify(alumniInvites));
  }
  function loadAlumniRequests() {
    try {
      const raw = localStorage.getItem('campuslink_alumni_requests');
      let list = raw ? JSON.parse(raw) : [];
      const profile = getProfile();
      const isLiveMode = window.CampusLink?.supabase && (localStorage.getItem('supabase.auth.token') || sessionStorage.getItem('sb-'));
      if (isLiveMode && profile && profile.id) {
        list = list.filter(r => r.schoolId === profile.id || r.school_id === profile.id);
      }
      alumniRequests = list;
    } catch(e) { alumniRequests = []; }
  }
  function saveAlumniRequests() {
    localStorage.setItem('campuslink_alumni_requests', JSON.stringify(alumniRequests));
  }


  function getProfile() {
    try { return JSON.parse(localStorage.getItem('campuslink_profile')) || {}; } catch(e) { return {}; }
  }

  function generateAlumniCode() {
    return 'ALM-' + Math.random().toString(36).substring(2,7).toUpperCase();
  }

  function formatYear(y) { return y ? String(y) : '—'; }

  function statusBadge(status) {
    const map = {
      verified: 'status-approved',
      pending:  'status-pending',
      inactive: 'status-rejected'
    };
    return `<span class="badge-status ${map[status] || 'status-pending'}" style="text-transform:capitalize;font-size:0.73rem;">${status || 'pending'}</span>`;
  }

  // ── Supabase Sync ──────────────────────────────────────────────
  async function syncAlumniFromSupabase() {
    const sb = window.CampusLink && window.CampusLink.supabase;
    const profile = getProfile();
    if (!sb || !profile || !profile.id || profile.id === 'super-admin-global') return;
    try {
      const { data: rows, error } = await sb
        .from('profiles')
        .select('*')
        .eq('school_id', profile.id)
        .eq('user_type', 'alumni');
      if (error) { console.warn('Alumni Supabase sync error:', error); return; }
      if (rows) {
        alumniList = rows.map(r => ({
          id: r.id,
          schoolId: r.school_id,
          userId: r.id,
          campuslinkId: r.campuslink_id || ('CL-ALM-' + r.id.substring(0, 6).toUpperCase()),
          fullName: r.full_name || '',
          username: r.username || '',
          email: r.email || '',
          phone: r.phone || '',
          gender: r.gender || '',
          graduatingYear: r.passing_year || null,
          graduatingClass: r.department || '',
          section: r.section || '',
          admissionNumber: r.admission_number || '',
          rollNumber: r.roll_number || '',
          dateOfBirth: r.date_of_birth || '',
          currentOccupation: r.current_occupation || '',
          currentLocation: r.current_location || '',
          achievements: r.achievements || '',
          status: 'verified',
          verificationStatus: 'verified',
          createdAt: r.created_at || new Date().toISOString()
        }));
        saveAlumni();
      }
    } catch(err) { console.warn('syncAlumniFromSupabase error:', err); }
  }

  async function syncAlumniInvitesFromSupabase() {
    const sb = window.CampusLink && window.CampusLink.supabase;
    const profile = getProfile();
    if (!sb || !profile || !profile.id) return;
    try {
      // Join alumni_batches so we can show passing_year / program in the table
      const { data: rows, error } = await sb
        .from('alumni_invites')
        .select('*, alumni_batches(passing_year, program)')
        .eq('school_id', profile.id);
      if (error) { console.warn('syncAlumniInvitesFromSupabase error:', error); return; }
      if (rows && rows.length > 0) {
        // DB has records — overwrite local cache with authoritative data
        alumniInvites = rows.map(r => ({
          id: r.id,                                              // real DB UUID
          schoolId: r.school_id,
          inviteCode: r.invite_code,
          batchId: r.batch_id || null,
          graduatingYear: r.alumni_batches?.passing_year || null, // resolved via JOIN
          graduatingClass: r.alumni_batches?.program || '',        // resolved via JOIN
          status: r.status || 'active',
          usesCount: r.uses_count || 0,
          createdAt: r.created_at || new Date().toISOString()
        }));
        saveAlumniInvites();
      } else if (rows && rows.length === 0 && alumniInvites.length === 0) {
        // DB confirmed empty and local is also empty — keep in sync
        saveAlumniInvites();
      }
      // If rows === [] but local has items: DB insert likely failed due to RLS.
      // Do NOT overwrite localStorage — local items are preserved until RLS is fixed.
    } catch(err) { console.warn('syncAlumniInvitesFromSupabase error:', err); }
  }

  async function syncAlumniRequestsFromSupabase() {
    const sb = window.CampusLink && window.CampusLink.supabase;
    const profile = getProfile();
    if (!sb || !profile || !profile.id) return;
    try {
      const { data: rows, error } = await sb.from('alumni_requests').select('*').eq('school_id', profile.id);
      if (error) { console.warn('Alumni requests Supabase sync error:', error); return; }
      if (rows && rows.length > 0) {
        // DB has records — overwrite local with authoritative data
        alumniRequests = rows;
        saveAlumniRequests();
      } else if (rows && rows.length === 0 && alumniRequests.length === 0) {
        // Both empty — stay in sync
        saveAlumniRequests();
      }
      // rows=[] but local has items → preserve local (INSERT may have failed due to RLS)
    } catch(err) { console.warn('syncAlumniRequestsFromSupabase error:', err); }
  }

  // ── Populate Filters ───────────────────────────────────────────
  function populateAlumniFilters() {
    const yearSel = document.getElementById('alumni-filter-year');
    const classSel = document.getElementById('alumni-filter-class');
    if (!yearSel || !classSel) return;

    const years  = [...new Set(alumniList.map(a => a.graduatingYear).filter(Boolean))].sort((a,b) => b - a);
    const classes = [...new Set(alumniList.map(a => a.graduatingClass).filter(Boolean))].sort();

    yearSel.innerHTML = '<option value="">All Graduating Years</option>' +
      years.map(y => `<option value="${y}">${y}</option>`).join('');

    classSel.innerHTML = '<option value="">All Classes</option>' +
      classes.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  // ── Render All Alumni ──────────────────────────────────────────
  function renderAllAlumni() {
    const tbody = document.getElementById('alumni-all-tbody');
    const count = document.getElementById('alumni-all-count');
    if (!tbody) return;

    const search  = (document.getElementById('alumni-search')?.value || '').toLowerCase();
    const year    = document.getElementById('alumni-filter-year')?.value || '';
    const cls     = document.getElementById('alumni-filter-class')?.value || '';
    const gender  = document.getElementById('alumni-filter-gender')?.value || '';

    let filtered = alumniList.filter(a => {
      const matchSearch = !search || a.fullName.toLowerCase().includes(search) ||
        a.username.toLowerCase().includes(search) ||
        (a.admissionNumber || '').toLowerCase().includes(search) ||
        (a.currentOccupation || '').toLowerCase().includes(search);
      const matchYear   = !year   || String(a.graduatingYear) === String(year);
      const matchClass  = !cls    || a.graduatingClass === cls;
      const matchGender = !gender || a.gender === gender;
      return matchSearch && matchYear && matchClass && matchGender;
    });

    if (count) count.textContent = `${filtered.length} alumni record${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">No alumni records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(a => {
      const initials = a.fullName ? a.fullName.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase() : '?';
      const colors = ['#6366F1','#8B5CF6','#EC4899','#3B82F6','#10B981','#F59E0B'];
      const color = colors[a.fullName.charCodeAt(0) % colors.length];
      return `<tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:34px;height:34px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;flex-shrink:0;">${initials}</div>
            <div><div style="font-weight:700;font-size:0.88rem;color:var(--text-main);">${a.fullName}</div><div style="font-size:0.75rem;color:var(--text-muted);">@${a.username}</div></div>
          </div>
        </td>
        <td style="font-family:monospace;font-size:0.82rem;">${a.campuslinkId || '—'}</td>
        <td style="font-size:0.82rem;">${a.admissionNumber || '—'}</td>
        <td style="font-size:0.88rem;font-weight:600;">${formatYear(a.graduatingYear)}</td>
        <td style="font-size:0.82rem;">${a.graduatingClass || '—'}${a.section ? ' – ' + a.section : ''}</td>
        <td style="font-size:0.82rem;">${a.currentOccupation || '—'}</td>
        <td>${statusBadge(a.status)}</td>
        <td>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
            <button onclick="openViewAlumniModal('${a.id}')" style="padding:4px 10px;font-size:0.75rem;border-radius:4px;background:var(--primary-light);color:var(--primary);border:none;cursor:pointer;font-weight:600;">👁 View</button>
            <button onclick="openEditAlumniModal('${a.id}')" style="padding:4px 10px;font-size:0.75rem;border-radius:4px;background:rgba(16,185,129,0.1);color:#10B981;border:none;cursor:pointer;font-weight:600;">✏ Edit</button>
            <button onclick="confirmDeleteAlumni('${a.id}')" style="padding:4px 10px;font-size:0.75rem;border-radius:4px;background:rgba(239,68,68,0.1);color:#EF4444;border:none;cursor:pointer;font-weight:600;">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  // ── Render By Batch ────────────────────────────────────────────
  function renderByBatch() {
    const container = document.getElementById('alumni-batch-groups');
    if (!container) return;

    const search = (document.getElementById('alumni-search')?.value || '').toLowerCase();
    let filtered = search ? alumniList.filter(a =>
      a.fullName.toLowerCase().includes(search) || a.username.toLowerCase().includes(search)
    ) : [...alumniList];

    // Group by graduating year
    const groups = {};
    filtered.forEach(a => {
      const yr = a.graduatingYear || 'Unknown';
      if (!groups[yr]) groups[yr] = [];
      groups[yr].push(a);
    });

    const sortedYears = Object.keys(groups).sort((a,b) => b - a);
    if (sortedYears.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted);">No alumni records yet.</div>`;
      return;
    }

    container.innerHTML = sortedYears.map(yr => {
      const members = groups[yr];
      const classes = [...new Set(members.map(m => m.graduatingClass).filter(Boolean))].join(', ') || 'N/A';
      return `<div style="border:1px solid var(--border-color);border-radius:var(--radius-md);overflow:hidden;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 20px;background:var(--bg-secondary);border-bottom:1px solid var(--border-color);">
          <div>
            <span style="font-size:1rem;font-weight:800;color:var(--text-main);">Batch of ${yr}</span>
            <span style="font-size:0.78rem;color:var(--text-muted);margin-left:12px;">${classes}</span>
          </div>
          <span style="font-size:0.8rem;font-weight:700;background:var(--primary-light);color:var(--primary);padding:4px 12px;border-radius:99px;">${members.length} alumni</span>
        </div>
        <div style="padding:16px;display:flex;flex-wrap:wrap;gap:10px;">
          ${members.map(a => {
            const initials = a.fullName ? a.fullName.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase() : '?';
            const colors = ['#6366F1','#8B5CF6','#EC4899','#3B82F6','#10B981','#F59E0B'];
            const color = colors[a.fullName.charCodeAt(0) % colors.length];
            return `<div onclick="openViewAlumniModal('${a.id}')" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--border-color);border-radius:var(--radius-sm);cursor:pointer;transition:all 0.15s;background:var(--white);">
              <div style="width:28px;height:28px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.7rem;flex-shrink:0;">${initials}</div>
              <div><div style="font-weight:600;font-size:0.82rem;color:var(--text-main);">${a.fullName}</div><div style="font-size:0.72rem;color:var(--text-muted);">${a.currentOccupation || a.graduatingClass || ''}</div></div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }).join('');
  }

  // ── Render Invite Links ────────────────────────────────────────
  function renderAlumniInviteLinks() {
    const tbody = document.getElementById('alumni-invites-tbody');
    const countEl = document.getElementById('alumni-invites-count');
    if (!tbody) return;

    const search = (document.getElementById('alumni-invite-search')?.value || '').toLowerCase();
    const filtered = search ? alumniInvites.filter(i =>
      i.inviteCode.toLowerCase().includes(search) ||
      String(i.graduatingYear || '').includes(search) ||
      (i.graduatingClass || '').toLowerCase().includes(search)
    ) : [...alumniInvites];

    if (countEl) countEl.textContent = `${filtered.length} invitation${filtered.length !== 1 ? 's' : ''} generated`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted);">No invite links generated yet.</td></tr>`;
      return;
    }

    // Compute live usedBy from local requests
    let allReqs = [...alumniRequests];
    try {
      const localR = JSON.parse(localStorage.getItem('campuslink_alumni_requests') || '[]');
      localR.forEach(lr => { if (!allReqs.find(r => r.id === lr.id)) allReqs.push(lr); });
    } catch(e) {}

    tbody.innerHTML = filtered.map(i => {
      const statusBg = i.status === 'active' ? 'status-approved' : 'status-rejected';
      const inviteUrl = `${window.location.origin}/join-alumni.html?code=${i.inviteCode}`;
      const usedCount = allReqs.filter(r => 
        r.invite_code === i.inviteCode || 
        r.inviteCode === i.inviteCode || 
        r.invite_id === i.id || 
        r.inviteId === i.id
      ).length;
      return `<tr>
        <td style="font-size:0.88rem;font-weight:600;">${formatYear(i.graduatingYear)}</td>
        <td style="font-size:0.82rem;">${i.graduatingClass || '—'}</td>
        <td><code style="font-size:0.82rem;background:var(--bg-secondary);padding:3px 8px;border-radius:4px;">${i.inviteCode}</code></td>
        <td><span class="badge-status ${statusBg}" style="text-transform:capitalize;font-size:0.73rem;">${i.status}</span></td>
        <td style="font-size:0.82rem;font-weight:700;color:${usedCount > 0 ? 'var(--primary)' : 'var(--text-muted)'}">${usedCount}</td>
        <td style="font-size:0.82rem;">${i.createdAt ? new Date(i.createdAt).toLocaleDateString() : '—'}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button onclick="navigator.clipboard.writeText('${inviteUrl}').then(()=>alert('Link copied!'))" style="padding:4px 10px;font-size:0.75rem;border-radius:4px;background:var(--primary-light);color:var(--primary);border:none;cursor:pointer;font-weight:600;">📋 Copy</button>
            <button onclick="openAlumniQRModal('${i.inviteCode}', '${i.graduatingYear || ''}')" style="padding:4px 10px;font-size:0.75rem;border-radius:4px;background:var(--primary-light);color:var(--primary);border:none;cursor:pointer;font-weight:600;">📱 QR Code</button>
            <button onclick="toggleAlumniInvite('${i.id}')" style="padding:4px 10px;font-size:0.75rem;border-radius:4px;background:rgba(245,158,11,0.1);color:#D97706;border:none;cursor:pointer;font-weight:600;">${i.status === 'active' ? '🔒 Disable' : '🔓 Enable'}</button>
            <button onclick="deleteAlumniInvite('${i.id}')" style="padding:4px 10px;font-size:0.75rem;border-radius:4px;background:rgba(239,68,68,0.1);color:#EF4444;border:none;cursor:pointer;font-weight:600;">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  // ── Render Overview Stats ──────────────────────────────────────
  function renderAlumniOverview() {
    const total   = alumniList.length;
    const male    = alumniList.filter(a => a.gender === 'Male').length;
    const female  = alumniList.filter(a => a.gender === 'Female').length;
    const years   = new Set(alumniList.map(a => a.graduatingYear).filter(Boolean));
    const batches = years.size;

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('alumni-stat-total', total);
    setEl('alumni-stat-male', male);
    setEl('alumni-stat-female', female);
    setEl('alumni-stat-batches', batches);

    // Batch bar chart
    const chart = document.getElementById('alumni-batch-chart');
    if (!chart) return;
    const groups = {};
    alumniList.forEach(a => { const yr = a.graduatingYear || 'Unknown'; groups[yr] = (groups[yr] || 0) + 1; });
    const sortedYears = Object.keys(groups).sort((a,b) => b - a);
    const maxCount = Math.max(...Object.values(groups), 1);
    chart.innerHTML = sortedYears.map(yr => {
      const pct = Math.round((groups[yr] / maxCount) * 100);
      return `<div style="display:grid;grid-template-columns:100px 1fr 40px;align-items:center;gap:10px;">
        <span style="font-size:0.8rem;font-weight:600;color:var(--text-main);text-align:right;">Batch ${yr}</span>
        <div style="background:var(--bg-secondary);border-radius:99px;height:8px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#6366F1,#8B5CF6);border-radius:99px;"></div>
        </div>
        <span style="font-size:0.8rem;font-weight:700;color:var(--primary);">${groups[yr]}</span>
      </div>`;
    }).join('');
  }

  // ── Render Pending Requests Panel ─────────────────────────────
  function renderAlumniRequestsPanel() {
    const tbody = document.getElementById('alumni-requests-tbody');
    const countEl = document.getElementById('alumni-requests-count');
    if (!tbody) return;

    const profile = getProfile();
    // Merge Supabase + localStorage requests
    let requests = [...alumniRequests];
    try {
      const local = JSON.parse(localStorage.getItem('campuslink_alumni_requests') || '[]');
      local.forEach(lr => {
        if (!requests.find(r => r.id === lr.id)) requests.push(lr);
      });
    } catch(e) {}

    // Filter to this school
    if (profile && profile.id) {
      requests = requests.filter(r => r.school_id === profile.id || r.schoolId === profile.id);
    }

    const pending = requests.filter(r => r.status === 'pending' || r.status === 'info_requested');
    const all = requests;

    if (countEl) countEl.textContent = `${pending.length} request${pending.length !== 1 ? 's' : ''} pending (${all.length} total)`;

    if (all.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted);">No alumni joining requests yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = all.map(r => {
      const name = r.full_name || r.fullName || '—';
      const username = r.username || '—';
      const email = r.email || '—';
      const year = r.passing_year || r.graduatingYear || '—';
      const dept = r.department || r.graduatingClass || r.program || '—';
      const date = r.created_at ? new Date(r.created_at).toLocaleDateString() : (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—');
      const status = r.status || 'pending';

      let statusHtml;
      if (status === 'approved') statusHtml = `<span style="background:rgba(16,185,129,0.1);color:#10B981;padding:3px 10px;border-radius:99px;font-size:0.73rem;font-weight:700;">Approved</span>`;
      else if (status === 'rejected') statusHtml = `<span style="background:rgba(239,68,68,0.1);color:#EF4444;padding:3px 10px;border-radius:99px;font-size:0.73rem;font-weight:700;">Rejected</span>`;
      else statusHtml = `<span style="background:rgba(245,158,11,0.1);color:#D97706;padding:3px 10px;border-radius:99px;font-size:0.73rem;font-weight:700;">Pending</span>`;

      const isPending = status === 'pending' || status === 'info_requested';
      const actions = isPending
        ? `<button onclick="dashApproveAlumniReq('${r.id}')"
             style="padding:4px 10px;font-size:0.73rem;border-radius:4px;background:rgba(16,185,129,0.1);color:#10B981;border:none;cursor:pointer;font-weight:700;">✓ Approve</button>
           <button onclick="dashRejectAlumniReq('${r.id}')"
             style="padding:4px 10px;font-size:0.73rem;border-radius:4px;background:rgba(239,68,68,0.1);color:#EF4444;border:none;cursor:pointer;font-weight:700;">✕ Reject</button>`
        : `<span style="font-size:0.78rem;color:var(--text-muted);">Done</span>`;

      const initials = name.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
      const colors = ['#6366F1','#8B5CF6','#EC4899','#3B82F6','#10B981'];
      const color = colors[name.charCodeAt(0) % colors.length];

      return `<tr style="border-bottom:1px solid var(--border-color);">
        <td style="padding:12px 20px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.75rem;flex-shrink:0;">${initials}</div>
            <div><div style="font-weight:700;font-size:0.88rem;">${name}</div><div style="font-size:0.75rem;color:var(--text-muted);">@${username}</div></div>
          </div>
        </td>
        <td style="padding:12px 20px;font-size:0.82rem;">${email}</td>
        <td style="padding:12px 20px;font-size:0.88rem;font-weight:600;">${year}</td>
        <td style="padding:12px 20px;font-size:0.82rem;">${dept}</td>
        <td style="padding:12px 20px;font-size:0.82rem;">${date}</td>
        <td style="padding:12px 20px;">${statusHtml}</td>
        <td style="padding:12px 20px;text-align:right;"><div style="display:flex;gap:6px;justify-content:flex-end;">${actions}</div></td>
      </tr>`;
    }).join('');
  }

  window.dashApproveAlumniReq = function(reqId) {
    const sb = window.CampusLink && window.CampusLink.supabase;

    if (sb) {
      // ── Live Supabase mode ──────────────────────────────────────
      sb.from('alumni_requests')
        .update({ status: 'approved' })
        .eq('id', reqId)
        .then(({ error }) => {
          if (error) {
            console.error('Error approving alumni request:', error);
            alert('Failed to approve request: ' + error.message);
          } else {
            syncAlumniRequestsFromSupabase().then(() => {
              syncAlumniFromSupabase().then(() => {
                renderAlumni();
                alert('✅ Alumni request approved!');
              });
            });
          }
        });
      return;
    }

    let requests = [];
    try { requests = JSON.parse(localStorage.getItem('campuslink_alumni_requests') || '[]'); } catch(e) {}
    const req = requests.find(r => r.id === reqId);
    if (!req) { alert('Request not found.'); return; }
    req.status = 'approved';
    localStorage.setItem('campuslink_alumni_requests', JSON.stringify(requests));

    // Increment usesCount of the invitation link in localStorage
    if (req.invite_id) {
      let localInvites = [];
      try { localInvites = JSON.parse(localStorage.getItem('campuslink_alumni_invites') || '[]'); } catch(e) {}
      const invite = localInvites.find(i => i.id === req.invite_id || i.inviteCode === req.invite_id);
      if (invite) {
        invite.usesCount = (invite.usesCount || 0) + 1;
        invite.uses_count = (invite.uses_count || 0) + 1;
        localStorage.setItem('campuslink_alumni_invites', JSON.stringify(localInvites));
      }
    }

    // Add to alumni list
    let localAlumni = [];
    try { localAlumni = JSON.parse(localStorage.getItem('campuslink_alumni') || '[]'); } catch(e) {}
    if (!localAlumni.find(a => a.username === req.username)) {
      localAlumni.push({
        id: req.user_id || req.userId || ('alm_' + Date.now()),
        schoolId: req.school_id || req.schoolId,
        userId: req.user_id || req.userId,
        campuslinkId: 'CL-ALM-' + Math.floor(1000 + Math.random() * 9000),
        fullName: req.full_name || req.fullName || '',
        username: req.username || '',
        email: req.email || '',
        phone: '',
        gender: '',
        graduatingYear: req.passing_year || req.graduatingYear || null,
        graduatingClass: req.department || req.graduatingClass || 'General',
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
      loadAlumni();
    }
    alumniRequests = requests;
    renderAlumni();
    alert('✅ Alumni request approved!');
  };

  window.dashRejectAlumniReq = function(reqId) {
    if (!confirm('Reject this alumni joining request?')) return;
    const sb = window.CampusLink && window.CampusLink.supabase;

    if (sb) {
      // ── Live Supabase mode ──────────────────────────────────────
      sb.from('alumni_requests')
        .update({ status: 'rejected' })
        .eq('id', reqId)
        .then(({ error }) => {
          if (error) {
            console.error('Error rejecting alumni request:', error);
            alert('Failed to reject request: ' + error.message);
          } else {
            syncAlumniRequestsFromSupabase().then(() => {
              renderAlumni();
              alert('Alumni request rejected.');
            });
          }
        });
      return;
    }

    let requests = [];
    try { requests = JSON.parse(localStorage.getItem('campuslink_alumni_requests') || '[]'); } catch(e) {}
    const req = requests.find(r => r.id === reqId);
    if (!req) { alert('Request not found.'); return; }
    req.status = 'rejected';
    localStorage.setItem('campuslink_alumni_requests', JSON.stringify(requests));
    alumniRequests = requests;
    renderAlumni();
    alert('❌ Alumni request rejected.');
  };

  // ── Master Render ──────────────────────────────────────────────
  function renderAlumni() {
    populateAlumniFilters();
    if (alumniCurrentSubtab === 'all-alumni') renderAllAlumni();
    if (alumniCurrentSubtab === 'by-batch') renderByBatch();
    if (alumniCurrentSubtab === 'alumni-invite-links') renderAlumniInviteLinks();
    if (alumniCurrentSubtab === 'alumni-overview') renderAlumniOverview();
    if (alumniCurrentSubtab === 'alumni-requests') renderAlumniRequestsPanel();
  }

  // ── View Modal ─────────────────────────────────────────────────
  window.openViewAlumniModal = function(id) {
    const a = alumniList.find(x => x.id === id);
    if (!a) return;
    const initials = a.fullName.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
    const modalHtml = `
      <div id="view-alumni-modal-overlay" onclick="if(event.target===this)closeViewAlumniModal()" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div style="background:var(--white);border-radius:var(--radius-md);padding:28px;max-width:520px;width:100%;box-shadow:0 25px 50px rgba(0,0,0,0.25);position:relative;">
          <button onclick="closeViewAlumniModal()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--text-muted);">✕</button>
          <div style="display:flex;gap:16px;align-items:center;border-bottom:1px solid var(--border-color);padding-bottom:16px;margin-bottom:20px;">
            <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.4rem;">${initials}</div>
            <div>
              <h4 style="margin:0;font-size:1.2rem;font-weight:800;">${a.fullName}</h4>
              <p style="margin:2px 0 6px;font-size:0.85rem;color:var(--text-muted);">@${a.username}</p>
              ${statusBadge(a.status)}
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 24px;font-size:0.88rem;">
            ${[
              ['CampusLink ID', a.campuslinkId || '—'],
              ['Admission No.', a.admissionNumber || '—'],
              ['Email', a.email || '—'],
              ['Phone', a.phone || '—'],
              ['Gender', a.gender || '—'],
              ['Date of Birth', a.dateOfBirth || '—'],
              ['Graduating Year', formatYear(a.graduatingYear)],
              ['Class / Batch', (a.graduatingClass || '—') + (a.section ? ' – ' + a.section : '')],
              ['Current Occupation', a.currentOccupation || '—'],
              ['Current Location', a.currentLocation || '—']
            ].map(([label, val]) => `<div><span style="color:var(--text-muted);display:block;font-size:0.75rem;margin-bottom:2px;">${label}</span><strong style="color:var(--text-main);">${val}</strong></div>`).join('')}
          </div>
          ${a.achievements ? `<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-color);"><span style="color:var(--text-muted);font-size:0.75rem;display:block;margin-bottom:4px;">Achievements</span><p style="font-size:0.85rem;color:var(--text-main);margin:0;">${a.achievements}</p></div>` : ''}
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  };
  window.closeViewAlumniModal = function() {
    const el = document.getElementById('view-alumni-modal-overlay');
    if (el) el.remove();
  };

  // ── Edit Modal ─────────────────────────────────────────────────
  window.openEditAlumniModal = function(id) {
    const a = alumniList.find(x => x.id === id) || {};
    const isNew = !id || id === 'new';
    const modalHtml = `
      <div id="edit-alumni-modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div style="background:var(--white);border-radius:var(--radius-md);padding:28px;max-width:560px;width:100%;box-shadow:0 25px 50px rgba(0,0,0,0.25);position:relative;max-height:90vh;overflow-y:auto;">
          <button onclick="closeEditAlumniModal()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--text-muted);">✕</button>
          <h4 style="margin:0 0 20px;font-size:1.1rem;font-weight:800;">${isNew ? 'Add Alumni Manually' : 'Edit Alumni — ' + (a.fullName || '')}</h4>
          <form id="alumni-edit-form" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            ${[
              ['Full Name', 'alumni-edit-fullname', 'text', a.fullName || '', true],
              ['Username', 'alumni-edit-username', 'text', a.username || '', true],
              ['Email', 'alumni-edit-email', 'email', a.email || '', false],
              ['Phone', 'alumni-edit-phone', 'tel', a.phone || '', false],
              ['Admission No.', 'alumni-edit-admno', 'text', a.admissionNumber || '', false],
              ['Roll No.', 'alumni-edit-rollno', 'text', a.rollNumber || '', false],
              ['Graduating Year', 'alumni-edit-year', 'number', a.graduatingYear || new Date().getFullYear(), false],
              ['Graduating Class', 'alumni-edit-class', 'text', a.graduatingClass || '', false],
              ['Section', 'alumni-edit-section', 'text', a.section || '', false],
              ['Date of Birth', 'alumni-edit-dob', 'date', a.dateOfBirth || '', false],
              ['Current Occupation', 'alumni-edit-occupation', 'text', a.currentOccupation || '', false],
              ['Current Location', 'alumni-edit-location', 'text', a.currentLocation || '', false]
            ].map(([label, eid, type, val, req]) =>
              `<div><label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px;">${label}${req ? ' *' : ''}</label>
              <input id="${eid}" type="${type}" value="${val}" style="width:100%;padding:8px 12px;border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.85rem;outline:none;background:var(--white);color:var(--text-main);box-sizing:border-box;"${req ? ' required' : ''}></div>`
            ).join('')}
            <div><label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px;">Gender</label>
              <select id="alumni-edit-gender" style="width:100%;padding:8px 12px;border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.85rem;outline:none;background:var(--white);color:var(--text-main);">
                <option value="">Select...</option>
                <option value="Male"${a.gender==='Male'?' selected':''}>Male</option>
                <option value="Female"${a.gender==='Female'?' selected':''}>Female</option>
                <option value="Other"${a.gender==='Other'?' selected':''}>Other</option>
              </select></div>
            <div style="grid-column:1/-1;"><label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px;">Achievements / Notable Info</label>
              <textarea id="alumni-edit-achievements" rows="3" style="width:100%;padding:8px 12px;border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.85rem;outline:none;background:var(--white);color:var(--text-main);box-sizing:border-box;resize:vertical;">${a.achievements || ''}</textarea></div>
          </form>
          <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid var(--border-color);">
            <button onclick="closeEditAlumniModal()" style="padding:10px 20px;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:var(--white);color:var(--text-main);font-size:0.85rem;cursor:pointer;font-weight:600;">Cancel</button>
            <button onclick="saveAlumniFromModal('${id}')" style="padding:10px 20px;border-radius:var(--radius-sm);border:none;background:var(--primary);color:#fff;font-size:0.85rem;cursor:pointer;font-weight:700;">Save Alumni</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  };
  window.closeEditAlumniModal = function() {
    const el = document.getElementById('edit-alumni-modal-overlay');
    if (el) el.remove();
  };

  window.saveAlumniFromModal = async function(existingId) {
    const isNew = !existingId || existingId === 'new' || existingId === 'undefined';
    const fullName = document.getElementById('alumni-edit-fullname')?.value.trim();
    const username = document.getElementById('alumni-edit-username')?.value.trim();
    if (!fullName || !username) { alert('Full Name and Username are required.'); return; }

    const record = {
      id: isNew ? ('alm_' + Date.now()) : existingId,
      schoolId: getProfile().id || '',
      campuslinkId: isNew ? ('CL-ALM-' + Math.floor(1000 + Math.random() * 9000)) : (alumniList.find(x => x.id === existingId)?.campuslinkId || ''),
      fullName,
      username,
      email: document.getElementById('alumni-edit-email')?.value.trim() || '',
      phone: document.getElementById('alumni-edit-phone')?.value.trim() || '',
      admissionNumber: document.getElementById('alumni-edit-admno')?.value.trim() || '',
      rollNumber: document.getElementById('alumni-edit-rollno')?.value.trim() || '',
      graduatingYear: parseInt(document.getElementById('alumni-edit-year')?.value) || null,
      graduatingClass: document.getElementById('alumni-edit-class')?.value.trim() || '',
      section: document.getElementById('alumni-edit-section')?.value.trim() || '',
      dateOfBirth: document.getElementById('alumni-edit-dob')?.value || '',
      gender: document.getElementById('alumni-edit-gender')?.value || '',
      currentOccupation: document.getElementById('alumni-edit-occupation')?.value.trim() || '',
      currentLocation: document.getElementById('alumni-edit-location')?.value.trim() || '',
      achievements: document.getElementById('alumni-edit-achievements')?.value.trim() || '',
      status: 'verified',
      verificationStatus: 'verified',
      createdAt: isNew ? new Date().toISOString() : (alumniList.find(x => x.id === existingId)?.createdAt || new Date().toISOString())
    };

    // Save to Supabase
    const sb = window.CampusLink && window.CampusLink.supabase;
    const profile = getProfile();
    if (sb && profile && profile.id) {
      try {
        await sb.from('alumni').upsert({
          school_id: profile.id,
          employee_id: record.campuslinkId,
          full_name: record.fullName,
          username: record.username,
          email: record.email,
          phone: record.phone,
          gender: record.gender,
          graduating_year: record.graduatingYear,
          graduating_class: record.graduatingClass,
          section: record.section,
          admission_number: record.admissionNumber,
          roll_number: record.rollNumber,
          date_of_birth: record.dateOfBirth || null,
          current_occupation: record.currentOccupation,
          current_location: record.currentLocation,
          achievements: record.achievements,
          status: 'verified',
          verification_status: 'verified'
        }, { onConflict: 'school_id,username' });
      } catch(dbErr) { console.warn('Alumni DB save error:', dbErr); }
    }

    // Update local list
    const idx = alumniList.findIndex(x => x.id === existingId);
    if (idx >= 0) alumniList[idx] = record; else alumniList.unshift(record);
    saveAlumni();
    closeEditAlumniModal();
    renderAlumni();
  };

  // ── Delete ─────────────────────────────────────────────────────
  window.confirmDeleteAlumni = function(id) {
    const a = alumniList.find(x => x.id === id);
    if (!a || !confirm(`Remove ${a.fullName} from alumni records?`)) return;
    alumniList = alumniList.filter(x => x.id !== id);
    saveAlumni();
    renderAlumni();
    // Also delete from Supabase
    const sb = window.CampusLink && window.CampusLink.supabase;
    const profile = getProfile();
    if (sb && profile && profile.id) {
      sb.from('alumni').delete().eq('school_id', profile.id).ilike('username', a.username).catch(e => console.warn(e));
    }
  };

  // ── Invite Link ────────────────────────────────────────────────
  function openAlumniInviteModal() {
    const years = [];
    for (let y = new Date().getFullYear(); y >= 1990; y--) years.push(y);
    const classes = [...new Set(alumniList.map(a => a.graduatingClass).filter(Boolean))];

    const html = `
      <div id="alumni-invite-modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div style="background:var(--white);border-radius:var(--radius-md);padding:28px;max-width:440px;width:100%;box-shadow:0 25px 50px rgba(0,0,0,0.25);position:relative;">
          <button onclick="document.getElementById('alumni-invite-modal-overlay').remove()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--text-muted);">✕</button>
          <h4 style="margin:0 0 20px;font-size:1.1rem;font-weight:800;">🎓 Generate Alumni Invite Link</h4>
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div>
              <label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px;">Graduating Year</label>
              <select id="alumni-invite-year" style="width:100%;padding:10px 14px;border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.85rem;outline:none;background:var(--white);">
                <option value="">Any Year</option>
                ${years.map(y => `<option value="${y}">${y}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px;">Graduating Class / Batch</label>
              <input id="alumni-invite-class" type="text" placeholder="e.g. Class XII, Batch A..." list="alumni-class-datalist" style="width:100%;padding:10px 14px;border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.85rem;outline:none;background:var(--white);box-sizing:border-box;">
              <datalist id="alumni-class-datalist">${classes.map(c=>`<option value="${c}">`).join('')}</datalist>
            </div>
          </div>
          <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid var(--border-color);">
            <button onclick="document.getElementById('alumni-invite-modal-overlay').remove()" style="padding:10px 20px;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:var(--white);color:var(--text-main);font-size:0.85rem;cursor:pointer;font-weight:600;">Cancel</button>
            <button onclick="createAlumniInviteLink()" style="padding:10px 20px;border-radius:var(--radius-sm);border:none;background:var(--primary);color:#fff;font-size:0.85rem;cursor:pointer;font-weight:700;">Generate Link</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  window.openAlumniQRModal = function(code, yearText) {
    const inviteUrl = `${window.location.origin}/join-alumni.html?code=${code}`;
    const label     = yearText ? `Batch of ${yearText}` : 'All Years';
    const qrApi     = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(inviteUrl)}`;

    // Remove any existing instance
    document.getElementById('alumni-qr-modal-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'alumni-qr-modal-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(15,23,42,0.55);backdrop-filter:blur(4px);
      z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;
    `;

    overlay.innerHTML = `
      <div id="alumni-qr-modal-box" style="
        background:var(--white);border-radius:20px;padding:0;max-width:420px;width:100%;
        box-shadow:0 32px 80px rgba(0,0,0,0.22);overflow:hidden;
        animation:qrSlideIn 0.25s cubic-bezier(0.34,1.56,0.64,1);
      ">
        <style>
          @keyframes qrSlideIn { from { transform:scale(0.88) translateY(16px); opacity:0; } to { transform:scale(1) translateY(0); opacity:1; } }
        </style>

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#6366F1,#8B5CF6);padding:24px 24px 20px;position:relative;">
          <button onclick="document.getElementById('alumni-qr-modal-overlay').remove()" style="
            position:absolute;top:14px;right:14px;width:30px;height:30px;border-radius:50%;
            background:rgba(255,255,255,0.2);border:none;color:#fff;font-size:1rem;cursor:pointer;
            display:flex;align-items:center;justify-content:center;line-height:1;
          ">✕</button>
          <div style="font-size:1.5rem;margin-bottom:6px;">📱</div>
          <div style="color:#fff;font-size:1.05rem;font-weight:800;">Alumni Invite QR Code</div>
          <div style="color:rgba(255,255,255,0.75);font-size:0.82rem;margin-top:2px;">${label} · ${code}</div>
        </div>

        <!-- QR Canvas Area -->
        <div style="padding:24px;display:flex;flex-direction:column;align-items:center;gap:18px;">

          <!-- QR image with loading state -->
          <div id="alumni-qr-wrap" style="
            width:220px;height:220px;border-radius:12px;border:2px solid var(--border-color);
            background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;
            overflow:hidden;position:relative;
          ">
            <div id="alumni-qr-spinner" style="font-size:2rem;animation:spin 1s linear infinite;">⟳</div>
            <style>@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}</style>
            <canvas id="alumni-qr-canvas" style="display:none;width:220px;height:220px;border-radius:10px;"></canvas>
          </div>

          <!-- Invite URL -->
          <div style="width:100%;">
            <div style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">Invite Link</div>
            <div style="display:flex;gap:8px;">
              <input id="alumni-qr-link-input" readonly value="${inviteUrl}" style="
                flex:1;min-width:0;padding:9px 12px;border:1px solid var(--border-color);
                border-radius:8px;font-size:0.75rem;background:var(--bg-secondary);
                color:var(--text-main);font-family:monospace;outline:none;
              ">
              <button onclick="
                navigator.clipboard.writeText('${inviteUrl}').then(()=>{
                  this.textContent='✓ Copied';this.style.background='#10B981';
                  setTimeout(()=>{this.textContent='Copy';this.style.background='var(--primary)';},2000);
                });
              " style="
                padding:0 14px;background:var(--primary);color:#fff;border:none;
                border-radius:8px;font-size:0.78rem;font-weight:700;cursor:pointer;white-space:nowrap;
              ">Copy</button>
            </div>
          </div>

          <!-- Actions -->
          <div style="display:flex;gap:10px;width:100%;">
            <button id="alumni-qr-download-btn" style="
              flex:1;padding:10px;border-radius:10px;border:1px solid var(--border-color);
              background:var(--bg-secondary);color:var(--text-main);font-size:0.82rem;
              font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;
            ">⬇ Download QR</button>
            <button onclick="document.getElementById('alumni-qr-modal-overlay').remove()" style="
              flex:1;padding:10px;border-radius:10px;border:none;
              background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;font-size:0.82rem;
              font-weight:700;cursor:pointer;
            ">Done</button>
          </div>

          <p style="font-size:0.72rem;color:var(--text-muted);text-align:center;margin:0;">
            Alumni scan this code to open the invite registration page
          </p>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Close on backdrop click
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    // Load QR image into canvas
    const canvas  = document.getElementById('alumni-qr-canvas');
    const spinner = document.getElementById('alumni-qr-spinner');
    const dlBtn   = document.getElementById('alumni-qr-download-btn');
    const ctx     = canvas.getContext('2d');
    const img     = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      canvas.width  = 220;
      canvas.height = 220;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 220, 220);
      ctx.drawImage(img, 0, 0, 220, 220);
      spinner.style.display = 'none';
      canvas.style.display  = 'block';

      dlBtn.onclick = () => {
        const a = document.createElement('a');
        a.download = `AlumniQR_${code}_${label.replace(/\s+/g,'-')}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      };
    };
    img.onerror = function() {
      spinner.textContent = '⚠';
      spinner.style.animation = 'none';
      spinner.style.fontSize = '1.4rem';
      spinner.style.color = '#EF4444';
      spinner.title = 'Could not load QR — check internet connection';
    };
    img.src = qrApi;
  };


  window.createAlumniInviteLink = async function() {
    const year  = parseInt(document.getElementById('alumni-invite-year')?.value) || null;
    const cls   = document.getElementById('alumni-invite-class')?.value.trim() || '';
    const code  = generateAlumniCode();
    const profile = getProfile();
    const sb = window.CampusLink && window.CampusLink.supabase;

    let batchId = null;
    if (sb && profile && profile.id && year) {
      try {
        // A. Resolve or create graduation batch
        const { data: existingBatch } = await sb
          .from('alumni_batches')
          .select('id')
          .eq('school_id', profile.id)
          .eq('passing_year', year)
          .maybeSingle();

        if (existingBatch) {
          batchId = existingBatch.id;
        } else {
          const { data: newBatch, error: bErr } = await sb
            .from('alumni_batches')
            .insert({
              school_id: profile.id,
              passing_year: year,
              program: cls || null
            })
            .select('id')
            .single();
          if (!bErr && newBatch) {
            batchId = newBatch.id;
          }
        }
      } catch (batchErr) {
        console.warn('Error resolving graduation batch:', batchErr);
      }
    }


    // Save to Supabase and get the real DB-generated UUID back
    let dbId = null;
    if (sb && profile && profile.id) {
      try {
        const { data: inserted, error: insErr } = await sb
          .from('alumni_invites')
          .insert({
            school_id: profile.id,
            batch_id: batchId,
            invite_code: code,
            status: 'active'
          })
          .select('id')
          .single();
        if (!insErr && inserted) dbId = inserted.id;
        else if (insErr) console.warn('Alumni invite DB error:', insErr);
      } catch(dbErr) { 
        console.warn('Alumni invite DB error:', dbErr); 
      }
    }

    const invite = {
      id: dbId || ('ainv_' + Date.now()), // prefer real DB UUID; fallback for offline mode
      schoolId: profile.id || '',
      batchId: batchId,
      inviteCode: code,
      graduatingYear: year,
      graduatingClass: cls,
      status: 'active',
      usesCount: 0,
      createdAt: new Date().toISOString()
    };

    alumniInvites.unshift(invite);
    saveAlumniInvites();
    document.getElementById('alumni-invite-modal-overlay')?.remove();

    const inviteUrl = `${window.location.origin}/join-alumni.html?code=${code}`;
    const resultHtml = `
      <div id="alumni-invite-result-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div style="background:var(--white);border-radius:var(--radius-md);padding:28px;max-width:480px;width:100%;box-shadow:0 25px 50px rgba(0,0,0,0.25);text-align:center;display:flex;flex-direction:column;gap:18px;">
          <div style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#10B981,#059669);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.8rem;margin:0 auto;">🎓</div>
          <div>
            <h4 style="font-size:1.15rem;font-weight:800;margin:0 0 6px;color:var(--dark-bg);">Alumni Invite Link Created!</h4>
            <p style="font-size:0.85rem;color:var(--text-muted);margin:0;">Share this link with alumni to let them register their profiles.</p>
          </div>
          
          <!-- Share Link Section -->
          <div style="text-align:left;">
            <label style="font-weight: 600; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px; display: block; text-transform:uppercase; letter-spacing:0.05em;">Invite Link</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="success-alumni-invite-link" readonly style="flex-grow: 1; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.82rem; outline: none; background: var(--bg-secondary); color: var(--text-main); font-family: monospace;" value="${inviteUrl}">
              <button onclick="navigator.clipboard.writeText('${inviteUrl}').then(()=>alert('Copied!'))" style="padding: 0 16px; font-size: 0.82rem; white-space: nowrap; font-weight: 600; background:var(--primary); color:#fff; border:none; border-radius:var(--radius-sm); cursor:pointer;">Copy Link</button>
            </div>
          </div>

          <!-- QR code placeholder panel -->
          <div style="display: flex; align-items: center; gap: 16px; background: rgba(15,23,42,0.02); border: 1px solid var(--border-color); padding: 14px; border-radius: var(--radius-sm); text-align:left;">
            <div style="width: 50px; height: 50px; border: 1.5px solid var(--border-color); background: #fff; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0;">📱</div>
            <div style="flex-grow:1;">
              <div style="font-size: 0.82rem; font-weight: 700; color: var(--dark-bg);">QR Code Invitation</div>
              <div style="font-size: 0.74rem; color: var(--text-muted); margin-bottom: 6px;">Display on screen for instant scanning.</div>
              <button type="button" onclick="openAlumniQRModal('${code}', '${year || ''}');" style="padding: 4px 10px; font-size: 0.72rem; border-radius: var(--radius-sm); font-weight: 600; border: 1px solid var(--border-color); background:var(--white); cursor:pointer; color:var(--text-main);">Show QR Code</button>
            </div>
          </div>

          <div style="display:flex;justify-content:center;margin-top:8px;">
            <button onclick="document.getElementById('alumni-invite-result-overlay').remove();renderAlumniInviteLinks();" style="padding:10px 24px;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:var(--white);color:var(--text-main);font-size:0.85rem;cursor:pointer;font-weight:600;width:100%;">Close</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', resultHtml);
    renderAlumniInviteLinks();
  };

  window.toggleAlumniInvite = function(id) {
    const inv = alumniInvites.find(i => i.id === id);
    if (!inv) return;
    inv.status = inv.status === 'active' ? 'disabled' : 'active';
    saveAlumniInvites();
    renderAlumniInviteLinks();
  };

  window.deleteAlumniInvite = function(id) {
    if (!confirm('Delete this invite link?')) return;
    alumniInvites = alumniInvites.filter(i => i.id !== id);
    saveAlumniInvites();
    renderAlumniInviteLinks();
  };

  // ── Graduate a Student Class ───────────────────────────────────
  window.openGraduateStudentsModal = function() {
    let students = [];
    try { students = JSON.parse(localStorage.getItem('campuslink_students') || '[]'); } catch(e) {}
    const activeStudents = students.filter(s => s.status === 'active' || s.status === 'pending');
    const classes = [...new Set(activeStudents.map(s => s.className || s.classId).filter(Boolean))];

    const html = `
      <div id="graduate-modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div style="background:var(--white);border-radius:var(--radius-md);padding:28px;max-width:480px;width:100%;box-shadow:0 25px 50px rgba(0,0,0,0.25);position:relative;">
          <button onclick="document.getElementById('graduate-modal-overlay').remove()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--text-muted);">✕</button>
          <h4 style="margin:0 0 8px;font-size:1.1rem;font-weight:800;">🎓 Graduate a Student Class</h4>
          <p style="font-size:0.82rem;color:var(--text-muted);margin:0 0 20px;">Move all active students from a class to the Alumni section as graduated.</p>
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div>
              <label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px;">Select Class to Graduate</label>
              <select id="graduate-class-select" style="width:100%;padding:10px 14px;border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.85rem;outline:none;background:var(--white);">
                <option value="">Select a class...</option>
                ${classes.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px;">Graduating Year</label>
              <input id="graduate-year-input" type="number" value="${new Date().getFullYear()}" style="width:100%;padding:10px 14px;border:1px solid var(--border-color);border-radius:var(--radius-sm);font-size:0.85rem;outline:none;background:var(--white);box-sizing:border-box;">
            </div>
          </div>
          <p id="graduate-count-preview" style="font-size:0.82rem;color:var(--primary);font-weight:600;margin:12px 0 0;"></p>
          <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px;padding-top:16px;border-top:1px solid var(--border-color);">
            <button onclick="document.getElementById('graduate-modal-overlay').remove()" style="padding:10px 20px;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:var(--white);color:var(--text-main);font-size:0.85rem;cursor:pointer;font-weight:600;">Cancel</button>
            <button onclick="processGraduateClass()" style="padding:10px 20px;border-radius:var(--radius-sm);border:none;background:#10B981;color:#fff;font-size:0.85rem;cursor:pointer;font-weight:700;">Graduate Class</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('graduate-class-select').addEventListener('change', function() {
      const cls = this.value;
      const count = activeStudents.filter(s => (s.className || s.classId) === cls).length;
      document.getElementById('graduate-count-preview').textContent = count > 0 ? `${count} student(s) will be moved to Alumni` : '';
    });
  };

  window.processGraduateClass = function() {
    const cls = document.getElementById('graduate-class-select')?.value;
    const year = parseInt(document.getElementById('graduate-year-input')?.value) || new Date().getFullYear();
    if (!cls) { alert('Please select a class.'); return; }

    let students = [];
    try { students = JSON.parse(localStorage.getItem('campuslink_students') || '[]'); } catch(e) {}
    const toGraduate = students.filter(s => (s.className || s.classId) === cls && (s.status === 'active' || s.status === 'pending'));

    if (toGraduate.length === 0) { alert('No active students found in that class.'); return; }

    toGraduate.forEach(s => {
      s.status = 'graduated';
      const alum = {
        id: 'alm_' + s.id,
        schoolId: s.schoolId || getProfile().id || '',
        campuslinkId: s.campuslinkId || ('CL-ALM-' + Date.now()),
        fullName: s.fullName,
        username: s.username,
        email: s.email || '',
        phone: s.phone || '',
        gender: s.gender || '',
        graduatingYear: year,
        graduatingClass: cls,
        section: s.section || s.sectionId || '',
        admissionNumber: s.admissionNumber || '',
        rollNumber: s.rollNumber || '',
        dateOfBirth: s.dateOfBirth || '',
        currentOccupation: '',
        currentLocation: '',
        achievements: '',
        status: 'verified',
        verificationStatus: 'verified',
        createdAt: new Date().toISOString()
      };
      if (!alumniList.find(a => a.username === alum.username)) {
        alumniList.unshift(alum);
      }
    });

    localStorage.setItem('campuslink_students', JSON.stringify(students));
    saveAlumni();
    document.getElementById('graduate-modal-overlay')?.remove();
    alert(`✅ ${toGraduate.length} student(s) graduated and moved to Alumni!`);
    renderAlumni();
  };

  // ── Event Listeners ────────────────────────────────────────────
  function setupAlumniEventListeners() {
    // Sub-tab buttons
    document.querySelectorAll('.alumni-subtab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        alumniCurrentSubtab = btn.getAttribute('data-asubtab');
        document.querySelectorAll('.alumni-subtab-btn').forEach(b => {
          b.style.color = 'var(--text-muted)';
          b.style.borderBottom = '3px solid transparent';
          b.style.fontWeight = '500';
        });
        btn.style.color = 'var(--primary)';
        btn.style.borderBottom = '3px solid var(--primary)';
        btn.style.fontWeight = '700';
        document.querySelectorAll('.alumni-subpanel').forEach(p => p.style.display = 'none');
        const panel = document.getElementById(`alumni-subpanel-${alumniCurrentSubtab}`);
        if (panel) panel.style.display = '';
        renderAlumni();
      });
    });

    // Filters
    ['alumni-search','alumni-filter-year','alumni-filter-class','alumni-filter-gender'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', renderAlumni);
    });

    // Invite search
    const invSearch = document.getElementById('alumni-invite-search');
    if (invSearch) invSearch.addEventListener('input', renderAlumniInviteLinks);

    // Dropdown toggle
    const toggle = document.getElementById('btn-alumni-actions-toggle');
    const menu   = document.getElementById('alumni-actions-dropdown-menu');
    if (toggle && menu) {
      toggle.addEventListener('click', e => { e.stopPropagation(); menu.style.display = menu.style.display === 'block' ? 'none' : 'block'; });
      document.addEventListener('click', () => { if (menu) menu.style.display = 'none'; });
    }

    // Invite button
    const invBtn = document.getElementById('btn-invite-alumni-trigger');
    if (invBtn) invBtn.addEventListener('click', openAlumniInviteModal);

    // Dropdown items
    const ddInvite = document.getElementById('btn-alumni-dropdown-invite');
    if (ddInvite) ddInvite.addEventListener('click', () => { if (menu) menu.style.display = 'none'; openAlumniInviteModal(); });

    const ddAdd = document.getElementById('btn-alumni-dropdown-add');
    if (ddAdd) ddAdd.addEventListener('click', () => { if (menu) menu.style.display = 'none'; openEditAlumniModal('new'); });

    const ddGraduate = document.getElementById('btn-alumni-dropdown-graduate');
    if (ddGraduate) ddGraduate.addEventListener('click', () => { if (menu) menu.style.display = 'none'; openGraduateStudentsModal(); });
  }

  // ── Public Init ────────────────────────────────────────────────
  window.initAlumniTab = async function() {
    if (!alumniInitialized) {
      setupAlumniEventListeners();
      alumniInitialized = true;
    }
    loadAlumni();
    loadAlumniInvites();
    loadAlumniRequests();
    await syncAlumniFromSupabase();
    await syncAlumniInvitesFromSupabase();
    await syncAlumniRequestsFromSupabase();
    renderAlumni();
  };

})();

