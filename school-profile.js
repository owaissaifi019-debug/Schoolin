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

  /* --- Profiles Database --- */
  const schoolProfiles = {
    1: {
      name: "Delhi Public School, RK Puram",
      city: "New Delhi",
      board: "CBSE",
      est: "1972",
      size: "12 Acres",
      logoLetter: "D",
      colorClass: "color-1",
      about: "Delhi Public School, RK Puram is one of India's most prestigious co-educational day-cum-boarding schools. Founded under the aegis of the DPS Society, it has consistently delivered toppers in academic boards and sports arenas alike.",
      achievements: [
        { year: "2025", title: "Ranked #1 Co-Ed Day-Boarding School", desc: "Awarded by Education World National School Rankings." },
        { year: "2024", title: "National Robotics Championship Winners", desc: "First place at the All-India STEM robotics league." },
        { year: "2023", title: "CBSE National Sports Meet Overall Trophy", desc: "Dominating in Athletics, Swimming, and Basketball tournaments." }
      ],
      admissionText: "Admissions Open: Registration for nursery and grade XI starts June 15, 2026."
    },
    2: {
      name: "St. Xavier's High School",
      city: "Mumbai",
      board: "ICSE",
      est: "1869",
      size: "4 Acres",
      logoLetter: "X",
      colorClass: "color-2",
      about: "St. Xavier's High School, Fort, is a historic institution in Mumbai dedicated to nurturing young minds with robust Jesuit principles and rich academic traditions.",
      achievements: [
        { year: "2025", title: "Centennial Heritage Education Award", desc: "Recognized for preserving historical education benchmarks." },
        { year: "2024", title: "State Football League Champions", desc: "Under-17 boys clinching the Maharashtra Football Association Shield." },
        { year: "2023", title: "All-India Science Model Expo Gold Medal", desc: "Secured top honours in environmental engineering design." }
      ],
      admissionText: "Admissions Open: KG registration cycles commence from July 1, 2026."
    },
    3: {
      name: "Bishop Cotton School",
      city: "Shimla",
      board: "ICSE",
      est: "1859",
      size: "56 Acres",
      logoLetter: "B",
      colorClass: "color-3",
      about: "Bishop Cotton School is one of the oldest boarding schools for boys in Asia, located in the serene hills of Shimla. It focuses on character building, outdoor adventure, and public-school discipline.",
      achievements: [
        { year: "2025", title: "Top Boarding School in Himachal Pradesh", desc: "Consistently rated #1 for heritage and boarding standards." },
        { year: "2024", title: "Inter-School Debate Championship Winners", desc: "Won the prestigious Shimla Debates overall shield." }
      ],
      admissionText: "Admissions Open: Boarding registrations open for Grades 3 to 9. Apply before July 10, 2026."
    },
    4: {
      name: "St. Stephen's Academy",
      city: "Dehradun",
      board: "CBSE",
      est: "1994",
      size: "8 Acres",
      logoLetter: "S",
      colorClass: "color-4",
      about: "St. Stephen's Academy in Dehradun is known for its beautiful campus and robust sports coaching modules, nurturing national level athletes alongside academic CBSE toppers.",
      achievements: [
        { year: "2025", title: "National Basketball League Runners-Up", desc: "Fought in the finals of the Inter-School Sports Council League." },
        { year: "2024", title: "98.4% School Board Aggregate", desc: "Record highest board scores achieved in school history." }
      ],
      admissionText: "Admissions Open: Regular admission slots open for sports quotas. Apply today."
    },
    5: {
      name: "The Heritage School",
      city: "Gurgaon",
      board: "IB",
      est: "2002",
      size: "9 Acres",
      logoLetter: "H",
      colorClass: "color-5",
      about: "The Heritage School is an experiential learning institution in Gurgaon. Offering IB and Cambridge modules, it prioritizes hands-on project fests and collaborative study models.",
      achievements: [
        { year: "2025", title: "Leading Experiential School in NCR", desc: "Awarded for child-centric progressive methodologies." },
        { year: "2024", title: "IBDP Perfect Score Achievers", desc: "Two students secured 45/45 in the international diploma board." }
      ],
      admissionText: "Admissions Open: IB PYP, MYP, and DP intakes are open. Virtual open houses schedule available."
    },
    6: {
      name: "Cathedral & John Connon School",
      city: "Mumbai",
      board: "IB",
      est: "1860",
      size: "5 Acres",
      logoLetter: "C",
      colorClass: "color-1",
      about: "The Cathedral & John Connon School is an elite co-educational school in Mumbai known for its outstanding academic history, musical theatre events, and stellar alumni accomplishments.",
      achievements: [
        { year: "2025", title: "Ranked #1 Co-Ed Day School in Maharashtra", desc: "Awarded for global college placement and student support." },
        { year: "2024", title: "International Math Olympiad Silver", desc: "Student secured global rank in the advanced math tournament." }
      ],
      admissionText: "Admissions Open: Secondary school IB intakes live. Direct prospectus requests open."
    },
    7: {
      name: "Doon School",
      city: "Dehradun",
      board: "ICSE",
      est: "1935",
      size: "72 Acres",
      logoLetter: "D",
      colorClass: "color-2",
      about: "The Doon School is a premier all-boys boarding school in Dehradun, often referred to as the 'Eton of India'. It nurtures critical thinking, governance leadership, and social development.",
      achievements: [
        { year: "2025", title: "All-India Boarding School Rank #1", desc: "Consistently top-ranked boarding institution for boys." },
        { year: "2024", title: "President's Social Action Award", desc: "Recognized for community service and village uplift fests." }
      ],
      admissionText: "Admissions Open: Entrance test schedules for Class VII and VIII are active online."
    },
    8: {
      name: "La Martiniere for Boys",
      city: "Kolkata",
      board: "ICSE",
      est: "1836",
      size: "8 Acres",
      logoLetter: "L",
      colorClass: "color-3",
      about: "La Martiniere for Boys in Kolkata is a historic school that offers premium science, commerce, and arts curricula, combined with classic Anglo-Indian fests and traditions.",
      achievements: [
        { year: "2025", title: "National Debating Champion Shield", desc: "Secured overall winner at the Frank Anthony Memorial Debates." },
        { year: "2024", title: "East Zone Swimming League Gold", desc: "Overall team championship won for the 5th consecutive year." }
      ],
      admissionText: "Admissions Open: Nursery & Primary admissions active. Contact registrar."
    },
    9: {
      name: "Greenwood Public School",
      city: "Bangalore",
      board: "CBSE",
      est: "2006",
      size: "15 Acres",
      logoLetter: "G",
      colorClass: "color-4",
      about: "Greenwood Public School is a high-tech campus in Bangalore offering CBSE and Cambridge curricula. It is highly regarded for its green campus initiatives and coding accelerators.",
      achievements: [
        { year: "2025", title: "Green School National Gold Award", desc: "Recognized for solar powered labs and water recycling campaigns." },
        { year: "2024", title: "Inter-School Coding hackathon Winners", desc: "Secured first prize in the national junior dev challenge." }
      ],
      admissionText: "Admissions Open: Direct CBSE admissions active online for grades 1 to 9."
    },
    10: {
      name: "The Shri Ram School",
      city: "New Delhi",
      board: "IB",
      est: "1988",
      size: "6 Acres",
      logoLetter: "S",
      colorClass: "color-5",
      about: "The Shri Ram School in Delhi/NCR focuses on inclusive, value-based education. It is recognized for parent-teacher collaboration, arts inclusion, and global studies preparation.",
      achievements: [
        { year: "2025", title: "#1 Day School in Delhi NCR", desc: "Ranked first for teacher training, infrastructure, and values." },
        { year: "2024", title: "International Music Fest Gold", desc: "School choir secured first place at the Asia Pacific Choral league." }
      ],
      admissionText: "Admissions Open: Applications starting shortly. Pre-register for notifications."
    }
  };

  /* --- Global Opportunities Database (to filter for events tab) --- */
  const opportunities = JSON.parse(localStorage.getItem('campuslink_events')) || [
    { school: "Delhi Public School, RK Puram", title: "National Science & Robotics Fest 2026", category: "science", date: "June 24 - 26, 2026", tag: "Science & Tech", registrations: "1.2k", location: "New Delhi", logoLetter: "🔬" },
    { school: "St. Xavier's High School", title: "Synthesis Cultural Fest & Art Exhibition", category: "cultural", date: "July 12 - 14, 2026", tag: "Arts & Culture", registrations: "3.4k", location: "Mumbai, MH", logoLetter: "🎭" },
    { school: "Bishop Cotton School", title: "AI & Machine Learning Student Workshop", category: "workshop", date: "June 30, 2026", tag: "Technology", registrations: "850", location: "Shimla, HP", logoLetter: "💻" },
    { school: "St. Stephen's Academy", title: "Invitational Inter-School Basketball League", category: "sports", date: "Oct 10 - 15, 2026", tag: "Sports", registrations: "2.1k", location: "Dehradun, UK", logoLetter: "🏀" },
    { school: "The Heritage School", title: "Academic Open House & Admission Details 2026-27", category: "admissions", date: "Apply before July 5, 2026", tag: "Admissions", registrations: "1.5k", location: "Gurgaon, HR", logoLetter: "🎓" },
    { school: "Cathedral & John Connon School", title: "All-India Model United Nations (MUN)", category: "debate", date: "August 18 - 20, 2026", tag: "Leadership", registrations: "1.8k", location: "Mumbai, MH", logoLetter: "🗣️" },
    { school: "Doon School", title: "Summer Creative Writing & Theatre Workshop", category: "workshop", date: "July 8 - 15, 2026", tag: "Arts & Theatre", registrations: "620", location: "Dehradun, UK", logoLetter: "✍️" },
    { school: "La Martiniere for Boys", title: "Grand Autumn Fest & Food Carnival", category: "cultural", date: "Nov 5 - 6, 2026", tag: "Cultural & Food", registrations: "4.2k", location: "Kolkata, WB", logoLetter: "🎡" }
  ];

  /* --- Parse URL Query Parameters --- */
  const urlParams = new URLSearchParams(window.location.search);
  const schoolId = urlParams.get('id') || '1';
  let currentProfile = null;

  async function loadSchoolProfile() {
    const supabase = window.CampusLink && window.CampusLink.supabase;
    let loadedFromDB = false;
    
    if (supabase) {
      try {
        let dbSchool = null;
        if (schoolId.length > 8) { // UUID
          const { data } = await supabase.from('schools').select('*').eq('id', schoolId).maybeSingle();
          dbSchool = data;
        } else { // Index based fallback
          const { data } = await supabase.from('schools').select('*');
          if (data && data.length > 0) {
            const idx = parseInt(schoolId, 10) - 1;
            dbSchool = data[idx] || data[0];
          }
        }
        
        if (dbSchool) {
          currentProfile = {
            id: dbSchool.id,
            name: dbSchool.name,
            city: dbSchool.city || 'India',
            board: dbSchool.board || 'CBSE',
            est: '1995',
            size: '10 Acres',
            logoLetter: dbSchool.logo_letter || dbSchool.name.charAt(0).toUpperCase(),
            colorClass: dbSchool.color_class || 'color-1',
            about: dbSchool.about || 'Verified academic partner school.',
            achievements: [
              { year: "2025", title: "Academic Excellence Award", desc: "Awarded for exceptional board results." },
              { year: "2024", title: "Best Sports Infrastructure", desc: "For state-of-the-art sporting facilities." }
            ],
            admissionText: "No active admissions at the moment."
          };
          
          const { data: dbAdmissions } = await supabase.from('admissions').select('*').eq('school_id', dbSchool.id).eq('status', 'open').maybeSingle();
          if (dbAdmissions) {
            currentProfile.admissionText = `Admissions Open: Registration for ${dbAdmissions.classes_open} is open until ${dbAdmissions.last_date}.`;
          }
          
          const { data: dbEvents } = await supabase.from('events').select('*').eq('school_id', dbSchool.id);
          if (dbEvents && dbEvents.length > 0) {
            opportunities.length = 0;
            dbEvents.forEach(e => {
              opportunities.push({
                school: dbSchool.name,
                title: e.title,
                category: e.category || 'competitions',
                date: e.event_date || '',
                tag: e.tag || 'Opportunity',
                registrations: e.registrations || '0 Registered',
                location: dbSchool.city || 'India',
                logoLetter: e.logo_letter || '🎉'
              });
            });
          }
          
          loadedFromDB = true;
        }
      } catch (err) {
        console.warn('Error loading school profile from Supabase, using fallback:', err);
      }
    }
    
    if (!loadedFromDB) {
      const idx = parseInt(schoolId, 10) || 1;
      currentProfile = schoolProfiles[idx] || schoolProfiles[1];
    }
    
    populateProfilePage();
  }

  /* --- Load Profile Page Content Dynamically --- */
  function populateProfilePage() {
    // Banner & Logo
    const banner = document.getElementById('profile-banner-bg');
    const logo = document.getElementById('profile-logo');
    
    if (banner) {
      banner.className = `profile-banner ${currentProfile.colorClass}`;
    }
    if (logo) {
      logo.textContent = currentProfile.logoLetter;
    }

    // Name & Badges
    const nameHeading = document.getElementById('profile-school-name');
    const boardBadge = document.getElementById('profile-board-badge');
    const locationText = document.getElementById('profile-location-text');
    
    if (nameHeading) {
      nameHeading.innerHTML = `
        ${currentProfile.name}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="var(--primary)" style="display:inline-block; vertical-align:middle;" title="Verified School">
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      `;
    }
    if (boardBadge) {
      boardBadge.textContent = `${currentProfile.board} Affiliated`;
    }
    if (locationText) {
      locationText.textContent = `${currentProfile.city}, India`;
    }

    // About panel details
    const aboutPara = document.getElementById('about-intro-para');
    const metaEst = document.getElementById('meta-est');
    const metaBoard = document.getElementById('meta-board');
    
    if (aboutPara) {
      aboutPara.textContent = currentProfile.about;
    }
    if (metaEst) {
      metaEst.textContent = currentProfile.est;
    }
    if (metaBoard) {
      metaBoard.textContent = currentProfile.board;
    }

    // Admissions status box text
    const statusBox = document.getElementById('admission-status-box');
    if (statusBox) {
      statusBox.textContent = currentProfile.admissionText;
    }

    // Achievements Timeline loading
    const timeline = document.getElementById('achievements-timeline-box');
    if (timeline) {
      timeline.innerHTML = '';
      currentProfile.achievements.forEach(ach => {
        const item = document.createElement('div');
        item.className = 'achievement-item';
        item.innerHTML = `
          <div class="achievement-dot">🏆</div>
          <h4 class="achievement-title">${ach.title}</h4>
          <div class="achievement-meta">${ach.year} • National Level Award</div>
          <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 20px;">
            ${ach.desc}
          </p>
        `;
        timeline.appendChild(item);
      });
    }

    // School Events tab loading
    const eventsGrid = document.getElementById('profile-events-grid');
    if (eventsGrid) {
      eventsGrid.innerHTML = '';
      // Filter global opportunities matching current school name
      const schoolEvents = opportunities.filter(op => op.school.toLowerCase().includes(currentProfile.name.toLowerCase()) || currentProfile.name.toLowerCase().includes(op.school.toLowerCase()));

      if (schoolEvents.length === 0) {
        eventsGrid.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; background-color: var(--light-bg); border-radius: var(--radius-md);">
            <p style="color: var(--text-muted);">No active events are currently scheduled at this school. Check back later.</p>
          </div>
        `;
      } else {
        schoolEvents.forEach(item => {
          const card = document.createElement('div');
          card.className = 'event-card';
          card.innerHTML = `
            <div class="event-card-header">
              <div class="event-card-logo">${item.logoLetter}</div>
              <div class="event-card-school-info">
                <span class="event-card-school-name">${item.school}</span>
                <span class="event-card-school-location">${item.location}</span>
              </div>
            </div>
            <div class="event-card-body">
              <span class="badge badge-primary event-card-type">${item.tag}</span>
              <h3 class="event-card-title">${item.title}</h3>
              <div class="event-meta-list">
                <div class="event-meta-item">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M9 1v2h6V1h2v2h4a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4V1h2zm11 9H4v10h16V10zm-2-5H4v3h16V5zm-6 7.5h5v5h-5v-5z"/>
                  </svg>
                  <span>${item.date}</span>
                </div>
              </div>
            </div>
            <div class="event-card-footer">
              <div class="event-card-registrations">
                <span class="registrations-count">${item.registrations}</span>
                <span class="registrations-label">Registrations</span>
              </div>
              <button class="btn btn-secondary btn-register-action" style="padding: 8px 16px; font-size: 0.85rem;" data-title="${item.title}">Register</button>
            </div>
          `;
          eventsGrid.appendChild(card);
        });

        // Rebind dynamically loaded event register actions
        eventsGrid.querySelectorAll('.btn-register-action').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const title = e.currentTarget.getAttribute('data-title');
            openRegistrationModal(`Register for: ${title}`);
          });
        });
      }
    }
  }

  // Populate dynamic elements
  loadSchoolProfile();

  /* --- Tab Navigation Logic --- */
  const tabButtons = document.querySelectorAll('.profile-tab-btn');
  const tabPanels = document.querySelectorAll('.profile-tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active states
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      // Activate clicked
      btn.classList.add('active');
      const tabTarget = btn.getAttribute('data-tab');
      const activePanel = document.getElementById(`panel-${tabTarget}`);
      if (activePanel) {
        activePanel.classList.add('active');
      }
    });
  });

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
      } else if (actionText.includes('inquire') || actionText.includes('callback')) {
        context = `Inquiry: ${currentProfile.name}`;
      }
      
      openRegistrationModal(context);
    });
  });

  // Follow button click feedback
  const followBtn = document.getElementById('btn-follow-school');
  if (followBtn) {
    let isFollowing = false;
    followBtn.addEventListener('click', () => {
      isFollowing = !isFollowing;
      if (isFollowing) {
        followBtn.textContent = 'Following ✓';
        followBtn.style.color = 'var(--white)';
        followBtn.style.backgroundColor = 'var(--primary)';
        followBtn.style.borderColor = 'var(--primary)';
      } else {
        followBtn.textContent = 'Follow School';
        followBtn.style.color = 'var(--primary)';
        followBtn.style.backgroundColor = 'transparent';
        followBtn.style.borderColor = 'rgba(0, 102, 200, 0.3)';
      }
    });
  }

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

      if (modalContextTitle.textContent.includes('Inquiry:') || modalContextTitle.textContent.includes('Register for:')) {
        successTitle.textContent = "Query Submitted!";
        successDesc.textContent = `Thank you, ${adminName}. Your request has been logged successfully and forwarded to the administrator.`;
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
