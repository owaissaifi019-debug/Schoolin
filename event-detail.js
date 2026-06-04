document.addEventListener('DOMContentLoaded', () => {

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
  const navLinks = document.querySelector('.nav-links');
  const body = document.body;

  mobileToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    body.classList.toggle('mobile-nav-active');
  });

  // Close mobile nav when clicking a link
  const navAnchors = document.querySelectorAll('.nav-links a');
  navAnchors.forEach(anchor => {
    anchor.addEventListener('click', () => {
      navLinks.classList.remove('active');
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

  // Populate dynamic elements
  loadEventDetail();

  /* --- Onboarding Modal Logic --- */
  const modalOverlay = document.getElementById('registration-modal');
  const modalClose = document.getElementById('modal-close');
  const formSteps = document.querySelectorAll('.form-step');
  const nextStepBtns = document.querySelectorAll('.btn-next');
  const prevStepBtns = document.querySelectorAll('.btn-prev');
  const regForm = document.getElementById('school-registration-form');
  const successScreen = document.getElementById('success-screen');
  const modalContextTitle = document.getElementById('modal-context-title');

  let currentStep = 0;

  function openRegistrationModal(context = "Create Free School Account") {
    if (!modalOverlay) return;
    modalContextTitle.textContent = context;
    modalOverlay.classList.add('active');
    body.style.overflow = 'hidden';
    
    currentStep = 0;
    showStep(0);
    regForm.style.display = 'block';
    successScreen.classList.remove('active');
    regForm.reset();
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
  }

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
      
      openRegistrationModal('Join CampusLink School Network');
    });
  });

  // Bind generic modal triggers
  const triggers = document.querySelectorAll('.btn-modal-trigger');
  triggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      if (e.currentTarget.closest('header') || e.currentTarget.closest('.mobile-only')) return;
      e.preventDefault();
      const actionText = e.currentTarget.textContent.trim().toLowerCase();
      let context = 'Join CampusLink School Network';
      
      if (actionText.includes('login') || actionText.includes('sign in')) {
        window.location.href = 'login.html';
        return;
      } else if (actionText.includes('register') || actionText.includes('enroll')) {
        context = `Register for: ${currentEvent.title}`;
      }
      
      openRegistrationModal(context);
    });
  });

  if (modalClose) {
    modalClose.addEventListener('click', closeRegistrationModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeRegistrationModal();
    });
  }

  nextStepBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const currentFields = formSteps[currentStep].querySelectorAll('input, select');
      let isValid = true;
      currentFields.forEach(field => {
        if (field.hasAttribute('required') && !field.value.trim()) {
          isValid = false;
          field.style.borderColor = 'red';
          setTimeout(() => field.style.borderColor = '', 2000);
        }
      });

      if (isValid && currentStep < formSteps.length - 1) {
        showStep(currentStep + 1);
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

  if (regForm) {
    regForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const schoolName = document.getElementById('school-name').value;
      const adminName = document.getElementById('admin-name').value;

      const successTitle = successScreen.querySelector('h3');
      const successDesc = successScreen.querySelector('p');

      if (modalContextTitle.textContent.includes('Register for:')) {
        successTitle.textContent = "Registration Received!";
        successDesc.textContent = `Thank you, ${adminName}. Your registration request for the event has been forwarded to the host school.`;
      } else {
        successTitle.textContent = "School Registered successfully!";
        successDesc.textContent = `Welcome ${schoolName}! We've sent a verification email to the representative to activate your administrator dashboard.`;
      }

      regForm.style.display = 'none';
      successScreen.classList.add('active');
      
      setTimeout(() => {
        closeRegistrationModal();
      }, 3500);
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
});
