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

  // Close mobile nav and toggle active class when clicking a link
  const navAnchors = document.querySelectorAll('.nav-links a');
  navAnchors.forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      navLinks.classList.remove('active');
      body.classList.remove('mobile-nav-active');
      
      navAnchors.forEach(a => a.classList.remove('active'));
      anchor.classList.add('active');
    });
  });

  // Events & Admissions Nav specific filtering behaviour
  const navEventsLink = document.getElementById('nav-events-link');
  const navAdmissionsLink = document.getElementById('nav-admissions-link');

  if (navEventsLink) {
    navEventsLink.addEventListener('click', () => {
      const allTab = document.querySelector('.tab-btn[data-filter="all"]');
      if (allTab) allTab.click();
    });
  }

  if (navAdmissionsLink) {
    navAdmissionsLink.addEventListener('click', () => {
      const admissionsTab = document.querySelector('.tab-btn[data-filter="admissions"]');
      if (admissionsTab) admissionsTab.click();
    });
  }

  // Active Link Scroll Highlight (ScrollSpy)
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    let currentSectionId = '';
    const scrollPosition = window.scrollY + 120; // offset header height

    sections.forEach(sec => {
      const top = sec.offsetTop;
      const height = sec.offsetHeight;
      if (scrollPosition >= top && scrollPosition < top + height) {
        currentSectionId = sec.getAttribute('id');
      }
    });

    if (currentSectionId) {
      navAnchors.forEach(a => {
        a.classList.remove('active');
        const href = a.getAttribute('href');
        if (href === `#${currentSectionId}`) {
          if (currentSectionId === 'showcase') {
            if (activeCategory === 'admissions' && a.id === 'nav-admissions-link') {
              a.classList.add('active');
            } else if (activeCategory !== 'admissions' && a.id === 'nav-events-link') {
              a.classList.add('active');
            }
          } else {
            a.classList.add('active');
          }
        }
      });
    }
  });

  /* --- Opportunity Mock Database --- */
  /* --- Opportunity Mock Database --- */
  const DEFAULT_OPPORTUNITIES = [
    {
      id: 1,
      title: "National Science & Robotics Fest 2026",
      school: "Delhi Public School, RK Puram",
      location: "New Delhi",
      category: "competitions",
      date: "June 24 - 26, 2026",
      tag: "Science & Tech",
      registrations: "1.2k Registered",
      logoLetter: "D"
    },
    {
      id: 2,
      title: "Synthesis Cultural Fest & Art Exhibition",
      school: "St. Xavier's High School",
      location: "Mumbai, MH",
      category: "fests",
      date: "July 12 - 14, 2026",
      tag: "Arts & Culture",
      registrations: "3.4k Registered",
      logoLetter: "X"
    },
    {
      id: 3,
      title: "AI & Machine Learning Student Workshop",
      school: "Bishop Cotton School",
      location: "Shimla, HP",
      category: "workshops",
      date: "June 30, 2026",
      tag: "Technology",
      registrations: "850 Registered",
      logoLetter: "B"
    },
    {
      id: 4,
      title: "Invitational Inter-School Basketball League",
      school: "St. Stephen's Academy",
      location: "Dehradun, UK",
      category: "competitions",
      date: "Oct 10 - 15, 2026",
      tag: "Sports",
      registrations: "2.1k Registered",
      logoLetter: "S"
    },
    {
      id: 5,
      title: "Academic Open House & Admission Details 2026-27",
      school: "The Heritage School",
      location: "Gurgaon, HR",
      category: "admissions",
      date: "Apply before July 5, 2026",
      tag: "Admissions",
      registrations: "1.5k Registered",
      logoLetter: "H"
    },
    {
      id: 6,
      title: "All-India Model United Nations (MUN)",
      school: "Cathedral & John Connon School",
      location: "Mumbai, MH",
      category: "competitions",
      date: "August 18 - 20, 2026",
      tag: "Leadership",
      registrations: "1.8k Registered",
      logoLetter: "C"
    },
    {
      id: 7,
      title: "Summer Creative Writing & Theatre Workshop",
      school: "Doon School",
      location: "Dehradun, UK",
      category: "workshops",
      date: "July 8 - 15, 2026",
      tag: "Arts & Theatre",
      registrations: "620 Registered",
      logoLetter: "D"
    },
    {
      id: 8,
      title: "Grand Autumn Fest & Food Carnival",
      school: "La Martiniere for Boys",
      location: "Kolkata, WB",
      category: "fests",
      date: "Nov 5 - 6, 2026",
      tag: "Cultural & Food",
      registrations: "4.2k Registered",
      logoLetter: "L"
    }
  ];

  let opportunities = [];

  async function loadOpportunities() {
    const supabase = window.CampusLink && window.CampusLink.supabase;
    let loadedFromDB = false;

    if (supabase) {
      try {
        const { data: dbEvents, error: eventsError } = await supabase.from('events').select('*');
        const { data: dbAdmissions, error: admissionsError } = await supabase.from('admissions').select('*');
        if (eventsError) throw eventsError;
        if (admissionsError) throw admissionsError;

        let combined = [];

        if (dbEvents) {
          dbEvents.forEach(e => {
            let cat = 'competitions';
            if (e.category === 'cultural') cat = 'fests';
            if (e.category === 'workshop') cat = 'workshops';

            combined.push({
              id: e.id,
              title: e.title,
              school: e.school_name || 'Partner School',
              location: e.city || 'India',
              category: cat,
              date: e.event_date || '',
              tag: e.tag || 'Opportunity',
              registrations: e.registrations || '0 Registered',
              logoLetter: e.logo_letter || '🎉'
            });
          });
        }

        if (dbAdmissions) {
          dbAdmissions.forEach(a => {
            combined.push({
              id: a.id,
              title: `Admissions Open: ${a.classes_open}`,
              school: a.school_name || 'Partner School',
              location: a.city || 'India',
              category: 'admissions',
              date: `Apply before ${a.last_date}`,
              tag: 'Admissions',
              registrations: '0 Registered',
              logoLetter: '🎓'
            });
          });
        }

        if (combined.length > 0) {
          opportunities = combined;
          loadedFromDB = true;
        }
      } catch (err) {
        console.warn('Error loading opportunities from Supabase, using fallbacks:', err);
      }
    }

    if (!loadedFromDB) {
      opportunities = DEFAULT_OPPORTUNITIES;
    }
    renderOpportunities();
  }

  /* --- Render Opportunities Showcase --- */
  const showcaseGrid = document.getElementById('showcase-grid');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const searchInput = document.getElementById('showcase-search');

  let activeCategory = 'all';
  let searchQuery = '';

  function renderOpportunities() {
    if (!showcaseGrid) return;
    
    // Filter logic
    const filtered = opportunities.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.school.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.tag.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    // Clear grid
    showcaseGrid.innerHTML = '';

    if (filtered.length === 0) {
      showcaseGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px 20px;">
          <p style="font-size: 1.1rem; color: var(--text-muted);">No events found matching your filter or search criteria.</p>
        </div>
      `;
      return;
    }

    // Render cards
    filtered.forEach(item => {
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
          <span class="badge ${item.category === 'admissions' ? 'badge-accent' : 'badge-primary'} event-card-type">${item.tag}</span>
          <h3 class="event-card-title"><a href="event-detail.html?id=${item.id}">${item.title}</a></h3>
          <div class="event-meta-list">
            <div class="event-meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M9 1v2h6V1h2v2h4a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4V1h2zm11 9H4v10h16V10zm-2-5H4v3h16V5zm-6 7.5h5v5h-5v-5z"/>
              </svg>
              <span>${item.date}</span>
            </div>
            <div class="event-meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
              </svg>
              <span>${item.location}</span>
            </div>
          </div>
        </div>
        <div class="event-card-footer">
          <div class="event-card-registrations">
            <span class="registrations-count">${item.registrations.split(' ')[0]}</span>
            <span class="registrations-label">Registrations</span>
          </div>
          <button class="btn btn-secondary btn-register-action" style="padding: 8px 16px; font-size: 0.85rem;" data-title="${item.title}">Register</button>
        </div>
      `;
      showcaseGrid.appendChild(card);
    });

    // Attach event listeners to newly created action buttons
    document.querySelectorAll('.btn-register-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const title = e.currentTarget.getAttribute('data-title');
        openRegistrationModal(`Register for: ${title}`);
      });
    });
  }

  // Tab Filtering event listeners
  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabButtons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activeCategory = e.target.getAttribute('data-filter');
      renderOpportunities();
    });
  });

  // Search input filtering
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderOpportunities();
    });
  }

  // Initial render
  loadOpportunities();

  /* --- Interactive Dashboard Mockup Controller --- */
  const mockupInput = document.getElementById('mockup-search-input');
  const mockupFeedItems = document.querySelectorAll('.mockup-feed-item');

  if (mockupInput) {
    mockupInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      mockupFeedItems.forEach(item => {
        const text = item.querySelector('.mockup-feed-title').textContent.toLowerCase();
        if (text.includes(q)) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }

  /* --- Number Count-Up Statistics Animation --- */
  const statsSection = document.querySelector('.section-bg-dark');
  const statNumbers = document.querySelectorAll('.stat-number');
  let hasAnimatedStats = false;

  const countUp = (element, target) => {
    let start = 0;
    const duration = 1500; // ms
    const increment = target / (duration / 16); // ~60fps
    
    const updateCount = () => {
      start += increment;
      if (start >= target) {
        element.textContent = formatStatDisplay(target, element.dataset.suffix || '');
      } else {
        element.textContent = formatStatDisplay(Math.floor(start), element.dataset.suffix || '');
        requestAnimationFrame(updateCount);
      }
    };
    
    updateCount();
  };

  const formatStatDisplay = (num, suffix) => {
    if (num >= 1000 && suffix.includes('K')) {
      return (num / 1000).toFixed(0) + 'K' + suffix.replace('K', '');
    }
    return num.toLocaleString() + suffix;
  };

  const initStatsObserver = () => {
    if (!statsSection) return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasAnimatedStats) {
          hasAnimatedStats = true;
          statNumbers.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-target'), 10);
            countUp(stat, target);
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    observer.observe(statsSection);
  };

  initStatsObserver();

  /* --- Multi-step Registration Modal Form Flow --- */
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
    
    // Reset state
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

  // Trigger modal from primary/secondary buttons
  const triggers = document.querySelectorAll('.btn-modal-trigger');
  triggers.forEach(trigger => {
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
      
      let context = 'Explore Opportunity Network';
      if (actionText.includes('event') || actionText.includes('browse')) {
        context = 'Explore Opportunity Network';
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
      // Basic validation for step 1
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
      // Handle mock submit logic
      const schoolName = document.getElementById('school-name').value;
      const adminName = document.getElementById('admin-name').value;

      // Update success messaging
      const successTitle = successScreen.querySelector('h3');
      const successDesc = successScreen.querySelector('p');

      if (modalContextTitle.textContent.includes('Register for:')) {
        successTitle.textContent = "Registration Received!";
        successDesc.textContent = `Thank you, ${adminName}. Your student registry request for the event has been forwarded to the host school.`;
      } else {
        successTitle.textContent = "School Registered successfully!";
        successDesc.textContent = `Welcome ${schoolName}! We've sent a verification email to the representative to activate your administrator dashboard.`;
      }

      regForm.style.display = 'none';
      successScreen.classList.add('active');
      
      // Auto close modal after 3.5 seconds
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
