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
  let localEvents = JSON.parse(localStorage.getItem('campuslink_events'));
  const defaultEvents = [
    {
      id: 1,
      title: "National Science & Robotics Fest 2026",
      school: "Delhi Public School, RK Puram",
      city: "New Delhi",
      category: "science",
      date: "June 24 - 26, 2026",
      tag: "Science & Tech",
      registrations: "1.2k Registered",
      logoLetter: "🔬"
    },
    {
      id: 2,
      title: "Synthesis Cultural Fest & Art Exhibition",
      school: "St. Xavier's High School",
      city: "Mumbai",
      category: "cultural",
      date: "July 12 - 14, 2026",
      tag: "Arts & Culture",
      registrations: "3.4k Registered",
      logoLetter: "🎭"
    },
    {
      id: 3,
      title: "AI & Machine Learning Student Workshop",
      school: "Bishop Cotton School",
      city: "Shimla",
      category: "workshop",
      date: "June 30, 2026",
      tag: "Technology",
      registrations: "850 Registered",
      logoLetter: "💻"
    },
    {
      id: 4,
      title: "Invitational Inter-School Basketball League",
      school: "St. Stephen's Academy",
      city: "Dehradun",
      category: "sports",
      date: "Oct 10 - 15, 2026",
      tag: "Sports",
      registrations: "2.1k Registered",
      logoLetter: "🏀"
    },
    {
      id: 5,
      title: "All-India Model United Nations (MUN)",
      school: "Cathedral & John Connon School",
      city: "Mumbai",
      category: "debate",
      date: "August 18 - 20, 2026",
      tag: "Debate & Speech",
      registrations: "1.8k Registered",
      logoLetter: "🗣️"
    },
    {
      id: 6,
      title: "Summer Creative Writing & Theatre Workshop",
      school: "Doon School",
      city: "Dehradun",
      category: "workshop",
      date: "July 8 - 15, 2026",
      tag: "Arts & Theatre",
      registrations: "620 Registered",
      logoLetter: "✍️"
    },
    {
      id: 7,
      title: "Grand Autumn Fest & Food Carnival",
      school: "La Martiniere for Boys",
      city: "Kolkata",
      category: "cultural",
      date: "Nov 5 - 6, 2026",
      tag: "Cultural & Food",
      registrations: "4.2k Registered",
      logoLetter: "🎡"
    },
    {
      id: 8,
      title: "National Mathematics Olympiad 2026",
      school: "The Shri Ram School",
      city: "New Delhi",
      category: "science",
      date: "September 12, 2026",
      tag: "Mathematics",
      registrations: "1.5k Registered",
      logoLetter: "📐"
    },
    {
      id: 9,
      title: "National Inter-School Athletics Meet",
      school: "Delhi Public School, RK Puram",
      city: "New Delhi",
      category: "sports",
      date: "November 20 - 22, 2026",
      tag: "Athletics",
      registrations: "2.4k Registered",
      logoLetter: "🏃"
    },
    {
      id: 10,
      title: "National Youth Parliament Competition",
      school: "La Martiniere for Boys",
      city: "Kolkata",
      category: "debate",
      date: "December 5 - 7, 2026",
      tag: "Leadership & Speech",
      registrations: "1.1k Registered",
      logoLetter: "🏛️"
    }
  ];

  let events = [];

  async function loadEvents() {
    const supabase = window.CampusLink && window.CampusLink.supabase;
    if (supabase) {
      try {
        const { data, error } = await supabase.from('events').select('*');
        if (error) throw error;
        if (data && data.length > 0) {
          events = data.map(e => ({
            id: e.id,
            title: e.title,
            school: e.school_name || 'Partner School',
            city: e.city || 'India',
            category: e.category || 'other',
            date: e.event_date || '',
            tag: e.tag || 'Opportunity',
            registrations: e.registrations || '0 Registered',
            logoLetter: e.logo_letter || '🎉'
          }));
        } else {
          events = localEvents || defaultEvents;
        }
      } catch (err) {
        console.warn('Error loading events from Supabase, using defaults:', err);
        events = localEvents || defaultEvents;
      }
    } else {
      events = localEvents || defaultEvents;
    }
    renderEvents();
  }

  /* --- Render Grid of Event Cards --- */
  const gridContainer = document.getElementById('events-cards-grid');
  const countLabel = document.getElementById('events-count-label');
  const searchInput = document.getElementById('event-search-input');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const clearBtn = document.getElementById('btn-clear-filters');

  let searchQuery = '';
  let activeCategory = 'all';

  function renderEvents() {
    if (!gridContainer) return;

    // Filter logic
    const filtered = events.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.school.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.tag.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;

      return matchesSearch && matchesCategory;
    });

    // Clear grid
    gridContainer.innerHTML = '';

    // Update count label
    if (countLabel) {
      countLabel.textContent = `Showing ${filtered.length} opportunit${filtered.length === 1 ? 'y' : 'ies'}`;
    }

    if (filtered.length === 0) {
      gridContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
          <p style="font-size: 1.2rem; color: var(--text-muted);">No opportunities match your current filters.</p>
          <button class="btn btn-primary" id="btn-reset-events" style="margin-top: 16px; padding: 8px 20px; font-size: 0.9rem;">Reset Filters</button>
        </div>
      `;
      const resetBtn = document.getElementById('btn-reset-events');
      if (resetBtn) {
        resetBtn.addEventListener('click', resetAllFilters);
      }
      return;
    }

    // Populate Cards
    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'event-card-grid-item';
      
      let bannerStyle = '';
      let bannerContent = item.logoLetter;
      if (item.bannerImg) {
        bannerStyle = `style="background-image: url('${item.bannerImg}'); background-size: cover; background-position: center;"`;
        bannerContent = '';
      }

      card.innerHTML = `
        <div class="event-card-banner-img category-${item.category}" ${bannerStyle}>
          ${bannerContent}
          <span class="event-card-banner-badge">${item.category}</span>
        </div>
        <div class="event-card-grid-content">
          <span class="badge badge-primary" style="align-self: flex-start; margin-bottom: 8px;">${item.tag}</span>
          <h3 class="event-card-grid-title"><a href="event-detail.html?id=${item.id}">${item.title}</a></h3>
          
          <div class="event-card-host">
            <span>🏫</span>
            <span>${item.school}</span>
          </div>

          <div class="event-card-meta-row">
            <div class="event-card-meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14">
                <path d="M9 1v2h6V1h2v2h4a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4V1h2zm11 9H4v10h16V10zm-2-5H4v3h16V5zm-6 7.5h5v5h-5v-5z"/>
              </svg>
              <span>${item.date}</span>
            </div>
            <div class="event-card-meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
              </svg>
              <span>${item.city}, India</span>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 16px;">
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 0.9rem; font-weight: 700; color: var(--dark-bg);">${item.registrations.split(' ')[0]}</span>
              <span style="font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase;">Registrations</span>
            </div>
            <button class="btn btn-primary btn-register-action" style="padding: 8px 16px; font-size: 0.85rem;" data-title="${item.title}">Register</button>
          </div>
        </div>
      `;
      gridContainer.appendChild(card);
    });

    // Rebind newly created register buttons
    gridContainer.querySelectorAll('.btn-register-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const title = e.currentTarget.getAttribute('data-title');
        openRegistrationModal(`Register for: ${title}`);
      });
    });
  }

  function resetAllFilters() {
    searchQuery = '';
    activeCategory = 'all';
    
    if (searchInput) searchInput.value = '';
    tabButtons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-filter') === 'all') btn.classList.add('active');
    });
    
    renderEvents();
  }

  // Filter Listeners
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderEvents();
    });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabButtons.forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      activeCategory = e.currentTarget.getAttribute('data-filter');
      renderEvents();
    });
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', resetAllFilters);
  }

  // Init
  loadEvents();

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
