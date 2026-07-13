/**
 * CampusLink – Attendance Management Module (Phase 5, v2)
 * UI: Class-cards grid → click "Students Present" → modal with Present/Absent per student
 */

(function () {
  'use strict';

  // ─── Default fallbacks (only used when academic module hasn't been set up) ──

  const DEFAULT_YEARS = [
    { id: 'ay-2026', name: '2026-2027', status: 'active', is_current: true }
  ];

  const DEFAULT_CLASSES_MASTER = [
    { id: 'cls-9',  name: 'Class 9',  display_order: 9,  status: 'active' },
    { id: 'cls-10', name: 'Class 10', display_order: 10, status: 'active' }
  ];

  const DEFAULT_TEACHERS = [
    { id: 't-ali',   fullName: 'Ali Ahmad',    status: 'active' },
    { id: 't-priya', fullName: 'Priya Sharma', status: 'active' }
  ];

  const DEFAULT_CLASSROOMS = [
    { id: 'cr-9a',  classId: 'cls-9',  sectionId: 'A', classTeacherId: 't-ali',   academicYearId: 'ay-2026', status: 'active' },
    { id: 'cr-9b',  classId: 'cls-9',  sectionId: 'B', classTeacherId: 't-priya', academicYearId: 'ay-2026', status: 'active' },
    { id: 'cr-10a', classId: 'cls-10', sectionId: 'A', classTeacherId: 't-ali',   academicYearId: 'ay-2026', status: 'active' }
  ];

  const DEFAULT_STUDENTS_RAW = [];

  const SEED_ATTENDANCE = [];
  const SEED_LEAVES = [];

  // ─── State ────────────────────────────────────────────────────────────────
  let years           = [];
  let classesMaster   = [];   // from campuslink_classes  (id, name)
  let teachersList    = [];   // from campuslink_teachers (id, fullName)
  let classroomsList  = [];   // from campuslink_classrooms (id, classId, sectionId, classTeacherId)
  let classes         = [];   // DERIVED: enriched classroom rows with resolved name + teacher
  let students        = [];   // from campuslink_students
  let attendanceRecs  = [];
  let leaveRequests   = [];
  let filterDate      = new Date().toISOString().split('T')[0];
  let activeSubtab    = 'take';

  // Modal state
  let modalClassId    = null; // classroom id (from campuslink_classrooms)
  let modalDraftMap   = {};
  let modalSearchQ    = '';

  // ─── Storage ─────────────────────────────────────────────────────────────
  function getS(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw) { localStorage.setItem(key, JSON.stringify(fallback)); return fallback; }
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }
  function setS(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function genId(p) { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

  // ─── Load — pulls directly from Academic classes (campuslink_classes) ──
  function load() {
    years = getS('campuslink_academic_years', DEFAULT_YEARS);
    if (!years || !years.length) years = DEFAULT_YEARS;

    const rawClasses = getS('campuslink_classes', []);
    const academicClasses = rawClasses.length ? rawClasses : [
      { id: "cls_001", name: "Class 9", displayOrder: 9, status: "active", academicYearId: "ay_001", section: "A", classTeacher: "John Doe" },
      { id: "cls_002", name: "Class 10", displayOrder: 10, status: "active", academicYearId: "ay_001", section: "B", classTeacher: "Sarah Smith" },
      { id: "cls_003", name: "Class 11", displayOrder: 11, status: "active", academicYearId: "ay_001", section: "A", classTeacher: "David Warner" },
      { id: "cls_004", name: "Class 12", displayOrder: 12, status: "active", academicYearId: "ay_001", section: "", classTeacher: "" }
    ];

    // Standardize key properties and dynamically look up class teacher from classroom assignments
    const storedClassrooms = getS('campuslink_classrooms', []);
    const storedTeachers = getS('campuslink_teachers', []);
    const storedClasses = getS('campuslink_classes', []);

    function getClassName(idOrName) {
      const found = storedClasses.find(x => x.id === idOrName);
      if (found) return found.name;
      const fallbackClasses = [
        { id: 'cls-9', name: 'Class 9' },
        { id: 'cls-10', name: 'Class 10' },
        { id: 'cls-11', name: 'Class 11' }
      ];
      const fallbackFound = fallbackClasses.find(x => x.id === idOrName);
      return fallbackFound ? fallbackFound.name : idOrName;
    }

    classes = academicClasses
      .filter(c => c.status === 'active' || !c.status)
      .map(c => {
        const cr = storedClassrooms.find(r => {
          const rName = getClassName(r.classId);
          const cName = getClassName(c.id);
          const rSec = r.sectionId || r.section || '';
          const cSec = c.section || '';
          return rName.toLowerCase() === cName.toLowerCase() && rSec.toLowerCase() === cSec.toLowerCase();
        });

        let resolvedTeacher = 'Not Assigned';
        if (cr && cr.classTeacherId) {
          const t = storedTeachers.find(item => item.id === cr.classTeacherId);
          if (t) resolvedTeacher = t.fullName;
        }

        return {
          id:           c.id,              // class id (e.g., cls_001)
          classId:      c.id,
          name:         c.name || 'Unknown Class',
          section:      c.section || '–',
          classTeacher: resolvedTeacher,
          academicYearId: c.academicYearId || ''
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name) || a.section.localeCompare(b.section));

    // Students — loaded from campuslink_students
    const rawStudents = getS('campuslink_students', []);
    students = rawStudents || [];

    attendanceRecs = getS('campuslink_attendance_records', SEED_ATTENDANCE);
    if (!attendanceRecs) { attendanceRecs = SEED_ATTENDANCE; setS('campuslink_attendance_records', attendanceRecs); }

    leaveRequests  = getS('campuslink_leave_requests', SEED_LEAVES);
    if (!leaveRequests) { leaveRequests = SEED_LEAVES; setS('campuslink_leave_requests', leaveRequests); }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function formatDate(d) {
    if (!d) return '–';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function getClassLabel(c) { return c ? `${c.name} – Section ${c.section}` : 'Unknown'; }

  function getStudentsForClass(classId) {
    return students
      .filter(s => s.classId === classId && (s.status === 'active' || s.status === 'pending'))
      .sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));
  }

  function getAttRecordForClassDate(classId, date) {
    return attendanceRecs.find(r => r.classId === classId && r.date === date) || null;
  }

  function statusBadge(status) {
    const map = {
      present:  { bg: '#ECFDF5', color: '#065F46' },
      absent:   { bg: '#FEF2F2', color: '#991B1B' },
      finalized:{ bg: '#EFF6FF', color: '#1D4ED8' },
      approved: { bg: '#ECFDF5', color: '#065F46' },
      pending:  { bg: '#FFFBEB', color: '#92400E' },
      rejected: { bg: '#FEF2F2', color: '#991B1B' }
    };
    const s = map[status] || { bg: '#F1F5F9', color: '#475569' };
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    return `<span style="display:inline-block;padding:3px 10px;border-radius:100px;font-size:0.7rem;font-weight:700;background:${s.bg};color:${s.color};">${label}</span>`;
  }



  // ─── Overview Cards ───────────────────────────────────────────────────────
  function updateCards() {
    const todayRecs = attendanceRecs.filter(r => r.date === filterDate);
    let present = 0, absent = 0;
    todayRecs.forEach(r => (r.entries || []).forEach(e => {
      if (e.status === 'present') present++;
      else if (e.status === 'absent') absent++;
    }));
    const total = present + absent;
    const pct = total > 0 ? ((present / total) * 100).toFixed(1) + '%' : '–';
    const pendingLeaves = leaveRequests.filter(l => l.status === 'pending').length;
    const completed = todayRecs.filter(r => r.status === 'finalized').length;

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('att-card-pct',       pct);
    set('att-card-present',   present);
    set('att-card-absent',    absent);
    set('att-card-leave',     `${pendingLeaves} Pending`);
    set('att-card-completed', `${completed} / ${classes.length}`);
  }

  // ─── Subtab switch ────────────────────────────────────────────────────────
  function switchSubtab(tab) {
    activeSubtab = tab;
    document.querySelectorAll('.attendance-subpanel').forEach(p => p.style.display = 'none');
    const panel = document.getElementById(`attendance-subpanel-${tab}`);
    if (panel) panel.style.display = '';

    document.querySelectorAll('.attendance-subtab-btn').forEach(btn => {
      const active = btn.getAttribute('data-subtab') === tab;
      btn.style.fontWeight   = active ? '700' : '500';
      btn.style.color        = active ? 'var(--primary)' : 'var(--text-muted)';
      btn.style.borderBottom = active ? '3px solid var(--primary)' : '3px solid transparent';
    });

    if (tab === 'take')    renderClassCards();
    if (tab === 'history') renderHistory();
    if (tab === 'leaves')  renderLeaves();
    if (tab === 'reports') renderReports();
  }

  // ─── 1. Class Cards ───────────────────────────────────────────────────────
  function renderClassCards() {
    const grid = document.getElementById('att-class-cards-grid');
    if (!grid) return;

    if (!classes.length) {
      grid.innerHTML = `<div style="text-align:center;padding:64px;color:var(--text-muted);grid-column:1/-1;">
        <div style="font-size:2.5rem;margin-bottom:12px;">📋</div>
        <strong>No classes found.</strong>
        <p style="font-size:0.8rem;">Add classes first in the Classrooms module.</p>
      </div>`;
      return;
    }

    grid.innerHTML = classes.map(cls => {
      const stuList  = getStudentsForClass(cls.id);
      const total    = stuList.length;
      const record   = getAttRecordForClassDate(cls.id, filterDate);
      const taken    = !!record;
      const present  = taken ? (record.entries || []).filter(e => e.status === 'present').length : 0;
      const absent   = taken ? (record.entries || []).filter(e => e.status === 'absent').length  : 0;
      const pct      = (total > 0 && taken) ? Math.round((present / total) * 100) : null;
      const pctColor = pct === null ? '#94A3B8' : pct >= 90 ? '#10B981' : pct >= 75 ? '#F59E0B' : '#EF4444';

      // Donut progress indicator (simple CSS)
      const progressBar = pct !== null
        ? `<div style="width:100%;background:#F1F5F9;border-radius:100px;height:6px;margin:10px 0;">
             <div style="width:${pct}%;background:${pctColor};border-radius:100px;height:6px;transition:width 0.5s;"></div>
           </div>
           <div style="font-size:0.72rem;color:${pctColor};font-weight:700;">${pct}% attendance</div>`
        : `<div style="font-size:0.72rem;color:#94A3B8;font-weight:600;margin:10px 0 4px;">Not taken yet</div>`;

      return `
      <div style="background:var(--white);border:1px solid var(--border-color);border-radius:16px;padding:22px;box-shadow:var(--shadow-sm);display:flex;flex-direction:column;gap:0;transition:box-shadow 0.2s,transform 0.2s;" 
           onmouseover="this.style.boxShadow='0 8px 24px rgba(0,0,0,0.1)';this.style.transform='translateY(-2px)'"
           onmouseout="this.style.boxShadow='var(--shadow-sm)';this.style.transform=''">

        <!-- Class Header -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
          <div>
            <div style="font-size:1rem;font-weight:800;color:var(--dark-bg);">${cls.name}</div>
            <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px;">Section ${cls.section}</div>
          </div>
          <div style="font-size:1.5rem;background:linear-gradient(135deg,rgba(99,102,241,0.1),rgba(0,98,227,0.1));padding:10px;border-radius:10px;">🏫</div>
        </div>

        <!-- Class Teacher -->
        <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bg-light);border-radius:10px;margin-bottom:14px;">
          <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#818CF8);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:0.68rem;flex-shrink:0;">${(cls.classTeacher || 'T').charAt(0).toUpperCase()}</div>
          <div>
            <div style="font-size:0.65rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Class Teacher</div>
            <div style="font-size:0.82rem;font-weight:600;color:var(--dark-bg);">${cls.classTeacher || 'Not Assigned'}</div>
          </div>
        </div>

        <!-- Progress -->
        ${progressBar}

        <!-- Stats Row -->
        <div style="display:flex;gap:10px;margin:10px 0 16px;">
          <div style="flex:1;text-align:center;padding:8px;background:#F0FDF4;border-radius:8px;">
            <div style="font-size:1.1rem;font-weight:800;color:#10B981;">${taken ? present : '–'}</div>
            <div style="font-size:0.65rem;color:#10B981;font-weight:700;text-transform:uppercase;">Present</div>
          </div>
          <div style="flex:1;text-align:center;padding:8px;background:#FEF2F2;border-radius:8px;">
            <div style="font-size:1.1rem;font-weight:800;color:#EF4444;">${taken ? absent : '–'}</div>
            <div style="font-size:0.65rem;color:#EF4444;font-weight:700;text-transform:uppercase;">Absent</div>
          </div>
          <div style="flex:1;text-align:center;padding:8px;background:#F8FAFC;border-radius:8px;">
            <div style="font-size:1.1rem;font-weight:800;color:var(--text-muted);">${total}</div>
            <div style="font-size:0.65rem;color:var(--text-muted);font-weight:700;text-transform:uppercase;">Total</div>
          </div>
        </div>

        <!-- Action Button -->
        <button onclick="window._attOpenMarkModal('${cls.id}')"
          style="width:100%;padding:11px 16px;font-size:0.85rem;font-weight:700;border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.2s;
          background:${taken ? 'linear-gradient(135deg,#10B981,#059669)' : 'linear-gradient(135deg,var(--primary),#6366F1)'};color:#fff;"
          onmouseover="this.style.opacity='0.88'" onmouseout="this.style.opacity='1'">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          ${taken ? 'Update Attendance' : 'Mark Attendance'}
        </button>
      </div>`;
    }).join('');
  }

  // ─── 2. Mark Attendance Modal ─────────────────────────────────────────────
  window._attOpenMarkModal = function(classId) {
    modalClassId  = classId;
    modalSearchQ  = '';
    const cls     = classes.find(c => c.id === classId);
    if (!cls) return;

    // Pre-fill from existing record if any
    const existing = getAttRecordForClassDate(classId, filterDate);
    modalDraftMap  = {};
    const stuList  = getStudentsForClass(classId);
    stuList.forEach(s => {
      if (existing) {
        const entry = (existing.entries || []).find(e => e.studentId === s.id);
        modalDraftMap[s.id] = entry ? entry.status : 'present';
      } else {
        modalDraftMap[s.id] = 'present'; // default all present
      }
    });

    // Set modal header
    const titleEl = document.getElementById('att-mark-modal-title');
    const subEl   = document.getElementById('att-mark-modal-sub');
    if (titleEl) titleEl.textContent = getClassLabel(cls);
    if (subEl)   subEl.textContent   = `${formatDate(filterDate)} · Class Teacher: ${cls.classTeacher || 'N/A'}`;

    // Clear search
    const searchInp = document.getElementById('att-mark-modal-search');
    if (searchInp) searchInp.value = '';

    renderModalTable();

    const modal = document.getElementById('att-mark-modal');
    if (modal) modal.style.display = 'flex';
  };

  function renderModalTable() {
    const tbody  = document.getElementById('att-mark-modal-tbody');
    const countEl= document.getElementById('att-mark-modal-count');
    if (!tbody || !modalClassId) return;

    let stuList = getStudentsForClass(modalClassId);
    if (modalSearchQ) {
      const q = modalSearchQ.toLowerCase();
      stuList = stuList.filter(s =>
        s.fullName.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        (s.admissionNumber || '').toLowerCase().includes(q)
      );
    }

    if (!stuList.length) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted);">No students found.</td></tr>`;
      return;
    }

    tbody.innerHTML = stuList.map(s => {
      const status   = modalDraftMap[s.id] || 'present';
      const isP      = status === 'present';
      const avatar   = `<div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--primary),#818CF8);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:0.68rem;flex-shrink:0;">${s.fullName.charAt(0)}</div>`;
      return `<tr style="border-bottom:1px solid var(--border-color);cursor:pointer;transition:background 0.12s;"
                  onmouseover="this.style.background='var(--bg-light)'" onmouseout="this.style.background=''">
        <td style="padding:11px 16px;font-size:0.82rem;font-weight:700;color:var(--text-muted);">${s.rollNumber}</td>
        <td style="padding:11px 16px;">
          <div style="display:flex;align-items:center;gap:10px;">
            ${avatar}
            <span style="font-weight:600;font-size:0.88rem;color:var(--dark-bg);">${s.fullName}</span>
          </div>
        </td>
        <td style="padding:11px 16px;font-size:0.8rem;color:var(--text-muted);">${s.admissionNumber || '–'}</td>
        <td style="padding:11px 16px;text-align:center;">
          <label style="cursor:pointer;display:flex;align-items:center;justify-content:center;">
            <input type="radio" name="modal_att_${s.id}" value="present" ${isP ? 'checked' : ''}
              onchange="window._attModalSetStatus('${s.id}','present')"
              style="accent-color:#10B981;width:18px;height:18px;cursor:pointer;">
          </label>
        </td>
        <td style="padding:11px 16px;text-align:center;">
          <label style="cursor:pointer;display:flex;align-items:center;justify-content:center;">
            <input type="radio" name="modal_att_${s.id}" value="absent" ${!isP ? 'checked' : ''}
              onchange="window._attModalSetStatus('${s.id}','absent')"
              style="accent-color:#EF4444;width:18px;height:18px;cursor:pointer;">
          </label>
        </td>
      </tr>`;
    }).join('');

    // Update footer count
    const presentCount = Object.values(modalDraftMap).filter(v => v === 'present').length;
    const absentCount  = Object.values(modalDraftMap).filter(v => v === 'absent').length;
    if (countEl) countEl.innerHTML = `<span style="color:#10B981;font-weight:800;">${presentCount} Present</span> · <span style="color:#EF4444;font-weight:800;">${absentCount} Absent</span>`;
  }

  window._attModalSetStatus = function(studentId, status) {
    modalDraftMap[studentId] = status;
    // Update footer count live
    const presentCount = Object.values(modalDraftMap).filter(v => v === 'present').length;
    const absentCount  = Object.values(modalDraftMap).filter(v => v === 'absent').length;
    const countEl = document.getElementById('att-mark-modal-count');
    if (countEl) countEl.innerHTML = `<span style="color:#10B981;font-weight:800;">${presentCount} Present</span> · <span style="color:#EF4444;font-weight:800;">${absentCount} Absent</span>`;
  };

  function modalBulkMark(status) {
    const isP = status === 'present';
    const label = isP ? 'Present' : 'Absent';
    const ok = confirm(`Are you sure you want to mark all students as ${label}?`);
    if (!ok) return;

    const stuList = getStudentsForClass(modalClassId);
    stuList.forEach(s => { modalDraftMap[s.id] = status; });
    renderModalTable();
  }

  function closeMarkModal() {
    const modal = document.getElementById('att-mark-modal');
    if (modal) modal.style.display = 'none';
    modalClassId = null;
    modalDraftMap = {};
  }

  function saveModalAttendance() {
    if (!modalClassId) return;
    const stuList = getStudentsForClass(modalClassId);
    if (!stuList.length) { alert('No students in this class.'); return; }

    const entries = stuList.map(s => ({
      studentId: s.id,
      status: modalDraftMap[s.id] || 'present',
      remarks: ''
    }));
    const presentCount = entries.filter(e => e.status === 'present').length;
    const absentCount  = entries.filter(e => e.status === 'absent').length;

    const newRec = {
      id: genId('att'),
      classId: modalClassId,
      date: filterDate,
      status: 'finalized',
      presentCount, absentCount,
      entries,
      createdAt: new Date().toISOString()
    };

    const idx = attendanceRecs.findIndex(r => r.classId === modalClassId && r.date === filterDate);
    if (idx >= 0) attendanceRecs[idx] = newRec;
    else attendanceRecs.unshift(newRec);

    setS('campuslink_attendance_records', attendanceRecs);
    closeMarkModal();
    updateCards();
    renderClassCards();

    // Show success toast
    showToast(`✅ Attendance saved — ${presentCount} Present, ${absentCount} Absent`);
  }

  function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:28px;right:24px;background:#1E293B;color:#fff;padding:12px 20px;border-radius:12px;font-size:0.85rem;font-weight:600;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.2);animation:fadeIn 0.2s ease;';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  // ─── 3. Attendance History ────────────────────────────────────────────────
  function renderHistory() {
    const tbody = document.getElementById('att-history-tbody');
    if (!tbody) return;

    const recs = [...attendanceRecs].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!recs.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:48px;color:var(--text-muted);">
        <div style="font-size:2rem;margin-bottom:8px;">📋</div><strong>No attendance records yet.</strong>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = recs.map(r => {
      const cls   = classes.find(c => c.id === r.classId);
      const total = (r.presentCount || 0) + (r.absentCount || 0);
      const pct   = total > 0 ? ((r.presentCount / total) * 100).toFixed(1) : '0.0';
      const pctC  = parseFloat(pct) >= 90 ? '#10B981' : parseFloat(pct) >= 75 ? '#F59E0B' : '#EF4444';
      return `<tr style="border-bottom:1px solid var(--border-color);">
        <td style="padding:12px 16px;font-weight:600;font-size:0.85rem;">${formatDate(r.date)}</td>
        <td style="padding:12px 16px;font-size:0.83rem;font-weight:600;">${cls ? cls.name : '–'}</td>
        <td style="padding:12px 16px;font-size:0.83rem;color:var(--text-muted);">${cls ? `Section ${cls.section}` : '–'}</td>
        <td style="padding:12px 16px;font-size:0.83rem;color:var(--text-muted);">${cls ? (cls.classTeacher || '–') : '–'}</td>
        <td style="padding:12px 16px;text-align:center;">
          <span style="font-weight:800;color:${pctC};">${pct}%</span>
          <div style="font-size:0.68rem;color:var(--text-muted);">${r.presentCount}P / ${r.absentCount}A</div>
        </td>
        <td style="padding:12px 16px;">${statusBadge(r.status)}</td>
      </tr>`;
    }).join('');
  }

  // ─── 4. Leave Requests ────────────────────────────────────────────────────
  function renderLeaves() {
    const tbody = document.getElementById('att-leaves-tbody');
    if (!tbody) return;

    const reqs = [...leaveRequests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (!reqs.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px;color:var(--text-muted);">
        <div style="font-size:2rem;margin-bottom:8px;">✉️</div><strong>No leave requests.</strong>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = reqs.map(l => {
      const cls = classes.find(c => c.id === l.classId);
      return `<tr style="border-bottom:1px solid var(--border-color);">
        <td style="padding:12px 16px;font-weight:600;font-size:0.85rem;">${l.studentName}</td>
        <td style="padding:12px 16px;font-size:0.83rem;color:var(--text-muted);">${cls ? getClassLabel(cls) : '–'}</td>
        <td style="padding:12px 16px;font-size:0.83rem;">${l.leaveType}</td>
        <td style="padding:12px 16px;font-size:0.83rem;">${formatDate(l.fromDate)}</td>
        <td style="padding:12px 16px;font-size:0.83rem;">${formatDate(l.toDate)}</td>
        <td style="padding:12px 16px;font-size:0.78rem;color:var(--text-muted);max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${l.reason}">${l.reason}</td>
        <td style="padding:12px 16px;">${statusBadge(l.status)}</td>
        <td style="padding:12px 16px;text-align:right;">
          ${l.status === 'pending'
            ? `<div style="display:flex;gap:6px;justify-content:flex-end;">
                 <button onclick="window._attLeaveAction('${l.id}','approved')" style="padding:5px 10px;font-size:0.75rem;font-weight:700;background:#ECFDF5;color:#065F46;border:1px solid #D1FAE5;border-radius:6px;cursor:pointer;">Approve</button>
                 <button onclick="window._attLeaveAction('${l.id}','rejected')" style="padding:5px 10px;font-size:0.75rem;font-weight:700;background:#FEF2F2;color:#991B1B;border:1px solid #FEE2E2;border-radius:6px;cursor:pointer;">Reject</button>
               </div>`
            : `<span style="font-size:0.78rem;color:var(--text-muted);">Reviewed</span>`}
        </td>
      </tr>`;
    }).join('');
  }

  window._attLeaveAction = function(id, action) {
    const idx = leaveRequests.findIndex(l => l.id === id);
    if (idx < 0) return;
    leaveRequests[idx].status = action;
    setS('campuslink_leave_requests', leaveRequests);
    updateCards();
    renderLeaves();
  };

  // ─── 5. Reports ───────────────────────────────────────────────────────────
  function renderReports() {
    const tbody = document.getElementById('att-class-summary-tbody');
    if (!tbody) return;

    tbody.innerHTML = classes.map(cls => {
      const stuList  = getStudentsForClass(cls.id);
      const recs     = attendanceRecs.filter(r => r.classId === cls.id);
      let present = 0, absent = 0;
      recs.forEach(r => { present += r.presentCount || 0; absent += r.absentCount || 0; });
      const total = present + absent;
      const pct   = total > 0 ? ((present / total) * 100).toFixed(1) : '–';
      const pctNum = parseFloat(pct);
      const pctC  = isNaN(pctNum) ? '#94A3B8' : pctNum >= 90 ? '#10B981' : pctNum >= 75 ? '#F59E0B' : '#EF4444';
      const status = isNaN(pctNum) ? 'No Data' : pctNum >= 90 ? '✅ Excellent' : pctNum >= 75 ? '⚠️ Good' : '❌ Low';
      return `<tr style="border-bottom:1px solid var(--border-color);">
        <td style="padding:10px 16px;font-weight:700;font-size:0.85rem;">${cls.name}</td>
        <td style="padding:10px 16px;font-size:0.83rem;color:var(--text-muted);">Section ${cls.section}</td>
        <td style="padding:10px 16px;font-size:0.83rem;">${cls.classTeacher || '–'}</td>
        <td style="padding:10px 16px;text-align:center;font-weight:700;">${stuList.length}</td>
        <td style="padding:10px 16px;text-align:center;font-weight:700;color:#10B981;">${present}</td>
        <td style="padding:10px 16px;text-align:center;font-weight:700;color:#EF4444;">${absent}</td>
        <td style="padding:10px 16px;text-align:center;font-weight:800;color:${pctC};">${isNaN(pctNum) ? '–' : pct + '%'}</td>
        <td style="padding:10px 16px;font-size:0.8rem;font-weight:600;">${status}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted);">No data available.</td></tr>`;
  }

  // ─── Event Wiring ─────────────────────────────────────────────────────────
  function bindEvents() {
    // Subtab buttons
    document.querySelectorAll('.attendance-subtab-btn').forEach(btn =>
      btn.addEventListener('click', () => switchSubtab(btn.getAttribute('data-subtab')))
    );

    // Date filter
    const dateEl = document.getElementById('att-filter-date');
    if (dateEl) {
      if (!dateEl.value) dateEl.value = filterDate;
      dateEl.addEventListener('change', () => {
        filterDate = dateEl.value;
        updateCards();
        if (activeSubtab === 'take') renderClassCards();
      });
    }

    // Modal close
    ['btn-att-mark-modal-close', 'btn-att-mark-modal-cancel'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', closeMarkModal);
    });
    const modal = document.getElementById('att-mark-modal');
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeMarkModal(); });

    // Modal bulk
    const btnAllP = document.getElementById('btn-modal-all-present');
    const btnAllA = document.getElementById('btn-modal-all-absent');
    if (btnAllP) btnAllP.addEventListener('click', () => modalBulkMark('present'));
    if (btnAllA) btnAllA.addEventListener('click', () => modalBulkMark('absent'));

    // Modal save
    const btnSave = document.getElementById('btn-att-mark-modal-save');
    if (btnSave) btnSave.addEventListener('click', saveModalAttendance);

    // Modal search
    const searchInp = document.getElementById('att-mark-modal-search');
    if (searchInp) searchInp.addEventListener('input', () => {
      modalSearchQ = searchInp.value;
      renderModalTable();
    });

    // View record modal close
    const viewClose = document.getElementById('btn-att-view-modal-close');
    if (viewClose) viewClose.addEventListener('click', () => {
      const m = document.getElementById('att-view-modal');
      if (m) m.style.display = 'none';
    });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  function initAttendanceTab() {
    load();
    // Set today's date in date input
    const dateEl = document.getElementById('att-filter-date');
    if (dateEl) { dateEl.value = filterDate; }

    bindEvents();
    updateCards();
    switchSubtab('take');
  }

  window.initAttendanceTab = initAttendanceTab;

})();
