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

  /* --- Schools Database --- */
  const DEFAULT_SCHOOLS = [
    { id: '1', name: "Delhi Public School, RK Puram", city: "New Delhi", board: "CBSE", logoLetter: "D", colorClass: "bg-gradient-1", eventsCount: 3 },
    { id: '2', name: "St. Xavier's High School", city: "Mumbai", board: "ICSE", logoLetter: "X", colorClass: "bg-gradient-2", eventsCount: 2 },
    { id: '3', name: "Bishop Cotton School", city: "Shimla", board: "ICSE", logoLetter: "B", colorClass: "bg-gradient-3", eventsCount: 1 },
    { id: '4', name: "St. Stephen's Academy", city: "Dehradun", board: "CBSE", logoLetter: "S", colorClass: "bg-gradient-4", eventsCount: 4 },
    { id: '5', name: "The Heritage School", city: "Gurgaon", board: "IB", logoLetter: "H", colorClass: "bg-gradient-5", eventsCount: 2 },
    { id: '6', name: "Cathedral & John Connon School", city: "Mumbai", board: "IB", logoLetter: "C", colorClass: "bg-gradient-1", eventsCount: 1 },
    { id: '7', name: "Doon School", city: "Dehradun", board: "ICSE", logoLetter: "D", colorClass: "bg-gradient-2", eventsCount: 2 },
    { id: '8', name: "La Martiniere for Boys", city: "Kolkata", board: "ICSE", logoLetter: "L", colorClass: "bg-gradient-3", eventsCount: 1 }
  ];

  let schools = [];

  async function loadSchools() {
    const supabase = window.CampusLink && window.CampusLink.supabase;
    if (supabase) {
      try {
        const { data, error } = await supabase.from('schools').select('*');
        if (error) throw error;
        if (data && data.length > 0) {
          schools = data.map(s => ({
            id: s.id,
            name: s.name,
            city: s.city || 'India',
            board: s.board || 'CBSE',
            logoLetter: s.logo_letter || s.name.charAt(0).toUpperCase(),
            colorClass: s.color_class || 'bg-gradient-1',
            eventsCount: s.events_count || 0
          }));
        } else {
          schools = DEFAULT_SCHOOLS;
        }
      } catch (err) {
        console.warn('Error loading schools from Supabase, using defaults:', err);
        schools = DEFAULT_SCHOOLS;
      }
    } else {
      schools = DEFAULT_SCHOOLS;
    }
    renderSchools();
  }

  /* --- Render Grid of School Cards --- */
  const gridContainer = document.getElementById('schools-cards-grid');
  const countLabel = document.getElementById('schools-count-label');
  const searchInput = document.getElementById('school-search-input');
  const cityFilter = document.getElementById('school-city-filter');
  const boardFilter = document.getElementById('school-board-filter');
  const clearBtn = document.getElementById('btn-clear-filters');

  let searchQuery = '';
  let selectedCity = '';
  let selectedBoard = '';

  function renderSchools() {
    if (!gridContainer) return;

    // Filtering logic
    const filtered = schools.filter(school => {
      const matchesSearch = school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            school.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            school.board.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCity = !selectedCity || school.city === selectedCity;
      const matchesBoard = !selectedBoard || school.board === selectedBoard;

      return matchesSearch && matchesCity && matchesBoard;
    });

    // Clear grid
    gridContainer.innerHTML = '';

    // Update count label
    if (countLabel) {
      countLabel.textContent = `Showing ${filtered.length} school${filtered.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
      gridContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
          <p style="font-size: 1.2rem; color: var(--text-muted);">No verified partner schools match your search filters.</p>
          <button class="btn btn-primary" id="btn-reset-not-found" style="margin-top: 16px; padding: 8px 20px; font-size: 0.9rem;">Reset Filters</button>
        </div>
      `;
      const resetBtnNotFound = document.getElementById('btn-reset-not-found');
      if (resetBtnNotFound) {
        resetBtnNotFound.addEventListener('click', resetAllFilters);
      }
      return;
    }

    // Populate Cards
    filtered.forEach(school => {
      const card = document.createElement('div');
      card.className = 'school-card-item';
      card.innerHTML = `
        <div class="school-card-banner-bg ${school.colorClass}">
          <div class="school-logo-overlap">${school.logoLetter}</div>
        </div>
        <div class="school-card-content">
          <h3 class="school-card-name"><a href="school-profile.html?id=${school.id}">${school.name}</a></h3>
          
          <div class="school-card-badges-row">
            <span class="badge badge-primary" style="margin-bottom: 0;">${school.board} Affiliated</span>
            <span class="badge badge-accent" style="margin-bottom: 0; background-color: #F1F5F9; color: var(--text-muted);">${school.city}</span>
          </div>

          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px; line-height: 1.5;">
            Verified academic partner school since 2026. Actively participating in national fests and updates.
          </p>

          <div class="school-info-meta">
            <div class="school-events-badge">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z"/>
              </svg>
              <span>${school.eventsCount} Active Opportunities</span>
            </div>
            <button class="btn btn-secondary btn-modal-trigger" style="padding: 6px 12px; font-size: 0.75rem;">Contact</button>
          </div>
        </div>
      `;
      gridContainer.appendChild(card);
    });

    // Rebind newly created modal buttons
    const triggers = gridContainer.querySelectorAll('.btn-modal-trigger');
    triggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const schoolCard = e.currentTarget.closest('.school-card-content');
        const schoolName = schoolCard.querySelector('.school-card-name').textContent.trim();
        openRegistrationModal(`Contact: ${schoolName}`);
      });
    });
  }

  function resetAllFilters() {
    searchQuery = '';
    selectedCity = '';
    selectedBoard = '';
    
    if (searchInput) searchInput.value = '';
    if (cityFilter) cityFilter.value = '';
    if (boardFilter) boardFilter.value = '';
    
    renderSchools();
  }

  // Filter Listeners
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderSchools();
    });
  }

  if (cityFilter) {
    cityFilter.addEventListener('change', (e) => {
      selectedCity = e.target.value;
      renderSchools();
    });
  }

  if (boardFilter) {
    boardFilter.addEventListener('change', (e) => {
      selectedBoard = e.target.value;
      renderSchools();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', resetAllFilters);
  }

  // Init
  loadSchools();

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

      if (modalContextTitle.textContent.includes('Contact:')) {
        successTitle.textContent = "Message Sent!";
        successDesc.textContent = `Thank you, ${adminName}. Your contact request has been sent to the administration team.`;
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
