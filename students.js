/**
 * CampusLink – Student Management Module (Phase 4)
 * Full CRUD student management with 5 sub-tabs:
 * All Students | New Admissions | Active Students | Alumni/Graduated | Student Overview
 */

(function () {
  'use strict';

  // ─── Default Fallback Data ─────────────────────────────────────────────────

  const DEFAULT_YEARS = [
    { id: 'ay_001', name: '2025-2026', status: 'active', isCurrent: false },
    { id: 'ay_002', name: '2026-2027', status: 'active', isCurrent: true }
  ];

  const DEFAULT_CLASSES = [
    { id: 'cls_001', name: 'Class 9', section: 'A', status: 'active', academicYearId: 'ay_002' },
    { id: 'cls_002', name: 'Class 9', section: 'B', status: 'active', academicYearId: 'ay_002' },
    { id: 'cls_003', name: 'Class 10', section: 'A', status: 'active', academicYearId: 'ay_002' },
    { id: 'cls_004', name: 'Class 10', section: 'B', status: 'active', academicYearId: 'ay_002' },
    { id: 'cls_005', name: 'Class 11', section: 'A', status: 'active', academicYearId: 'ay_002' },
    { id: 'cls_006', name: 'Class 12', section: 'A', status: 'active', academicYearId: 'ay_002' }
  ];

  const DEFAULT_STUDENTS = [];

  const DEFAULT_INVITES = [];

  // ─── State ─────────────────────────────────────────────────────────────────
  let students = [];
  let academicYears = [];
  let classes = [];
  let invites = [];
  let activeSubTab = 'all-students';
  let studentToDeleteId = null;

  // ─── Storage Helpers ───────────────────────────────────────────────────────
  function getStored(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw) { localStorage.setItem(key, JSON.stringify(fallback)); return fallback; }
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }
  function saveStored(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

  function getProfile() {
    try { return JSON.parse(localStorage.getItem('campuslink_profile')) || {}; } catch(e) { return {}; }
  }

  function loadDependencies() {
    const isLiveMode = window.CampusLink?.supabase && (localStorage.getItem('supabase.auth.token') || sessionStorage.getItem('sb-'));

    academicYears = getStored('campuslink_academic_years', isLiveMode ? [] : DEFAULT_YEARS);
    if (!isLiveMode && (!academicYears || academicYears.length === 0)) academicYears = DEFAULT_YEARS;

    classes = getStored('campuslink_classes', isLiveMode ? [] : DEFAULT_CLASSES);
    if (!isLiveMode && (!classes || classes.length === 0)) classes = DEFAULT_CLASSES;

    students = getStored('campuslink_students', isLiveMode ? [] : DEFAULT_STUDENTS);
    if (students && students.some(s => s.id && s.id.startsWith('stu_00'))) {
      students = [];
      saveStored('campuslink_students', students);
    }
    if (!isLiveMode && (!students || students.length === 0)) students = DEFAULT_STUDENTS;

    invites = getStored('campuslink_invites', DEFAULT_INVITES);
    if (!localStorage.getItem('campuslink_invites_cleaned_v3')) {
      invites = [];
      saveStored('campuslink_invites', invites);
      localStorage.setItem('campuslink_invites_cleaned_v3', 'true');
    }
    if (!invites) invites = [];
  }

  // ─── Supabase Synchronizer ────────────────────────────────────────────────
  async function syncStudentsFromSupabase() {
    const supabase = window.CampusLink?.supabase;
    const auth = window.CampusLink?.auth;
    if (!supabase || !auth) return;

    try {
      const user = await auth.getUser();
      if (!user) return;
      const school = await auth.getSchoolForUser(user.id);
      if (!school) return;
      const schoolId = school.id;

      const { data: dbStudents, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId);

      if (error) {
        console.warn('Error fetching students from Supabase:', error);
        return;
      }

      if (dbStudents) {
        students = dbStudents.map(s => ({
          id: s.id,
          schoolId: s.school_id,
          academicYearId: s.academic_year_id,
          classId: s.class_id,
          sectionId: s.section_id || 'A',
          username: s.username,
          campuslinkId: s.campuslink_id || ('CL-STU-' + s.id.substring(0, 6).toUpperCase()),
          admissionNumber: s.admission_number || '',
          rollNumber: s.roll_number || '',
          fullName: s.full_name,
          email: s.email || '',
          phone: s.phone || '',
          gender: s.gender || 'Male',
          dateOfBirth: s.date_of_birth || '',
          bloodGroup: s.blood_group || '',
          religion: s.religion || '',
          nationality: s.nationality || 'Indian',
          address: s.address || '',
          emergencyContact: s.emergency_contact || '',
          guardianName: s.guardian_name || '',
          guardianId: s.guardian_id || null,
          transportId: s.transport_id || null,
          house: s.house || '',
          status: s.status || 'pending',
          admissionDate: s.admission_date || '',
          createdAt: s.created_at,
          updatedAt: s.updated_at
        }));
        saveStored('campuslink_students', students);
      }
    } catch (err) {
      console.warn('syncStudentsFromSupabase exception:', err);
    }
  }

  // ─── Resolver Helpers ──────────────────────────────────────────────────────
  function getYearName(id) {
    const y = academicYears.find(function(a) { return a.id === id; });
    if (!y) return '\u2014';
    const prof = getProfile();
    const isCollege = (prof.institution_type && prof.institution_type !== 'school') || window.location.pathname.indexOf('college-dashboard.html') > -1;
    if (isCollege && y.name.indexOf('-') > -1) {
      return y.name.split('-')[1];
    }
    return y.name;
  }

  function getClassLabel(classId, sectionId) {
    const c = classes.find(function(cl) { return cl.id === classId; });
    if (!c) return sectionId ? ('- ' + sectionId) : '\u2014';
    const sec = c.section || sectionId || '';
    return sec ? (c.name + ' ' + sec) : c.name;
  }

  // ─── Status Badge ──────────────────────────────────────────────────────────
  function statusBadge(status) {
    const map = {
      active: 'background:#D1FAE5;color:#065F46',
      pending: 'background:#FEF3C7;color:#92400E',
      transferred: 'background:#DBEAFE;color:#1E40AF',
      graduated: 'background:#EDE9FE;color:#5B21B6',
      suspended: 'background:#FEE2E2;color:#991B1B',
      inactive: 'background:#F3F4F6;color:#6B7280'
    };
    const style = map[status] || map.inactive;
    return '<span style="' + style + ';padding:3px 10px;border-radius:20px;font-size:0.73rem;font-weight:700;text-transform:capitalize;white-space:nowrap;">' + status + '</span>';
  }

  // ─── Avatar Initials ───────────────────────────────────────────────────────
  function avatarHtml(student) {
    var colors = ['#6366F1','#EC4899','#14B8A6','#F59E0B','#8B5CF6','#EF4444','#10B981'];
    var c = colors[student.id.charCodeAt(student.id.length - 1) % colors.length];
    var initials = student.fullName.split(' ').map(function(w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
    return '<div style="width:36px;height:36px;border-radius:50%;background:' + c + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:800;flex-shrink:0;">' + initials + '</div>';
  }

  // ─── Filter Logic ──────────────────────────────────────────────────────────
  function getFilteredStudents(extraFilter) {
    var query = ((document.getElementById('student-search') || {}).value || '').trim().toLowerCase();
    var yearId = ((document.getElementById('student-filter-year') || {}).value || '');
    var classId = ((document.getElementById('student-filter-class') || {}).value || '');
    var section = ((document.getElementById('student-filter-section') || {}).value || '');
    var status = ((document.getElementById('student-filter-status') || {}).value || '');

    return students.filter(function(s) {
      if (extraFilter && !extraFilter(s)) return false;
      var label = (s.fullName + ' ' + s.username + ' ' + s.campuslinkId + ' ' + s.admissionNumber + ' ' + s.rollNumber).toLowerCase();
      var matchQ = !query || label.includes(query);
      var matchY = !yearId || s.academicYearId === yearId;
      var matchC = !classId || s.classId === classId;
      var matchSec = !section || (s.sectionId || '').toUpperCase() === section.toUpperCase();
      var matchSt = !status || s.status === status;
      return matchQ && matchY && matchC && matchSec && matchSt;
    });
  }

  // ─── Populate Filters ──────────────────────────────────────────────────────
  function populateFilters() {
    const prof = getProfile();
    const isCollege = (prof.institution_type && prof.institution_type !== 'school') || window.location.pathname.indexOf('college-dashboard.html') > -1;
    var yearSel = document.getElementById('student-filter-year');
    var classSel = document.getElementById('student-filter-class');
    var secSel = document.getElementById('student-filter-section');

    if (yearSel) {
      var h = '<option value="">' + (isCollege ? 'All Batch Years' : 'All Academic Years') + '</option>';
      academicYears.forEach(function(y) { h += '<option value="' + y.id + '">' + getYearName(y.id) + '</option>'; });
      yearSel.innerHTML = h;
    }
    if (classSel) {
      var h2 = '<option value="">' + (isCollege ? 'All Programs' : 'All Classes') + '</option>';
      var seen = new Set();
      classes.forEach(function(c) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          h2 += '<option value="' + c.id + '">' + c.name + ' ' + (c.section || '') + '</option>';
        }
      });
      classSel.innerHTML = h2;
    }
    if (secSel) {
      var secs = Array.from(new Set(students.map(function(s) { return s.sectionId; }).filter(Boolean))).sort();
      var h3 = '<option value="">All Sections</option>';
      secs.forEach(function(s) { h3 += '<option value="' + s + '">' + s + '</option>'; });
      secSel.innerHTML = h3;
    }
  }

  // ─── Populate Modal Dropdowns ──────────────────────────────────────────────
  function populateModalDropdowns() {
    const prof = getProfile();
    const isCollege = (prof.institution_type && prof.institution_type !== 'school') || window.location.pathname.indexOf('college-dashboard.html') > -1;
    var yearSel = document.getElementById('student-modal-year');
    var classSel = document.getElementById('student-modal-class');

    if (yearSel) {
      var h = '<option value="">' + (isCollege ? 'Select Batch Year *' : 'Select Academic Year *') + '</option>';
      academicYears.forEach(function(y) { h += '<option value="' + y.id + '">' + getYearName(y.id) + '</option>'; });
      yearSel.innerHTML = h;
    }
    if (classSel) {
      var h2 = '<option value="">' + (isCollege ? 'Select Program & Section *' : 'Select Class & Section *') + '</option>';
      classes.forEach(function(c) {
        var label = c.section ? (c.name + ' - ' + c.section) : c.name;
        h2 += '<option value="' + c.id + '|' + (c.section || '') + '">' + label + '</option>';
      });
      classSel.innerHTML = h2;
    }
  }

  // ─── Table Builder ─────────────────────────────────────────────────────────
  function buildStudentsTable(list, tbodyId, actionsFn) {
    var tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:48px;color:var(--text-muted);"><div style="font-size:2.5rem;margin-bottom:12px;">&#128100;</div><div style="font-weight:600;font-size:0.9rem;">No students found</div><div style="font-size:0.8rem;margin-top:4px;">Try adjusting your search or filters</div></td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function(s) {
      return '<tr>' +
        '<td><div style="display:flex;align-items:center;gap:10px;">' + avatarHtml(s) +
          '<div><div style="font-weight:700;font-size:0.85rem;color:var(--dark-bg);">' + s.fullName + '</div>' +
          '<div style="font-size:0.73rem;color:var(--text-muted);">@' + s.username + '</div></div></div></td>' +
        '<td style="font-size:0.82rem;color:var(--text-muted);">' + s.campuslinkId + '</td>' +
        '<td style="font-size:0.82rem;">' + s.admissionNumber + '</td>' +
        '<td style="font-size:0.82rem;font-weight:600;">' + s.rollNumber + '</td>' +
        '<td style="font-size:0.8rem;">' + getYearName(s.academicYearId) + '</td>' +
        '<td style="font-size:0.82rem;">' + getClassLabel(s.classId, s.sectionId) + '</td>' +
        '<td>' + statusBadge(s.status) + '</td>' +
        '<td><div style="display:flex;gap:6px;flex-wrap:wrap;">' + actionsFn(s) + '</div></td>' +
      '</tr>';
    }).join('');
    bindActionBtns(tbody);
  }

  function btn(cls, label, id, style) {
    return '<button class="' + cls + '" data-id="' + id + '" style="padding:5px 10px;font-size:0.73rem;border-radius:5px;cursor:pointer;white-space:nowrap;border:none;' + (style || '') + '">' + label + '</button>';
  }

  function bindActionBtns(container) {
    container.querySelectorAll('.btn-stu-view').forEach(function(b) { b.onclick = function() { openViewModal(b.dataset.id); }; });
    container.querySelectorAll('.btn-stu-edit').forEach(function(b) { b.onclick = function() { openAddEditModal(b.dataset.id); }; });
    container.querySelectorAll('.btn-stu-delete').forEach(function(b) { b.onclick = function() { openDeleteModal(b.dataset.id); }; });
    container.querySelectorAll('.btn-stu-approve').forEach(function(b) { b.onclick = function() { quickStatus(b.dataset.id, 'active'); }; });
    container.querySelectorAll('.btn-stu-reject').forEach(function(b) { b.onclick = function() { quickStatus(b.dataset.id, 'inactive'); }; });
    container.querySelectorAll('.btn-stu-transfer').forEach(function(b) { b.onclick = function() { openTransferModal(b.dataset.id); }; });
    container.querySelectorAll('.btn-stu-promote').forEach(function(b) { b.onclick = function() { openPromoteModal(b.dataset.id); }; });
    container.querySelectorAll('.btn-stu-profile').forEach(function(b) { b.onclick = function() { openViewModal(b.dataset.id); }; });
    container.querySelectorAll('.btn-stu-restore').forEach(function(b) { b.onclick = function() { quickStatus(b.dataset.id, 'active'); }; });
  }

  // ─── Renderers ─────────────────────────────────────────────────────────────
  function renderAllStudents() {
    var list = getFilteredStudents(null);
    buildStudentsTable(list, 'students-all-tbody', function(s) {
      return btn('btn-stu-view', '&#128065; View', s.id, 'background:#EEF2FF;color:#4F46E5;') +
             btn('btn-stu-edit', '&#9998; Edit', s.id, 'background:#F0FDF4;color:#16A34A;') +
             btn('btn-stu-delete', '&#128465;', s.id, 'background:#FEF2F2;color:#DC2626;');
    });
    var cnt = document.getElementById('students-all-count');
    if (cnt) cnt.textContent = list.length + ' student' + (list.length !== 1 ? 's' : '');
  }

  function renderByBatch() {
    var container = document.getElementById('student-batch-groups');
    if (!container) return;

    var search = (document.getElementById('student-search')?.value || '').toLowerCase();
    var filtered = students.filter(function(s) {
      return s.status === 'active' || s.status === 'pending';
    });

    if (search) {
      filtered = filtered.filter(function(s) {
        return (s.fullName || '').toLowerCase().indexOf(search) > -1 || (s.username || '').toLowerCase().indexOf(search) > -1;
      });
    }

    var groups = {};
    filtered.forEach(function(s) {
      var yr = getYearName(s.academicYearId) || 'Unknown';
      if (!groups[yr]) groups[yr] = [];
      groups[yr].push(s);
    });

    var sortedYears = Object.keys(groups).sort(function(a, b) {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return b.localeCompare(a);
    });

    if (sortedYears.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">No student records yet.</div>';
      return;
    }

    container.innerHTML = sortedYears.map(function(yr) {
      var members = groups[yr];
      var programs = Array.from(new Set(members.map(function(m) {
        return getClassLabel(m.classId, m.sectionId);
      }).filter(Boolean))).join(', ') || 'N/A';

      const prof = getProfile();
      const isCollege = (prof.institution_type && prof.institution_type !== 'school') || window.location.pathname.indexOf('college-dashboard.html') > -1;
      var batchTitle = isCollege ? ('Batch of ' + yr) : ('Academic Year: ' + yr);

      var cardsHtml = members.map(function(s) {
        var initials = s.fullName ? s.fullName.split(' ').map(function(w) { return w[0]; }).join('').substring(0, 2).toUpperCase() : '?';
        var colors = ['#6366F1', '#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B'];
        var color = colors[(s.fullName || 'A').charCodeAt(0) % colors.length];
        
        return '<div class="btn-stu-view-card" data-id="' + s.id + '" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--border-color);border-radius:var(--radius-sm);cursor:pointer;transition:all 0.15s;background:var(--white);">' +
          '<div style="width:28px;height:28px;border-radius:50%;background:' + color + ';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.7rem;flex-shrink:0;">' + initials + '</div>' +
          '<div><div style="font-weight:600;font-size:0.82rem;color:var(--text-main);">' + s.fullName + '</div><div style="font-size:0.72rem;color:var(--text-muted);">' + getClassLabel(s.classId, s.sectionId) + '</div></div>' +
        '</div>';
      }).join('');

      return '<div style="border:1px solid var(--border-color);border-radius:var(--radius-md);overflow:hidden;margin-bottom:16px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 20px;background:var(--bg-secondary);border-bottom:1px solid var(--border-color);">' +
          '<div>' +
            '<span style="font-size:1rem;font-weight:800;color:var(--text-main);">' + batchTitle + '</span>' +
            '<span style="font-size:0.78rem;color:var(--text-muted);margin-left:12px;">' + programs + '</span>' +
          '</div>' +
          '<span style="font-size:0.8rem;font-weight:700;background:var(--primary-light);color:var(--primary);padding:4px 12px;border-radius:99px;">' + members.length + ' students</span>' +
        '</div>' +
        '<div style="padding:16px;display:flex;flex-wrap:wrap;gap:10px;">' +
          cardsHtml +
        '</div>' +
      '</div>';
    }).join('');

    container.querySelectorAll('.btn-stu-view-card').forEach(function(b) {
      b.onclick = function() { openViewModal(b.dataset.id); };
    });
  }

  function renderNewAdmissions() {
    var list = getFilteredStudents(function(s) { return s.status === 'pending'; });
    buildStudentsTable(list, 'students-admissions-tbody', function(s) {
      return btn('btn-stu-approve', '&#10003; Approve', s.id, 'background:#D1FAE5;color:#065F46;') +
             btn('btn-stu-reject', '&#10005; Reject', s.id, 'background:#FEE2E2;color:#991B1B;') +
             btn('btn-stu-view', '&#128065; View', s.id, 'background:#EEF2FF;color:#4F46E5;');
    });
    var cnt = document.getElementById('students-admissions-count');
    if (cnt) cnt.textContent = list.length + ' pending';
  }

  function renderActiveStudents() {
    var list = getFilteredStudents(function(s) { return s.status === 'active'; });
    buildStudentsTable(list, 'students-active-tbody', function(s) {
      return btn('btn-stu-edit', '&#9998; Edit', s.id, 'background:#F0FDF4;color:#16A34A;') +
             btn('btn-stu-transfer', '&#8596; Transfer', s.id, 'background:#EEF2FF;color:#4F46E5;') +
             btn('btn-stu-promote', '&#8593; Promote', s.id, 'background:#FFF7ED;color:#C2410C;') +
             btn('btn-stu-profile', '&#128065; Profile', s.id, 'background:#F3F4F6;color:#374151;');
    });
    var cnt = document.getElementById('students-active-count');
    if (cnt) cnt.textContent = list.length + ' active';
  }

  function renderAlumni() {
    var list = getFilteredStudents(function(s) { return s.status === 'graduated' || s.status === 'transferred'; });
    buildStudentsTable(list, 'students-alumni-tbody', function(s) {
      return btn('btn-stu-profile', '&#128065; Profile', s.id, 'background:#EDE9FE;color:#5B21B6;') +
             btn('btn-stu-restore', '&#8635; Restore', s.id, 'background:#F0FDF4;color:#16A34A;');
    });
    var cnt = document.getElementById('students-alumni-count');
    if (cnt) cnt.textContent = list.length + ' records';
  }

  function renderOverview() {
    var total = students.length;
    var active = students.filter(function(s) { return s.status === 'active'; }).length;
    var pending = students.filter(function(s) { return s.status === 'pending'; }).length;
    var graduated = students.filter(function(s) { return s.status === 'graduated'; }).length;
    var male = students.filter(function(s) { return s.gender === 'Male'; }).length;
    var female = students.filter(function(s) { return s.gender === 'Female'; }).length;

    setEl('ov-total', total);
    setEl('ov-active', active);
    setEl('ov-pending', pending);
    setEl('ov-graduated', graduated);
    setEl('ov-male', male);
    setEl('ov-female', female);

    var distEl = document.getElementById('ov-class-distribution');
    if (distEl && total > 0) {
      var byClass = {};
      students.forEach(function(s) {
        var label = getClassLabel(s.classId, s.sectionId);
        byClass[label] = (byClass[label] || 0) + 1;
      });
      distEl.innerHTML = Object.entries(byClass).sort().map(function(entry) {
        var label = entry[0], count = entry[1];
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-color);">' +
          '<span style="font-size:0.85rem;font-weight:600;">' + label + '</span>' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<div style="width:80px;height:6px;background:var(--light-bg);border-radius:3px;overflow:hidden;"><div style="width:' + Math.min(100, (count/total)*100) + '%;height:100%;background:var(--primary);border-radius:3px;"></div></div>' +
            '<span style="font-size:0.82rem;color:var(--text-muted);min-width:20px;text-align:right;">' + count + '</span>' +
          '</div></div>';
      }).join('');
    }

    var statusDistEl = document.getElementById('ov-status-distribution');
    if (statusDistEl) {
      var statuses = ['active','pending','transferred','graduated','suspended','inactive'];
      var colors = { active:'#10B981', pending:'#F59E0B', transferred:'#3B82F6', graduated:'#8B5CF6', suspended:'#EF4444', inactive:'#9CA3AF' };
      statusDistEl.innerHTML = statuses.map(function(st) {
        var count = students.filter(function(s) { return s.status === st; }).length;
        if (count === 0) return '';
        return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;">' +
          '<div style="width:10px;height:10px;border-radius:50%;background:' + colors[st] + ';flex-shrink:0;"></div>' +
          '<span style="font-size:0.85rem;flex:1;text-transform:capitalize;">' + st + '</span>' +
          '<span style="font-size:0.85rem;font-weight:700;">' + count + '</span></div>';
      }).join('');
    }
  }

  function setEl(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }

  function renderActiveSubpanel() {
    loadDependencies();
    if (activeSubTab === 'all-students') renderAllStudents();
    else if (activeSubTab === 'by-batch') renderByBatch();
    else if (activeSubTab === 'new-admissions') renderNewAdmissions();
    else if (activeSubTab === 'active-students') renderActiveStudents();
    else if (activeSubTab === 'alumni') renderAlumni();
    else if (activeSubTab === 'invite-links') renderInviteLinks();
    else if (activeSubTab === 'overview') renderOverview();
  }

  // ─── Quick Status ──────────────────────────────────────────────────────────
  function quickStatus(id, status) {
    var idx = students.findIndex(function(s) { return s.id === id; });
    if (idx < 0) return;
    var oldStatus = students[idx].status;
    students[idx].status = status;
    students[idx].updatedAt = new Date().toISOString();
    saveStored('campuslink_students', students);

    // If approved and was pending, check for inviteCode increment
    if (status === 'active' && oldStatus === 'pending' && students[idx].inviteCode) {
      loadDependencies(); // Ensure fresh invites state
      var invite = invites.find(function(inv) { return inv.inviteCode === students[idx].inviteCode; });
      if (invite) {
        invite.joinedCount = (invite.joinedCount || 0) + 1;
        saveStored('campuslink_invites', invites);
      }
    }

    renderActiveSubpanel();
    populateFilters();
    toast('Student status updated to "' + status + '".');
  }

  // ─── Invite Links Functions ────────────────────────────────────────────────
  function renderInviteLinks() {
    var searchVal = ((document.getElementById('invite-search') || {}).value || '').trim().toLowerCase();
    var statusVal = ((document.getElementById('invite-status-filter') || {}).value || '');

    var filtered = invites.filter(function(inv) {
      var classLabel = getClassLabel(inv.classId, inv.sectionId).toLowerCase();
      var code = inv.inviteCode.toLowerCase();
      var matchSearch = !searchVal || classLabel.includes(searchVal) || code.includes(searchVal);
      var matchStatus = !statusVal || inv.status === statusVal;
      return matchSearch && matchStatus;
    });

    var tbody = document.getElementById('student-invites-tbody');
    var countEl = document.getElementById('student-invites-count');
    if (countEl) {
      countEl.textContent = filtered.length + ' invitation' + (filtered.length !== 1 ? 's' : '') + ' generated';
    }

    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:48px;color:var(--text-muted);"><div style="font-size:2.5rem;margin-bottom:12px;">✉️</div><div style="font-weight:600;font-size:0.9rem;">No invitations found</div><div style="font-size:0.8rem;margin-top:4px;">Try generating a new link above</div></td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(function(inv) {
      var statusStyle = inv.status === 'active' ? 'background:#D1FAE5;color:#065F46;' : 'background:#F3F4F6;color:#6B7280;';
      var statusText = inv.status === 'active' ? 'Active' : 'Disabled';
      var formattedDate = new Date(inv.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

      var disableBtnText = inv.status === 'active' ? 'Disable' : 'Enable';
      var disableBtnStyle = inv.status === 'active' ? 'background:#FEF2F2;color:#DC2626;' : 'background:#F0FDF4;color:#16A34A;';

      var filledCount = students.filter(function(s) {
        return (s.inviteCode || '').trim().toUpperCase() === inv.inviteCode.trim().toUpperCase();
      }).length;

      var joinedCount = students.filter(function(s) {
        return (s.inviteCode || '').trim().toUpperCase() === inv.inviteCode.trim().toUpperCase() && s.status === 'active';
      }).length;

      return '<tr>' +
        '<td style="font-size:0.85rem;font-weight:600;">' + getYearName(inv.academicYearId) + '</td>' +
        '<td style="font-size:0.85rem;font-weight:700;color:#1e293b;">' + getClassLabel(inv.classId, inv.sectionId) + '</td>' +
        '<td style="font-family:monospace;font-size:0.85rem;font-weight:700;color:var(--primary);cursor:pointer;text-decoration:underline;" class="btn-browse-invite-students" data-code="' + inv.inviteCode + '">' + inv.inviteCode + '</td>' +
        '<td><span style="' + statusStyle + 'padding:2px 8px;border-radius:20px;font-size:0.7rem;font-weight:700;">' + statusText + '</span></td>' +
        '<td style="font-size:0.9rem;font-weight:700;color:var(--primary);cursor:pointer;text-decoration:underline;letter-spacing:-0.5px;" class="btn-browse-invite-students" data-code="' + inv.inviteCode + '" title="Click to view filled requests">' + filledCount + '</td>' +
        '<td style="font-size:0.9rem;font-weight:700;color:#10B981;cursor:pointer;text-decoration:underline;letter-spacing:-0.5px;" class="btn-browse-invite-students" data-code="' + inv.inviteCode + '" title="Click to view approved students">' + joinedCount + '</td>' +
        '<td style="font-size:0.8rem;color:var(--text-muted);">' + formattedDate + '</td>' +
        '<td>' +
          '<div style="display:flex;gap:6px;">' +
            '<button class="btn-invite-copy" data-code="' + inv.inviteCode + '" style="padding:4px 8px;font-size:0.72rem;background:#EEF2FF;color:#4F46E5;border:none;border-radius:4px;cursor:pointer;">Copy</button>' +
            '<button class="btn-invite-qr" data-code="' + inv.inviteCode + '" data-class="' + getClassLabel(inv.classId, inv.sectionId) + '" data-year="' + getYearName(inv.academicYearId) + '" style="padding:4px 8px;font-size:0.72rem;background:#FFF7ED;color:#C2410C;border:none;border-radius:4px;cursor:pointer;">QR</button>' +
            '<button class="btn-invite-toggle" data-id="' + inv.id + '" style="padding:4px 8px;font-size:0.72rem;border:none;border-radius:4px;cursor:pointer;' + disableBtnStyle + '">' + disableBtnText + '</button>' +
            '<button class="btn-invite-delete" data-id="' + inv.id + '" style="padding:4px 8px;font-size:0.72rem;background:#FEF2F2;color:#DC2626;border:none;border-radius:4px;cursor:pointer;">Delete</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');

    // Bind action events
    tbody.querySelectorAll('.btn-invite-copy').forEach(function(btn) {
      btn.onclick = function() {
        var code = btn.dataset.code;
        var link = window.location.origin + '/join-school.html?code=' + code;
        navigator.clipboard.writeText(link).then(function() {
          toast('Invitation link copied to clipboard!');
        }).catch(function() {
          toast('Failed to copy. Link: ' + link, 'error');
        });
      };
    });

    tbody.querySelectorAll('.btn-invite-qr').forEach(function(btn) {
      btn.onclick = function() {
        openQRModal(btn.dataset.code, btn.dataset.class, btn.dataset.year);
      };
    });

    tbody.querySelectorAll('.btn-browse-invite-students').forEach(function(el) {
      el.onclick = function() {
        openBrowseStudentsModal(el.dataset.code);
      };
    });

    tbody.querySelectorAll('.btn-invite-toggle').forEach(function(btn) {
      btn.onclick = function() {
        var id = btn.dataset.id;
        var idx = invites.findIndex(function(i) { return i.id === id; });
        if (idx !== -1) {
          invites[idx].status = invites[idx].status === 'active' ? 'disabled' : 'active';
          saveStored('campuslink_invites', invites);
          renderInviteLinks();
          toast('Invitation status updated.');
        }
      };
    });

    tbody.querySelectorAll('.btn-invite-delete').forEach(function(btn) {
      btn.onclick = function() {
        var id = btn.dataset.id;
        if (confirm('Are you sure you want to delete this invitation link?')) {
          invites = invites.filter(function(i) { return i.id !== id; });
          saveStored('campuslink_invites', invites);
          renderInviteLinks();
          toast('Invitation link deleted.', 'info');
        }
      };
    });

    // Update Pagination info
    var pagInfo = document.getElementById('invite-pagination-info');
    if (pagInfo) {
      pagInfo.textContent = 'Showing 1 to ' + filtered.length + ' of ' + filtered.length + ' entries';
    }
  }

  function openQRModal(code, classLabel, yearName) {
    var modal = document.getElementById('student-qr-modal');
    if (!modal) return;

    // Set header info
    document.getElementById('qr-modal-classroom').textContent = classLabel + ' (' + yearName + ')';
    document.getElementById('qr-modal-code').textContent = code;

    // Build the invite URL
    var inviteUrl = window.location.origin + '/join-school.html?code=' + code;
    var linkEl = document.getElementById('qr-modal-link');
    if (linkEl) linkEl.textContent = inviteUrl;

    modal.style.display = 'flex';
    modal.classList.add('active');

    // Wire Copy Link button
    var copyBtn = document.getElementById('qr-copy-link-btn');
    if (copyBtn) {
      copyBtn.onclick = function() {
        navigator.clipboard.writeText(inviteUrl).then(function() {
          copyBtn.textContent = 'Copied!';
          setTimeout(function() { copyBtn.textContent = 'Copy'; }, 2000);
        });
      };
    }

    // Load qrcode.js from CDN if not already loaded, then render
    function renderQR() {
      var canvas = document.getElementById('qr-canvas');
      if (!canvas) return;
      // Use QRCode library to draw on canvas
      QRCode.toCanvas(canvas, inviteUrl, {
        width: 220,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
        errorCorrectionLevel: 'H'
      }, function(err) {
        if (err) console.error('QR render error:', err);
        // Wire Download button after QR is drawn
        var dlBtn = document.getElementById('qr-download-btn');
        if (dlBtn) {
          dlBtn.onclick = function() {
            var link = document.createElement('a');
            link.download = 'invite-' + code + '.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
          };
        }
      });
    }

    if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
      renderQR();
    } else {
      var script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      // fallback: use the newer qrcode npm cdn
      script.onerror = function() {
        var s2 = document.createElement('script');
        s2.src = 'https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js';
        s2.onload = renderQR;
        document.head.appendChild(s2);
      };
      script.onload = function() {
        // qrcodejs exposes window.QRCode as a class not .toCanvas — detect which loaded
        if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
          renderQR();
        } else {
          // qrcodejs class-based — fallback to jsdelivr qrcode package
          var s2 = document.createElement('script');
          s2.src = 'https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js';
          s2.onload = renderQR;
          document.head.appendChild(s2);
        }
      };
      document.head.appendChild(script);
    }
  }

  function openBrowseStudentsModal(code) {
    var modal = document.getElementById('student-browse-invite-modal');
    if (!modal) return;

    document.getElementById('browse-modal-subtitle').textContent = 'Invite Code: ' + code;

    var searchInput = document.getElementById('browse-modal-search');
    if (searchInput) searchInput.value = '';

    function renderBrowseRows() {
      var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
      var matching = students.filter(function(s) {
        var codeMatch = (s.inviteCode || '').trim().toUpperCase() === code.trim().toUpperCase();
        var searchMatch = !query || 
          s.fullName.toLowerCase().includes(query) || 
          s.username.toLowerCase().includes(query);
        return codeMatch && searchMatch;
      });

      var tbody = document.getElementById('browse-modal-tbody');
      if (!tbody) return;

      if (matching.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted);">No registered students found using this code.</td></tr>';
        return;
      }

      tbody.innerHTML = matching.map(function(s) {
        var statusBadgeHtml = statusBadge(s.status);
        var joinedDate = s.admissionDate || new Date(s.createdAt || Date.now()).toLocaleDateString();

        var actionHtml = '<div style="display:flex;gap:6px;justify-content:flex-end;">';
        if (s.status === 'pending') {
          actionHtml += '<button class="btn-browse-approve" data-id="' + s.id + '" style="padding:5px 10px;font-size:0.72rem;background:#D1FAE5;color:#065F46;border:none;border-radius:5px;cursor:pointer;font-weight:700;">✓ Approve</button>';
        } else {
          actionHtml += '<span style="color:#10B981;font-size:0.72rem;font-weight:700;padding:5px 4px;">✓ Approved</span>';
        }
        actionHtml += '<button class="btn-browse-edit" data-id="' + s.id + '" style="padding:5px 10px;font-size:0.72rem;background:#EEF2FF;color:#4F46E5;border:none;border-radius:5px;cursor:pointer;font-weight:700;">✎ Edit</button>';
        actionHtml += '</div>';

        var studentCell = '<div style="display:flex;align-items:center;gap:10px;">' +
          avatarHtml(s) +
          '<div>' +
            '<div style="font-weight:700;color:#0f172a;">' + s.fullName + '</div>' +
            '<div style="font-size:0.75rem;color:var(--text-muted);">' + (s.email || '') + '</div>' +
          '</div>' +
        '</div>';

        return '<tr style="border-bottom:1px solid var(--border-color);">' +
          '<td style="padding:12px 16px;">' + studentCell + '</td>' +
          '<td style="padding:12px 16px;font-family:monospace;color:#1e293b;">' + s.username + '</td>' +
          '<td style="padding:12px 16px;">' + statusBadgeHtml + '</td>' +
          '<td style="padding:12px 16px;color:var(--text-muted);">' + joinedDate + '</td>' +
          '<td style="padding:12px 16px;text-align:right;padding-right:24px;">' + actionHtml + '</td>' +
        '</tr>';
      }).join('');

      tbody.querySelectorAll('.btn-browse-approve').forEach(function(btn) {
        btn.onclick = function() {
          var id = btn.dataset.id;
          var sIdx = students.findIndex(function(stu) { return stu.id === id; });
          if (sIdx !== -1) {
            students[sIdx].status = 'active';
            students[sIdx].updatedAt = new Date().toISOString();
            saveStored('campuslink_students', students);
            renderBrowseRows();
            renderInviteLinks();
            renderActiveSubpanel();
            toast('Student approved successfully!');
          }
        };
      });

      tbody.querySelectorAll('.btn-browse-edit').forEach(function(btn) {
        btn.onclick = function() {
          var id = btn.dataset.id;
          // Close browse modal, open edit modal for this student
          var browseModal = document.getElementById('student-browse-invite-modal');
          if (browseModal) {
            browseModal.style.display = 'none';
            browseModal.classList.remove('active');
          }
          openAddEditModal(id);
        };
      });
    }

    if (searchInput) {
      searchInput.oninput = renderBrowseRows;
    }

    renderBrowseRows();
    modal.style.display = 'flex';
    modal.classList.add('active');
  }

  function openInviteModal() {
    loadDependencies();
    const prof = getProfile();
    const isCollege = (prof.institution_type && prof.institution_type !== 'school') || window.location.pathname.indexOf('college-dashboard.html') > -1;
    var yearSel = document.getElementById('invite-modal-year');
    var classSel = document.getElementById('invite-modal-class');
    var classInput = document.getElementById('invite-modal-class-input');
    
    // Dynamically update labels based on institution type (school vs college)
    var yearLabel = document.getElementById('invite-modal-year-label');
    var classLabel = document.getElementById('invite-modal-class-label');
    if (yearLabel) yearLabel.textContent = isCollege ? 'Batch Year *' : 'Academic Year *';
    if (classLabel) classLabel.textContent = isCollege ? 'Program & Section *' : 'Class & Section *';
    
    var successYearLabel = document.getElementById('success-invite-year-label');
    var successClassLabel = document.getElementById('success-invite-class-label');
    if (successYearLabel) successYearLabel.textContent = isCollege ? 'Batch Year:' : 'Academic Year:';
    if (successClassLabel) successClassLabel.textContent = isCollege ? 'Program / Course:' : 'Classroom:';

    if (isCollege) {
      if (classSel) classSel.style.display = 'none';
      if (classInput) classInput.style.display = 'block';
    } else {
      if (classSel) classSel.style.display = 'block';
      if (classInput) classInput.style.display = 'none';
    }

    if (yearSel) {
      var h = '';
      if (isCollege) {
        // Generate list of batch years from currentYear + 6 down to currentYear - 4
        const currentYear = new Date().getFullYear();
        for (let y = currentYear + 6; y >= currentYear - 4; y--) {
          h += '<option value="' + y + '">' + y + '</option>';
        }
      } else {
        academicYears.forEach(function(y) { h += '<option value="' + y.id + '">' + getYearName(y.id) + '</option>'; });
      }
      yearSel.innerHTML = h;
    }
    if (classSel) {
      var h2 = '';
      classes.forEach(function(c) {
        var label = c.section ? (c.name + ' - ' + c.section) : c.name;
        h2 += '<option value="' + c.id + '|' + (c.section || '') + '">' + label + '</option>';
      });
      classSel.innerHTML = h2;
    }

    var formScreen = document.getElementById('invite-form-screen');
    var successScreen = document.getElementById('invite-success-screen');
    if (formScreen) formScreen.style.display = 'flex';
    if (successScreen) successScreen.style.display = 'none';

    var modal = document.getElementById('student-invite-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  }

  function handleGenerateInvite() {
    loadDependencies();
    const prof = getProfile();
    const isCollege = (prof.institution_type && prof.institution_type !== 'school') || window.location.pathname.indexOf('college-dashboard.html') > -1;

    var yearId = document.getElementById('invite-modal-year').value;
    var classVal = isCollege 
      ? document.getElementById('invite-modal-class-input').value.trim() 
      : document.getElementById('invite-modal-class').value;
    var inviteType = document.getElementById('invite-modal-type').value;

    if (!yearId || !classVal) {
      toast(isCollege ? 'Please select Batch Year and enter Program/Course.' : 'Please select Academic Year and Class/Section.', 'error');
      return;
    }

    var classId = classVal;
    var sectionId = '';
    var classPrefix = 'CL';

    if (isCollege) {
      const clean = classVal.replace(/[^a-zA-Z]/g, '').toUpperCase();
      classPrefix = clean.substring(0, 3) || 'CL';
    } else {
      var parts = classVal.split('|');
      classId = parts[0];
      sectionId = parts[1] || '';
      var cls = classes.find(function(c) { return c.id === classId; });
      classPrefix = cls ? cls.name.replace(/[^0-9]/g, '') : 'CL';
      if (!classPrefix) classPrefix = 'CL';
    }

    var sectionPrefix = sectionId ? sectionId.toUpperCase() : 'X';
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var codeRand = '';
    for (var i = 0; i < 5; i++) {
      codeRand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    var code = 'CL-' + classPrefix + (isCollege ? '' : sectionPrefix) + '-' + codeRand;

    var newInvite = {
      id: 'inv_' + Date.now(),
      schoolId: 'sch_001',
      academicYearId: yearId,
      classId: classId,
      sectionId: sectionId,
      inviteCode: code,
      inviteType: inviteType,
      status: 'active',
      createdBy: 'admin',
      createdAt: new Date().toISOString(),
      expiresAt: '',
      maxUses: 9999,
      joinedCount: 0
    };

    invites.unshift(newInvite);
    saveStored('campuslink_invites', invites);

    var formScreen = document.getElementById('invite-form-screen');
    var successScreen = document.getElementById('invite-success-screen');
    if (formScreen) formScreen.style.display = 'none';
    if (successScreen) successScreen.style.display = 'flex';

    document.getElementById('success-invite-code').textContent = code;
    document.getElementById('success-invite-class').textContent = getClassLabel(classId, sectionId);
    document.getElementById('success-invite-year').textContent = getYearName(yearId);
    
    var shareLink = window.location.origin + '/join-school.html?code=' + code;
    document.getElementById('success-invite-link').value = shareLink;

    document.getElementById('btn-copy-success-link').onclick = function() {
      navigator.clipboard.writeText(shareLink).then(function() {
        toast('Invitation link copied to clipboard!');
      });
    };

    document.getElementById('btn-show-success-qr').onclick = function() {
      openQRModal(code, getClassLabel(classId, sectionId), getYearName(yearId));
    };

    document.getElementById('btn-disable-success-invite').onclick = function() {
      newInvite.status = 'disabled';
      saveStored('campuslink_invites', invites);
      toast('Invitation link disabled.');
      if (activeSubTab === 'invite-links') renderInviteLinks();
    };

    document.getElementById('btn-generate-another').onclick = function() {
      openInviteModal();
    };

    if (activeSubTab === 'invite-links') renderInviteLinks();
    toast('Invitation link generated successfully.');
  }

  // ─── Add/Edit Modal ────────────────────────────────────────────────────────
  function openAddEditModal(id) {
    loadDependencies();
    populateModalDropdowns();
    var modal = document.getElementById('student-modal');
    var title = document.getElementById('student-modal-title');
    var form = document.getElementById('student-form');
    if (!modal || !form) return;
    form.reset();
    document.getElementById('student-modal-id').value = '';

    var warningSpan = document.getElementById('student-modal-username-warning');
    if (warningSpan) warningSpan.style.display = 'none';

    if (id) {
      var s = students.find(function(st) { return st.id === id; });
      if (!s) return;
      title.textContent = 'Edit Student';
      document.getElementById('student-modal-id').value = s.id;
      setInputVal('student-modal-fullname', s.fullName);
      setInputVal('student-modal-username', s.username);
      setInputVal('student-modal-email', s.email);
      setInputVal('student-modal-phone', s.phone);
      setInputVal('student-modal-gender', s.gender);
      setInputVal('student-modal-dob', s.dateOfBirth);
      setInputVal('student-modal-blood', s.bloodGroup);
      setInputVal('student-modal-religion', s.religion);
      setInputVal('student-modal-nationality', s.nationality);
      setInputVal('student-modal-address', s.address);
      setInputVal('student-modal-emergency', s.emergencyContact);
      setInputVal('student-modal-house', s.house);
      setInputVal('student-modal-roll', s.rollNumber);
      setInputVal('student-modal-admission-no', s.admissionNumber);
      setInputVal('student-modal-admission-date', s.admissionDate);
      setInputVal('student-modal-status', s.status);
      setInputVal('student-modal-year', s.academicYearId);
      setInputVal('student-modal-class', s.classId + '|' + (s.sectionId || ''));
    } else {
      title.textContent = 'Add Student';
    }

    modal.style.display = 'flex';
    modal.classList.add('active');
  }

  function setInputVal(id, val) { var el = document.getElementById(id); if (el) el.value = val || ''; }

  function closeAddEditModal() {
    var modal = document.getElementById('student-modal');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
  }

  // ─── View Modal ────────────────────────────────────────────────────────────
  function openViewModal(id) {
    loadDependencies();
    var s = students.find(function(st) { return st.id === id; });
    if (!s) return;
    var modal = document.getElementById('student-view-modal');
    var content = document.getElementById('student-view-content');
    if (!modal || !content) return;

    var colors = ['#6366F1','#EC4899','#14B8A6','#F59E0B','#8B5CF6','#EF4444','#10B981'];
    var bgColor = colors[s.id.charCodeAt(s.id.length - 1) % colors.length];
    var initials = s.fullName.split(' ').map(function(w) { return w[0]; }).join('').substring(0, 2).toUpperCase();

    content.innerHTML =
      '<div style="display:flex;gap:20px;align-items:flex-start;padding-bottom:20px;border-bottom:1px solid var(--border-color);margin-bottom:20px;flex-wrap:wrap;">' +
        '<div style="width:72px;height:72px;border-radius:50%;background:' + bgColor + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:800;flex-shrink:0;">' + initials + '</div>' +
        '<div style="flex:1;min-width:180px;">' +
          '<div style="font-size:1.1rem;font-weight:800;color:var(--dark-bg);">' + s.fullName + '</div>' +
          '<div style="font-size:0.82rem;color:var(--text-muted);">@' + s.username + ' &bull; ' + s.campuslinkId + '</div>' +
          '<div style="margin-top:8px;">' + statusBadge(s.status) + '</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:0.72rem;color:var(--text-muted);">Roll Number</div>' +
          '<div style="font-size:1rem;font-weight:800;color:var(--primary);">' + (s.rollNumber || '-') + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">' +
        infoRow('Admission No.', s.admissionNumber) +
        infoRow('Academic Year', getYearName(s.academicYearId)) +
        infoRow('Class & Section', getClassLabel(s.classId, s.sectionId)) +
        infoRow('Admission Date', s.admissionDate || '-') +
        infoRow('Date of Birth', s.dateOfBirth || '-') +
        infoRow('Gender', s.gender || '-') +
        infoRow('Blood Group', s.bloodGroup || '-') +
        infoRow('Religion', s.religion || '-') +
        infoRow('Nationality', s.nationality || '-') +
        infoRow('Email', s.email || '-') +
        infoRow('Phone', s.phone || '-') +
        infoRow('Emergency Contact', s.emergencyContact || '-') +
        infoRow('House', s.house || '-') +
        infoRow('Address', s.address || '-') +
      '</div>';

    modal.style.display = 'flex';
    modal.classList.add('active');
  }

  function infoRow(label, value) {
    return '<div style="background:var(--light-bg);padding:12px 14px;border-radius:var(--radius-sm);">' +
      '<div style="font-size:0.7rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;">' + label + '</div>' +
      '<div style="font-size:0.85rem;font-weight:600;color:var(--text-main);">' + value + '</div>' +
    '</div>';
  }

  function closeViewModal() {
    var modal = document.getElementById('student-view-modal');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
  }

  // ─── Transfer Modal ────────────────────────────────────────────────────────
  function openTransferModal(id) {
    loadDependencies();
    var s = students.find(function(st) { return st.id === id; });
    if (!s) return;
    var modal = document.getElementById('student-transfer-modal');
    if (!modal) return;
    setInputVal('transfer-student-id', id);
    setEl('transfer-student-name', s.fullName);
    setEl('transfer-current-class', getClassLabel(s.classId, s.sectionId));
    setEl('transfer-current-year', getYearName(s.academicYearId));

    var tc = document.getElementById('transfer-target-class');
    if (tc) {
      var h = '<option value="">Select Target Class & Section</option>';
      classes.forEach(function(c) {
        var label = c.section ? (c.name + ' - ' + c.section) : c.name;
        h += '<option value="' + c.id + '|' + (c.section || '') + '">' + label + '</option>';
      });
      tc.innerHTML = h;
    }
    var ty = document.getElementById('transfer-target-year');
    if (ty) {
      var hy = '<option value="">Select Academic Year</option>';
      academicYears.forEach(function(y) { hy += '<option value="' + y.id + '">' + y.name + '</option>'; });
      ty.innerHTML = hy;
    }
    modal.style.display = 'flex';
    modal.classList.add('active');
  }

  function closeTransferModal() {
    var modal = document.getElementById('student-transfer-modal');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
  }

  // ─── Promote Modal ─────────────────────────────────────────────────────────
  function openPromoteModal(id) {
    loadDependencies();
    var s = students.find(function(st) { return st.id === id; });
    if (!s) return;
    var modal = document.getElementById('student-promote-modal');
    if (!modal) return;
    setInputVal('promote-student-id', id);
    setEl('promote-student-name', s.fullName);
    setEl('promote-current-year', getYearName(s.academicYearId));
    setEl('promote-current-class', getClassLabel(s.classId, s.sectionId));

    var ty = document.getElementById('promote-target-year');
    if (ty) {
      var hy = '<option value="">Select Next Academic Year</option>';
      academicYears.forEach(function(y) { hy += '<option value="' + y.id + '">' + y.name + '</option>'; });
      ty.innerHTML = hy;
    }
    var tc = document.getElementById('promote-target-class');
    if (tc) {
      var h = '<option value="">Select Next Class & Section</option>';
      classes.forEach(function(c) {
        var label = c.section ? (c.name + ' - ' + c.section) : c.name;
        h += '<option value="' + c.id + '|' + (c.section || '') + '">' + label + '</option>';
      });
      tc.innerHTML = h;
    }

    var preview = document.getElementById('promote-preview');
    if (preview) {
      preview.innerHTML =
        '<div style="padding:14px;background:var(--light-bg);border-radius:var(--radius-sm);margin-bottom:10px;">' +
          '<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">Current Assignment</div>' +
          '<div style="font-weight:700;">' + getYearName(s.academicYearId) + ' &rarr; ' + getClassLabel(s.classId, s.sectionId) + '</div>' +
        '</div>' +
        '<div style="text-align:center;font-size:1.4rem;color:var(--primary);margin:6px 0;">&#8595;</div>' +
        '<div style="padding:14px;background:#EEF2FF;border-radius:var(--radius-sm);border:2px dashed #6366F1;">' +
          '<div style="font-size:0.75rem;color:#6366F1;margin-bottom:4px;font-weight:700;">After Promotion</div>' +
          '<div style="font-weight:700;color:#4338CA;" id="promote-preview-label">Select year and class below</div>' +
        '</div>';
    }

    modal.style.display = 'flex';
    modal.classList.add('active');

    function updatePreview() {
      var py = (document.getElementById('promote-target-year') || {}).value;
      var pc = (document.getElementById('promote-target-class') || {}).value;
      var pl = document.getElementById('promote-preview-label');
      if (pl && py && pc) {
        var yr = academicYears.find(function(y) { return y.id === py; });
        var yrName = yr ? yr.name : py;
        var sep = pc.indexOf('|');
        var cId = sep >= 0 ? pc.substring(0, sep) : pc;
        var sec = sep >= 0 ? pc.substring(sep + 1) : '';
        pl.textContent = yrName + ' \u2192 ' + getClassLabel(cId, sec);
      }
    }
    var ptyEl = document.getElementById('promote-target-year');
    var ptcEl = document.getElementById('promote-target-class');
    if (ptyEl) ptyEl.addEventListener('change', updatePreview);
    if (ptcEl) ptcEl.addEventListener('change', updatePreview);
  }

  function closePromoteModal() {
    var modal = document.getElementById('student-promote-modal');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
  }

  // ─── Delete Modal ──────────────────────────────────────────────────────────
  function openDeleteModal(id) {
    loadDependencies();
    var s = students.find(function(st) { return st.id === id; });
    if (!s) return;
    studentToDeleteId = id;
    var msg = document.getElementById('student-delete-message');
    if (msg) msg.textContent = 'Are you sure you want to permanently delete "' + s.fullName + '" (' + s.admissionNumber + ')? This action cannot be undone.';
    var modal = document.getElementById('student-delete-modal');
    if (modal) { modal.style.display = 'flex'; modal.classList.add('active'); }
  }

  function closeDeleteModal() {
    var modal = document.getElementById('student-delete-modal');
    if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
    studentToDeleteId = null;
  }

  // ─── CRUD Handlers ─────────────────────────────────────────────────────────
  function handleFormSubmit(e) {
    e.preventDefault();
    loadDependencies();

    var warningSpan = document.getElementById('student-modal-username-warning');
    if (warningSpan && warningSpan.style.display === 'block') {
      toast('Cannot save: Username does not exist in the system.', 'error');
      return;
    }

    var id = document.getElementById('student-modal-id').value;
    var fullName = (document.getElementById('student-modal-fullname').value || '').trim();
    var username = (document.getElementById('student-modal-username').value || '').trim();
    var email = (document.getElementById('student-modal-email').value || '').trim();
    var phone = (document.getElementById('student-modal-phone').value || '').trim();
    var gender = (document.getElementById('student-modal-gender').value || '');
    var dateOfBirth = (document.getElementById('student-modal-dob').value || '');
    var bloodGroup = (document.getElementById('student-modal-blood').value || '');
    var religion = (document.getElementById('student-modal-religion').value || '');
    var nationality = (document.getElementById('student-modal-nationality').value || '').trim();
    var address = (document.getElementById('student-modal-address').value || '').trim();
    var emergencyContact = (document.getElementById('student-modal-emergency').value || '').trim();
    var house = (document.getElementById('student-modal-house').value || '').trim();
    var rollNumber = (document.getElementById('student-modal-roll').value || '').trim();
    var admissionNumber = (document.getElementById('student-modal-admission-no').value || '').trim();
    var admissionDate = (document.getElementById('student-modal-admission-date').value || '');
    var status = (document.getElementById('student-modal-status').value || 'active');
    var academicYearId = (document.getElementById('student-modal-year').value || '');
    var classSectionRaw = (document.getElementById('student-modal-class').value || '');
    var sep = classSectionRaw.indexOf('|');
    var classId = sep >= 0 ? classSectionRaw.substring(0, sep) : classSectionRaw;
    var sectionId = sep >= 0 ? classSectionRaw.substring(sep + 1).trim() : '';

    if (!fullName || !username || !classId || !academicYearId) {
      toast('Please fill in all required fields.', 'error'); return;
    }

    if (id) {
      var idx = students.findIndex(function(s) { return s.id === id; });
      if (idx >= 0) {
        students[idx] = Object.assign({}, students[idx], { fullName: fullName, username: username, email: email, phone: phone, gender: gender, dateOfBirth: dateOfBirth, bloodGroup: bloodGroup, religion: religion, nationality: nationality, address: address, emergencyContact: emergencyContact, house: house, rollNumber: rollNumber || '\u2014', admissionNumber: admissionNumber || '\u2014', admissionDate: admissionDate, status: status, academicYearId: academicYearId, classId: classId, sectionId: sectionId, updatedAt: new Date().toISOString() });
        toast('Student updated successfully.');
      }
    } else {
      students.push({ id: 'stu_' + Date.now(), schoolId: 'sch_001', fullName: fullName, username: username, email: email, phone: phone, gender: gender, dateOfBirth: dateOfBirth, bloodGroup: bloodGroup, religion: religion, nationality: nationality, address: address, emergencyContact: emergencyContact, house: house, rollNumber: rollNumber || '\u2014', admissionNumber: admissionNumber || '\u2014', admissionDate: admissionDate, status: status, academicYearId: academicYearId, classId: classId, sectionId: sectionId, campuslinkId: 'CL-STU-' + String(students.length + 1).padStart(4, '0'), guardianId: null, transportId: null, houseId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      toast('Student added successfully.');
    }

    saveStored('campuslink_students', students);
    closeAddEditModal();
    renderActiveSubpanel();
    populateFilters();
  }

  function handleTransferSubmit() {
    loadDependencies();
    var id = (document.getElementById('transfer-student-id') || {}).value;
    var classSectionRaw = ((document.getElementById('transfer-target-class') || {}).value || '');
    var yearId = ((document.getElementById('transfer-target-year') || {}).value || '');
    if (!classSectionRaw || !yearId) { toast('Please select target class and academic year.', 'error'); return; }
    var sep = classSectionRaw.indexOf('|');
    var classId = sep >= 0 ? classSectionRaw.substring(0, sep) : classSectionRaw;
    var sectionId = sep >= 0 ? classSectionRaw.substring(sep + 1).trim() : '';
    var idx = students.findIndex(function(s) { return s.id === id; });
    if (idx >= 0) {
      students[idx].classId = classId;
      students[idx].sectionId = sectionId;
      students[idx].academicYearId = yearId;
      students[idx].status = 'transferred';
      students[idx].updatedAt = new Date().toISOString();
      saveStored('campuslink_students', students);
      toast('Student transferred successfully.');
      closeTransferModal();
      renderActiveSubpanel();
      populateFilters();
    }
  }

  function handlePromoteSubmit() {
    loadDependencies();
    var id = (document.getElementById('promote-student-id') || {}).value;
    var classSectionRaw = ((document.getElementById('promote-target-class') || {}).value || '');
    var yearId = ((document.getElementById('promote-target-year') || {}).value || '');
    if (!classSectionRaw || !yearId) { toast('Please select next class and academic year.', 'error'); return; }
    var sep = classSectionRaw.indexOf('|');
    var classId = sep >= 0 ? classSectionRaw.substring(0, sep) : classSectionRaw;
    var sectionId = sep >= 0 ? classSectionRaw.substring(sep + 1).trim() : '';
    var idx = students.findIndex(function(s) { return s.id === id; });
    if (idx >= 0) {
      students[idx].classId = classId;
      students[idx].sectionId = sectionId;
      students[idx].academicYearId = yearId;
      students[idx].updatedAt = new Date().toISOString();
      saveStored('campuslink_students', students);
      toast('Student promoted successfully.');
      closePromoteModal();
      renderActiveSubpanel();
    }
  }

  function handleDeleteConfirm() {
    if (!studentToDeleteId) return;
    students = students.filter(function(s) { return s.id !== studentToDeleteId; });
    saveStored('campuslink_students', students);
    closeDeleteModal();
    renderActiveSubpanel();
    populateFilters();
    toast('Student deleted successfully.', 'info');
  }

  // ─── Toast ─────────────────────────────────────────────────────────────────
  function toast(msg, type) {
    type = type || 'success';
    if (typeof window.showToast === 'function') { window.showToast(msg, type); }
  }

  // ─── initStudentsTab ───────────────────────────────────────────────────────
  function initStudentsTab() {
    loadDependencies();
    populateFilters();
    renderActiveSubpanel();

    // Call Supabase sync asynchronously in live mode
    const isLiveMode = window.CampusLink?.supabase && (localStorage.getItem('supabase.auth.token') || sessionStorage.getItem('sb-'));
    if (isLiveMode) {
      syncStudentsFromSupabase().then(() => {
        renderActiveSubpanel();
        populateFilters();
      });
    }

    var addBtn = document.getElementById('btn-add-student');
    if (addBtn) addBtn.onclick = function() { openAddEditModal(); };

    var searchInput = document.getElementById('student-search');
    var filterYear = document.getElementById('student-filter-year');
    var filterClass = document.getElementById('student-filter-class');
    var filterSection = document.getElementById('student-filter-section');
    var filterStatus = document.getElementById('student-filter-status');

    if (searchInput) searchInput.oninput = renderActiveSubpanel;
    if (filterYear) filterYear.onchange = renderActiveSubpanel;
    if (filterClass) filterClass.onchange = renderActiveSubpanel;
    if (filterSection) filterSection.onchange = renderActiveSubpanel;
    if (filterStatus) filterStatus.onchange = renderActiveSubpanel;

    // Student Username input validation and autofill
    var usernameInput = document.getElementById('student-modal-username');
    var warningSpan = document.getElementById('student-modal-username-warning');
    var usernameValidationTimeout;

    if (usernameInput) {
      usernameInput.oninput = function(e) {
        clearTimeout(usernameValidationTimeout);

        // Only validate/autofill if we are in "Create" mode (id is empty)
        var idVal = document.getElementById('student-modal-id').value;
        if (idVal) return;

        var val = e.target.value.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
        if (!val) {
          if (warningSpan) warningSpan.style.display = 'none';
          return;
        }

        usernameValidationTimeout = setTimeout(async function() {
          var currentVal = usernameInput.value.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
          if (currentVal !== val) return;

          // Look up matched user
          var matchedUser = null;

          // 1. Search in student-specific mock platform database
          var mockPlatformStudents = [
            { username: 'rahul.kumar', fullName: 'Rahul Kumar', email: 'rahul.kumar@student.com', phone: '+91 9000000011', gender: 'Male', dateOfBirth: '2010-05-10', bloodGroup: 'B+', religion: 'Hinduism', nationality: 'Indian', address: 'Block D, Sector 15, Noida', emergencyContact: '+91 9888877777', house: 'Red House' },
            { username: 'haha', fullName: 'Haha Student', email: 'haha@student.com', phone: '+91 9000000099', gender: 'Female', dateOfBirth: '2009-08-20', bloodGroup: 'A+', religion: 'Christianity', nationality: 'Indian', address: 'Apartment 4B, GK-2, New Delhi', emergencyContact: '+91 9000000088', house: 'Blue House' },
            { username: 'sneha.reddy', fullName: 'Sneha Reddy', email: 'sneha.reddy@student.com', phone: '+91 9000000012', gender: 'Female', dateOfBirth: '2010-12-12', bloodGroup: 'O+', religion: 'Hinduism', nationality: 'Indian', address: '55 Indiranagar, Bengaluru', emergencyContact: '+91 9111122222', house: 'Green House' },
            { username: 'ggg', fullName: 'Ggg Student', email: 'ggg@student.com', phone: '+91 9000000000', gender: 'Male', dateOfBirth: '2010-01-01', bloodGroup: 'AB+', religion: 'Sikhism', nationality: 'Indian', address: '12 Sector 4, Chandigarh', emergencyContact: '+91 9000000000', house: 'Yellow House' }
          ];

          matchedUser = mockPlatformStudents.find(function(u) { return u.username.toLowerCase() === val; });

          // 2. Query Supabase profiles if connected
          if (!matchedUser && window.CampusLink && window.CampusLink.supabase) {
            try {
              var sb = window.CampusLink.supabase;
              var res = await sb
                .from('profiles')
                .select('id, username, full_name, email')
                .ilike('username', val)
                .maybeSingle();

              if (usernameInput.value.trim().toLowerCase().replace(/[^a-z0-9._]/g, '') !== val) return;

              if (res && !res.error && res.data) {
                var d = res.data;
                matchedUser = {
                  username: d.username,
                  fullName: d.full_name || '',
                  email: d.email || (d.username + '@student.com'),
                  phone: '',
                  gender: 'Male',
                  dateOfBirth: '2010-01-01',
                  bloodGroup: '',
                  religion: '',
                  nationality: 'Indian',
                  address: '',
                  emergencyContact: '',
                  house: ''
                };
              }
            } catch (err) {
              console.warn("Failed to check username on Supabase:", err);
            }
          }

          // 3. Search in local communityMembers as fallback
          if (!matchedUser) {
            try {
              var cmRaw = localStorage.getItem('campuslink_community_members');
              if (cmRaw) {
                var cms = JSON.parse(cmRaw);
                var matchedCm = cms.find(function(m) { return m.user && m.user.username.toLowerCase() === val; });
                if (matchedCm && matchedCm.user) {
                  matchedUser = {
                    username: matchedCm.user.username,
                    fullName: matchedCm.user.full_name || '',
                    email: matchedCm.user.email || (matchedCm.user.username + '@student.com'),
                    phone: matchedCm.user.phone || '',
                    gender: matchedCm.user.gender || 'Male',
                    dateOfBirth: '2010-01-01',
                    bloodGroup: '',
                    religion: '',
                    nationality: 'Indian',
                    address: '',
                    emergencyContact: '',
                    house: ''
                  };
                }
              }
            } catch (cmErr) {
              console.warn("Failed to search communityMembers:", cmErr);
            }
          }

          if (matchedUser) {
            if (warningSpan) warningSpan.style.display = 'none';
            // Autofill details
            setInputVal('student-modal-fullname', matchedUser.fullName);
            setInputVal('student-modal-email', matchedUser.email);
            setInputVal('student-modal-phone', matchedUser.phone);
            setInputVal('student-modal-gender', matchedUser.gender);
            setInputVal('student-modal-dob', matchedUser.dateOfBirth);
            setInputVal('student-modal-blood', matchedUser.bloodGroup);
            setInputVal('student-modal-religion', matchedUser.religion);
            setInputVal('student-modal-nationality', matchedUser.nationality);
            setInputVal('student-modal-address', matchedUser.address);
            setInputVal('student-modal-emergency', matchedUser.emergencyContact);
            setInputVal('student-modal-house', matchedUser.house);
          } else {
            if (warningSpan) warningSpan.style.display = 'block';
          }
        }, 300);
      };
    }
  }

  // ─── DOM Ready Bindings ────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {

    // Sub-tab switching
    document.querySelectorAll('.student-subtab-btn').forEach(function(btn) {
      btn.onclick = function(e) {
        e.preventDefault();
        document.querySelectorAll('.student-subtab-btn').forEach(function(b) {
          b.classList.remove('active');
          b.style.color = 'var(--text-muted)';
          b.style.borderBottom = '3px solid transparent';
          b.style.fontWeight = '500';
        });
        btn.classList.add('active');
        btn.style.color = 'var(--primary)';
        btn.style.borderBottom = '3px solid var(--primary)';
        btn.style.fontWeight = '700';

        activeSubTab = btn.getAttribute('data-subtab');
        document.querySelectorAll('.student-subpanel').forEach(function(p) { p.style.display = 'none'; });
        var target = document.getElementById('student-subpanel-' + activeSubTab);
        if (target) target.style.display = 'block';
        renderActiveSubpanel();
      };
    });

    // Modal close buttons
    document.querySelectorAll('.student-modal-close').forEach(function(btn) {
      btn.onclick = function() {
        var modalId = btn.getAttribute('data-modal');
        var modal = document.getElementById(modalId);
        if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
      };
    });

    // Form submit
    var stuForm = document.getElementById('student-form');
    if (stuForm) stuForm.onsubmit = handleFormSubmit;

    // Transfer confirm
    var transferBtn = document.getElementById('btn-transfer-confirm');
    if (transferBtn) transferBtn.onclick = handleTransferSubmit;

    // Promote confirm
    var promoteBtn = document.getElementById('btn-promote-confirm');
    if (promoteBtn) promoteBtn.onclick = handlePromoteSubmit;

    // Delete buttons
    var delCancel = document.getElementById('btn-student-delete-cancel');
    var delConfirm = document.getElementById('btn-student-delete-confirm');
    if (delCancel) delCancel.onclick = closeDeleteModal;
    if (delConfirm) delConfirm.onclick = handleDeleteConfirm;

    // Dropdown Action Menu toggles
    var actionToggle = document.getElementById('btn-student-actions-toggle');
    var actionMenu = document.getElementById('student-actions-dropdown-menu');
    if (actionToggle && actionMenu) {
      actionToggle.onclick = function(e) {
        e.stopPropagation();
        var isVisible = actionMenu.style.display === 'block';
        actionMenu.style.display = isVisible ? 'none' : 'block';
      };
      
      document.addEventListener('click', function() {
        actionMenu.style.display = 'none';
      });
    }

    var inviteTrigger = document.getElementById('btn-invite-students-trigger');
    if (inviteTrigger) inviteTrigger.onclick = openInviteModal;

    var btnDropdownInvite = document.getElementById('btn-dropdown-invite');
    if (btnDropdownInvite) {
      btnDropdownInvite.onclick = function() {
        if (actionMenu) actionMenu.style.display = 'none';
        openInviteModal();
      };
    }

    var btnDropdownAddManual = document.getElementById('btn-dropdown-add-manual');
    if (btnDropdownAddManual) {
      btnDropdownAddManual.onclick = function() {
        if (actionMenu) actionMenu.style.display = 'none';
        openAddEditModal();
      };
    }

    // Generate Invite click
    var genInviteBtn = document.getElementById('btn-generate-invite-link');
    if (genInviteBtn) genInviteBtn.onclick = handleGenerateInvite;

    // Local Invite tab filter/search
    var inviteSearch = document.getElementById('invite-search');
    if (inviteSearch) inviteSearch.oninput = renderInviteLinks;

    var inviteFilter = document.getElementById('invite-status-filter');
    if (inviteFilter) inviteFilter.onchange = renderInviteLinks;

    // Backdrop click to close modals
    ['student-modal','student-view-modal','student-transfer-modal','student-promote-modal','student-delete-modal','student-invite-modal','student-qr-modal','student-browse-invite-modal'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', function(ev) {
          if (ev.target === el) { el.style.display = 'none'; el.classList.remove('active'); }
        });
      }
    });
  });

  window.initStudentsTab = initStudentsTab;

})();
