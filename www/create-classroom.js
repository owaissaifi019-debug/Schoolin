// ============================================================
// CREATE CLASSROOM WORKSPACE CONTROLLER
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // State variables
  let auth = window.CampusLink?.auth;
  let supabase = window.CampusLink?.supabase;
  let profile = null;
  let academicYears = [];
  let classrooms = [];
  let classroomAssignments = [];
  let schoolTeachers = [];

  // DOM Elements
  const form = document.getElementById('create-classroom-form');
  const yearSelect = document.getElementById('year-select');
  const gradeSelect = document.getElementById('grade-select');
  const sectionInput = document.getElementById('section-input');
  const roomInput = document.getElementById('room-input');
  const capacityRange = document.getElementById('capacity-range');
  const capacityIndicator = document.getElementById('capacity-indicator');
  const statusSelect = document.getElementById('status-select');
  const teacherSearchInput = document.getElementById('teacher-search-input');
  const teacherSelect = document.getElementById('teacher-select');
  const toastContainer = document.getElementById('toast-container');

  // Preview Elements
  const previewYear = document.getElementById('preview-year');
  const previewClassTitle = document.getElementById('preview-class-title');
  const previewStatusBadge = document.getElementById('preview-status-badge');
  const previewTeacher = document.getElementById('preview-teacher');
  const previewRoom = document.getElementById('preview-room');
  const previewCapacity = document.getElementById('preview-capacity');

  // 1. Initial State Loading & Local Caches fallback
  function getStoredData(key, defaultValue) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  function saveState(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('Storage save failed:', e);
    }
  }

  // Load from local storage first (optimistic load)
  academicYears = getStoredData('campuslink_academic_years', [
    { id: 'year-2024-25', name: '2024-25', is_active: false, school_id: 'default' },
    { id: 'year-2025-26', name: '2025-26', is_active: true, school_id: 'default' }
  ]);
  if (!academicYears || academicYears.length === 0) {
    academicYears = [
      { id: 'year-2024-25', name: '2024-25', is_active: false, school_id: 'default' },
      { id: 'year-2025-26', name: '2025-26', is_active: true, school_id: 'default' },
      { id: 'year-2026-27', name: '2026-27', is_active: false, school_id: 'default' }
    ];
  }

  classrooms = getStoredData('campuslink_classrooms', []);
  classroomAssignments = getStoredData('campuslink_classroom_assignments', []);
  
  schoolTeachers = getStoredData('campuslink_school_teachers', [
    { id: 'teacher-1', full_name: 'Mrs. Sharma', email: 'sharma@campuslink.edu', is_class_teacher: true },
    { id: 'teacher-2', full_name: 'Mr. Rajesh Kumar', email: 'rajesh@campuslink.edu', is_class_teacher: true },
    { id: 'teacher-3', full_name: 'Dr. Mehta', email: 'mehta@campuslink.edu', is_class_teacher: true }
  ]);

  // Load profile session from localStorage fallback first
  try {
    const profileData = localStorage.getItem('campuslink_profile');
    if (profileData) {
      profile = JSON.parse(profileData);
    }
  } catch (e) {
    console.warn('Profile parse failed:', e);
  }

  // Load live session & profile if connected
  if (auth && supabase && !profile) {
    try {
      const session = await auth.getSession();
      if (session && session.user) {
        const school = await auth.getSchoolForUser(session.user.id);
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
          saveState('campuslink_profile', profile);
        }
      }
    } catch (e) {
      console.warn('Failed to load profile live in create-classroom:', e);
    }
  }

  // Fallback profile if still null (for offline/demo mode)
  if (!profile) {
    profile = {
      id: 'default',
      name: 'Demo School',
      city: 'Delhi',
      state: 'Delhi',
      board: 'CBSE',
      logoLetter: 'D',
      about: 'A demo school description'
    };
  }

  // Load data from Supabase if connected
  await initializeSupabaseData();

  // Populate form elements
  populateYearsDropdown();
  populateTeachersDropdown();
  updateLivePreview();

  // 2. Query Supabase Database
  async function initializeSupabaseData() {
    if (!supabase || !profile || !profile.id) return;

    try {
      // Fetch Academic Years
      const { data: dbYears, error: yErr } = await supabase
        .from('academic_years')
        .select('*')
        .eq('school_id', profile.id)
        .order('name', { ascending: true });
      if (!yErr && dbYears) {
        academicYears = dbYears;
      }
      
      // Ensure we have calendar fallbacks if database table is empty
      if (!academicYears || academicYears.length === 0) {
        academicYears = [
          { id: 'year-2024-25', name: '2024-25', is_active: false, school_id: profile.id },
          { id: 'year-2025-26', name: '2025-26', is_active: true, school_id: profile.id },
          { id: 'year-2026-27', name: '2026-27', is_active: false, school_id: profile.id }
        ];
      }
      saveState('campuslink_academic_years', academicYears);

      // Fetch Classrooms to check duplicates later
      const { data: dbClassrooms, error: cErr } = await supabase
        .from('classrooms')
        .select('*')
        .eq('school_id', profile.id);
      if (!cErr && dbClassrooms) {
        classrooms = dbClassrooms;
        saveState('campuslink_classrooms', classrooms);
      }

      // Fetch Class Teacher Assignments
      const cIds = classrooms.map(c => c.id);
      if (cIds.length > 0) {
        const { data: dbAssignments, error: aErr } = await supabase
          .from('classroom_teacher_assignments')
          .select(`
            id, classroom_id, teacher_id, assignment_type, start_date, end_date, is_active, reason,
            teacher:profiles!teacher_id(full_name, email)
          `)
          .in('classroom_id', cIds);
        if (!aErr && dbAssignments) {
          classroomAssignments = dbAssignments;
          saveState('campuslink_classroom_assignments', classroomAssignments);
        }
      }

      // 1. Fetch Verified School Staff
      let staffList = [];
      const { data: dbSchoolTeachers, error: tErr } = await supabase
        .from('school_members')
        .select(`
          user_id, role, is_class_teacher,
          user:profiles!user_id(id, full_name, email)
        `)
        .eq('school_id', profile.id)
        .in('role', ['teacher', 'faculty']);
      
      if (!tErr && dbSchoolTeachers) {
        staffList = dbSchoolTeachers
          .filter(t => t.user)
          .map(t => ({
            id: t.user.id,
            full_name: t.user.full_name,
            email: t.user.email,
            is_class_teacher: t.is_class_teacher !== false
          }));
      }

      const teachersMap = new Map();
      staffList.forEach(t => teachersMap.set(t.id, t));

      // 2. Fetch General Community Teacher Profiles
      try {
        const { data: communityTeachers } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('user_type', 'teacher');
        
        if (communityTeachers) {
          communityTeachers.forEach(t => {
            if (!teachersMap.has(t.id)) {
              teachersMap.set(t.id, {
                id: t.id,
                full_name: t.full_name,
                email: t.email || '',
                is_class_teacher: true
              });
            }
          });
        }
      } catch (comErr) {
        console.warn('Could not query community teachers:', comErr);
      }

      // 3. Fetch Mutual Connections who are Teachers
      try {
        const { data: connReq } = await supabase
          .from('connections')
          .select('receiver:profiles!receiver_id(id, full_name, email, user_type)')
          .eq('requester_id', profile.id)
          .eq('status', 'accepted');
        
        const { data: connRec } = await supabase
          .from('connections')
          .select('requester:profiles!requester_id(id, full_name, email, user_type)')
          .eq('receiver_id', profile.id)
          .eq('status', 'accepted');

        if (connReq) {
          connReq.forEach(c => {
            if (c.receiver && c.receiver.user_type === 'teacher') {
              teachersMap.set(c.receiver.id, {
                id: c.receiver.id,
                full_name: c.receiver.full_name,
                email: c.receiver.email || '',
                is_class_teacher: true
              });
            }
          });
        }

        if (connRec) {
          connRec.forEach(c => {
            if (c.requester && c.requester.user_type === 'teacher') {
              teachersMap.set(c.requester.id, {
                id: c.requester.id,
                full_name: c.requester.full_name,
                email: c.requester.email || '',
                is_class_teacher: true
              });
            }
          });
        }
      } catch (connErr) {
        console.warn('Could not query connections:', connErr);
      }

      schoolTeachers = Array.from(teachersMap.values());
      saveState('campuslink_school_teachers', schoolTeachers);

    } catch (err) {
      console.warn('Supabase fetch failed, utilizing cached offline fallback:', err);
    }
  }

  // 3. Populate Input Selects
  function populateYearsDropdown() {
    yearSelect.innerHTML = '';
    academicYears.forEach(year => {
      const opt = document.createElement('option');
      opt.value = year.id;
      opt.textContent = year.name;
      if (year.is_active) {
        opt.selected = true;
      }
      yearSelect.appendChild(opt);
    });
  }

  function populateTeachersDropdown() {
    teacherSelect.innerHTML = '';
    
    // Add clearer No Teacher option to avoid any "non leave assigned" misreadings
    const defOpt = document.createElement('option');
    defOpt.value = '';
    defOpt.textContent = 'No Class Teacher (Unassigned)';
    teacherSelect.appendChild(defOpt);

    const query = teacherSearchInput.value.toLowerCase();
    const eligible = schoolTeachers.filter(t => 
      t.is_class_teacher && 
      (t.full_name.toLowerCase().includes(query) || t.email.toLowerCase().includes(query))
    );

    eligible.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.full_name} (${t.email})`;
      teacherSelect.appendChild(opt);
    });
  }

  // 4. Live Preview Update Function
  function updateLivePreview() {
    const selectedYearName = yearSelect.options[yearSelect.selectedIndex]?.text || 'Unknown Session';
    const grade = gradeSelect.value;
    const section = sectionInput.value.trim().toUpperCase() || 'A';
    const room = roomInput.value.trim() || 'Unassigned Room';
    const capacity = capacityRange.value;
    const status = statusSelect.value;
    const selectedTeacherName = teacherSelect.options[teacherSelect.selectedIndex]?.text.split(' (')[0] || 'Unassigned';

    // Update indicator label
    capacityIndicator.textContent = `${capacity} Students`;

    // Update Live Card DOM elements
    previewYear.textContent = `Session ${selectedYearName}`;
    previewClassTitle.textContent = `${grade}-${section}`;
    previewRoom.textContent = room;
    previewCapacity.textContent = `${capacity} Students`;
    previewTeacher.textContent = selectedTeacherName;

    // Status Badge Styling
    if (status === 'inactive') {
      previewStatusBadge.innerHTML = `<span style="display:inline-block; padding:3px 8px; border-radius:12px; font-size:0.72rem; font-weight:700; background:#FEE2E2; color:#B91C1C; border:1px solid #FECACA;">Inactive</span>`;
    } else {
      previewStatusBadge.innerHTML = `<span style="display:inline-block; padding:3px 8px; border-radius:12px; font-size:0.72rem; font-weight:700; background:#D1FAE5; color:#059669; border:1px solid #A7F3D0;">Active</span>`;
    }
  }

  // 5. Input Listeners
  yearSelect.addEventListener('change', updateLivePreview);
  gradeSelect.addEventListener('change', updateLivePreview);
  sectionInput.addEventListener('input', updateLivePreview);
  roomInput.addEventListener('input', updateLivePreview);
  capacityRange.addEventListener('input', updateLivePreview);
  statusSelect.addEventListener('change', updateLivePreview);
  teacherSelect.addEventListener('change', updateLivePreview);

  teacherSearchInput.addEventListener('input', () => {
    populateTeachersDropdown();
    updateLivePreview();
  });

  // 6. Form Submission & Duplication Validation
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let yearId = yearSelect.value;
    const grade = gradeSelect.value;
    const section = sectionInput.value.trim().toUpperCase();
    const room = roomInput.value.trim();
    const capacity = parseInt(capacityRange.value, 10);
    const status = statusSelect.value;
    const teacherId = teacherSelect.value;

    if (!section) {
      showToast('Please specify a section name (e.g. A, B, C).', 'error');
      return;
    }

    // Provision Academic Year if it's a fallback local ID
    if (yearId.startsWith('year-')) {
      const yearName = yearSelect.options[yearSelect.selectedIndex].text;
      
      if (supabase && profile?.id) {
        try {
          const { data: existingYear } = await supabase
            .from('academic_years')
            .select('id')
            .eq('school_id', profile.id)
            .eq('name', yearName)
            .maybeSingle();

          if (existingYear) {
            yearId = existingYear.id;
          } else {
            const { data: newYear, error: yErr } = await supabase
              .from('academic_years')
              .insert({
                school_id: profile.id,
                name: yearName,
                is_active: yearName === '2025-26'
              })
              .select()
              .single();
            
            if (yErr) throw yErr;
            if (newYear) {
              yearId = newYear.id;
              // update local session list
              academicYears = academicYears.map(y => y.name === yearName ? { ...y, id: newYear.id, school_id: profile.id } : y);
              saveState('campuslink_academic_years', academicYears);
            }
          }
        } catch (dbErr) {
          console.warn('Failed to insert academic year, using temp ID:', dbErr);
        }
      }
    }

    // SPEC REQUIREMENT: Prevent duplicate classroom registration in the same Academic Year
    const isDuplicate = classrooms.some(c => 
      c.academic_year_id === yearId && 
      c.grade === grade && 
      c.section.toUpperCase() === section &&
      !c.is_archived
    );

    if (isDuplicate) {
      const yearName = yearSelect.options[yearSelect.selectedIndex].text;
      showToast(`Conflict: Classroom ${grade}-${section} already exists in the academic session ${yearName}!`, 'error');
      return;
    }

    const newClassroom = {
      school_id: profile?.id || 'default',
      academic_year_id: yearId,
      grade,
      section,
      room,
      capacity,
      status,
      is_archived: false
    };

    let savedClassroomId = 'class-' + Date.now();

    try {
      // DB Save
      if (supabase && profile?.id) {
        const { data, error } = await supabase
          .from('classrooms')
          .insert(newClassroom)
          .select()
          .single();
        if (error) throw error;
        if (data) savedClassroomId = data.id;
      }

      newClassroom.id = savedClassroomId;
      classrooms.push(newClassroom);
      saveState('campuslink_classrooms', classrooms);

      // Class Teacher assignment save
      if (teacherId) {
        const now = new Date().toISOString();
        const newAssignment = {
          classroom_id: savedClassroomId,
          teacher_id: teacherId,
          assignment_type: 'permanent',
          start_date: now,
          is_active: true
        };

        if (supabase && profile?.id) {
          const { error: aErr } = await supabase
            .from('classroom_teacher_assignments')
            .insert(newAssignment);
          if (aErr) throw aErr;
        }

        // Cache local state
        newAssignment.id = 'assign-' + Date.now();
        const teacherName = teacherSelect.options[teacherSelect.selectedIndex].text.split(' (')[0];
        newAssignment.teacher = {
          full_name: teacherName,
          email: schoolTeachers.find(t => t.id === teacherId)?.email || ''
        };
        classroomAssignments.push(newAssignment);
        saveState('campuslink_classroom_assignments', classroomAssignments);
      }

      showToast('Classroom successfully created and registered!', 'success');

      // Redirect after toast completes
      setTimeout(() => {
        window.location.href = 'dashboard.html?tab=classroom-management';
      }, 1500);

    } catch (err) {
      console.error('Failed to create classroom:', err);
      showToast('Database write failed, saved locally. Redirecting...', 'warning');
      setTimeout(() => {
        window.location.href = 'dashboard.html?tab=classroom-management';
      }, 1500);
    }
  });

  // Helper Toast function
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 0.88rem;
      font-weight: 700;
      color: white;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
      animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      background: ${type === 'success' ? '#10B981' : type === 'warning' ? '#F59E0B' : '#EF4444'};
    `;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Inject keyframe animation rules dynamically
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateY(100%) scale(0.9); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateY(0) scale(1); opacity: 1; }
      to { transform: translateY(100%) scale(0.9); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

});
