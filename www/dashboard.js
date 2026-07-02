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
              about: school.about || ''
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

  // --- Classroom Management State Defaults ---
  const DEFAULT_YEARS = [
    { id: 'year-2024-25', name: '2024-25', is_active: false, school_id: 'default' },
    { id: 'year-2025-26', name: '2025-26', is_active: true, school_id: 'default' }
  ];
  const DEFAULT_CLASSROOMS = [
    { id: 'class-ix-a', school_id: 'default', academic_year_id: 'year-2025-26', grade: 'Grade 9', section: 'A', room: 'Room 102', is_archived: false, capacity: 40, status: 'active' },
    { id: 'class-x-b', school_id: 'default', academic_year_id: 'year-2025-26', grade: 'Grade 10', section: 'B', room: 'Room 105', is_archived: false, capacity: 45, status: 'active' }
  ];
  const DEFAULT_ASSIGNMENTS = [
    { id: 'assign-1', classroom_id: 'class-ix-a', teacher_id: 'teacher-1', assignment_type: 'permanent', start_date: '2025-06-01T00:00:00Z', is_active: true, teacher: { full_name: 'Mrs. Sharma', email: 'sharma@campuslink.edu' } },
    { id: 'assign-2', classroom_id: 'class-x-b', teacher_id: 'teacher-2', assignment_type: 'permanent', start_date: '2025-06-01T00:00:00Z', is_active: true, teacher: { full_name: 'Mr. Rajesh Kumar', email: 'rajesh@campuslink.edu' } }
  ];
  const DEFAULT_SUBJECT_TEACHERS = [
    { id: 'st-1', classroom_id: 'class-ix-a', teacher_id: 'teacher-2', subject: 'Mathematics', teacher: { full_name: 'Mr. Rajesh Kumar' } },
    { id: 'st-2', classroom_id: 'class-ix-a', teacher_id: 'teacher-3', subject: 'Physics', teacher: { full_name: 'Dr. Mehta' } }
  ];
  const DEFAULT_SCHOOL_TEACHERS = [
    { id: 'teacher-1', full_name: 'Mrs. Sharma', email: 'sharma@campuslink.edu', is_class_teacher: true, subject: 'English', employee_id: 'EMP-T1001', is_verified: true, avatar_url: '' },
    { id: 'teacher-2', full_name: 'Mr. Rajesh Kumar', email: 'rajesh@campuslink.edu', is_class_teacher: true, subject: 'Mathematics', employee_id: 'EMP-T1002', is_verified: true, avatar_url: '' },
    { id: 'teacher-3', full_name: 'Dr. Mehta', email: 'mehta@campuslink.edu', is_class_teacher: true, subject: 'Science', employee_id: 'EMP-T1003', is_verified: false, avatar_url: '' },
    { id: 'teacher-4', full_name: 'Miss Sen', email: 'sen@campuslink.edu', is_class_teacher: false, subject: 'History', employee_id: 'EMP-T1004', is_verified: false, avatar_url: '' }
  ];

  let academicYears = getStoredData('campuslink_academic_years', DEFAULT_YEARS);
  let classrooms = getStoredData('campuslink_classrooms', DEFAULT_CLASSROOMS);
  let classroomAssignments = getStoredData('campuslink_classroom_assignments', DEFAULT_ASSIGNMENTS);
  let classroomSubjectTeachers = getStoredData('campuslink_classroom_subject_teachers', DEFAULT_SUBJECT_TEACHERS);
  let schoolTeachers = getStoredData('campuslink_school_teachers', DEFAULT_SCHOOL_TEACHERS);

  // Table UX States
  let classroomSearchText = '';
  let classroomShowArchived = false;
  let classroomSortColumn = 'grade';
  let classroomSortOrder = 'asc';
  let classroomCurrentPage = 1;
  const classroomPageSize = 10;
  let classroomLoading = false;

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
      
      // Update active nav link
      tabLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

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
      if (tabTarget === 'profile') tabName = 'School Profile Settings';
      if (tabTarget === 'classroom-management') {
        tabName = 'Classroom & Teacher Management';
        loadClassroomManagementData();
      }
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
    
    const el = (id) => document.getElementById(id);
    if (el('profile-school-name')) el('profile-school-name').value = profile.name || '';
    if (el('profile-city')) el('profile-city').value = profile.city || '';
    if (el('profile-state')) el('profile-state').value = profile.state || '';
    if (el('profile-board')) el('profile-board').value = profile.board || 'CBSE';
    if (el('profile-logo-char')) el('profile-logo-char').value = profile.logoLetter || '';
    if (el('profile-about')) el('profile-about').value = profile.about || '';

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
  // CLASSROOM OWNERSHIP & TEACHER TRANSFER SYSTEM CONTROLLER
  // ============================================================
  
  // Helper: clean any stale mock data from localStorage
  function clearStaleMockData() {
    try {
      const savedProfile = JSON.parse(localStorage.getItem('campuslink_profile') || '{}');
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(savedProfile?.id)) {
        return; // Do not clear mock data in demo/local/offline mode!
      }
    } catch (e) {
      return;
    }

    ['campuslink_classrooms', 'campuslink_classroom_assignments',
     'campuslink_classroom_subject_teachers', 'campuslink_school_teachers'].forEach(key => {
      try {
        const stored = JSON.parse(localStorage.getItem(key) || '[]');
        // Remove entries that used the fake 'default' school_id
        const cleaned = stored.filter(item => item.school_id !== 'default');
        localStorage.setItem(key, JSON.stringify(cleaned));
      } catch (e) { /* ignore parse errors */ }
    });
    // Also clean academic years that were seeded with school_id='default'
    try {
      const storedYears = JSON.parse(localStorage.getItem('campuslink_academic_years') || '[]');
      const cleanedYears = storedYears.filter(y => y.school_id !== 'default');
      if (cleanedYears.length !== storedYears.length) {
        localStorage.setItem('campuslink_academic_years', JSON.stringify(cleanedYears));
      }
    } catch (e) { /* ignore */ }
  }
  clearStaleMockData();

  // Sync state variables again after clearStaleMockData runs
  academicYears = getStoredData('campuslink_academic_years', DEFAULT_YEARS);
  classrooms = getStoredData('campuslink_classrooms', DEFAULT_CLASSROOMS);
  classroomAssignments = getStoredData('campuslink_classroom_assignments', DEFAULT_ASSIGNMENTS);
  classroomSubjectTeachers = getStoredData('campuslink_classroom_subject_teachers', DEFAULT_SUBJECT_TEACHERS);
  schoolTeachers = getStoredData('campuslink_school_teachers', DEFAULT_SCHOOL_TEACHERS);
  classroomSortColumn = 'grade';
  classroomSortOrder = 'asc';
  classroomCurrentPage = 1;
  classroomLoading = false;

  // Helper date checker for temporary assignments
  function isWithinDateRange(start, end) {
    if (!start) return false;
    const now = new Date();
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;
    return startDate <= now && (!endDate || now <= endDate);
  }

  // Student counts cache (classroom_id -> count)
  let classroomStudentCounts = {};

  // 1. Fetch ALL classroom management data from Supabase (always fresh)
  async function loadClassroomManagementData() {
    classroomLoading = true;
    renderClassroomStats();
    renderClassroomsTable();

    if (!supabase || !profile || !profile.id) {
      console.warn('[Classroom] No Supabase or profile — showing empty state.');
      classroomLoading = false;
      renderAcademicYearsDropdowns();
      renderClassroomStats();
      renderClassroomsTable();
      return;
    }

    try {
      // ── 1. Academic Years ─────────────────────────────────────────
      const { data: dbYears, error: yErr } = await supabase
        .from('academic_years')
        .select('*')
        .eq('school_id', profile.id)
        .order('name', { ascending: true });

      if (yErr) {
        console.error('[Classroom] Academic years fetch error:', yErr.message);
      } else if (dbYears && dbYears.length > 0) {
        academicYears = dbYears;
        saveState('campuslink_academic_years', academicYears);
      } else if (dbYears && dbYears.length === 0) {
        // Auto-provision default years for new schools
        const currentYear = new Date().getFullYear();
        const defaultYears = [
          { school_id: profile.id, name: `${currentYear - 1}-${String(currentYear).slice(2)}`, is_active: false },
          { school_id: profile.id, name: `${currentYear}-${String(currentYear + 1).slice(2)}`, is_active: true },
        ];
        try {
          const { data: inserted, error: insErr } = await supabase.from('academic_years').insert(defaultYears).select();
          if (!insErr && inserted && inserted.length > 0) {
            academicYears = inserted;
            saveState('campuslink_academic_years', academicYears);
          }
        } catch (yrInsertErr) {
          console.warn('[Classroom] Could not auto-provision academic years:', yrInsertErr);
        }
      }

      // ── 2. Classrooms (all active + archived) ─────────────────────
      const { data: dbClassrooms, error: cErr } = await supabase
        .from('classrooms')
        .select('*')
        .eq('school_id', profile.id)
        .order('created_at', { ascending: false });

      if (cErr) {
        console.error('[Classroom] Classrooms fetch error:', cErr.message);
      } else if (dbClassrooms) {
        classrooms = dbClassrooms;
        saveState('campuslink_classrooms', classrooms);
      }

      // ── 3. Teacher Assignments & Subject Teachers ──────────────────
      const cIds = classrooms.map(c => c.id);
      if (cIds.length > 0) {
        const { data: dbAssignments, error: aErr } = await supabase
          .from('classroom_teacher_assignments')
          .select('id, classroom_id, teacher_id, assignment_type, start_date, end_date, is_active, reason, teacher:profiles!teacher_id(full_name, email)')
          .in('classroom_id', cIds)
          .order('start_date', { ascending: false });

        if (!aErr && dbAssignments) {
          classroomAssignments = dbAssignments;
          saveState('campuslink_classroom_assignments', classroomAssignments);
        }

        const { data: dbSubTeachers, error: stErr } = await supabase
          .from('classroom_subject_teachers')
          .select('id, classroom_id, teacher_id, subject, teacher:profiles!teacher_id(full_name, email)')
          .in('classroom_id', cIds);

        if (!stErr && dbSubTeachers) {
          classroomSubjectTeachers = dbSubTeachers;
          saveState('campuslink_classroom_subject_teachers', classroomSubjectTeachers);
        }

        // ── 4. Student Counts per Classroom ────────────────────────
        try {
          const { data: studentRows } = await supabase
            .from('classroom_students')
            .select('classroom_id')
            .in('classroom_id', cIds);
          classroomStudentCounts = {};
          (studentRows || []).forEach(row => {
            classroomStudentCounts[row.classroom_id] = (classroomStudentCounts[row.classroom_id] || 0) + 1;
          });
        } catch (scErr) {
          console.warn('[Classroom] Student count fetch failed:', scErr);
        }
      }

      // ── 5. School Teachers ────────────────────────────────────────
      const { data: dbSchoolTeachers, error: tErr } = await supabase
        .from('school_members')
        .select('user_id, role, is_class_teacher, user:profiles!user_id(id, full_name, email, avatar_url, is_verified)')
        .eq('school_id', profile.id)
        .eq('role', 'teacher');

      if (!tErr && dbSchoolTeachers) {
        schoolTeachers = dbSchoolTeachers
          .filter(t => t.user)
          .map(t => ({
            id: t.user.id,
            full_name: t.user.full_name,
            email: t.user.email,
            is_class_teacher: t.is_class_teacher !== false,
            avatar_url: t.user.avatar_url || '',
            is_verified: t.user.is_verified === true,
            subject: ['Mathematics', 'Science', 'English', 'History', 'Geography', 'Computer Science'][Math.abs(t.user.id.charCodeAt(0) + (t.user.id.charCodeAt(1) || 0)) % 6],
            employee_id: 'EMP-T' + t.user.id.slice(0, 4).toUpperCase()
          }));
        saveState('campuslink_school_teachers', schoolTeachers);
      }

    } catch (err) {
      console.error('[Classroom] Fatal load error:', err);
      showToast('Failed to load classroom data. Please refresh.', 'error');
    }

    classroomLoading = false;
    renderAcademicYearsDropdowns();
    renderClassroomStats();
    renderClassroomsTable();
  }









  // Helper to draw table skeleton loading state
  function renderSkeletonLoading(tbody, columnsCount) {
    tbody.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const tr = document.createElement('tr');
      tr.className = 'skeleton-row';
      let tds = '';
      for (let j = 0; j < columnsCount; j++) {
        tds += `<td><div style="height: 18px; background: #E2E8F0; border-radius: 4px; animation: pulse 1.5s infinite ease-in-out;"></div></td>`;
      }
      tr.innerHTML = tds;
      tbody.appendChild(tr);
    }
  }

  // ── Classroom view mode: 'cards' or 'table' ───────────────
  let classroomViewMode = 'cards';

  // 3a. Render Stats Bar
  function renderClassroomStats() {
    const statsBar = document.getElementById('cl-stats-bar');
    if (!statsBar) return;

    if (classroomLoading) {
      statsBar.innerHTML = Array(4).fill(`
        <div class="cl-stat-card" style="background:#F8FAFC; border-color:#E2E8F0;">
          <div style="width:44px;height:44px;border-radius:12px;background:#E2E8F0;animation:pulse 1.5s infinite;"></div>
          <div><div style="height:10px;width:80px;background:#E2E8F0;border-radius:4px;margin-bottom:8px;animation:pulse 1.5s infinite;"></div>
          <div style="height:24px;width:40px;background:#E2E8F0;border-radius:4px;animation:pulse 1.5s infinite;"></div></div>
        </div>`).join('');
      return;
    }

    const activeClassrooms = classrooms.filter(c => !c.is_archived);
    const totalActive = activeClassrooms.length;
    const withTeacher = activeClassrooms.filter(c =>
      classroomAssignments.some(a => a.classroom_id === c.id && a.is_active && a.assignment_type === 'permanent')
    ).length;
    const totalStudents = Object.values(classroomStudentCounts).reduce((s, n) => s + n, 0);
    const activeCount = activeClassrooms.filter(c => c.status !== 'inactive').length;

    const stats = [
      { icon: '🏫', label: 'Total Classrooms', value: totalActive, bg: '#EFF6FF', iconBg: '#DBEAFE', color: '#2563EB' },
      { icon: '✅', label: 'Active', value: activeCount, bg: '#F0FDF4', iconBg: '#DCFCE7', color: '#16A34A' },
      { icon: '👩‍🏫', label: 'With Class Teacher', value: withTeacher, bg: '#FFF7ED', iconBg: '#FFEDD5', color: '#EA580C' },
      { icon: '🎒', label: 'Total Students', value: totalStudents, bg: '#FAF5FF', iconBg: '#EDE9FE', color: '#7C3AED' }
    ];

    statsBar.innerHTML = stats.map(s => `
      <div class="cl-stat-card" style="background:${s.bg}; border-color:${s.iconBg};">
        <div class="cl-stat-icon" style="background:${s.iconBg};">${s.icon}</div>
        <div>
          <div class="cl-stat-label" style="color:${s.color};">${s.label}</div>
          <div class="cl-stat-value" style="color:${s.color};">${s.value}</div>
        </div>
      </div>
    `).join('');
  }

  // Accent color palette for cards (cycles)
  const CL_CARD_ACCENTS = [
    'linear-gradient(90deg,#3B82F6,#60A5FA)',
    'linear-gradient(90deg,#10B981,#34D399)',
    'linear-gradient(90deg,#8B5CF6,#A78BFA)',
    'linear-gradient(90deg,#F59E0B,#FCD34D)',
    'linear-gradient(90deg,#EF4444,#F87171)',
    'linear-gradient(90deg,#06B6D4,#67E8F9)',
    'linear-gradient(90deg,#EC4899,#F9A8D4)',
    'linear-gradient(90deg,#14B8A6,#5EEAD4)'
  ];

  // 3b. Render Classroom Cards Grid (fully enhanced)
  function renderClassroomCards(filtered) {
    const grid = document.getElementById('classroom-grid-container');
    const heading = document.getElementById('cl-cards-heading');
    const section = document.getElementById('cl-cards-section');
    if (!grid) return;

    // Show/hide cards section based on view mode
    if (section) section.style.display = '';
    // always render cards

    // Loading skeleton
    if (classroomLoading) {
      if (heading) heading.textContent = 'Loading classrooms...';
      grid.innerHTML = Array(4).fill(`
        <div class="cl-card" style="animation:none;">
          <div style="height:5px;background:#E2E8F0;"></div>
          <div class="cl-card-body">
            <div style="height:20px;background:#E2E8F0;border-radius:6px;margin-bottom:8px;animation:pulse 1.5s infinite;"></div>
            <div style="height:12px;background:#F1F5F9;border-radius:4px;width:60%;animation:pulse 1.5s infinite;"></div>
            <hr class="cl-card-divider">
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${Array(4).fill('<div style="height:12px;background:#F1F5F9;border-radius:4px;animation:pulse 1.5s infinite;"></div>').join('')}
            </div>
          </div>
          <div class="cl-card-actions" style="background:#F8FAFC;"></div>
        </div>`).join('');
      return;
    }

    if (heading) {
      heading.textContent = filtered.length === 0
        ? 'No Classrooms'
        : `${filtered.length} Classroom${filtered.length !== 1 ? 's' : ''}`;
    }

    // Empty state
    if (filtered.length === 0) {
      const isArchived = classroomShowArchived;
      grid.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:60px 24px; color:var(--text-muted);">
          <div style="font-size:4rem; margin-bottom:16px; opacity:0.5;">${isArchived ? '📦' : '🏫'}</div>
          <div style="font-weight:800; font-size:1.1rem; color:var(--dark-bg); margin-bottom:8px;">
            ${isArchived ? 'No Archived Classrooms' : 'No Classrooms Created Yet'}
          </div>
          <div style="font-size:0.85rem; margin-bottom:24px; max-width:360px; margin-left:auto; margin-right:auto;">
            ${isArchived ? 'Archive classrooms to store them here.' : 'Get started by creating your first classroom for this academic year.'}
          </div>
          ${!isArchived ? `<button class="cl-card-btn cl-card-btn-primary" onclick="document.getElementById('btn-create-classroom-trigger').click()" style="padding:10px 24px; font-size:0.85rem;">+ Create Classroom</button>` : ''}
        </div>`;
      return;
    }

    grid.innerHTML = '';
    filtered.forEach((cls, idx) => {
      const accent = CL_CARD_ACCENTS[idx % CL_CARD_ACCENTS.length];
      const permAss = classroomAssignments.find(a => a.classroom_id === cls.id && a.is_active && a.assignment_type === 'permanent');
      const tempAss = classroomAssignments.find(a => a.classroom_id === cls.id && a.is_active && a.assignment_type === 'temporary' && isWithinDateRange(a.start_date, a.end_date));
      const subTeachers = classroomSubjectTeachers.filter(st => st.classroom_id === cls.id);
      const yearName = academicYears.find(y => y.id === cls.academic_year_id)?.name || '—';
      const teacherName = tempAss?.teacher?.full_name || permAss?.teacher?.full_name || null;
      const studentCount = classroomStudentCounts[cls.id] || 0;
      const createdDate = cls.created_at
        ? new Date(cls.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

      // Status badge
      let statusHtml = '';
      if (cls.is_archived) {
        statusHtml = `<span style="padding:3px 9px;border-radius:20px;font-size:0.68rem;font-weight:700;background:#E2E8F0;color:#475569;border:1px solid #CBD5E1;">📦 Archived</span>`;
      } else if (cls.status === 'inactive') {
        statusHtml = `<span style="padding:3px 9px;border-radius:20px;font-size:0.68rem;font-weight:700;background:#FEE2E2;color:#B91C1C;border:1px solid #FECACA;">⏸ Inactive</span>`;
      } else if (tempAss) {
        statusHtml = `<span style="padding:3px 9px;border-radius:20px;font-size:0.68rem;font-weight:700;background:#FEF3C7;color:#D97706;border:1px solid #FDE68A;">⏱ Temp Active</span>`;
      } else {
        statusHtml = `<span style="padding:3px 9px;border-radius:20px;font-size:0.68rem;font-weight:700;background:#D1FAE5;color:#059669;border:1px solid #A7F3D0;">● Active</span>`;
      }

      // Actions
      let actionsHtml = '';
      if (cls.is_archived) {
        actionsHtml = `
          <button class="cl-card-btn cl-card-btn-secondary cl-cbtn-details" data-id="${cls.id}">View</button>
          <button class="cl-card-btn cl-card-btn-secondary cl-cbtn-restore" data-id="${cls.id}" style="background:#D1FAE5;color:#059669;border:1px solid #A7F3D0;">↩ Restore</button>
          <button class="cl-card-btn cl-card-btn-danger cl-cbtn-delete" data-id="${cls.id}">🗑 Delete</button>`;
      } else {
        actionsHtml = `
          <button class="cl-card-btn cl-card-btn-secondary cl-cbtn-details" data-id="${cls.id}">👁 View</button>
          <button class="cl-card-btn cl-card-btn-primary cl-cbtn-teacher" data-id="${cls.id}">👩‍🏫 Teacher</button>
          <button class="cl-card-btn cl-card-btn-secondary cl-cbtn-edit" data-id="${cls.id}">✏️ Edit</button>
          <button class="cl-card-btn cl-card-btn-secondary cl-cbtn-subjects" data-id="${cls.id}">📚 Subjects</button>
          <button class="cl-card-btn cl-card-btn-danger cl-cbtn-archive" data-id="${cls.id}">Archive</button>`;
      }

      const card = document.createElement('div');
      card.className = 'cl-card';
      card.style.animationDelay = `${idx * 0.06}s`;
      card.innerHTML = `
        <div class="cl-card-accent" style="background:${accent};"></div>
        <div class="cl-card-body">
          <div class="cl-card-top">
            <div>
              <div class="cl-card-grade">${cls.grade}</div>
              <div class="cl-card-section">Section ${cls.section}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;">
              ${statusHtml}
              <span class="cl-card-year-badge">📅 ${yearName}</span>
            </div>
          </div>
          <hr class="cl-card-divider">
          <div class="cl-card-meta">
            <div class="cl-card-row">
              <span class="cl-card-row-icon">👩‍🏫</span>
              <span class="cl-card-row-label">Teacher</span>
              <span class="cl-card-row-value">${teacherName ||
                '<span style="color:var(--text-muted);font-style:italic;font-size:0.76rem;">Unassigned</span>'}</span>
            </div>
            <div class="cl-card-row">
              <span class="cl-card-row-icon">👥</span>
              <span class="cl-card-row-label">Students</span>
              <span class="cl-card-row-value">${studentCount} <span style="font-weight:400;color:var(--text-muted);font-size:0.75rem;">/ ${cls.capacity || '—'} capacity</span></span>
            </div>
            <div class="cl-card-row">
              <span class="cl-card-row-icon">🚪</span>
              <span class="cl-card-row-label">Room</span>
              <span class="cl-card-row-value">${cls.room || '<span style="color:var(--text-muted);">—</span>'}</span>
            </div>
            <div class="cl-card-row">
              <span class="cl-card-row-icon">🗓</span>
              <span class="cl-card-row-label">Created</span>
              <span class="cl-card-row-value" style="font-size:0.76rem;">${createdDate}</span>
            </div>
            ${subTeachers.length > 0 ? `
            <div class="cl-card-row" style="align-items:flex-start;">
              <span class="cl-card-row-icon">📚</span>
              <span class="cl-card-row-label">Subjects</span>
              <span style="display:flex;flex-wrap:wrap;gap:3px;">
                ${subTeachers.slice(0,3).map(st => `<span style="font-size:0.68rem;background:#EFF6FF;border:1px solid #BFDBFE;color:#1D4ED8;padding:2px 6px;border-radius:4px;font-weight:600;">${st.subject}</span>`).join('')}
                ${subTeachers.length > 3 ? `<span style="font-size:0.68rem;color:var(--text-muted);padding:2px;">+${subTeachers.length - 3} more</span>` : ''}
              </span>
            </div>` : ''}
          </div>
        </div>
        <div class="cl-card-actions">${actionsHtml}</div>`;

      grid.appendChild(card);
    });

    // Attach listeners
    grid.querySelectorAll('.cl-cbtn-details').forEach(b => b.addEventListener('click', () => openClassroomDetailsModal(b.dataset.id)));
    grid.querySelectorAll('.cl-cbtn-edit').forEach(b => b.addEventListener('click', () => openClassroomFormModal(b.dataset.id)));
    grid.querySelectorAll('.cl-cbtn-teacher').forEach(b => b.addEventListener('click', () => openTransferTeacherModal(b.dataset.id)));
    grid.querySelectorAll('.cl-cbtn-subjects').forEach(b => b.addEventListener('click', () => openSubjectTeachersModal(b.dataset.id)));
    grid.querySelectorAll('.cl-cbtn-restore').forEach(b => b.addEventListener('click', () => restoreClassroom(b.dataset.id)));
    grid.querySelectorAll('.cl-cbtn-delete').forEach(b => b.addEventListener('click', () => deleteClassroom(b.dataset.id)));
  }

  // Wire up view toggle buttons
  document.addEventListener('click', (e) => {
    if (e.target.id === 'cl-view-card-btn') {
      classroomViewMode = 'cards';
      document.getElementById('cl-view-card-btn')?.classList.add('active');
      document.getElementById('cl-view-table-btn')?.classList.remove('active');
      renderClassroomsTable();
    } else if (e.target.id === 'cl-view-table-btn') {
      classroomViewMode = 'table';
      document.getElementById('cl-view-card-btn')?.classList.remove('active');
      document.getElementById('cl-view-table-btn')?.classList.add('active');
      renderClassroomsTable();
    }
  });

  // 3. Render Classroom Tables with Search, Sorting, and Pagination
  function renderClassroomsTable() {
    const classroomsTbody = document.getElementById('classroom-grid-container');
    const filterAcademicYear = document.getElementById('filter-academic-year');
    const classroomSearchInput = document.getElementById('classroom-search-input');
    const paginationInfo = document.getElementById('classroom-pagination-info');
    const paginationButtons = document.getElementById('classroom-pagination-buttons');
    const btnShowArchivedToggle = document.getElementById('btn-show-archived-toggle');

    if (!classroomsTbody) return;

    if (classroomLoading) {
      classroomsTbody.innerHTML = Array(3).fill('<div style="height: 180px; background: #F1F5F9; border-radius: var(--radius-lg); animation: pulse 1.5s infinite ease-in-out; border: 1px solid var(--border-color);"></div>').join('');
      return;
    }

    // Toggle button UI update
    if (btnShowArchivedToggle) {
      if (classroomShowArchived) {
        btnShowArchivedToggle.textContent = 'Show Active';
        btnShowArchivedToggle.style.background = '#F1F5F9';
        btnShowArchivedToggle.style.borderColor = '#94A3B8';
      } else {
        btnShowArchivedToggle.textContent = 'Show Archived';
        btnShowArchivedToggle.style.background = 'var(--white)';
        btnShowArchivedToggle.style.borderColor = 'var(--border-color)';
      }
    }

    const activeYearId = filterAcademicYear?.value;
    const query = classroomSearchText.toLowerCase();

    // 1. Filtering
    let filtered = classrooms.filter(c => {
      // Academic year filter
      if (activeYearId && c.academic_year_id !== activeYearId) return false;
      // Archived filter
      if (classroomShowArchived) {
        if (!c.is_archived) return false;
      } else {
        if (c.is_archived) return false;
      }

      // Live search filter
      if (query) {
        const gradeMatch = c.grade.toLowerCase().includes(query);
        const secMatch = c.section.toLowerCase().includes(query);
        const roomMatch = (c.room || '').toLowerCase().includes(query);
        
        // Find class teacher name matches
        const activeAss = classroomAssignments.find(a => a.classroom_id === c.id && a.is_active && a.assignment_type === 'permanent');
        const teacherName = activeAss?.teacher?.full_name?.toLowerCase() || '';
        const teacherMatch = teacherName.includes(query);

        // Find academic year name matches
        const yearName = academicYears.find(y => y.id === c.academic_year_id)?.name?.toLowerCase() || '';
        const yearMatch = yearName.includes(query);

        return gradeMatch || secMatch || roomMatch || teacherMatch || yearMatch;
      }
      return true;
    });

    // 2. Sorting
    filtered.sort((a, b) => {
      let valA = '', valB = '';
      if (classroomSortColumn === 'grade') {
        valA = a.grade;
        valB = b.grade;
      } else if (classroomSortColumn === 'section') {
        valA = a.section;
        valB = b.section;
      } else if (classroomSortColumn === 'room') {
        valA = a.room || '';
        valB = b.room || '';
      } else if (classroomSortColumn === 'year') {
        valA = academicYears.find(y => y.id === a.academic_year_id)?.name || '';
        valB = academicYears.find(y => y.id === b.academic_year_id)?.name || '';
      } else if (classroomSortColumn === 'teacher') {
        const assA = classroomAssignments.find(as => as.classroom_id === a.id && as.is_active && as.assignment_type === 'permanent');
        const assB = classroomAssignments.find(as => as.classroom_id === b.id && as.is_active && as.assignment_type === 'permanent');
        valA = assA?.teacher?.full_name || '';
        valB = assB?.teacher?.full_name || '';
      } else if (classroomSortColumn === 'status') {
        valA = a.status || 'active';
        valB = b.status || 'active';
      }

      if (classroomSortOrder === 'asc') {
        return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      } else {
        return valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
      }
    });

    // 3. Pagination
    const totalEntries = filtered.length;
    const totalPages = Math.ceil(totalEntries / classroomPageSize) || 1;
    if (classroomCurrentPage > totalPages) classroomCurrentPage = totalPages;

    const startIdx = (classroomCurrentPage - 1) * classroomPageSize;
    const endIdx = Math.min(startIdx + classroomPageSize, totalEntries);
    const paginated = filtered.slice(startIdx, endIdx);

    // Render stats bar (always) and classroom cards
    renderClassroomStats();
    renderClassroomCards(paginated);

    // Show/hide the table card section based on view mode
    const tableCard = classroomsTbody?.closest('.dash-table-card');
    if (tableCard) tableCard.style.display = classroomViewMode === 'table' ? '' : 'none';

    // Update pagination info text
    if (paginationInfo) {
      if (totalEntries === 0) {
        paginationInfo.textContent = 'Showing 0 to 0 of 0 entries';
      } else {
        paginationInfo.textContent = `Showing ${startIdx + 1} to ${endIdx} of ${totalEntries} entries`;
      }
    }

    // Render pagination buttons
    if (paginationButtons) {
      paginationButtons.innerHTML = '';
      
      // Prev button
      const prevBtn = document.createElement('button');
      prevBtn.className = `btn btn-secondary ${classroomCurrentPage === 1 ? 'disabled' : ''}`;
      prevBtn.style.padding = '6px 12px';
      prevBtn.style.fontSize = '0.78rem';
      prevBtn.textContent = 'Previous';
      if (classroomCurrentPage > 1) {
        prevBtn.addEventListener('click', () => {
          classroomCurrentPage--;
          renderClassroomsTable();
        });
      }
      paginationButtons.appendChild(prevBtn);

      // Page numbers
      for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `btn ${classroomCurrentPage === i ? 'btn-primary' : 'btn-secondary'}`;
        pageBtn.style.padding = '6px 12px';
        pageBtn.style.fontSize = '0.78rem';
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
          classroomCurrentPage = i;
          renderClassroomsTable();
        });
        paginationButtons.appendChild(pageBtn);
      }

      // Next button
      const nextBtn = document.createElement('button');
      nextBtn.className = `btn btn-secondary ${classroomCurrentPage === totalPages ? 'disabled' : ''}`;
      nextBtn.style.padding = '6px 12px';
      nextBtn.style.fontSize = '0.78rem';
      nextBtn.textContent = 'Next';
      if (classroomCurrentPage < totalPages) {
        nextBtn.addEventListener('click', () => {
          classroomCurrentPage++;
          renderClassroomsTable();
        });
      }
      paginationButtons.appendChild(nextBtn);
    }

    return;
    // Render empty state
    if (paginated.length === 0) {
      classroomsTbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 60px 40px; color: var(--text-muted);">
            <div style="font-size: 2.5rem; margin-bottom: 12px;">🏫</div>
            <div style="font-weight: 700; font-size: 1rem; color: var(--text-main); margin-bottom: 6px;">No Classrooms Found</div>
            <div style="font-size: 0.82rem; max-width: 320px; margin: 0 auto 16px auto;">
              No records exist for the chosen Academic Year or search filter.
            </div>
            ${classroomShowArchived ? '' : `<button class="btn btn-primary" onclick="document.getElementById('btn-create-classroom-trigger').click()" style="padding: 8px 16px; font-size: 0.8rem; font-weight: 700; border-radius: var(--radius-sm);">Create Classroom</button>`}
          </td>
        </tr>
      `;
      return;
    }

    // Draw rows
    paginated.forEach(cls => {
      const permAss = classroomAssignments.find(a => a.classroom_id === cls.id && a.is_active && a.assignment_type === 'permanent');
      const tempAss = classroomAssignments.find(a => a.classroom_id === cls.id && a.is_active && a.assignment_type === 'temporary' && isWithinDateRange(a.start_date, a.end_date));

      // Subject teachers
      const subTeachers = classroomSubjectTeachers.filter(st => st.classroom_id === cls.id);
      const subTeacherBadges = subTeachers.map(st => {
        return `<span style="font-size:0.7rem; background:#F1F5F9; border:1px solid var(--border-color); padding:2px 6px; border-radius:4px; margin-right:4px; display:inline-block; font-weight:550; color:var(--text-main);">
          ${st.subject}: ${st.teacher?.full_name || 'Teacher'}
        </span>`;
      }).join('') || '<span style="color:var(--text-muted); font-size:0.78rem;">None</span>';

      const yearName = academicYears.find(y => y.id === cls.academic_year_id)?.name || 'Unknown';

      let teacherHtml = '';
      if (tempAss) {
        teacherHtml = `
          <div style="font-weight: 700; color: var(--text-main);">${permAss?.teacher?.full_name || 'Unassigned'}</div>
          <div style="font-size: 0.72rem; color: #D97706; margin-top: 2px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; background: #FFFBEB; padding: 2px 6px; border-radius: 4px; border: 1px solid #FDE68A;">
            <span>⏱️</span> Temp Active: ${tempAss?.teacher?.full_name}
          </div>
        `;
      } else if (permAss) {
        teacherHtml = `<div style="font-weight: 700; color: var(--text-main);">${permAss.teacher.full_name}</div>`;
      } else {
        teacherHtml = `<span style="color: var(--text-muted); font-style: italic; font-size: 0.82rem;">Unassigned</span>`;
      }

      // Status chip render
      let statusBadge = '';
      if (cls.is_archived) {
        statusBadge = `<span style="display:inline-block; padding:2px 8px; border-radius:12px; font-size:0.72rem; font-weight:700; background:#E2E8F0; color:#475569; border:1px solid #cbd5e1;">Archived</span>`;
      } else if (cls.status === 'inactive') {
        statusBadge = `<span style="display:inline-block; padding:2px 8px; border-radius:12px; font-size:0.72rem; font-weight:700; background:#FEE2E2; color:#B91C1C; border:1px solid #FECACA;">Inactive</span>`;
      } else if (tempAss) {
        statusBadge = `<span style="display:inline-block; padding:2px 8px; border-radius:12px; font-size:0.72rem; font-weight:700; background:#FEF3C7; color:#D97706; border:1px solid #FDE68A;">Temp Active</span>`;
      } else {
        statusBadge = `<span style="display:inline-block; padding:2px 8px; border-radius:12px; font-size:0.72rem; font-weight:700; background:#D1FAE5; color:#059669; border:1px solid #A7F3D0;">Active</span>`;
      }

      const tr = document.createElement('tr');
      
      let actionButtonsHtml = '';
      if (cls.is_archived) {
        actionButtonsHtml = `
          <button class="btn btn-secondary btn-classroom-details" data-id="${cls.id}" style="padding: 5px 10px; font-size: 0.75rem; border-radius: 4px;">Details</button>
          <button class="btn btn-classroom-restore" data-id="${cls.id}" style="padding: 5px 10px; font-size: 0.75rem; border-radius: 4px; background: #D1FAE5; color: #059669; border: 1px solid #A7F3D0; font-weight: 700;">Restore</button>
        `;
      } else {
        actionButtonsHtml = `
          <button class="btn btn-secondary btn-classroom-details" data-id="${cls.id}" style="padding: 5px 10px; font-size: 0.75rem; border-radius: 4px;">Details</button>
          <button class="btn btn-secondary btn-classroom-edit" data-id="${cls.id}" style="padding: 5px 10px; font-size: 0.75rem; border-radius: 4px;">Edit</button>
          <button class="btn btn-primary btn-transfer-teacher" data-id="${cls.id}" style="padding: 5px 10px; font-size: 0.75rem; border-radius: 4px; font-weight: 700;">Class Teacher</button>
          <button class="btn btn-secondary btn-temp-teacher" data-id="${cls.id}" style="padding: 5px 10px; font-size: 0.75rem; border-radius: 4px;">Temp</button>
          <button class="btn btn-secondary btn-subject-teachers" data-id="${cls.id}" style="padding: 5px 10px; font-size: 0.75rem; border-radius: 4px;">Subjects</button>
          <button class="btn btn-classroom-archive" data-id="${cls.id}" style="padding: 5px 10px; font-size: 0.75rem; border-radius: 4px; background: #FEE2E2; color: #EF4444; border: 1px solid #FECACA;">Archive</button>
        `;
      }

      tr.innerHTML = `
        <td style="font-weight: 800; color: var(--dark-bg);">${cls.grade}</td>
        <td style="font-weight: 600;">Section ${cls.section}</td>
        <td>${cls.room || 'N/A'}</td>
        <td style="font-size:0.82rem; font-weight:600; color:var(--text-muted);">${yearName}</td>
        <td>${teacherHtml}</td>
        <td><div style="display:flex; flex-wrap:wrap; gap:4px; max-width:280px;">${subTeacherBadges}</div></td>
        <td>${statusBadge}</td>
        <td>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            ${actionButtonsHtml}
          </div>
        </td>
      `;
      classroomsTbody.appendChild(tr);
    });

    // Attach row button click listeners
    classroomsTbody.querySelectorAll('.btn-classroom-details').forEach(btn => {
      btn.addEventListener('click', () => openClassroomDetailsModal(btn.getAttribute('data-id')));
    });

    classroomsTbody.querySelectorAll('.btn-classroom-edit').forEach(btn => {
      btn.addEventListener('click', () => openClassroomFormModal(btn.getAttribute('data-id')));
    });

    classroomsTbody.querySelectorAll('.btn-transfer-teacher').forEach(btn => {
      btn.addEventListener('click', () => openTransferTeacherModal(btn.getAttribute('data-id')));
    });

    classroomsTbody.querySelectorAll('.btn-temp-teacher').forEach(btn => {
      btn.addEventListener('click', () => openTempTeacherModal(btn.getAttribute('data-id')));
    });

    classroomsTbody.querySelectorAll('.btn-subject-teachers').forEach(btn => {
      btn.addEventListener('click', () => openSubjectTeachersModal(btn.getAttribute('data-id')));
    });

    classroomsTbody.querySelectorAll('.btn-classroom-archive').forEach(btn => {
      btn.addEventListener('click', () => archiveClassroom(btn.getAttribute('data-id')));
    });

    classroomsTbody.querySelectorAll('.btn-classroom-restore').forEach(btn => {
      btn.addEventListener('click', () => restoreClassroom(btn.getAttribute('data-id')));
    });
  }

  // Header listeners initialization
  const btnShowArchivedToggle = document.getElementById('btn-show-archived-toggle');
  if (btnShowArchivedToggle) {
    btnShowArchivedToggle.addEventListener('click', () => {
      classroomShowArchived = !classroomShowArchived;
      classroomCurrentPage = 1;
      renderClassroomsTable();
    });
  }

  // 4. Create/Edit Classroom
  const btnCreateClassroomTrigger = document.getElementById('btn-create-classroom-trigger');
  const classroomFormModal = document.getElementById('classroom-form-modal');
  const classroomDetailsForm = document.getElementById('classroom-details-form');
  const classroomModalTitle = document.getElementById('classroom-modal-title');
  const classroomEditId = document.getElementById('classroom-edit-id');
  const classroomGradeInput = document.getElementById('classroom-grade-input');
  const classroomRoomInput = document.getElementById('classroom-room-input');
  const classroomCapacityInput = document.getElementById('classroom-capacity-input');
  const classroomStatusSelect = document.getElementById('classroom-status-select');
  const classroomAcademicYearSelect = document.getElementById('classroom-academic-year-select');

  let classroomStep = 1;
  let selectedTeacherId = null;

  const VALID_GRADES = ['Nursery', 'KG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
  if (btnCreateClassroomTrigger) {
    btnCreateClassroomTrigger.addEventListener('click', () => {
      openClassroomFormModal();
    });
  }

  // Handle Section custom select dropdown toggle
  const classroomSectionSelect = document.getElementById('classroom-section-select');
  const classroomSectionInput = document.getElementById('classroom-section-input');
  if (classroomSectionSelect && classroomSectionInput) {
    classroomSectionSelect.addEventListener('change', (e) => {
      if (e.target.value === 'custom') {
        classroomSectionInput.style.display = 'block';
        classroomSectionInput.value = '';
        classroomSectionInput.focus();
      } else {
        classroomSectionInput.style.display = 'none';
        classroomSectionInput.value = e.target.value;
      }
    });
  }

  // Stepper step navigation helper
  function goToClassroomStep(step) {
    classroomStep = step;
    
    // Step containers
    const step1 = document.getElementById('classroom-modal-step-1-container');
    const step2 = document.getElementById('classroom-modal-step-2-container');
    const step3 = document.getElementById('classroom-modal-step-3-container');
    
    // Stepper header indicators
    const tab1 = document.getElementById('classroom-step-tab-1');
    const tab2 = document.getElementById('classroom-step-tab-2');
    const tab3 = document.getElementById('classroom-step-tab-3');
    const ind1 = document.getElementById('classroom-step-indicator-1');
    const ind2 = document.getElementById('classroom-step-indicator-2');
    const ind3 = document.getElementById('classroom-step-indicator-3');
    const lbl1 = document.getElementById('classroom-step-label-1');
    const lbl2 = document.getElementById('classroom-step-label-2');
    const lbl3 = document.getElementById('classroom-step-label-3');
    
    // Buttons
    const backBtn = document.getElementById('btn-classroom-modal-back');
    const nextBtn = document.getElementById('btn-classroom-modal-next');
    
    if (step === 1) {
      if (step1) step1.style.display = 'flex';
      if (step2) step2.style.display = 'none';
      if (step3) step3.style.display = 'none';
      if (backBtn) backBtn.style.display = 'none';
      if (nextBtn) nextBtn.textContent = 'Next';
      
      if (tab1) tab1.style.opacity = '1';
      if (tab2) tab2.style.opacity = '0.5';
      if (tab3) tab3.style.opacity = '0.5';
      if (ind1) ind1.style.background = 'var(--primary)';
      if (ind2) ind2.style.background = 'var(--border-color)';
      if (ind3) ind3.style.background = 'var(--border-color)';
    } 
    else if (step === 2) {
      if (step1) step1.style.display = 'none';
      if (step2) step2.style.display = 'flex';
      if (step3) step3.style.display = 'none';
      if (backBtn) backBtn.style.display = 'block';
      if (nextBtn) nextBtn.textContent = 'Next';
      
      if (tab1) tab1.style.opacity = '1';
      if (tab2) tab2.style.opacity = '1';
      if (tab3) tab3.style.opacity = '0.5';
      if (ind1) ind1.style.background = '#10B981'; // Green completed
      if (ind2) ind2.style.background = 'var(--primary)';
      if (ind3) ind3.style.background = 'var(--border-color)';
      
      renderStep2TeachersList();
    } 
    else if (step === 3) {
      if (step1) step1.style.display = 'none';
      if (step2) step2.style.display = 'none';
      if (step3) step3.style.display = 'flex';
      if (backBtn) backBtn.style.display = 'block';
      
      const isEdit = !!classroomEditId?.value;
      if (nextBtn) nextBtn.textContent = isEdit ? 'Save Changes' : 'Create Classroom';
      
      if (tab1) tab1.style.opacity = '1';
      if (tab2) tab2.style.opacity = '1';
      if (tab3) tab3.style.opacity = '1';
      if (ind1) ind1.style.background = '#10B981';
      if (ind2) ind2.style.background = '#10B981';
      if (ind3) ind3.style.background = 'var(--primary)';
      
      populateStep3Summary();
    }
  }

  // Populate Summary Step
  function populateStep3Summary() {
    const grade = classroomGradeInput?.value || '';
    const section = (classroomSectionSelect?.value === 'custom' ? classroomSectionInput?.value : classroomSectionSelect?.value) || '';
    const yearId = classroomAcademicYearSelect?.value || '';
    const room = classroomRoomInput?.value || '';
    const capacity = classroomCapacityInput?.value || '40';
    const status = classroomStatusSelect?.value || 'active';
    const editId = classroomEditId?.value || '';

    const yearName = academicYears.find(y => y.id === yearId)?.name || 'Unknown';
    
    // Fill text labels
    document.getElementById('summary-grade').textContent = grade;
    document.getElementById('summary-section').textContent = section;
    document.getElementById('summary-academic-year').textContent = yearName;
    document.getElementById('summary-room').textContent = room || 'None Assigned';
    document.getElementById('summary-capacity').textContent = capacity;
    document.getElementById('summary-status').textContent = status === 'active' ? 'Active' : 'Inactive';

    // Show/hide teacher detail card
    const teacherCard = document.getElementById('summary-teacher-card');
    if (selectedTeacherId) {
      const teacher = schoolTeachers.find(t => t.id === selectedTeacherId);
      if (teacher) {
        if (teacherCard) teacherCard.style.display = 'flex';
        document.getElementById('summary-teacher-name').textContent = teacher.full_name;
        document.getElementById('summary-teacher-sub').textContent = `Subject: ${teacher.subject || 'General'}`;
        const photo = document.getElementById('summary-teacher-photo');
        if (photo) {
          if (teacher.avatar_url) {
            photo.innerHTML = `<img src="${teacher.avatar_url}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
          } else {
            photo.innerHTML = teacher.full_name.charAt(0).toUpperCase();
          }
        }
      }
    } else {
      if (teacherCard) teacherCard.style.display = 'none';
      const noTeacherLabel = document.createElement('div');
      noTeacherLabel.id = 'summary-no-teacher-lbl';
      noTeacherLabel.style.cssText = 'font-weight:600;font-size:0.85rem;color:var(--text-muted);font-style:italic;';
      noTeacherLabel.textContent = 'No Class Teacher assigned';
      const parent = teacherCard?.parentElement;
      const oldLbl = parent?.querySelector('#summary-no-teacher-lbl');
      if (oldLbl) oldLbl.remove();
      parent?.appendChild(noTeacherLabel);
    }

    // Perform live duplicate check
    const isDuplicate = classrooms.some(c => 
      c.academic_year_id === yearId && 
      c.grade === grade && 
      c.section.toUpperCase() === section.trim().toUpperCase() && 
      c.id !== editId &&
      !c.is_archived
    );

    const valError = document.getElementById('classroom-modal-validation-error');
    if (isDuplicate) {
      if (valError) {
        valError.style.display = 'block';
        valError.textContent = `A classroom with Grade "${grade}" and Section "${section}" already exists in Academic Session "${yearName}".`;
      }
    } else {
      if (valError) valError.style.display = 'none';
    }
  }

  // Render Step 2 Teacher Selection
  function renderStep2TeachersList() {
    const listContainer = document.getElementById('classroom-teachers-list-container');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    const query = document.getElementById('classroom-teacher-search-input')?.value?.toLowerCase() || '';
    const yearId = classroomAcademicYearSelect?.value || '';

    // Filter teachers based on query
    const filtered = schoolTeachers.filter(t => 
      t.full_name.toLowerCase().includes(query) || 
      t.email.toLowerCase().includes(query)
    );

    // Unassigned selection card handling
    const unassignedCard = document.getElementById('teacher-card-unassigned');
    const unassignedCheck = document.getElementById('teacher-unassigned-check');
    if (unassignedCard) {
      if (!selectedTeacherId) {
        unassignedCard.style.borderColor = 'var(--primary)';
        unassignedCard.style.background = '#EFF6FF';
        if (unassignedCheck) unassignedCheck.style.display = 'block';
      } else {
        unassignedCard.style.borderColor = 'var(--border-color)';
        unassignedCard.style.background = 'var(--white)';
        if (unassignedCheck) unassignedCheck.style.display = 'none';
      }
      unassignedCard.onclick = () => {
        selectedTeacherId = null;
        renderStep2TeachersList();
      };
    }

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding:24px 12px; color:var(--text-muted); font-size:0.82rem;">
          No matching teachers found in Community Members.
        </div>`;
      return;
    }

    filtered.forEach(teacher => {
      const isSelected = selectedTeacherId === teacher.id;
      
      // Check if already assigned as Class Teacher elsewhere in the SAME Academic Year
      const otherClass = classrooms.find(c => 
        !c.is_archived && 
        c.academic_year_id === yearId && 
        classroomAssignments.some(a => a.classroom_id === c.id && a.is_active && a.assignment_type === 'permanent' && a.teacher_id === teacher.id && c.id !== classroomEditId?.value)
      );

      const avatarHtml = teacher.avatar_url 
        ? `<img src="${teacher.avatar_url}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
        : `<div style="width:40px;height:40px;border-radius:50%;background:#F1F5F9;color:var(--text-muted);display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;font-size:0.9rem;">${teacher.full_name.charAt(0).toUpperCase()}</div>`;

      const card = document.createElement('div');
      card.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        border: 2px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'};
        background: ${isSelected ? '#EFF6FF' : 'var(--white)'};
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all 0.2s;
      `;
      card.onmouseenter = () => { if (!isSelected) card.style.borderColor = '#CBD5E1'; };
      card.onmouseleave = () => { if (!isSelected) card.style.borderColor = 'var(--border-color)'; };

      card.innerHTML = `
        ${avatarHtml}
        <div style="flex-grow: 1; min-width: 0;">
          <div style="display:flex; align-items:center; gap:6px;">
            <div style="font-weight:700; font-size:0.88rem; color:var(--dark-bg); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${teacher.full_name}</div>
            ${teacher.is_verified ? '<span style="font-size:0.75rem; color:#3B82F6;" title="Verified Profile">✓</span>' : ''}
          </div>
          <div style="font-size:0.72rem; color:var(--text-muted); display:flex; gap:8px;">
            <span>Sub: ${teacher.subject || 'General'}</span>
            <span>• ID: ${teacher.employee_id || 'N/A'}</span>
          </div>
          ${otherClass ? `<span style="display:inline-block; margin-top:4px; font-size:0.65rem; font-weight:700; background:#FEF3C7; color:#D97706; padding:2px 6px; border-radius:4px; border:1px solid #FDE68A;">⚠️ Class Teacher of ${otherClass.grade}-${otherClass.section}</span>` : ''}
        </div>
        ${isSelected ? '<div style="font-size:1.2rem; color:var(--primary); font-weight:700;">✓</div>' : ''}
      `;

      card.addEventListener('click', () => {
        selectedTeacherId = teacher.id;
        renderStep2TeachersList();
      });

      listContainer.appendChild(card);
    });
  }

  // Wire search input inside Step 2
  const teacherSearchInput = document.getElementById('classroom-teacher-search-input');
  if (teacherSearchInput) {
    teacherSearchInput.addEventListener('input', () => {
      renderStep2TeachersList();
    });
  }

  // Stepper Navigation buttons wiring
  const btnStepBack = document.getElementById('btn-classroom-modal-back');
  const btnStepNext = document.getElementById('btn-classroom-modal-next');

  if (btnStepBack) {
    btnStepBack.addEventListener('click', () => {
      if (classroomStep > 1) {
        goToClassroomStep(classroomStep - 1);
      }
    });
  }

  if (btnStepNext) {
    btnStepNext.addEventListener('click', async () => {
      if (classroomStep === 1) {
        const yearId = classroomAcademicYearSelect?.value;
        const grade = classroomGradeInput?.value;
        const section = (classroomSectionSelect?.value === 'custom' ? classroomSectionInput?.value : classroomSectionSelect?.value) || '';

        if (!yearId) { showToast('Please select an Academic Session.', 'error'); return; }
        if (!grade) { showToast('Please select a Grade level.', 'error'); return; }
        if (!section.trim()) { showToast('Please select or specify a Section.', 'error'); return; }

        goToClassroomStep(2);
      } 
      else if (classroomStep === 2) {
        goToClassroomStep(3);
      } 
      else if (classroomStep === 3) {
        // Submit configuration!
        const editId = classroomEditId.value;
        const yearId = classroomAcademicYearSelect.value;
        const grade = classroomGradeInput.value;
        const section = (classroomSectionSelect.value === 'custom' ? classroomSectionInput.value : classroomSectionSelect.value).trim().toUpperCase();
        const room = classroomRoomInput.value.trim();
        const capacity = parseInt(classroomCapacityInput.value, 10) || 40;
        const status = classroomStatusSelect.value;

        // Perform final duplicate check
        const isDuplicate = classrooms.some(c => 
          c.academic_year_id === yearId && 
          c.grade === grade && 
          c.section.toUpperCase() === section && 
          c.id !== editId &&
          !c.is_archived
        );

        if (isDuplicate) {
          showToast(`Duplicate Classroom: Class ${grade}-${section} already exists in this Academic Year!`, 'error');
          return;
        }

        const payload = {
          school_id: profile.id,
          academic_year_id: yearId,
          grade,
          section,
          room,
          capacity,
          status,
          is_archived: false
        };

        try {
          let savedClassId = editId || 'class-' + Date.now();
          if (editId) {
            // Edit Mode Save
            if (supabase) {
              const { error } = await supabase.from('classrooms').update(payload).eq('id', editId);
              if (error) throw error;
            }
            
            // Sync locally
            classrooms = classrooms.map(c => c.id === editId ? { ...c, ...payload } : c);
            showToast('Classroom details updated successfully! ✅');
          } else {
            // Create Mode Save
            if (supabase) {
              const { data, error } = await supabase.from('classrooms').insert(payload).select().single();
              if (error) throw error;
              if (data) savedClassId = data.id;
            }
            payload.id = savedClassId;
            classrooms.push(payload);
            showToast('Classroom created successfully! ✅');
          }
          saveState('campuslink_classrooms', classrooms);

          // Handle Class Teacher Assignment
          const now = new Date().toISOString();
          const currentPerm = classroomAssignments.find(a => a.classroom_id === savedClassId && a.is_active && a.assignment_type === 'permanent');
          
          if (selectedTeacherId) {
            // Assign selected teacher if different
            if (!currentPerm || currentPerm.teacher_id !== selectedTeacherId) {
              if (supabase) {
                // Deactivate old permanent assignments
                await supabase.from('classroom_teacher_assignments').update({ is_active: false, end_date: now }).eq('classroom_id', savedClassId).eq('assignment_type', 'permanent').eq('is_active', true);
                // Insert new permanent assignment
                await supabase.from('classroom_teacher_assignments').insert({
                  classroom_id: savedClassId,
                  teacher_id: selectedTeacherId,
                  assignment_type: 'permanent',
                  start_date: now,
                  is_active: true
                });
              }

              // Local sync
              classroomAssignments = classroomAssignments.map(a => 
                (a.classroom_id === savedClassId && a.assignment_type === 'permanent' && a.is_active) 
                  ? { ...a, is_active: false, end_date: now } 
                  : a
              );
              
              const teacherObj = schoolTeachers.find(t => t.id === selectedTeacherId);
              classroomAssignments.push({
                id: 'assign-' + Date.now(),
                classroom_id: savedClassId,
                teacher_id: selectedTeacherId,
                assignment_type: 'permanent',
                start_date: now,
                is_active: true,
                teacher: {
                  full_name: teacherObj?.full_name || 'Teacher',
                  email: teacherObj?.email || ''
                }
              });
              saveState('campuslink_classroom_assignments', classroomAssignments);
            }
          } else {
            // Unassign current teacher if any
            if (currentPerm) {
              if (supabase) {
                await supabase.from('classroom_teacher_assignments').update({ is_active: false, end_date: now }).eq('classroom_id', savedClassId).eq('assignment_type', 'permanent').eq('is_active', true);
              }
              classroomAssignments = classroomAssignments.map(a => 
                (a.classroom_id === savedClassId && a.assignment_type === 'permanent' && a.is_active) 
                  ? { ...a, is_active: false, end_date: now } 
                  : a
              );
              saveState('campuslink_classroom_assignments', classroomAssignments);
            }
          }

          classroomFormModal.style.display = 'none';
          await refreshClassroomData();
        } catch (saveErr) {
          console.error('[Classroom] Save failed:', saveErr);
          showToast('Failed to save classroom: ' + saveErr.message, 'error');
        }
      }
    });
  }

  function openClassroomFormModal(classId = null) {
    if (!classroomFormModal) return;
    
    // Ensure section select input matches values
    if (classroomSectionSelect) classroomSectionSelect.value = 'A';
    if (classroomSectionInput) {
      classroomSectionInput.value = 'A';
      classroomSectionInput.style.display = 'none';
    }

    renderAcademicYearsDropdowns(); // Ensure dropdowns are synced

    if (classId) {
      // ── EDIT MODE ────────────────────────────────────
      const cls = classrooms.find(c => c.id === classId);
      if (cls) {
        classroomModalTitle.textContent = 'Edit Classroom Details';
        classroomEditId.value = cls.id;
        classroomGradeInput.value = cls.grade;
        
        // Match section select
        if (classroomSectionSelect) {
          const matchedOption = Array.from(classroomSectionSelect.options).find(opt => opt.value === cls.section);
          if (matchedOption) {
            classroomSectionSelect.value = cls.section;
            classroomSectionInput.style.display = 'none';
            classroomSectionInput.value = cls.section;
          } else {
            classroomSectionSelect.value = 'custom';
            classroomSectionInput.style.display = 'block';
            classroomSectionInput.value = cls.section;
          }
        }

        classroomRoomInput.value = cls.room || '';
        classroomCapacityInput.value = cls.capacity || 40;
        classroomStatusSelect.value = cls.status || 'active';
        
        // Find assigned teacher
        const perm = classroomAssignments.find(a => a.classroom_id === classId && a.is_active && a.assignment_type === 'permanent');
        selectedTeacherId = perm ? perm.teacher_id : null;

        if (classroomAcademicYearSelect) {
          classroomAcademicYearSelect.value = cls.academic_year_id;
        }
      }
    } else {
      // ── CREATE MODE ──────────────────────────────────
      classroomModalTitle.textContent = 'Create New Classroom';
      classroomEditId.value = '';
      classroomGradeInput.value = 'Grade 9';
      classroomRoomInput.value = '';
      classroomCapacityInput.value = 40;
      classroomStatusSelect.value = 'active';
      selectedTeacherId = null;

      if (classroomAcademicYearSelect) {
        const activeYear = academicYears.find(y => y.is_active);
        const newestYear = [...academicYears].sort((a, b) => b.name.localeCompare(a.name))[0];
        classroomAcademicYearSelect.value = activeYear?.id || newestYear?.id || '';
      }
    }
    
    // Clear search
    const searchInput = document.getElementById('classroom-teacher-search-input');
    if (searchInput) searchInput.value = '';

    goToClassroomStep(1);
    classroomFormModal.style.display = 'flex';
  }




















        // Always re-fetch from DB to ensure UI is in sync








  // 5. Soft Archive Classroom
  async function archiveClassroom(classId) {
    if (!confirm('Archive this classroom? All records are preserved but it will be hidden from the dashboard.')) return;
    try {
      if (supabase) {
        const { error } = await supabase.from('classrooms').update({ is_archived: true }).eq('id', classId);
        if (error) throw error;
      }
      showToast('Classroom archived. ✅');
      await refreshClassroomData();
    } catch (err) {
      console.error('[Classroom] Archive error:', err);
      showToast('Archive failed: ' + err.message, 'error');
    }
  }

  // Soft Restore Classroom
  async function restoreClassroom(classId) {
    try {
      if (supabase) {
        const { error } = await supabase.from('classrooms').update({ is_archived: false }).eq('id', classId);
        if (error) throw error;
      }
      showToast('Classroom restored successfully! ✅');
      await refreshClassroomData();
    } catch (err) {
      console.error('[Classroom] Restore error:', err);
      showToast('Restore failed: ' + err.message, 'error');
    }
  }

  // Hard Delete Classroom (with confirmation)
  async function deleteClassroom(classId) {
    const cls = classrooms.find(c => c.id === classId);
    if (!confirm(`Permanently delete classroom "${cls?.grade || ''} - ${cls?.section || ''}"? This cannot be undone.`)) return;
    try {
      if (supabase) {
        const { error } = await supabase.from('classrooms').delete().eq('id', classId);
        if (error) throw error;
      }
      showToast('Classroom permanently deleted.');
      await refreshClassroomData();
    } catch (err) {
      console.error('[Classroom] Delete error:', err);
      showToast('Delete failed: ' + err.message, 'error');
    }
  }

  // 6. Transfer Class Teacher Flow
  const transferTeacherModal = document.getElementById('transfer-teacher-modal');
  const transferScreenForm = document.getElementById('transfer-screen-form');
  const transferScreenConfirm = document.getElementById('transfer-screen-confirm');
  const transferTeacherSelect = document.getElementById('transfer-teacher-select');
  const transferTeacherSearch = document.getElementById('transfer-teacher-search');
  const transferClassLabel = document.getElementById('transfer-class-label');
  const transferCurrentTeacherLabel = document.getElementById('transfer-current-teacher-label');
  const transferConfirmMsg = document.getElementById('transfer-confirm-msg');
  const btnNextTransfer = document.getElementById('btn-next-transfer');
  const btnBackTransfer = document.getElementById('btn-back-transfer');
  const btnConfirmTransferSubmit = document.getElementById('btn-confirm-transfer-submit');

  let activeTransferClassId = null;

  function openTransferTeacherModal(classId) {
    if (!transferTeacherModal) return;
    activeTransferClassId = classId;

    const cls = classrooms.find(c => c.id === classId);
    if (!cls) return;

    transferClassLabel.textContent = `Class: ${cls.grade}-${cls.section} (${cls.room || 'No Room'})`;
    
    const currentPerm = classroomAssignments.find(a => a.classroom_id === classId && a.is_active && a.assignment_type === 'permanent');
    transferCurrentTeacherLabel.textContent = `Current Teacher: ${currentPerm?.teacher?.full_name || 'Unassigned'}`;

    if (transferTeacherSearch) {
      transferTeacherSearch.value = '';
    }

    populateTransferTeacherSelect();

    // Reset Screens
    transferScreenForm.style.display = 'block';
    transferScreenConfirm.style.display = 'none';
    transferTeacherModal.style.display = 'flex';
  }

  function populateTransferTeacherSelect() {
    if (!transferTeacherSelect) return;
    transferTeacherSelect.innerHTML = '';
    const query = transferTeacherSearch?.value?.toLowerCase() || '';

    // Filter to only Class Teacher eligible members
    const eligible = schoolTeachers.filter(t => 
      t.is_class_teacher && 
      (t.full_name.toLowerCase().includes(query) || t.email.toLowerCase().includes(query))
    );
    
    if (eligible.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No matching Class Teacher eligible faculty found';
      transferTeacherSelect.appendChild(opt);
    } else {
      eligible.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.full_name} (${t.email})`;
        transferTeacherSelect.appendChild(opt);
      });
    }
  }

  if (transferTeacherSearch) {
    transferTeacherSearch.addEventListener('input', populateTransferTeacherSelect);
  }

  if (btnNextTransfer) {
    btnNextTransfer.addEventListener('click', () => {
      if (!transferTeacherSelect?.value) {
        showToast('Please select a new class teacher first.', 'error');
        return;
      }
      
      const cls = classrooms.find(c => c.id === activeTransferClassId);
      const selectedTeacherName = transferTeacherSelect.options[transferTeacherSelect.selectedIndex].text;
      
      if (transferConfirmMsg && cls) {
        transferConfirmMsg.innerHTML = `You are assigning Class ${cls.grade}-${cls.section} to ${selectedTeacherName.split(' (')[0]}.
        The previous Class Teacher will immediately lose classroom management permissions.
        All classroom records, attendance history, assignments, student data, parent connections, and analytics will remain unchanged and will automatically be available to the new Class Teacher.`;
      }

      transferScreenForm.style.display = 'none';
      transferScreenConfirm.style.display = 'block';
    });
  }

  if (btnBackTransfer) {
    btnBackTransfer.addEventListener('click', () => {
      transferScreenForm.style.display = 'block';
      transferScreenConfirm.style.display = 'none';
    });
  }

  if (btnConfirmTransferSubmit) {
    btnConfirmTransferSubmit.addEventListener('click', async () => {
      if (!activeTransferClassId || !transferTeacherSelect?.value) return;
      const selectedTeacherId = transferTeacherSelect.value;
      const teacherName = transferTeacherSelect.options[transferTeacherSelect.selectedIndex].text.split(' (')[0];
      const now = new Date().toISOString();

      try {
        if (supabase) {
          try {
            // 1. Deactivate old permanent assignments
            await supabase
              .from('classroom_teacher_assignments')
              .update({ is_active: false, end_date: now })
              .eq('classroom_id', activeTransferClassId)
              .eq('assignment_type', 'permanent')
              .eq('is_active', true);

            // 2. Insert new permanent assignment
            const { error: insErr } = await supabase
              .from('classroom_teacher_assignments')
              .insert({
                classroom_id: activeTransferClassId,
                teacher_id: selectedTeacherId,
                assignment_type: 'permanent',
                start_date: now,
                is_active: true
              });
            if (insErr) throw insErr;
          } catch (dbErr) {
            console.warn('Database transfer failed, shifting locally:', dbErr);
          }
        }

        // Local State sync
        classroomAssignments = classroomAssignments.map(a => {
          if (a.classroom_id === activeTransferClassId && a.assignment_type === 'permanent' && a.is_active) {
            return { ...a, is_active: false, end_date: now };
          }
          return a;
        });

        const newAss = {
          id: 'assign-' + Date.now(),
          classroom_id: activeTransferClassId,
          teacher_id: selectedTeacherId,
          assignment_type: 'permanent',
          start_date: now,
          is_active: true,
          teacher: {
            full_name: teacherName,
            email: schoolTeachers.find(t => t.id === selectedTeacherId)?.email || ''
          }
        };
        classroomAssignments.push(newAss);

        saveState('campuslink_classroom_assignments', classroomAssignments);
        showToast('Classroom teacher transferred successfully. Permissions synchronized.');
        transferTeacherModal.style.display = 'none';
        renderClassroomsTable();
      } catch (err) {
        console.error('Failed to complete transfer:', err);
        showToast('Transfer failed: ' + err.message, 'error');
      }
    });
  }

  // 7. Temporary Class Teacher Modal Handling
  const tempTeacherModal = document.getElementById('temp-teacher-modal');
  const tempTeacherForm = document.getElementById('temp-teacher-form');
  const tempClassroomId = document.getElementById('temp-classroom-id');
  const tempTeacherSelect = document.getElementById('temp-teacher-select');
  const tempStartDate = document.getElementById('temp-start-date');
  const tempEndDate = document.getElementById('temp-end-date');
  const tempReasonInput = document.getElementById('temp-reason-input');

  function openTempTeacherModal(classId) {
    if (!tempTeacherModal) return;
    tempClassroomId.value = classId;

    if (tempTeacherSelect) {
      tempTeacherSelect.innerHTML = '';
      schoolTeachers.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.full_name} (${t.email})`;
        tempTeacherSelect.appendChild(opt);
      });
    }

    if (tempReasonInput) {
      tempReasonInput.value = '';
    }

    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    tempStartDate.value = today;
    tempEndDate.value = today;

    tempTeacherModal.style.display = 'flex';
  }

  if (tempTeacherForm) {
    tempTeacherForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const classId = tempClassroomId.value;
      const teacherId = tempTeacherSelect.value;
      const start = new Date(tempStartDate.value).toISOString();
      const end = new Date(tempEndDate.value).toISOString();
      const reason = tempReasonInput?.value?.trim() || '';
      const teacherName = tempTeacherSelect.options[tempTeacherSelect.selectedIndex].text.split(' (')[0];

      if (new Date(start) > new Date(end)) {
        showToast('End Date must be after Start Date.', 'error');
        return;
      }

      if (!reason) {
        showToast('Please state a reason for temporary replacement.', 'error');
        return;
      }

      const payload = {
        classroom_id: classId,
        teacher_id: teacherId,
        assignment_type: 'temporary',
        start_date: start,
        end_date: end,
        reason,
        is_active: true
      };

      try {
        if (supabase) {
          try {
            const { error } = await supabase.from('classroom_teacher_assignments').insert(payload);
            if (error) throw error;
          } catch (dbErr) {
            console.warn('Database save failed, saving locally:', dbErr);
          }
        }

        payload.id = 'assign-temp-' + Date.now();
        payload.teacher = {
          full_name: teacherName,
          email: schoolTeachers.find(t => t.id === teacherId)?.email || ''
        };
        classroomAssignments.push(payload);

        saveState('campuslink_classroom_assignments', classroomAssignments);
        showToast('Temporary teacher replacement set successfully!');
        tempTeacherModal.style.display = 'none';
        renderClassroomsTable();
      } catch (err) {
        console.error('Failed to set temporary teacher:', err);
        showToast('Failed to save temporary teacher: ' + err.message, 'error');
      }
    });
  }

  // 8. Manage Subject Teachers Modal Handling
  const subjectTeachersModal = document.getElementById('subject-teachers-modal');
  const subjectClassroomId = document.getElementById('subject-classroom-id');
  const subjectClassSubtitle = document.getElementById('subject-class-subtitle');
  const addSubjectTeacherForm = document.getElementById('add-subject-teacher-form');
  const subjectNameInput = document.getElementById('subject-name-input');
  const subjectTeacherSelect = document.getElementById('subject-teacher-select');
  const subjectTeachersTbody = document.getElementById('subject-teachers-tbody');

  function openSubjectTeachersModal(classId) {
    if (!subjectTeachersModal) return;
    subjectClassroomId.value = classId;

    const cls = classrooms.find(c => c.id === classId);
    if (!cls) return;

    subjectClassSubtitle.textContent = `Class: ${cls.grade}-${cls.section}`;

    // Populate dropdown
    if (subjectTeacherSelect) {
      subjectTeacherSelect.innerHTML = '';
      schoolTeachers.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.full_name;
        subjectTeacherSelect.appendChild(opt);
      });
    }

    renderSubjectTeachersList(classId);
    subjectTeachersModal.style.display = 'flex';
  }

  function renderSubjectTeachersList(classId) {
    if (!subjectTeachersTbody) return;
    subjectTeachersTbody.innerHTML = '';

    const list = classroomSubjectTeachers.filter(st => st.classroom_id === classId);
    if (list.length === 0) {
      subjectTeachersTbody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align: center; padding: 20px; color: var(--text-muted);">
            No subject teachers assigned yet.
          </td>
        </tr>
      `;
      return;
    }

    list.forEach(st => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 700; color: var(--dark-bg);">${st.subject}</td>
        <td>${st.teacher?.full_name || 'Teacher'}</td>
        <td style="text-align: right;">
          <button class="btn btn-remove-subject" data-id="${st.id}" style="padding: 4px 8px; font-size: 0.72rem; background: #FEE2E2; color: #EF4444; border: 1px solid #FECACA; border-radius: 4px; cursor: pointer;">Remove</button>
        </td>
      `;
      tr.querySelector('.btn-remove-subject').addEventListener('click', () => removeSubjectTeacher(st.id, classId));
      subjectTeachersTbody.appendChild(tr);
    });
  }

  if (addSubjectTeacherForm) {
    addSubjectTeacherForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const classId = subjectClassroomId.value;
      const subject = subjectNameInput.value;
      const teacherId = subjectTeacherSelect.value;
      const teacherName = subjectTeacherSelect.options[subjectTeacherSelect.selectedIndex].text;

      // Duplicate check: One subject teacher assignment per subject per classroom container
      const isSubDuplicate = classroomSubjectTeachers.some(st => 
        st.classroom_id === classId && 
        st.subject === subject
      );

      if (isSubDuplicate) {
        showToast(`Subject ${subject} already has an assigned teacher! Remove them first to change.`, 'error');
        return;
      }

      const payload = {
        classroom_id: classId,
        teacher_id: teacherId,
        subject
      };

      try {
        if (supabase) {
          try {
            const { data, error } = await supabase.from('classroom_subject_teachers').insert(payload).select().single();
            if (error) throw error;
            if (data) payload.id = data.id;
          } catch (dbErr) {
            console.warn('Database save failed, saving locally:', dbErr);
          }
        }

        if (!payload.id) payload.id = 'st-' + Date.now();
        payload.teacher = { full_name: teacherName };
        classroomSubjectTeachers.push(payload);

        saveState('campuslink_classroom_subject_teachers', classroomSubjectTeachers);
        showToast('Subject teacher assigned successfully!');
        subjectNameInput.value = '';
        renderSubjectTeachersList(classId);
        renderClassroomsTable();
      } catch (err) {
        console.error('Failed to add subject teacher:', err);
        showToast('Failed to add subject teacher: ' + err.message, 'error');
      }
    });
  }

  async function removeSubjectTeacher(id, classId) {
    if (!confirm('Are you sure you want to remove this subject teacher assignment?')) return;
    try {
      if (supabase) {
        try {
          const { error } = await supabase.from('classroom_subject_teachers').delete().eq('id', id);
          if (error) throw error;
        } catch (dbErr) {
          console.warn('Database delete failed, removing locally:', dbErr);
        }
      }
      classroomSubjectTeachers = classroomSubjectTeachers.filter(st => st.id !== id);
      saveState('campuslink_classroom_subject_teachers', classroomSubjectTeachers);
      showToast('Subject teacher removed.');
      renderSubjectTeachersList(classId);
      renderClassroomsTable();
    } catch (err) {
      console.error('Failed to delete subject teacher assignment:', err);
      showToast('Deletion failed: ' + err.message, 'error');
    }
  }

  // 9. Classroom Details, Statistics, Timeline & Audit Logs Modal
  const classroomDetailsModal = document.getElementById('classroom-details-modal');
  const detailsClassroomTitle = document.getElementById('details-classroom-title');
  const detailsClassroomSubtitle = document.getElementById('details-classroom-subtitle');
  const detailsActiveTeacher = document.getElementById('details-active-teacher');
  const detailsTempTeacher = document.getElementById('details-temp-teacher');
  const detailsRoomNumber = document.getElementById('details-room-number');
  const detailsCapacity = document.getElementById('details-capacity');
  const detailsStatus = document.getElementById('details-status');
  const detailsTotalStudents = document.getElementById('details-total-students');
  const detailsBoysStudents = document.getElementById('details-boys-students');
  const detailsGirlsStudents = document.getElementById('details-girls-students');
  const detailsSubjectTeachersContainer = document.getElementById('details-subject-teachers-container');
  const detailsTimelineContainer = document.getElementById('details-timeline-container');
  const detailsAuditTbody = document.getElementById('details-audit-tbody');

  async function openClassroomDetailsModal(classId) {
    if (!classroomDetailsModal) return;

    const cls = classrooms.find(c => c.id === classId);
    if (!cls) return;

    detailsClassroomTitle.textContent = `Classroom Details: ${cls.grade}-${cls.section}`;
    
    const yearName = academicYears.find(y => y.id === cls.academic_year_id)?.name || 'Unknown';
    detailsClassroomSubtitle.textContent = `Room ${cls.room || 'N/A'} • Academic Session ${yearName}`;

    const perm = classroomAssignments.find(a => a.classroom_id === classId && a.is_active && a.assignment_type === 'permanent');
    const temp = classroomAssignments.find(a => a.classroom_id === classId && a.is_active && a.assignment_type === 'temporary' && isWithinDateRange(a.start_date, a.end_date));

    if (detailsActiveTeacher) detailsActiveTeacher.textContent = perm?.teacher?.full_name || 'Unassigned';
    if (detailsTempTeacher) detailsTempTeacher.textContent = temp ? `${temp.teacher?.full_name} (${temp.reason || 'Temp'})` : 'None Assigned';
    if (detailsRoomNumber) detailsRoomNumber.textContent = cls.room || 'N/A';
    if (detailsCapacity) detailsCapacity.textContent = cls.capacity || '40';
    if (detailsStatus) {
      detailsStatus.innerHTML = cls.is_archived
        ? `<span style="color:#64748B; font-weight:700;">Archived</span>`
        : cls.status === 'inactive'
          ? `<span style="color:#EF4444; font-weight:700;">Inactive</span>`
          : `<span style="color:#10B981; font-weight:700;">Active</span>`;
    }

    // A. Query Student statistics from Database or generate realistic mocks if offline
    let countTotal = 0;
    let countBoys = 0;
    let countGirls = 0;

    if (supabase) {
      try {
        const { data: stds, error } = await supabase
          .from('classroom_students')
          .select('student_id, student:profiles!student_id(gender)')
          .eq('classroom_id', classId);
        
        if (!error && stds) {
          countTotal = stds.length;
          countBoys = stds.filter(s => s.student?.gender?.toLowerCase() === 'male' || s.student?.gender?.toLowerCase() === 'boy').length;
          countGirls = stds.filter(s => s.student?.gender?.toLowerCase() === 'female' || s.student?.gender?.toLowerCase() === 'girl').length;

          // Realistic defaults fallback if gender is null
          if (countTotal > 0 && countBoys === 0 && countGirls === 0) {
            countBoys = Math.floor(countTotal * 0.52);
            countGirls = countTotal - countBoys;
          }
        }
      } catch (err) {
        console.warn(err);
      }
    }

    // If offline or no students, show clean zeros
    if (detailsTotalStudents) detailsTotalStudents.textContent = countTotal;
    if (detailsBoysStudents) detailsBoysStudents.textContent = countBoys;
    if (detailsGirlsStudents) detailsGirlsStudents.textContent = countGirls;

    // B. Subject teachers badges list
    if (detailsSubjectTeachersContainer) {
      detailsSubjectTeachersContainer.innerHTML = '';
      const subjects = classroomSubjectTeachers.filter(st => st.classroom_id === classId);
      if (subjects.length === 0) {
        detailsSubjectTeachersContainer.innerHTML = `<span style="color:var(--text-muted); font-size:0.8rem;">No subject teachers assigned yet.</span>`;
      } else {
        subjects.forEach(st => {
          const badge = document.createElement('span');
          badge.style.cssText = `font-size:0.75rem; background:#EFF6FF; border:1px solid #BFDBFE; color:#1E40AF; padding:4px 8px; border-radius:6px; font-weight:700;`;
          badge.textContent = `${st.subject}: ${st.teacher?.full_name}`;
          detailsSubjectTeachersContainer.appendChild(badge);
        });
      }
    }

    // C. Activity Timeline & Log list
    if (detailsTimelineContainer) {
      detailsTimelineContainer.innerHTML = '';
      
      const activities = [];
      if (cls.created_at) {
        activities.push({
          date: new Date(cls.created_at),
          title: 'Classroom Registered',
          desc: `Structural container for Grade ${cls.grade}-${cls.section} was created.`,
          icon: '🏫'
        });
      }

      // Add assignment activities
      classroomAssignments
        .filter(a => a.classroom_id === classId)
        .forEach(a => {
          activities.push({
            date: new Date(a.start_date),
            title: a.assignment_type === 'temporary' ? 'Temporary Replacement Assigned' : 'Class Teacher Assigned',
            desc: `${a.teacher?.full_name} granted classroom privileges${a.reason ? ` due to: "${a.reason}"` : ''}.`,
            icon: a.assignment_type === 'temporary' ? '⏱️' : '👤'
          });
          if (a.end_date) {
            activities.push({
              date: new Date(a.end_date),
              title: a.assignment_type === 'temporary' ? 'Temporary Cover Completed' : 'Class Teacher Transferred',
              desc: `${a.teacher?.full_name} classroom privileges revoked.`,
              icon: '🚪'
            });
          }
        });

      // Sort timeline newest first
      activities.sort((a, b) => b.date - a.date);

      if (activities.length === 0) {
        detailsTimelineContainer.innerHTML = `<span style="color:var(--text-muted); font-size:0.8rem;">No activity log recorded yet.</span>`;
      } else {
        activities.forEach(act => {
          const div = document.createElement('div');
          div.style.cssText = `display:flex; gap:10px; margin-bottom:8px; border-left:2px solid #E2E8F0; padding-left:12px; position:relative;`;
          
          const timeStr = act.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          div.innerHTML = `
            <div style="position:absolute; left:-7px; top:2px; width:12px; height:12px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; font-size:0.5rem; color:white;"></div>
            <div>
              <div style="font-weight:700; color:var(--text-main); font-size:0.82rem;">${act.icon} ${act.title}</div>
              <div style="color:var(--text-muted); font-size:0.72rem; margin-top:2px;">${act.desc} • <span style="font-weight:600;">${timeStr}</span></div>
            </div>
          `;
          detailsTimelineContainer.appendChild(div);
        });
      }
    }

    // D. Audit history list table
    if (detailsAuditTbody) {
      detailsAuditTbody.innerHTML = '';
      
      const history = classroomAssignments
        .filter(a => a.classroom_id === classId)
        .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

      if (history.length === 0) {
        detailsAuditTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted);">
              No transfer audit logs found for this classroom.
            </td>
          </tr>
        `;
      } else {
        history.forEach(h => {
          const startStr = new Date(h.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          const endStr = h.end_date 
            ? new Date(h.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : 'Present';
          
          let statusText = '';
          if (h.is_active) {
            if (h.assignment_type === 'temporary' && !isWithinDateRange(h.start_date, h.end_date)) {
              statusText = '<span style="color:var(--text-muted); font-weight:700;">Scheduled/Expired</span>';
            } else {
              statusText = '<span style="color:#059669; font-weight:700;">Active</span>';
            }
          } else {
            statusText = '<span style="color:var(--text-muted);">Transferred</span>';
          }

          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td style="font-weight: 700; color:var(--text-main);">${h.teacher?.full_name || 'Teacher'}</td>
            <td style="text-transform: capitalize;">${h.assignment_type}</td>
            <td>${startStr}</td>
            <td>${endStr}</td>
            <td style="text-align: center;">${statusText}</td>
          `;
          detailsAuditTbody.appendChild(tr);
        });
      }
    }

    const firstTab = document.querySelector('.details-tab-btn[data-details-tab="students"]');
    if (firstTab) firstTab.click();

    classroomDetailsModal.style.display = 'flex';
  }

  // Details Modal Tab Switching Logic
  document.querySelectorAll('.details-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-details-tab');
      document.querySelectorAll('.details-tab-btn').forEach(b => {
        b.classList.remove('active-tab');
        b.style.color = 'var(--text-muted)';
        b.style.borderBottomColor = 'transparent';
      });
      btn.classList.add('active-tab');
      btn.style.color = 'var(--primary)';
      btn.style.borderBottomColor = 'var(--primary)';
      
      document.querySelectorAll('.details-panel-content').forEach(p => {
        p.style.display = 'none';
      });
      const panel = document.getElementById(`details-panel-${tabName}`);
      if (panel) panel.style.display = 'block';
    });
  });

  // 10. Academic Years Management Modal Handling
  const btnManageAcademicYears = document.getElementById('btn-manage-academic-years');
  const academicYearsModal = document.getElementById('academic-years-modal');
  const addAcademicYearForm = document.getElementById('add-academic-year-form');
  const newAcademicYearName = document.getElementById('new-academic-year-name');
  const academicYearsTbody = document.getElementById('academic-years-tbody');

  if (btnManageAcademicYears) {
    btnManageAcademicYears.addEventListener('click', () => {
      if (!academicYearsModal) return;
      renderAcademicYearCards();
      academicYearsModal.style.display = 'flex';
    });
  }

  // New card-based academic year renderer
  function renderAcademicYearCards() {
    const container = document.getElementById('academic-years-cards-container');
    if (!container) return;

    if (academicYears.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:48px 24px; color:var(--text-muted);">
          <div style="font-size:3.5rem; margin-bottom:14px; opacity:0.5;">📅</div>
          <div style="font-weight:800; font-size:1rem; color:var(--dark-bg); margin-bottom:8px;">No Academic Sessions</div>
          <div style="font-size:0.82rem;">Use the form above to create your first academic session.</div>
        </div>`;
      return;
    }

    container.innerHTML = '';
    academicYears.forEach(year => {
      const classCount = classrooms.filter(c => c.academic_year_id === year.id && !c.is_archived).length;
      const isActive = year.is_active;

      // Status
      let statusBadge, statusColor;
      if (isActive) {
        statusBadge = '★ Active';
        statusColor = { bg: '#D1FAE5', color: '#059669', border: '#A7F3D0' };
      } else {
        statusBadge = 'Upcoming';
        statusColor = { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' };
      }

      const card = document.createElement('div');
      card.style.cssText = `
        border-radius: 14px;
        border: 2px solid ${isActive ? '#10B981' : 'var(--border-color)'};
        background: ${isActive ? 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)' : 'var(--white)'};
        overflow: hidden;
        box-shadow: ${isActive ? '0 4px 24px rgba(16,185,129,0.12)' : '0 1px 4px rgba(0,0,0,0.06)'};
        transition: box-shadow 0.2s, transform 0.2s;
        position: relative;
      `;
      card.onmouseenter = () => { card.style.transform = 'translateY(-2px)'; card.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)'; };
      card.onmouseleave = () => { card.style.transform = ''; card.style.boxShadow = isActive ? '0 4px 24px rgba(16,185,129,0.12)' : '0 1px 4px rgba(0,0,0,0.06)'; };

      card.innerHTML = `
        ${isActive ? '<div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#10B981,#34D399);"></div>' : ''}
        <div style="padding: 20px 20px 16px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px;">
            <div>
              <div style="font-size:1.6rem; font-weight:900; color:var(--dark-bg); line-height:1;">${year.name}</div>
              <div style="font-size:0.72rem; color:var(--text-muted); margin-top:4px; font-weight:600;">Academic Session</div>
            </div>
            <span style="padding:4px 10px; border-radius:20px; font-size:0.72rem; font-weight:700; background:${statusColor.bg}; color:${statusColor.color}; border:1px solid ${statusColor.border}; white-space:nowrap;">${statusBadge}</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px;">
            <div style="background:${isActive ? 'rgba(16,185,129,0.08)' : '#F8FAFC'}; border-radius:8px; padding:10px; text-align:center;">
              <div style="font-size:1.4rem; font-weight:900; color:${isActive ? '#059669' : 'var(--dark-bg)'}; line-height:1;">${classCount}</div>
              <div style="font-size:0.68rem; color:var(--text-muted); margin-top:2px; font-weight:600;">Classes</div>
            </div>
            <div style="background:${isActive ? 'rgba(16,185,129,0.08)' : '#F8FAFC'}; border-radius:8px; padding:10px; text-align:center;">
              <div style="font-size:1.4rem; font-weight:900; color:${isActive ? '#059669' : 'var(--dark-bg)'}; line-height:1;">
                ${academicYears.indexOf(year) === 0 ? '🏆' : (isActive ? '✅' : '⏳')}
              </div>
              <div style="font-size:0.68rem; color:var(--text-muted); margin-top:2px; font-weight:600;">Status</div>
            </div>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:6px;">
            ${!isActive ? `<button class="btn-ay-activate" data-id="${year.id}" style="flex:1; padding:7px 10px; font-size:0.75rem; font-weight:700; border-radius:7px; border:none; background:#059669; color:white; cursor:pointer;">⚡ Set Active</button>` : '<span style="flex:1;padding:7px 10px;font-size:0.75rem;font-weight:700;color:#059669;text-align:center;">★ Currently Active</span>'}
            <button class="btn-ay-duplicate" data-id="${year.id}" style="padding:7px 10px; font-size:0.75rem; font-weight:700; border-radius:7px; border:1px solid #BFDBFE; background:#EFF6FF; color:#1D4ED8; cursor:pointer;">📋 Copy</button>
            ${!isActive ? `<button class="btn-ay-delete" data-id="${year.id}" data-name="${year.name}" style="padding:7px 10px; font-size:0.75rem; font-weight:700; border-radius:7px; border:1px solid #FECACA; background:#FEF2F2; color:#DC2626; cursor:pointer;">🗑</button>` : ''}
          </div>
        </div>`;

      // Wire events
      card.querySelector('.btn-ay-activate')?.addEventListener('click', () => activateAcademicYear(year.id));
      card.querySelector('.btn-ay-duplicate')?.addEventListener('click', () => duplicateAcademicYear(year.id));
      card.querySelector('.btn-ay-delete')?.addEventListener('click', (e) => {
        const btn = e.currentTarget;
        deleteAcademicYear(btn.dataset.id, btn.dataset.name);
      });

      container.appendChild(card);
    });
  }

  // Legacy fallback (kept for compatibility — delegates to new function)
  function renderAcademicYearsList() {
    renderAcademicYearCards();
  }

  function renderAcademicYearsDropdowns() {
    const filterAcademicYear = document.getElementById('filter-academic-year');
    const classroomAcademicYearSelect = document.getElementById('classroom-academic-year-select');

    if (filterAcademicYear) {
      const prevVal = filterAcademicYear.value;
      filterAcademicYear.innerHTML = '<option value="">All Sessions</option>';
      academicYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year.id;
        option.textContent = year.name + (year.is_active ? ' (Active)' : '');
        filterAcademicYear.appendChild(option);
      });
      const activeYear = academicYears.find(y => y.is_active);
      if (prevVal && academicYears.some(y => y.id === prevVal)) {
        filterAcademicYear.value = prevVal;
      } else if (activeYear) {
        filterAcademicYear.value = activeYear.id;
      }
    }

    if (classroomAcademicYearSelect) {
      classroomAcademicYearSelect.innerHTML = '<option value="">Select Academic Session...</option>';
      academicYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year.id;
        option.textContent = year.name + (year.is_active ? ' (Active)' : '');
        classroomAcademicYearSelect.appendChild(option);
      });
      const activeYear = academicYears.find(y => y.is_active);
      if (activeYear) {
        classroomAcademicYearSelect.value = activeYear.id;
      }
    }
  }

  async function deleteAcademicYear(yearId, yearName) {
    const classroomsInYear = classrooms.filter(c => c.academic_year_id === yearId && !c.is_archived);
    if (classroomsInYear.length > 0) {
      showToast(`Cannot delete "${yearName}" — it has ${classroomsInYear.length} active classroom(s). Archive them first.`, 'error');
      return;
    }
    if (!confirm(`Delete academic session "${yearName}"? This cannot be undone.`)) return;
    try {
      if (supabase) {
        const { error } = await supabase.from('academic_years').delete().eq('id', yearId);
        if (error) throw error;
      }
      showToast(`Session "${yearName}" deleted. ✅`);
      await refreshClassroomData();
      renderAcademicYearCards();
      renderAcademicYearsDropdowns();
    } catch (err) {
      console.error('[AcadYear] Delete error:', err);
      showToast('Delete failed: ' + err.message, 'error');
    }
  }

  async function activateAcademicYear(yearId) {
    try {
      if (supabase) {
        // Deactivate all years for this school, then activate target
        await supabase.from('academic_years').update({ is_active: false }).eq('school_id', profile.id);
        const { error } = await supabase.from('academic_years').update({ is_active: true }).eq('id', yearId);
        if (error) throw error;
      }
      academicYears = academicYears.map(y => ({ ...y, is_active: y.id === yearId }));
      saveState('campuslink_academic_years', academicYears);
      showToast('Active academic session updated! ✅');
      renderAcademicYearCards();
      renderAcademicYearsDropdowns();
      renderClassroomsTable();
    } catch (err) {
      console.error('[AcadYear] Activate error:', err);
      showToast('Activation failed: ' + err.message, 'error');
    }
  }

  // SPEC: Duplicate Previous Academic Year Structure
  // Copies classrooms and subject teacher assignments from source to new structure without student enrollments, assignments, homeworks, or marks
  async function duplicateAcademicYear(sourceYearId) {
    const srcYear = academicYears.find(y => y.id === sourceYearId);
    if (!srcYear) return;

    const targetYearName = prompt(`You are copying the structures (classrooms & subject teachers mappings) from session "${srcYear.name}".\n\nEnter the name for the new Academic Session (e.g. 2026-27):`);
    if (!targetYearName || !targetYearName.trim()) return;

    const formattedTarget = targetYearName.trim();

    // Check if new session already exists
    let targetYear = academicYears.find(y => y.name === formattedTarget);
    let targetYearId = targetYear?.id;

    try {
      if (!targetYear) {
        // Create new academic session first
        const payloadYear = {
          school_id: profile.id,
          name: formattedTarget,
          is_active: false
        };

        if (supabase) {
          try {
            const { data, error } = await supabase.from('academic_years').insert(payloadYear).select().single();
            if (error) throw error;
            if (data) {
              payloadYear.id = data.id;
              targetYearId = data.id;
            }
          } catch (dbErr) {
            console.warn('Database save year failed, using local code:', dbErr);
          }
        }

        if (!targetYearId) {
          targetYearId = 'year-' + Date.now();
          payloadYear.id = targetYearId;
        }

        academicYears.push(payloadYear);
        saveState('campuslink_academic_years', academicYears);
      }

      // Load classrooms to duplicate
      const classroomsToCopy = classrooms.filter(c => c.academic_year_id === sourceYearId && !c.is_archived);
      
      if (classroomsToCopy.length === 0) {
        showToast(`Source session "${srcYear.name}" has no classrooms to copy.`, 'warning');
        renderAcademicYearCards();
        renderAcademicYearsDropdowns();
        return;
      }

      showToast(`Copying ${classroomsToCopy.length} classrooms structure...`);

      for (const cls of classroomsToCopy) {
        const payloadCls = {
          school_id: profile.id,
          academic_year_id: targetYearId,
          grade: cls.grade,
          section: cls.section,
          room: cls.room,
          capacity: cls.capacity || 40,
          status: cls.status || 'active',
          is_archived: false
        };

        let newClassId = 'class-' + Math.random().toString(36).substring(2, 9);
        if (supabase) {
          try {
            const { data, error } = await supabase.from('classrooms').insert(payloadCls).select().single();
            if (!error && data) {
              newClassId = data.id;
            }
          } catch(e) { console.warn(e); }
        }

        payloadCls.id = newClassId;
        classrooms.push(payloadCls);

        // Copy subject teachers assignments for this classroom
        const subTeachersToCopy = classroomSubjectTeachers.filter(st => st.classroom_id === cls.id);
        for (const st of subTeachersToCopy) {
          const payloadSt = {
            classroom_id: newClassId,
            teacher_id: st.teacher_id,
            subject: st.subject
          };

          let newStId = 'st-' + Math.random().toString(36).substring(2, 9);
          if (supabase) {
            try {
              const { data, error } = await supabase.from('classroom_subject_teachers').insert(payloadSt).select().single();
              if (!error && data) {
                newStId = data.id;
              }
            } catch(e) { console.warn(e); }
          }
          payloadSt.id = newStId;
          payloadSt.teacher = { full_name: schoolTeachers.find(t => t.id === st.teacher_id)?.full_name || 'Teacher' };
          classroomSubjectTeachers.push(payloadSt);
        }
      }

      saveState('campuslink_classrooms', classrooms);
      saveState('campuslink_classroom_subject_teachers', classroomSubjectTeachers);

      showToast(`Successfully duplicated structure to session "${formattedTarget}"! ✅`);
      await refreshClassroomData();
      renderAcademicYearCards();
      renderAcademicYearsDropdowns();
    } catch (err) {
      console.error('Duplication error:', err);
      showToast('Duplication failed: ' + err.message, 'error');
    }
  }

  if (addAcademicYearForm) {
    addAcademicYearForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = newAcademicYearName?.value?.trim();
      if (!name) { showToast('Please enter a session name.', 'error'); return; }

      // Prevent duplicates
      if (academicYears.find(y => y.name === name)) {
        showToast(`Session "${name}" already exists.`, 'error');
        return;
      }

      const payload = { school_id: profile.id, name, is_active: false };

      try {
        if (supabase) {
          const { data, error } = await supabase.from('academic_years').insert(payload).select().single();
          if (error) throw error;
          if (data) payload.id = data.id;
        }
        if (!payload.id) payload.id = 'year-' + Date.now();
        academicYears.push(payload);
        saveState('campuslink_academic_years', academicYears);
        showToast(`Session "${name}" added successfully! ✅`);
        if (newAcademicYearName) newAcademicYearName.value = '';
        renderAcademicYearCards();
        renderAcademicYearsDropdowns();
      } catch (err) {
        console.error('[AcadYear] Add error:', err);
        showToast('Add failed: ' + err.message, 'error');
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

  // Search, Sorting & Filter live listeners
  const classroomSearchInput = document.getElementById('classroom-search-input');
  const filterAcademicYear = document.getElementById('filter-academic-year');
  if (classroomSearchInput) {
    classroomSearchInput.addEventListener('input', (e) => {
      classroomSearchText = e.target.value;
      classroomCurrentPage = 1;
      renderClassroomsTable();
    });
  }
  if (filterAcademicYear) {
    filterAcademicYear.addEventListener('change', () => {
      classroomCurrentPage = 1;
      renderClassroomsTable();
    });
  }

  // Column header sorting click handlers
  document.querySelectorAll('.dash-table th').forEach(th => {
    // Only apply to classrooms table columns
    if (th.closest('#classroom-management-tab')) {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        const text = th.textContent.toLowerCase();
        let column = 'grade';
        if (text.includes('class')) column = 'grade';
        else if (text.includes('section')) column = 'section';
        else if (text.includes('room')) column = 'room';
        else if (text.includes('year')) column = 'year';
        else if (text.includes('teacher') && !text.includes('subject')) column = 'teacher';
        else if (text.includes('status')) column = 'status';
        else return; // Don't sort actions or subject teachers column

        if (classroomSortColumn === column) {
          classroomSortOrder = classroomSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          classroomSortColumn = column;
          classroomSortOrder = 'asc';
        }

        // Visual indicator
        document.querySelectorAll('#classroom-management-tab th').forEach(h => {
          h.textContent = h.textContent.replace(' ▲', '').replace(' ▼', '');
        });
        th.textContent += classroomSortOrder === 'asc' ? ' ▲' : ' ▼';

        renderClassroomsTable();
      });
    }
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
