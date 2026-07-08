/**
 * CampusLink – Classroom Management Module (Phase 3)
 * Provides in-memory data structures, state management, search/filtering,
 * dynamic HTML rendering for all tabs, and full CRUD operations.
 */

(function () {
  'use strict';

  // --- Initial Data Fallbacks (if academic management lists are empty) ---
  const DEFAULT_YEARS = [
    { id: 'ay-2026', name: '2026-2027', status: 'active', is_current: true }
  ];

  const DEFAULT_CLASSES = [
    { id: 'cls-9', name: 'Class 9', display_order: 9, status: 'active' },
    { id: 'cls-10', name: 'Class 10', display_order: 10, status: 'active' },
    { id: 'cls-11', name: 'Class 11', display_order: 11, status: 'active' }
  ];

  const DEFAULT_TEACHERS = [
    { id: 'tch_001', fullName: 'Ali Ahmad', username: 'ali.ahmad', status: 'active', email: 'ali.ahmad@school.com', department: 'Mathematics' },
    { id: 'tch_002', fullName: 'Priya Sharma', username: 'priya.sharma', status: 'active', email: 'priya.sharma@school.com', department: 'English' },
    { id: 'tch_003', fullName: 'Amit Verma', username: 'amit.verma', status: 'active', email: 'amit.verma@school.com', department: 'Science' },
    { id: 'tch_004', fullName: 'Sneha Patel', username: 'sneha.patel', status: 'active', email: 'sneha.patel@school.com', department: 'Computer Science' }
  ];

  const DEFAULT_SUBJECTS = [
    { id: 'sub-math', name: 'Mathematics', code: 'MAT101', category: 'core', status: 'active' },
    { id: 'sub-science', name: 'Science', code: 'SCI101', category: 'core', status: 'active' },
    { id: 'sub-english', name: 'English', code: 'ENG101', category: 'core', status: 'active' },
    { id: 'sub-cs', name: 'Computer Science', code: 'CS101', category: 'elective', status: 'active' }
  ];

  const DEFAULT_CLASSROOMS = [
    {
      id: 'cr-9a',
      schoolId: 'sch-01',
      academicYearId: 'ay-2026',
      classId: 'cls-9',
      sectionId: 'A',
      classTeacherId: 'tch_001',
      roomNumber: 'Room 203',
      building: 'Building A',
      floor: '2nd Floor',
      capacity: 45,
      status: 'active',
      studentCount: 42,
      subjectCount: 8,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'cr-9b',
      schoolId: 'sch-01',
      academicYearId: 'ay-2026',
      classId: 'cls-9',
      sectionId: 'B',
      classTeacherId: 'tch_002',
      roomNumber: 'Room 204',
      building: 'Building A',
      floor: '2nd Floor',
      capacity: 45,
      status: 'active',
      studentCount: 38,
      subjectCount: 7,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'cr-10a',
      schoolId: 'sch-01',
      academicYearId: 'ay-2026',
      classId: 'cls-10',
      sectionId: 'A',
      classTeacherId: 'tch_003',
      roomNumber: 'Room 301',
      building: 'Building B',
      floor: '3rd Floor',
      capacity: 40,
      status: 'active',
      studentCount: 39,
      subjectCount: 9,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
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

  // Helper: Get data from local storage
  function getStoredData(key, fallback) {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.warn("Parsing storage failed for " + key, e);
      return fallback;
    }
  }

  // Helper: Persist data
  function saveState(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // ── Conversation Group Auto-Creation ────────────────────────────────────────
  // Called immediately after a new classroom is persisted.
  // Creates two conversation entries in campuslink_conversations:
  //   1. School Community (one per school, idempotent)
  //   2. Classroom Channel (one per classroom id, idempotent)
  function createConversationGroupForClassroom(cr) {
    if (!cr || !cr.id) return;

    const raw = localStorage.getItem('campuslink_conversations');
    const convs = raw ? JSON.parse(raw) : [];

    const className = getClassName(cr.classId) || 'Class';
    const sectionName = cr.sectionId || 'A';
    const groupName = `${className}-${sectionName}`;
    const schoolId = cr.schoolId || 'sch-01';
    const now = new Date().toISOString();

    // 1. School Community – one per school (idempotent)
    const communityExists = convs.some(c => c.type === 'SCHOOL' && c.school_id === schoolId);
    if (!communityExists) {
      convs.push({
        id: 'conv-school-' + schoolId,
        school_id: schoolId,
        classroom_id: null,
        academic_year_id: cr.academicYearId || 'ay-2026',
        name: 'School Community Feed',
        description: 'Official announcements and community news for all verified teachers and students.',
        type: 'SCHOOL',
        is_archived: false,
        avatar: '🏫',
        created_at: now,
        settings: {
          send_messages_threshold: 'Admin',
          edit_info_threshold: 'Owner',
          change_photo_threshold: 'Owner',
          pin_messages_threshold: 'Admin',
          delete_messages_threshold: 'Admin'
        },
        pins: [],
        messages: [{
          id: 'sys-sch-' + Date.now(),
          sender_id: null,
          sender_name: 'System',
          sender_role: 'SYSTEM',
          content: 'School Community Feed created.',
          type: 'SYSTEM',
          created_at: now
        }]
      });
    }

    // 2. Classroom Channel – one per classroom id (idempotent)
    const channelExists = convs.some(c => c.type === 'CLASSROOM' && c.classroom_id === cr.id);
    if (!channelExists) {
      convs.push({
        id: 'conv-class-' + cr.id,
        school_id: schoolId,
        classroom_id: cr.id,
        academic_year_id: cr.academicYearId || 'ay-2026',
        name: groupName + ' Channel',
        description: `Official channel for ${groupName} classroom.`,
        type: 'CLASSROOM',
        is_archived: false,
        avatar: '🎒',
        created_at: now,
        settings: {
          send_messages_threshold: 'Member',
          edit_info_threshold: 'Admin',
          change_photo_threshold: 'Admin',
          pin_messages_threshold: 'Moderator',
          delete_messages_threshold: 'Admin'
        },
        pins: [],
        messages: [{
          id: 'sys-cls-' + Date.now(),
          sender_id: null,
          sender_name: 'System',
          sender_role: 'SYSTEM',
          content: `Classroom channel for ${groupName} has been created. Welcome!`,
          type: 'SYSTEM',
          created_at: now
        }]
      });
    }

    localStorage.setItem('campuslink_conversations', JSON.stringify(convs));
  }

  // --- Initialize Module State Variables ---
  let academicYears = [];
  let classes = [];
  let teachers = [];
  let subjects = [];
  let classrooms = [];
  let classroomSubjects = [];
  let students = [];

  let activeSubTab = 'all-classrooms';
  let classroomToDeleteId = null;

  // ── Global Database Synchronization ──
  async function syncAllFromSupabase() {
    const supabase = window.CampusLink?.supabase;
    const auth = window.CampusLink?.auth;
    if (!supabase || !auth) return;

    try {
      const user = await auth.getUser();
      if (!user) return;
      const school = await auth.getSchoolForUser(user.id);
      if (!school) return;
      const schoolId = school.id;

      // 1. Fetch Academic Years
      const { data: dbYears } = await supabase
        .from('academic_years')
        .select('*')
        .eq('school_id', schoolId);
      if (dbYears) {
        academicYears = dbYears.map(y => ({
          id: y.id,
          name: y.name,
          startDate: y.start_date || '2026-04-01',
          endDate: y.end_date || '2027-03-31',
          status: y.status || 'active',
          isCurrent: y.is_current || false,
          is_current: y.is_current || false
        }));
        saveState('campuslink_academic_years', academicYears);
      }

      // 2. Fetch Classes
      const { data: dbClasses } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', schoolId);
      if (dbClasses) {
        classes = dbClasses.map(c => ({
          id: c.id,
          name: c.name,
          display_order: c.display_order || 9,
          status: c.status || 'active',
          section: c.section || ''
        }));
        saveState('campuslink_classes', classes);
      }

      // 3. Fetch Teachers and Profiles (strictly filtered by school_id)
      const { data: dbTeachers } = await supabase
        .from('teachers')
        .select('*')
        .eq('school_id', schoolId);
      const { data: dbProfiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, email')
        .eq('school_id', schoolId)
        .eq('user_type', 'teacher');

      if (dbTeachers) {
        teachers = dbTeachers.map(t => {
          const prof = dbProfiles ? dbProfiles.find(p => p.id === t.user_id || (p.username && p.username.toLowerCase() === t.username.toLowerCase())) : null;
          const profileId = prof ? prof.id : (t.user_id || t.id);
          return {
            id: profileId,
            schoolId: t.school_id,
            fullName: t.full_name || (prof ? prof.full_name : null) || t.username || 'Teacher',
            username: t.username || 'teacher',
            status: t.status || 'active',
            email: t.email || (prof ? prof.email : null) || '',
            phone: t.phone || '',
            qualification: t.qualification || '',
            experience: t.experience || 0,
            department: t.department || 'General',
            gender: t.gender || 'Male',
            joiningDate: t.joining_date || '',
            employeeId: t.employee_id || '',
            verificationStatus: t.verification_status || 'pending',
            createdAt: t.created_at || new Date().toISOString(),
            updatedAt: t.updated_at || new Date().toISOString()
          };
        });
        saveState('campuslink_teachers', teachers);
      }

      // 4. Fetch Classrooms
      const { data: dbClassrooms } = await supabase
        .from('classrooms')
        .select('*')
        .eq('school_id', schoolId);
      
      const mappedClassrooms = [];
      const classroomIds = [];
      
      if (dbClassrooms) {
        for (const cr of dbClassrooms) {
          classroomIds.push(cr.id);
          
          // Fetch student count
          const { count: stdCount } = await supabase
            .from('classroom_students')
            .select('*', { count: 'exact', head: true })
            .eq('classroom_id', cr.id);

          // Fetch subject count
          const { data: subList } = await supabase
            .from('classroom_subject_teachers')
            .select('subject')
            .eq('classroom_id', cr.id);
          const subCount = subList ? Array.from(new Set(subList.map(s => s.subject.trim()))).length : 0;

          // Fetch Class Teacher profile if exists
          let teacherId = cr.class_teacher_id;
          if (!teacherId) {
            const { data: assign } = await supabase
              .from('classroom_teacher_assignments')
              .select('teacher_id')
              .eq('classroom_id', cr.id)
              .eq('is_active', true)
              .maybeSingle();
            if (assign) teacherId = assign.teacher_id;
          }

          mappedClassrooms.push({
            id: cr.id,
            schoolId: cr.school_id,
            academicYearId: cr.academic_year_id,
            classId: cr.class_id,
            sectionId: cr.section || 'A',
            classTeacherId: teacherId || 'Unassigned',
            roomNumber: cr.room || 'Room 101',
            building: 'Main Building',
            floor: '1st Floor',
            capacity: cr.capacity || 40,
            status: cr.status || 'active',
            studentCount: stdCount || 0,
            subjectCount: subCount || 0,
            createdAt: cr.created_at || new Date().toISOString(),
            updatedAt: cr.updated_at || new Date().toISOString()
          });
        }
        classrooms = mappedClassrooms;
        saveState('campuslink_classrooms', classrooms);
      } else {
        classrooms = [];
        saveState('campuslink_classrooms', []);
      }

      // 5. Fetch enrolled students (only for classrooms in this school)
      if (classroomIds.length > 0) {
        const { data: dbClassroomStudents } = await supabase
          .from('classroom_students')
          .select(`
            classroom_id,
            roll_number,
            student:profiles!student_id(id, full_name, username, email)
          `)
          .in('classroom_id', classroomIds);
          
        if (dbClassroomStudents) {
          students = dbClassroomStudents.map((e, idx) => {
            const classroomRow = dbClassrooms?.find(cr => cr.id === e.classroom_id);
            return {
              id: e.student ? e.student.id : ('st-' + idx),
              classId: classroomRow ? classroomRow.class_id : '',
              sectionId: classroomRow ? (classroomRow.section || 'A') : 'A',
              fullName: e.student ? e.student.full_name : 'Student',
              rollNumber: e.roll_number || (idx + 1),
              admissionNumber: e.student ? e.student.username : '–',
              email: e.student ? e.student.email : '',
              status: 'active'
            };
          });
          saveState('campuslink_students', students);
        } else {
          students = [];
          saveState('campuslink_students', []);
        }
      } else {
        students = [];
        saveState('campuslink_students', []);
      }

      // Trigger re-render to update the tables with fresh database values
      loadAllDependencies();
      renderActiveSubpanel();
      populateFilters();

    } catch (err) {
      console.warn('Error running global database sync:', err);
    }
  }

  function loadAllDependencies() {
    const storedTeachers = localStorage.getItem('campuslink_teachers');
    if (storedTeachers && storedTeachers.includes('"t-ali"')) {
      localStorage.removeItem('campuslink_teachers');
      localStorage.removeItem('campuslink_classrooms');
      localStorage.removeItem('campuslink_classroom_subjects');
    }

    // Determine if we are in live database mode
    const isLiveMode = window.CampusLink?.supabase && (localStorage.getItem('supabase.auth.token') || sessionStorage.getItem('sb-'));

    academicYears = getStoredData('campuslink_academic_years', isLiveMode ? [] : DEFAULT_YEARS);
    classes = getStoredData('campuslink_classes', isLiveMode ? [] : DEFAULT_CLASSES);
    teachers = getStoredData('campuslink_teachers', isLiveMode ? [] : DEFAULT_TEACHERS);
    subjects = getStoredData('campuslink_subjects', isLiveMode ? [] : DEFAULT_SUBJECTS);
    classrooms = getStoredData('campuslink_classrooms', isLiveMode ? [] : DEFAULT_CLASSROOMS);
    classroomSubjects = getStoredData('campuslink_classroom_subjects', isLiveMode ? [] : DEFAULT_CLASSROOM_SUBJECTS);
    students = getStoredData('campuslink_students', []);
  }

  // --- Dynamic Option Populators ---
  function populateFilters() {
    const yearFilter = document.getElementById('classroom-filter-year');
    const classFilter = document.getElementById('classroom-filter-class');
    const sectionFilter = document.getElementById('classroom-filter-section');

    if (yearFilter) {
      let html = '<option value="">All Academic Years</option>';
      academicYears.forEach(y => {
        html += `<option value="${y.id}">${y.name} ${y.is_current ? '(Current)' : ''}</option>`;
      });
      yearFilter.innerHTML = html;
    }

    if (classFilter) {
      let html = '<option value="">All Classes</option>';
      classes.forEach(c => {
        html += `<option value="${c.id}">${c.name}</option>`;
      });
      classFilter.innerHTML = html;
    }

    if (sectionFilter) {
      const sections = Array.from(new Set(classrooms.map(cr => cr.sectionId).filter(Boolean)));
      let html = '<option value="">All Sections</option>';
      sections.forEach(s => {
        html += `<option value="${s}">${s}</option>`;
      });
      sectionFilter.innerHTML = html;
    }
  }

  // Populate Create/Edit Modal fields
  function populateModalDropdowns() {
    const modalYear = document.getElementById('classroom-academic-year');
    const modalClassSection = document.getElementById('classroom-class-section');
    const modalTeacher = document.getElementById('classroom-teacher');

    if (modalYear) {
      let html = '';
      academicYears.forEach(y => {
        const isCurrent = y.is_current ? 'selected' : '';
        html += `<option value="${y.id}" ${isCurrent}>${y.name}</option>`;
      });
      modalYear.innerHTML = html;
    }

    if (modalClassSection) {
      let html = '<option value="">Select Class &amp; Section...</option>';
      // Each academic class record has name (e.g. "Class 9") and section (e.g. "A")
      // Show combined label "Class 9 - A"; value encodes "classId|section"
      classes.forEach(c => {
        const section = (c.section || '').trim();
        if (section) {
          // class has a section defined — show combined option
          const label = `${c.name} - ${section}`;
          html += `<option value="${c.id}|${section}">${label}</option>`;
        } else {
          // class has no section — show it with a note so admin can still select
          html += `<option value="${c.id}|">${c.name} (no section)</option>`;
        }
      });
      modalClassSection.innerHTML = html;
    }

    if (modalTeacher) {
      let html = '<option value="">Unassigned</option>';
      teachers.forEach(t => {
        html += `<option value="${t.id}">${t.fullName} (${t.department || 'General'})</option>`;
      });
      modalTeacher.innerHTML = html;
    }
  }

  // Populate classroom-section dropdown based on selected classId
  function populateSectionsForClass(classId, selectedSection) {
    const sectionSelect = document.getElementById('classroom-section');
    if (!sectionSelect) return;

    if (!classId) {
      sectionSelect.innerHTML = '<option value="">Select Class first...</option>';
      return;
    }

    // Standard section options always shown
    const standardSections = ['A', 'B', 'C', 'D', 'E'];

    // Look up the academic class to get any section already defined there
    const academicClass = classes.find(c => c.id === classId);
    const academicSection = academicClass && academicClass.section ? academicClass.section.trim().toUpperCase() : '';

    // Build unique ordered set
    const sectionSet = new Set(standardSections);
    if (academicSection) sectionSet.add(academicSection);

    // Also include sections already used by existing classrooms for this class
    classrooms.forEach(cr => {
      if (cr.classId === classId && cr.sectionId) {
        sectionSet.add(cr.sectionId.toUpperCase());
      }
    });

    const ordered = Array.from(sectionSet).sort();
    let html = '<option value="">Select Section...</option>';
    ordered.forEach(s => {
      const sel = selectedSection && selectedSection.toUpperCase() === s ? 'selected' : '';
      html += `<option value="${s}" ${sel}>${s}</option>`;
    });
    sectionSelect.innerHTML = html;
  }

  // --- Helper Getters for Resolving IDs ---
  function getYearName(yearId) {
    const y = academicYears.find(item => item.id === yearId);
    return y ? y.name : 'Unknown';
  }

  function getClassName(classId) {
    const c = classes.find(item => item.id === classId);
    return c ? c.name : 'Unknown';
  }

  function getTeacherName(teacherId) {
    if (!teacherId) return 'Unassigned';
    const t = teachers.find(item => item.id === teacherId);
    return t ? t.fullName : 'Unassigned';
  }

  function getSubjectName(subId) {
    const s = subjects.find(item => item.id === subId);
    return s ? s.name : 'Unknown';
  }

  // --- Rendering Engines ---

  // Main router to trigger rendering based on active subtab
  function renderActiveSubpanel() {
    loadAllDependencies();
    if (activeSubTab === 'all-classrooms') renderAllClassroomsTable();
    else if (activeSubTab === 'class-teachers') renderClassTeachersTable();
    else if (activeSubTab === 'students') renderStudentsTable();
    else if (activeSubTab === 'subjects') renderSubjectsTable();
    else if (activeSubTab === 'overview') renderOverviewDashboard();
  }

  // Apply search & toolbar filters
  function getFilteredClassrooms() {
    const query = (document.getElementById('classroom-search')?.value || '').trim().toLowerCase();
    const yearId = document.getElementById('classroom-filter-year')?.value || '';
    const classId = document.getElementById('classroom-filter-class')?.value || '';
    const sectionId = document.getElementById('classroom-filter-section')?.value || '';
    const status = document.getElementById('classroom-filter-status')?.value || '';

    return classrooms.filter(cr => {
      const clsName = getClassName(cr.classId);
      const tName = getTeacherName(cr.classTeacherId);
      const label = `${clsName} - ${cr.sectionId} ${tName} ${cr.roomNumber}`.toLowerCase();

      const matchesQuery = !query || label.includes(query);
      const matchesYear = !yearId || cr.academicYearId === yearId;
      const matchesClass = !classId || cr.classId === classId;
      const matchesSection = !sectionId || cr.sectionId === sectionId;
      const matchesStatus = !status || cr.status === status;

      return matchesQuery && matchesYear && matchesClass && matchesSection && matchesStatus;
    });
  }

  // Tab 1: All Classrooms
  function renderAllClassroomsTable() {
    const tbody = document.getElementById('classroom-list-tbody');
    if (!tbody) return;

    const items = getFilteredClassrooms();
    tbody.innerHTML = '';

    if (items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-muted);">
            <div style="font-size: 2.5rem; margin-bottom: 12px;">🏫</div>
            <strong>No classrooms match the selected filters.</strong>
          </td>
        </tr>
      `;
      document.getElementById('classroom-pagination-text').textContent = 'Showing 0 items';
      return;
    }

    items.forEach(cr => {
      const className = getClassName(cr.classId);
      const yearName = getYearName(cr.academicYearId);
      const teacherName = getTeacherName(cr.classTeacherId);
      const statusBadge = cr.status === 'active' 
        ? `<span class="badge-status status-approved">Active</span>` 
        : `<span class="badge-status status-rejected">Inactive</span>`;

      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border-color)';
      tr.innerHTML = `
        <td style="padding: 12px;"><strong>${className} - ${cr.sectionId}</strong><br><small style="color:var(--text-muted);">${cr.roomNumber || 'No Room'} • ${cr.building || 'No Bldg'}</small></td>
        <td style="padding: 12px;">${yearName}</td>
        <td style="padding: 12px;">${className} (${cr.sectionId})</td>
        <td style="padding: 12px; color: var(--primary); font-weight:600;">${teacherName}</td>
        <td style="padding: 12px; text-align: center;">${cr.studentCount} Students</td>
        <td style="padding: 12px; text-align: center;">${cr.subjectCount} Subjects</td>
        <td style="padding: 12px;">${statusBadge}</td>
        <td style="padding: 12px; text-align: right;">
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button class="btn btn-secondary btn-view-cr" data-id="${cr.id}" style="padding: 6px 12px; font-size:0.78rem;">View</button>
            <button class="btn btn-secondary btn-edit-cr" data-id="${cr.id}" style="padding: 6px 12px; font-size:0.78rem;">Edit</button>
            <button class="btn btn-secondary btn-delete-cr" data-id="${cr.id}" style="padding: 6px 12px; font-size:0.78rem; color:#EF4444; border-color: rgba(239, 68, 68, 0.2);">Delete</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('classroom-pagination-text').textContent = `Showing 1-${items.length} of ${items.length} items`;
    bindActionButtons();
  }

  // Tab 2: Class Teachers
  function renderClassTeachersTable() {
    const tbody = document.getElementById('classroom-teachers-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const assignedTeachers = classrooms.filter(cr => cr.classTeacherId);

    if (assignedTeachers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No teachers are currently assigned as Class Teachers.
          </td>
        </tr>
      `;
      return;
    }

    assignedTeachers.forEach(cr => {
      const tName = getTeacherName(cr.classTeacherId);
      const className = getClassName(cr.classId);
      const yearName = getYearName(cr.academicYearId);
      const statusBadge = cr.status === 'active' 
        ? `<span class="badge-status status-approved">Active</span>` 
        : `<span class="badge-status status-rejected">Inactive</span>`;

      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border-color)';
      tr.innerHTML = `
        <td style="padding: 12px; font-weight:600; color: var(--text-main);">${tName}</td>
        <td style="padding: 12px; font-weight:600; color: var(--primary);">${className} - ${cr.sectionId}</td>
        <td style="padding: 12px;">${yearName}</td>
        <td style="padding: 12px; text-align: center;">${cr.studentCount} Students</td>
        <td style="padding: 12px;">${statusBadge}</td>
        <td style="padding: 12px; text-align: right;">
          <button class="btn btn-secondary btn-edit-cr" data-id="${cr.id}" style="padding: 6px 12px; font-size:0.78rem;">Reassign</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    bindActionButtons();
  }

  // Tab 3: Students
  function renderStudentsTable() {
    const tbody = document.getElementById('classroom-students-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    classrooms.forEach(cr => {
      const className = getClassName(cr.classId);
      const boys = Math.ceil(cr.studentCount * 0.52); // Realistic mock distribution
      const girls = cr.studentCount - boys;
      const seats = Math.max(0, cr.capacity - cr.studentCount);

      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border-color)';
      tr.innerHTML = `
        <td style="padding: 12px;"><strong>${className} - ${cr.sectionId}</strong><br><small style="color:var(--text-muted);">${cr.roomNumber || 'No Room'}</small></td>
        <td style="padding: 12px; text-align: center; font-weight:600;">${cr.studentCount} / ${cr.capacity}</td>
        <td style="padding: 12px; text-align: center; color: #3B82F6;">👦 ${boys}</td>
        <td style="padding: 12px; text-align: center; color: #EC4899;">👧 ${girls}</td>
        <td style="padding: 12px; text-align: center; font-weight:600; color: ${seats <= 5 ? '#EF4444' : '#10B981'};">${seats} seats left</td>
        <td style="padding: 12px; text-align: right;">
          <button class="btn btn-secondary btn-view-cr" data-id="${cr.id}" style="padding: 6px 12px; font-size:0.78rem;">View Students</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    bindActionButtons();
  }

  // Tab 4: Subjects
  function renderSubjectsTable() {
    const tbody = document.getElementById('classroom-subjects-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (classroomSubjects.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No subject assignments found.
          </td>
        </tr>
      `;
      return;
    }

    classroomSubjects.forEach(cs => {
      const cr = classrooms.find(item => item.id === cs.classroomId);
      if (!cr) return;

      const className = getClassName(cr.classId);
      const subName = getSubjectName(cs.subjectId);
      const tName = getTeacherName(cs.teacherId);
      const statusBadge = cs.status === 'active' 
        ? `<span class="badge-status status-approved">Active</span>` 
        : `<span class="badge-status status-rejected">Inactive</span>`;

      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border-color)';
      tr.innerHTML = `
        <td style="padding: 12px;"><strong>${className} - ${cr.sectionId}</strong></td>
        <td style="padding: 12px; font-weight:600; color:var(--text-main);">${subName}</td>
        <td style="padding: 12px; color: var(--primary); font-weight:600;">${tName}</td>
        <td style="padding: 12px; text-align: center;">${cs.weeklyPeriods} periods / wk</td>
        <td style="padding: 12px;">${statusBadge}</td>
        <td style="padding: 12px; text-align: right;">
          <button class="btn btn-secondary btn-edit-cr" data-id="${cr.id}" style="padding: 6px 12px; font-size:0.78rem;">Edit Subject</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    bindActionButtons();
  }

  // Tab 5: Overview Dashboard
  function renderOverviewDashboard() {
    const totalClassrooms = classrooms.length;
    const totalStudents = classrooms.reduce((sum, cr) => sum + cr.studentCount, 0);
    const totalTeachers = Array.from(new Set(classrooms.map(cr => cr.classTeacherId).filter(Boolean))).length;
    const totalSubjects = classroomSubjects.length;

    const currentYear = academicYears.find(y => y.is_current) || DEFAULT_YEARS[0];
    const avgStudents = totalClassrooms > 0 ? Math.round(totalStudents / totalClassrooms) : 0;
    const totalCapacity = classrooms.reduce((sum, cr) => sum + cr.capacity, 0);

    const crCountEl = document.getElementById('overview-classrooms-count');
    const stuCountEl = document.getElementById('overview-students-count');
    const teaCountEl = document.getElementById('overview-teachers-count');
    const subCountEl = document.getElementById('overview-subjects-count');
    const cycleEl = document.getElementById('overview-active-cycle');
    const avgEl = document.getElementById('overview-avg-students');
    const capEl = document.getElementById('overview-total-capacity');

    if (crCountEl) crCountEl.textContent = totalClassrooms;
    if (stuCountEl) stuCountEl.textContent = totalStudents;
    if (teaCountEl) teaCountEl.textContent = totalTeachers;
    if (subCountEl) subCountEl.textContent = totalSubjects;
    if (cycleEl) cycleEl.textContent = currentYear ? currentYear.name : '2026-2027';
    if (avgEl) avgEl.textContent = `${avgStudents} / classroom`;
    if (capEl) capEl.textContent = `${totalCapacity} Seats`;
  }

  // Bind edit, delete, view buttons in tables
  function bindActionButtons() {
    document.querySelectorAll('.btn-view-cr').forEach(btn => {
      btn.onclick = () => openViewModal(btn.getAttribute('data-id'));
    });

    document.querySelectorAll('.btn-edit-cr').forEach(btn => {
      btn.onclick = () => openCreateEditModal(btn.getAttribute('data-id'));
    });

    document.querySelectorAll('.btn-delete-cr').forEach(btn => {
      btn.onclick = () => openDeleteConfirmModal(btn.getAttribute('data-id'));
    });
  }

  // --- CRUD Modal Actions ---

  function openCreateEditModal(id = null) {
    loadAllDependencies();
    populateModalDropdowns();

    const modal = document.getElementById('classroom-modal');
    const title = document.getElementById('classroom-modal-title');
    const form = document.getElementById('classroom-form');

    form.reset();

    if (id) {
      const cr = classrooms.find(item => item.id === id);
      if (!cr) return;

      title.textContent = "Edit Classroom";
      document.getElementById('classroom-id').value = cr.id;
      document.getElementById('classroom-academic-year').value = cr.academicYearId;
      // Set the combined class-section dropdown value
      const combinedVal = `${cr.classId}|${cr.sectionId || ''}`;
      document.getElementById('classroom-class-section').value = combinedVal;
      document.getElementById('classroom-room').value = cr.roomNumber || '';
      document.getElementById('classroom-building').value = cr.building || '';
      document.getElementById('classroom-floor').value = cr.floor || '';
      document.getElementById('classroom-capacity').value = cr.capacity;
      document.getElementById('classroom-teacher').value = cr.classTeacherId || '';
      document.getElementById('classroom-status').value = cr.status;
    } else {
      title.textContent = "Create Classroom";
      document.getElementById('classroom-id').value = '';
    }

    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  }

  function closeClassroomModal() {
    const modal = document.getElementById('classroom-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
  }

  function openViewModal(id) {
    loadAllDependencies();
    const cr = classrooms.find(item => item.id === id);
    if (!cr) return;

    const className = getClassName(cr.classId);
    const yearName = getYearName(cr.academicYearId);
    const teacherName = getTeacherName(cr.classTeacherId);
    const boys = Math.ceil(cr.studentCount * 0.52);
    const girls = cr.studentCount - boys;

    const content = `
      <div style="display: flex; gap: 16px; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 16px; margin-bottom: 16px;">
        <div style="width: 52px; height: 52px; border-radius: var(--radius-sm); background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">🏫</div>
        <div>
          <h4 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--text-main);">${className} - ${cr.sectionId}</h4>
          <p style="margin: 2px 0 0 0; font-size: 0.82rem; color: var(--text-muted);">${yearName} Academic Cycle</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px 20px; font-size: 0.88rem; color: var(--text-main);">
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.75rem; margin-bottom: 2px;">Class Teacher</span>
          <strong>${teacherName}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.75rem; margin-bottom: 2px;">Status</span>
          <span class="badge-status ${cr.status === 'active' ? 'status-approved' : 'status-rejected'}" style="text-transform: capitalize; font-size: 0.75rem;">${cr.status}</span>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.75rem; margin-bottom: 2px;">Room Number</span>
          <strong>${cr.roomNumber || '-'}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.75rem; margin-bottom: 2px;">Location</span>
          <strong>${cr.building || '-'} (${cr.floor || '-'})</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.75rem; margin-bottom: 2px;">Total Capacity</span>
          <strong>${cr.capacity} Students</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.75rem; margin-bottom: 2px;">Students Enrolled</span>
          <strong>${cr.studentCount} (${boys} Boys / ${girls} Girls)</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.75rem; margin-bottom: 2px;">Subject Count</span>
          <strong>${cr.subjectCount} active subjects</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 0.75rem; margin-bottom: 2px;">Created Date</span>
          <strong>${new Date(cr.createdAt).toLocaleDateString()}</strong>
        </div>
      </div>
    `;

    document.getElementById('classroom-view-content').innerHTML = content;
    const modal = document.getElementById('classroom-view-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  }

  function closeViewModal() {
    const modal = document.getElementById('classroom-view-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
  }

  function openDeleteConfirmModal(id) {
    const cr = classrooms.find(item => item.id === id);
    if (!cr) return;

    classroomToDeleteId = id;
    const className = getClassName(cr.classId);

    document.getElementById('classroom-confirm-message').textContent = `Are you sure you want to permanently delete Classroom "${className} - ${cr.sectionId}"? This will clear all links for this classroom.`;
    const modal = document.getElementById('classroom-confirm-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  }

  function closeDeleteConfirmModal() {
    const modal = document.getElementById('classroom-confirm-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
    classroomToDeleteId = null;
  }

  // --- Form Submission CRUD Logic ---
  async function handleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('classroom-id').value;
    const academicYearId = document.getElementById('classroom-academic-year').value;

    // Combined class-section value is "classId|section"
    const classSectionRaw = document.getElementById('classroom-class-section').value;
    const sepIdx = classSectionRaw.indexOf('|');
    const classId = sepIdx >= 0 ? classSectionRaw.substring(0, sepIdx) : classSectionRaw;
    const sectionId = sepIdx >= 0 ? classSectionRaw.substring(sepIdx + 1).trim() : '';

    const roomNumber = document.getElementById('classroom-room').value.trim();
    const building = document.getElementById('classroom-building').value.trim();
    const floor = document.getElementById('classroom-floor').value.trim();
    const capacity = parseInt(document.getElementById('classroom-capacity').value) || 30;
    const classTeacherId = document.getElementById('classroom-teacher').value || null;
    const status = document.getElementById('classroom-status').value;

    // Validate inputs
    if (!classId) {
      alert("Please select a Class & Section.");
      return;
    }

    // Check Class Teacher constraint: Only 1 Class Teacher per classroom in this academic cycle
    if (classTeacherId) {
      const duplicateAssignment = classrooms.find(cr => 
        cr.id !== id && 
        cr.academicYearId === academicYearId && 
        cr.classTeacherId === classTeacherId
      );

      if (duplicateAssignment) {
        const otherClassName = getClassName(duplicateAssignment.classId);
        const confirmReassign = confirm(
          `Teacher "${getTeacherName(classTeacherId)}" is already assigned as Class Teacher for "${otherClassName} - ${duplicateAssignment.sectionId}".\n` +
          `Would you like to reassign them to this classroom? (They will be unassigned from the old classroom).`
        );
        if (confirmReassign) {
          // Unassign from old classroom
          duplicateAssignment.classTeacherId = null;
          // Sync old classroom unassignment to DB
          const supabase = window.CampusLink?.supabase;
          if (supabase) {
            await supabase.from('classrooms').update({ class_teacher_id: null }).eq('id', duplicateAssignment.id);
          }
        } else {
          return; // Stop form submission
        }
      }
    }

    const supabase = window.CampusLink?.supabase;
    let finalId = id;
    const className = getClassName(classId);

    try {
      if (id) {
        // Update Supabase
        if (supabase) {
          const { error } = await supabase
            .from('classrooms')
            .update({
              academic_year_id: academicYearId,
              class_id: classId,
              section: sectionId,
              section_id: sectionId,
              grade: className,
              room: roomNumber,
              room_number: roomNumber,
              building,
              floor,
              capacity,
              class_teacher_id: classTeacherId,
              status
            })
            .eq('id', id);
          if (error) throw error;
        }

        // Update local memory
        const idx = classrooms.findIndex(item => item.id === id);
        if (idx >= 0) {
          classrooms[idx] = {
            ...classrooms[idx],
            academicYearId,
            classId,
            sectionId,
            roomNumber,
            building,
            floor,
            capacity,
            classTeacherId,
            status,
            updatedAt: new Date().toISOString()
          };
          showToastMessage("Classroom updated successfully.");
        }
      } else {
        // Create Supabase
        if (supabase) {
          const activeProfileRaw = localStorage.getItem('campuslink_profile');
          const profile = activeProfileRaw ? JSON.parse(activeProfileRaw) : null;
          const dbSchoolId = (profile && profile.id) ? profile.id : 'sch-01';

          const { data: dbRes, error } = await supabase
            .from('classrooms')
            .insert({
              school_id: dbSchoolId,
              academic_year_id: academicYearId,
              class_id: classId,
              section: sectionId,
              section_id: sectionId,
              grade: className,
              room: roomNumber,
              room_number: roomNumber,
              building,
              floor,
              capacity,
              class_teacher_id: classTeacherId,
              status
            })
            .select();
          if (error) throw error;
          if (!dbRes || dbRes.length === 0) throw new Error("No data returned from database insert");
          finalId = dbRes[0].id;
        } else {
          finalId = 'cr-' + Date.now();
        }

        // Create local memory
        const newCr = {
          id: finalId,
          schoolId: 'sch-01',
          academicYearId,
          classId,
          sectionId,
          classTeacherId,
          roomNumber,
          building,
          floor,
          capacity,
          status,
          studentCount: 0,
          subjectCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        classrooms.push(newCr);

        // ── Auto-create the messenger conversation group for this classroom ──
        createConversationGroupForClassroom(newCr);

        showToastMessage("Classroom created successfully.");
      }

      saveState('campuslink_classrooms', classrooms);
      closeClassroomModal();
      renderActiveSubpanel();
      populateFilters();
    } catch (dbErr) {
      console.error("Database save failed for classroom:", dbErr);
      alert("Failed to save classroom to database: " + dbErr.message);
    }
  }

  async function handleDeleteConfirm() {
    if (!classroomToDeleteId) return;

    const supabase = window.CampusLink?.supabase;
    if (supabase) {
      try {
        const { error } = await supabase.from('classrooms').delete().eq('id', classroomToDeleteId);
        if (error) throw error;
      } catch (dbErr) {
        console.error("Database delete failed for classroom:", dbErr);
        alert("Failed to delete classroom from database: " + dbErr.message);
        return;
      }
    }

    classrooms = classrooms.filter(cr => cr.id !== classroomToDeleteId);
    classroomSubjects = classroomSubjects.filter(cs => cs.classroomId !== classroomToDeleteId);

    saveState('campuslink_classrooms', classrooms);
    saveState('campuslink_classroom_subjects', classroomSubjects);

    // ── Soft-archive the classroom's conversation group ──────────────────────
    // Per architecture: messages are NEVER permanently deleted. Only archived.
    const convRaw = localStorage.getItem('campuslink_conversations');
    if (convRaw) {
      const convs = JSON.parse(convRaw);
      const convId = 'conv-class-' + classroomToDeleteId;
      const idx = convs.findIndex(c => c.id === convId);
      if (idx >= 0) {
        convs[idx].is_archived = true;
        convs[idx].archived_at = new Date().toISOString();
        localStorage.setItem('campuslink_conversations', JSON.stringify(convs));
      }
    }

    closeDeleteConfirmModal();
    renderActiveSubpanel();
    populateFilters();
    showToastMessage("Classroom deleted successfully.", "info");
  }

  // Helper to show toasts using the window method or fallback
  function showToastMessage(msg, type = "success") {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
    } else {
      alert(`${type.toUpperCase()}: ${msg}`);
    }
  }

  // --- Initialize Module Event Handlers ---
  function initClassroomsTab() {
    loadAllDependencies();
    populateFilters();
    renderActiveSubpanel();

    // Toolbar search and filters input listeners
    const searchInput = document.getElementById('classroom-search');
    const yearFilter = document.getElementById('classroom-filter-year');
    const classFilter = document.getElementById('classroom-filter-class');
    const sectionFilter = document.getElementById('classroom-filter-section');
    const statusFilter = document.getElementById('classroom-filter-status');

    if (searchInput) searchInput.oninput = () => renderActiveSubpanel();
    if (yearFilter) yearFilter.onchange = () => renderActiveSubpanel();
    if (classFilter) classFilter.onchange = () => renderActiveSubpanel();
    if (sectionFilter) sectionFilter.onchange = () => renderActiveSubpanel();
    if (statusFilter) statusFilter.onchange = () => renderActiveSubpanel();

    // Create classroom click
    const createBtn = document.getElementById('btn-create-classroom');
    if (createBtn) createBtn.onclick = () => openCreateEditModal();
  }

  // --- Hook Event Listeners on DOM Load ---
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Classroom Subtabs switching
    document.querySelectorAll('.classroom-subtab-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        document.querySelectorAll('.classroom-subtab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        activeSubTab = btn.getAttribute('data-subtab');
        
        // Switch subpanels
        document.querySelectorAll('.classroom-subpanel').forEach(panel => {
          panel.style.display = 'none';
          panel.classList.remove('active');
        });

        const targetPanel = document.getElementById(`classroom-subpanel-${activeSubTab}`);
        if (targetPanel) {
          targetPanel.style.display = 'block';
          targetPanel.classList.add('active');
        }

        renderActiveSubpanel();
      };
    });

    // 2. Modal Close handlers
    document.querySelectorAll('.classroom-modal-close').forEach(btn => {
      btn.onclick = () => {
        const modalId = btn.getAttribute('data-modal');
        const modal = document.getElementById(modalId);
        if (modal) {
          modal.style.display = 'none';
          modal.classList.remove('active');
        }
      };
    });

    // 3. Delete Confirmation cancel/action buttons
    const cancelDeleteBtn = document.getElementById('classroom-confirm-btn-cancel');
    const confirmDeleteBtn = document.getElementById('classroom-confirm-btn-action');

    if (cancelDeleteBtn) cancelDeleteBtn.onclick = () => closeDeleteConfirmModal();
    if (confirmDeleteBtn) confirmDeleteBtn.onclick = () => handleDeleteConfirm();

    // 4. Form Submit handler
    const form = document.getElementById('classroom-form');
    if (form) form.onsubmit = handleFormSubmit;
  });


  // ============================================================
  // CLASSROOM WORKSPACE SYSTEM (Phase 4B)
  // ============================================================
  let currentWorkspaceId = null;
  let currentWorkspaceRole = 'admin';
  let currentWorkspaceView = 'overview';

  function formatDate(d) {
    if (!d) return '–';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function statusBadge(status) {
    const map = {
      pending: { bg: '#FFFBEB', color: '#92400E' },
      submitted: { bg: '#ECFDF5', color: '#065F46' },
      approved: { bg: '#ECFDF5', color: '#065F46' },
      rejected: { bg: '#FEF2F2', color: '#991B1B' }
    };
    const s = map[status] || { bg: '#F1F5F9', color: '#475569' };
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    return `<span style="display:inline-block;padding:3px 10px;border-radius:100px;font-size:0.7rem;font-weight:700;background:${s.bg};color:${s.color};">${label}</span>`;
  }

  // In-memory data for the workspace (loaded dynamically per classroom)
  let workspaceAnnouncements = [];
  let workspaceHomework = [];
  let workspaceResources = [];
  let workspaceFiles = [];
  let workspaceGallery = [];

  function loadWorkspaceData(classroomId) {
    const isMock = ['cr-9a', 'cr-9b', 'cr-10a'].includes(classroomId);
    
    const defaultAnn = isMock ? [
      { id: 'ann-1', title: 'Welcome to Class 9-A!', content: 'Welcome back students! Please review the syllabus in the resources tab and complete your details profile.', author: 'Ali Ahmad', date: '2026-07-01' },
      { id: 'ann-2', title: 'Weekly Physics Quiz rescheduled', content: 'The weekly Physics quiz has been rescheduled from Monday to Wednesday. Prepare well!', author: 'Priya Sharma', date: '2026-07-04' }
    ] : [];

    const defaultHw = isMock ? [
      { id: 'hw-1', subject: 'Physics', title: 'Optics Chapter 3 Exercises', dueDate: '2026-07-08', status: 'pending', description: 'Solve questions 1 to 10 at the end of Chapter 3. Submit handwritten sheet scan.' },
      { id: 'hw-2', subject: 'Mathematics', title: 'Quadratic Equations Assignment', dueDate: '2026-07-06', status: 'submitted', description: 'Solve the attached worksheet containing 15 problems.' }
    ] : [];

    const defaultRes = isMock ? [
      { id: 'res-1', title: 'Mathematics Syllabus 2026-27', type: 'PDF', size: '2.4 MB', author: 'Ali Ahmad' },
      { id: 'res-2', title: 'Physics Optics Lecture Notes Slide', type: 'PPTX', size: '15.8 MB', author: 'Priya Sharma' },
      { id: 'res-3', title: 'Chemistry Periodic Table HD Chart', type: 'PNG Image', size: '4.2 MB', author: 'Nadia Hussain' }
    ] : [];

    const defaultFiles = isMock ? [
      { id: 'f-1', name: 'assignment_sheet_optics.docx', size: '320 KB', date: '2026-07-04', uploadedBy: 'Priya Sharma' },
      { id: 'f-2', name: 'class_rules_conduct.pdf', size: '1.2 MB', date: '2026-07-01', uploadedBy: 'Ali Ahmad' }
    ] : [];

    const defaultGallery = isMock ? [
      { id: 'g-1', title: 'Science Lab Experiment', img: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=400&q=80', date: '2026-07-02' },
      { id: 'g-2', title: 'Class Representative Elections', img: 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=400&q=80', date: '2026-07-03' },
      { id: 'g-3', title: 'Interactive Group Study Session', img: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80', date: '2026-07-01' }
    ] : [];

    workspaceAnnouncements = getStoredData(`campuslink_workspace_announcements_${classroomId}`, defaultAnn);
    workspaceHomework = getStoredData(`campuslink_workspace_homework_${classroomId}`, defaultHw);
    workspaceResources = getStoredData(`campuslink_workspace_resources_${classroomId}`, defaultRes);
    workspaceFiles = getStoredData(`campuslink_workspace_files_${classroomId}`, defaultFiles);
    workspaceGallery = getStoredData(`campuslink_workspace_gallery_${classroomId}`, defaultGallery);
  }

  function saveWorkspaceData(classroomId) {
    saveState(`campuslink_workspace_announcements_${classroomId}`, workspaceAnnouncements);
    saveState(`campuslink_workspace_homework_${classroomId}`, workspaceHomework);
    saveState(`campuslink_workspace_resources_${classroomId}`, workspaceResources);
    saveState(`campuslink_workspace_files_${classroomId}`, workspaceFiles);
    saveState(`campuslink_workspace_gallery_${classroomId}`, workspaceGallery);
  }

  let workspaceDiscussions = [];
  let activeChannelId = null;
  let chatSearchQuery = '';
  let chatRightPanelOpen = false;
  let activeReplyMessage = null;

  // ── Supabase Database Sync for Workspace ──
  async function syncWorkspaceFromSupabase(classroomId) {
    const supabase = window.CampusLink?.supabase;
    if (!supabase) return;

    try {
      // 1. Fetch classroom row
      const { data: dbCr } = await supabase
        .from('classrooms')
        .select('*')
        .eq('id', classroomId)
        .maybeSingle();

      if (!dbCr) return;

      // 2. Fetch class name details
      const { data: dbClass } = await supabase
        .from('classes')
        .select('*')
        .eq('id', dbCr.class_id)
        .maybeSingle();

      if (dbClass) {
        const clsIdx = classes.findIndex(c => c.id === dbClass.id);
        const clsObj = { id: dbClass.id, name: dbClass.name, section: dbClass.section };
        if (clsIdx >= 0) classes[clsIdx] = clsObj;
        else classes.push(clsObj);
        saveState('campuslink_classes', classes);
      }

      // 3. Fetch academic year details
      const { data: dbYear } = await supabase
        .from('academic_years')
        .select('*')
        .eq('id', dbCr.academic_year_id)
        .maybeSingle();

      if (dbYear) {
        const yrIdx = academicYears.findIndex(y => y.id === dbYear.id);
        const yrObj = { id: dbYear.id, name: dbYear.name, status: dbYear.status, is_current: dbYear.is_current };
        if (yrIdx >= 0) academicYears[yrIdx] = yrObj;
        else academicYears.push(yrObj);
        saveState('campuslink_academic_years', academicYears);
      }

      // 4. Fetch students enrolled in this classroom
      const { data: dbStudents } = await supabase
        .from('classroom_students')
        .select(`
          roll_number,
          student:profiles!student_id(id, full_name, username, email)
        `)
        .eq('classroom_id', classroomId);

      if (dbStudents) {
        const newStudents = dbStudents.map((e, idx) => ({
          id: e.student ? e.student.id : ('st-' + idx),
          classId: dbCr.class_id,
          sectionId: dbCr.section || 'A',
          fullName: e.student ? e.student.full_name : 'Student',
          rollNumber: e.roll_number || (idx + 1),
          admissionNumber: e.student ? e.student.username : '–',
          email: e.student ? e.student.email : '',
          status: 'active'
        }));
        
        const otherStudents = students.filter(s => s.classId !== dbCr.class_id || (s.sectionId !== dbCr.section && s.section !== dbCr.section));
        students = [...otherStudents, ...newStudents];
        saveState('campuslink_students', students);
      }

      // 5. Fetch subjects & subject teachers assigned to this classroom
      const { data: dbSubjectTeachers } = await supabase
        .from('classroom_subject_teachers')
        .select(`
          subject,
          teacher:profiles!teacher_id(id, full_name, username)
        `)
        .eq('classroom_id', classroomId);

      if (dbSubjectTeachers) {
        const newSubTeachers = dbSubjectTeachers.map((st, idx) => {
          const subId = 'sub-' + st.subject.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          if (!subjects.some(s => s.id === subId)) {
            subjects.push({ id: subId, name: st.subject, code: st.subject.substring(0, 3).toUpperCase(), category: 'core', status: 'active' });
          }
          if (st.teacher) {
            const tIdx = teachers.findIndex(t => t.id === st.teacher.id);
            const existingName = tIdx >= 0 ? teachers[tIdx].fullName : null;
            const tObj = {
              id: st.teacher.id,
              fullName: existingName || st.teacher.full_name || st.teacher.username || 'Teacher',
              username: st.teacher.username,
              status: 'active',
              department: st.subject
            };
            if (tIdx >= 0) teachers[tIdx] = tObj;
            else teachers.push(tObj);
          }
          return {
            id: 'crs-' + idx,
            classroomId: classroomId,
            subjectId: subId,
            teacherId: st.teacher ? st.teacher.id : 'Unassigned',
            weeklyPeriods: 5,
            status: 'active'
          };
        });

        const otherSubjects = classroomSubjects.filter(cs => cs.classroomId !== classroomId);
        classroomSubjects = [...otherSubjects, ...newSubTeachers];
        saveState('campuslink_classroom_subjects', classroomSubjects);
        saveState('campuslink_teachers', teachers);
        saveState('campuslink_subjects', subjects);
      }

      // 6. Fetch Class Teacher details
      let teacherId = dbCr.class_teacher_id;
      if (!teacherId) {
        const { data: assign } = await supabase
          .from('classroom_teacher_assignments')
          .select('teacher_id')
          .eq('classroom_id', classroomId)
          .eq('is_active', true)
          .maybeSingle();
        if (assign) teacherId = assign.teacher_id;
      }

      if (teacherId) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .eq('id', teacherId)
          .maybeSingle();

        if (prof) {
          const tIdx = teachers.findIndex(t => t.id === prof.id);
          const existingName = tIdx >= 0 ? teachers[tIdx].fullName : null;
          const tObj = {
            id: prof.id,
            fullName: existingName || prof.full_name || prof.username || 'Teacher',
            username: prof.username,
            status: 'active',
            department: 'Class Teacher'
          };
          if (tIdx >= 0) teachers[tIdx] = tObj;
          else teachers.push(tObj);
          saveState('campuslink_teachers', teachers);
        }
      }

      // 7. Update classrooms local list
      const crIdx = classrooms.findIndex(c => c.id === classroomId);
      const crObj = {
        id: dbCr.id,
        schoolId: dbCr.school_id,
        academicYearId: dbCr.academic_year_id,
        classId: dbCr.class_id,
        sectionId: dbCr.section || 'A',
        classTeacherId: teacherId || 'Unassigned',
        roomNumber: dbCr.room || 'Room 101',
        building: 'Main Building',
        floor: '1st Floor',
        capacity: dbCr.capacity || 40,
        status: dbCr.status || 'active',
        studentCount: dbStudents ? dbStudents.length : 0,
        subjectCount: dbSubjectTeachers ? Array.from(new Set(dbSubjectTeachers.map(s => s.subject.trim()))).length : 0
      };

      if (crIdx >= 0) classrooms[crIdx] = crObj;
      else classrooms.push(crObj);
      saveState('campuslink_classrooms', classrooms);

    } catch (err) {
      console.warn('Error syncing workspace from Supabase database:', err);
    }
  }

  // Helper: Open Classroom Workspace
  async function openClassroomWorkspace(classroomId) {
    loadAllDependencies();
    
    // Sync live database data
    await syncWorkspaceFromSupabase(classroomId);
    
    const cr = classrooms.find(item => item.id === classroomId);
    if (!cr) return;

    currentWorkspaceId = classroomId;
    currentWorkspaceRole = 'admin'; // default role
    currentWorkspaceView = 'overview';

    // Load workspace data from local storage
    loadWorkspaceData(classroomId);

    // Initialize conversation engine and set active channel
    initConversationsData(classroomId);
    activeChannelId = 'conv-class-' + classroomId;

    // Update active tab visual
    document.querySelectorAll('.dashboard-tab-panel').forEach(p => p.classList.remove('active'));
    const wsTab = document.getElementById('classroom-workspace-tab');
    if (wsTab) wsTab.classList.add('active');

    // Update Topbar Title
    const titleEl = document.getElementById('top-bar-title');
    if (titleEl) titleEl.textContent = 'Classroom Workspace';

    // Sync selector UI
    const switcher = document.getElementById('workspace-role-switcher');
    if (switcher) switcher.value = currentWorkspaceRole;

    renderWorkspaceHeader(cr);
    renderWorkspaceSidebar();
    renderWorkspaceContent();
  }

  function initConversationsData(classroomId) {
    const raw = localStorage.getItem('campuslink_conversations');
    let convs = raw ? JSON.parse(raw) : [];

    const cr = classrooms.find(item => item.id === classroomId) || classrooms[0];
    if (!cr) return [];

    const className = getClassName(cr.classId) || 'Class 9';
    const sectionName = cr.sectionId || 'A';
    const classroomName = `${className}-${sectionName}`;

    // 1. Ensure School Community exists
    let schoolConv = convs.find(c => c.type === 'SCHOOL' && c.school_id === cr.schoolId);
    if (!schoolConv) {
      schoolConv = {
        id: 'conv-school-' + cr.schoolId,
        school_id: cr.schoolId,
        classroom_id: null,
        academic_year_id: cr.academicYearId || 'ay-2026',
        name: 'School Community Feed',
        description: 'Official announcements and community news for all verified teachers and students.',
        type: 'SCHOOL',
        is_archived: false,
        avatar: '🏫',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        settings: {
          send_messages_threshold: 'Admin',
          edit_info_threshold: 'Owner',
          change_photo_threshold: 'Owner',
          pin_messages_threshold: 'Admin',
          delete_messages_threshold: 'Admin'
        },
        pins: [],
        messages: [
          {
            id: 'm-sch-1',
            sender_id: null,
            sender_name: 'System',
            sender_role: 'SYSTEM',
            content: 'School Community Feed created.',
            type: 'SYSTEM',
            created_at: new Date(Date.now() - 86400000 * 3).toISOString()
          },
          {
            id: 'm-sch-2',
            sender_id: 'school_representative',
            sender_name: 'School Principal',
            sender_role: 'Owner',
            content: 'Welcome to the School Community Feed! All official announcements will be posted here.',
            type: 'TEXT',
            created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
            reactions: [{ user_id: 'tch_001', emoji: '👍' }]
          },
          {
            id: 'm-sch-3',
            sender_id: null,
            sender_name: 'System',
            sender_role: 'SYSTEM',
            content: 'Academic Cycle 2026-2027 officially opened.',
            type: 'EVENT',
            metadata: { title: 'Academic Year Launch', date: '2026-07-01', venue: 'Main Auditorium' },
            created_at: new Date(Date.now() - 86400000 * 1).toISOString()
          }
        ]
      };
      convs.push(schoolConv);
    }

    // 2. Ensure Classroom Channel exists
    let classConv = convs.find(c => c.type === 'CLASSROOM' && c.classroom_id === classroomId);
    if (!classConv) {
      classConv = {
        id: 'conv-class-' + classroomId,
        school_id: cr.schoolId,
        classroom_id: classroomId,
        academic_year_id: cr.academicYearId || 'ay-2026',
        name: `${classroomName} Channel`,
        description: `Official channel for ${classroomName} classroom.`,
        type: 'CLASSROOM',
        is_archived: false,
        avatar: '🎒',
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
        settings: {
          send_messages_threshold: 'Member',
          edit_info_threshold: 'Admin',
          change_photo_threshold: 'Admin',
          pin_messages_threshold: 'Moderator',
          delete_messages_threshold: 'Admin'
        },
        pins: ['m-cls-pinned'],
        messages: [
          {
            id: 'm-cls-1',
            sender_id: null,
            sender_name: 'System',
            sender_role: 'SYSTEM',
            content: `Classroom Channel for ${classroomName} created.`,
            type: 'SYSTEM',
            created_at: new Date(Date.now() - 3600000 * 12).toISOString()
          },
          {
            id: 'm-cls-pinned',
            sender_id: 'tch_001',
            sender_name: 'Ali Ahmad',
            sender_role: 'Admin',
            content: 'Important Reminder: Please maintain discipline and check the timeline daily for homework and attendance alerts.',
            type: 'TEXT',
            created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
            reactions: [{ user_id: 'student_1', emoji: '❤️' }]
          },
          {
            id: 'm-cls-3',
            sender_id: null,
            sender_name: 'System',
            sender_role: 'SYSTEM',
            content: 'Priya Sharma assigned Homework: Complete Chapter 4 Optics Exercises.',
            type: 'HOMEWORK',
            metadata: { homework_id: 'hw-1', title: 'Chapter 4 Optics Exercises', subject: 'Physics', dueDate: '2026-07-10', description: 'Complete all numerical questions on refraction and lenses.' },
            created_at: new Date(Date.now() - 3600000 * 8).toISOString()
          },
          {
            id: 'm-cls-4',
            sender_id: 'student_1',
            sender_name: 'Ahmed Khan',
            sender_role: 'Member',
            content: 'Are we supposed to submit this in physical notebooks or upload scans as files here?',
            type: 'TEXT',
            created_at: new Date(Date.now() - 3600000 * 6).toISOString()
          },
          {
            id: 'm-cls-5',
            sender_id: 'tch_001',
            sender_name: 'Ali Ahmad',
            sender_role: 'Admin',
            content: 'Ahmed, you can upload pdf scans directly to the Files tab of the classroom or drop them in this chat.',
            type: 'TEXT',
            parent_message_id: 'm-cls-4',
            created_at: new Date(Date.now() - 3600000 * 5).toISOString()
          },
          {
            id: 'm-cls-6',
            sender_id: null,
            sender_name: 'System',
            sender_role: 'SYSTEM',
            content: 'Daily Attendance Report submitted. Total: 95.2% Present.',
            type: 'ATTENDANCE',
            metadata: { date: '2026-07-06', present: 40, absent: 2, percent: 95.2 },
            created_at: new Date(Date.now() - 3600000 * 2).toISOString()
          }
        ]
      };
      convs.push(classConv);
    }

    localStorage.setItem('campuslink_conversations', JSON.stringify(convs));
    return convs;
  }

  // Populate Workspace Header Details
  function renderWorkspaceHeader(cr) {
    const className = getClassName(cr.classId);
    const yearName = getYearName(cr.academicYearId);
    const teacherName = getTeacherName(cr.classTeacherId);

    const nameEl = document.getElementById('workspace-header-class-name');
    const statusEl = document.getElementById('workspace-header-status');
    const yearEl = document.getElementById('workspace-header-year');
    const teacherEl = document.getElementById('workspace-header-teacher');

    if (nameEl) nameEl.textContent = `${className} - Section ${cr.sectionId}`;
    if (statusEl) {
      statusEl.textContent = cr.status || 'Active';
      statusEl.className = '';
      statusEl.style.cssText = cr.status === 'active' || !cr.status
        ? 'background: #ECFDF5; color: #065F46; padding: 3px 10px; border-radius: 100px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase;'
        : 'background: #FEF2F2; color: #991B1B; padding: 3px 10px; border-radius: 100px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase;';
    }
    if (yearEl) yearEl.textContent = `Academic Year: ${yearName}`;
    if (teacherEl) teacherEl.textContent = teacherName;

    // Metrics
    const stdEl = document.getElementById('workspace-stat-students');
    const prtEl = document.getElementById('workspace-stat-parents');
    const sbjEl = document.getElementById('workspace-stat-subjects');

    if (stdEl) stdEl.textContent = `${cr.studentCount || 42} Active`;
    if (prtEl) prtEl.textContent = `${Math.ceil((cr.studentCount || 42) * 0.9)} Linked`;
    if (sbjEl) sbjEl.textContent = `${cr.subjectCount || 8} Active`;
  }

  // Define dynamic role sidebar configurations
  const roleMenus = {
    admin: [
      { id: 'overview', label: 'Dashboard Overview', icon: '📊' },
      { id: 'students', label: 'Students List', icon: '👥' },
      { id: 'teachers', label: 'Teachers List', icon: '💼' },
      { id: 'parents', label: 'Linked Parents', icon: '👪' },
      { id: 'attendance', label: 'Class Attendance', icon: '📅' },
      { id: 'homework', label: 'Homework & Tasks', icon: '📝' },
      { id: 'announcements', label: 'Announcements', icon: '📢' },
      { id: 'events', label: 'Class Events', icon: '🎉' },
      { id: 'files', label: 'Files / Downloads', icon: '📂' },
      { id: 'gallery', label: 'Class Gallery', icon: '🖼️' },
      { id: 'reports', label: 'Analytics Reports', icon: '📈' },
      { id: 'settings', label: 'Workspace Settings', icon: '⚙️' }
    ],
    class_teacher: [
      { id: 'overview', label: 'Dashboard Overview', icon: '📊' },
      { id: 'students', label: 'Students List', icon: '👥' },
      { id: 'attendance', label: 'Class Attendance', icon: '📅' },
      { id: 'homework', label: 'Homework & Tasks', icon: '📝' },
      { id: 'announcements', label: 'Announcements', icon: '📢' },
      { id: 'resources', label: 'Class Resources', icon: '📚' },
      { id: 'assignments', label: 'Assignments', icon: '📥' },
      { id: 'files', label: 'Files / Downloads', icon: '📂' },
      { id: 'discussion', label: 'Discussion Forum', icon: '💬' },
      { id: 'timetable', label: 'Class Timetable', icon: '⏰' },
      { id: 'student_management', label: 'Onboarding Queue', icon: '👤' },
      { id: 'parent_requests', label: 'Parent Requests', icon: '🔔' },
      { id: 'behaviour', label: 'Behaviour Log', icon: '📓' },
      { id: 'leaves', label: 'Leave Requests', icon: '✉️' },
      { id: 'class_reports', label: 'Class Performance', icon: '📈' }
    ],
    teacher: [
      { id: 'overview', label: 'Dashboard Overview', icon: '📊' },
      { id: 'students', label: 'Students List', icon: '👥' },
      { id: 'attendance', label: 'Class Attendance', icon: '📅' },
      { id: 'homework', label: 'Homework & Tasks', icon: '📝' },
      { id: 'announcements', label: 'Announcements', icon: '📢' },
      { id: 'resources', label: 'Class Resources', icon: '📚' },
      { id: 'assignments', label: 'Assignments', icon: '📥' },
      { id: 'files', label: 'Files / Downloads', icon: '📂' },
      { id: 'discussion', label: 'Discussion Forum', icon: '💬' },
      { id: 'timetable', label: 'Class Timetable', icon: '⏰' }
    ],
    student: [
      { id: 'homework', label: "Today's Homework", icon: '📝' },
      { id: 'announcements', label: 'Announcements', icon: '📢' },
      { id: 'resources', label: 'Class Resources', icon: '📚' },
      { id: 'attendance_summary', label: 'My Attendance', icon: '📅' },
      { id: 'assignments', label: 'Assignments', icon: '📥' },
      { id: 'files', label: 'Files / Downloads', icon: '📂' },
      { id: 'discussion', label: 'Discussion Forum', icon: '💬' },
      { id: 'events', label: 'Upcoming Events', icon: '🎉' },
      { id: 'timetable', label: 'Class Timetable', icon: '⏰' },
      { id: 'members', label: 'Class Members', icon: '👥' }
    ],
    parent: [
      { id: 'overview', label: "Child's Overview", icon: '📊' },
      { id: 'homework', label: 'Child Homework', icon: '📝' },
      { id: 'attendance_summary', label: 'Child Attendance', icon: '📅' },
      { id: 'announcements', label: 'Announcements', icon: '📢' },
      { id: 'discussion', label: 'Teacher Messages', icon: '💬' },
      { id: 'events', label: 'Upcoming Events', icon: '🎉' },
      { id: 'timetable', label: 'Class Timetable', icon: '⏰' },
      { id: 'fee_status', label: 'Fee Status (Future)', icon: '💳', locked: true },
      { id: 'report_cards', label: 'Report Cards (Future)', icon: '📜', locked: true }
    ]
  };

  // Render Left Workspace Sidebar links based on Active Role
  function renderWorkspaceSidebar() {
    const container = document.getElementById('workspace-sidebar-menu');
    if (!container) return;

    const list = roleMenus[currentWorkspaceRole] || [];
    container.innerHTML = list.map(item => {
      const activeClass = item.id === currentWorkspaceView ? 'active' : '';
      const activeStyle = item.id === currentWorkspaceView
        ? 'background: var(--primary-light); color: var(--primary); font-weight: 700;'
        : 'color: var(--text-main); font-weight: 500;';

      const lockBadge = item.locked ? `<span style="font-size:0.68rem;background:#F1F5F9;color:#64748B;padding:2px 6px;border-radius:4px;margin-left:auto;">Locked</span>` : '';
      
      return `
        <a class="workspace-menu-item ${activeClass}" data-view="${item.id}" style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 8px; font-size: 0.84rem; text-decoration: none; cursor: pointer; transition: all 0.2s; ${activeStyle}"
           onmouseover="this.style.background='var(--bg-light)'" onmouseout="if(!this.classList.contains('active')) this.style.background='none'">
          <span style="font-size: 1.1rem;">${item.icon}</span>
          <span>${item.label}</span>
          ${lockBadge}
        </a>
      `;
    }).join('');

    // Update Workspace Sidebar Header Label
    const labelEl = document.getElementById('workspace-sidebar-role-label');
    if (labelEl) {
      const nameMap = {
        admin: 'Admin Menu',
        class_teacher: 'Class Teacher Menu',
        teacher: 'Teacher Menu',
        student: 'Student Menu',
        parent: 'Parent Menu'
      };
      labelEl.textContent = nameMap[currentWorkspaceRole] || 'WORKSPACE MENU';
    }

    // Attach click listeners to sidebar links
    container.querySelectorAll('.workspace-menu-item').forEach(item => {
      item.onclick = (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-view');
        const config = list.find(l => l.id === targetView);
        if (config && config.locked) {
          showToastMessage(`This feature is scheduled for future release.`, 'info');
          return;
        }
        currentWorkspaceView = targetView;
        renderWorkspaceSidebar();
        renderWorkspaceContent();
      };
    });
  }

  // Render Main Workspace Content Panel
  function renderWorkspaceContent() {
    const container = document.getElementById('workspace-main-content');
    if (!container) return;

    // Highlight horizontal tabs if we are on one of the common tabs
    document.querySelectorAll('.workspace-tab-btn').forEach(btn => {
      const active = btn.getAttribute('data-workspace-tab') === currentWorkspaceView;
      btn.style.background = active ? 'var(--primary)' : 'none';
      btn.style.color = active ? '#fff' : 'var(--text-muted)';
      btn.style.fontWeight = active ? '700' : '600';
    });

    const isPermitted = checkPermission(currentWorkspaceRole, currentWorkspaceView);
    if (!isPermitted) {
      container.innerHTML = `
        <div style="text-align: center; padding: 64px 24px; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 12px;">🔒</div>
          <h3 style="margin:0; font-size:1.15rem; color:var(--dark-bg); font-weight:800;">Access Restricted</h3>
          <p style="font-size:0.84rem; margin:6px 0 0 0; max-width:380px; margin: 8px auto 0;">Your active role (${currentWorkspaceRole.replace('_', ' ')}) does not have permission to view this view.</p>
        </div>
      `;
      return;
    }

    // Render modular content panel
    switch (currentWorkspaceView) {
      case 'overview':
        renderOverviewDashboard(container);
        break;
      case 'announcements':
        renderAnnouncementsView(container);
        break;
      case 'members':
        renderMembersView(container);
        break;
      case 'resources':
        renderResourcesView(container);
        break;
      case 'files':
        renderFilesView(container);
        break;
      case 'gallery':
        renderGalleryView(container);
        break;
      case 'discussion':
        renderDiscussionView(container);
        break;
      case 'homework':
        renderHomeworkView(container);
        break;
      case 'attendance':
      case 'attendance_summary':
        renderAttendanceView(container);
        break;
      case 'timetable':
        renderTimetableView(container);
        break;
      case 'settings':
        renderSettingsView(container);
        break;
      case 'student_management':
        renderStudentManagementQueue(container);
        break;
      case 'parent_requests':
        renderParentRequestsQueue(container);
        break;
      case 'behaviour':
        renderBehaviourLogs(container);
        break;
      case 'leaves':
        renderLeaveRequests(container);
        break;
      case 'class_reports':
      case 'reports':
        renderAnalyticsReports(container);
        break;
      case 'teachers':
        renderTeachersListView(container);
        break;
      case 'parents':
        renderParentsListView(container);
        break;
      default:
        container.innerHTML = `<h3 style="margin:0;font-weight:800;">${currentWorkspaceView.toUpperCase()} View</h3><p style="font-size:0.85rem;color:var(--text-muted);margin-top:6px;">This page content is coming soon.</p>`;
    }
  }

  // Permission Matrix Checker
  function checkPermission(role, view) {
    if (role === 'admin') return true; // admin sees everything

    const permissionRules = {
      class_teacher: ['overview', 'announcements', 'members', 'resources', 'files', 'gallery', 'discussion', 'homework', 'attendance', 'timetable', 'student_management', 'parent_requests', 'behaviour', 'leaves', 'class_reports'],
      teacher: ['overview', 'announcements', 'members', 'resources', 'files', 'gallery', 'discussion', 'homework', 'attendance', 'timetable'],
      student: ['homework', 'announcements', 'resources', 'attendance_summary', 'assignments', 'files', 'discussion', 'events', 'timetable', 'members'],
      parent: ['overview', 'homework', 'attendance_summary', 'announcements', 'discussion', 'events', 'timetable', 'fee_status', 'report_cards']
    };

    const allowed = permissionRules[role] || [];
    return allowed.includes(view);
  }

  // 1. Render Overview/Dashboard View
  function renderOverviewDashboard(target) {
    const isParent = currentWorkspaceRole === 'parent';
    const isStudent = currentWorkspaceRole === 'student';

    let headerTitle = isParent ? "Child Overview Dashboard" : "Classroom Dashboard";
    let widgetHtml = "";

    if (isParent) {
      widgetHtml = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
          <div style="padding: 16px; background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 12px; text-align: center;">
            <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Attendance Rate</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: #10B981; margin-top: 6px;">95.2%</div>
            <span style="font-size: 0.68rem; color: var(--text-muted);">Excellent (0 Absences)</span>
          </div>
          <div style="padding: 16px; background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 12px; text-align: center;">
            <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Pending Homeworks</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: #F59E0B; margin-top: 6px;">1 Assignment</div>
            <span style="font-size: 0.68rem; color: var(--text-muted);">Due: Physics Quiz prep</span>
          </div>
        </div>
      `;
    } else {
      widgetHtml = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
          <div style="padding: 16px; background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 12px; text-align: center;">
            <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Average Attendance</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: var(--primary); margin-top: 6px;">94.5%</div>
            <span style="font-size: 0.68rem; color: var(--text-muted);">Calculated today</span>
          </div>
          <div style="padding: 16px; background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 12px; text-align: center;">
            <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Pending Homework</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: #F59E0B; margin-top: 6px;">2 Tasks</div>
            <span style="font-size: 0.68rem; color: var(--text-muted);">Active chapter: Optics</span>
          </div>
        </div>
      `;
    }

    target.innerHTML = `
      <h3 style="margin:0 0 16px 0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">${headerTitle}</h3>
      ${widgetHtml}
      
      <div style="background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 12px; padding: 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; gap: 12px; align-items: center;">
          <span style="font-size: 1.8rem;">🎉</span>
          <div>
            <h4 style="margin: 0; font-size: 0.88rem; font-weight: 700; color: var(--dark-bg);">Upcoming Class Event</h4>
            <p style="margin: 2px 0 0 0; font-size: 0.78rem; color: var(--text-muted);">Annual Science & Tech Fair — Rescheduled to Next Friday</p>
          </div>
        </div>
        <button class="btn btn-secondary" style="padding: 8px 14px; font-size: 0.78rem; font-weight: 700;" onclick="currentWorkspaceView='events'; renderWorkspaceSidebar(); renderWorkspaceContent();">View Calendar</button>
      </div>
    `;
  }

  // 2. Render Announcements View
  function renderAnnouncementsView(target) {
    const canCreate = ['admin', 'teacher', 'class_teacher'].includes(currentWorkspaceRole);
    const formHtml = canCreate
      ? `
        <div style="background:var(--bg-light); border:1px solid var(--border-color); border-radius:12px; padding:18px; margin-bottom:20px;">
          <h4 style="margin:0 0 12px 0; font-size:0.88rem; font-weight:800; color:var(--dark-bg);">Create Class Announcement</h4>
          <div style="display:flex; flex-direction:column; gap:10px;">
            <input type="text" id="new-ann-title" placeholder="Announcement Title..." style="padding:10px; border:1px solid var(--border-color); border-radius:8px; font-size:0.85rem; outline:none; background:#fff;">
            <textarea id="new-ann-content" placeholder="Type announcement details here..." style="padding:10px; border:1px solid var(--border-color); border-radius:8px; font-size:0.85rem; outline:none; background:#fff; min-height:80px; resize:vertical;"></textarea>
            <div style="display:flex; justify-content:flex-end;">
              <button id="btn-submit-announcement" class="btn btn-primary" style="padding:8px 16px; font-size:0.8rem; font-weight:700;">Publish Announcement</button>
            </div>
          </div>
        </div>
      `
      : '';

    target.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">Class Announcements</h3>
        ${!canCreate ? `<span style="font-size:0.72rem;background:#F1F5F9;color:#64748B;padding:4px 10px;border-radius:100px;font-weight:700;">Read Only</span>` : ''}
      </div>
      ${formHtml}
      <div style="display:flex; flex-direction:column; gap:14px;" id="announcements-list-container">
        ${workspaceAnnouncements.map(ann => `
          <div style="background:#fff; border:1px solid var(--border-color); border-radius:12px; padding:18px; box-shadow:var(--shadow-sm);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
              <h4 style="margin:0; font-size:0.95rem; font-weight:800; color:var(--dark-bg);">${ann.title}</h4>
              <span style="font-size:0.75rem; color:var(--text-muted);">${formatDate(ann.date)}</span>
            </div>
            <p style="margin:0 0 10px 0; font-size:0.84rem; color:var(--text-main); line-height:1.5;">${ann.content}</p>
            <div style="font-size:0.75rem; color:var(--primary); font-weight:700; display:flex; align-items:center; gap:6px;">
              <span style="background:var(--primary-light); width:20px; height:20px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:0.6rem; color:var(--primary);">✍</span>
              Published by: ${ann.author}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Wire publish action
    const pubBtn = document.getElementById('btn-submit-announcement');
    if (pubBtn) {
      pubBtn.onclick = () => {
        const titleVal = document.getElementById('new-ann-title').value.trim();
        const contentVal = document.getElementById('new-ann-content').value.trim();
        if (!titleVal || !contentVal) { alert('Please enter both title and details.'); return; }

        let authorName = "School Admin";
        if (currentWorkspaceRole === 'teacher') authorName = "Subject Teacher";
        if (currentWorkspaceRole === 'class_teacher') authorName = "Ali Ahmad (Class Teacher)";

        const newAnn = {
          id: genId ? genId('ann') : ('ann-' + Date.now()),
          title: titleVal,
          content: contentVal,
          author: authorName,
          date: new Date().toISOString().split('T')[0]
        };

        workspaceAnnouncements.unshift(newAnn);
        saveWorkspaceData(currentWorkspaceId);
        renderAnnouncementsView(target);
        showToastMessage('Announcement published successfully!');
      };
    }
  }

  // 3. Render Members View
  async function renderMembersView(target) {
    const supabase = window.CampusLink?.supabase;
    const cr = classrooms.find(item => item.id === currentWorkspaceId);
    if (!cr) { target.innerHTML = '<p>Classroom not found.</p>'; return; }

    target.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">Loading members...</div>';

    let list = [];
    if (supabase) {
      try {
        const { data: enrollments } = await supabase
          .from('classroom_students')
          .select(`
            roll_number,
            student:profiles!student_id(id, full_name, username)
          `)
          .eq('classroom_id', cr.id);

        if (enrollments) {
          list = enrollments.map((e, idx) => ({
            rollNumber: e.roll_number || (idx + 1),
            fullName: e.student ? e.student.full_name : 'Student',
            admissionNumber: e.student ? e.student.username : '–',
            phone: 'Connected via Portal'
          }));
        }
      } catch (err) {
        console.warn('Error loading real classroom members:', err);
      }
    }

    if (list.length === 0) {
      const crClassName = getClassName(cr.classId);
      const rawClasses = getStoredData('campuslink_classes', []);
      const matchingClassIds = rawClasses
        .filter(c => c.name === crClassName && (c.section === cr.sectionId || c.sectionId === cr.sectionId))
        .map(c => c.id);

      list = students.filter(s => {
        const matchClass = s.classId === cr.classId || matchingClassIds.includes(s.classId);
        const matchSec = s.sectionId === cr.sectionId || s.section === cr.sectionId;
        return matchClass && matchSec && s.status === 'active';
      });
    }

    if (list.length === 0) {
      target.innerHTML = `
        <h3 style="margin:0 0 16px 0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">Class Members</h3>
        <div style="padding:30px; text-align:center; background:#fff; border:1px solid var(--border-color); border-radius:12px; color:var(--text-muted);">
          No enrolled students found in this classroom.
        </div>
      `;
      return;
    }

    target.innerHTML = `
      <h3 style="margin:0 0 16px 0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">Class Members (${list.length})</h3>
      <div style="border-radius:12px; border:1px solid var(--border-color); overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; font-size:0.85rem; text-align:left;">
          <thead>
            <tr style="background:var(--bg-light); border-bottom:1px solid var(--border-color);">
              <th style="padding:12px 16px; font-weight:700;">Roll No</th>
              <th style="padding:12px 16px; font-weight:700;">Student Name</th>
              <th style="padding:12px 16px; font-weight:700;">Username / Admission No</th>
              <th style="padding:12px 16px; font-weight:700;">Emergency Contact</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(s => `
              <tr style="border-bottom:1px solid var(--border-color);">
                <td style="padding:12px 16px; font-weight:700; color:var(--text-muted);">${s.rollNumber || '–'}</td>
                <td style="padding:12px 16px; font-weight:600; color:var(--dark-bg);">${s.fullName}</td>
                <td style="padding:12px 16px; color:var(--text-muted);">${s.admissionNumber || '–'}</td>
                <td style="padding:12px 16px; color:var(--text-muted);">${s.phone || 'Connected via Portal'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // 4. Render Resources View
  function renderResourcesView(target) {
    const canManage = ['admin', 'teacher', 'class_teacher'].includes(currentWorkspaceRole);
    target.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">Class Resources & Study Materials</h3>
        ${canManage ? `<button class="btn btn-primary" style="padding:6px 12px; font-size:0.78rem; font-weight:700;" onclick="alert('Feature placeholder: Uploading resource...')">+ Add Resource</button>` : ''}
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:16px;">
        ${workspaceResources.map(res => `
          <div style="background:#fff; border:1px solid var(--border-color); border-radius:12px; padding:16px; box-shadow:var(--shadow-sm); display:flex; flex-direction:column; gap:10px; cursor:pointer;"
               onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border-color)'" onclick="alert('Downloading: ${res.title}')">
            <div style="font-size:2.2rem;">📂</div>
            <div>
              <h4 style="margin:0; font-size:0.85rem; font-weight:800; color:var(--dark-bg); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${res.title}">${res.title}</h4>
              <p style="margin:3px 0 0 0; font-size:0.72rem; color:var(--text-muted);">${res.type} · ${res.size}</p>
            </div>
            <div style="border-top:1px solid var(--border-color); padding-top:8px; font-size:0.72rem; color:var(--text-muted);">
              Added by: ${res.author}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 5. Render Files View
  function renderFilesView(target) {
    const canManage = ['admin', 'teacher', 'class_teacher'].includes(currentWorkspaceRole);
    target.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">Classroom Shared Files</h3>
        ${canManage ? `<button id="btn-add-classroom-file" class="btn btn-primary" style="padding:6px 12px; font-size:0.78rem; font-weight:700;">+ Upload File</button>` : ''}
      </div>
      <div style="border-radius:12px; border:1px solid var(--border-color); overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; font-size:0.85rem; text-align:left;">
          <thead>
            <tr style="background:var(--bg-light); border-bottom:1px solid var(--border-color);">
              <th style="padding:12px 16px; font-weight:700;">File Name</th>
              <th style="padding:12px 16px; font-weight:700;">Size</th>
              <th style="padding:12px 16px; font-weight:700;">Uploaded Date</th>
              <th style="padding:12px 16px; font-weight:700;">Uploaded By</th>
            </tr>
          </thead>
          <tbody>
            ${workspaceFiles.length === 0 ? `
              <tr>
                <td colspan="4" style="text-align:center; padding:30px; color:var(--text-muted);">
                  No shared files uploaded yet.
                </td>
              </tr>
            ` : workspaceFiles.map(f => `
              <tr style="border-bottom:1px solid var(--border-color); cursor:pointer;" onclick="alert('Downloading shared file: ${f.name}')" onmouseover="this.style.background='var(--bg-light)'" onmouseout="this.style.background=''">
                <td style="padding:12px 16px; font-weight:700; color:var(--primary);">${f.name}</td>
                <td style="padding:12px 16px; color:var(--text-muted);">${f.size}</td>
                <td style="padding:12px 16px; color:var(--text-muted);">${f.date}</td>
                <td style="padding:12px 16px; font-weight:600; color:var(--text-main);">${f.uploadedBy}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    const addFileBtn = document.getElementById('btn-add-classroom-file');
    if (addFileBtn) {
      addFileBtn.onclick = () => {
        const fileName = prompt('Enter File Name (e.g. syllabus.pdf):');
        if (!fileName) return;
        const size = prompt('Enter File Size (e.g. 1.5 MB):', '1.2 MB');
        if (!size) return;

        let authorName = "School Admin";
        if (currentWorkspaceRole === 'teacher') authorName = "Subject Teacher";
        if (currentWorkspaceRole === 'class_teacher') authorName = "Class Teacher";

        const newFile = {
          id: 'f-' + Date.now(),
          name: fileName,
          size: size,
          date: new Date().toISOString().split('T')[0],
          uploadedBy: authorName
        };

        workspaceFiles.unshift(newFile);
        saveWorkspaceData(currentWorkspaceId);
        renderFilesView(target);
        showToastMessage('File uploaded successfully!');
      };
    }
  }

  // 6. Render Gallery View
  function renderGalleryView(target) {
    target.innerHTML = `
      <h3 style="margin:0 0 16px 0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">Classroom Gallery</h3>
      <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:18px;">
        ${workspaceGallery.map(g => `
          <div style="background:#fff; border:1px solid var(--border-color); border-radius:12px; overflow:hidden; box-shadow:var(--shadow-sm);">
            <div style="height:120px; background-image:url('${g.img}'); background-size:cover; background-position:center;"></div>
            <div style="padding:12px;">
              <h4 style="margin:0; font-size:0.8rem; font-weight:800; color:var(--dark-bg);">${g.title}</h4>
              <p style="margin:2px 0 0 0; font-size:0.7rem; color:var(--text-muted);">${formatDate(g.date)}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 7. Render WhatsApp-Inspired Classroom Chat & Communication Channels View
  function renderDiscussionView(target) {
    const rawConvs = localStorage.getItem('campuslink_conversations');
    const conversations = rawConvs ? JSON.parse(rawConvs) : [];

    // Find current active conversation
    let activeConv = conversations.find(c => c.id === activeChannelId);
    if (!activeConv && conversations.length > 0) {
      activeConv = conversations[0];
      activeChannelId = activeConv.id;
    }

    // Determine current user context based on workspace role
    let currentUserId = 'tch_001';
    let currentUserName = 'Ali Ahmad';
    let currentUserRoleRank = 3; // Admin

    if (currentWorkspaceRole === 'student') {
      currentUserId = 'student_1';
      currentUserName = 'Ahmed Khan';
      currentUserRoleRank = 1; // Member
    } else if (currentWorkspaceRole === 'admin') {
      currentUserId = 'school_representative';
      currentUserName = 'School Admin';
      currentUserRoleRank = 4; // Owner
    } else if (currentWorkspaceRole === 'parent') {
      currentUserId = 'parent_1';
      currentUserName = 'Parent Account';
      currentUserRoleRank = 0; // ReadOnly
    }

    // Role helper ranks: ReadOnly=0, Member=1, Moderator=2, Admin=3, Owner=4
    const getRoleRank = (role) => {
      const ranks = { 'ReadOnly': 0, 'Member': 1, 'Moderator': 2, 'Admin': 3, 'Owner': 4 };
      return ranks[role] || 1;
    };

    const getThresholdRank = (t) => {
      const ranks = { 'Everyone': 0, 'Member': 1, 'Moderator': 2, 'Admin': 3, 'Owner': 4 };
      return ranks[t] || 1;
    };

    // Check if user has permission
    const hasPermission = (action) => {
      if (currentWorkspaceRole === 'admin') return true; // Owner has all permissions
      if (!activeConv || !activeConv.settings) return false;
      const threshold = activeConv.settings[action + '_threshold'] || 'Member';
      return currentUserRoleRank >= getThresholdRank(threshold);
    };

    // Render channels list html
    const channelsHtml = conversations.map(c => {
      const isActive = c.id === activeChannelId;
      const lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
      let lastMsgText = 'No messages';
      if (lastMsg) {
        if (lastMsg.type === 'SYSTEM') lastMsgText = `⚙️ ${lastMsg.content}`;
        else if (lastMsg.deleted_at) lastMsgText = '🚫 This message was deleted.';
        else lastMsgText = `${lastMsg.sender_name}: ${lastMsg.content}`;
      }
      if (lastMsgText.length > 30) lastMsgText = lastMsgText.substring(0, 27) + '...';

      return `
        <div class="chat-channel-item" data-id="${c.id}" style="padding: 12px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; border-bottom: 1px solid var(--border-color); transition: background 0.2s; ${isActive ? 'background: rgba(99, 102, 241, 0.08); border-left: 4px solid var(--primary);' : 'background: #fff;'}" onmouseover="this.style.background='rgba(0,0,0,0.02)'" onmouseout="this.style.background='${isActive ? 'rgba(99, 102, 241, 0.08)' : '#fff'}'">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: #EEF2F6; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0;">${c.avatar || '💬'}</div>
          <div style="flex-grow: 1; min-width: 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
              <strong style="font-size: 0.85rem; color: var(--dark-bg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.name}</strong>
              <span style="font-size: 0.65rem; color: var(--text-muted);">${c.type === 'SCHOOL' ? '📢 Feed' : '🎒 Channel'}</span>
            </div>
            <p style="margin: 0; font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${lastMsgText}</p>
          </div>
        </div>
      `;
    }).join('');

    // Messages Timeline Filter
    let messagesToRender = activeConv ? (activeConv.messages || []) : [];
    if (chatSearchQuery.trim()) {
      const q = chatSearchQuery.toLowerCase();
      messagesToRender = messagesToRender.filter(m => m.content.toLowerCase().includes(q));
    }

    // Build timeline message cards
    const messagesHtml = messagesToRender.map(m => {
      if (m.type === 'SYSTEM') {
        return `
          <div style="display: flex; justify-content: center; margin: 12px 0;">
            <span style="background: rgba(15, 23, 42, 0.06); color: var(--text-muted); font-size: 0.72rem; font-weight: 600; padding: 6px 14px; border-radius: 20px; text-align: center; border: 1.5px solid rgba(0,0,0,0.03);">${m.content}</span>
          </div>
        `;
      }

      const isMe = m.sender_id === currentUserId;
      const isDeleted = !!m.deleted_at;

      // Reactions Summary
      const reactionsHtml = (m.reactions || []).map(r => `
        <span style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 2px 6px; font-size: 0.75rem; cursor: pointer;" title="Reacted by user ID: ${r.user_id}">${r.emoji}</span>
      `).join(' ');

      // Reply attachment preview
      let replyPreviewHtml = '';
      if (m.parent_message_id) {
        const parentMsg = activeConv.messages.find(pm => pm.id === m.parent_message_id);
        if (parentMsg) {
          replyPreviewHtml = `
            <div style="background: rgba(0,0,0,0.04); border-left: 3px solid var(--primary); padding: 6px 10px; border-radius: 4px; font-size: 0.72rem; color: var(--text-muted); margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              <strong>${parentMsg.sender_name}</strong>: ${parentMsg.deleted_at ? 'This message was deleted' : parentMsg.content}
            </div>
          `;
        }
      }

      // Metadata attachments
      let attachmentHtml = '';
      if (m.type === 'HOMEWORK' && m.metadata) {
        attachmentHtml = `
          <div class="dash-card" style="background: #F8FAFC; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-top: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span style="font-size: 1.25rem;">📝</span>
              <div>
                <strong style="font-size: 0.8rem; color: var(--dark-bg);">${m.metadata.subject}: ${m.metadata.title}</strong>
                <div style="font-size: 0.68rem; color: #EF4444; font-weight: 700;">Due Date: ${m.metadata.dueDate}</div>
              </div>
            </div>
            <p style="margin: 0; font-size: 0.75rem; color: var(--text-muted);">${m.metadata.description}</p>
            <button class="btn btn-secondary" style="margin-top: 8px; width: 100%; padding: 4px; font-size: 0.7rem;" onclick="document.querySelector('[data-workspace-tab=homework]').click()">View Homework Board</button>
          </div>
        `;
      } else if (m.type === 'ATTENDANCE' && m.metadata) {
        attachmentHtml = `
          <div class="dash-card" style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 12px; margin-top: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.25rem; color: #059669;">✅</span>
              <div>
                <strong style="font-size: 0.8rem; color: #065F46;">Daily Attendance Marked</strong>
                <div style="font-size: 0.68rem; color: #047857; font-weight: 700;">Present: ${m.metadata.present} | Absent: ${m.metadata.absent} (${m.metadata.percent}%)</div>
              </div>
            </div>
          </div>
        `;
      } else if (m.type === 'EVENT' && m.metadata) {
        attachmentHtml = `
          <div class="dash-card" style="background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 8px; padding: 12px; margin-top: 8px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.25rem;">📅</span>
              <div>
                <strong style="font-size: 0.8rem; color: #92400E;">School Event: ${m.metadata.title}</strong>
                <div style="font-size: 0.68rem; color: #78350F;">Date: ${m.metadata.date} | Venue: ${m.metadata.venue}</div>
              </div>
            </div>
          </div>
        `;
      } else if (m.type === 'DOCUMENT' && m.metadata) {
        attachmentHtml = `
          <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(0,0,0,0.03); border-radius: 6px; margin-top: 6px; border: 1px solid var(--border-color);">
            <span style="font-size: 1.3rem;">📄</span>
            <div style="flex-grow: 1; min-width: 0;">
              <div style="font-size: 0.78rem; font-weight: 700; color: var(--dark-bg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.metadata.fileName}</div>
              <div style="font-size: 0.65rem; color: var(--text-muted);">${m.metadata.fileSize}</div>
            </div>
            <a href="#" onclick="alert('Downloading file...')" style="font-size: 0.85rem; text-decoration: none;">⬇️</a>
          </div>
        `;
      } else if (m.type === 'IMAGE' && m.metadata) {
        attachmentHtml = `
          <div style="margin-top: 6px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color);">
            <img src="${m.metadata.fileUrl}" style="width: 100%; max-height: 180px; object-fit: cover;" alt="Shared Image">
          </div>
        `;
      }

      // Check if message is pinned
      const isPinned = activeConv.pins && activeConv.pins.includes(m.id);

      return `
        <div style="display: flex; flex-direction: column; align-items: ${isMe ? 'flex-end' : 'flex-start'}; margin-bottom: 12px; width: 100%;">
          <div style="max-width: 75%; background: ${isMe ? '#d9fdd3' : '#fff'}; border-radius: 12px; padding: 8px 12px; box-shadow: var(--shadow-sm); position: relative; border: 1.5px solid rgba(0,0,0,0.02);">
            <!-- Pin Badge -->
            ${isPinned ? `<div style="font-size: 0.65rem; color: var(--text-muted); display: flex; align-items: center; gap: 3px; margin-bottom: 3px;">📌 Pinned</div>` : ''}

            <!-- Sender Header -->
            ${!isMe ? `<div style="font-size: 0.72rem; font-weight: 800; color: var(--primary); margin-bottom: 2px;">${m.sender_name} <span style="font-weight:500; color:var(--text-muted); font-size:0.65rem;">(${m.sender_role})</span></div>` : ''}
            
            <!-- Reply attachment -->
            ${replyPreviewHtml}

            <!-- Content -->
            <div style="font-size: 0.84rem; color: var(--text-main); line-height: 1.4; word-wrap: break-word;">
              ${isDeleted ? `<span style="font-style: italic; color: var(--text-muted);">🚫 This message was deleted.</span>` : m.content}
            </div>

            <!-- Custom Attachments -->
            ${!isDeleted ? attachmentHtml : ''}

            <!-- Date, Reactions and Action Menu -->
            <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap;">
              <span style="font-size: 0.62rem; color: var(--text-muted);">${new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              ${!isDeleted ? `
                <span class="chat-actions-trigger" style="font-size: 0.7rem; cursor: pointer; color: var(--text-muted);" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">▼</span>
                <div class="chat-action-menu" style="display: none; position: absolute; z-index: 10; background: #fff; border: 1px solid var(--border-color); border-radius: 8px; box-shadow: var(--shadow-sm); padding: 4px 0; right: 8px; min-width: 110px;">
                  <button class="chat-action-btn" style="display: block; width: 100%; text-align: left; padding: 6px 12px; font-size: 0.72rem; background: none; border: none; cursor: pointer;" onclick="window.replyToChatMessage('${m.id}')">↩ Reply</button>
                  <button class="chat-action-btn" style="display: block; width: 100%; text-align: left; padding: 6px 12px; font-size: 0.72rem; background: none; border: none; cursor: pointer;" onclick="window.reactToChatMessage('${m.id}', '❤️')">❤️ React</button>
                  <button class="chat-action-btn" style="display: block; width: 100%; text-align: left; padding: 6px 12px; font-size: 0.72rem; background: none; border: none; cursor: pointer;" onclick="window.reactToChatMessage('${m.id}', '👍')">👍 React</button>
                  ${hasPermission('pin_messages') ? `
                    <button class="chat-action-btn" style="display: block; width: 100%; text-align: left; padding: 6px 12px; font-size: 0.72rem; background: none; border: none; cursor: pointer;" onclick="window.togglePinChatMessage('${m.id}', ${isPinned})">${isPinned ? '📌 Unpin' : '📌 Pin'}</button>
                  ` : ''}
                  ${(isMe || currentWorkspaceRole === 'admin') ? `
                    <button class="chat-action-btn" style="display: block; width: 100%; text-align: left; padding: 6px 12px; font-size: 0.72rem; background: none; border: none; cursor: pointer; color: #EF4444;" onclick="window.deleteChatMessage('${m.id}')">🗑️ Delete</button>
                  ` : ''}
                </div>
              ` : ''}
            </div>

            <!-- Reactions Row -->
            ${reactionsHtml ? `<div style="display: flex; gap: 4px; margin-top: 4px; justify-content: flex-start;">${reactionsHtml}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Right Panel - Group details & Members list
    let rightPanelHtml = '';
    if (chatRightPanelOpen && activeConv) {
      // Group Settings policies
      const settings = activeConv.settings || {};
      
      const roleOptions = ['Everyone', 'Member', 'Moderator', 'Admin', 'Owner'];
      const buildSettingsOption = (action, labelText) => {
        if (currentWorkspaceRole !== 'admin') {
          return `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; border-bottom: 1px solid rgba(0,0,0,0.03); padding: 8px 0;">
              <span style="color: var(--text-main); font-weight: 500;">${labelText}</span>
              <strong style="color: var(--primary);">${settings[action + '_threshold'] || 'Admin'}</strong>
            </div>
          `;
        }
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; border-bottom: 1px solid rgba(0,0,0,0.03); padding: 8px 0;">
            <span style="color: var(--text-main); font-weight: 500;">${labelText}</span>
            <select style="font-size: 0.72rem; font-weight:700; color: var(--primary); border: 1.5px solid var(--border-color); border-radius: 6px; background:#fff; padding: 2px 4px; outline:none;" onchange="window.changeChatPermissionThreshold('${action}', this.value)">
              ${roleOptions.map(o => `<option value="${o}" ${settings[action + '_threshold'] === o ? 'selected' : ''}>${o}</option>`).join('')}
            </select>
          </div>
        `;
      };

      // Mock Members list (since it can scale for future modules)
      const mockMembers = [
        { id: 'user_rep', name: 'School Admin', role: 'Owner', avatar: '🏫' },
        { id: 'tch_001', name: 'Ali Ahmad', role: 'Admin', avatar: '👨‍🏫' },
        { id: 'tch_002', name: 'Priya Sharma', role: 'Admin', avatar: '👩‍🏫' },
        { id: 'student_1', name: 'Ahmed Khan', role: 'Member', avatar: '👦' },
        { id: 'student_2', name: 'Rahul Kumar', role: 'Member', avatar: '👦' },
        { id: 'student_3', name: 'Sneha Patel', role: 'Member', avatar: '👧' }
      ];

      const membersListHtml = mockMembers.map(m => {
        const canManage = currentWorkspaceRole === 'admin' && m.id !== 'user_rep';
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 28px; height: 28px; border-radius: 50%; background: #EEF2F6; display: flex; align-items: center; justify-content: center; font-size: 0.9rem;">${m.avatar}</div>
              <div>
                <strong style="font-size: 0.78rem; color: var(--dark-bg);">${m.name}</strong>
                <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">${m.role}</div>
              </div>
            </div>
            ${canManage ? `
              <select style="font-size: 0.65rem; font-weight: 700; border: 1px solid var(--border-color); border-radius: 4px; padding: 2px;" onchange="window.updateMemberRole('${m.id}', this.value)">
                <option value="Member" ${m.role === 'Member' ? 'selected' : ''}>Member</option>
                <option value="Moderator" ${m.role === 'Moderator' ? 'selected' : ''}>Moderator</option>
                <option value="Admin" ${m.role === 'Admin' ? 'selected' : ''}>Admin</option>
                <option value="ReadOnly" ${m.role === 'ReadOnly' ? 'selected' : ''}>ReadOnly</option>
              </select>
            ` : ''}
          </div>
        `;
      }).join('');

      rightPanelHtml = `
        <div style="width: 300px; border-left: 1px solid var(--border-color); display: flex; flex-direction: column; background: #fff; height: 100%;">
          <!-- Right Header -->
          <div style="padding: 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 0.9rem; color: var(--dark-bg);">Info & Settings</strong>
            <button style="background: none; border: none; cursor: pointer; font-size: 1.1rem; color: var(--text-muted);" onclick="window.toggleChatRightDrawer()">✕</button>
          </div>
          <!-- Drawer Content -->
          <div style="flex-grow: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 16px;">
            <!-- Channel Info Card -->
            <div style="text-align: center; border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
              <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--bg-light); border: 2px solid var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; margin: 0 auto 8px auto;">${activeConv.avatar || '🎒'}</div>
              <h4 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: var(--dark-bg);">${activeConv.name}</h4>
              <p style="margin: 4px 0 0 0; font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">${activeConv.description}</p>
            </div>
            
            <!-- Group Settings -->
            <div>
              <h5 style="margin: 0 0 8px 0; font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Group Settings</h5>
              <div style="display: flex; flex-direction: column;">
                ${buildSettingsOption('send_messages', 'Send Messages')}
                ${buildSettingsOption('edit_info', 'Edit Group Info')}
                ${buildSettingsOption('change_photo', 'Change Photo')}
                ${buildSettingsOption('pin_messages', 'Pin Messages')}
                ${buildSettingsOption('delete_messages', 'Delete Messages')}
              </div>
            </div>

            <!-- Members list -->
            <div style="flex-grow: 1;">
              <h5 style="margin: 0 0 8px 0; font-size: 0.72rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Members</h5>
              <div style="display: flex; flex-direction: column;">
                ${membersListHtml}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Multiple Pinned Messages list banner
    let pinnedMessagesBanner = '';
    if (activeConv && activeConv.pins && activeConv.pins.length > 0) {
      const pinContentList = activeConv.pins.map(pinId => {
        const msg = activeConv.messages.find(m => m.id === pinId);
        return msg && !msg.deleted_at ? msg : null;
      }).filter(Boolean);

      if (pinContentList.length > 0) {
        // Render banner
        const activePin = pinContentList[0];
        const extraCount = pinContentList.length - 1;
        pinnedMessagesBanner = `
          <div style="background: #F1F5F9; border-bottom: 1.5px solid var(--border-color); padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
              <span style="font-size: 1rem;">📌</span>
              <div style="font-size: 0.78rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;" onclick="alert('Viewing pinned list of ${pinContentList.length} items.')">
                <strong>Pinned</strong>: ${activePin.content} ${extraCount > 0 ? `<span style="color: var(--primary); font-weight: 700; margin-left: 6px;">(+${extraCount} more)</span>` : ''}
              </div>
            </div>
            ${hasPermission('pin_messages') ? `
              <button style="background: none; border: none; font-size: 0.72rem; color: #EF4444; font-weight: 700; cursor: pointer;" onclick="window.togglePinChatMessage('${activePin.id}', true)">Unpin</button>
            ` : ''}
          </div>
        `;
      }
    }

    // Header Controls
    const infoBtnText = chatRightPanelOpen ? 'Hide Info' : 'Show Info';

    target.innerHTML = `
      <div style="display: grid; grid-template-columns: 280px 1fr ${chatRightPanelOpen ? '300px' : ''}; height: calc(100vh - 180px); min-height: 520px; background: #fff; border: 1px solid var(--border-color); border-radius: 16px; overflow: hidden; box-shadow: var(--shadow-sm);">
        <!-- Column 1: Channels Directory -->
        <div style="border-right: 1px solid var(--border-color); background: var(--bg-light); display: flex; flex-direction: column; height: 100%;">
          <div style="padding: 16px; border-bottom: 1px solid var(--border-color); background: #fff;">
            <h3 style="margin: 0; font-size: 0.95rem; font-weight: 800; color: var(--dark-bg); display: flex; align-items: center; gap: 6px;">
              <span>💬</span> Chat Channels
            </h3>
            <p style="margin: 3px 0 0 0; font-size: 0.72rem; color: var(--text-muted);">Classroom & School communication</p>
          </div>
          <div style="flex-grow: 1; overflow-y: auto;" id="chat-channels-list-container">
            ${channelsHtml}
          </div>
        </div>

        <!-- Column 2: Chat Window -->
        <div style="display: flex; flex-direction: column; background: #efeae2; height: 100%; position: relative;">
          
          <!-- Chat Window Header -->
          <div style="padding: 12px 18px; border-bottom: 1px solid var(--border-color); background: #fff; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; z-index: 5; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--bg-light); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">${activeConv ? activeConv.avatar : '🎒'}</div>
              <div>
                <h4 style="margin: 0; font-size: 0.88rem; font-weight: 800; color: var(--dark-bg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${activeConv ? activeConv.name : 'Classroom Group'}</h4>
                <div style="font-size: 0.68rem; color: var(--text-muted);" id="chat-online-counts">
                  ${activeConv ? activeConv.messages.length : 0} messages timeline feed
                </div>
              </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="position: relative;">
                <input type="text" id="chat-search-input" placeholder="Search..." style="padding: 6px 10px 6px 28px; font-size: 0.75rem; border: 1.5px solid var(--border-color); border-radius: 20px; outline: none; width: 130px; background: #f8fafc;" value="${chatSearchQuery}" oninput="window.filterChatTimelineMessages(this.value)">
                <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 0.72rem; color: var(--text-muted);">🔍</span>
              </div>
              <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.75rem; font-weight: 700; border-radius: 20px;" onclick="window.toggleChatRightDrawer()">${infoBtnText}</button>
            </div>
          </div>

          <!-- Pinned Messages Banner -->
          ${pinnedMessagesBanner}

          <!-- Messages Scrollable Timeline Area -->
          <div style="flex-grow: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column;" id="chat-messages-timeline">
            ${messagesHtml}
          </div>

          <!-- Typing indicator bar placeholder -->
          <div id="chat-typing-indicator" style="display: none; background: rgba(255,255,255,0.85); padding: 4px 18px; font-size: 0.72rem; font-weight: 600; color: var(--primary); flex-shrink: 0; border-top: 1px solid var(--border-color);"></div>

          <!-- Reply Banner Preview -->
          ${activeReplyMessage ? `
            <div style="background: #f1f5f9; border-left: 4px solid var(--primary); padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; border-top: 1.5px solid var(--border-color); flex-shrink: 0;">
              <div style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%;">
                Replying to <strong>${activeReplyMessage.sender_name}</strong>: ${activeReplyMessage.content}
              </div>
              <button style="background: none; border: none; font-size: 0.9rem; color: var(--text-muted); cursor: pointer;" onclick="window.cancelReplyToChatMessage()">✕</button>
            </div>
          ` : ''}

          <!-- Message Input Toolbar (Disabled if user rank is below threshold) -->
          <div style="padding: 12px 18px; background: #fff; border-top: 1px solid var(--border-color); display: flex; gap: 8px; align-items: center; flex-shrink: 0;">
            ${hasPermission('send_messages') ? `
              <!-- Attachment Button -->
              <div style="position: relative;">
                <button style="background: none; border: none; font-size: 1.25rem; cursor: pointer; color: var(--text-muted); padding: 4px;" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">📎</button>
                <div style="display: none; position: absolute; bottom: 40px; left: 0; background: #fff; border: 1px solid var(--border-color); border-radius: 8px; box-shadow: var(--shadow-sm); z-index: 10; padding: 4px 0; min-width: 130px;">
                  <button class="chat-action-btn" style="display: flex; gap: 8px; width: 100%; text-align: left; padding: 8px 12px; font-size: 0.75rem; background: none; border: none; cursor: pointer;" onclick="window.sendChatAttachment('IMAGE')">🖼️ Share Image</button>
                  <button class="chat-action-btn" style="display: flex; gap: 8px; width: 100%; text-align: left; padding: 8px 12px; font-size: 0.75rem; background: none; border: none; cursor: pointer;" onclick="window.sendChatAttachment('DOCUMENT')">📄 Share PDF Document</button>
                </div>
              </div>

              <!-- Message Input text -->
              <input type="text" id="chat-message-composer" placeholder="Type a message..." style="flex-grow: 1; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: 20px; font-size: 0.85rem; outline: none; background: #f8fafc;" onkeydown="if(event.key === 'Enter') window.dispatchChatMessage(this.value)">

              <button class="btn btn-primary" style="padding: 8px 16px; font-size: 0.82rem; font-weight: 700; border-radius: 20px;" onclick="window.dispatchChatMessage(document.getElementById('chat-message-composer').value)">Send</button>
            ` : `
              <div style="flex-grow: 1; text-align: center; font-size: 0.8rem; color: var(--text-muted); padding: 8px; font-weight: 600;">
                🔒 Only Admins can send messages in this channel.
              </div>
            `}
          </div>
        </div>

        <!-- Column 3: Collapsible Info/Settings Drawer -->
        ${rightPanelHtml}
      </div>
    `;

    // Scroll chat timeline to bottom
    const scroller = document.getElementById('chat-messages-timeline');
    if (scroller) scroller.scrollTop = scroller.scrollHeight;

    // Bind clicking channel list
    document.querySelectorAll('.chat-channel-item').forEach(item => {
      item.onclick = () => {
        activeChannelId = item.getAttribute('data-id');
        activeReplyMessage = null;
        renderDiscussionView(target);
      };
    });
  }

  // --- WINDOW GLOBAL FUNCTION BINDINGS ---

  window.toggleChatRightDrawer = () => {
    chatRightPanelOpen = !chatRightPanelOpen;
    const panel = document.getElementById('workspace-main-content');
    if (panel) renderDiscussionView(panel);
  };

  window.filterChatTimelineMessages = (val) => {
    chatSearchQuery = val;
    // Don't re-render full view to keep focus, just re-render content
    const panel = document.getElementById('workspace-main-content');
    if (panel) renderDiscussionView(panel);
  };

  window.replyToChatMessage = (msgId) => {
    const rawConvs = localStorage.getItem('campuslink_conversations');
    const conversations = rawConvs ? JSON.parse(rawConvs) : [];
    const activeConv = conversations.find(c => c.id === activeChannelId);
    if (!activeConv) return;
    const msg = activeConv.messages.find(m => m.id === msgId);
    if (msg) {
      activeReplyMessage = msg;
      const panel = document.getElementById('workspace-main-content');
      if (panel) renderDiscussionView(panel);
    }
  };

  window.cancelReplyToChatMessage = () => {
    activeReplyMessage = null;
    const panel = document.getElementById('workspace-main-content');
    if (panel) renderDiscussionView(panel);
  };

  window.reactToChatMessage = (msgId, emoji) => {
    const rawConvs = localStorage.getItem('campuslink_conversations');
    const conversations = rawConvs ? JSON.parse(rawConvs) : [];
    const activeConv = conversations.find(c => c.id === activeChannelId);
    if (!activeConv) return;
    const msg = activeConv.messages.find(m => m.id === msgId);
    if (msg) {
      if (!msg.reactions) msg.reactions = [];
      const user = currentWorkspaceRole === 'student' ? 'student_1' : 'tch_001';
      const existing = msg.reactions.find(r => r.user_id === user && r.emoji === emoji);
      if (existing) {
        msg.reactions = msg.reactions.filter(r => !(r.user_id === user && r.emoji === emoji));
      } else {
        msg.reactions.push({ user_id: user, emoji });
      }
      localStorage.setItem('campuslink_conversations', JSON.stringify(conversations));
      const panel = document.getElementById('workspace-main-content');
      if (panel) renderDiscussionView(panel);
    }
  };

  window.togglePinChatMessage = (msgId, isPinned) => {
    const rawConvs = localStorage.getItem('campuslink_conversations');
    const conversations = rawConvs ? JSON.parse(rawConvs) : [];
    const activeConv = conversations.find(c => c.id === activeChannelId);
    if (!activeConv) return;
    if (!activeConv.pins) activeConv.pins = [];

    if (isPinned) {
      activeConv.pins = activeConv.pins.filter(id => id !== msgId);
    } else {
      if (!activeConv.pins.includes(msgId)) {
        activeConv.pins.push(msgId);
      }
    }
    localStorage.setItem('campuslink_conversations', JSON.stringify(conversations));
    const panel = document.getElementById('workspace-main-content');
    if (panel) renderDiscussionView(panel);
  };

  window.deleteChatMessage = (msgId) => {
    const rawConvs = localStorage.getItem('campuslink_conversations');
    const conversations = rawConvs ? JSON.parse(rawConvs) : [];
    const activeConv = conversations.find(c => c.id === activeChannelId);
    if (!activeConv) return;
    const msg = activeConv.messages.find(m => m.id === msgId);
    if (msg) {
      msg.deleted_at = new Date().toISOString();
      msg.deleted_by = currentWorkspaceRole === 'student' ? 'student_1' : 'tch_001';
      localStorage.setItem('campuslink_conversations', JSON.stringify(conversations));
      const panel = document.getElementById('workspace-main-content');
      if (panel) renderDiscussionView(panel);
    }
  };

  window.changeChatPermissionThreshold = (action, val) => {
    const rawConvs = localStorage.getItem('campuslink_conversations');
    const conversations = rawConvs ? JSON.parse(rawConvs) : [];
    const activeConv = conversations.find(c => c.id === activeChannelId);
    if (!activeConv) return;
    if (!activeConv.settings) activeConv.settings = {};

    activeConv.settings[action + '_threshold'] = val;
    
    // Add SYSTEM log for change
    activeConv.messages.push({
      id: 'm-sys-' + Date.now(),
      sender_id: null,
      sender_name: 'System',
      sender_role: 'SYSTEM',
      content: `Group setting updated: ${action.replace('_', ' ')} permission threshold changed to ${val}.`,
      type: 'SYSTEM',
      created_at: new Date().toISOString()
    });

    localStorage.setItem('campuslink_conversations', JSON.stringify(conversations));
    const panel = document.getElementById('workspace-main-content');
    if (panel) renderDiscussionView(panel);
  };

  window.updateMemberRole = (memberId, newRole) => {
    // Audit log
    const rawConvs = localStorage.getItem('campuslink_conversations');
    const conversations = rawConvs ? JSON.parse(rawConvs) : [];
    const activeConv = conversations.find(c => c.id === activeChannelId);
    if (!activeConv) return;

    activeConv.messages.push({
      id: 'm-sys-' + Date.now(),
      sender_id: null,
      sender_name: 'System',
      sender_role: 'SYSTEM',
      content: `Member ${memberId} role updated to ${newRole}.`,
      type: 'SYSTEM',
      created_at: new Date().toISOString()
    });

    localStorage.setItem('campuslink_conversations', JSON.stringify(conversations));
    const panel = document.getElementById('workspace-main-content');
    if (panel) renderDiscussionView(panel);
  };

  window.sendChatAttachment = (attachmentType) => {
    const rawConvs = localStorage.getItem('campuslink_conversations');
    const conversations = rawConvs ? JSON.parse(rawConvs) : [];
    const activeConv = conversations.find(c => c.id === activeChannelId);
    if (!activeConv) return;

    let senderId = 'tch_001';
    let senderName = 'Ali Ahmad';
    let senderRole = 'Admin';
    if (currentWorkspaceRole === 'student') {
      senderId = 'student_1';
      senderName = 'Ahmed Khan';
      senderRole = 'Member';
    }

    let mockMsg = {};
    if (attachmentType === 'IMAGE') {
      mockMsg = {
        id: 'msg-' + Date.now(),
        sender_id: senderId,
        sender_name: senderName,
        sender_role: senderRole,
        content: 'Shared an image attachment.',
        type: 'IMAGE',
        metadata: { fileUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=400&q=80' },
        created_at: new Date().toISOString()
      };
    } else {
      mockMsg = {
        id: 'msg-' + Date.now(),
        sender_id: senderId,
        sender_name: senderName,
        sender_role: senderRole,
        content: 'Shared a file document.',
        type: 'DOCUMENT',
        metadata: { fileName: 'Chemistry_Practical_Syllabus.pdf', fileSize: '1.2 MB' },
        created_at: new Date().toISOString()
      };
    }

    activeConv.messages.push(mockMsg);
    localStorage.setItem('campuslink_conversations', JSON.stringify(conversations));
    const panel = document.getElementById('workspace-main-content');
    if (panel) renderDiscussionView(panel);
  };

  window.dispatchChatMessage = (val) => {
    const textVal = val.trim();
    if (!textVal) return;

    const composer = document.getElementById('chat-message-composer');
    if (composer) composer.value = '';

    const rawConvs = localStorage.getItem('campuslink_conversations');
    const conversations = rawConvs ? JSON.parse(rawConvs) : [];
    const activeConv = conversations.find(c => c.id === activeChannelId);
    if (!activeConv) return;

    let senderId = 'tch_001';
    let senderName = 'Ali Ahmad';
    let senderRole = 'Admin';
    if (currentWorkspaceRole === 'student') {
      senderId = 'student_1';
      senderName = 'Ahmed Khan';
      senderRole = 'Member';
    }

    const newMsg = {
      id: 'msg-' + Date.now(),
      sender_id: senderId,
      sender_name: senderName,
      sender_role: senderRole,
      content: textVal,
      type: 'TEXT',
      parent_message_id: activeReplyMessage ? activeReplyMessage.id : null,
      created_at: new Date().toISOString()
    };

    activeConv.messages.push(newMsg);
    localStorage.setItem('campuslink_conversations', JSON.stringify(conversations));

    activeReplyMessage = null;
    const panel = document.getElementById('workspace-main-content');
    if (panel) renderDiscussionView(panel);

    // Dynamic auto-reply simulation for Ahmed Khan (if teacher posted)
    if (currentWorkspaceRole !== 'student' && activeConv.type === 'CLASSROOM') {
      const indicator = document.getElementById('chat-typing-indicator');
      if (indicator) {
        indicator.textContent = 'Ahmed Khan (Student) is typing...';
        indicator.style.display = 'block';
      }
      
      setTimeout(() => {
        if (indicator) indicator.style.display = 'none';

        const freshConvs = JSON.parse(localStorage.getItem('campuslink_conversations'));
        const freshConv = freshConvs.find(c => c.id === activeChannelId);
        if (freshConv) {
          freshConv.messages.push({
            id: 'msg-auto-' + Date.now(),
            sender_id: 'student_1',
            sender_name: 'Ahmed Khan',
            sender_role: 'Member',
            content: 'Understood, sir. I will review this immediately.',
            type: 'TEXT',
            parent_message_id: newMsg.id,
            created_at: new Date().toISOString()
          });
          localStorage.setItem('campuslink_conversations', JSON.stringify(freshConvs));
          const currentPanel = document.getElementById('workspace-main-content');
          if (currentPanel) renderDiscussionView(currentPanel);
        }
      }, 2500);
    }
  };

  // 8. Render Homework View
  function renderHomeworkView(target) {
    const canCreate = ['admin', 'teacher', 'class_teacher'].includes(currentWorkspaceRole);
    target.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="margin:0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">Class Homework & Homework Board</h3>
        ${canCreate ? `<button id="btn-add-classroom-hw" class="btn btn-primary" style="padding:6px 12px; font-size:0.78rem; font-weight:700;">+ Create Assignment</button>` : ''}
      </div>
      <div style="display:flex; flex-direction:column; gap:14px;">
        ${workspaceHomework.length === 0 ? `
          <div style="padding:30px; text-align:center; background:#fff; border:1px solid var(--border-color); border-radius:12px; color:var(--text-muted);">
            No homework assignments posted yet.
          </div>
        ` : workspaceHomework.map(hw => `
          <div style="background:#fff; border:1px solid var(--border-color); border-radius:12px; padding:18px; box-shadow:var(--shadow-sm);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
              <div>
                <span style="background:rgba(99,102,241,0.08); color:var(--primary); padding:2px 8px; border-radius:4px; font-size:0.7rem; font-weight:700; text-transform:uppercase;">${hw.subject}</span>
                <h4 style="margin:6px 0 0 0; font-size:0.95rem; font-weight:800; color:var(--dark-bg);">${hw.title}</h4>
              </div>
              <span style="font-size:0.72rem; color:var(--text-muted); font-weight:600; text-align:right;">
                Due Date:<br>
                <strong style="color:#B91C1C;">${formatDate(hw.dueDate)}</strong>
              </span>
            </div>
            <p style="margin:0 0 12px 0; font-size:0.82rem; color:var(--text-main); line-height:1.45;">${hw.description}</p>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:10px;">
              <span style="font-size:0.75rem; color:var(--text-muted);">Status: ${statusBadge(hw.status)}</span>
              ${currentWorkspaceRole === 'student' && hw.status === 'pending'
                ? `<button class="btn btn-primary" style="padding:5px 12px; font-size:0.72rem; font-weight:700;" onclick="alert('Homework submitted successfully!')">Submit Assignment</button>`
                : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    const addHwBtn = document.getElementById('btn-add-classroom-hw');
    if (addHwBtn) {
      addHwBtn.onclick = () => {
        const title = prompt('Enter Homework Title:');
        if (!title) return;
        const subject = prompt('Enter Subject:', 'General');
        if (!subject) return;
        const desc = prompt('Enter Description:');
        if (!desc) return;
        const dueDate = prompt('Enter Due Date (YYYY-MM-DD):', new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
        if (!dueDate) return;

        const newHw = {
          id: 'hw-' + Date.now(),
          subject: subject,
          title: title,
          dueDate: dueDate,
          status: 'pending',
          description: desc
        };

        workspaceHomework.unshift(newHw);
        saveWorkspaceData(currentWorkspaceId);
        renderHomeworkView(target);
        showToastMessage('Homework assignment created successfully!');
      };
    }
  }

  // 9. Render Attendance Summary / View
  function renderAttendanceView(target) {
    if (['admin', 'class_teacher'].includes(currentWorkspaceRole)) {
      target.innerHTML = `
        <h3 style="margin:0 0 8px 0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">Class Attendance Management</h3>
        <p style="margin:0 0 20px 0; font-size:0.8rem; color:var(--text-muted);">Authorized Class Teachers and Admins can log and submit daily attendance metrics. To log daily attendance, click the button below to load the Class Roster panel.</p>
        <button class="btn btn-primary" style="padding:10px 18px; font-size:0.85rem; font-weight:700; display:flex; align-items:center; gap:8px;" onclick="window._attOpenMarkModal('${currentWorkspaceId}')">
          <span>📅</span> Mark Roster Attendance
        </button>
      `;
    } else if (currentWorkspaceRole === 'teacher') {
      // Subject Teacher - View Attendance only (Readonly view)
      target.innerHTML = `
        <h3 style="margin:0 0 8px 0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">Class Attendance Log (View Only)</h3>
        <p style="margin:0 0 20px 0; font-size:0.8rem; color:var(--text-muted);">As a Subject Teacher, you have read-only access to the attendance summaries for this classroom.</p>
        
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;">
          <div style="background:var(--bg-light); padding:16px; border-radius:12px; text-align:center; border:1px solid var(--border-color);">
            <div style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Attendance Rate</div>
            <div style="font-size:1.8rem; font-weight:900; color:#10B981; margin-top:4px;">95.2%</div>
          </div>
          <div style="background:var(--bg-light); padding:16px; border-radius:12px; text-align:center; border:1px solid var(--border-color);">
            <div style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Today's Status</div>
            <div style="font-size:1.8rem; font-weight:900; color:var(--primary); margin-top:4px;">Taken & Verified</div>
          </div>
        </div>
      `;
    } else {
      // Student or Parent attendance summary
      target.innerHTML = `
        <h3 style="margin:0 0 16px 0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">Attendance Performance Report</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px;">
          <div style="background:var(--bg-light); padding:16px; border-radius:12px; text-align:center; border:1px solid var(--border-color);">
            <div style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Attendance Rate</div>
            <div style="font-size:2.2rem; font-weight:900; color:#10B981; margin-top:4px;">96.8%</div>
          </div>
          <div style="background:var(--bg-light); padding:16px; border-radius:12px; text-align:center; border:1px solid var(--border-color);">
            <div style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Total Absences</div>
            <div style="font-size:2.2rem; font-weight:900; color:#EF4444; margin-top:4px;">1 Day</div>
          </div>
        </div>
      `;
    }
  }

  // 10. Render Timetable View
  function renderTimetableView(target) {
    target.innerHTML = `
      <h3 style="margin:0 0 16px 0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">Class Timetable Schedule</h3>
      <div style="border-radius:12px; border:1px solid var(--border-color); overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; font-size:0.82rem; text-align:center;">
          <thead>
            <tr style="background:var(--bg-light); border-bottom:1px solid var(--border-color); font-weight:700;">
              <th style="padding:10px; text-align:left; color:var(--text-muted);">Period</th>
              <th style="padding:10px; color:var(--text-muted);">Mon</th>
              <th style="padding:10px; color:var(--text-muted);">Tue</th>
              <th style="padding:10px; color:var(--text-muted);">Wed</th>
              <th style="padding:10px; color:var(--text-muted);">Thu</th>
              <th style="padding:10px; color:var(--text-muted);">Fri</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid var(--border-color);">
              <td style="padding:12px; text-align:left; font-weight:700; color:var(--text-muted);">P1 (8:30 AM)</td>
              <td style="padding:12px; font-weight:600; color:var(--dark-bg);">Math</td>
              <td style="padding:12px; font-weight:600; color:var(--dark-bg);">Physics</td>
              <td style="padding:12px; font-weight:600; color:var(--dark-bg);">Math</td>
              <td style="padding:12px; font-weight:600; color:var(--dark-bg);">Chemistry</td>
              <td style="padding:12px; font-weight:600; color:var(--dark-bg);">English</td>
            </tr>
            <tr style="border-bottom:1px solid var(--border-color);">
              <td style="padding:12px; text-align:left; font-weight:700; color:var(--text-muted);">P2 (9:30 AM)</td>
              <td style="padding:12px; font-weight:600; color:var(--dark-bg);">English</td>
              <td style="padding:12px; font-weight:600; color:var(--dark-bg);">Math</td>
              <td style="padding:12px; font-weight:600; color:var(--dark-bg);">English</td>
              <td style="padding:12px; font-weight:600; color:var(--dark-bg);">Physics</td>
              <td style="padding:12px; font-weight:600; color:var(--dark-bg);">Chemistry</td>
            </tr>
            <tr style="border-bottom:1px solid var(--border-color);">
              <td style="padding:12px; text-align:left; font-weight:700; color:var(--text-muted);">Break (10:30 AM)</td>
              <td colspan="5" style="padding:6px; font-style:italic; font-weight:700; background:#FFFBEB; color:#D97706; font-size:0.75rem; letter-spacing:0.08em; text-transform:uppercase;">Recess / Tiffin Break</td>
            </tr>
            <tr style="border-bottom:1px solid var(--border-color);">
              <td style="padding:12px; text-align:left; font-weight:700; color:var(--text-muted);">P3 (11:00 AM)</td>
              <td style="padding:12px; font-weight:600; color:var(--dark-bg);">Physics</td>
              <td style="padding:12px; font-weight:600; color:var(--dark-bg);">Chemistry</td>
              <td style="padding:12px; font-weight:600; color:var(--dark-bg);">Comp Sci</td>
              <td style="padding:12px; font-weight:600; color:var(--dark-bg);">Comp Sci</td>
              <td style="padding:12px; font-weight:600; color:var(--dark-bg);">Math</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  // 11. Render Classroom Settings View (School Admin only)
  function renderSettingsView(target) {
    target.innerHTML = `
      <h3 style="margin:0 0 6px 0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">Workspace Settings</h3>
      <p style="margin:0 0 20px 0; font-size:0.8rem; color:var(--text-muted);">Perform administrative operations or manage workspace configurations.</p>
      
      <div style="background:var(--white); border:1px solid var(--border-color); border-radius:12px; padding:20px; margin-bottom:20px;">
        <h4 style="margin:0 0 14px 0; font-size:0.88rem; font-weight:800; color:var(--dark-bg);">Classroom Actions</h4>
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div>
            <label style="display:block; font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px;">Danger Zone Operations</label>
            <button id="btn-delete-classroom-ws" class="btn btn-secondary" style="padding:9px 18px; font-size:0.82rem; font-weight:700; border-color:#EF4444; color:#EF4444;"
                    onmouseover="this.style.background='#FEF2F2'" onmouseout="this.style.background='none'">
              Delete Classroom Workspace
            </button>
            <p style="margin:6px 0 0 0; font-size:0.72rem; color:var(--text-muted);">Note: Classroom deletion is strictly restricted to School Admins.</p>
          </div>
        </div>
      </div>
    `;

    const delBtn = document.getElementById('btn-delete-classroom-ws');
    if (delBtn) {
      delBtn.onclick = () => {
        if (currentWorkspaceRole !== 'admin') {
          alert('Error: Restricted. Only School Admins can delete classrooms.');
          return;
        }
        openDeleteConfirmModal(currentWorkspaceId);
      };
    }
  }

  // 12. Class Teacher specific: Student Onboarding Queue
  function renderStudentManagementQueue(target) {
    target.innerHTML = `
      <h3 style="margin:0 0 8px 0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">Student Onboarding Queue</h3>
      <p style="margin:0 0 16px 0; font-size:0.8rem; color:var(--text-muted);">Approve new students joining via the invite codes.</p>
      <div style="border-radius:12px; border:1px solid var(--border-color); overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; font-size:0.82rem; text-align:left;">
          <thead>
            <tr style="background:var(--bg-light); border-bottom:1px solid var(--border-color); font-weight:700;">
              <th style="padding:10px 14px;">Student Name</th>
              <th style="padding:10px 14px;">Admission No</th>
              <th style="padding:10px 14px;">Request Date</th>
              <th style="padding:10px 14px; text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid var(--border-color);">
              <td style="padding:10px 14px; font-weight:700; color:var(--dark-bg);">Zeeshan Khan</td>
              <td style="padding:10px 14px; color:var(--text-muted);">ADM2026012</td>
              <td style="padding:10px 14px; color:var(--text-muted);">Yesterday</td>
              <td style="padding:10px 14px; text-align:right;">
                <button class="btn btn-primary" style="padding:4px 8px; font-size:0.7rem; font-weight:700;" onclick="alert('Student approved!'); this.disabled=true; this.textContent='Approved';">Approve</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  // 13. Class Teacher specific: Parent Link Requests
  function renderParentRequestsQueue(target) {
    target.innerHTML = `
      <h3 style="margin:0 0 8px 0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">Parent Connection Requests</h3>
      <p style="margin:0 0 16px 0; font-size:0.8rem; color:var(--text-muted);">Approve parents requesting access to monitor child metrics.</p>
      <div style="border-radius:12px; border:1px solid var(--border-color); overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; font-size:0.82rem; text-align:left;">
          <thead>
            <tr style="background:var(--bg-light); border-bottom:1px solid var(--border-color); font-weight:700;">
              <th style="padding:10px 14px;">Parent Name</th>
              <th style="padding:10px 14px;">Child Student</th>
              <th style="padding:10px 14px;">Connection Request</th>
              <th style="padding:10px 14px; text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid var(--border-color);">
              <td style="padding:10px 14px; font-weight:700; color:var(--dark-bg);">Naeem Khan</td>
              <td style="padding:10px 14px; color:var(--text-muted);">Ahmed Khan (Roll: 09A-01)</td>
              <td style="padding:10px 14px; color:var(--text-muted);">Pending Review</td>
              <td style="padding:10px 14px; text-align:right;">
                <button class="btn btn-primary" style="padding:4px 8px; font-size:0.7rem; font-weight:700;" onclick="alert('Parent connection approved!'); this.disabled=true; this.textContent='Linked';">Link Account</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  // 14. Class Teacher specific: Behaviour Notes
  function renderBehaviourLogs(target) {
    target.innerHTML = `
      <h3 style="margin:0 0 8px 0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">Behaviour Logs & Warning Records</h3>
      <p style="margin:0 0 16px 0; font-size:0.8rem; color:var(--text-muted);">Logs warning notes or positive conduct feedback for the classroom.</p>
      <button class="btn btn-primary" style="padding:8px 14px; font-size:0.78rem; font-weight:700; margin-bottom:16px;" onclick="alert('Placeholder: Logging behaviour note...')">+ Log Behaviour Entry</button>
      
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div style="background:#FFFDF5; border:1px solid #FCD34D; border-radius:10px; padding:14px;">
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:700; color:#B45309; margin-bottom:6px;">
            <span>⚠️ Warning Issued</span>
            <span>04 Jul 2026</span>
          </div>
          <strong style="font-size:0.82rem; color:var(--dark-bg);">Raza Ali (09B-01)</strong>
          <p style="margin:4px 0 0 0; font-size:0.78rem; color:var(--text-main);">Disrupting lecture and incomplete homework submission twice in a row.</p>
        </div>
      </div>
    `;
  }

  // 15. Class Teacher specific: Leave Requests
  function renderLeaveRequests(target) {
    target.innerHTML = `
      <h3 style="margin:0 0 8px 0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">Student Leave Requests</h3>
      <p style="margin:0 0 16px 0; font-size:0.8rem; color:var(--text-muted);">Approve or reject student leave requests submitted online.</p>
      <div style="border-radius:12px; border:1px solid var(--border-color); overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; font-size:0.82rem; text-align:left;">
          <thead>
            <tr style="background:var(--bg-light); border-bottom:1px solid var(--border-color); font-weight:700;">
              <th style="padding:10px 14px;">Student Name</th>
              <th style="padding:10px 14px;">Reason</th>
              <th style="padding:10px 14px;">Duration</th>
              <th style="padding:10px 14px; text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid var(--border-color);">
              <td style="padding:10px 14px; font-weight:700; color:var(--dark-bg);">Priya Mehta</td>
              <td style="padding:10px 14px; color:var(--text-muted);">Family Function</td>
              <td style="padding:10px 14px; color:var(--text-muted);">08 Jul - 09 Jul</td>
              <td style="padding:10px 14px; text-align:right; display:flex; gap:6px; justify-content:flex-end;">
                <button class="btn btn-primary" style="padding:4px 8px; font-size:0.7rem; font-weight:700;" onclick="alert('Approved!'); this.parentElement.innerHTML='Approved';">Approve</button>
                <button class="btn btn-secondary" style="padding:4px 8px; font-size:0.7rem; font-weight:700; border-color:#EF4444; color:#EF4444;" onclick="alert('Rejected!'); this.parentElement.innerHTML='Rejected';">Reject</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  // 16. Class Teacher / Admin: Performance Analytics Reports
  function renderAnalyticsReports(target) {
    target.innerHTML = `
      <h3 style="margin:0 0 8px 0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">Class Performance Analytics</h3>
      <p style="margin:0 0 20px 0; font-size:0.8rem; color:var(--text-muted);">Compare students average scores and attendance trends visually.</p>
      
      <div style="background:var(--white); border:1px solid var(--border-color); border-radius:12px; padding:20px; margin-bottom:20px; text-align:center;">
        <h4 style="margin:0 0 14px 0; font-size:0.85rem; font-weight:800; color:var(--dark-bg);">Test Marks Average (Unit Test 1)</h4>
        <div style="display:flex; align-items:flex-end; justify-content:space-around; height:120px;">
          <div style="display:flex; flex-direction:column; align-items:center; gap:6px; width:45px;"><div style="height:76px; width:100%; background:linear-gradient(to top, var(--primary), #818CF8); border-radius:4px;"></div><span style="font-size:0.68rem; font-weight:700;">Math</span></div>
          <div style="display:flex; flex-direction:column; align-items:center; gap:6px; width:45px;"><div style="height:84px; width:100%; background:linear-gradient(to top, var(--primary), #818CF8); border-radius:4px;"></div><span style="font-size:0.68rem; font-weight:700;">Physics</span></div>
          <div style="display:flex; flex-direction:column; align-items:center; gap:6px; width:45px;"><div style="height:62px; width:100%; background:linear-gradient(to top, var(--primary), #818CF8); border-radius:4px;"></div><span style="font-size:0.68rem; font-weight:700;">Comp Sci</span></div>
        </div>
      </div>
    `;
  }

  // Helper views for Admin View
  function renderTeachersListView(target) {
    const cr = classrooms.find(item => item.id === currentWorkspaceId);
    if (!cr) {
      target.innerHTML = '<p>Classroom not found.</p>';
      return;
    }

    const list = [];
    
    // Add Class Teacher first if assigned
    if (cr.classTeacherId && cr.classTeacherId !== 'Unassigned') {
      const name = getTeacherName(cr.classTeacherId);
      list.push({
        name: name,
        role: 'Class Teacher',
        initials: name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
      });
    }

    // Add Subject Teachers
    const classSubs = classroomSubjects.filter(cs => cs.classroomId === cr.id);
    classSubs.forEach(cs => {
      if (cs.teacherId && cs.teacherId !== 'Unassigned') {
        const name = getTeacherName(cs.teacherId);
        const subName = getSubjectName(cs.subjectId);
        // Avoid duplicate entry if Class Teacher is also a subject teacher
        if (!list.some(item => item.name === name)) {
          list.push({
            name: name,
            role: `${subName} Teacher`,
            initials: name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
          });
        }
      }
    });

    if (list.length === 0) {
      target.innerHTML = `
        <h3 style="margin:0 0 16px 0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">Assigned Classroom Teachers</h3>
        <div style="padding:20px; text-align:center; background:#fff; border:1px solid var(--border-color); border-radius:12px; color:var(--text-muted);">
          No teachers assigned to this classroom yet.
        </div>
      `;
      return;
    }

    target.innerHTML = `
      <h3 style="margin:0 0 16px 0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">Assigned Classroom Teachers</h3>
      <div style="display:flex; flex-direction:column; gap:12px;">
        ${list.map(t => `
          <div style="background:#fff; border:1px solid var(--border-color); border-radius:12px; padding:16px; display:flex; align-items:center; gap:12px;">
            <div style="width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,var(--primary),#818CF8); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:0.75rem; flex-shrink:0;">${t.initials || 'TR'}</div>
            <div>
              <h4 style="margin:0; font-size:0.88rem; font-weight:700; color:var(--dark-bg);">${t.name}</h4>
              <p style="margin:2px 0 0 0; font-size:0.78rem; color:var(--text-muted);">${t.role}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderParentsListView(target) {
    target.innerHTML = `
      <h3 style="margin:0 0 16px 0; font-size:1.15rem; font-weight:800; color:var(--dark-bg);">Linked Parents Directory</h3>
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div style="background:#fff; border:1px solid var(--border-color); border-radius:12px; padding:16px;">
          <h4 style="margin:0; font-size:0.88rem; font-weight:700; color:var(--dark-bg);">Naeem Khan</h4>
          <p style="margin:2px 0 0 0; font-size:0.78rem; color:var(--text-muted);">Parent of Ahmed Khan (Roll: 09A-01)</p>
          <div style="margin-top:6px; font-size:0.74rem; color:var(--text-muted);">Email: naeem@gmail.com · Phone: +91 9000000001</div>
        </div>
      </div>
    `;
  }

  // Hook workspace page bindings
  function setupWorkspaceEvents() {
    // 1. Back button click handler
    const backBtn = document.getElementById('btn-workspace-back');
    if (backBtn) {
      backBtn.onclick = () => {
        if (window.location.pathname.includes('classroom.html')) {
          const wsTab = document.getElementById('classroom-workspace-tab');
          if (wsTab) {
            wsTab.classList.remove('active');
            wsTab.style.display = 'none';
          }
          const hubTab = document.getElementById('teacher-classroom-hub-tab');
          if (hubTab) {
            hubTab.classList.add('active');
            hubTab.style.display = 'block';
          }
          const titleEl = document.getElementById('top-bar-title');
          if (titleEl) titleEl.textContent = 'Teacher Classroom Hub';
          return;
        }

        // Remove active class from workspace tab
        const wsTab = document.getElementById('classroom-workspace-tab');
        if (wsTab) wsTab.classList.remove('active');

        // Restore main classrooms tab
        const crTab = document.getElementById('classrooms-tab');
        if (crTab) crTab.classList.add('active');

        // Update Topbar Title
        const titleEl = document.getElementById('top-bar-title');
        if (titleEl) titleEl.textContent = 'Classroom Management';

        // Re-render classrooms list
        renderActiveSubpanel();
      };
    }

    // 2. Role switcher selector event listener
    const switcher = document.getElementById('workspace-role-switcher');
    if (switcher) {
      switcher.onchange = () => {
        currentWorkspaceRole = switcher.value;

        // Default active view to the first allowed link in the new role menu
        const menuList = roleMenus[currentWorkspaceRole] || [];
        if (menuList.length > 0) {
          currentWorkspaceView = menuList[0].id;
        }

        renderWorkspaceSidebar();
        renderWorkspaceContent();
        showToastMessage(`Role simulated as: ${currentWorkspaceRole.replace('_', ' ').toUpperCase()}`, 'info');
      };
    }

    // 3. Common tabs bar horizontal clicks
    document.querySelectorAll('.workspace-tab-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const tab = btn.getAttribute('data-workspace-tab');
        currentWorkspaceView = tab;
        renderWorkspaceSidebar();
        renderWorkspaceContent();
      };
    });
  }

  // Override standard classrooms view modal or re-bind view button
  const originalRenderAllClassroomsTable = renderAllClassroomsTable;
  renderAllClassroomsTable = function() {
    originalRenderAllClassroomsTable();
    // Rebind view buttons to open the Classroom Workspace instead of simple view modal
    document.querySelectorAll('.btn-view-cr').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        openClassroomWorkspace(btn.getAttribute('data-id'));
      };
    });
  };

  const originalRenderClassTeachersTable = renderClassTeachersTable;
  renderClassTeachersTable = function() {
    originalRenderClassTeachersTable();
    // Also bind View button in Teachers list if exists
    document.querySelectorAll('.btn-view-cr').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        openClassroomWorkspace(btn.getAttribute('data-id'));
      };
    });
  };

  // Wire workspace setup on module initiation
  const originalInitClassroomsTab = initClassroomsTab;
  initClassroomsTab = function() {
    originalInitClassroomsTab();
    setupWorkspaceEvents();
    syncAllFromSupabase();
  };

  // Export module function globally so dashboard can call it
  window.initClassroomsTab = initClassroomsTab;
  window.openClassroomWorkspace = openClassroomWorkspace;

})();

