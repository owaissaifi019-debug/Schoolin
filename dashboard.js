document.addEventListener('DOMContentLoaded', async () => {

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
              about: school.about || ''
            };
            
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
  }

  // --- Seed Data Configuration ---
  const DEFAULT_PROFILE = {
    name: "St. Joseph's Academy",
    city: "Dehradun",
    state: "Uttarakhand",
    board: "ICSE",
    logoLetter: "S",
    about: "Founded in 1934, St. Joseph's Academy is a premier co-educational school in Dehradun run by the Patrician Brothers. Spanning a lush campus, the school has consistently nurtured academic toppers, national-level debaters, and track athletes under its motto 'Laborare est Orare' (Work is Worship)."
  };

  const DEFAULT_EVENTS = [
    {
      id: 101,
      title: "All-India Inter-School Debate Championship 2026",
      category: "debate",
      date: "June 28 - 29, 2026",
      deadline: "June 20, 2026",
      venue: "Brother O'Brien Memorial Auditorium",
      description: "The premier debating tournament of North India bringing together teams from 30+ schools to battle in Parliamentary and Turncoat debate formats. Standard registration rules apply.",
      school: "St. Joseph's Academy"
    },
    {
      id: 102,
      title: "Josephite Annual Athletics & Sports Meet",
      category: "sports",
      date: "July 15 - 18, 2026",
      deadline: "July 05, 2026",
      venue: "School Main Playgrounds",
      description: "Inter-school track events, basketball matches, and football leagues. Elite trophies for the best-performing athletic school team.",
      school: "St. Joseph's Academy"
    },
    {
      id: 103,
      title: "Aura Creative Writing & Art Exhibition",
      category: "cultural",
      date: "August 10, 2026",
      deadline: "August 01, 2026",
      venue: "Junior Wing Activity Hall",
      description: "Unleash creativity! Categories include poetry writing, micro-fiction, oil painting, clay modeling, and abstract sketching.",
      school: "St. Joseph's Academy"
    }
  ];

  const DEFAULT_ADMISSIONS = [
    {
      id: 201,
      classesOpen: "Nursery to Grade IX, Grade XI",
      startDate: "June 15, 2026",
      lastDate: "July 15, 2026",
      academicYear: "2026-27",
      brochure: "https://stjosephsacademy.in/admissions-2026.pdf",
      applyLink: "https://stjosephsacademy.in/apply",
      details: "Online applications are now active. Selected candidates will be invited for preliminary interaction rounds. Please submit age certificates and report card transcripts.",
      schoolName: "St. Joseph's Academy",
      board: "ICSE",
      city: "Dehradun"
    }
  ];

  const DEFAULT_REGISTRATIONS = [
    {
      id: 301,
      studentName: "Aarav Sharma",
      classGrade: "Grade X",
      eventTitle: "All-India Inter-School Debate Championship 2026",
      dateApplied: "June 03, 2026",
      status: "pending"
    },
    {
      id: 302,
      studentName: "Diya Iyer",
      classGrade: "Grade VIII",
      eventTitle: "Aura Creative Writing & Art Exhibition",
      dateApplied: "June 02, 2026",
      status: "approved"
    },
    {
      id: 303,
      studentName: "Kabir Sen",
      classGrade: "Grade XII",
      eventTitle: "Josephite Annual Athletics & Sports Meet",
      dateApplied: "May 30, 2026",
      status: "pending"
    },
    {
      id: 304,
      studentName: "Sneha Patel",
      classGrade: "Grade IX",
      eventTitle: "All-India Inter-School Debate Championship 2026",
      dateApplied: "May 28, 2026",
      status: "rejected"
    }
  ];

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
    if (avatarLetter) avatarLetter.textContent = profile.logoLetter || profile.name.charAt(0);
    if (usernameText) usernameText.textContent = profile.name;
    if (userboardText) userboardText.textContent = `${profile.board} Board • ${profile.city}`;
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
      if (tabTarget === 'admissions') tabName = 'Admissions Announcements';
      if (tabTarget === 'profile') tabName = 'School Profile Settings';
      if (topBarTitle) topBarTitle.textContent = tabName;
    });
  });

  // --- Update Metric Statistics ---
  function updateDashboardStats() {
    const totalEvents = events.filter(e => e.school === profile.name).length;
    const totalRegistrations = registrations.length;
    const totalAdmissions = admissions.filter(a => a.schoolName === profile.name).length;

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
  }

  // --- Render Registrations Table ---
  const regsTbody = document.getElementById('registrations-tbody');
  function renderRegistrations() {
    if (!regsTbody) return;
    regsTbody.innerHTML = '';

    if (registrations.length === 0) {
      regsTbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">
            No registrations received yet.
          </td>
        </tr>
      `;
      return;
    }

    // Sort: pending first
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

    // Attach Action Listeners
    regsTbody.querySelectorAll('.btn-approve').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const regId = parseInt(e.target.getAttribute('data-id'), 10);
        updateRegistrationStatus(regId, 'approved');
      });
    });

    regsTbody.querySelectorAll('.btn-reject').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const regId = parseInt(e.target.getAttribute('data-id'), 10);
        updateRegistrationStatus(regId, 'rejected');
      });
    });
  }

  function updateRegistrationStatus(id, newStatus) {
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
        const clsLower = classesOpen.toLowerCase();
        const classLevels = [];
        if (clsLower.includes('nursery') || clsLower.includes('kg') || clsLower.includes('kindergarten')) classLevels.push('nursery');
        if (clsLower.includes('primary') || clsLower.includes('grade i') || clsLower.includes('class i') || clsLower.includes('v') || clsLower.includes('1') || clsLower.includes('2') || clsLower.includes('3') || clsLower.includes('4') || clsLower.includes('5')) classLevels.push('primary');
        if (clsLower.includes('secondary') || clsLower.includes('ix') || clsLower.includes('x') || clsLower.includes('6') || clsLower.includes('7') || clsLower.includes('8') || clsLower.includes('9') || clsLower.includes('10')) classLevels.push('secondary');
        if (clsLower.includes('senior') || clsLower.includes('xi') || clsLower.includes('xii') || clsLower.includes('11') || clsLower.includes('12')) classLevels.push('senior-secondary');
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
    
    document.getElementById('profile-school-name').value = profile.name;
    document.getElementById('profile-city').value = profile.city;
    document.getElementById('profile-state').value = profile.state;
    document.getElementById('profile-board').value = profile.board;
    document.getElementById('profile-logo-char').value = profile.logoLetter;
    document.getElementById('profile-about').value = profile.about;
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
            about
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
        // Update school profile
        profile = {
          name,
          city,
          state,
          board,
          logoLetter,
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

  // --- Init Dashboard Rendering ---
  loadDashboardData();

});
