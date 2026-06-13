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
    { id: '1', name: "Delhi Public School, RK Puram", city: "New Delhi", board: "CBSE", logoLetter: "D", colorClass: "bg-gradient-1", eventsCount: 3, verificationBadge: 'blue' },
    { id: '2', name: "St. Xavier's High School", city: "Mumbai", board: "ICSE", logoLetter: "X", colorClass: "bg-gradient-2", eventsCount: 2, verificationBadge: 'blue' },
    { id: '3', name: "Bishop Cotton School", city: "Shimla", board: "ICSE", logoLetter: "B", colorClass: "bg-gradient-3", eventsCount: 1, verificationBadge: 'gold' },
    { id: '4', name: "St. Stephen's Academy", city: "Dehradun", board: "CBSE", logoLetter: "S", colorClass: "bg-gradient-4", eventsCount: 4, verificationBadge: 'none' },
    { id: '5', name: "The Heritage School", city: "Gurgaon", board: "IB", logoLetter: "H", colorClass: "bg-gradient-5", eventsCount: 2, verificationBadge: 'gold' },
    { id: '6', name: "Cathedral & John Connon School", city: "Mumbai", board: "IB", logoLetter: "C", colorClass: "bg-gradient-1", eventsCount: 1, verificationBadge: 'blue' },
    { id: '7', name: "Doon School", city: "Dehradun", board: "ICSE", logoLetter: "D", colorClass: "bg-gradient-2", eventsCount: 2, verificationBadge: 'gold' },
    { id: '8', name: "La Martiniere for Boys", city: "Kolkata", board: "ICSE", logoLetter: "L", colorClass: "bg-gradient-3", eventsCount: 1, verificationBadge: 'blue' }
  ];

  let schools = [];

  async function loadSchools() {
    const supabase = window.CampusLink && window.CampusLink.supabase;
    if (supabase) {
      try {
        // Only load approved schools publicly
        const { data, error } = await supabase.from('schools').select('*').eq('status', 'approved');
        if (error) throw error;
        if (data && data.length > 0) {
          schools = data.map(s => ({
            id: s.id,
            name: s.name,
            city: s.city || 'India',
            board: s.board || 'CBSE',
            logoLetter: s.logo_letter || s.name.charAt(0).toUpperCase(),
            colorClass: s.color_class || 'bg-gradient-1',
            eventsCount: s.events_count || 0,
            verificationBadge: s.verification_badge || 'none'
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
          <p style="font-size: 1.2rem; color: var(--text-muted); margin-bottom: 8px;">No verified partner schools match your search filters.</p>
          <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 20px;">Can't find your school? Suggest it to get it listed!</p>
          <div style="display: flex; gap: 12px; justify-content: center; align-items: center; flex-wrap: wrap;">
            <button class="btn btn-primary" id="btn-suggest-not-found" style="padding: 10px 24px; font-size: 0.9rem;">Suggest a School</button>
            <button class="btn btn-secondary" id="btn-reset-not-found" style="padding: 10px 24px; font-size: 0.9rem;">Reset Filters</button>
          </div>
        </div>
      `;
      const suggestBtnNotFound = document.getElementById('btn-suggest-not-found');
      if (suggestBtnNotFound) {
        suggestBtnNotFound.addEventListener('click', () => {
          openSuggestModal();
        });
      }
      const resetBtnNotFound = document.getElementById('btn-reset-not-found');
      if (resetBtnNotFound) {
        resetBtnNotFound.addEventListener('click', resetAllFilters);
      }
      return;
    }

    // Populate Cards
    filtered.forEach(school => {
      let badgeHtml = '';
      if (school.verificationBadge === 'blue') {
        badgeHtml = `
          <svg class="verified-badge verified-badge-md" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified School" style="margin-left:4px; display:inline-block; vertical-align:middle;">
            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
            <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
          </svg>`;
      } else if (school.verificationBadge === 'gold') {
        badgeHtml = `
          <svg class="verified-badge verified-badge-md gold" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Gold Partner School" style="margin-left:4px; display:inline-block; vertical-align:middle;">
            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
            <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
          </svg>`;
      }

      const card = document.createElement('div');
      card.className = 'school-card-item';
      card.innerHTML = `
        <div class="school-card-banner-bg ${school.colorClass}">
          <div class="school-logo-overlap">${school.logoLetter}</div>
        </div>
        <div class="school-card-content">
          <h3 class="school-card-name"><a href="school-profile.html?id=${school.id}">${school.name}</a>${badgeHtml}</h3>
          
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
            <button class="btn btn-secondary btn-contact-trigger" data-id="${school.id}" data-name="${school.name}" style="padding: 6px 12px; font-size: 0.75rem;">Contact</button>
          </div>
        </div>
      `;
      gridContainer.appendChild(card);
    });

    // Rebind newly created Contact buttons
    gridContainer.querySelectorAll('.btn-contact-trigger').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const schoolId = e.currentTarget.getAttribute('data-id');
        const schoolName = e.currentTarget.getAttribute('data-name');
        
        const auth = window.CampusLink && window.CampusLink.auth;
        if (!auth) return;
        
        const session = await auth.getSession();
        if (!session) {
          // Redirect to login if not logged in
          window.location.href = 'login.html';
          return;
        }

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(schoolId)) {
          alert(`Demo Mode: Contacting is only available for database-verified schools. "${schoolName}" is a demo fallback card.`);
          return;
        }

        openContactModal(schoolId, schoolName);
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

  // Suggest School buttons click event listeners
  const suggestBtnTop = document.getElementById('btn-suggest-school-top');
  if (suggestBtnTop) {
    suggestBtnTop.addEventListener('click', () => {
      openSuggestModal();
    });
  }

  const suggestBtnBanner = document.getElementById('btn-suggest-school-banner');
  if (suggestBtnBanner) {
    suggestBtnBanner.addEventListener('click', () => {
      openSuggestModal();
    });
  }

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
  /* --- Suggest School Modal Logic --- */
  const suggestModal = document.getElementById('suggest-school-modal');
  const suggestModalClose = document.getElementById('suggest-modal-close');
  const suggestForm = document.getElementById('suggest-school-form');
  const suggestSuccess = document.getElementById('suggest-success-screen');

  function openSuggestModal() {
    if (!suggestModal) return;
    suggestModal.classList.add('active');
    body.style.overflow = 'hidden';
    suggestForm.style.display = 'flex';
    suggestSuccess.style.display = 'none';
    suggestForm.reset();
  }

  function closeSuggestModal() {
    if (!suggestModal) return;
    suggestModal.classList.remove('active');
    body.style.overflow = 'auto';
  }

  if (suggestModalClose) {
    suggestModalClose.addEventListener('click', closeSuggestModal);
    suggestModal.addEventListener('click', (e) => {
      if (e.target === suggestModal) closeSuggestModal();
    });
  }

  if (suggestForm) {
    suggestForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('suggest-school-name').value.trim();
      const city = document.getElementById('suggest-school-city').value.trim();
      const board = document.getElementById('suggest-school-board').value;

      const submitBtn = document.getElementById('btn-submit-suggest');
      const btnText = submitBtn.querySelector('.btn-text');
      const btnLoader = submitBtn.querySelector('.btn-loader');

      if (btnText) btnText.style.display = 'none';
      if (btnLoader) btnLoader.style.display = 'inline-flex';
      submitBtn.disabled = true;

      const supabase = window.CampusLink && window.CampusLink.supabase;
      const auth = window.CampusLink && window.CampusLink.auth;

      let userId = null;
      if (auth) {
        const session = await auth.getSession();
        userId = session?.user?.id || null;
      }

      try {
        if (supabase) {
          const { error } = await supabase
            .from('school_suggestions')
            .insert({
              name,
              city,
              board: board || null,
              suggested_by: userId
            });

          if (error) throw error;
        }

        // Show success screen
        suggestForm.style.display = 'none';
        suggestSuccess.style.display = 'flex';

        setTimeout(() => {
          closeSuggestModal();
        }, 3000);
      } catch (err) {
        console.error('Failed to submit school suggestion:', err);
        let errorMsg = err.message;
        if (err.code === 'PGRST205' || (err.message && err.message.includes('schema cache'))) {
          errorMsg = "The 'school_suggestions' table does not exist in your database yet. Please run the SQL migration statements in 'supabase_schema.sql' in your Supabase SQL Editor.";
        }
        alert('Failed to submit suggestion: ' + errorMsg);
      } finally {
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
        submitBtn.disabled = false;
      }
    });
  }

  // --- Contact School Modal Implementation ---
  const contactModal = document.getElementById('contact-school-modal');
  const contactClose = document.getElementById('contact-modal-close');
  const contactForm = document.getElementById('contact-school-form');
  
  function openContactModal(schoolId, schoolName) {
    if (!contactModal) return;
    document.getElementById('contact-school-id').value = schoolId;
    document.getElementById('contact-modal-school-title').textContent = `Contact ${schoolName}`;
    contactModal.classList.add('active');
    body.style.overflow = 'hidden';
  }

  function closeContactModal() {
    if (!contactModal) return;
    contactModal.classList.remove('active');
    body.style.overflow = 'auto';
    contactForm.reset();
  }

  if (contactClose) {
    contactClose.addEventListener('click', closeContactModal);
    contactModal.addEventListener('click', (e) => {
      if (e.target === contactModal) closeContactModal();
    });
  }

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const auth = window.CampusLink && window.CampusLink.auth;
      const supabase = window.CampusLink && window.CampusLink.supabase;
      if (!auth || !supabase) return;

      const session = await auth.getSession();
      const currentUser = session?.user;
      if (!currentUser) {
        window.location.href = 'login.html';
        return;
      }

      const schoolId = document.getElementById('contact-school-id').value;
      const inquiryType = document.getElementById('contact-inquiry-type').value;
      const messageText = document.getElementById('contact-message').value.trim();

      if (!schoolId || !inquiryType || !messageText) return;

      const submitBtn = document.getElementById('btn-submit-contact');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending Inquiry...';

      try {
        // Fetch school details (like admin_user_id)
        const { data: dbSchool, error: schoolErr } = await supabase
          .from('schools')
          .select('admin_user_id')
          .eq('id', schoolId)
          .maybeSingle();

        if (schoolErr) throw schoolErr;

        // 1. Create conversation
        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .insert({
            status: 'accepted',
            initiator_id: currentUser.id,
            school_id: schoolId,
            inquiry_type: inquiryType
          })
          .select()
          .single();

        if (convError) throw convError;

        // 2. Add participants: the initiator user and the school
        const { error: partError } = await supabase
          .from('conversation_participants')
          .insert([
            { conversation_id: conv.id, user_id: currentUser.id },
            { conversation_id: conv.id, school_id: schoolId }
          ]);

        if (partError) throw partError;

        // 3. Send message
        const { error: msgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conv.id,
            sender_id: currentUser.id,
            receiver_school_id: schoolId,
            message: `[Inquiry: ${inquiryType.toUpperCase()}] ${messageText}`,
            read_status: false
          });

        if (msgError) throw msgError;

        console.log('Message created successfully (Schools List Inquiry):', {
          conversation_id: conv.id,
          sender_id: currentUser.id,
          receiver_school_id: schoolId,
          message: `[Inquiry: ${inquiryType.toUpperCase()}] ${messageText}`
        });

        // 4. Trigger notification to school representative / admin
        if (window.CampusLink && window.CampusLink.notifications) {
          try {
            const recipientId = dbSchool?.admin_user_id;
            if (recipientId) {
              // Fetch current user name
              const { data: senderProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', currentUser.id)
                .single();
              const senderName = senderProfile?.full_name || 'Someone';

              await window.CampusLink.notifications.createNotification(
                recipientId,
                'message',
                `New message from ${senderName}`,
                `[Inquiry: ${inquiryType.toUpperCase()}] ${messageText}`.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
                `messaging.html?chat_id=${conv.id}`,
                currentUser.id
              );
            }
          } catch (notifErr) {
            console.warn('Error sending contact school notification:', notifErr);
          }
        }

        closeContactModal();
        alert('Inquiry sent successfully!');
        document.getElementById('contact-message').value = '';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message Request';
      } catch (err) {
        console.error('Failed to send inquiry:', err);
        alert('Failed to send inquiry: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message Request';
      }
    });
  }

  // Make openSuggestModal globally accessible
  window.openSuggestModal = openSuggestModal;
});
