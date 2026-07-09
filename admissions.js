function initAdmissions() {

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

  /* --- Admissions Database --- */
  let localAdmissions = JSON.parse(localStorage.getItem('campuslink_admissions'));
  const defaultAdmissions = [
    {
      id: 1,
      schoolName: "Delhi Public School, RK Puram",
      city: "New Delhi",
      board: "CBSE",
      classesOpen: "Nursery & Grade XI",
      classLevels: ["nursery", "senior-secondary", "Nursery", "Grade 11"],
      lastDate: "June 18, 2026",
      schoolId: 1,
      status: "closing"
    },
    {
      id: 2,
      schoolName: "St. Xavier's High School",
      city: "Mumbai",
      board: "ICSE",
      classesOpen: "Kindergarten to Grade 10",
      classLevels: ["nursery", "primary", "secondary", "Nursery", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"],
      lastDate: "July 05, 2026",
      schoolId: 2,
      status: "open"
    },
    {
      id: 3,
      schoolName: "Bishop Cotton School",
      city: "Shimla",
      board: "ICSE",
      classesOpen: "Grades 3 to 9",
      classLevels: ["primary", "secondary", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"],
      lastDate: "July 10, 2026",
      schoolId: 3,
      status: "open"
    },
    {
      id: 4,
      schoolName: "St. Stephen's Academy",
      city: "Dehradun",
      board: "CBSE",
      classesOpen: "Grades 1 to 12",
      classLevels: ["primary", "secondary", "senior-secondary", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"],
      lastDate: "July 24, 2026",
      schoolId: 4,
      status: "open"
    },
    {
      id: 5,
      schoolName: "The Heritage School",
      city: "Gurgaon",
      board: "IB",
      classesOpen: "Nursery to Grade XII",
      classLevels: ["nursery", "primary", "secondary", "senior-secondary", "Nursery", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"],
      lastDate: "June 30, 2026",
      schoolId: 5,
      status: "closing"
    },
    {
      id: 6,
      schoolName: "Cathedral & John Connon School",
      city: "Mumbai",
      board: "IB",
      classesOpen: "Grade XI (IBDP)",
      classLevels: ["senior-secondary", "Grade 11"],
      lastDate: "August 05, 2026",
      schoolId: 6,
      status: "open"
    },
    {
      id: 7,
      schoolName: "Doon School",
      city: "Dehradun",
      board: "ICSE",
      classesOpen: "Grades 7 & 8 (Entrance)",
      classLevels: ["secondary", "Grade 7", "Grade 8"],
      lastDate: "July 15, 2026",
      schoolId: 7,
      status: "open"
    },
    {
      id: 8,
      schoolName: "La Martiniere for Boys",
      city: "Kolkata",
      board: "ICSE",
      classesOpen: "Nursery to Grade 5",
      classLevels: ["nursery", "primary", "Nursery", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"],
      lastDate: "June 25, 2026",
      schoolId: 8,
      status: "closing"
    },
    {
      id: 9,
      schoolName: "Greenwood Public School",
      city: "Bangalore",
      board: "CBSE",
      classesOpen: "Grades 1 to 9",
      classLevels: ["primary", "secondary", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"],
      lastDate: "July 12, 2026",
      schoolId: 9,
      status: "open"
    },
    {
      id: 10,
      schoolName: "The Shri Ram School",
      city: "New Delhi",
      board: "IB",
      classesOpen: "Nursery & KG",
      classLevels: ["nursery", "Nursery", "LKG", "UKG"],
      lastDate: "July 20, 2026",
      schoolId: 10,
      status: "open"
    }
  ];

  let admissions = [];

  async function loadAdmissions() {
    const supabase = window.CampusLink && window.CampusLink.supabase;
    if (supabase) {
      try {
        const { data, error } = await supabase.from('admissions').select('*');
        if (error) throw error;
        if (data && data.length > 0) {
          admissions = data.map(a => ({
            id: a.id,
            schoolName: a.school_name || 'Partner School',
            city: a.city || 'India',
            board: a.board || 'CBSE',
            classesOpen: a.classes_open || '',
            classLevels: a.class_levels || ['primary', 'secondary'],
            lastDate: a.last_date || '',
            schoolId: a.school_id || '',
            status: a.status || 'open',
            applyLink: a.apply_link || ''
          }));
        } else {
          admissions = localAdmissions || defaultAdmissions;
        }
      } catch (err) {
        console.warn('Error loading admissions from Supabase, using defaults:', err);
        admissions = localAdmissions || defaultAdmissions;
      }
    } else {
      admissions = localAdmissions || defaultAdmissions;
    }
    renderAdmissions();
  }

  /* --- Render Grid of Admission Cards --- */
  const gridContainer = document.getElementById('admissions-cards-grid');
  const countLabel = document.getElementById('admissions-count-label');
  const searchInput = document.getElementById('admission-search-input');
  const cityFilter = document.getElementById('admission-city-filter');
  const boardFilter = document.getElementById('admission-board-filter');
  const classFilter = document.getElementById('admission-class-filter');
  const clearBtn = document.getElementById('btn-clear-filters');

  let searchQuery = '';
  let selectedCity = '';
  let selectedBoard = '';
  let selectedClassLevels = []; // Array to hold selected specific classes

  function getSchoolLogoInfo(schoolName) {
    const firstLetter = schoolName ? schoolName.replace(/^(The|St\.|St)\s+/i, '').charAt(0).toUpperCase() : 'S';
    let hash = 0;
    for (let i = 0; i < schoolName.length; i++) {
      hash = schoolName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash % 5) + 1;
    return {
      letter: firstLetter,
      colorClass: `bg-gradient-${idx}`
    };
  }

  function renderAdmissions() {
    if (!gridContainer) return;

    // Filter logic
    const filtered = admissions.filter(item => {
      const matchesSearch = item.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.board.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCity = !selectedCity || item.city === selectedCity;
      const matchesBoard = !selectedBoard || item.board === selectedBoard;
      
      let matchesClass = true;
      if (selectedClassLevels.length > 0) {
        matchesClass = item.classLevels.some(cl => selectedClassLevels.includes(cl));
      }

      return matchesSearch && matchesCity && matchesBoard && matchesClass;
    });

    // Clear grid
    gridContainer.innerHTML = '';

    // Update count label and clear button visibility on mobile
    const isMobile = window.innerWidth < 768;
    const isFilterActive = searchQuery !== '' || selectedCity !== '' || selectedBoard !== '' || selectedClassLevels.length > 0;

    if (clearBtn) {
      if (isMobile) {
        clearBtn.style.display = isFilterActive ? 'inline-block' : 'none';
      } else {
        clearBtn.style.display = 'inline-block';
      }
    }

    if (countLabel) {
      if (isMobile) {
        if (isFilterActive) {
          countLabel.style.display = 'inline-block';
          countLabel.textContent = `${filtered.length} cycle${filtered.length === 1 ? '' : 's'} found`;
        } else {
          countLabel.style.display = 'none';
        }
      } else {
        countLabel.style.display = 'inline-block';
        countLabel.textContent = `Showing ${filtered.length} admission cycle${filtered.length === 1 ? '' : 's'}`;
      }
    }

    if (filtered.length === 0) {
      gridContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
          <p style="font-size: 1.2rem; color: var(--text-muted);">No active admission cycles match your search filters.</p>
          <button class="btn btn-primary" id="btn-reset-admissions" style="margin-top: 16px; padding: 8px 20px; font-size: 0.9rem;">Reset Filters</button>
        </div>
      `;
      const resetBtn = document.getElementById('btn-reset-admissions');
      if (resetBtn) {
        resetBtn.addEventListener('click', resetAllFilters);
      }
      return;
    }

    // Populate Cards
    filtered.forEach(item => {
      const logoInfo = getSchoolLogoInfo(item.schoolName);
      const card = document.createElement('div');
      card.className = `admission-card-item status-${item.status}`;
      
      let boardText = `${item.board} Affiliated`;
      if (item.board === 'Not University Affiliated' || item.board.includes('Self')) {
        boardText = item.board;
      }

      card.innerHTML = `
        <!-- Desktop Layout (dt-only) -->
        <div class="admission-card-content dt-only">
          <h3 class="admission-card-school"><a href="school-profile.html?id=${item.schoolId}">${item.schoolName}</a></h3>
          
          <div class="admission-card-badges-row">
            <span class="badge badge-primary" style="margin-bottom: 0;">${boardText}</span>
            <span class="badge badge-accent" style="margin-bottom: 0; background-color: #F1F5F9; color: var(--text-muted);">${item.city}</span>
            <span class="badge ${item.status === 'closing' ? 'badge-accent' : 'badge-primary'}" style="margin-bottom: 0; font-size: 0.7rem; font-weight: 700;">
              Admissions ${item.status.toUpperCase()}
            </span>
          </div>

          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px; line-height: 1.5;">
            Online registrations are open for the academic session 2026 - 2027. Prospectus and entry syllabus can be requested.
          </p>

          <ul class="admission-detail-list">
            <li class="admission-detail-item">
              <span>Classes Open</span>
              <span>${item.classesOpen}</span>
            </li>
            <li class="admission-detail-item">
              <span>Registration Deadline</span>
              <span style="${item.status === 'closing' ? 'color: #EF4444; font-weight: 800;' : ''}">${item.lastDate}</span>
            </li>
          </ul>

          <div style="display: flex; gap: 12px; margin-top: auto;">
            <a href="school-profile.html?id=${item.schoolId}#admissions" class="btn btn-secondary" style="flex-grow: 1; padding: 10px 16px; font-size: 0.85rem; text-align: center;">View Details</a>
            <a href="apply-admission.html?school_id=${item.schoolId}" class="btn btn-primary btn-apply-action" style="flex-grow: 1; padding: 10px 16px; font-size: 0.85rem; text-align: center; text-decoration: none;">Apply Now</a>
          </div>
        </div>

        <!-- Mobile Layout (mobile-only) -->
        <div class="admission-mobile-card-content mobile-only">
          <div class="admission-card-banner-bg ${logoInfo.colorClass}"></div>
          <div class="admission-mobile-body">
            <div class="school-mobile-identity">
              <div class="school-mobile-logo-box ${logoInfo.colorClass}">${logoInfo.letter}</div>
              <div class="school-mobile-info">
                <h3 class="school-mobile-name"><a href="school-profile.html?id=${item.schoolId}">${item.schoolName}</a></h3>
                <div class="school-mobile-meta">
                  <span class="school-mobile-board">${item.board}</span>
                  <span class="school-mobile-bullet">•</span>
                  <span class="school-mobile-loc">${item.city}</span>
                  <span class="school-mobile-bullet">•</span>
                  <span class="admission-status-tag ${item.status}">${item.status.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div class="admission-mobile-details-list">
              <p class="admission-mobile-detail-item">🎓 <strong>Classes:</strong> ${item.classesOpen}</p>
              <p class="admission-mobile-detail-item">📅 <strong>Deadline:</strong> <span style="${item.status === 'closing' ? 'color: #EF4444; font-weight: 700;' : ''}">${item.lastDate}</span></p>
            </div>

            <div class="school-card-actions">
              <a href="school-profile.html?id=${item.schoolId}#contact" class="btn btn-secondary btn-contact-school-trigger">Contact School</a>
              <a href="apply-admission.html?school_id=${item.schoolId}" class="btn btn-primary btn-apply-action">View Admission</a>
            </div>
          </div>
        </div>
      `;
      gridContainer.appendChild(card);
    });
  }

  function resetAllFilters() {
    searchQuery = '';
    selectedCity = '';
    selectedBoard = '';
    selectedClassLevels = [];
    
    if (searchInput) searchInput.value = '';
    if (cityFilter) cityFilter.value = '';
    if (boardFilter) boardFilter.value = '';
    
    // Clear class checkbox filters
    const classCheckboxes = document.querySelectorAll('input[name="class_filter"]');
    classCheckboxes.forEach(cb => cb.checked = false);
    updateClassDropdownText();
    
    renderAdmissions();
  }

  // Filter Listeners
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderAdmissions();
    });
  }

  if (cityFilter) {
    cityFilter.addEventListener('change', (e) => {
      selectedCity = e.target.value;
      renderAdmissions();
    });
  }

  if (boardFilter) {
    boardFilter.addEventListener('change', (e) => {
      selectedBoard = e.target.value;
      renderAdmissions();
    });
  }

  // Custom Class Dropdown Filter Handling
  const classDropdownTrigger = document.getElementById('class-dropdown-trigger');
  const classDropdownPanel = document.getElementById('class-dropdown-panel');
  const clearClassBtn = document.getElementById('btn-clear-class-selection');
  const classCheckboxes = document.querySelectorAll('input[name="class_filter"]');

  function updateClassDropdownText() {
    if (!classDropdownTrigger) return;
    const triggerText = classDropdownTrigger.querySelector('span');
    if (!triggerText) return;

    const checkedCount = selectedClassLevels.length;
    if (checkedCount === 0) {
      triggerText.textContent = 'All Classes';
    } else if (checkedCount <= 2) {
      triggerText.textContent = selectedClassLevels.join(', ');
    } else {
      triggerText.textContent = `${checkedCount} Classes Selected`;
    }
  }

  if (classDropdownTrigger && classDropdownPanel) {
    classDropdownTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      classDropdownTrigger.classList.toggle('active');
      classDropdownPanel.classList.toggle('show');
    });

    classDropdownPanel.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    document.addEventListener('click', () => {
      classDropdownTrigger.classList.remove('active');
      classDropdownPanel.classList.remove('show');
    });
  }

  classCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        if (!selectedClassLevels.includes(cb.value)) {
          selectedClassLevels.push(cb.value);
        }
      } else {
        selectedClassLevels = selectedClassLevels.filter(val => val !== cb.value);
      }
      updateClassDropdownText();
      renderAdmissions();
    });
  });

  if (clearClassBtn) {
    clearClassBtn.addEventListener('click', () => {
      classCheckboxes.forEach(cb => cb.checked = false);
      selectedClassLevels = [];
      updateClassDropdownText();
      renderAdmissions();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', resetAllFilters);
  }

  // Init
  loadAdmissions();

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

      if (modalContextTitle.textContent.includes('Apply for:')) {
        successTitle.textContent = "Application Submitted!";
        successDesc.textContent = `Thank you, ${adminName}. Your preliminary enrollment query has been sent to the registrar at the school.`;
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmissions);
} else {
  initAdmissions();
}
