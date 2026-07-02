// classroom.js
// React-based premium Teacher Workspace for CampusLink Classroom

const { useState, useEffect, useMemo } = React;

// ── Mock Database ───────────────────────────────────────────
const INITIAL_CLASSES = [
  { id: 'ix-a', name: 'IX-A', subject: 'Mathematics', room: 'Room 102', studentsCount: 42, attendance: '92%', homeworkStatus: '2 Pending', upcomingTest: 'Monday (Quadratic Eq.)', favorite: true },
  { id: 'ix-b', name: 'IX-B', subject: 'Physics', room: 'Room 104', studentsCount: 38, attendance: '88%', homeworkStatus: '1 Pending', upcomingTest: 'Wednesday (Optics)', favorite: true },
  { id: 'viii-c', name: 'VIII-C', subject: 'Science', room: 'Room 201', studentsCount: 45, attendance: '95%', homeworkStatus: 'Completed', upcomingTest: 'Friday (Cells)', favorite: false },
  { id: 'x-a', name: 'X-A', subject: 'Computer Lab', room: 'Lab 2', studentsCount: 40, attendance: '91%', homeworkStatus: '3 Pending', upcomingTest: 'None', favorite: false }
];

const INITIAL_STUDENTS = [
  { id: 1, rollNumber: '01', name: 'Aarav Patel', grade: 'A', remarks: 'Excellent participation' },
  { id: 2, rollNumber: '02', name: 'Aditya Sharma', grade: 'B+', remarks: 'Consistent performer' },
  { id: 3, rollNumber: '03', name: 'Priya Gupta', grade: 'A+', remarks: 'Top scores in quiz' },
  { id: 4, rollNumber: '04', name: 'Sneha Rao', grade: 'A', remarks: 'Neat notebook submission' },
  { id: 5, rollNumber: '05', name: 'Rahul Verma', grade: 'C', remarks: 'Needs revision in algebra' },
  { id: 6, rollNumber: '06', name: 'Rohan Das', grade: 'B', remarks: 'Good classroom behavior' },
  { id: 7, rollNumber: '07', name: 'Ananya Mishra', grade: 'A', remarks: 'Active learner' },
  { id: 8, rollNumber: '08', name: 'Dev Singh', grade: 'B-', remarks: 'Working on homework speed' },
  { id: 9, rollNumber: '09', name: 'Isha Shah', grade: 'A+', remarks: 'Exceptional assignment quality' },
  { id: 10, rollNumber: '10', name: 'Arjun Mehta', grade: 'B', remarks: 'Attentive and respectful' }
];

const INITIAL_SCHEDULE = [
  { time: '08:00 AM', subject: 'Mathematics', class: 'IX-A', room: 'Room 102', color: 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' },
  { time: '09:15 AM', subject: 'Physics', class: 'IX-B', room: 'Room 104', color: 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' },
  { time: '11:00 AM', subject: 'Science', class: 'VIII-C', room: 'Room 201', color: 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20' },
  { time: '02:00 PM', subject: 'Computer Lab', class: 'X-A', room: 'Lab 2', color: 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20' }
];

const INITIAL_PRIORITY = [
  { id: 1, task: 'Attendance Pending', detail: 'IX-B Physics', priority: 'High', deadline: 'Today 10:00 AM', status: 'Pending', type: 'attendance' },
  { id: 2, task: 'Assignments to Review', detail: 'IX-A Math (Quadratic)', priority: 'Medium', deadline: 'Tomorrow', status: '12 Ungraded', type: 'assignments' },
  { id: 3, task: 'Parent Message', detail: 'Mr. Verma (Rahul\'s Dad)', priority: 'High', deadline: 'Today', status: 'Unread', type: 'messages' },
  { id: 4, task: 'Upcoming Examination Prep', detail: 'X-A Quiz Sheet', priority: 'Low', deadline: '29th June', status: 'Drafting', type: 'homework' }
];

const INITIAL_HOMEWORKS = [
  { id: 1, title: 'Quadratic Equations Exercise 4.2', description: 'Solve all questions from Q1 to Q10 in homework notebook.', dueDate: '2026-06-28', attachments: ['exercise_4.2.pdf'], visibility: 'All Students', className: 'IX-A', status: 'Submitted', count: '35/42' },
  { id: 2, title: 'Newton\'s Laws of Motion Lab Report', description: 'Draft a short lab report documenting the coin-card-glass experiment.', dueDate: '2026-06-29', attachments: ['experiment_setup.png'], visibility: 'All Students', className: 'IX-B', status: 'Pending', count: '12/38' }
];

const INITIAL_SUBMISSIONS = [
  { id: 1, studentName: 'Aarav Patel', rollNumber: '01', submittedDate: 'Yesterday', file: 'Quadratic_Equations_Ex4.pdf', text: 'Here is my completed work for quadratic equations, Ma\'am.', grade: '', feedback: '' },
  { id: 2, studentName: 'Sneha Rao', rollNumber: '04', submittedDate: 'Today', file: 'Sneha_Math_Ex4_2.pdf', text: 'Exercise 4.2 attached. Completed all questions.', grade: '', feedback: '' },
  { id: 3, studentName: 'Aditya Sharma', rollNumber: '02', submittedDate: '2 days ago', file: 'Math_Doc_Aditya.pdf', text: 'Math homework doc attached.', grade: 'A', feedback: 'Great work, very neat steps.' }
];

const CHAPTER_RESOURCES = [
  {
    chapter: 'Chapter 1: Real Numbers',
    files: [
      { name: 'Real_Numbers_Slides.ppt', type: 'ppt', size: '4.2 MB' },
      { name: 'Exercise_1.1_Solutions.pdf', type: 'pdf', size: '1.8 MB' },
      { name: 'Concept of Real Numbers', type: 'youtube', link: 'https://youtube.com/watch?v=realnumbers' }
    ]
  },
  {
    chapter: 'Chapter 2: Polynomials',
    files: [
      { name: 'Polynomials_Cheat_Sheet.pdf', type: 'pdf', size: '920 KB' },
      { name: 'Practice Worksheets Folder', type: 'gdrive', link: 'https://drive.google.com/polynomials' }
    ]
  }
];

const INITIAL_MESSAGES = {
  students: [
    { sender: 'Aarav Patel', text: 'Ma\'am, will the test cover chapter 4?', time: '02:30 PM', unread: true },
    { sender: 'Sneha Rao', text: 'Thank you for the notes.', time: 'Yesterday', unread: false }
  ],
  parents: [
    { sender: 'Mr. Verma (Rahul\'s Dad)', text: 'Rahul was sick yesterday, I have uploaded his medical certificate.', time: '01:15 PM', unread: true },
    { sender: 'Mrs. Gupta (Priya\'s Mom)', text: 'Is Priya doing well in Math?', time: 'Wednesday', unread: false }
  ],
  admin: [
    { sender: 'Principal Office', text: 'All teachers please submit attendance before 10:00 AM.', time: '08:00 AM', unread: true },
    { sender: 'Vice Principal', text: 'Staff meeting at 03:00 PM today in Conference Hall.', time: '09:00 AM', unread: false }
  ]
};

const INITIAL_NOTIFICATIONS = [
  { id: 1, text: 'Aarav Patel submitted Homework: Quadratic Equations', time: '10 mins ago', read: false },
  { id: 2, text: 'Parent Replied: Mr. Verma (Rahul\'s Dad) sent a message', time: '1 hour ago', read: false },
  { id: 3, text: 'Attendance Reminder: Please complete IX-B attendance', time: '2 hours ago', read: true },
  { id: 4, text: 'Principal Announcement: School picnic schedule updated', time: '1 day ago', read: true }
];

const MOCK_CALENDAR_EVENTS = [
  { day: 5, type: 'exam', title: 'Unit Test Math' },
  { day: 12, type: 'ptm', title: 'Parent-Teacher Meeting' },
  { day: 18, type: 'meeting', title: 'Academic Review Meeting' },
  { day: 26, type: 'event', title: 'Annual Day Rehearsal' }
];

// ── Icons (Custom Styled SVGs for Premium Looks) ─────────────────
const Icons = {
  BookOpen: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Bell: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Menu: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Close: () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  User: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Sun: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  Moon: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  ArrowRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  FileText: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Folder: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  MessageSquare: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  BarChart: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Settings: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  LogOut: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/><path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5Z"/><path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z"/></svg>,
  FilePlus: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  Send: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Info: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
};

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [activeClass, setActiveClass] = useState(null);
  const [classroomTab, setClassroomTab] = useState('overview');
  
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Dynamic Datasets
  const [classes, setClasses] = useState(INITIAL_CLASSES);
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [priorityTasks, setPriorityTasks] = useState(INITIAL_PRIORITY);
  const [homeworks, setHomeworks] = useState(INITIAL_HOMEWORKS);
  const [submissions, setSubmissions] = useState(INITIAL_SUBMISSIONS);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  
  // Homework Creator State
  const [newHwTitle, setNewHwTitle] = useState('');
  const [newHwDesc, setNewHwDesc] = useState('');
  const [newHwDate, setNewHwDate] = useState('');
  const [newHwClass, setNewHwClass] = useState('IX-A');
  const [newHwVisible, setNewHwVisible] = useState('All Students');
  
  // Attendance Roll Call State
  const [rollCall, setRollCall] = useState({});
  const [attendanceSubmittedClass, setAttendanceSubmittedClass] = useState(null);
  
  // Quick Grading State
  const [selectedSubIndex, setSelectedSubIndex] = useState(0);
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');

  // Bulk Marks Upload State
  const [bulkMarks, setBulkMarks] = useState(
    INITIAL_STUDENTS.reduce((acc, student) => {
      acc[student.id] = { marks: student.grade === 'A+' ? '20' : student.grade === 'A' ? '18' : '15', max: '20', remarks: student.remarks };
      return acc;
    }, {})
  );

  // Floating AI Assistant State
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMessages, setAiMessages] = useState([
    { role: 'assistant', content: 'Good day! I am CampusLink AI. Choose a quick utility below or type a custom request to help generate lessons, test papers, worksheets, or emails.' }
  ]);

  // Slack-like chat window states
  const [msgTab, setMsgTab] = useState('students');
  const [activeChatIndex, setActiveChatIndex] = useState(0);
  const [chatInput, setChatInput] = useState('');

  // Classroom Ownership Integration State
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [readOnlyReason, setReadOnlyReason] = useState('');
  const [classroomSource, setClassroomSource] = useState('mock'); // 'mock' | 'database'

  // Fetch classroom assignments from Supabase on mount
  useEffect(() => {
    async function fetchTeacherAssignments() {
      // Access the globally initialized Supabase client
      const sb = window.supabaseClient || (window.CampusLink && window.CampusLink.supabase);
      if (!sb) {
        console.log('Supabase client not available, using mock classroom data.');
        return;
      }

      try {
        // Get current authenticated user
        const { data: { user }, error: userErr } = await sb.auth.getUser();
        if (userErr || !user) {
          console.log('No authenticated user found, using mock classroom data.');
          return;
        }

        const teacherId = user.id;

        // Query active classroom assignments for this teacher
        const { data: assignments, error: assignErr } = await sb.from('classroom_teacher_assignments')
          .select(`
            id, classroom_id, assignment_type, start_date, end_date, is_active,
            classroom:classrooms!classroom_id(id, grade, section, room, academic_year_id, is_archived)
          `)
          .eq('teacher_id', teacherId)
          .eq('is_active', true);

        if (assignErr) {
          console.warn('Failed to fetch classroom assignments:', assignErr.message);
          return;
        }

        if (!assignments || assignments.length === 0) {
          console.log('No active classroom assignments found for this teacher.');
          return;
        }

        // Transform database assignments into the classes format expected by the UI
        const dbClasses = assignments
          .filter(a => a.classroom && !a.classroom.is_archived)
          .map((a, index) => ({
            id: a.classroom.id,
            name: `${a.classroom.grade}-${a.classroom.section}`,
            subject: a.assignment_type === 'temporary' ? 'Temporary Assignment' : 'Class Teacher',
            room: a.classroom.room || 'N/A',
            studentsCount: 0,
            attendance: '—',
            homeworkStatus: '—',
            upcomingTest: 'None',
            favorite: index < 2,
            assignmentType: a.assignment_type,
            startDate: a.start_date,
            endDate: a.end_date
          }));

        if (dbClasses.length > 0) {
          setClasses(dbClasses);
          setClassroomSource('database');
        }

        // Check if any of this teacher's PERMANENT assignments have an active temporary replacement
        const permanentAssignments = assignments.filter(a => a.assignment_type === 'permanent');
        for (const permAssign of permanentAssignments) {
          // Query for active temporary assignments on the same classroom
          const { data: tempAssigns } = await sb.from('classroom_teacher_assignments')
            .select('id, teacher_id, start_date, end_date, is_active')
            .eq('classroom_id', permAssign.classroom_id)
            .eq('assignment_type', 'temporary')
            .eq('is_active', true);

          if (tempAssigns && tempAssigns.length > 0) {
            const now = new Date();
            const activeTempAssign = tempAssigns.find(t => {
              const start = new Date(t.start_date);
              const end = t.end_date ? new Date(t.end_date) : null;
              return start <= now && (!end || now <= end);
            });

            if (activeTempAssign) {
              setIsReadOnly(true);
              const endStr = activeTempAssign.end_date
                ? new Date(activeTempAssign.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : 'until further notice';
              setReadOnlyReason(
                `A temporary teacher is currently managing your classroom${permAssign.classroom ? ` (${permAssign.classroom.grade}-${permAssign.classroom.section})` : ''}. Your write access is restricted until ${endStr}.`
              );
              break;
            }
          }
        }
      } catch (err) {
        console.warn('Error fetching teacher assignments:', err);
      }
    }

    fetchTeacherAssignments();
  }, []);

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (e) => {
      // ALT + A: Open Attendance for Active Class or first class
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const defaultClass = activeClass || classes[0];
        openClassroomView(defaultClass, 'attendance');
      }
      // ALT + S: Open Global Search
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      // ESC: Close overlays
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsHamburgerOpen(false);
        setIsNotificationsOpen(false);
        setIsAiOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeClass, classes]);

  // Theme Management
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    const htmlEl = document.documentElement;
    if (htmlEl.classList.contains('dark')) {
      htmlEl.classList.remove('dark');
      htmlEl.classList.add('light');
    } else {
      htmlEl.classList.remove('light');
      htmlEl.classList.add('dark');
    }
  };

  // Helper to open classroom tab
  const openClassroomView = (cls, tab = 'overview') => {
    setActiveClass(cls);
    setClassroomTab(tab);
    setCurrentView('classroom');
    setIsHamburgerOpen(false);
    
    // Auto-populate roll call statuses if attendance screen
    if (tab === 'attendance') {
      const initialCall = {};
      students.forEach(st => {
        initialCall[st.id] = 'present';
      });
      setRollCall(initialCall);
    }
  };

  // Nav Handlers
  const handleNavClick = (view) => {
    setCurrentView(view);
    setIsHamburgerOpen(false);
    if (view !== 'classroom') {
      setActiveClass(null);
    }
  };

  // Submit Attendance Handler
  const handleAttendanceSubmit = (e) => {
    e.preventDefault();
    if (isReadOnly) { alert('You are currently in read-only mode. A temporary teacher is managing this classroom.'); return; }
    setAttendanceSubmittedClass(activeClass.name);
    // Remove "Attendance Pending" task if submitting for IX-B
    if (activeClass.name === 'IX-B') {
      setPriorityTasks(priorityTasks.filter(t => t.id !== 1));
    }
    setTimeout(() => {
      setAttendanceSubmittedClass(null);
      setClassroomTab('overview');
    }, 2000);
  };

  // Create Homework Handler
  const handlePostHomework = (e) => {
    e.preventDefault();
    if (isReadOnly) { alert('You are currently in read-only mode. A temporary teacher is managing this classroom.'); return; }
    if (!newHwTitle || !newHwDesc) return;
    
    const newHw = {
      id: Date.now(),
      title: newHwTitle,
      description: newHwDesc,
      dueDate: newHwDate || '2026-06-30',
      attachments: ['shared_notes.pdf'],
      visibility: newHwVisible,
      className: newHwClass,
      status: 'Pending',
      count: '0/' + (newHwClass === 'IX-A' ? '42' : '38')
    };

    setHomeworks([newHw, ...homeworks]);
    setNewHwTitle('');
    setNewHwDesc('');
    setNewHwDate('');
    
    // Redirect to active classroom homework tab
    const matchedClass = classes.find(c => c.name === newHwClass) || classes[0];
    openClassroomView(matchedClass, 'homework');
  };

  // Grading Submit Handler
  const handleGradingSubmit = (e) => {
    e.preventDefault();
    if (isReadOnly) { alert('You are currently in read-only mode. A temporary teacher is managing this classroom.'); return; }
    const updatedSubmissions = [...submissions];
    updatedSubmissions[selectedSubIndex].grade = gradeInput || 'A';
    updatedSubmissions[selectedSubIndex].feedback = feedbackInput || 'Well done.';
    
    setSubmissions(updatedSubmissions);
    setGradeInput('');
    setFeedbackInput('');
    
    // If we completed grading first two, remove task
    if (selectedSubIndex === 0) {
      setPriorityTasks(priorityTasks.map(t => t.id === 2 ? { ...t, status: 'Completed', priority: 'Low' } : t));
    }
  };

  // Save Bulk Marks Handler
  const handleSaveBulkMarks = (e) => {
    e.preventDefault();
    if (isReadOnly) { alert('You are currently in read-only mode. A temporary teacher is managing this classroom.'); return; }
    alert('Academic Marks successfully saved to database container!');
  };

  // Chat send message
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const currentChats = [...messages[msgTab]];
    // Add user message
    const activeChat = currentChats[activeChatIndex];
    
    const newMsg = {
      sender: 'Mrs. Sharma',
      text: chatInput,
      time: 'Just now',
      unread: false,
      isMe: true
    };
    
    // Simulate active thread by simply appending or alerting
    alert(`Message sent to ${activeChat.sender}: "${chatInput}"`);
    setChatInput('');
  };

  // AI Prompt Runner
  const handleAiAction = async (promptText) => {
    setAiLoading(true);
    setAiMessages(prev => [...prev, { role: 'user', content: promptText }]);
    
    setTimeout(() => {
      let aiResponse = '';
      if (promptText.includes('Homework')) {
        aiResponse = `### 📚 Generated Homework assignment: Quadratic Equations (Grade IX)

**Instructions:** Complete these exercises in your revision workbook by Monday.
1. Solve $3x^2 - 5x + 2 = 0$ using factorization.
2. Find the discriminant of $x^2 - 4x + 4 = 0$ and describe the nature of roots.
3. Word Problem: The product of two consecutive positive integers is 306. Find the integers by forming a quadratic equation.`;
      } else if (promptText.includes('Lesson')) {
        aiResponse = `### 📝 Generated Lesson Plan: Introduction to Polynomials

- **Grade:** IX  |  **Subject:** Mathematics  |  **Duration:** 45 Mins
- **Objectives:** Students will learn to identify variables, coefficients, and degrees of polynomials.
- **Timeline:**
  - **0-10m (Hook):** Display visual shapes (squares, boxes) to represent expressions like $x^2 + 2x$.
  - **10-25m (Direct Instruction):** Introduce algebraic terminology. Contrast expressions vs. polynomials.
  - **25-40m (Group Activity):** Students sort 10 index cards of mathematical expressions.
  - **40-45m (Exit Ticket):** Solve: "Write a binomial of degree 35."`;
      } else if (promptText.includes('Message')) {
        aiResponse = `### ✉️ Drafted Message to Parent (Rahul's Dad)

"Dear Mr. Verma, 
I hope you are doing well. I wanted to check in regarding Rahul's progress in Algebra. While he displays high analytical capacity during class discussions, his homework submissions for Exercise 4.1 have been pending. 

Could we coordinate to ensure he completes these worksheets this weekend? Thank you for your continued support!

Warm regards,
Mrs. Sharma"`;
      } else {
        aiResponse = `### 💡 CampusLink AI Assistance

Here is a summary response for: **"${promptText}"**

To teach this effectively:
1. Break down the topic into 3 visual sub-topics.
2. Provide concrete classroom analogies (e.g. comparing balance scales to equations).
3. Draft a 3-question self-check worksheet for student self-evaluation.`;
      }
      
      setAiMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      setAiLoading(false);
    }, 1500);
  };

  // Global Search Filter
  const filteredSearchItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    
    const results = [];
    
    // Search Classes
    classes.forEach(c => {
      if (c.name.toLowerCase().includes(query) || c.subject.toLowerCase().includes(query)) {
        results.push({ category: 'Classroom', label: `${c.name} - ${c.subject}`, action: () => openClassroomView(c) });
      }
    });

    // Search Students
    students.forEach(st => {
      if (st.name.toLowerCase().includes(query)) {
        results.push({ category: 'Student', label: `${st.name} (Roll: ${st.rollNumber})`, action: () => handleNavClick('profile') });
      }
    });

    // Search Homeworks
    homeworks.forEach(hw => {
      if (hw.title.toLowerCase().includes(query)) {
        results.push({ category: 'Homework', label: hw.title, action: () => handleNavClick('homework') });
      }
    });

    return results;
  }, [searchQuery, classes, students, homeworks]);

  // Attendance statistics
  const attendanceMarkedCount = Object.keys(rollCall).length;
  const attendancePresentCount = Object.values(rollCall).filter(s => s === 'present').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* ── Sticky Header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 md:px-6 py-4 flex items-center justify-between transition-colors duration-300">
        
        {/* Left Side: Burger Menu + Logo */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsHamburgerOpen(true)}
            className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
            aria-label="Open navigation menu"
          >
            <Icons.Menu />
          </button>
          
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavClick('dashboard')}>
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5v-15A2.5 2.5 0 0 1 6.5 2M20 2v20" />
                <path d="M6 6h10M6 10h10" />
              </svg>
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                CampusLink Classroom
              </div>
              <div className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500">
                Teacher Workspace
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Global Search + Notifications + Mode Toggle + Profile */}
        <div className="flex items-center gap-3">
          
          {/* Global Search Bar Button */}
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-sm transition-all duration-200"
          >
            <Icons.Search />
            <span>Search...</span>
            <kbd className="text-[10px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-slate-400 font-semibold select-none">Alt + S</kbd>
          </button>
          
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="md:hidden p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Search"
          >
            <Icons.Search />
          </button>

          {/* Dark / Light Toggle */}
          <button 
            onClick={toggleDarkMode}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
            aria-label="Toggle visual theme mode"
          >
            {isDarkMode ? <Icons.Sun /> : <Icons.Moon />}
          </button>

          {/* Notification Bell Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 relative transition-all duration-200"
              aria-label="Notifications"
            >
              <Icons.Bell />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500"></span>
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-xl py-3 z-50 animate-fade-in">
                <div className="px-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Recent Notifications</h4>
                  <button onClick={() => setNotifications(notifications.map(n => ({...n, read: true})))} className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline">Mark all read</button>
                </div>
                <div className="max-h-72 overflow-y-auto mt-2">
                  {notifications.map(notif => (
                    <div key={notif.id} className={`px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-850/50 flex items-start gap-2.5 border-b border-slate-50 dark:border-slate-850 last:border-none ${!notif.read ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}`}>
                      <div className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 ${notif.read ? 'bg-transparent' : 'bg-blue-600'}`}></div>
                      <div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{notif.text}</p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">{notif.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill Icon */}
          <button 
            onClick={() => handleNavClick('profile')}
            className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-slate-850 overflow-hidden border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:scale-105 transition-all duration-200"
            aria-label="View user profile"
          >
            <div className="font-bold text-sm bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 h-full w-full flex items-center justify-center">
              MS
            </div>
          </button>

        </div>
      </header>

      {/* ── Fullscreen Animated Hamburger Slide Panel ───────────── */}
      {isHamburgerOpen && (
        <div className="fixed inset-0 z-50 flex animate-fade-in">
          {/* Overlay background */}
          <div onClick={() => setIsHamburgerOpen(false)} className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm"></div>
          
          {/* Menu Drawer */}
          <aside className="relative w-80 max-w-sm bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-slide-in">
            <div className="flex items-center justify-between mb-8">
              <span className="font-extrabold text-lg text-slate-900 dark:text-white">Workspace Menu</span>
              <button 
                onClick={() => setIsHamburgerOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-400"
              >
                <Icons.Close />
              </button>
            </div>

            {/* Pinned Recent Classrooms */}
            <div className="mb-6">
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Pinned Classrooms</h5>
              <div className="space-y-1">
                {classes.filter(c => c.favorite).map(c => (
                  <button 
                    key={c.id} 
                    onClick={() => openClassroomView(c, 'overview')}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-white transition-all duration-150"
                  >
                    <span className="text-blue-500">📌</span>
                    <span>{c.name} — {c.subject}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Navigation Links */}
            <nav className="flex-1 space-y-1.5">
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Modules</h5>
              
              <button 
                onClick={() => handleNavClick('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850'}`}
              >
                <span className="h-5 w-5 flex items-center justify-center"><Icons.FileText /></span>
                <span>Home Dashboard</span>
              </button>

              <button 
                onClick={() => handleNavClick('classes')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${currentView === 'classes' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850'}`}
              >
                <span className="h-5 w-5 flex items-center justify-center"><Icons.BookOpen /></span>
                <span>My Classes</span>
              </button>

              <button 
                onClick={() => handleNavClick('homework')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${currentView === 'homework' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-855'}`}
              >
                <span className="h-5 w-5 flex items-center justify-center"><Icons.FilePlus /></span>
                <span>Homework Manager</span>
              </button>

              <button 
                onClick={() => handleNavClick('assignments')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${currentView === 'assignments' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850'}`}
              >
                <span className="h-5 w-5 flex items-center justify-center"><Icons.Check /></span>
                <span>Assignment Reviews</span>
              </button>

              <button 
                onClick={() => handleNavClick('resources')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${currentView === 'resources' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850'}`}
              >
                <span className="h-5 w-5 flex items-center justify-center"><Icons.Folder /></span>
                <span>Shared Resources</span>
              </button>

              <button 
                onClick={() => handleNavClick('messages')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${currentView === 'messages' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850'}`}
              >
                <span className="h-5 w-5 flex items-center justify-center"><Icons.MessageSquare /></span>
                <span>Slack Messages</span>
              </button>

              <button 
                onClick={() => handleNavClick('calendar')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${currentView === 'calendar' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850'}`}
              >
                <span className="h-5 w-5 flex items-center justify-center"><Icons.Calendar /></span>
                <span>Classroom Calendar</span>
              </button>

              <button 
                onClick={() => handleNavClick('analytics')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${currentView === 'analytics' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850'}`}
              >
                <span className="h-5 w-5 flex items-center justify-center"><Icons.BarChart /></span>
                <span>Performance Insights</span>
              </button>

              <button 
                onClick={() => handleNavClick('settings')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${currentView === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850'}`}
              >
                <span className="h-5 w-5 flex items-center justify-center"><Icons.Settings /></span>
                <span>Workspace Settings</span>
              </button>

              <button 
                onClick={() => { alert('Signing out of CampusLink workspace...'); window.location.href = 'login.html'; }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-150"
              >
                <span className="h-5 w-5 flex items-center justify-center"><Icons.LogOut /></span>
                <span>Logout Session</span>
              </button>
            </nav>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 text-center font-medium">
              CampusLink Classroom v1.8.0
            </div>
          </aside>
        </div>
      )}

      {/* ── Global Search Popup Overlay ─────────────────────────── */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 animate-fade-in">
          <div onClick={() => setIsSearchOpen(false)} className="absolute inset-0 bg-slate-900/30 dark:bg-slate-950/50 backdrop-blur-sm"></div>
          
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-2xl overflow-hidden p-4 z-50">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-slate-400"><Icons.Search /></span>
              <input 
                autoFocus 
                type="text" 
                placeholder="Search students, classes, homework, assignments..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-base bg-transparent outline-none text-slate-800 dark:text-white placeholder-slate-400 font-medium"
              />
              <button onClick={() => setIsSearchOpen(false)} className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">ESC</button>
            </div>

            {searchQuery.trim() ? (
              <div className="mt-3 max-h-80 overflow-y-auto space-y-1">
                {filteredSearchItems.length > 0 ? (
                  filteredSearchItems.map((item, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => { item.action(); setIsSearchOpen(false); setSearchQuery(''); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850/50 text-left text-sm font-medium transition-all duration-150"
                    >
                      <span className="text-slate-700 dark:text-slate-200">{item.label}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md">{item.category}</span>
                    </button>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400 dark:text-slate-500">
                    <p className="text-sm font-medium">No results found for "{searchQuery}"</p>
                    <p className="text-xs mt-1">Try searching for "IX", "Aarav", or "Quadratic"</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 px-1 text-slate-400 dark:text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-widest block mb-2">Quick Commands</span>
                <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-850/50 rounded-xl flex items-center justify-between">
                    <span>Take Attendance</span>
                    <kbd className="bg-white dark:bg-slate-900 border px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-400">Alt + A</kbd>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-850/50 rounded-xl flex items-center justify-between">
                    <span>Search Global</span>
                    <kbd className="bg-white dark:bg-slate-900 border px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-400">Alt + S</kbd>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Main Workspace Content Area ────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 pb-20">
        
        {/* Read-Only Banner when temporary teacher is active */}
        {isReadOnly && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-premium p-4 flex items-start gap-3 animate-fade-in">
            <div className="h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-800 dark:text-amber-300">Classroom Access Restricted</h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">{readOnlyReason}</p>
              <p className="text-[10px] text-amber-500 dark:text-amber-500 mt-2 font-semibold uppercase tracking-wider">View-Only Mode Active</p>
            </div>
          </div>
        )}
        {/* ── VIEW 1: Home Dashboard ────────────────────────────── */}
        {currentView === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Top Row: Greeting Card + Today's Schedule */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Greeting Widget */}
              <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 md:p-8 rounded-premium shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-6 translate-x-6">
                  <svg width="220" height="220" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>
                </div>
                
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Good Morning,<br />Mrs. Sharma 👋</h1>
                  <p className="text-blue-100 text-sm mt-3 font-medium max-w-md">3 classes scheduled for today. Let's make learning amazing with interactive activities.</p>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button 
                    onClick={() => handleNavClick('classes')}
                    className="px-5 py-2.5 bg-white text-blue-700 text-xs font-bold rounded-xl shadow-md hover:bg-slate-100 transition-all duration-200"
                  >
                    Open Classrooms
                  </button>
                  <button 
                    onClick={() => openClassroomView(classes[0], 'attendance')}
                    className="px-5 py-2.5 bg-blue-500/30 text-white text-xs font-bold rounded-xl hover:bg-blue-500/40 transition-all duration-200 border border-blue-400/20"
                  >
                    Direct Roll Call
                  </button>
                </div>
              </div>

              {/* Today's Schedule Timeline */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-premium shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Today's Schedule</h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                </div>

                <div className="flex-1 space-y-4 relative border-l border-slate-100 dark:border-slate-800 pl-4 ml-2">
                  {INITIAL_SCHEDULE.map((slot, idx) => (
                    <div key={idx} className="relative group">
                      {/* Timeline Node */}
                      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-600 border border-white dark:border-slate-950 group-hover:scale-125 transition-transform duration-200"></span>
                      
                      <div className={`p-3 rounded-xl border-l-4 ${slot.color} transition-all duration-200 hover:translate-x-1`}>
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{slot.time}</span>
                          <span className="text-[10px] font-bold bg-white dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-800/50">{slot.room}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white mt-1">{slot.subject}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{slot.class}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Quick Actions Row */}
            <div>
              <h3 className="font-extrabold text-lg text-slate-800 dark:text-white mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                
                <div 
                  onClick={() => openClassroomView(classes[0], 'attendance')}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-premium shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[140px] group ripple-btn"
                >
                  <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-200">
                    <Icons.Check />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-white mt-4">Take Attendance</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">Roll Call</p>
                  </div>
                </div>

                <div 
                  onClick={() => handleNavClick('homework')}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-premium shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[140px] group ripple-btn"
                >
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200">
                    <Icons.FilePlus />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-white mt-4">Assign Homework</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">Exercises</p>
                  </div>
                </div>

                <div 
                  onClick={() => handleNavClick('resources')}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-premium shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[140px] group ripple-btn"
                >
                  <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all duration-200">
                    <Icons.Folder />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-white mt-4">Upload Notes</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">PPT, PDF</p>
                  </div>
                </div>

                <div 
                  onClick={() => handleNavClick('assignments')}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-premium shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[140px] group ripple-btn"
                >
                  <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all duration-200">
                    <Icons.Check />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-white mt-4">Create Assignment</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">Grading Queue</p>
                  </div>
                </div>

                <div 
                  onClick={() => openClassroomView(classes[0], 'overview')}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-premium shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[140px] group ripple-btn"
                >
                  <div className="h-10 w-10 rounded-xl bg-pink-50 dark:bg-pink-950/50 text-pink-600 flex items-center justify-center group-hover:bg-pink-600 group-hover:text-white transition-all duration-200">
                    <Icons.MessageSquare />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-white mt-4">Post Announcement</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">Notice Board</p>
                  </div>
                </div>

                <div 
                  onClick={() => { setIsAiOpen(true); handleAiAction('Generate Quiz on Polynomials'); }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-premium shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[140px] group ripple-btn"
                >
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200">
                    <Icons.Sparkles />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-white mt-4">Create Quiz</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">AI Powered</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Statistics Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-premium shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Classes Today</span>
                <div className="flex justify-between items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">4 Classes</span>
                  <span className="text-xs text-blue-600 font-bold bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">100% Load</span>
                </div>
                {/* SVG Visual Mini-Chart */}
                <div className="h-8 mt-3 flex items-end gap-1.5">
                  <div className="w-full bg-blue-100 dark:bg-blue-950 h-5 rounded-sm"></div>
                  <div className="w-full bg-blue-100 dark:bg-blue-950 h-7 rounded-sm"></div>
                  <div className="w-full bg-blue-600 h-8 rounded-sm"></div>
                  <div className="w-full bg-blue-100 dark:bg-blue-950 h-4 rounded-sm"></div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-premium shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Total Students</span>
                <div className="flex justify-between items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">160</span>
                  <span className="text-xs text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">+4 New</span>
                </div>
                {/* SVG Visual Mini-Chart */}
                <div className="h-8 mt-3 flex items-end gap-1.5">
                  <div className="w-full bg-emerald-100 dark:bg-emerald-950 h-4 rounded-sm"></div>
                  <div className="w-full bg-emerald-100 dark:bg-emerald-955 h-6 rounded-sm"></div>
                  <div className="w-full bg-emerald-100 dark:bg-emerald-950 h-7 rounded-sm"></div>
                  <div className="w-full bg-emerald-600 h-8 rounded-sm"></div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-premium shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Homework Pending</span>
                <div className="flex justify-between items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">6 Tasks</span>
                  <span className="text-xs text-amber-600 font-bold bg-amber-50 dark:bg-amber-955/40 px-2 py-0.5 rounded-full">Review Queue</span>
                </div>
                {/* SVG Visual Mini-Chart */}
                <div className="h-8 mt-3 flex items-end gap-1.5">
                  <div className="w-full bg-amber-600 h-8 rounded-sm"></div>
                  <div className="w-full bg-amber-100 dark:bg-amber-950 h-5 rounded-sm"></div>
                  <div className="w-full bg-amber-100 dark:bg-amber-950 h-3 rounded-sm"></div>
                  <div className="w-full bg-amber-100 dark:bg-amber-955 h-4 rounded-sm"></div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-premium shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Average Attendance</span>
                <div className="flex justify-between items-baseline">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">91.5%</span>
                  <span className="text-xs text-purple-600 font-bold bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full">Optimal</span>
                </div>
                {/* SVG Visual Mini-Chart */}
                <div className="h-8 mt-3 flex items-end gap-1.5">
                  <div className="w-full bg-purple-100 dark:bg-purple-950 h-6 rounded-sm"></div>
                  <div className="w-full bg-purple-600 h-8 rounded-sm"></div>
                  <div className="w-full bg-purple-100 dark:bg-purple-950 h-7 rounded-sm"></div>
                  <div className="w-full bg-purple-100 dark:bg-purple-950 h-5 rounded-sm"></div>
                </div>
              </div>

            </div>

            {/* Bottom Row: Priority Section */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-premium shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-lg text-slate-800 dark:text-white">Priority Workspace Tasks</h3>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Clear items to streamline classroom tracking</span>
              </div>

              <div className="space-y-3">
                {priorityTasks.map(task => (
                  <div key={task.id} className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-150">
                    <div className="flex items-center gap-3">
                      <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${task.priority === 'High' ? 'bg-red-500 shadow-sm' : task.priority === 'Medium' ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                          {task.task}
                          <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-bold uppercase">{task.priority}</span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{task.detail}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Deadline</span>
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">{task.deadline}</span>
                      </div>
                      <div className="text-left md:text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Status</span>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{task.status}</span>
                      </div>
                      
                      <button 
                        onClick={() => {
                          if (task.type === 'attendance') {
                            const matchingClass = classes.find(c => c.name === 'IX-B') || classes[0];
                            openClassroomView(matchingClass, 'attendance');
                          } else if (task.type === 'assignments') {
                            handleNavClick('assignments');
                          } else if (task.type === 'messages') {
                            handleNavClick('messages');
                          } else {
                            handleNavClick('homework');
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-150"
                      >
                        Action
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ── VIEW 2: My Classes Grid ───────────────────────────── */}
        {currentView === 'classes' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Active Classrooms</h1>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Select a card grid to manage roll call, post files, and check stats.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {classes.map(cls => (
                <div key={cls.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-premium shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/55 px-2.5 py-1 rounded-lg uppercase tracking-wider">{cls.subject}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{cls.room}</span>
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-4">{cls.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">{cls.studentsCount} Active Students</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-800 pt-4 mt-6 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block font-bold">Attendance</span>
                      <span className="text-sm text-slate-800 dark:text-slate-200 font-bold">{cls.attendance}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block font-bold">Homework</span>
                      <span className="text-sm text-slate-800 dark:text-slate-200 font-bold">{cls.homeworkStatus}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase block font-bold">Next Test</span>
                      <span className="text-[11px] text-slate-800 dark:text-slate-200 font-bold truncate max-w-full block">{cls.upcomingTest}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => openClassroomView(cls, 'overview')}
                    className="w-full mt-4 py-2.5 bg-slate-100 hover:bg-blue-600 dark:bg-slate-850 dark:hover:bg-blue-600 hover:text-white text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl shadow-sm transition-all duration-200"
                  >
                    Open Classroom
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── VIEW 3: Inside Classroom (IX-A) Tabs ──────────────── */}
        {currentView === 'classroom' && activeClass && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Classroom Breadcrumb & Header */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-premium shadow-sm">
              <nav className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <span>CampusLink</span>
                <span>/</span>
                <span>Classrooms</span>
                <span>/</span>
                <span className="text-slate-600 dark:text-slate-300">{activeClass.name}</span>
              </nav>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-3">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    {activeClass.name}
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md font-bold">{activeClass.studentsCount} Students</span>
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{activeClass.subject}  •  Mrs. Sharma (Class Teacher)</p>
                </div>
                
                {/* Visual Tab Toggle Row */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'attendance', label: 'Roll Call' },
                    { id: 'homework', label: 'Homework' },
                    { id: 'marks', label: 'Marks' },
                    { id: 'resources', label: 'Resources' }
                  ].map(tab => (
                    <button 
                      key={tab.id}
                      onClick={() => setClassroomTab(tab.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${classroomTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* TAB CONTENT: Overview */}
            {classroomTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                
                {/* Stats grid */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Row of stats cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-premium shadow-sm text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Today's Attendance</span>
                      <span className="text-xl font-extrabold text-emerald-600 block mt-2">92%</span>
                      <span className="text-[9px] text-slate-400 block mt-1">39 Present</span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-premium shadow-sm text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Hw Completion</span>
                      <span className="text-xl font-extrabold text-blue-600 block mt-2">83%</span>
                      <span className="text-[9px] text-slate-400 block mt-1">35/42 Done</span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-premium shadow-sm text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Average Grade</span>
                      <span className="text-xl font-extrabold text-purple-600 block mt-2">A-</span>
                      <span className="text-[9px] text-slate-400 block mt-1">Excellent performance</span>
                    </div>
                  </div>

                  {/* Recent Classroom Activities */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-premium shadow-sm">
                    <h3 className="font-extrabold text-base text-slate-800 dark:text-white mb-4">Recent Classroom Activity</h3>
                    <div className="space-y-4">
                      
                      <div className="flex gap-3">
                        <span className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-600 px-2 py-1 rounded-lg h-7 font-bold">10:00 AM</span>
                        <div>
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white">Mathematics Homework posted</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Quadratic Equations Exercise 4.2 has been shared with all students.</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <span className="text-xs bg-emerald-50 dark:bg-emerald-955/40 text-emerald-600 px-2 py-1 rounded-lg h-7 font-bold">08:05 AM</span>
                        <div>
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white">Attendance submitted</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Mrs. Sharma marked roll call for IX-A (39 present, 3 absent).</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <span className="text-xs bg-purple-50 dark:bg-purple-950/40 text-purple-600 px-2 py-1 rounded-lg h-7 font-bold">Yesterday</span>
                        <div>
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white">Class notes uploaded</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Shared slide deck: "Intro to Quadratic Formulas.pdf" to Chapter 4 resources.</p>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

                {/* Right side cards */}
                <div className="space-y-6">
                  
                  {/* Today's birthdays widget */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-premium shadow-sm text-center">
                    <span className="text-2xl block">🎉</span>
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-white mt-2">Today's Birthdays</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Aarav Patel (Roll 01) is celebrating today!</p>
                    <button 
                      onClick={() => alert('Wished Aarav Patel a Happy Birthday on the class feed!')}
                      className="mt-3 px-4 py-1.5 bg-blue-55 hover:bg-blue-600 dark:bg-blue-950/50 dark:hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white text-xs font-bold rounded-xl transition-all duration-150"
                    >
                      Post Wish to Feed
                    </button>
                  </div>

                  {/* Quick summary check list */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-premium shadow-sm">
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-white mb-3">Tasks Check List</h4>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <span className="text-emerald-500"><Icons.Check /></span>
                        <span>Submit daily attendance</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <span className="text-emerald-500"><Icons.Check /></span>
                        <span>Assign algebra homework</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <span className="text-amber-500">⏳</span>
                        <span>Grade Exercise 4.1 submissions</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <span className="text-slate-300">⚪</span>
                        <span>Prepare test questions for Monday</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB CONTENT: Attendance / Roll Call */}
            {classroomTab === 'attendance' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-premium shadow-sm space-y-6 animate-fade-in">
                
                {/* Attendance submission popup success */}
                {attendanceSubmittedClass && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-premium text-center animate-fade-in text-emerald-800 dark:text-emerald-300">
                    <div className="font-bold text-sm">Attendance successfully saved!</div>
                    <p className="text-xs mt-1">Roll Call details saved to database. Returning to overview...</p>
                  </div>
                )}

                {/* Progress Indicators */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-850 p-4 rounded-premium">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Active Roll Call Roll</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Toggle student status then click Submit at bottom</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-center bg-white dark:bg-slate-900 border px-4 py-1.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Marked</span>
                      <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{attendanceMarkedCount} of {students.length}</span>
                    </div>

                    <div className="text-center bg-white dark:bg-slate-900 border px-4 py-1.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Present</span>
                      <span className="text-sm font-extrabold text-emerald-600">{attendancePresentCount}</span>
                    </div>
                  </div>
                </div>

                {/* Students Attendance List grid */}
                <form onSubmit={handleAttendanceSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {students.map(st => {
                      const status = rollCall[st.id] || 'present';
                      return (
                        <div key={st.id} className="p-3 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-premium flex items-center justify-between gap-3 hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-150">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                              {st.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-slate-800 dark:text-white">{st.name}</h4>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Roll Number: {st.rollNumber}</p>
                            </div>
                          </div>

                          {/* Attendance Toggles */}
                          <div className="flex gap-1.5">
                            {[
                              { id: 'present', label: 'P', color: 'bg-emerald-500 text-white', hover: 'hover:bg-emerald-500/20 text-emerald-600 bg-emerald-50 dark:bg-emerald-955/20' },
                              { id: 'absent', label: 'A', color: 'bg-red-500 text-white', hover: 'hover:bg-red-500/20 text-red-600 bg-red-50 dark:bg-red-950/20' },
                              { id: 'late', label: 'L', color: 'bg-amber-500 text-white', hover: 'hover:bg-amber-500/20 text-amber-600 bg-amber-50 dark:bg-amber-955/20' },
                              { id: 'leave', label: 'Lv', color: 'bg-blue-500 text-white', hover: 'hover:bg-blue-500/20 text-blue-600 bg-blue-50 dark:bg-blue-950/20' }
                            ].map(btn => (
                              <button 
                                key={btn.id}
                                type="button"
                                onClick={() => setRollCall({ ...rollCall, [st.id]: btn.id })}
                                className={`h-7 w-7 rounded-lg text-[10px] font-bold transition-all duration-150 flex items-center justify-center ${status === btn.id ? btn.color : btn.hover}`}
                              >
                                {btn.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sticky submit button bar */}
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button 
                      type="submit"
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all duration-150"
                    >
                      Submit Attendance Roll Call
                    </button>
                  </div>
                </form>

              </div>
            )}

            {/* TAB CONTENT: Homework */}
            {classroomTab === 'homework' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                
                {/* Homework Publisher Form */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-premium shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-800 dark:text-white mb-4">Post Homework Assignment</h3>
                    
                    <form onSubmit={handlePostHomework} className="space-y-4">
                      
                      <div className="form-group">
                        <label htmlFor="hw-title" className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Homework Title *</label>
                        <input 
                          type="text" 
                          id="hw-title" 
                          placeholder="e.g. Exercise 4.2 Quadratic Equations" 
                          required
                          value={newHwTitle}
                          onChange={(e) => setNewHwTitle(e.target.value)}
                          className="w-full px-3 py-2 border rounded-xl bg-transparent text-sm focus:outline-blue-500"
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="hw-desc" className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Description / Instructions *</label>
                        <textarea 
                          id="hw-desc" 
                          placeholder="Solve question 1 to 10. Step by step calculations required." 
                          required
                          rows="4"
                          value={newHwDesc}
                          onChange={(e) => setNewHwDesc(e.target.value)}
                          className="w-full px-3 py-2 border rounded-xl bg-transparent text-sm focus:outline-blue-500"
                        ></textarea>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="form-group">
                          <label htmlFor="hw-date" className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Due Date</label>
                          <input 
                            type="date" 
                            id="hw-date" 
                            value={newHwDate}
                            onChange={(e) => setNewHwDate(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl bg-transparent text-xs focus:outline-blue-500"
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="hw-class" className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Classroom</label>
                          <select 
                            id="hw-class" 
                            value={newHwClass}
                            onChange={(e) => setNewHwClass(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl bg-transparent text-xs focus:outline-blue-500"
                          >
                            <option value="IX-A">IX-A</option>
                            <option value="IX-B">IX-B</option>
                            <option value="VIII-C">VIII-C</option>
                            <option value="X-A">X-A</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="hw-visible" className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Visibility</label>
                        <select 
                          id="hw-visible" 
                          value={newHwVisible}
                          onChange={(e) => setNewHwVisible(e.target.value)}
                          className="w-full px-3 py-2 border rounded-xl bg-transparent text-xs focus:outline-blue-500"
                        >
                          <option value="All Students">All Students</option>
                          <option value="Remedial Group">Remedial Group</option>
                          <option value="Advanced Group">Advanced Group</option>
                        </select>
                      </div>

                      <button 
                        type="submit" 
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-150"
                      >
                        Publish Homework Assignment
                      </button>

                    </form>
                  </div>
                </div>

                {/* Homework List Queue */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-premium shadow-sm space-y-4">
                  <h3 className="font-extrabold text-base text-slate-800 dark:text-white mb-2">Previous Homeworks</h3>
                  
                  <div className="space-y-4">
                    {homeworks.filter(h => h.className === activeClass.name).map(hw => (
                      <div key={hw.id} className="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white">{hw.title}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{hw.description}</p>
                          <div className="flex gap-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 pt-2">
                            <span>Due: {hw.dueDate}</span>
                            <span>•</span>
                            <span>Visible: {hw.visibility}</span>
                          </div>
                        </div>

                        <div className="flex flex-row sm:flex-col justify-between sm:justify-center items-center gap-2 sm:text-right">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase block font-bold">Submissions</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{hw.count}</span>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${hw.status === 'Submitted' ? 'bg-emerald-50 dark:bg-emerald-955/20 text-emerald-600' : 'bg-amber-50 dark:bg-amber-955/20 text-amber-600'}`}>{hw.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: Marks */}
            {classroomTab === 'marks' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-premium shadow-sm space-y-6 animate-fade-in">
                <div className="flex justify-between items-center pb-4 border-b">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Academic Grades & Marks</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Bulk uploads supported directly in class records</p>
                  </div>
                  <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-855 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl shadow-sm transition-all duration-150">
                    Bulk Import CSV
                  </button>
                </div>

                <form onSubmit={handleSaveBulkMarks} className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs md:text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                          <th className="py-3 px-2">Student Name</th>
                          <th className="py-3 px-2 text-center">Current Grade</th>
                          <th className="py-3 px-2">Marks obtained</th>
                          <th className="py-3 px-2">Max Marks</th>
                          <th className="py-3 px-2">Remarks / Observations</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map(st => {
                          const state = bulkMarks[st.id] || { marks: '15', max: '20', remarks: '' };
                          return (
                            <tr key={st.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                              <td className="py-3.5 px-2 font-semibold text-slate-800 dark:text-slate-200">{st.name}</td>
                              <td className="py-3.5 px-2 text-center">
                                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-md font-bold text-xs">{st.grade}</span>
                              </td>
                              <td className="py-3.5 px-2">
                                <input 
                                  type="text" 
                                  value={state.marks} 
                                  onChange={(e) => setBulkMarks({
                                    ...bulkMarks,
                                    [st.id]: { ...state, marks: e.target.value }
                                  })}
                                  className="w-16 px-2 py-1 border rounded-lg bg-transparent text-center focus:outline-blue-500 font-semibold"
                                />
                              </td>
                              <td className="py-3.5 px-2">
                                <input 
                                  type="text" 
                                  value={state.max} 
                                  onChange={(e) => setBulkMarks({
                                    ...bulkMarks,
                                    [st.id]: { ...state, max: e.target.value }
                                  })}
                                  className="w-16 px-2 py-1 border rounded-lg bg-transparent text-center focus:outline-blue-500 font-semibold text-slate-400"
                                />
                              </td>
                              <td className="py-3.5 px-2">
                                <input 
                                  type="text" 
                                  value={state.remarks} 
                                  placeholder="Good participation"
                                  onChange={(e) => setBulkMarks({
                                    ...bulkMarks,
                                    [st.id]: { ...state, remarks: e.target.value }
                                  })}
                                  className="w-full max-w-xs px-3 py-1 border rounded-lg bg-transparent focus:outline-blue-500"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button 
                      type="submit"
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-150"
                    >
                      Save Marks Record Sheets
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB CONTENT: Resources */}
            {classroomTab === 'resources' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-premium shadow-sm space-y-6 animate-fade-in">
                <div className="flex justify-between items-center pb-4 border-b">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Shared Class Resources</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Documents, video links, slides organized by chapters</p>
                  </div>
                  
                  <button onClick={() => alert('Opening folder upload file drawer...')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-150 flex items-center gap-1.5">
                    <Icons.FilePlus />
                    <span>Upload Resource</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {CHAPTER_RESOURCES.map((chapter, idx) => (
                    <div key={idx} className="p-5 bg-slate-50 dark:bg-slate-850/50 border border-slate-100 dark:border-slate-800 rounded-premium space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-amber-500"><Icons.Folder /></span>
                        <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">{chapter.chapter}</h4>
                      </div>

                      <div className="space-y-2">
                        {chapter.files.map((file, fIdx) => (
                          <div key={fIdx} className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2.5">
                              <span className="text-slate-400">
                                {file.type === 'pdf' ? '📄' : file.type === 'ppt' ? '📊' : file.type === 'youtube' ? '🎥' : '📁'}
                              </span>
                              <div>
                                <h5 className="font-bold text-slate-700 dark:text-slate-300">{file.name}</h5>
                                {file.size && <span className="text-[10px] text-slate-400 block mt-0.5">{file.size}</span>}
                              </div>
                            </div>

                            {file.link ? (
                              <a href={file.link} target="_blank" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Open Link</a>
                            ) : (
                              <button onClick={() => alert(`Downloading file: ${file.name}`)} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Download</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ── VIEW 4: Homework Manager ──────────────────────────── */}
        {currentView === 'homework' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Homework Assignments</h1>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Publish and inspect homework states for all registered classes.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Publisher Column */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-premium shadow-sm">
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white mb-4">Post Homework Assignment</h3>
                <form onSubmit={handlePostHomework} className="space-y-4">
                  <div className="form-group">
                    <label htmlFor="all-hw-title" className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Homework Title *</label>
                    <input 
                      type="text" 
                      id="all-hw-title" 
                      placeholder="e.g. Exercise 4.2 Quadratic Equations" 
                      required
                      value={newHwTitle}
                      onChange={(e) => setNewHwTitle(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-transparent text-sm focus:outline-blue-500"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="all-hw-desc" className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Description / Instructions *</label>
                    <textarea 
                      id="all-hw-desc" 
                      placeholder="Write instructions..." 
                      required
                      rows="3"
                      value={newHwDesc}
                      onChange={(e) => setNewHwDesc(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-transparent text-sm focus:outline-blue-500"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group">
                      <label htmlFor="all-hw-date" className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Due Date</label>
                      <input 
                        type="date" 
                        id="all-hw-date" 
                        value={newHwDate}
                        onChange={(e) => setNewHwDate(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-transparent text-xs focus:outline-blue-500"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="all-hw-class" className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Classroom</label>
                      <select 
                        id="all-hw-class" 
                        value={newHwClass}
                        onChange={(e) => setNewHwClass(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-transparent text-xs focus:outline-blue-500"
                      >
                        <option value="IX-A">IX-A</option>
                        <option value="IX-B">IX-B</option>
                        <option value="VIII-C">VIII-C</option>
                        <option value="X-A">X-A</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-150"
                  >
                    Publish Homework Assignment
                  </button>
                </form>
              </div>

              {/* Queue List Column */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-premium shadow-sm space-y-4">
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white mb-2">Global Homework Directory</h3>
                
                <div className="space-y-4">
                  {homeworks.map(hw => (
                    <div key={hw.id} className="p-4 bg-slate-50 dark:bg-slate-855 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                          {hw.title}
                          <span className="text-[9px] bg-blue-55 dark:bg-blue-950 text-blue-600 px-2 py-0.5 rounded font-bold uppercase">{hw.className}</span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{hw.description}</p>
                        <div className="flex gap-3 text-[10px] font-bold text-slate-400 pt-2">
                          <span>Due: {hw.dueDate}</span>
                          <span>•</span>
                          <span>Visible: {hw.visibility}</span>
                        </div>
                      </div>

                      <div className="flex flex-row sm:flex-col justify-between sm:justify-center items-center gap-2 sm:text-right">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase block font-bold">Submissions</span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{hw.count}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${hw.status === 'Submitted' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{hw.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── VIEW 5: Assignment Reviews & Grading ─────────────── */}
        {currentView === 'assignments' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Assignment Submissions</h1>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Review student file uploads and input grades and text feedback.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Submissions List Queue (Left 2 cols) */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-premium shadow-sm space-y-4">
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white mb-2">Grading Queue (IX-A Mathematics)</h3>
                
                <div className="space-y-3">
                  {submissions.map((sub, idx) => (
                    <div 
                      key={sub.id} 
                      onClick={() => setSelectedSubIndex(idx)}
                      className={`p-4 border rounded-2xl cursor-pointer flex justify-between gap-4 transition-all duration-150 ${selectedSubIndex === idx ? 'border-blue-600 bg-blue-50/10' : 'border-slate-100 dark:border-slate-800 bg-slate-50 hover:border-slate-200'}`}
                    >
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">{sub.studentName}</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Roll: {sub.rollNumber}  •  Submitted {sub.submittedDate}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-medium italic">"{sub.text}"</p>
                      </div>

                      <div className="text-right flex flex-col justify-between items-end">
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-bold uppercase">{sub.file.split('.').pop()}</span>
                        {sub.grade ? (
                          <span className="text-xs font-bold text-emerald-600">Graded: {sub.grade}</span>
                        ) : (
                          <span className="text-xs font-bold text-amber-600">Pending Review</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviewer / Grading Sheet Panel (Right 1 col) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-premium shadow-sm">
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white mb-1">Grading & Feedback</h3>
                <p className="text-[11px] text-slate-400 font-semibold mb-4">Active student review sheet</p>

                <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl mb-6">
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Active Student</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white mt-1 block">{submissions[selectedSubIndex].studentName}</span>
                  
                  <span className="text-[10px] text-slate-400 uppercase block font-bold mt-3">Attached File</span>
                  <button onClick={() => alert(`Opening student submission attachment preview: ${submissions[selectedSubIndex].file}`)} className="text-xs font-bold text-blue-600 hover:underline mt-1 block">
                    📎 {submissions[selectedSubIndex].file}
                  </button>
                </div>

                <form onSubmit={handleGradingSubmit} className="space-y-4">
                  <div className="form-group">
                    <label htmlFor="grade-select" className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Grade *</label>
                    <select 
                      id="grade-select"
                      required
                      value={gradeInput}
                      onChange={(e) => setGradeInput(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-transparent text-sm focus:outline-blue-500"
                    >
                      <option value="">Select Grade</option>
                      <option value="A+">A+ (95-100%)</option>
                      <option value="A">A (85-94%)</option>
                      <option value="B+">B+ (75-84%)</option>
                      <option value="B">B (65-74%)</option>
                      <option value="C">C (50-64%)</option>
                      <option value="D">D (Remedial)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="feedback-text" className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">Written Feedback</label>
                    <textarea 
                      id="feedback-text" 
                      placeholder="e.g. Excellent quadratic factoring layout. Maintain clean steps."
                      rows="3"
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl bg-transparent text-sm focus:outline-blue-500"
                    ></textarea>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-150"
                  >
                    Submit Grade & Feedback
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

        {/* ── VIEW 6: Shared Resources Folders ─────────────────── */}
        {currentView === 'resources' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-premium shadow-sm space-y-6 animate-fade-in">
            <div className="flex justify-between items-center pb-4 border-b">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Shared Workspace Resources</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Upload study materials, notes slides, and videos for classrooms.</p>
              </div>
              
              <button onClick={() => alert('Opening folder upload file drawer...')} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-150 flex items-center gap-1.5">
                <Icons.FilePlus />
                <span>Upload Resource</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CHAPTER_RESOURCES.map((chapter, idx) => (
                <div key={idx} className="p-5 bg-slate-50 dark:bg-slate-850/50 border border-slate-100 dark:border-slate-800 rounded-premium space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-amber-500"><Icons.Folder /></span>
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">{chapter.chapter}</h4>
                  </div>

                  <div className="space-y-2">
                    {chapter.files.map((file, fIdx) => (
                      <div key={fIdx} className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="text-slate-400">
                            {file.type === 'pdf' ? '📄' : file.type === 'ppt' ? '📊' : file.type === 'youtube' ? '🎥' : '📁'}
                          </span>
                          <div>
                            <h5 className="font-bold text-slate-700 dark:text-slate-300">{file.name}</h5>
                            {file.size && <span className="text-[10px] text-slate-400 block mt-0.5">{file.size}</span>}
                          </div>
                        </div>

                        {file.link ? (
                          <a href={file.link} target="_blank" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Open Link</a>
                        ) : (
                          <button onClick={() => alert(`Downloading file: ${file.name}`)} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Download</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── VIEW 7: Slack-inspired Messages ─────────────────── */}
        {currentView === 'messages' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-xl overflow-hidden min-h-[500px] flex animate-fade-in">
            
            {/* Sidebar Channels (Slack style) */}
            <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 flex flex-col">
              
              {/* Tab Selector */}
              <div className="grid grid-cols-3 gap-1 bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl mb-4 text-center">
                {[
                  { id: 'students', label: 'Students' },
                  { id: 'parents', label: 'Parents' },
                  { id: 'admin', label: 'Staff' }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => { setMsgTab(tab.id); setActiveChatIndex(0); }}
                    className={`py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition-all duration-150 ${msgTab === tab.id ? 'bg-white dark:bg-slate-900 text-slate-850 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Active Channels / Direct Messages */}
              <div className="flex-1 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Threads</span>
                {messages[msgTab].map((chat, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveChatIndex(idx)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all duration-150 ${activeChatIndex === idx ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850'}`}
                  >
                    <span className="truncate">{chat.sender}</span>
                    {chat.unread && idx !== activeChatIndex && (
                      <span className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0"></span>
                    )}
                  </button>
                ))}
              </div>
            </aside>

            {/* Active Thread Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
              
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">{messages[msgTab][activeChatIndex].sender}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Active dialogue thread  •  Read receipts enabled</p>
                </div>
              </div>

              {/* Chat Messages Log */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 min-h-[300px]">
                <div className="flex gap-3.5">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                    {messages[msgTab][activeChatIndex].sender.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-extrabold text-xs text-slate-800 dark:text-white">{messages[msgTab][activeChatIndex].sender}</span>
                      <span className="text-[9px] text-slate-400">{messages[msgTab][activeChatIndex].time}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-350 mt-1 leading-relaxed">{messages[msgTab][activeChatIndex].text}</p>
                  </div>
                </div>
              </div>

              {/* Message Input Bar */}
              <form onSubmit={handleSendChat} className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                <input 
                  type="text" 
                  placeholder={`Send direct message to ${messages[msgTab][activeChatIndex].sender}...`}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-xs focus:outline-blue-500"
                />
                <button type="submit" className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all duration-150">
                  <Icons.Send />
                </button>
              </form>

            </div>
          </div>
        )}

        {/* ── VIEW 8: Calendar Grid ────────────────────────────── */}
        {currentView === 'calendar' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-premium shadow-sm space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Academic Calendar</h1>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">June 2026 events schedule for classes and meetings.</p>
              </div>
            </div>

            {/* Calendar Month Grid */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 mb-2">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            <div className="grid grid-cols-7 gap-2.5 min-h-[350px]">
              {/* Render 30 Days */}
              {Array.from({ length: 30 }).map((_, idx) => {
                const day = idx + 1;
                const matchedEvent = MOCK_CALENDAR_EVENTS.find(e => e.day === day);
                
                return (
                  <div 
                    key={day} 
                    onClick={() => matchedEvent && alert(`Event Details:\nType: ${matchedEvent.type.toUpperCase()}\nTitle: ${matchedEvent.title}`)}
                    className={`p-2 border border-slate-100 dark:border-slate-800/80 rounded-xl flex flex-col justify-between items-start hover:border-slate-300 transition-all duration-150 min-h-[70px] ${matchedEvent ? 'cursor-pointer' : ''}`}
                  >
                    <span className="font-bold text-xs text-slate-500">{day}</span>
                    {matchedEvent && (
                      <span className={`w-full text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase truncate block text-left ${matchedEvent.type === 'exam' ? 'bg-red-50 text-red-605' : matchedEvent.type === 'ptm' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                        {matchedEvent.title}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── VIEW 9: Analytics & Performance Insights ─────────── */}
        {currentView === 'analytics' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Classroom Insights & Analytics</h1>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Premium visualizations monitoring attendance trends and homework submissions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* SVG Attendance Chart */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-premium shadow-sm">
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white mb-4">Weekly Attendance Trend</h3>
                
                {/* SVG Render Line Graph */}
                <div className="w-full h-48 mt-2">
                  <svg className="w-full h-full" viewBox="0 0 300 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0"/>
                      </linearGradient>
                    </defs>
                    {/* Grid Lines */}
                    <line x1="0" y1="20" x2="300" y2="20" stroke="#f1f5f9" strokeWidth="0.5" />
                    <line x1="0" y1="60" x2="300" y2="60" stroke="#f1f5f9" strokeWidth="0.5" />
                    <line x1="0" y1="100" x2="300" y2="100" stroke="#e2e8f0" strokeWidth="1" />
                    
                    {/* Area path */}
                    <path d="M 10 100 L 10 30 L 80 40 L 150 20 L 220 35 L 290 25 L 290 100 Z" fill="url(#gradient-area)"/>
                    {/* Line path */}
                    <path d="M 10 30 L 80 40 L 150 20 L 220 35 L 290 25" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round"/>
                    
                    {/* Data Points */}
                    <circle cx="10" cy="30" r="3.5" fill="#2563EB" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx="80" cy="40" r="3.5" fill="#2563EB" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx="150" cy="20" r="3.5" fill="#2563EB" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx="220" cy="35" r="3.5" fill="#2563EB" stroke="#ffffff" strokeWidth="1.5" />
                    <circle cx="290" cy="25" r="3.5" fill="#2563EB" stroke="#ffffff" strokeWidth="1.5" />
                  </svg>
                  
                  {/* Axis labels */}
                  <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase pt-2 px-1">
                    <span>Monday (90%)</span>
                    <span>Tuesday (88%)</span>
                    <span>Wednesday (95%)</span>
                    <span>Thursday (92%)</span>
                    <span>Friday (94%)</span>
                  </div>
                </div>
              </div>

              {/* Bar Chart: Homework Submissions */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-premium shadow-sm">
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white mb-4">Homework Submission Rates</h3>
                
                {/* SVG Render Bar Chart */}
                <div className="w-full h-48 mt-2 flex items-end justify-between px-4 pb-2 border-b">
                  <div className="flex flex-col items-center gap-1.5 w-1/4">
                    <span className="text-[10px] font-bold text-slate-500">92%</span>
                    <div className="w-8 bg-blue-600 h-32 rounded-t-lg"></div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">IX-A</span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 w-1/4">
                    <span className="text-[10px] font-bold text-slate-500">86%</span>
                    <div className="w-8 bg-blue-600 h-28 rounded-t-lg"></div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">IX-B</span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 w-1/4">
                    <span className="text-[10px] font-bold text-slate-500">95%</span>
                    <div className="w-8 bg-blue-600 h-36 rounded-t-lg"></div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">VIII-C</span>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 w-1/4">
                    <span className="text-[10px] font-bold text-slate-500">90%</span>
                    <div className="w-8 bg-blue-600 h-30 rounded-t-lg"></div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">X-A</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── VIEW 10: Teacher Profile ─────────────────────────── */}
        {currentView === 'profile' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-premium shadow-sm space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="h-24 w-24 rounded-full bg-blue-100 dark:bg-blue-955 text-blue-700 dark:text-blue-300 flex items-center justify-center font-extrabold text-3xl shadow-md">
                MS
              </div>
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Mrs. Sharma</h2>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">Senior Mathematics Department Lead</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Faculty ID: CL-2024-8390  •  CampusLink Classroom</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
              <div className="space-y-4">
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Assigned Classes</h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl font-bold">
                    <span>IX-A Algebra</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl font-bold">
                    <span>IX-B Geometry</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl font-bold">
                    <span>VIII-C Arithmetic</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl font-bold">
                    <span>X-A Statistics</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Workspace Information</h3>
                <div className="text-xs space-y-2">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-slate-400 font-semibold">Join Date</span>
                    <span className="font-bold">July 12, 2024</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-slate-400 font-semibold">Email</span>
                    <span className="font-bold">sharma.math@campuslink.in</span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-slate-400 font-semibold">Status</span>
                    <span className="font-bold text-emerald-600">Active Duty</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── VIEW 11: Settings ────────────────────────────────── */}
        {currentView === 'settings' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-premium shadow-sm space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Workspace Settings</h1>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Configure workspace rules, visual preferences, and notification defaults.</p>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-855 rounded-2xl">
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white">Enable Dark Mode</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Toggle light/dark theme style for layout</p>
                </div>
                <button 
                  onClick={toggleDarkMode}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl shadow-sm transition-all duration-150"
                >
                  Toggle Theme
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-855 rounded-2xl">
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white">Classroom notifications</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Receive audio alerts when homework is submitted</p>
                </div>
                <button onClick={() => alert('Notification settings saved!')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-150">
                  Configure
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── Floating AI Assistant Panel (CampusLink AI) ─────────── */}
      <div className="fixed bottom-6 right-6 z-40">
        
        {/* Floating trigger button */}
        <button 
          onClick={() => setIsAiOpen(!isAiOpen)}
          className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/30 flex items-center justify-center hover:scale-105 transition-all duration-200 ripple-btn group"
          aria-label="Open AI Assistant Panel"
        >
          <span className="group-hover:rotate-12 transition-transform duration-200"><Icons.Sparkles /></span>
        </button>

        {/* AI Dialog overlay panel */}
        {isAiOpen && (
          <div className="absolute bottom-16 right-0 w-[360px] md:w-[420px] max-w-[calc(100vw-32px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-2xl overflow-hidden flex flex-col z-50 animate-fade-in">
            
            {/* AI Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span><Icons.Sparkles /></span>
                <div>
                  <h4 className="font-extrabold text-sm tracking-tight">CampusLink AI Copilot</h4>
                  <p className="text-[10px] text-blue-100 font-medium">Assistant Workspace Tool</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAiOpen(false)}
                className="p-1 rounded-lg hover:bg-blue-500/20 text-white"
              >
                <Icons.Close />
              </button>
            </div>

            {/* Chat Stream View */}
            <div className="flex-1 p-4 max-h-[300px] overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
              {aiMessages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role !== 'user' && (
                    <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-955 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold mt-1">AI</div>
                  )}
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[85%] ${msg.role === 'user' ? 'bg-blue-600 text-white font-medium' : 'bg-white dark:bg-slate-855 text-slate-700 dark:text-slate-350 border shadow-sm'}`}>
                    {/* Crude markdown parser for rendering bold items in UI */}
                    {msg.content.split('\n').map((line, lIdx) => {
                      if (line.startsWith('###')) {
                        return <h5 key={lIdx} className="font-extrabold text-sm mb-1.5 mt-2 first:mt-0 text-slate-900 dark:text-white">{line.replace('###', '').trim()}</h5>;
                      }
                      if (line.startsWith('-') || line.match(/^\d+\./)) {
                        return <p key={lIdx} className="pl-3 py-0.5 font-medium">{line}</p>;
                      }
                      return <p key={lIdx} className="py-0.5">{line}</p>;
                    })}
                  </div>
                </div>
              ))}
              
              {aiLoading && (
                <div className="flex items-center gap-2.5">
                  <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-955 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold mt-1 animate-pulse">AI</div>
                  <div className="p-3 bg-white dark:bg-slate-855 border rounded-2xl text-xs text-slate-400 font-semibold flex items-center gap-2">
                    <span className="spinner h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                    <span>Drafting layout...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action prompts shortcuts */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600 dark:text-slate-400">
              <button onClick={() => handleAiAction('Generate Homework for Grade IX Quadratic Equations')} className="p-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-855 text-left transition-all duration-150">📝 Generate Homework</button>
              <button onClick={() => handleAiAction('Create Exit Ticket Quiz on Polynomials')} className="p-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-855 text-left transition-all duration-150">🎓 Generate Quiz</button>
              <button onClick={() => handleAiAction('Draft Lesson Plan on Introduction to Polynomials')} className="p-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-855 text-left transition-all duration-150">📚 Lesson Plan</button>
              <button onClick={() => handleAiAction('Draft Parent Message to Mr. Verma regarding Rahul\'s Math progress')} className="p-2 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-855 text-left transition-all duration-150">✉️ Draft Parent Email</button>
            </div>

            {/* AI Text Input area */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!aiPrompt.trim()) return;
                handleAiAction(aiPrompt);
                setAiPrompt('');
              }} 
              className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex gap-2"
            >
              <input 
                type="text" 
                placeholder="Ask AI to write worksheet questions or explain topics..." 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-xl bg-white dark:bg-slate-855 text-xs focus:outline-blue-500"
              />
              <button type="submit" className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all duration-150">Ask</button>
            </form>

          </div>
        )}

      </div>

    </div>
  );
}

// Mount the React Application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
