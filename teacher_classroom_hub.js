/**
 * CampusLink – Teacher Classroom Hub Module (Phase 4C)
 * Serves as the primary hub for teachers, displaying all of their assigned
 * classrooms (Class Teacher or Subject Teacher) and providing quick-action routing.
 */

(function () {
  'use strict';

  // --- Initial Data Fallbacks (matching classrooms.js and dashboard.js) ---
  const DEFAULT_TEACHERS = [
    { id: 'tch_001', fullName: 'Ali Ahmad', username: 'ali.ahmad', status: 'active', verificationStatus: 'verified', email: 'ali.ahmad@school.com', department: 'Mathematics' },
    { id: 'tch_002', fullName: 'Priya Sharma', username: 'priya.sharma', status: 'active', verificationStatus: 'verified', email: 'priya.sharma@school.com', department: 'English' },
    { id: 'tch_003', fullName: 'Amit Verma', username: 'amit.verma', status: 'active', verificationStatus: 'pending', email: 'amit.verma@school.com', department: 'Science' },
    { id: 'tch_004', fullName: 'Sneha Patel', username: 'sneha.patel', status: 'active', verificationStatus: 'pending', email: 'sneha.patel@school.com', department: 'Computer Science' }
  ];

  const DEFAULT_YEARS = [
    { id: 'ay-2026', name: '2026-2027', status: 'active', is_current: true }
  ];

  const DEFAULT_CLASSES = [
    { id: 'cls-9', name: 'Class 9', display_order: 9, status: 'active' },
    { id: 'cls-10', name: 'Class 10', display_order: 10, status: 'active' },
    { id: 'cls-11', name: 'Class 11', display_order: 11, status: 'active' }
  ];

  const DEFAULT_CLASSROOMS = [
    { id: 'cr-9a', schoolId: 'sch-01', academicYearId: 'ay-2026', classId: 'cls-9', sectionId: 'A', classTeacherId: 'tch_001', roomNumber: 'Room 203', building: 'Building A', floor: '2nd Floor', capacity: 45, status: 'active', studentCount: 42, subjectCount: 8 },
    { id: 'cr-9b', schoolId: 'sch-01', academicYearId: 'ay-2026', classId: 'cls-9', sectionId: 'B', classTeacherId: 'tch_002', roomNumber: 'Room 204', building: 'Building A', floor: '2nd Floor', capacity: 45, status: 'active', studentCount: 38, subjectCount: 7 },
    { id: 'cr-10a', schoolId: 'sch-01', academicYearId: 'ay-2026', classId: 'cls-10', sectionId: 'A', classTeacherId: 'tch_003', roomNumber: 'Room 301', building: 'Building B', floor: '3rd Floor', capacity: 40, status: 'active', studentCount: 39, subjectCount: 9 }
  ];

  const DEFAULT_CLASSROOM_SUBJECTS = [
    { id: 'crs-1', classroomId: 'cr-9a', subjectId: 'sub-math', teacherId: 'tch_003', weeklyPeriods: 6, status: 'active' },
    { id: 'crs-2', classroomId: 'cr-9a', subjectId: 'sub-science', teacherId: 'tch_001', weeklyPeriods: 5, status: 'active' },
    { id: 'crs-3', classroomId: 'cr-9a', subjectId: 'sub-english', teacherId: 'tch_002', weeklyPeriods: 4, status: 'active' },
    { id: 'crs-4', classroomId: 'cr-9b', subjectId: 'sub-math', teacherId: 'tch_003', weeklyPeriods: 6, status: 'active' },
    { id: 'crs-5', classroomId: 'cr-9b', subjectId: 'sub-english', teacherId: 'tch_002', weeklyPeriods: 4, status: 'active' },
    { id: 'crs-6', classroomId: 'cr-10a', subjectId: 'sub-math', teacherId: 'tch_003', weeklyPeriods: 6, status: 'active' },
    { id: 'crs-7', classroomId: 'cr-10a', subjectId: 'sub-cs', teacherId: 'tch_004', weeklyPeriods: 4, status: 'active' }
  ];

  // Helper: Retrieve data safely from localStorage
  function getS(key, fallback) {
    const data = localStorage.getItem(key);
    if (!data) return fallback;
    try {
      return JSON.parse(data);
    } catch (e) {
      return fallback;
    }
  }

  // State Variables
  let teachersList = [];
  let classroomsList = [];
  let classroomSubjects = [];
  let classesList = [];
  let academicYears = [];
  let selectedTeacherId = 'tch_001';

  // Timetable Mocks
  const TIMETABLE_WIDGETS = {
    'cr-9a': { todayPeriods: 'Math (8:30 AM) · Physics (10:30 AM)', nextClass: 'Physics', room: 'Room 203', subject: 'Physics', time: '10:30 AM', teacher: 'Priya Sharma' },
    'cr-9b': { todayPeriods: 'English (9:30 AM) · Chemistry (11:00 AM)', nextClass: 'Chemistry', room: 'Room 204', subject: 'Chemistry', time: '11:00 AM', teacher: 'Amit Verma' },
    'cr-10a': { todayPeriods: 'Computer Sci (9:30 AM) · Math (1:00 PM)', nextClass: 'Math', room: 'Room 301', subject: 'Math', time: '1:00 PM', teacher: 'Amit Verma' }
  };

  // Helper Name Resolvers
  function getClassName(classId) {
    const cls = classesList.find(c => c.id === classId);
    return cls ? cls.name : 'Class';
  }

  function getYearName(yearId) {
    const yr = academicYears.find(y => y.id === yearId);
    return yr ? yr.name : '2026-27';
  }

  // --- Initializer ---
  async function initTeacherHub() {
    // 1. Get Supabase client
    const supabase = window.CampusLink?.supabase;
    const auth = window.CampusLink?.auth;
    
    // Load local storage fallbacks first
    teachersList = getS('campuslink_teachers', DEFAULT_TEACHERS);
    classroomsList = getS('campuslink_classrooms', DEFAULT_CLASSROOMS);
    classroomSubjects = getS('campuslink_classroom_subjects', DEFAULT_CLASSROOM_SUBJECTS);
    classesList = getS('campuslink_classes', DEFAULT_CLASSES);
    academicYears = getS('campuslink_academic_years', DEFAULT_YEARS);

    if (supabase && auth) {
      try {
        const session = await auth.getSession();
        if (session && session.user) {
          let profile = null;
          try {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();
            profile = data;
          } catch (e) {
            console.warn('Error fetching profile from Supabase:', e);
          }

          if (!profile) {
            const stored = localStorage.getItem('campuslink_profile');
            if (stored) {
              try {
                profile = JSON.parse(stored);
              } catch (e) {}
            }
          }

          if (profile) {
            const userType = profile.user_type || profile.userType || 'student';
            const platformRole = profile.platform_role || profile.platformRole || 'user';
            
            const isTeacher = userType === 'teacher';
            const isAdmin = platformRole === 'school_admin' || platformRole === 'super_admin' || userType === 'school_representative';

            if (!isTeacher && !isAdmin) {
              alert('Access Denied: You do not have access to the Teacher Classroom Workspace.');
              window.location.replace('index.html');
              return;
            }
          }

          if (profile && (profile.user_type === 'teacher' || profile.userType === 'teacher')) {
            // Get teacher verification status from teachers table
            const { data: dbTeacher } = await supabase
              .from('teachers')
              .select('*')
              .eq('user_id', profile.id)
              .maybeSingle();

            const isVerified = dbTeacher ? dbTeacher.verification_status === 'verified' : true;

            // Fetch classrooms assigned to this teacher
            const { data: dbClassrooms } = await supabase
              .from('classrooms')
              .select('*')
              .eq('class_teacher_id', profile.id)
              .eq('is_archived', false);

            // Fetch classes to map class name
            const { data: dbClasses } = await supabase
              .from('classes')
              .select('*');

            // Fetch academic years to map year name
            const { data: dbYears } = await supabase
              .from('academic_years')
              .select('*');

            if (dbClasses) {
              classesList = dbClasses.map(c => ({ id: c.id, name: c.name }));
            }
            if (dbYears) {
              academicYears = dbYears.map(y => ({ id: y.id, name: y.name, status: y.status, is_current: y.is_current }));
            }

            if (dbClassrooms && dbClassrooms.length > 0) {
              classroomsList = dbClassrooms.map(cr => {
                const cls = classesList.find(c => c.id === cr.class_id);
                const className = cls ? cls.name : (cr.grade || 'Class');
                return {
                  id: cr.id,
                  schoolId: cr.school_id,
                  academicYearId: cr.academic_year_id,
                  classId: cr.class_id,
                  sectionId: cr.section || cr.section_id || 'A',
                  classTeacherId: cr.class_teacher_id,
                  roomNumber: cr.room || cr.room_number || 'Room 101',
                  building: cr.building || 'Main',
                  floor: cr.floor || '1st',
                  capacity: cr.capacity || 40,
                  status: cr.status || 'active',
                  studentCount: cr.studentCount || 0,
                  subjectCount: cr.subjectCount || 0
                };
              });

              selectedTeacherId = profile.id;

              const existingIdx = teachersList.findIndex(t => t.id === profile.id);
              const teacherObj = {
                id: profile.id,
                fullName: profile.full_name || 'Teacher',
                username: profile.username || 'teacher',
                status: 'active',
                verificationStatus: isVerified ? 'verified' : 'pending',
                email: session.user.email,
                department: 'General'
              };
              if (existingIdx >= 0) {
                teachersList[existingIdx] = teacherObj;
              } else {
                teachersList.push(teacherObj);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Error loading real classroom assignments from Supabase:', err);
      }
    }

    // Sync verificationStatus if missing in localStorage
    let updated = false;
    teachersList.forEach(t => {
      if (!t.verificationStatus) {
        const def = DEFAULT_TEACHERS.find(dt => dt.id === t.id || dt.username === t.username);
        t.verificationStatus = def ? def.verificationStatus : 'verified';
        updated = true;
      }
    });
    if (updated) {
      localStorage.setItem('campuslink_teachers', JSON.stringify(teachersList));
    }

    // Populate Teacher Simulator dropdown
    const simulator = document.getElementById('hub-teacher-simulator');
    if (simulator) {
      simulator.innerHTML = teachersList.map(t => {
        const selected = t.id === selectedTeacherId ? 'selected' : '';
        const statusText = t.verificationStatus === 'verified' ? 'Verified' : 'Pending Verification';
        return `<option value="${t.id}" ${selected}>${t.fullName} (${t.department || 'General'}) [${statusText}]</option>`;
      }).join('');

      simulator.onchange = () => {
        selectedTeacherId = simulator.value;
        renderHubContent();
        const profileSwitcher = document.getElementById('header-profile-role-switcher');
        if (profileSwitcher && profileSwitcher.value === 'teacher') {
          applyProfileRole('teacher');
        }
        showToastMessage(`Simulating hub as: ${teachersList.find(t => t.id === selectedTeacherId)?.fullName}`, 'info');
      };
    }

    // Profile Switcher setup
    const profileSwitcher = document.getElementById('header-profile-role-switcher');
    if (profileSwitcher) {
      profileSwitcher.onchange = () => {
        applyProfileRole(profileSwitcher.value);
      };

      if (window.location.pathname.includes('classroom.html')) {
        profileSwitcher.value = 'teacher';
        profileSwitcher.style.display = 'none';
        applyProfileRole('teacher');

        // Force activate Classroom Hub tab panel
        document.querySelectorAll('.dashboard-tab-panel').forEach(panel => {
          panel.classList.remove('active');
          panel.style.display = 'none';
        });
        const hubTab = document.getElementById('teacher-classroom-hub-tab');
        if (hubTab) {
          hubTab.classList.add('active');
          hubTab.style.display = 'block';
        }
        const titleEl = document.getElementById('top-bar-title');
        if (titleEl) titleEl.textContent = 'Teacher Classroom Hub';
      } else {
        const auth = window.CampusLink && window.CampusLink.auth;
        if (auth) {
          auth.getUserType().then(userType => {
            if (userType === 'teacher') {
              profileSwitcher.value = 'teacher';
            } else {
              profileSwitcher.value = 'school_representative';
            }
            applyProfileRole(profileSwitcher.value);
          });
        } else {
          profileSwitcher.value = 'school_representative';
          applyProfileRole(profileSwitcher.value);
        }
      }
    }

    // Bind Topbar Header Icon clicks
    const headerBtn = document.getElementById('header-classroom-hub-btn');
    const mobileBtn = document.getElementById('mobile-classroom-hub-btn');

    const clickAction = (e) => {
      e.preventDefault();
      document.querySelectorAll('.dashboard-tab-panel').forEach(panel => {
        panel.classList.remove('active');
        panel.style.display = 'none';
      });

      document.querySelectorAll('.sidebar-nav-link, .mobile-sidebar-link').forEach(link => {
        link.classList.remove('active');
      });

      const hubTab = document.getElementById('teacher-classroom-hub-tab');
      if (hubTab) {
        hubTab.classList.add('active');
        hubTab.style.display = 'block';
      }

      const titleEl = document.getElementById('top-bar-title');
      if (titleEl) titleEl.textContent = 'Teacher Classroom Hub';

      renderHubContent();
    };

    if (headerBtn) {
      headerBtn._classroomHubClick = clickAction;
      headerBtn.onclick = clickAction;
    }
    if (mobileBtn) {
      mobileBtn._classroomHubClick = clickAction;
      mobileBtn.onclick = clickAction;
    }

    // Run first render
    renderHubContent();
  }

  // --- Dynamic Render Engine ---
  function renderHubContent() {
    const classroomsGrid = document.getElementById('hub-classrooms-grid');
    if (!classroomsGrid) return;

    // Get current simulated teacher info
    const teachers = getS('campuslink_teachers', DEFAULT_TEACHERS);
    const currentTeacher = teachers.find(t => t.id === selectedTeacherId) || teachers[0];
    const isVerified = currentTeacher.verificationStatus === 'verified';

    if (!isVerified) {
      // Show Verification Pending card
      classroomsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 64px 32px; background: var(--white); border: 1px solid var(--border-color); border-radius: 16px; box-shadow: var(--shadow-sm); max-width: 500px; margin: 40px auto; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <div style="font-size: 3.5rem; margin-bottom: 20px; animation: pulse 2s infinite;">🔒</div>
          <h3 style="margin: 0 0 10px 0; font-size: 1.25rem; font-weight: 800; color: var(--dark-bg);">Account Verification Pending</h3>
          <p style="margin: 0; font-size: 0.88rem; color: var(--text-muted); line-height: 1.6; max-width: 400px; margin: 0 auto 24px;">
            Join a school to access Classrooms. Your account is currently pending verification by your school's administration.
          </p>
          <div style="display: flex; gap: 12px; justify-content: center; align-items: center; flex-wrap: wrap;">
            <a href="schools.html" class="btn btn-primary" style="padding: 10px 20px; font-size: 0.85rem; font-weight: 700; background: var(--primary); border: none; border-radius: 8px; color: white; text-decoration: none;">Discover Schools</a>
            <button class="btn btn-secondary" onclick="if(typeof window.showToast==='function') { window.showToast('Verification request pinged to school admin!', 'info'); } else { alert('Pinged admin'); }" style="padding: 10px 20px; font-size: 0.85rem; font-weight: 700; border-radius: 8px;">Ping School Admin</button>
          </div>
        </div>
      `;
      // Clear badge count
      const headerBadge = document.getElementById('header-classroom-hub-badge');
      const mobileBadge = document.getElementById('mobile-classroom-hub-badge');
      if (headerBadge) headerBadge.textContent = '0';
      if (mobileBadge) mobileBadge.textContent = '0';
      
      // Clear stats row
      const statsContainer = document.getElementById('hub-stats-container');
      if (statsContainer) statsContainer.innerHTML = '';
      return;
    }

    // Filter classrooms where the teacher is assigned
    // 1. As Class Teacher (cr.classTeacherId === selectedTeacherId)
    // 2. As Subject Teacher (where classroom_subjects mapping connects cr.id to teacherId)
    const assignedClassrooms = classroomsList.filter(cr => {
      const isClassTeacher = cr.classTeacherId === selectedTeacherId;
      const isSubjectTeacher = classroomSubjects.some(cs => cs.classroomId === cr.id && cs.teacherId === selectedTeacherId && cs.status === 'active');
      return isClassTeacher || isSubjectTeacher;
    });

    // Update Header Badges
    const headerBadge = document.getElementById('header-classroom-hub-badge');
    const mobileBadge = document.getElementById('mobile-classroom-hub-badge');
    if (headerBadge) headerBadge.textContent = assignedClassrooms.length;
    if (mobileBadge) mobileBadge.textContent = assignedClassrooms.length;

    // Render Stats row
    renderStatsRow(assignedClassrooms);

    if (assignedClassrooms.length === 0) {
      classroomsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 24px; background: var(--white); border: 1px solid var(--border-color); border-radius: 16px;">
          <div style="font-size: 3rem; margin-bottom: 12px;">🏫</div>
          <h4 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: var(--dark-bg);">No Assigned Classrooms</h4>
          <p style="margin: 6px 0 0 0; font-size: 0.82rem; color: var(--text-muted); max-width: 320px; margin: 8px auto 0;">You aren't assigned as a Class Teacher or Subject Teacher to any classroom for this academic year.</p>
        </div>
      `;
      return;
    }

    classroomsGrid.innerHTML = assignedClassrooms.map(cr => {
      const className = getClassName(cr.classId);
      const yearName = getYearName(cr.academicYearId);
      const isCT = cr.classTeacherId === selectedTeacherId;
      const roleText = isCT ? 'Class Teacher' : 'Subject Teacher';
      const roleBg = isCT ? 'background: #EEF2FF; color: #4F46E5; border: 1.5px solid #C7D2FE;' : 'background: #F0FDF4; color: #16A34A; border: 1.5px solid #BBF7D0;';

      // Find subjects taught by this teacher in this classroom
      const subjectsTaught = classroomSubjects
        .filter(cs => cs.classroomId === cr.id && cs.teacherId === selectedTeacherId && cs.status === 'active')
        .map(cs => {
          const subjectsMaster = getS('campuslink_subjects', []);
          const sub = subjectsMaster.find(s => s.id === cs.subjectId);
          return sub ? sub.name : 'Subject';
        });

      const subjectsLabel = isCT
        ? (subjectsTaught.length ? subjectsTaught.join(', ') : 'All Subjects')
        : (subjectsTaught.join(', ') || 'Assigned Subject');

      // Today's Timetable Period Widget Mock
      const widget = TIMETABLE_WIDGETS[cr.id] || { todayPeriods: 'General periods', nextClass: 'Study', room: cr.roomNumber || 'Room 201', subject: 'Self Study', time: '1:00 PM', teacher: 'N/A' };

      // Mock notifications/alerts
      const pendingHw = isCT ? 2 : 1;
      const unreadAnn = isCT ? 1 : 0;
      const attStatus = isCT ? 'Taken (95.2%)' : 'Verified';
      const attColor = isCT ? '#10B981' : '#64748B';

      return `
        <div style="background: var(--white); border: 1px solid var(--border-color); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; transition: all 0.2s;"
             onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-md)';" onmouseout="this.style.transform='none'; this.style.boxShadow='var(--shadow-sm)';">
          
          <!-- Card Header Info -->
          <div style="padding: 18px 20px; border-bottom: 1px solid var(--border-color); background: var(--light-bg); display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div>
              <span style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">${yearName}</span>
              <h4 style="margin: 4px 0 0 0; font-size: 1.05rem; font-weight: 800; color: var(--dark-bg);">${className} - Section ${cr.sectionId}</h4>
              <p style="margin: 3px 0 0 0; font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">📚 ${subjectsLabel}</p>
            </div>
            <span style="display: inline-block; padding: 3px 10px; border-radius: 100px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; ${roleBg}">
              ${roleText}
            </span>
          </div>

          <!-- Card Content details -->
          <div style="padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; flex-grow: 1;">
            
            <!-- Quick metrics -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.8rem;">
              <div>
                <span style="color: var(--text-muted); display: block; font-size: 0.72rem; text-transform: uppercase; font-weight: 700;">Students</span>
                <strong style="color: var(--dark-bg); font-weight: 700; font-size: 0.88rem;">👥 ${cr.studentCount || 40} Active</strong>
              </div>
              <div>
                <span style="color: var(--text-muted); display: block; font-size: 0.72rem; text-transform: uppercase; font-weight: 700;">Attendance Today</span>
                <strong style="color: ${attColor}; font-weight: 700; font-size: 0.88rem;">📅 ${attStatus}</strong>
              </div>
            </div>

            <!-- Alerts Badge row -->
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <span style="background: #FEF3C7; color: #D97706; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;">
                📝 ${pendingHw} Pending Homeworks
              </span>
              ${unreadAnn > 0 ? `
                <span style="background: #FEE2E2; color: #DC2626; padding: 3px 8px; border-radius: 6px; font-size: 0.72rem; font-weight: 700;">
                  📢 ${unreadAnn} New Announcement
                </span>
              ` : ''}
            </div>

            <!-- Timetable Next Class widget -->
            <div style="background: var(--bg-light); border: 1px dashed var(--border-color); border-radius: 10px; padding: 10px 12px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.68rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">
                <span>Next Class Period</span>
                <span style="color: var(--primary);">⏱️ ${widget.time}</span>
              </div>
              <strong style="font-size: 0.8rem; color: var(--dark-bg);">${widget.subject} (${widget.room})</strong>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Taught by: ${widget.teacher}</div>
            </div>

          </div>

          <!-- Card Actions panel footer -->
          <div style="padding: 12px 18px; border-top: 1px solid var(--border-color); background: var(--light-bg); display: flex; gap: 8px; justify-content: space-between; align-items: center; flex-wrap: wrap;">
            
            <!-- Quick Action button menu -->
            <div style="display: flex; gap: 6px;">
              ${isCT ? `
                <button class="btn btn-primary btn-hub-action" data-classroom-id="${cr.id}" data-action="attendance" title="Take Daily Attendance" style="padding: 6px 10px; font-size: 0.72rem; background: var(--primary); border: none; border-radius: 6px; font-weight: 700;">Take Attendance</button>
              ` : `
                <button class="btn btn-primary btn-hub-action" data-classroom-id="${cr.id}" data-action="homework" title="Post Homework Assignment" style="padding: 6px 10px; font-size: 0.72rem; background: #16A34A; border: none; border-radius: 6px; font-weight: 700;">Add Homework</button>
              `}
              <button class="btn btn-secondary btn-hub-action" data-classroom-id="${cr.id}" data-action="announcement" title="Publish Announcement" style="padding: 6px 10px; font-size: 0.72rem; border-radius: 6px; font-weight: 700;">Announce</button>
              <button class="btn btn-secondary btn-hub-action" data-classroom-id="${cr.id}" data-action="timetable" title="Timetable Schedule" style="padding: 6px 10px; font-size: 0.72rem; border-radius: 6px; font-weight: 700;">Timetable</button>
            </div>

            <!-- Open workspace -->
            <button class="btn btn-secondary btn-hub-open-workspace" data-classroom-id="${cr.id}" style="padding: 6px 12px; font-size: 0.75rem; border-radius: 6px; border-color: var(--primary); color: var(--primary); font-weight: 700;"
                    onmouseover="this.style.background='var(--primary-light)'" onmouseout="this.style.background='none'">
              Open Workspace &rarr;
            </button>
          </div>

        </div>
      `;
    }).join('');

    // Attach click events to Card actions
    classroomsGrid.querySelectorAll('.btn-hub-action').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const crId = btn.getAttribute('data-classroom-id');
        const act = btn.getAttribute('data-action');
        executeQuickAction(crId, act);
      };
    });

    classroomsGrid.querySelectorAll('.btn-hub-open-workspace').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const crId = btn.getAttribute('data-classroom-id');
        openWorkspaceForTeacher(crId);
      };
    });
  }

  // Stats row renderer
  function renderStatsRow(assignedList) {
    const statsContainer = document.getElementById('hub-stats-container');
    if (!statsContainer) return;

    const totalRooms = assignedList.length;
    const totalStudents = assignedList.reduce((sum, item) => sum + (item.studentCount || 0), 0);
    const totalSubjects = assignedList.reduce((sum, item) => {
      const count = classroomSubjects.filter(cs => cs.classroomId === item.id && cs.teacherId === selectedTeacherId && cs.status === 'active').length;
      return sum + (count || 1);
    }, 0);

    statsContainer.innerHTML = `
      <div style="background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; text-align: center;">
        <span style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Assigned Classes</span>
        <div style="font-size: 1.8rem; font-weight: 900; color: var(--primary); margin-top: 4px;">${totalRooms} Rooms</div>
      </div>
      <div style="background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; text-align: center;">
        <span style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Total Students managed</span>
        <div style="font-size: 1.8rem; font-weight: 900; color: #10B981; margin-top: 4px;">${totalStudents} Students</div>
      </div>
      <div style="background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; text-align: center;">
        <span style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Subjects Taught</span>
        <div style="font-size: 1.8rem; font-weight: 900; color: #F59E0B; margin-top: 4px;">${totalSubjects} Subjects</div>
      </div>
    `;
  }

  // --- Route Workspace & Auto-Apply Role Privileges ---
  function openWorkspaceForTeacher(classroomId, activeTab = 'overview') {
    const cr = classroomsList.find(c => c.id === classroomId);
    if (!cr) return;

    // Resolve simulated role based on classroom settings
    // If Ali Ahmad is class teacher of cr-9a, they open it as Class Teacher.
    // If Priya Sharma is subject teacher of cr-9a, they open it as Subject Teacher.
    const isCT = cr.classTeacherId === selectedTeacherId;
    const roleToApply = isCT ? 'class_teacher' : 'teacher';

    // Call classrooms.js open API globally
    if (typeof window.openClassroomWorkspace === 'function') {
      window.openClassroomWorkspace(classroomId);

      // Force Workspace simulated role switcher to align
      const wsSwitcher = document.getElementById('workspace-role-switcher');
      if (wsSwitcher) {
        wsSwitcher.value = roleToApply;
        // Trigger manual change event
        wsSwitcher.dispatchEvent(new Event('change'));
      }

      // Route directly to selected workspace tab (like Homework or Announcements)
      if (activeTab && activeTab !== 'overview') {
        const wsSidebar = document.getElementById('workspace-sidebar-menu');
        if (wsSidebar) {
          const menuItem = wsSidebar.querySelector(`.workspace-menu-item[data-view="${activeTab}"]`);
          if (menuItem) menuItem.click();
        }
      }
    } else {
      showToastMessage('Classroom workspace module not loaded.', 'error');
    }
  }

  // Execute quick actions from Hub Cards
  function executeQuickAction(classroomId, action) {
    if (action === 'attendance') {
      // Redirect to marking attendance roster modal in attendance module
      if (typeof window._attOpenMarkModal === 'function') {
        window._attOpenMarkModal(classroomId);
      } else {
        // Fallback: open workspace attendance panel
        openWorkspaceForTeacher(classroomId, 'attendance');
      }
    } else if (action === 'homework') {
      openWorkspaceForTeacher(classroomId, 'homework');
    } else if (action === 'announcement') {
      openWorkspaceForTeacher(classroomId, 'announcements');
    } else if (action === 'timetable') {
      openWorkspaceForTeacher(classroomId, 'timetable');
    }
  }

  // Helper Toast Alert Message
  function showToastMessage(msg, type = 'success') {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
    } else {
      alert(`${type.toUpperCase()}: ${msg}`);
    }
  }

  // Apply simulated header profile role
  function applyProfileRole(roleType) {
    const headerBtn = document.getElementById('header-classroom-hub-btn');
    const mobileBtn = document.getElementById('mobile-classroom-hub-btn');
    
    const avatarEl = document.getElementById('school-avatar-letter');
    const usernameEl = document.getElementById('school-username');
    const userboardEl = document.getElementById('school-userboard');
    
    const mobileLogoChar = document.getElementById('mobile-school-logo-char');
    const mobileSchoolName = document.getElementById('mobile-school-name-text');

    const sidebarBadge = document.getElementById('sidebar-role-badge');
    const mobileSidebarBadge = document.getElementById('mobile-sidebar-role-badge');

    const desktopNav = document.querySelector('nav.dashboard-nav');
    const mobileNav = document.querySelector('nav.mobile-sidebar-nav');

    // Get current simulated teacher info
    const teachers = getS('campuslink_teachers', DEFAULT_TEACHERS);
    const currentTeacher = teachers.find(t => t.id === selectedTeacherId) || teachers[0];
    const isVerified = currentTeacher.verificationStatus === 'verified';

    if (roleType === 'teacher') {
      // Show Classroom Icon in appropriate verified/unverified state
      if (headerBtn) {
        headerBtn.style.display = 'flex';
        if (isVerified) {
          headerBtn.style.opacity = '1';
          headerBtn.title = 'Teacher Classroom Hub';
          if (headerBtn._classroomHubClick) {
            headerBtn.onclick = headerBtn._classroomHubClick;
          }
          
          const badge = document.getElementById('header-classroom-hub-badge');
          if (badge) {
            badge.style.background = 'var(--primary)';
            // recalculate count
            const assignedClassrooms = classroomsList.filter(cr => {
              const isClassTeacher = cr.classTeacherId === selectedTeacherId;
              const isSubjectTeacher = classroomSubjects.some(cs => cs.classroomId === cr.id && cs.teacherId === selectedTeacherId && cs.status === 'active');
              return isClassTeacher || isSubjectTeacher;
            });
            badge.textContent = assignedClassrooms.length;
          }
        } else {
          headerBtn.style.opacity = '0.5';
          headerBtn.title = 'Join a school to access Classrooms.';
          headerBtn.onclick = (e) => {
            e.stopPropagation();
            window.location.href = 'schools.html';
          };
          
          const badge = document.getElementById('header-classroom-hub-badge');
          if (badge) {
            badge.textContent = '🔒';
            badge.style.background = '#6B7280';
          }
        }
      }

      if (mobileBtn) {
        mobileBtn.style.display = 'flex';
        if (isVerified) {
          mobileBtn.style.opacity = '1';
          if (mobileBtn._classroomHubClick) {
            mobileBtn.onclick = mobileBtn._classroomHubClick;
          }
          
          const mobBadge = document.getElementById('mobile-classroom-hub-badge');
          if (mobBadge) {
            mobBadge.style.background = 'var(--primary)';
            const assignedClassrooms = classroomsList.filter(cr => {
              const isClassTeacher = cr.classTeacherId === selectedTeacherId;
              const isSubjectTeacher = classroomSubjects.some(cs => cs.classroomId === cr.id && cs.teacherId === selectedTeacherId && cs.status === 'active');
              return isClassTeacher || isSubjectTeacher;
            });
            mobBadge.textContent = assignedClassrooms.length;
          }
        } else {
          mobileBtn.style.opacity = '0.5';
          mobileBtn.onclick = (e) => {
            e.stopPropagation();
            window.location.href = 'schools.html';
          };
          
          const mobBadge = document.getElementById('mobile-classroom-hub-badge');
          if (mobBadge) {
            mobBadge.textContent = '🔒';
            mobBadge.style.background = '#6B7280';
          }
        }
      }

      // Remove leftover notices
      const noticeEl = document.getElementById('header-classroom-unverified-notice');
      if (noticeEl) noticeEl.remove();
      const mobNoticeEl = document.getElementById('mobile-classroom-unverified-notice');
      if (mobNoticeEl) mobNoticeEl.remove();

      // Update Role Badges
      if (sidebarBadge) {
        sidebarBadge.textContent = 'TEACHER STAFF';
        sidebarBadge.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
        sidebarBadge.style.color = '#6366F1';
      }
      if (mobileSidebarBadge) {
        mobileSidebarBadge.textContent = 'TEACHER STAFF';
        mobileSidebarBadge.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
        mobileSidebarBadge.style.color = '#6366F1';
      }

      // Hide Admin Sidebar links
      if (desktopNav) {
        desktopNav.querySelectorAll('a.dashboard-nav-link').forEach(link => {
          if (!link.classList.contains('temp-teacher-link')) {
            link.style.display = 'none';
          }
        });
        
        // Append custom teacher hub link if verified and not present
        if (isVerified) {
          if (!desktopNav.querySelector('.temp-teacher-link')) {
            const teacherLink = document.createElement('a');
            teacherLink.className = 'dashboard-nav-link active temp-teacher-link';
            teacherLink.style.cursor = 'pointer';
            teacherLink.innerHTML = `<span class="icon">🏫</span> Classroom Hub`;
            teacherLink.onclick = (e) => {
              e.preventDefault();
              if (headerBtn) headerBtn.click();
            };
            desktopNav.appendChild(teacherLink);
          } else {
            const teacherLink = desktopNav.querySelector('.temp-teacher-link');
            teacherLink.style.display = '';
            teacherLink.classList.add('active');
          }
        } else {
          const teacherLink = desktopNav.querySelector('.temp-teacher-link');
          if (teacherLink) teacherLink.style.display = 'none';
        }
      }

      if (mobileNav) {
        mobileNav.querySelectorAll('a.dashboard-nav-link').forEach(link => {
          if (!link.classList.contains('temp-teacher-link')) {
            link.style.display = 'none';
          }
        });
        
        if (isVerified) {
          if (!mobileNav.querySelector('.temp-teacher-link')) {
            const teacherLink = document.createElement('a');
            teacherLink.className = 'dashboard-nav-link active temp-teacher-link';
            teacherLink.style.cursor = 'pointer';
            teacherLink.innerHTML = `<span class="icon">🏫</span> Classroom Hub`;
            teacherLink.onclick = (e) => {
              e.preventDefault();
              if (mobileBtn) mobileBtn.click();
            };
            mobileNav.appendChild(teacherLink);
          } else {
            const teacherLink = mobileNav.querySelector('.temp-teacher-link');
            teacherLink.style.display = '';
            teacherLink.classList.add('active');
          }
        } else {
          const teacherLink = mobileNav.querySelector('.temp-teacher-link');
          if (teacherLink) teacherLink.style.display = 'none';
        }
      }

      // Update header info to match Teacher profile
      if (avatarEl) {
        avatarEl.style.backgroundImage = '';
        avatarEl.textContent = currentTeacher.fullName.charAt(0).toUpperCase();
      }
      if (usernameEl) usernameEl.textContent = currentTeacher.fullName;
      if (userboardEl) userboardEl.textContent = `${currentTeacher.department || 'Mathematics'} Dept • Staff`;

      if (mobileLogoChar) mobileLogoChar.textContent = currentTeacher.fullName.charAt(0).toUpperCase();
      if (mobileSchoolName) mobileSchoolName.textContent = currentTeacher.fullName;
    } else {
      // Hide Classroom Icon & notices
      if (headerBtn) headerBtn.style.display = 'none';
      if (mobileBtn) mobileBtn.style.display = 'none';
      
      const noticeEl = document.getElementById('header-classroom-unverified-notice');
      if (noticeEl) noticeEl.remove();
      const mobNoticeEl = document.getElementById('mobile-classroom-unverified-notice');
      if (mobNoticeEl) mobNoticeEl.remove();

      // Restore Role Badges
      if (sidebarBadge) {
        sidebarBadge.textContent = 'SCHOOL ADMIN';
        sidebarBadge.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
        sidebarBadge.style.color = '#10B981';
      }
      if (mobileSidebarBadge) {
        mobileSidebarBadge.textContent = 'SCHOOL PARTNER';
        mobileSidebarBadge.style.backgroundColor = '';
        mobileSidebarBadge.style.color = '';
      }

      // Restore Admin Sidebar links
      if (desktopNav) {
        desktopNav.querySelectorAll('a.dashboard-nav-link').forEach(link => {
          if (link.classList.contains('temp-teacher-link')) {
            link.remove();
          } else {
            link.style.display = '';
          }
        });
        // Make Dashboard tab link active
        desktopNav.querySelectorAll('a.dashboard-nav-link').forEach(link => {
          if (link.getAttribute('data-tab') === 'overview') {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }

      if (mobileNav) {
        mobileNav.querySelectorAll('a.dashboard-nav-link').forEach(link => {
          if (link.classList.contains('temp-teacher-link')) {
            link.remove();
          } else {
            link.style.display = '';
          }
        });
        mobileNav.querySelectorAll('a.dashboard-nav-link').forEach(link => {
          if (link.getAttribute('data-tab') === 'overview') {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }

      // Load original school admin profile
      const storedProfile = getS('campuslink_profile', { name: "Greenwood International School", board: "CBSE", city: "New Delhi" });

      if (avatarEl) {
        if (storedProfile.logoUrl) {
          avatarEl.style.backgroundImage = `url('${storedProfile.logoUrl}')`;
          avatarEl.style.backgroundSize = 'cover';
          avatarEl.textContent = '';
        } else {
          avatarEl.style.backgroundImage = '';
          avatarEl.textContent = storedProfile.logoLetter || storedProfile.name.charAt(0).toUpperCase();
        }
      }
      if (usernameEl) usernameEl.textContent = storedProfile.name;
      if (userboardEl) userboardEl.textContent = `${storedProfile.board} Board • ${storedProfile.city}`;

      if (mobileLogoChar) mobileLogoChar.textContent = storedProfile.logoLetter || storedProfile.name.charAt(0).toUpperCase();
      if (mobileSchoolName) mobileSchoolName.textContent = storedProfile.name;

      // If we are currently in classroom hub tab, go back to overview tab
      const hubTab = document.getElementById('teacher-classroom-hub-tab');
      if (hubTab && hubTab.classList.contains('active')) {
        document.querySelectorAll('.dashboard-tab-panel').forEach(panel => {
          panel.classList.remove('active');
          panel.style.display = 'none';
        });
        const overviewTab = document.getElementById('overview-tab');
        if (overviewTab) {
          overviewTab.classList.add('active');
          overviewTab.style.display = 'block';
        }
        
        const titleEl = document.getElementById('top-bar-title');
        if (titleEl) titleEl.textContent = 'Dashboard Overview';
      }
    }
  }

  // Hook workspace initiation on load
  const originalInitClassroomsTab = window.initClassroomsTab;
  window.initClassroomsTab = function() {
    if (typeof originalInitClassroomsTab === 'function') {
      originalInitClassroomsTab();
    }
    initTeacherHub();
  };

  // Export module function globally
  window.initTeacherHub = initTeacherHub;

  // Auto-initialize on page load
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (typeof window.initClassroomsTab === 'function') {
        window.initClassroomsTab();
      }

      // Check URL parameters for auto-opening classroom
      const urlParams = new URLSearchParams(window.location.search);
      const classroomParam = urlParams.get('classroom');
      if (classroomParam) {
        // Automatically switch profile role switcher to Teacher
        const profileSwitcher = document.getElementById('header-profile-role-switcher');
        if (profileSwitcher) {
          profileSwitcher.value = 'teacher';
          profileSwitcher.dispatchEvent(new Event('change'));
        }

        // Open specific classroom workspace
        if (typeof window.openClassroomWorkspace === 'function') {
          setTimeout(() => {
            window.openClassroomWorkspace(classroomParam);
          }, 300);
        }
      }
    }, 200);
  });

})();
