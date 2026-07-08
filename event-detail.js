function initEventDetail() {

  // Update navigation based on auth state
  if (window.CampusLink && window.CampusLink.auth) {
    window.CampusLink.auth.updateNavAuthState();
  }

  
  /* --- Sticky Header Logic --- */
  const header = document.querySelector('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  /* --- Mobile Navigation Menu --- */
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links') || document.querySelector('.header-nav');
  const body = document.body;

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      body.classList.toggle('mobile-nav-active');
    });
  }

  // Close mobile nav when clicking a link
  const navAnchors = document.querySelectorAll('.nav-links a, .header-nav a');
  navAnchors.forEach(anchor => {
    anchor.addEventListener('click', () => {
      if (navLinks) navLinks.classList.remove('active');
      body.classList.remove('mobile-nav-active');
    });
  });

  /* --- Events Database --- */
  const eventsDetail = {
    1: {
      title: "National Science & Robotics Fest 2026",
      school: "Delhi Public School, RK Puram",
      schoolId: 1,
      city: "New Delhi",
      category: "science",
      date: "June 24 - 26, 2026",
      venue: "Main Campus Auditorium, RK Puram",
      deadline: "June 18, 2026",
      daysLeft: "14 days",
      tag: "Science & Tech",
      emoji: "🔬",
      registrations: "1,200 Students",
      desc1: "The National Science & Robotics Fest is India's premier high school technology event, designed to bring together student innovators, coders, and makers to display robotics projects and science models.",
      desc2: "This year's event features autonomous line-following competitions, science exhibitions, and coding hackathons. Participating schools get direct feedback from judges from leading technology institutes and research fests.",
      schedule: [
        { round: "Round 1: Online Project Submission", date: "June 18, 2026", desc: "Teams submit project synopsis and demo videos online." },
        { round: "Round 2: Main Stage presentation", date: "June 24, 2026", desc: "Live models showcasing in front of guest judges." },
        { round: "Round 3: Grand Finale & Prizes", date: "June 26, 2026", desc: "Selected finalists present details on the main stage." }
      ]
    },
    2: {
      title: "Synthesis Cultural Fest & Art Exhibition",
      school: "St. Xavier's High School",
      schoolId: 2,
      city: "Mumbai",
      category: "cultural",
      date: "July 12 - 14, 2026",
      venue: "St. Xavier's Great Hall, Fort, Mumbai",
      deadline: "July 05, 2026",
      daysLeft: "26 days",
      tag: "Arts & Culture",
      emoji: "🎭",
      registrations: "3,400 Students",
      desc1: "Synthesis is the signature annual cultural fest of St. Xavier's, combining classic dramatics fests with modern art installations and acoustic music showdowns.",
      desc2: "Over 40 schools participate annually, competing in visual arts, debating, street plays, and classical dance solos.",
      schedule: [
        { round: "Art submission deadline", date: "July 05, 2026", desc: "All painting and sculpture catalog photos to be mailed." },
        { round: "Dramatics Prelims", date: "July 12, 2026", desc: "Stage play qualifiers." },
        { round: "Grand Finale", date: "July 14, 2026", desc: "Closing ceremony and prize fests." }
      ]
    },
    3: {
      title: "AI & Machine Learning Student Workshop",
      school: "Bishop Cotton School",
      schoolId: 3,
      city: "Shimla",
      category: "workshop",
      date: "June 30, 2026",
      venue: "BCS Computer Lab Complex, Shimla",
      deadline: "June 26, 2026",
      daysLeft: "20 days",
      tag: "Technology",
      emoji: "💻",
      registrations: "850 Students",
      desc1: "Designed for budding programmers, this hands-on workshop introduces machine learning paradigms, Python scripting, and AI models training.",
      desc2: "Bishop Cotton School offers premium computer labs to conduct live model deployments. Participating students receive structured mentor feedback.",
      schedule: [
        { round: "Pre-requisites Setup", date: "June 26, 2026", desc: "Receiving study kits and Python modules setup guidance." },
        { round: "Live ML Model Training Session", date: "June 30, 2026", desc: "Full day coding session and certificate distribution." }
      ]
    },
    4: {
      title: "Invitational Inter-School Basketball League",
      school: "St. Stephen's Academy",
      schoolId: 4,
      city: "Dehradun",
      category: "sports",
      date: "Oct 10 - 15, 2026",
      venue: "Stephen's Multi-Sports Complex, Dehradun",
      deadline: "October 02, 2026",
      daysLeft: "3 months",
      tag: "Sports",
      emoji: "🏀",
      registrations: "2,100 Students",
      desc1: "The annual basketball invitational league brings together top school teams across North India to compete for the national champion cup.",
      desc2: "The tournament is hosted on FIBA-certified indoor courts, with official board referees coordinating the qualifiers and final matches.",
      schedule: [
        { round: "Team Registration Cut-off", date: "October 02, 2026", desc: "Submit player profiles and heights verification sheets." },
        { round: "Qualifying Rounds", date: "October 10 - 12, 2026", desc: "Knockout matches across four pools." },
        { round: "Grand Final", date: "October 15, 2026", desc: "Final match and trophy presentation." }
      ]
    },
    5: {
      title: "All-India Model United Nations (MUN)",
      school: "Cathedral & John Connon School",
      schoolId: 6,
      city: "Mumbai",
      category: "debate",
      date: "August 18 - 20, 2026",
      venue: "School Conference Hall, Fort, Mumbai",
      deadline: "August 05, 2026",
      daysLeft: "2 months",
      tag: "Debate & Speech",
      emoji: "🗣️",
      registrations: "1,800 Students",
      desc1: "Nurturing diplomats of tomorrow. The Cathedral MUN offers a highly rigorous platform debating geopolitical issues, global trade, and human rights charters.",
      desc2: "Committees include UN Security Council, General Assembly, and Crisis Committees. Awards for Best Delegate and Best Delegation are presented.",
      schedule: [
        { round: "Delegate Allocation Lists", date: "August 05, 2026", desc: "Portfolios and background guides shared with delegates." },
        { round: "Committee Sessions", date: "August 18 - 19, 2026", desc: "Active floor lobbying and draft resolutions compilation." },
        { round: "Resolution Voting & Awards", date: "August 20, 2026", desc: "Final voting on resolutions and closing ceremonies." }
      ]
    },
    6: {
      title: "Summer Creative Writing & Theatre Workshop",
      school: "Doon School",
      schoolId: 7,
      city: "Dehradun",
      category: "workshop",
      date: "July 8 - 15, 2026",
      venue: "Rose Bowl Theater, Doon Campus, Dehradun",
      deadline: "July 02, 2026",
      daysLeft: "28 days",
      tag: "Arts & Theatre",
      emoji: "✍️",
      registrations: "620 Students",
      desc1: "A residential summer workshop focusing on script drafting, screenplays, and staging theatrical productions under veteran director guidance.",
      desc2: "Hosted at Doon's historic open-air theater, students receive collaborative learning experience and perform their final plays live.",
      schedule: [
        { round: "Writing Draft Reviews", date: "July 02, 2026", desc: "Submitting script outlines for preliminary evaluations." },
        { round: "Staging and Rehearsals", date: "July 08 - 14, 2026", desc: "Practical acting coaching and lighting design workshops." },
        { round: "Final Showcase performance", date: "July 15, 2026", desc: "Live stage performance in front of parents and guests." }
      ]
    },
    7: {
      title: "Grand Autumn Fest & Food Carnival",
      school: "La Martiniere for Boys",
      schoolId: 8,
      city: "Kolkata",
      category: "cultural",
      date: "Nov 5 - 6, 2026",
      venue: "Main Campus Grounds, Rawdon Street, Kolkata",
      deadline: "October 20, 2026",
      daysLeft: "4 months",
      tag: "Cultural & Food",
      emoji: "🎡",
      registrations: "4,200 Students",
      desc1: "La Martiniere's Grand Autumn Fest combines inter-school band competitions, gaming zones, and organic food stalls run by student teams.",
      desc2: "A celebration of student enterprise and creativity, with live performance stages hosting local rock bands and visual artists.",
      schedule: [
        { round: "Stall and Band allocations", date: "October 20, 2026", desc: "Registering recipe lists or band sound profiles." },
        { round: "Carnival Live Day 1", date: "November 05, 2026", desc: "Opening carnival fests and rock music qualifiers." },
        { round: "Carnival Live Day 2 & Awards", date: "November 06, 2026", desc: "Overall championship trophy awards." }
      ]
    },
    8: {
      title: "National Mathematics Olympiad 2026",
      school: "The Shri Ram School",
      schoolId: 10,
      city: "New Delhi",
      category: "science",
      date: "September 12, 2026",
      venue: "School Examination Core Hall, New Delhi",
      deadline: "September 02, 2026",
      daysLeft: "3 months",
      tag: "Mathematics",
      emoji: "📐",
      registrations: "1,500 Students",
      desc1: "Testing analytical problem-solving and numerical logic. The National Math Olympiad tests students across algebra, geometry, and combinatorics.",
      desc2: "Conducted under supervised examination conditions, top national rankers receive merit scholarships and direct international nominations.",
      schedule: [
        { round: "Online registration close", date: "September 02, 2026", desc: "Download admit card releases." },
        { round: "Olympiad Test Day", date: "September 12, 2026", desc: "Written test and paper keys release." }
      ]
    },
    9: {
      title: "National Inter-School Athletics Meet",
      school: "Delhi Public School, RK Puram",
      schoolId: 1,
      city: "New Delhi",
      category: "sports",
      date: "November 20 - 22, 2026",
      venue: "Sports Complex Stadium, RK Puram",
      deadline: "November 10, 2026",
      daysLeft: "5 months",
      tag: "Athletics",
      emoji: "🏃",
      registrations: "2,400 Students",
      desc1: "A grand national meet hosting track events (100m, 400m, relay), high jump, long jump, and shot put fests.",
      desc2: "Hosted on DPS RK Puram's synthetic tracks with digital timing equipment to ensure professional athletic standards.",
      schedule: [
        { round: "Heats and Qualifiers", date: "November 20, 2026", desc: "Preliminary heats across categories." },
        { round: "Semi-Finals & Finals", date: "November 21 - 22, 2026", desc: "Final matches and medal ceremonies." }
      ]
    },
    10: {
      title: "National Youth Parliament Competition",
      school: "La Martiniere for Boys",
      schoolId: 8,
      city: "Kolkata",
      category: "debate",
      date: "December 5 - 7, 2026",
      venue: "La Martiniere Auditorium, Kolkata",
      deadline: "November 25, 2026",
      daysLeft: "5 months",
      tag: "Leadership & Speech",
      emoji: "🏛️",
      registrations: "1,100 Students",
      desc1: "Simulating parliament deliberations. Students assume representative roles debating policy drafts, bills, and national budget sheets.",
      desc2: "Judged by political analysts and public speakers. Focuses on research, speech, and parliamentary decorum.",
      schedule: [
        { round: "Bill outlines shared", date: "November 25, 2026", desc: "Receiving bills draft copies and portfolios assignments." },
        { round: "Parliament Debates", date: "December 05 - 07, 2026", desc: "Mock bill reviews, resolutions voting, and award announcements." }
      ]
    }
  };

  /* --- Parse URL Query Parameters --- */
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id') || '1';
  let currentEvent = null;

  async function loadEventDetail() {
    const supabase = window.CampusLink && window.CampusLink.supabase;
    let loadedFromDB = false;
    
    if (supabase) {
      try {
        let query = supabase.from('events').select('*');
        if (eventId.length > 8) {
          query = query.eq('id', eventId);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        let dbEvent = null;
        if (data && data.length > 0) {
          if (eventId.length > 8) {
            dbEvent = data[0];
          } else {
            const idx = parseInt(eventId, 10) - 1;
            dbEvent = data[idx] || data[0];
          }
        }
        
        if (dbEvent) {
          const descText = dbEvent.description || 'No description provided.';
          const paragraphs = descText.split('\n\n').filter(p => p.trim());
          const desc1 = paragraphs[0] || descText;
          const desc2 = paragraphs.slice(1).join('\n\n') || 'Join us for this exciting opportunity.';
          
          currentEvent = {
            id: dbEvent.id,
            title: dbEvent.title,
            school: dbEvent.school_name || 'Partner School',
            schoolId: dbEvent.school_id || '',
            city: dbEvent.city || 'India',
            category: dbEvent.category || 'other',
            date: dbEvent.event_date || '',
            venue: dbEvent.venue || 'School Campus',
            deadline: dbEvent.deadline || 'Varies',
            daysLeft: 'Active',
            tag: dbEvent.tag || 'Opportunity',
            emoji: dbEvent.logo_letter || '🎉',
            registrations: dbEvent.registrations || '0 Students',
            desc1: desc1,
            desc2: desc2,
            schedule: [
              { round: "Registration Deadline", date: dbEvent.deadline || 'Varies', desc: "Submit your team registrations before the cutoff date." },
              { round: "Event Day", date: dbEvent.event_date || 'TBD', desc: "Join us live at the venue for the main activities." }
            ]
          };
          loadedFromDB = true;
        }
      } catch (err) {
        console.warn('Error loading event detail from Supabase, falling back to mock:', err);
      }
    }
    
    if (!loadedFromDB) {
      const idx = parseInt(eventId, 10) || 1;
      currentEvent = eventsDetail[idx] || eventsDetail[1];
    }
    
    populateEventPage();
  }

  /* --- Load Event Page Content Dynamically --- */
  function populateEventPage() {
    // Banner & Emoji
    const banner = document.getElementById('event-banner-bg');
    const emojiBg = document.getElementById('event-emoji-bg');
    
    if (banner) {
      banner.className = `event-detail-banner category-${currentEvent.category}`;
    }
    if (emojiBg) {
      emojiBg.textContent = currentEvent.emoji;
    }

    // Title & Category Badge
    const titleHeader = document.getElementById('event-title');
    const categoryBadge = document.getElementById('event-category-badge');
    
    if (titleHeader) {
      titleHeader.textContent = currentEvent.title;
    }
    if (categoryBadge) {
      categoryBadge.textContent = currentEvent.category;
    }

    // Host School Link
    const schoolLink = document.getElementById('event-school-link');
    const hostName = document.getElementById('event-host-name');
    
    if (schoolLink) {
      schoolLink.href = `school-profile.html?id=${currentEvent.schoolId}`;
    }
    if (hostName) {
      hostName.textContent = currentEvent.school;
    }

    // Description text
    const descP1 = document.getElementById('event-desc-p1');
    const descP2 = document.getElementById('event-desc-p2');
    if (descP1) descP1.textContent = currentEvent.desc1;
    if (descP2) descP2.textContent = currentEvent.desc2;
    
    // Schedule Timeline
    const timeline = document.getElementById('event-schedule-timeline');
    if (timeline) {
      const scheduleSection = timeline.closest('.event-detail-section');
      if (currentEvent && currentEvent.schedule && currentEvent.schedule.length > 0) {
        if (scheduleSection) scheduleSection.style.display = 'block';
        timeline.innerHTML = '';
        currentEvent.schedule.forEach(sch => {
          const item = document.createElement('div');
          item.className = 'achievement-item';
          item.innerHTML = `
            <div class="achievement-dot">⚡</div>
            <h4 class="achievement-title">${sch.round}</h4>
            <div class="achievement-meta">${sch.date}</div>
            <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 20px;">
              ${sch.desc}
            </p>
          `;
          timeline.appendChild(item);
        });
      } else {
        if (scheduleSection) scheduleSection.style.display = 'none';
      }
    }

    // Sidebar timelines
    const eventDays = document.getElementById('event-days-left');
    const sidebarEventDate = document.getElementById('sidebar-event-date');
    const sidebarVenue = document.getElementById('sidebar-venue');
    const sidebarDeadline = document.getElementById('sidebar-deadline');
    const sidebarCategory = document.getElementById('sidebar-category');
    const sidebarRegs = document.getElementById('sidebar-regs');

    if (eventDays) eventDays.textContent = currentEvent.daysLeft;
    if (sidebarEventDate) sidebarEventDate.textContent = currentEvent.date;
    if (sidebarVenue) sidebarVenue.textContent = currentEvent.venue;
    if (sidebarDeadline) sidebarDeadline.textContent = currentEvent.deadline;
    if (sidebarCategory) sidebarCategory.textContent = currentEvent.tag;
    if (sidebarRegs) sidebarRegs.textContent = `${currentEvent.registrations.split(' ')[0]} Students`;
  }

  /* --- Student Registration Wizard Logic --- */
  const modalOverlay = document.getElementById('registration-modal');
  const modalClose = document.getElementById('modal-close');
  const formSteps = document.querySelectorAll('.form-step');
  const nextStepBtns = document.querySelectorAll('.btn-next');
  const prevStepBtns = document.querySelectorAll('.btn-prev');
  const regForm = document.getElementById('school-registration-form');
  const successScreen = document.getElementById('success-screen');
  const modalContextTitle = document.getElementById('modal-context-title');
  const eventTitleSub = document.getElementById('modal-event-title-sub');
  
  const progressLine = document.getElementById('wizard-progress-line');
  const stepNodes = document.querySelectorAll('.progress-step-node');
  
  const regTypeRadios = document.querySelectorAll('input[name="registration_type"]');
  const teamFieldsContainer = document.getElementById('team-fields-container');
  
  let currentStep = 0;
  let currentUser = null;
  let userProfile = null;

  async function fetchUserProfileAndSchool() {
    const supabase = window.CampusLink && window.CampusLink.supabase;
    const auth = window.CampusLink && window.CampusLink.auth;
    if (!supabase || !auth) return;
    
    try {
      const session = await auth.getSession();
      if (session && session.user) {
        currentUser = session.user;
        const profile = await auth.getProfile(currentUser.id);
        if (profile) {
          userProfile = profile;
          
          // Prefill Step 1
          document.getElementById('reg-student-name').value = profile.full_name || '';
          document.getElementById('reg-student-email').value = profile.email || currentUser.email || '';
          document.getElementById('reg-student-grade').value = profile.class || '';
          
          // Fetch linked school if any
          if (profile.school_id) {
            const { data: school } = await supabase
              .from('schools')
              .select('*')
              .eq('id', profile.school_id)
              .maybeSingle();
            
            if (school) {
              document.getElementById('reg-school-name').value = school.name || '';
              document.getElementById('reg-school-board').value = school.board || '';
              document.getElementById('reg-school-city').value = school.city || '';
              
              const note = document.getElementById('school-autofill-note');
              if (note) note.style.display = 'block';
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching profile for registration pre-fill:', err);
    }
  }

  function openRegistrationModal(context = "Register for Event") {
    if (!modalOverlay) return;
    
    // Prefill event category / subcategories
    const categorySelect = document.getElementById('reg-comp-category');
    if (categorySelect && currentEvent) {
      const category = currentEvent.category || 'other';
      const subcategories = {
        'science': ["Robotics", "Mathematics", "Coding & Hackathon", "Science Exhibition"],
        'sports': ["Basketball", "Athletics", "Football", "Cricket", "Table Tennis"],
        'debate': ["Model United Nations (MUN)", "Geopolitical Debate", "Youth Parliament", "Public Speaking"],
        'workshop': ["AI & Machine Learning", "Python Scripting", "Creative Writing", "Theatre & Acting"],
        'cultural': ["Art & Painting", "Drama & Street Play", "Music & Band Showdown", "Dance Solo"]
      };
      
      categorySelect.innerHTML = '';
      const list = subcategories[category.toLowerCase()] || [];
      if (list.length > 0) {
        list.forEach(sub => {
          const opt = document.createElement('option');
          opt.value = sub;
          opt.textContent = sub;
          categorySelect.appendChild(opt);
        });
      } else {
        const opt = document.createElement('option');
        const displayVal = category.charAt(0).toUpperCase() + category.slice(1);
        opt.value = displayVal;
        opt.textContent = displayVal;
        categorySelect.appendChild(opt);
      }
    }
    
    if (eventTitleSub && currentEvent) {
      eventTitleSub.textContent = `Registering for: ${currentEvent.title}`;
    }
    
    modalContextTitle.textContent = context;
    modalOverlay.classList.add('active');
    body.style.overflow = 'hidden';
    
    currentStep = 0;
    showStep(0);
    regForm.style.display = 'block';
    successScreen.classList.remove('active');
    regForm.reset();
    
    // Hide team fields on reset
    if (teamFieldsContainer) teamFieldsContainer.style.display = 'none';
    
    // Remove all input-invalid classes
    if (regForm) {
      regForm.querySelectorAll('.input-invalid').forEach(inp => inp.classList.remove('input-invalid'));
    }
    
    // Prefill user details
    fetchUserProfileAndSchool();
  }

  function closeRegistrationModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('active');
    body.style.overflow = 'auto';
  }

  function showStep(stepIndex) {
    formSteps.forEach((step, idx) => {
      if (idx === stepIndex) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });
    
    currentStep = stepIndex;
    updateProgressIndicator();
  }

  function updateProgressIndicator() {
    // Update progress line width
    const percentage = (currentStep / (formSteps.length - 1)) * 100;
    if (progressLine) {
      progressLine.style.width = `${percentage}%`;
    }
    
    // Update step circles
    stepNodes.forEach((node, idx) => {
      const nodeStep = parseInt(node.getAttribute('data-step'), 10);
      if (nodeStep === currentStep) {
        node.className = 'progress-step-node active';
      } else if (nodeStep < currentStep) {
        node.className = 'progress-step-node completed';
      } else {
        node.className = 'progress-step-node';
      }
    });
  }

  // Toggle Team Fields based on selection
  regTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'team') {
        teamFieldsContainer.style.display = 'block';
      } else {
        teamFieldsContainer.style.display = 'none';
      }
    });
  });

  function validateStep(stepIndex) {
    const stepEl = formSteps[stepIndex];
    if (!stepEl) return true;
    
    const inputs = stepEl.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
      // Skip if input is not visible/applicable
      if (input.closest('#team-fields-container') && teamFieldsContainer.style.display === 'none') {
        return;
      }
      
      let fieldValid = true;
      
      if (!input.value.trim()) {
        fieldValid = false;
      } else if (input.type === 'email') {
        // basic email regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(input.value.trim())) {
          fieldValid = false;
        }
      } else if (input.id === 'reg-student-phone' || input.id === 'reg-parent-phone') {
        // phone validation (10 digits)
        const phoneRegex = /^[0-9]{10}$/;
        const val = input.value.replace(/[^0-9]/g, '');
        if (!phoneRegex.test(val)) {
          fieldValid = false;
        }
      } else if (input.type === 'checkbox' && !input.checked) {
        fieldValid = false;
      }
      
      if (!fieldValid) {
        isValid = false;
        input.classList.add('input-invalid');
      } else {
        input.classList.remove('input-invalid');
      }
    });
    
    // Additional conditional team check
    if (stepIndex === 2 && document.querySelector('input[name="registration_type"]:checked').value === 'team') {
      const teamName = document.getElementById('reg-team-name');
      const teamMembers = document.getElementById('reg-team-members');
      
      if (!teamName.value.trim()) {
        teamName.classList.add('input-invalid');
        isValid = false;
      } else {
        teamName.classList.remove('input-invalid');
      }
      
      if (!teamMembers.value.trim()) {
        teamMembers.classList.add('input-invalid');
        isValid = false;
      } else {
        teamMembers.classList.remove('input-invalid');
      }
    }
    
    return isValid;
  }

  function populateSummary() {
    // Student
    document.getElementById('sum-student-name').textContent = document.getElementById('reg-student-name').value;
    document.getElementById('sum-student-grade').textContent = document.getElementById('reg-student-grade').value;
    document.getElementById('sum-student-email').textContent = document.getElementById('reg-student-email').value;
    document.getElementById('sum-student-phone').textContent = document.getElementById('reg-student-phone').value;
    
    // School
    document.getElementById('sum-school-name').textContent = document.getElementById('reg-school-name').value;
    document.getElementById('sum-school-board').textContent = document.getElementById('reg-school-board').value;
    document.getElementById('sum-school-city').textContent = document.getElementById('reg-school-city').value;
    
    // Team (if selected)
    const isTeam = document.querySelector('input[name="registration_type"]:checked').value === 'team';
    const sumTeamSection = document.getElementById('sum-team-section');
    if (isTeam) {
      sumTeamSection.style.display = 'block';
      document.getElementById('sum-team-name').textContent = document.getElementById('reg-team-name').value;
      const sizeVal = parseInt(document.getElementById('reg-team-size').value, 10) + 1;
      document.getElementById('sum-team-size').textContent = `${sizeVal} Members`;
      document.getElementById('sum-team-members').textContent = document.getElementById('reg-team-members').value;
    } else {
      sumTeamSection.style.display = 'none';
    }
    
    // Competition
    document.getElementById('sum-event-title').textContent = currentEvent ? currentEvent.title : 'Event';
    document.getElementById('sum-event-category').textContent = document.getElementById('reg-comp-category').value;
    document.getElementById('sum-project-details').textContent = document.getElementById('reg-project-details').value;
    
    // Parent
    document.getElementById('sum-parent-name').textContent = document.getElementById('reg-parent-name').value;
    document.getElementById('sum-parent-phone').textContent = document.getElementById('reg-parent-phone').value;
  }

  // Bind next/prev button actions
  nextStepBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        if (currentStep < formSteps.length - 1) {
          if (currentStep === 4) {
            // About to show Step 6 (Summary)
            populateSummary();
          }
          showStep(currentStep + 1);
        }
      }
    });
  });

  prevStepBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentStep > 0) {
        showStep(currentStep - 1);
      }
    });
  });

  // Make step circles clickable to jump to steps already validated
  stepNodes.forEach((node, nodeIdx) => {
    node.addEventListener('click', () => {
      // Only allow jumping back, or jumping forward if valid
      if (nodeIdx < currentStep) {
        showStep(nodeIdx);
      } else if (nodeIdx > currentStep) {
        // Validate intermediate steps
        let canJump = true;
        for (let i = currentStep; i < nodeIdx; i++) {
          if (!validateStep(i)) {
            canJump = false;
            showStep(i);
            break;
          }
        }
        if (canJump) {
          if (nodeIdx === 5) populateSummary();
          showStep(nodeIdx);
        }
      }
    });
  });

  // Trigger modal from primary/secondary buttons in header
  const headerTriggers = document.querySelectorAll('header .btn-modal-trigger, .mobile-only .btn-modal-trigger');
  headerTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const actionText = e.currentTarget.textContent.trim().toLowerCase();
      
      if (actionText.includes('register school') || actionText.includes('get started') || actionText.includes('join')) {
        window.location.href = 'login.html#register';
        return;
      }
      if (actionText.includes('login') || actionText.includes('sign in')) {
        window.location.href = 'login.html';
        return;
      }
      
      openRegistrationModal(`Register for: ${currentEvent ? currentEvent.title : 'Event'}`);
    });
  });

  // Bind generic modal triggers
  const triggers = document.querySelectorAll('.btn-modal-trigger');
  triggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      if (e.currentTarget.closest('header') || e.currentTarget.closest('.mobile-only')) return;
      e.preventDefault();
      const actionText = e.currentTarget.textContent.trim().toLowerCase();
      
      if (actionText.includes('login') || actionText.includes('sign in')) {
        window.location.href = 'login.html';
        return;
      }
      
      openRegistrationModal(`Register for: ${currentEvent ? currentEvent.title : 'Event'}`);
    });
  });

  if (modalClose) {
    modalClose.addEventListener('click', closeRegistrationModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeRegistrationModal();
    });
  }

  // Handle Wizard Submit and DB save
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!validateStep(currentStep)) return;
      
      const supabase = window.CampusLink && window.CampusLink.supabase;
      const isTeam = document.querySelector('input[name="registration_type"]:checked').value === 'team';
      const teamSizeVal = isTeam ? parseInt(document.getElementById('reg-team-size').value, 10) + 1 : 1;
      
      // Construct registration dataset
      const registrationEntry = {
        student_name: document.getElementById('reg-student-name').value,
        student_email: document.getElementById('reg-student-email').value,
        student_phone: document.getElementById('reg-student-phone').value,
        student_grade: document.getElementById('reg-student-grade').value,
        student_school_name: document.getElementById('reg-school-name').value,
        student_school_board: document.getElementById('reg-school-board').value,
        student_school_city: document.getElementById('reg-school-city').value,
        is_team: isTeam,
        team_name: isTeam ? document.getElementById('reg-team-name').value : null,
        team_size: teamSizeVal,
        team_members: isTeam ? document.getElementById('reg-team-members').value : null,
        competition_category: document.getElementById('reg-comp-category').value,
        project_details: document.getElementById('reg-project-details').value,
        parent_name: document.getElementById('reg-parent-name').value,
        parent_phone: document.getElementById('reg-parent-phone').value,
        parent_consent: document.getElementById('reg-parent-consent').checked,
        status: 'pending'
      };
      
      let dbSaved = false;
      
      if (supabase) {
        try {
          let targetEventId = currentEvent ? currentEvent.id : null;
          let targetSchoolId = currentEvent ? currentEvent.schoolId : null;
          
          // Validate UUID
          if (!targetEventId || targetEventId.toString().length <= 8) {
            // Mock event - fetch first real event for UUID belonging to user's school
            let userSchoolId = null;
            if (currentUser) {
              const { data: prof } = await supabase
                .from('profiles')
                .select('school_id')
                .eq('id', currentUser.id)
                .maybeSingle();
              if (prof) userSchoolId = prof.school_id;
            }
            
            let query = supabase.from('events').select('id, school_id');
            if (userSchoolId) {
              query = query.eq('school_id', userSchoolId);
            }
            const { data: dbEvents } = await query.limit(1);
            if (dbEvents && dbEvents.length > 0) {
              targetEventId = dbEvents[0].id;
              targetSchoolId = dbEvents[0].school_id;
            }
          }
          
          if (targetEventId && targetSchoolId) {
            const { error: dbError } = await supabase
              .from('event_registrations')
              .insert({
                ...registrationEntry,
                event_id: targetEventId,
                school_id: targetSchoolId,
                student_id: currentUser ? currentUser.id : null
              });
              
            if (dbError) throw dbError;
            dbSaved = true;
          }
        } catch (dbErr) {
          console.warn('Supabase DB Insert failed. Falling back to local state:', dbErr.message);
        }
      }
      
      // Fallback: save to LocalStorage (so local admin dashboard sees it instantly even without DB sync)
      const localReg = {
        id: Date.now(),
        studentName: registrationEntry.student_name,
        classGrade: registrationEntry.student_grade,
        eventTitle: currentEvent ? currentEvent.title : 'Robotics Fest',
        dateApplied: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        status: 'pending',
        // metadata for admin dashboard detail view
        school_name: registrationEntry.student_school_name,
        is_team: registrationEntry.is_team,
        team_name: registrationEntry.team_name,
        team_size: registrationEntry.team_size,
        team_members: registrationEntry.team_members,
        project_details: registrationEntry.project_details,
        parent_name: registrationEntry.parent_name,
        parent_phone: registrationEntry.parent_phone
      };
      
      const localRegsList = JSON.parse(localStorage.getItem('campuslink_registrations') || '[]');
      localRegsList.push(localReg);
      localStorage.setItem('campuslink_registrations', JSON.stringify(localRegsList));
      
      regForm.style.display = 'none';
      successScreen.classList.add('active');
      
      setTimeout(() => {
        closeRegistrationModal();
      }, 3500);
    });
  }

  /* --- Native Sharing / Clipboard Fallback --- */
  const shareBtn = document.getElementById('btn-share-event');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const shareData = {
        title: currentEvent ? currentEvent.title : document.title,
        text: currentEvent ? `Check out this event: ${currentEvent.title} by ${currentEvent.school}` : document.title,
        url: window.location.href
      };

      // Check for Capacitor Share API
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) {
        try {
          await window.Capacitor.Plugins.Share.share({
            title: shareData.title,
            text: shareData.text,
            url: shareData.url,
            dialogTitle: 'Share Event'
          });
          return;
        } catch (err) {
          console.warn('Capacitor share failed, trying Web Share API:', err);
        }
      }

      // Check for Web Share API
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err) {
          if (err.name === 'AbortError') {
            return; // user cancelled
          }
          console.warn('Web Share failed, trying clipboard copy:', err);
        }
      }

      // Clipboard fallback
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Event link copied to clipboard!');
      } catch (err) {
        const textarea = document.createElement('textarea');
        textarea.value = window.location.href;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          alert('Event link copied to clipboard!');
        } catch (copyErr) {
          console.error('Could not copy text: ', copyErr);
        }
        document.body.removeChild(textarea);
      }
    });
  }

  /* --- Newsletter subscription feedback --- */
  const newsletterForm = document.querySelector('.newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = newsletterForm.querySelector('input');
      const email = input.value.trim();
      if (email) {
        const originalBtnText = newsletterForm.querySelector('button').textContent;
        newsletterForm.querySelector('button').textContent = "Subscribed!";
        newsletterForm.querySelector('button').disabled = true;
        input.value = '';
        input.disabled = true;
        
        setTimeout(() => {
          newsletterForm.querySelector('button').textContent = originalBtnText;
          newsletterForm.querySelector('button').disabled = false;
          input.disabled = false;
        }, 3000);
      }
    });
  }

  // Load event details on startup
  loadEventDetail();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEventDetail);
} else {
  initEventDetail();
}
