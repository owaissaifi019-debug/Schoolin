-document.addEventListener('DOMContentLoaded', () => {

  // Update navigation based on auth state
  if (window.CampusLink && window.CampusLink.auth) {
    window.CampusLink.auth.updateNavAuthState();
  }

  // --- Reusable Toast Alert helper ---
  function showToast(message, type = 'success') {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast-alert toast-alert-${type}`;
    
    let icon = '✓';
    if (type === 'info') icon = 'ℹ';
    if (type === 'error') icon = '⚠';

    toast.innerHTML = `
      <span style="font-weight:700; font-size:1.1rem; margin-right:8px;">${icon}</span>
      <div>${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('show');
    }, 50);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 400);
    }, 3500);
  }

  // --- Caret Position Helper for Autocomplete Placement ---
  function getCaretCoordinates(element, position) {
    const isTextarea = element.tagName === 'TEXTAREA';
    const div = document.createElement('div');
    const style = window.getComputedStyle(element);
    
    const properties = [
      'direction', 'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
      'borderWidth', 'borderStyle', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant', 'lineHeight',
      'textTransform', 'wordSpacing', 'letterSpacing', 'textIndent', 'textRendering'
    ];
    
    properties.forEach(prop => {
      div.style[prop] = style[prop];
    });
    
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.width = element.offsetWidth + 'px';
    
    const text = element.value.substring(0, position);
    div.textContent = text;
    
    if (!isTextarea) {
      div.style.whiteSpace = 'pre';
    }
    
    const span = document.createElement('span');
    span.textContent = element.value.substring(position) || '.';
    div.appendChild(span);
    
    document.body.appendChild(div);
    
    const rect = element.getBoundingClientRect();
    const spanOffset = span.getBoundingClientRect();
    const divOffset = div.getBoundingClientRect();
    
    document.body.removeChild(div);
    
    return {
      top: rect.top + window.scrollY + (spanOffset.top - divOffset.top),
      left: rect.left + window.scrollX + (spanOffset.left - divOffset.left)
    };
  }

  // --- MentionAutocomplete Class ---
  class MentionAutocomplete {
    constructor(inputElement, onSelect) {
      this.element = inputElement;
      this.onSelect = onSelect;
      this.active = false;
      this.triggerIndex = -1;
      this.dropdown = null;
      this.results = [];
      this.selectedIndex = 0;
      this.debounceTimeout = null;
      
      this.element.addEventListener('input', this.handleInput.bind(this));
      this.element.addEventListener('keydown', this.handleKeyDown.bind(this));
      this.element.addEventListener('click', this.handleClick.bind(this));
      
      document.addEventListener('click', (e) => {
        if (this.dropdown && !this.dropdown.contains(e.target) && e.target !== this.element) {
          this.close();
        }
      });
      console.log('[Mentions] Initialized');
    }

    handleInput(e) {
      const value = this.element.value;
      const caretPos = this.element.selectionStart;
      
      if (!this.active) {
        const textBeforeCaret = value.substring(0, caretPos);
        const lastAt = textBeforeCaret.lastIndexOf('@');
        if (lastAt !== -1 && (lastAt === 0 || /\s/.test(textBeforeCaret.charAt(lastAt - 1)))) {
          this.active = true;
          this.triggerIndex = lastAt;
          console.log('[Mentions] @ detected');
        }
      }

      if (this.active) {
        const query = value.substring(this.triggerIndex + 1, caretPos);
        if (caretPos <= this.triggerIndex || query.includes('\n')) {
          this.close();
          return;
        }
        this.debounceSearch(query);
      }
    }

    debounceSearch(query) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = setTimeout(() => {
        this.search(query);
      }, 200);
    }

    async search(query) {
      if (!this.active) return;
      console.log('[Mentions] Query:', query);
      
      try {
        let pq = supabase
          .from('profiles')
          .select('id, full_name, avatar_url, user_type, platform_role, is_verified')
          .or('user_type.eq.student,user_type.eq.school_representative,platform_role.eq.super_admin');
        let sq = supabase
          .from('schools')
          .select('id, name, logo_url, logo_letter, color_class, verification_badge');

        if (query) {
          pq = pq.ilike('full_name', `%${query}%`);
          sq = sq.ilike('name', `%${query}%`);
        }

        const [pRes, sRes] = await Promise.all([
          pq.limit(8),
          sq.limit(8)
        ]);
        const profiles = pRes.data;
        const schools = sRes.data;
        const pErr = pRes.error;
        const sErr = sRes.error;

        if (pErr) console.warn('Profiles query error:', pErr);
        if (sErr) console.warn('Schools query error:', sErr);

        let merged = [];
        
        if (profiles) {
          profiles.forEach(p => {
            let typeLabel = 'Student';
            if (p.user_type === 'school_representative') typeLabel = 'School Rep';
            if (p.platform_role === 'super_admin') typeLabel = 'Super Admin';
            
            merged.push({
              id: p.id,
              name: p.full_name,
              avatar_url: p.avatar_url,
              type: 'user',
              typeLabel: typeLabel,
              is_verified: p.is_verified
            });
          });
        }

        if (schools) {
          schools.forEach(s => {
            merged.push({
              id: s.id,
              name: s.name,
              avatar_url: s.logo_url,
              logo_letter: s.logo_letter,
              color_class: s.color_class,
              type: 'school',
              typeLabel: 'School',
              is_verified: s.verification_badge !== 'none',
              verification_badge: s.verification_badge
            });
          });
        }

        const q = query.toLowerCase();
        merged.sort((a, b) => {
          const aName = a.name.toLowerCase();
          const bName = b.name.toLowerCase();
          const aStarts = aName.startsWith(q);
          const bStarts = bName.startsWith(q);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return aName.localeCompare(bName);
        });

        this.results = merged.slice(0, 8);
        this.selectedIndex = 0;
        console.log('[Mentions] Results:', this.results.length);

        if (this.results.length > 0) {
          this.showDropdown();
        } else {
          this.closeDropdownOnly();
        }
      } catch (err) {
        console.error('Mention search error:', err);
      }
    }

    showDropdown() {
      if (!this.dropdown) {
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'mention-dropdown';
        Object.assign(this.dropdown.style, {
          position: 'absolute',
          zIndex: '10000',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-color, #e0e0e0)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          width: '260px',
          maxHeight: '240px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        });
        document.body.appendChild(this.dropdown);
      }

      const caretPos = getCaretCoordinates(this.element, this.triggerIndex);
      
      let dropdownTop = caretPos.top + 20;
      let dropdownLeft = caretPos.left;

      const dropdownHeight = 240;
      const dropdownWidth = 260;
      
      const viewportHeight = window.innerHeight;
      const scrollY = window.scrollY;
      
      if (dropdownTop + dropdownHeight > viewportHeight + scrollY && caretPos.top - scrollY > dropdownHeight + 20) {
        dropdownTop = caretPos.top - dropdownHeight - 5;
      }

      if (dropdownLeft + dropdownWidth > window.innerWidth) {
        dropdownLeft = Math.max(10, window.innerWidth - dropdownWidth - 20);
      }
      
      this.dropdown.style.top = `${dropdownTop}px`;
      this.dropdown.style.left = `${dropdownLeft}px`;

      this.dropdown.innerHTML = '';
      this.results.forEach((item, index) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'mention-dropdown-item';
        
        Object.assign(itemEl.style, {
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 12px',
          cursor: 'pointer',
          borderBottom: index === this.results.length - 1 ? 'none' : '1px solid #f0f0f0',
          backgroundColor: index === this.selectedIndex ? '#e8effe' : 'transparent',
          transition: 'background-color 0.15s ease'
        });

        itemEl.addEventListener('mouseenter', () => {
          this.setSelectedIndex(index);
        });

        itemEl.addEventListener('click', () => {
          this.selectItem(item);
        });

        let avatarHtml = '';
        if (item.type === 'school') {
          const initials = item.logo_letter || item.name.charAt(0).toUpperCase();
          avatarHtml = item.avatar_url
            ? `<img src="${item.avatar_url}" style="width: 32px; height: 32px; border-radius: 4px; object-fit: cover;">`
            : `<div class="${item.color_class || 'bg-gradient-1'}" style="width: 32px; height: 32px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 0.85rem;">${initials}</div>`;
        } else {
          const initials = getInitials(item.name);
          avatarHtml = item.avatar_url
            ? `<img src="${item.avatar_url}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">`
            : `<div style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background-color: #0066c8; color: white; font-weight: 700; font-size: 0.85rem;">${initials}</div>`;
        }

        let badgeHtml = '';
        if (item.is_verified) {
          const color = item.verification_badge === 'gold' ? '#d4af37' : '#0066c8';
          badgeHtml = `
            <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 14px; height: 14px; color: ${color}; fill: currentColor; margin-left: 4px; display: inline-block; vertical-align: middle;">
              <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z"/>
              <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
            </svg>
          `;
        }

        itemEl.innerHTML = `
          ${avatarHtml}
          <div style="display: flex; flex-direction: column; flex-grow: 1; min-width: 0;">
            <div style="font-weight: 700; font-size: 0.85rem; color: #333; display: flex; align-items: center;">
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${item.name}</span>
              ${badgeHtml}
            </div>
            <div style="font-size: 0.72rem; color: #777;">${item.typeLabel}</div>
          </div>
        `;
        this.dropdown.appendChild(itemEl);
      });
    }

    setSelectedIndex(index) {
      this.selectedIndex = index;
      if (this.dropdown) {
        Array.from(this.dropdown.children).forEach((child, idx) => {
          child.style.backgroundColor = idx === index ? '#e8effe' : 'transparent';
        });
      }
    }

    selectItem(item) {
      console.log(`[Mentions] Selected: ${item.name} (${item.id})`);
      const value = this.element.value;
      const caretPos = this.element.selectionStart;
      
      const before = value.substring(0, this.triggerIndex);
      const after = value.substring(caretPos);
      const mentionText = `@${item.name} `;
      
      this.element.value = before + mentionText + after;
      
      const newCaret = before.length + mentionText.length;
      this.element.setSelectionRange(newCaret, newCaret);
      
      this.element.focus();
      
      this.onSelect(item);
      this.close();
    }

    handleKeyDown(e) {
      if (!this.active || !this.dropdown || this.results.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.setSelectedIndex((this.selectedIndex + 1) % this.results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.setSelectedIndex((this.selectedIndex - 1 + this.results.length) % this.results.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.selectItem(this.results[this.selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    }

    handleClick() {
      if (this.active) {
        const caretPos = this.element.selectionStart;
        if (caretPos <= this.triggerIndex || caretPos > this.element.value.length) {
          this.close();
        }
      }
    }

    closeDropdownOnly() {
      if (this.dropdown) {
        this.dropdown.remove();
        this.dropdown = null;
      }
    }

    close() {
      this.active = false;
      this.triggerIndex = -1;
      this.closeDropdownOnly();
      this.results = [];
      this.selectedIndex = 0;
    }
  }

  // --- Format Content with Clickable Mention Links ---
  function formatContentWithMentions(content, mentions) {
    if (!content) return '';
    const escape = window.CampusLink?.security?.escapeHTML || (s => s);
    let formatted = escape(content);
    if (!mentions || mentions.length === 0) return formatted;

    const sortedMentions = [...mentions].sort((a, b) => {
      const nameA = a.profiles?.full_name || a.schools?.name || '';
      const nameB = b.profiles?.full_name || b.schools?.name || '';
      return nameB.length - nameA.length;
    });

    sortedMentions.forEach(mention => {
      const name = mention.profiles?.full_name || mention.schools?.name;
      if (!name) return;

      const escapedName = escape(name);
      const url = mention.mentioned_user_id 
        ? `profile.html?id=${mention.mentioned_user_id}` 
        : `school-profile.html?id=${mention.mentioned_school_id}`;

      const rawMentionText = `@${name}`;
      const escapedMentionText = escape(rawMentionText).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedMentionText, 'g');
      formatted = formatted.replace(regex, `<a href="${url}" class="mention-link" style="color: #0066c8; font-weight: 700; text-decoration: none;">@${escapedName}</a>`);
    });

    return formatted;
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

  // Close mobile nav and toggle active class when clicking a link
  const navAnchors = document.querySelectorAll('.nav-links a, .header-nav a');
  navAnchors.forEach(anchor => {
    anchor.addEventListener('click', () => {
      if (navLinks) {
        navLinks.classList.remove('active');
      }
      body.classList.remove('mobile-nav-active');
      
      navAnchors.forEach(a => a.classList.remove('active'));
      anchor.classList.add('active');
    });
  });

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
        // Fetch approved schools first to filter public opportunities
        const { data: approvedSchools, error: schoolsError } = await supabase
          .from('schools')
          .select('id')
          .eq('status', 'approved');

        if (schoolsError) throw schoolsError;
        const approvedSchoolIds = new Set((approvedSchools || []).map(s => s.id));

        const { data: dbEvents, error: eventsError } = await supabase.from('events').select('*');
        const { data: dbAdmissions, error: admissionsError } = await supabase.from('admissions').select('*');
        if (eventsError) throw eventsError;
        if (admissionsError) throw admissionsError;

        let combined = [];

        if (dbEvents) {
          dbEvents.forEach(e => {
            // Only include event if its school is approved
            if (!approvedSchoolIds.has(e.school_id)) return;

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
            // Only include admission if its school is approved
            if (!approvedSchoolIds.has(a.school_id)) return;

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

  /* --- LinkedIn-Style Social Feed System --- */
  const supabase = window.CampusLink?.supabase;
  const auth = window.CampusLink?.auth;

  let currentUser = null;
  let currentUserProfile = null;
  let activeFeedFilter = 'all';
  let activeTopicFilter = 'all';
  let userFollows = { users: new Set(), schools: new Set() };

  // Relative time helper
  function formatRelativeTime(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  // Initials helper
  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  // Topic details helper (returns null for general)
  function getTopicDisplay(topic) {
    const displays = {
      achievement: { label: 'Achievement', icon: '🏆', class: 'type-achievement' },
      competition_win: { label: 'Competition Win', icon: '🥇', class: 'type-win' },
      project: { label: 'Project', icon: '💻', class: 'type-project' },
      event: { label: 'Event', icon: '📅', class: 'type-event' }
    };
    return displays[topic] || null;
  }

  // Initialise Social Feed elements and load data
  async function initSocialFeed() {
    if (!supabase || !auth) return;

    // Get current user session
    currentUser = await auth.getUser();
    if (currentUser) {
      // Fetch profile with full school details
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, schools(*)')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (!error && profile) {
        currentUserProfile = profile;
      }
    }

    // Load follows list
    await loadFollows();

    // Render components
    renderUserSidebar();
    renderShareBox();
    loadTrendingEventsWidget();
    loadFeaturedSchoolsWidget();
    setupFeedFilterTabs();
    setupTopicFilters();
    loadFeed();

    // Setup Create Post Form Submit
    initCreatePostForm();
  }

  // Setup topic filter pills listeners
  function setupTopicFilters() {
    const container = document.getElementById('topic-filter-container');
    if (!container) return;

    const pills = container.querySelectorAll('.topic-filter-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeTopicFilter = pill.getAttribute('data-topic');
        loadFeed();
      });
    });
  }

  // Load user follow details
  async function loadFollows() {
    if (!supabase || !currentUser) return;
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id, following_school_id, follow_type')
        .eq('follower_id', currentUser.id);

      if (error) {
        console.warn('Error loading follows for feed:', error.message);
        return;
      }
      
      userFollows.users = new Set();
      userFollows.schools = new Set();
      (data || []).forEach(f => {
        if (f.follow_type === 'user' && f.following_id) {
          userFollows.users.add(f.following_id);
        } else if (f.follow_type === 'school' && f.following_school_id) {
          userFollows.schools.add(f.following_school_id);
        }
      });
    } catch (err) {
      console.warn('Error loading follows:', err);
    }
  }

  // Setup feed filter tabs listeners
  function setupFeedFilterTabs() {
    const tabContainer = document.getElementById('feed-filter-tabs');
    if (!tabContainer) return;

    const tabs = tabContainer.querySelectorAll('.feed-filter-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', async (e) => {
        tabs.forEach(t => {
          t.classList.remove('active');
          t.style.color = 'var(--text-muted)';
          t.style.borderBottomColor = 'transparent';
          t.style.fontWeight = '500';
        });

        tab.classList.add('active');
        tab.style.color = 'var(--primary)';
        tab.style.borderBottomColor = 'var(--primary)';
        tab.style.fontWeight = '600';

        activeFeedFilter = tab.getAttribute('data-filter');
        
        // Reload follows and refresh the feed
        await loadFollows();
        loadFeed();
      });
    });
  }

  // Render Left Sidebar Card
  function renderUserSidebar() {
    const sidebarContainer = document.getElementById('user-sidebar-card');
    if (!sidebarContainer) return;

    if (currentUser && currentUserProfile) {
      const p = currentUserProfile;
      const displayName = p.full_name || currentUser.email;
      
      const isSchoolUser = (p.user_type === 'school_representative' || p.platform_role === 'school_admin') && p.school_id;

      if (isSchoolUser && p.schools) {
        const s = p.schools;
        const schoolName = s.name || 'My School';
        const board = s.board || 'CBSE';
        const city = s.city || '';
        const colorClass = s.color_class || 'color-1';
        const profileUrl = `school-profile.html?id=${p.school_id}`;
        
        let logoHtml;
        if (s.logo_url) {
          logoHtml = `<img src="${s.logo_url}" alt="${schoolName}" class="feed-user-avatar">`;
        } else {
          const letter = s.logo_letter || schoolName.charAt(0).toUpperCase();
          logoHtml = `<div class="feed-user-avatar-placeholder">${letter}</div>`;
        }
        let badgeHtml = '';
        let badgeColorStyle = '';
        if (s.verification_badge === 'gold') {
          badgeHtml = `
            <svg class="verified-badge verified-badge-md gold" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Gold Partner School" style="display:inline-block; vertical-align:middle; margin-left:4px;">
              <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
              <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
            </svg>`;
          badgeColorStyle = 'background-color: #FEF3C7; color: #D97706; border: 1.5px solid #FCD34D;';
        } else if (s.verification_badge === 'blue') {
          badgeHtml = `
            <svg class="verified-badge verified-badge-md" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified School" style="display:inline-block; vertical-align:middle; margin-left:4px;">
              <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
              <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
            </svg>`;
        }
        
        sidebarContainer.innerHTML = `
          <div class="feed-sidebar-card profile-sidebar-card">
            <div class="profile-card-cover ${colorClass}"></div>
            <div class="profile-card-info">
              <a href="${profileUrl}" class="profile-card-avatar-link">
                ${logoHtml}
              </a>
              <h3 class="profile-card-name">
                <a href="${profileUrl}">${schoolName}${badgeHtml}</a>
              </h3>
              <span class="profile-card-badge school_representative" style="${badgeColorStyle}">Verified School</span>
              <p class="profile-card-headline">${board} Affiliated ${city ? `• ${city}` : ''}</p>
              <p class="profile-card-school" style="font-size: 0.75rem; font-weight: 500; color: var(--text-muted); margin-top: 4px;">
                👤 Admin: ${displayName}
              </p>
            </div>
            <div class="profile-card-footer">
              <a href="${profileUrl}" class="btn-profile-view">View School Profile</a>
            </div>
          </div>
          
          <div class="feed-sidebar-card shortcuts-sidebar-card">
            <h4>Quick Links</h4>
            <ul class="shortcuts-list">
              <li><a href="schools.html">🏫 Schools Directory</a></li>
              <li><a href="events.html">📅 Inter-School Events</a></li>
              <li><a href="admissions.html">🎓 Admissions Updates</a></li>
            </ul>
          </div>
        `;
      } else {
        const initial = displayName.charAt(0).toUpperCase();
        const verifiedBadge = p.is_verified ? `
          <svg class="verified-badge verified-badge-md" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Profile">
            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
            <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
          </svg>
        ` : '';
        const avatarHtml = p.avatar_url 
          ? `<img src="${p.avatar_url}" alt="${displayName}" class="feed-user-avatar">`
          : `<div class="feed-user-avatar-placeholder">${initial}</div>`;
        
        let headline = auth.getUserTypeLabel(p.user_type);
        if (p.user_type === 'student' && p.class) {
          headline += ` • Class ${p.class}`;
        }
        
        const schoolName = p.schools?.name || '';
        let profileUrl = `profile.html?id=${p.id}`;
        if ((p.user_type === 'school_representative' || p.platform_role === 'school_admin') && p.school_id) {
          profileUrl = `school-profile.html?id=${p.school_id}`;
        }

        sidebarContainer.innerHTML = `
          <div class="feed-sidebar-card profile-sidebar-card">
            <div class="profile-card-cover"></div>
            <div class="profile-card-info">
              <a href="${profileUrl}" class="profile-card-avatar-link">
                ${avatarHtml}
              </a>
              <h3 class="profile-card-name">
                <a href="${profileUrl}">${displayName}${verifiedBadge}</a>
              </h3>
              <span class="profile-card-badge ${p.user_type}">${auth.getUserTypeLabel(p.user_type)}</span>
              <p class="profile-card-headline">${headline}</p>
              ${schoolName ? `<p class="profile-card-school">🏫 ${schoolName}</p>` : ''}
            </div>
            <div class="profile-card-footer">
              <a href="${profileUrl}" class="btn-profile-view">View Profile</a>
            </div>
          </div>
          
          <div class="feed-sidebar-card shortcuts-sidebar-card">
            <h4>Quick Links</h4>
            <ul class="shortcuts-list">
              <li><a href="schools.html">🏫 Schools Directory</a></li>
              <li><a href="events.html">📅 Inter-School Events</a></li>
              <li><a href="admissions.html">🎓 Admissions Updates</a></li>
            </ul>
          </div>
        `;
      }
    } else {
      // Guest View
      sidebarContainer.innerHTML = `
        <div class="feed-sidebar-card shortcuts-sidebar-card">
          <h4>Quick Links</h4>
          <ul class="shortcuts-list">
            <li><a href="schools.html">🏫 Schools Directory</a></li>
            <li><a href="events.html">📅 Inter-School Events</a></li>
            <li><a href="admissions.html">🎓 Admissions Updates</a></li>
          </ul>
        </div>
      `;
    }
  }

  // Render Share Box
  function renderShareBox() {
    const shareBoxContainer = document.getElementById('share-box-container');
    if (!shareBoxContainer) return;

    if (currentUser && currentUserProfile) {
      const p = currentUserProfile;
      const displayName = p.full_name || currentUser.email;
      const initial = displayName.charAt(0).toUpperCase();
      const avatarHtml = p.avatar_url 
        ? `<img src="${p.avatar_url}" alt="${displayName}" class="share-box-avatar">`
        : `<div class="share-box-avatar-placeholder">${initial}</div>`;

      shareBoxContainer.innerHTML = `
        <div class="create-post-box">
          <div class="create-post-input-row">
            ${avatarHtml}
            <button id="trigger-create-post" class="btn-start-post">Start a post...</button>
          </div>
          <div class="create-post-actions-row">
            <button class="btn-share-action" data-type="achievement">
              <span class="action-icon">🏆</span>
              <span class="action-text">Achievement</span>
            </button>
            <button class="btn-share-action" data-type="project">
              <span class="action-icon">🚀</span>
              <span class="action-text">Project</span>
            </button>
            <button class="btn-share-action" data-type="event">
              <span class="action-icon">📢</span>
              <span class="action-text">Event</span>
            </button>
            <button class="btn-share-action" data-type="event">
              <span class="action-icon">🎓</span>
              <span class="action-text">Admission</span>
            </button>
            <button class="btn-share-action" data-type="project">
              <span class="action-icon">💼</span>
              <span class="action-text">Internship</span>
            </button>
          </div>
        </div>
      `;

      // Bind trigger click
      document.getElementById('trigger-create-post').addEventListener('click', () => {
        openCreatePostModal();
      });

      // Bind quick action clicks
      document.querySelectorAll('.btn-share-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const type = e.currentTarget.getAttribute('data-type');
          openCreatePostModal(type);
        });
      });
    } else {
      // Guest Share Box
      shareBoxContainer.innerHTML = `
        <div class="create-post-box guest-share-box">
          <div class="guest-share-inner">
            <span class="guest-share-emoji">🔑</span>
            <p>Log in to share achievements, competition wins, or upcoming events with CampusLink.</p>
            <a href="login.html" class="btn btn-primary" style="padding: 8px 20px; font-size: 0.85rem;">Sign In</a>
          </div>
        </div>
      `;
    }
  }

  // Create Post Modal Controls
  const createPostModal = document.getElementById('create-post-modal');
  const createPostForm = document.getElementById('create-post-form');
  const postTopicSelect = document.getElementById('post-topic-select');
  const postContentTextarea = document.getElementById('post-content-textarea');
  if (postContentTextarea) {
    new MentionAutocomplete(postContentTextarea, (item) => {
      postContentTextarea.selectedMentions = postContentTextarea.selectedMentions || [];
      postContentTextarea.selectedMentions.push(item);
    });
  }

  function openCreatePostModal(topic = 'achievement') {
    if (!createPostModal) return;
    
    // Reset mode back to create
    const activeForm = document.getElementById('create-post-form');
    if (activeForm) {
      activeForm.removeAttribute('data-mode');
      activeForm.removeAttribute('data-post-id');
      const titleEl = createPostModal.querySelector('.modal-title h3');
      const descEl = createPostModal.querySelector('.modal-title p');
      const submitBtn = createPostModal.querySelector('#post-submit-btn');
      if (titleEl) titleEl.textContent = 'Create a Post';
      if (descEl) descEl.textContent = 'Share achievements, competition wins, projects, or school events with the network.';
      if (submitBtn) {
        submitBtn.textContent = 'Post';
        submitBtn.disabled = false;
      }
    }
    
    if (postTopicSelect) {
      postTopicSelect.value = topic;
    }
    if (postContentTextarea) {
      postContentTextarea.value = '';
    }

    // Dynamic Post As dropdown configuration based on user roles
    const postAsGroup = document.getElementById('post-as-group');
    const postAsSelect = document.getElementById('post-as-select');
    
    if (postAsGroup && postAsSelect && currentUserProfile) {
      const p = currentUserProfile;
      const role = p.platform_role;
      const type = p.user_type;
      
      if (role === 'super_admin') {
        postAsGroup.style.display = 'block';
        postAsSelect.innerHTML = `
          <option value="personal">👤 Personal Post (as Admin)</option>
          <option value="school">🏫 Official School Account</option>
        `;
        postAsSelect.value = 'personal';
      } else if (type === 'school_representative' && role === 'user') {
        postAsGroup.style.display = 'block';
        postAsSelect.innerHTML = `
          <option value="personal">👤 School Representative</option>
          <option value="school">🏫 Official School Account</option>
        `;
        postAsSelect.value = 'personal';
      } else if (role === 'school_admin') {
        postAsGroup.style.display = 'none';
        postAsSelect.innerHTML = `
          <option value="school">🏫 Official School Account</option>
        `;
        postAsSelect.value = 'school';
      } else {
        postAsGroup.style.display = 'none';
        postAsSelect.innerHTML = `
          <option value="personal">👤 Personal Post</option>
        `;
        postAsSelect.value = 'personal';
      }
    } else if (postAsGroup) {
      postAsGroup.style.display = 'none';
    }

    createPostModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeCreatePostModal() {
    if (!createPostModal) return;
    createPostModal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }

  // Bind modal close buttons
  const postModalClose = document.getElementById('post-modal-close');
  const postModalCancel = document.getElementById('post-modal-cancel');
  if (postModalClose) postModalClose.addEventListener('click', closeCreatePostModal);
  if (postModalCancel) postModalCancel.addEventListener('click', closeCreatePostModal);
  if (createPostModal) {
    createPostModal.addEventListener('click', (e) => {
      if (e.target === createPostModal) closeCreatePostModal();
    });
  }

  // --- Report Post Modal Controls ---
  const reportPostModal = document.getElementById('report-post-modal');
  const reportPostForm = document.getElementById('report-post-form');
  const reportReasonSelect = document.getElementById('report-reason-select');
  const reportDetailsGroup = document.getElementById('report-details-group');

  function closeReportPostModal() {
    if (!reportPostModal) return;
    reportPostModal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }

  const reportModalClose = document.getElementById('report-modal-close');
  const reportModalCancel = document.getElementById('report-modal-cancel');
  if (reportModalClose) reportModalClose.addEventListener('click', closeReportPostModal);
  if (reportModalCancel) reportModalCancel.addEventListener('click', closeReportPostModal);
  if (reportPostModal) {
    reportPostModal.addEventListener('click', (e) => {
      if (e.target === reportPostModal) closeReportPostModal();
    });
  }

  if (reportReasonSelect && reportDetailsGroup) {
    reportReasonSelect.addEventListener('change', () => {
      if (reportReasonSelect.value === 'Other') {
        reportDetailsGroup.style.display = 'block';
      } else {
        reportDetailsGroup.style.display = 'none';
      }
    });
  }

  if (reportPostForm) {
    reportPostForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!currentUser) {
        alert('You must be logged in to report posts.');
        return;
      }

      const postId = reportPostForm.getAttribute('data-post-id');
      const postContent = reportPostForm.getAttribute('data-post-content');
      const authorId = reportPostForm.getAttribute('data-post-author-id');
      const reason = reportPostForm.querySelector('#report-reason-select').value;
      const details = reportPostForm.querySelector('#report-details-textarea').value.trim();
      const submitBtn = reportPostForm.querySelector('#report-submit-btn');

      if (!reason) return;

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Reporting...';
        }

        const { error } = await supabase
          .from('post_reports')
          .insert({
            post_id: postId,
            reporter_id: currentUser.id,
            reason: reason,
            post_content: postContent,
            post_author_id: authorId || null,
            details: details || null
          });

        if (error) throw error;

        closeReportPostModal();
        showToast('Thank you for your report. Administrators will review it shortly.', 'success');
      } catch (err) {
        console.error('Error reporting post:', err);
        alert('Failed to report post: ' + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Report';
        }
      }
    });
  }

  // --- Share Post Modal Controls ---
  const sharePostModal = document.getElementById('share-post-modal');
  let activeSharePostId = null;
  let activeShareUrl = '';

  function openShareModal(postId, shareUrl) {
    if (!sharePostModal) return;
    activeSharePostId = postId;
    activeShareUrl = shareUrl;
    sharePostModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSharePostModal() {
    if (!sharePostModal) return;
    sharePostModal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }

  const shareModalClose = document.getElementById('share-modal-close');
  if (shareModalClose) shareModalClose.addEventListener('click', closeSharePostModal);
  if (sharePostModal) {
    sharePostModal.addEventListener('click', (e) => {
      if (e.target === sharePostModal) closeSharePostModal();
    });
  }

  // Setup click listeners for sharing channels
  const shareToWhatsappBtn = document.getElementById('share-to-whatsapp');
  const shareToTelegramBtn = document.getElementById('share-to-telegram');
  const shareToEmailBtn = document.getElementById('share-to-email');
  const shareCopyLinkBtn = document.getElementById('share-copy-link');

  if (shareToWhatsappBtn) {
    shareToWhatsappBtn.addEventListener('click', () => {
      if (!activeShareUrl) return;
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent('Check out this post on CampusLink: ' + activeShareUrl)}`;
      window.open(url, '_blank');
      incrementShareCount(activeSharePostId);
      closeSharePostModal();
    });
  }

  if (shareToTelegramBtn) {
    shareToTelegramBtn.addEventListener('click', () => {
      if (!activeShareUrl) return;
      const url = `https://t.me/share/url?url=${encodeURIComponent(activeShareUrl)}&text=${encodeURIComponent('Check out this post on CampusLink')}`;
      window.open(url, '_blank');
      incrementShareCount(activeSharePostId);
      closeSharePostModal();
    });
  }

  if (shareToEmailBtn) {
    shareToEmailBtn.addEventListener('click', () => {
      if (!activeShareUrl) return;
      const url = `mailto:?subject=${encodeURIComponent('CampusLink Post')}&body=${encodeURIComponent('Check out this post on CampusLink: ' + activeShareUrl)}`;
      window.location.href = url;
      incrementShareCount(activeSharePostId);
      closeSharePostModal();
    });
  }

  if (shareCopyLinkBtn) {
    shareCopyLinkBtn.addEventListener('click', () => {
      if (!activeShareUrl) return;
      fallbackCopy(activeShareUrl);
      incrementShareCount(activeSharePostId);
      closeSharePostModal();
    });
  }

  function incrementShareCount(postId) {
    if (!postId) return;
    const card = document.querySelector(`.btn-share-post[data-post-id="${postId}"]`)?.closest('.feed-post-card');
    if (card) {
      const sharesNumSpan = card.querySelector('.shares-number');
      if (sharesNumSpan) {
        let currentShares = parseInt(sharesNumSpan.textContent, 10) || 0;
        sharesNumSpan.textContent = currentShares + 1;
      }
    }
  }

  function fallbackCopy(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('Post link copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy post link:', err);
        executeTextareaCopy(url);
      });
    } else {
      executeTextareaCopy(url);
    }
  }

  function executeTextareaCopy(url) {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('Post link copied to clipboard!');
    } catch (copyErr) {
      console.error('Failed fallback copy:', copyErr);
      alert('Failed to copy link: ' + url);
    }
    document.body.removeChild(textarea);
  }

  // Form Submit Handler
  function initCreatePostForm() {
    if (!createPostForm) return;

    // Remove any existing listeners
    const newForm = createPostForm.cloneNode(true);
    createPostForm.parentNode.replaceChild(newForm, createPostForm);

    // Re-bind cancel button listener on cloned form
    const cancelBtn = newForm.querySelector('#post-modal-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeCreatePostModal);
    }

    newForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const mode = newForm.getAttribute('data-mode') || 'create';
      const submitBtn = newForm.querySelector('#post-submit-btn');

      if (mode === 'edit') {
        const editPostId = newForm.getAttribute('data-post-id');
        const newContent = newForm.querySelector('#post-content-textarea').value.trim();
        if (!newContent) return;

        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
          }
          const { error } = await supabase
            .from('posts')
            .update({ content: newContent })
            .eq('id', editPostId);

          if (error) throw error;

          // Perform visual update
          const card = document.querySelector(`.feed-post-card[data-post-id="${editPostId}"]`);
          if (card) {
            const textEl = card.querySelector('.post-text-content');
            if (textEl) textEl.textContent = newContent;
          }
          closeCreatePostModal();
          showToast('Post updated successfully!');
          loadFeed();
        } catch (err) {
          console.error('Error updating post:', err);
          alert('Failed to update post: ' + err.message);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post';
          }
        }
        return;
      }

      if (!currentUser) {
        alert('You must be logged in to post.');
        return;
      }

      const postAsSelect = newForm.querySelector('#post-as-select');
      const postTopicSelectEl = newForm.querySelector('#post-topic-select');
      
      const type = postAsSelect ? postAsSelect.value : 'personal';
      const topic = postTopicSelectEl ? postTopicSelectEl.value : 'general';
      const sanitize = window.CampusLink?.security?.sanitizeString || (s => s.trim());
      const content = sanitize(newForm.querySelector('#post-content-textarea').value);

      if (!content) return;

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Posting...';
        }

        const insertData = {
          user_id: currentUser.id,
          content: content,
          post_type: type,
          topic: topic
        };

        if (type === 'school' && currentUserProfile && currentUserProfile.school_id) {
          insertData.school_id = currentUserProfile.school_id;
        }

        const { data: newPost, error } = await supabase
          .from('posts')
          .insert(insertData)
          .select('id')
          .single();

        if (error) throw error;

        // Save mentions
        const textarea = newForm.querySelector('#post-content-textarea');
        const finalMentions = (textarea.selectedMentions || []).filter(m => {
          return content.includes(`@${m.name}`);
        });

        for (const mention of finalMentions) {
          const mentionData = {
            post_id: newPost.id,
            mentioned_by: currentUser.id
          };
          if (mention.type === 'school') {
            mentionData.mentioned_school_id = mention.id;
          } else {
            mentionData.mentioned_user_id = mention.id;
          }

          const { error: mentionErr } = await supabase
            .from('mentions')
            .insert(mentionData);
          if (mentionErr) console.warn('Error saving mention:', mentionErr);

          try {
            let recipientId = mention.id;
            if (mention.type === 'school') {
              const { data: schoolAdmin } = await supabase
                .from('schools')
                .select('admin_user_id')
                .eq('id', mention.id)
                .single();
              recipientId = schoolAdmin?.admin_user_id;
            }

            if (recipientId && recipientId !== currentUser.id) {
              const actorName = currentUserProfile?.full_name || 'Someone';
              await window.CampusLink.notifications.createNotification(
                recipientId,
                'mention',
                `${actorName} mentioned you in a post`,
                content.substring(0, 50) + '...',
                `index.html?post=${newPost.id}`,
                currentUser.id
              );
            }
          } catch (notifErr) {
            console.warn('Error sending mention notification:', notifErr);
          }
        }
        
        textarea.selectedMentions = [];

        closeCreatePostModal();
        loadFeed();
      } catch (err) {
        console.error('Error creating post:', err);
        alert('Failed to submit post: ' + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Post';
        }
      }
    });
  }

  // Render Guest state for Following tab
  function renderGuestFollowingFeedState() {
    const feedContainer = document.getElementById('social-feed');
    if (!feedContainer) return;
    feedContainer.innerHTML = `
      <div class="feed-empty-state" style="padding: 40px 24px;">
        <div class="empty-icon">🔒</div>
        <h3>Log in to see followed content</h3>
        <p>Following schools, students, and teachers lets you build a personalized feed of their latest updates and achievements.</p>
        <a href="login.html" class="btn btn-primary" style="margin-top: 16px; padding: 10px 24px; text-decoration: none; display: inline-block;">Log In to CampusLink</a>
      </div>
    `;
  }

  // Load feed from Supabase
  async function loadFeed() {
    const feedContainer = document.getElementById('social-feed');
    if (!feedContainer) return;

    try {
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          *,
          schools (
            name,
            verification_badge,
            logo_url,
            logo_letter,
            color_class
          ),
          profiles:profiles!posts_user_id_fkey (
            full_name,
            user_type,
            platform_role,
            avatar_url,
            school_id,
            is_verified,
            username,
            schools (
              name,
              verification_badge,
              logo_url,
              logo_letter,
              color_class
            )
          ),
          post_likes (
            user_id
          ),
          mentions (
            id,
            post_id,
            comment_id,
            mentioned_user_id,
            mentioned_school_id,
            mentioned_by,
            profiles:profiles!mentions_mentioned_user_id_fkey (
              id,
              full_name
            ),
            schools:schools!mentions_mentioned_school_id_fkey (
              id,
              name
            )
          ),
          comments (
            id,
            content,
            created_at,
            user_id,
            profiles:profiles!comments_user_id_fkey (
              full_name,
              user_type,
              avatar_url,
              is_verified,
              school_id,
              username,
              schools (
                name,
                verification_badge,
                logo_url,
                logo_letter,
                color_class
              )
            ),
            mentions (
              id,
              post_id,
              comment_id,
              mentioned_user_id,
              mentioned_school_id,
              mentioned_by,
              profiles:profiles!mentions_mentioned_user_id_fkey (
                id,
                full_name
              ),
              schools:schools!mentions_mentioned_school_id_fkey (
                id,
                name
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let filteredPosts = posts || [];
      if (activeFeedFilter === 'following') {
        if (!currentUser) {
          renderGuestFollowingFeedState();
          return;
        }
        filteredPosts = (posts || []).filter(post => {
          const authorId = post.user_id;
          const authorSchoolId = post.profiles?.school_id;
          
          const followsAuthor = userFollows.users.has(authorId);
          const followsSchool = authorSchoolId && userFollows.schools.has(authorSchoolId);
          const isOwnPost = currentUser && authorId === currentUser.id;
          
          return followsAuthor || followsSchool || isOwnPost;
        });
      }

      // Filter by topic
      if (activeTopicFilter && activeTopicFilter !== 'all') {
        filteredPosts = filteredPosts.filter(post => {
          const postTopic = post.topic || 'general';
          return postTopic === activeTopicFilter;
        });
      }

      // Check for specific post in URL query params
      const urlParams = new URLSearchParams(window.location.search);
      const targetPostId = urlParams.get('post');
      if (targetPostId) {
        const hasTargetPost = filteredPosts.some(p => p.id === targetPostId);
        if (!hasTargetPost) {
          try {
            const { data: specificPost, error: specificPostError } = await supabase
              .from('posts')
              .select(`
                *,
                schools (
                  name,
                  verification_badge,
                  logo_url,
                  logo_letter,
                  color_class
                ),
                profiles:profiles!posts_user_id_fkey (
                  full_name,
                  user_type,
                  platform_role,
                  avatar_url,
                  school_id,
                  is_verified,
                  username,
                  schools (
                    name,
                    verification_badge,
                    logo_url,
                    logo_letter,
                    color_class
                  )
                ),
                post_likes (
                  user_id
                ),
                mentions (
                  id,
                  post_id,
                  comment_id,
                  mentioned_user_id,
                  mentioned_school_id,
                  mentioned_by,
                  profiles:profiles!mentions_mentioned_user_id_fkey (
                    id,
                    full_name
                  ),
                  schools:schools!mentions_mentioned_school_id_fkey (
                    id,
                    name
                  )
                ),
                comments (
                  id,
                  content,
                  created_at,
                  user_id,
                  profiles:profiles!comments_user_id_fkey (
                    full_name,
                    user_type,
                    avatar_url,
                    is_verified,
                    school_id,
                    username,
                    schools (
                      name,
                      verification_badge,
                      logo_url,
                      logo_letter,
                      color_class
                    )
                  ),
                  mentions (
                    id,
                    post_id,
                    comment_id,
                    mentioned_user_id,
                    mentioned_school_id,
                    mentioned_by,
                    profiles:profiles!mentions_mentioned_user_id_fkey (
                      id,
                      full_name
                    ),
                    schools:schools!mentions_mentioned_school_id_fkey (
                      id,
                      name
                    )
                  )
                )
              `)
              .eq('id', targetPostId)
              .maybeSingle();

            if (!specificPostError && specificPost) {
              filteredPosts.unshift(specificPost);
            }
          } catch (spErr) {
            console.warn('Could not load target post:', spErr);
          }
        }
      }

      renderFeed(filteredPosts);

      if (targetPostId) {
        setTimeout(() => {
          const postEl = feedContainer.querySelector(`[data-post-id="${targetPostId}"]`);
          if (postEl) {
            postEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            postEl.classList.add('highlighted-post');
            
            // Remove highlight class after animation finishes
            setTimeout(() => {
              postEl.classList.add('fade-highlight');
              setTimeout(() => {
                postEl.classList.remove('highlighted-post', 'fade-highlight');
              }, 2000);
            }, 3000);
          }
        }, 300);
      }
    } catch (err) {
      console.error('Error loading feed:', err);
      feedContainer.innerHTML = `
        <div class="feed-error-state">
          <p>Failed to load campus feed. Please refresh the page.</p>
          <button class="btn btn-secondary btn-sm" id="btn-feed-retry">Retry</button>
        </div>
      `;
      const retryBtn = document.getElementById('btn-feed-retry');
      if (retryBtn) retryBtn.addEventListener('click', loadFeed);
    }
  }

  // Render feed in HTML
  function renderFeed(posts) {
    const feedContainer = document.getElementById('social-feed');
    if (!feedContainer) return;

    if (posts.length === 0) {
      if (activeFeedFilter === 'following') {
        feedContainer.innerHTML = `
          <div class="feed-empty-state">
            <div class="empty-icon">👥</div>
            <h3>Feed is empty</h3>
            <p>You aren't following anyone yet, or the people and schools you follow haven't posted anything. Discover them on the <a href="networking.html" style="color:var(--primary); font-weight:600; text-decoration:underline;">Networking page</a>!</p>
          </div>
        `;
      } else {
        feedContainer.innerHTML = `
          <div class="feed-empty-state">
            <div class="empty-icon">📣</div>
            <h3>No posts yet</h3>
            <p>Be the first to share an achievement, competition win, or project!</p>
          </div>
        `;
      }
      return;
    }

    feedContainer.innerHTML = '';

    posts.forEach(post => {
      const p = post.profiles || {};
      const s = post.schools || p.schools || {};

      let authorName = '';
      let authorInitials = '';
      let authorAvatar = '';
      let profileUrl = '';
      let badgeHtml = '';
      let roleBadgeHtml = '';
      let headlineText = '';

      if (post.post_type === 'school') {
        authorName = s.name || p.full_name || 'Anonymous School';
        authorInitials = s.logo_letter || authorName.charAt(0).toUpperCase();
        authorAvatar = s.logo_url
          ? `<img src="${s.logo_url}" alt="${authorName}" class="post-avatar-img">`
          : `<div class="post-avatar-placeholder ${s.color_class || 'bg-gradient-1'}">${authorInitials}</div>`;
        profileUrl = `school-profile.html?id=${post.school_id || p.school_id || s.id}`;

        if (s.verification_badge === 'gold') {
          badgeHtml = `
            <svg class="verified-badge verified-badge-md gold" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Gold Partner School" style="display:inline-block; vertical-align:middle; margin-left:4px;">
              <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
              <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
            </svg>`;
        } else if (s.verification_badge === 'blue') {
          badgeHtml = `
            <svg class="verified-badge verified-badge-md" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified School" style="display:inline-block; vertical-align:middle; margin-left:4px;">
              <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
              <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
            </svg>`;
        }

        roleBadgeHtml = '';
        headlineText = 'Official School Account';

      } else if (post.post_type === 'representative') {
        authorName = p.full_name || s.name || 'Anonymous Representative';
        authorInitials = getInitials(authorName);
        authorAvatar = p.avatar_url
          ? `<img src="${p.avatar_url}" alt="${authorName}" class="post-avatar-img">`
          : `<div class="post-avatar-placeholder">${authorInitials}</div>`;
        profileUrl = `profile.html?id=${post.user_id}`;

        if (p.is_verified) {
          badgeHtml = `
            <svg class="verified-badge verified-badge-md" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Profile" style="display:inline-block; vertical-align:middle; margin-left:4px;">
              <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
              <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
            </svg>`;
        }

        roleBadgeHtml = `
          <span class="feed-badge school-rep-badge">
            👤 School Representative
          </span>
        `;
        headlineText = `School Rep at ${s.name || 'our partner school'}`;

      } else {
        authorName = p.full_name || 'Anonymous User';
        authorInitials = getInitials(authorName);
        authorAvatar = p.avatar_url
          ? `<img src="${p.avatar_url}" alt="${authorName}" class="post-avatar-img">`
          : `<div class="post-avatar-placeholder">${authorInitials}</div>`;
        profileUrl = `profile.html?id=${post.user_id}`;

        if ((p.user_type === 'school_representative' || p.platform_role === 'school_admin') && p.school_id) {
          profileUrl = `school-profile.html?id=${p.school_id}`;
        }

        if (p.is_verified) {
          badgeHtml = `
            <svg class="verified-badge verified-badge-md" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Profile" style="display:inline-block; vertical-align:middle; margin-left:4px;">
              <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
              <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
            </svg>`;
        }

        if (p.user_type === 'school_representative') {
          roleBadgeHtml = `
            <span class="feed-badge school-rep-badge">
              👤 School Representative
            </span>
          `;
        }

        headlineText = auth.getUserTypeLabel(p.user_type);
        const schoolName = s.name;
        if (p.user_type === 'student' && p.class) {
          headlineText += ` • Class ${p.class}`;
        }
        if (schoolName) {
          headlineText += ` at ${schoolName}`;
        }
      }

      // Topic badge row
      const topicDisplay = getTopicDisplay(post.topic);
      let topicBadgeHtml = '';
      if (topicDisplay) {
        topicBadgeHtml = `
          <div class="post-type-badge-row">
            <span class="post-type-badge ${topicDisplay.class}">
              <span class="badge-icon">${topicDisplay.icon}</span> ${topicDisplay.label}
            </span>
          </div>
        `;
      }

      // Check if current user liked
      const likes = post.post_likes || [];
      const hasLiked = currentUser ? likes.some(l => l.user_id === currentUser.id) : false;

      // Comments count & sorting
      const comments = post.comments || [];
      const sortedComments = [...comments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      const isAuthorSchool = post.post_type === 'school' || ((p.user_type === 'school_representative' || p.platform_role === 'school_admin') && p.school_id);
      
      // Standard blue/gold verification badge
      if (post.post_type !== 'school') {
        let badgeHtmlTemp = '';
        if (isAuthorSchool && p.schools?.verification_badge === 'gold') {
          badgeHtmlTemp = `
            <svg class="verified-badge verified-badge-md gold" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Gold Partner School" style="display:inline-block; vertical-align:middle; margin-left:4px;">
              <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
              <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
            </svg>`;
        } else if ((isAuthorSchool && p.schools?.verification_badge === 'blue') || (!isAuthorSchool && p.is_verified)) {
          badgeHtmlTemp = `
            <svg class="verified-badge verified-badge-md" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="${isAuthorSchool ? 'Verified School' : 'Verified Profile'}" style="display:inline-block; vertical-align:middle; margin-left:4px;">
              <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
              <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
            </svg>`;
        }
        badgeHtml = badgeHtmlTemp;
      }

      const card = document.createElement('article');
      card.className = 'feed-post-card';
      card.dataset.postId = post.id;

      // Determine mock media attachments based on content keywords for modern appearance (reference screen match)
      let mediaHtml = '';
      const textLower = post.content.toLowerCase();
      
      if (post.post_type === 'event' || textLower.includes('gala') || textLower.includes('meet') || textLower.includes('workshop') || textLower.includes('session') || textLower.includes('fest')) {
        // High-quality school networking events image (gala, workshop, fests)
        mediaHtml = `
          <div class="post-media-container">
            <img src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60" alt="Event" class="post-media-img">
          </div>
        `;
      } else if (textLower.includes('guide') || textLower.includes('sop') || textLower.includes('tips') || textLower.includes('book') || textLower.includes('document') || textLower.includes('blueprint')) {
        // High-quality link document preview card ("Ivy League Blueprint" matching reference screen)
        mediaHtml = `
          <div class="post-link-preview-card">
            <div class="link-preview-left-accent">
              <div class="link-preview-badge-value">5</div>
              <div class="link-preview-badge-label">TIPS</div>
            </div>
            <div class="link-preview-details">
              <h4 class="link-preview-title">Ivy League Blueprint</h4>
              <p class="link-preview-desc">The definitive guide to your SOP. 12 pages of expert insights.</p>
              <a href="#" class="link-preview-cta">VIEW DOCUMENT <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-left: 2px; vertical-align: middle;"><polyline points="9 18 15 12 9 6"/></svg></a>
            </div>
          </div>
        `;
      }

      // Keep shares count as 0 since we don't track it
      const sharesCount = 0;

      card.innerHTML = `
        <div class="post-header" style="position: relative;">
          <a href="${profileUrl}" class="post-avatar-link">
            ${authorAvatar}
          </a>
            <div class="post-meta-info">
              <div class="post-author-row">
                <a href="${profileUrl}" class="post-author-name">${authorName}${badgeHtml}${roleBadgeHtml}</a>
              </div>
              ${(post.post_type !== 'school' && p.username) ? `<div class="post-author-username" style="font-size: 0.75rem; color: var(--text-muted); font-weight: 400; margin-top: 1px; margin-bottom: 2px;">@${p.username}</div>` : ''}
              <div class="post-meta-sub-row">
              <span class="post-author-headline">${headlineText}</span>
              <span class="post-meta-separator">•</span>
              <span class="post-time">${formatRelativeTime(post.created_at)}</span>
            </div>
          </div>
          
          <button class="post-more-btn" aria-label="More options" data-post-id="${post.id}" data-author-id="${post.user_id}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="1.5"></circle>
              <circle cx="6" cy="12" r="1.5"></circle>
              <circle cx="18" cy="12" r="1.5"></circle>
            </svg>
          </button>
          
          ${(currentUser && post.user_id === currentUser.id) ? `
            <div class="post-more-dropdown" id="dropdown-${post.id}">
              <button class="dropdown-item btn-edit-post" data-post-id="${post.id}"><span class="dropdown-icon">✏️</span> Edit Post</button>
              <button class="dropdown-item btn-delete-post" data-post-id="${post.id}"><span class="dropdown-icon">🗑️</span> Delete Post</button>
              <button class="dropdown-item btn-copy-post" data-post-id="${post.id}"><span class="dropdown-icon">🔗</span> Copy Link</button>
            </div>
          ` : `
            <div class="post-more-dropdown" id="dropdown-${post.id}">
              <button class="dropdown-item btn-copy-post" data-post-id="${post.id}"><span class="dropdown-icon">🔗</span> Copy Link</button>
              <button class="dropdown-item btn-report-post" data-post-id="${post.id}"><span class="dropdown-icon">⚠️</span> Report Post</button>
            </div>
          `}
        </div>

        ${topicBadgeHtml}

        <div class="post-body">
          <p class="post-text-content">${formatContentWithMentions(post.content, post.mentions)}</p>
          ${mediaHtml}
        </div>

        <div class="post-stats-row">
          <div class="post-stats-left">
            <span class="likes-count-display">
              <span class="likes-number">${likes.length}</span> ${likes.length === 1 ? 'like' : 'likes'}
            </span>
          </div>
          <div class="post-stats-right">
            <span class="comments-count-display">
              <span class="comments-number">${comments.length}</span> comments
            </span>
            <span class="shares-count-display">
              • <span class="shares-number">${sharesCount}</span> shares
            </span>
          </div>
        </div>

        <div class="post-actions-row">
          <button class="btn-post-action btn-like ${hasLiked ? 'liked' : ''}" data-post-id="${post.id}">
            <svg class="action-svg-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
            <span>Like</span>
          </button>
          <button class="btn-post-action btn-comment" data-post-id="${post.id}">
            <svg class="action-svg-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Comment</span>
          </button>
          <button class="btn-post-action btn-share-post" data-post-id="${post.id}">
            <svg class="action-svg-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            <span>Share</span>
          </button>
        </div>

        <div class="post-comments-container" style="display: none;">
          <div class="comments-divider"></div>
          
          <!-- Comment input form -->
          ${currentUser ? `
            <form class="post-comment-form" data-post-id="${post.id}">
              ${currentUserProfile?.avatar_url
                ? `<img src="${currentUserProfile.avatar_url}" alt="${currentUserProfile.full_name || 'Me'}" class="comment-input-avatar">`
                : `<div class="comment-input-avatar-placeholder">${getInitials(currentUserProfile?.full_name || currentUser.email)}</div>`
              }
              <div class="comment-input-wrapper">
                <input type="text" placeholder="Add a comment..." required class="comment-input-field">
                <button type="submit" class="btn-comment-submit" title="Submit comment">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </form>
          ` : `
            <div class="guest-comment-prompt">
              <p><a href="login.html">Log in</a> to write a comment on this post.</p>
            </div>
          `}

          <!-- Comments feed -->
          <div class="post-comments-list">
            ${sortedComments.length === 0 ? `
              <p class="comments-empty-text">No comments yet. Start the conversation!</p>
            ` : sortedComments.map(c => {
              const cp = c.profiles || {};
              const commenterName = cp.full_name || 'Anonymous';
              const commenterInitials = getInitials(commenterName);
              const commenterAvatar = cp.avatar_url
                ? `<img src="${cp.avatar_url}" alt="${commenterName}" class="comment-item-avatar">`
                : `<div class="comment-item-avatar-placeholder">${commenterInitials}</div>`;

              let commenterProfileUrl = `profile.html?id=${c.user_id}`;
              if ((cp.user_type === 'school_representative' || cp.platform_role === 'school_admin') && cp.school_id) {
                commenterProfileUrl = `school-profile.html?id=${cp.school_id}`;
              }

              const isCommenterSchool = (cp.user_type === 'school_representative' || cp.platform_role === 'school_admin') && cp.school_id;
              let commenterBadge = '';
              if (isCommenterSchool && cp.schools?.verification_badge === 'gold') {
                commenterBadge = `
                  <svg class="verified-badge verified-badge-sm gold" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Gold Partner School" style="display:inline-block; vertical-align:middle; margin-left:4px;">
                    <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
                    <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
                  </svg>
                `;
              } else if ((isCommenterSchool && cp.schools?.verification_badge === 'blue') || (!isCommenterSchool && cp.is_verified)) {
                commenterBadge = `
                  <svg class="verified-badge verified-badge-sm" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="${isCommenterSchool ? 'Verified School' : 'Verified Profile'}" style="display:inline-block; vertical-align:middle; margin-left:4px;">
                    <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
                    <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
                  </svg>
                `;
              }

              return `
                <div class="comment-item">
                  <a href="${commenterProfileUrl}">
                    ${commenterAvatar}
                  </a>
                  <div class="comment-item-content-wrapper">
                    <div class="comment-item-header">
                      <div class="comment-item-author-info" style="display: flex; flex-direction: column; align-items: flex-start;">
                        <div style="display: flex; align-items: center; gap: 4px;">
                          <a href="${commenterProfileUrl}" class="comment-item-author-name">${commenterName}${commenterBadge}</a>
                          <span class="comment-item-author-role ${cp.user_type || 'student'}">${auth.getUserTypeLabel(cp.user_type)}</span>
                        </div>
                        ${cp.username ? `<span class="comment-item-author-username" style="font-size: 0.7rem; color: var(--text-muted); font-weight: 400; margin-top: 1px; margin-bottom: 2px;">@${cp.username}</span>` : ''}
                      </div>
                      <span class="comment-item-time">${formatRelativeTime(c.created_at)}</span>
                    </div>
                    <p class="comment-item-text">${formatContentWithMentions(c.content, c.mentions)}</p>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      feedContainer.appendChild(card);
    });

    // Bind Like clicks
    feedContainer.querySelectorAll('.btn-like').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const postId = e.currentTarget.getAttribute('data-post-id');
        await toggleLike(postId, e.currentTarget);
      });
    });

    // Bind Comment section toggles
    feedContainer.querySelectorAll('.btn-comment').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = e.currentTarget.closest('.feed-post-card');
        const commentsContainer = card.querySelector('.post-comments-container');
        if (commentsContainer.style.display === 'none') {
          commentsContainer.style.display = 'block';
        } else {
          commentsContainer.style.display = 'none';
        }
      });
    });

    // Bind Comment submits & Autocomplete
    feedContainer.querySelectorAll('.post-comment-form').forEach(form => {
      const inputField = form.querySelector('.comment-input-field');
      if (inputField && !inputField.hasMentionAutocomplete) {
        inputField.hasMentionAutocomplete = true;
        new MentionAutocomplete(inputField, (item) => {
          inputField.selectedMentions = inputField.selectedMentions || [];
          inputField.selectedMentions.push(item);
        });
      }
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const postId = e.currentTarget.getAttribute('data-post-id');
        const content = inputField.value.trim();
        if (!content) return;

        await submitComment(postId, content, inputField);
      });
    });

    // Bind Post More Menu clicks (Three-dot)
    feedContainer.querySelectorAll('.post-more-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const postId = e.currentTarget.getAttribute('data-post-id');
        const dropdown = feedContainer.querySelector(`#dropdown-${postId}`);
        if (!dropdown) return;
        
        // Close all other dropdowns
        feedContainer.querySelectorAll('.post-more-dropdown').forEach(d => {
          if (d.id !== `dropdown-${postId}`) {
            d.classList.remove('active');
          }
        });
        
        dropdown.classList.toggle('active');
      });
    });

    // Bind Dropdown Edit Post clicks
    feedContainer.querySelectorAll('.btn-edit-post').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const postId = e.currentTarget.getAttribute('data-post-id');
        
        // Close dropdown
        const dropdown = e.currentTarget.closest('.post-more-dropdown');
        if (dropdown) dropdown.classList.remove('active');
        
        // Load content and open Edit Modal
        const card = e.currentTarget.closest('.feed-post-card');
        const textEl = card?.querySelector('.post-text-content');
        const content = textEl?.textContent || '';
        
        if (createPostModal) {
          const activeForm = document.getElementById('create-post-form');
          if (activeForm) {
            activeForm.setAttribute('data-mode', 'edit');
            activeForm.setAttribute('data-post-id', postId);
            
            const titleEl = createPostModal.querySelector('.modal-title h3');
            const descEl = createPostModal.querySelector('.modal-title p');
            const submitBtn = createPostModal.querySelector('#post-submit-btn');
            if (titleEl) titleEl.textContent = 'Edit Post';
            if (descEl) descEl.textContent = 'Update your post text below.';
            if (submitBtn) {
              submitBtn.textContent = 'Save Changes';
              submitBtn.disabled = false;
            }
            
            if (postContentTextarea) {
              postContentTextarea.value = content;
            }
            createPostModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
              postContentTextarea?.focus();
            }, 100);
          }
        }
      });
    });

    // Bind Dropdown Delete Post clicks
    feedContainer.querySelectorAll('.btn-delete-post').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const postId = e.currentTarget.getAttribute('data-post-id');
        const card = e.currentTarget.closest('.feed-post-card');

        if (card && postId) {
          try {
            const { error } = await supabase
              .from('posts')
              .delete()
              .eq('id', postId);

            if (error) throw error;
            
            card.style.transition = 'all 0.4s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
              card.remove();

              // Check if feed is now empty
              const remaining = feedContainer.querySelectorAll('.feed-post-card');
              if (remaining.length === 0) {
                feedContainer.innerHTML = `
                  <div class="feed-empty-state">
                    <div class="empty-icon">📣</div>
                    <h3>No posts yet</h3>
                    <p>Be the first to share an achievement, competition win, or project!</p>
                  </div>
                `;
              }
            }, 400);
            showToast('Post deleted successfully!');
          } catch (err) {
            console.error('Failed to delete post:', err);
            showToast('Failed to delete post: ' + err.message, 'error');
          }
        }
      });
    });

    // Bind Dropdown Copy Link clicks
    feedContainer.querySelectorAll('.btn-copy-post').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const postId = e.currentTarget.getAttribute('data-post-id');
        
        // Close dropdown
        const dropdown = e.currentTarget.closest('.post-more-dropdown');
        if (dropdown) dropdown.classList.remove('active');
        
        const shareUrl = `${window.location.origin}${window.location.pathname}?post=${postId}`;
        
        function fallbackCopy(url) {
          const textarea = document.createElement('textarea');
          textarea.value = url;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand('copy');
            showToast('Post link copied to clipboard!');
          } catch (copyErr) {
            console.error('Failed fallback copy:', copyErr);
            alert('Failed to copy link: ' + url);
          }
          document.body.removeChild(textarea);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareUrl).then(() => {
            showToast('Post link copied to clipboard!');
          }).catch(err => {
            console.error('Failed to copy post link:', err);
            fallbackCopy(shareUrl);
          });
        } else {
          fallbackCopy(shareUrl);
        }
      });
    });

    // Bind Dropdown Report Post clicks
    feedContainer.querySelectorAll('.btn-report-post').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const postId = e.currentTarget.getAttribute('data-post-id');
        
        // Close dropdown
        const dropdown = e.currentTarget.closest('.post-more-dropdown');
        if (dropdown) dropdown.classList.remove('active');
        
        const card = e.currentTarget.closest('.feed-post-card');
        const textEl = card?.querySelector('.post-text-content');
        const content = textEl?.textContent || '';
        
        const moreBtn = card?.querySelector('.post-more-btn');
        const authorId = moreBtn?.getAttribute('data-author-id') || '';

        // Open Report Modal
        const reportPostModal = document.getElementById('report-post-modal');
        const reportPostForm = document.getElementById('report-post-form');
        if (reportPostModal && reportPostForm) {
          reportPostForm.setAttribute('data-post-id', postId);
          reportPostForm.setAttribute('data-post-content', content);
          reportPostForm.setAttribute('data-post-author-id', authorId);
          
          const reasonSelect = reportPostModal.querySelector('#report-reason-select');
          const detailsArea = reportPostModal.querySelector('#report-details-textarea');
          const detailsGroup = reportPostModal.querySelector('#report-details-group');
          if (reasonSelect) reasonSelect.value = '';
          if (detailsArea) detailsArea.value = '';
          if (detailsGroup) detailsGroup.style.display = 'none';

          reportPostModal.classList.add('active');
          document.body.style.overflow = 'hidden';
        }
      });
    });

    // Bind Share clicks
    feedContainer.querySelectorAll('.btn-share-post').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const postId = e.currentTarget.getAttribute('data-post-id');
        const shareUrl = `${window.location.origin}${window.location.pathname}?post=${postId}`;

        if (navigator.share) {
          try {
            await navigator.share({
              title: 'CampusLink Post',
              text: 'Check out this post on CampusLink:',
              url: shareUrl
            });
            incrementShareCount(postId);
            showToast('Post shared successfully!');
          } catch (err) {
            console.log('Web share cancelled or failed:', err);
          }
        } else {
          openShareModal(postId, shareUrl);
        }
      });
    });
  }

  // Toggle Like Status
  async function toggleLike(postId, btn) {
    if (!currentUser) {
      alert('Please log in to like posts.');
      return;
    }

    const likeNumSpan = btn.closest('.feed-post-card').querySelector('.likes-number');
    const likesCountDisplay = btn.closest('.feed-post-card').querySelector('.likes-count-display');
    
    let currentLikes = parseInt(likeNumSpan.textContent, 10);
    const isLiked = btn.classList.contains('liked');

    // Optimistic UI updates
    if (isLiked) {
      btn.classList.remove('liked');
      currentLikes = Math.max(0, currentLikes - 1);
    } else {
      btn.classList.add('liked');
      currentLikes++;
      
      // Trigger pop animation
      btn.classList.remove('like-animated');
      void btn.offsetWidth; // Force reflow
      btn.classList.add('like-animated');
      setTimeout(() => {
        btn.classList.remove('like-animated');
      }, 300);
    }
    likeNumSpan.textContent = currentLikes;
    likesCountDisplay.innerHTML = `<span class="likes-number">${currentLikes}</span> ${currentLikes === 1 ? 'like' : 'likes'}`;

    try {
      if (isLiked) {
        // Delete like row
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id);

        if (error) throw error;
      } else {
        // Insert like row
        const { error } = await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: currentUser.id
          });

        if (error) throw error;

        // Trigger notification
        if (window.CampusLink && window.CampusLink.notifications) {
          try {
            const { data: post } = await supabase
              .from('posts')
              .select('user_id, content')
              .eq('id', postId)
              .single();
            if (post && post.user_id !== currentUser.id) {
              const actorName = currentUserProfile?.full_name || 'Someone';
              const postTitle = post.content ? post.content.substring(0, 30) + '...' : 'your post';
              await window.CampusLink.notifications.createNotification(
                post.user_id,
                'like',
                `${actorName} liked your post`,
                `"${postTitle}"`,
                `index.html`,
                currentUser.id
              );
            }
          } catch (notifErr) {
            console.warn('Error sending like notification:', notifErr);
          }
        }
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      // Revert Optimistic UI if failed
      if (isLiked) {
        btn.classList.add('liked');
        currentLikes++;
      } else {
        btn.classList.remove('liked');
        currentLikes = Math.max(0, currentLikes - 1);
      }
      likeNumSpan.textContent = currentLikes;
      likesCountDisplay.innerHTML = `<span class="likes-number">${currentLikes}</span> ${currentLikes === 1 ? 'like' : 'likes'}`;
      alert('Could not update like. Please try again.');
    }
  }

  // Submit Comment
  async function submitComment(postId, content, inputField) {
    if (!currentUser) {
      alert('Please log in to comment.');
      return;
    }

    const sanitize = window.CampusLink?.security?.sanitizeString || (s => s.trim());
    const cleanContent = sanitize(content);
    if (!cleanContent) return;

    const submitBtn = inputField.nextElementSibling;
    try {
      if (submitBtn) submitBtn.disabled = true;

      const { data: newComment, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          content: cleanContent
        })
        .select('id')
        .single();

      if (error) throw error;

      // Save mentions
      const finalMentions = (inputField.selectedMentions || []).filter(m => {
        return cleanContent.includes(`@${m.name}`);
      });

      for (const mention of finalMentions) {
        const mentionData = {
          post_id: postId,
          comment_id: newComment.id,
          mentioned_by: currentUser.id
        };
        if (mention.type === 'school') {
          mentionData.mentioned_school_id = mention.id;
        } else {
          mentionData.mentioned_user_id = mention.id;
        }

        const { error: mentionErr } = await supabase
          .from('mentions')
          .insert(mentionData);
        if (mentionErr) console.warn('Error saving comment mention:', mentionErr);

        try {
          let recipientId = mention.id;
          if (mention.type === 'school') {
            const { data: schoolAdmin } = await supabase
              .from('schools')
              .select('admin_user_id')
              .eq('id', mention.id)
              .single();
            recipientId = schoolAdmin?.admin_user_id;
          }

          if (recipientId && recipientId !== currentUser.id) {
            const actorName = currentUserProfile?.full_name || 'Someone';
            await window.CampusLink.notifications.createNotification(
              recipientId,
              'mention',
              `${actorName} mentioned you in a comment`,
              content.substring(0, 50) + '...',
              `index.html?post=${postId}`,
              currentUser.id
            );
          }
        } catch (notifErr) {
          console.warn('Error sending comment mention notification:', notifErr);
        }
      }

      inputField.selectedMentions = [];

      // Trigger notification
      if (window.CampusLink && window.CampusLink.notifications) {
        try {
          const { data: post } = await supabase
            .from('posts')
            .select('user_id, content')
            .eq('id', postId)
            .single();
          if (post && post.user_id !== currentUser.id) {
            const actorName = currentUserProfile?.full_name || 'Someone';
            const postTitle = post.content ? post.content.substring(0, 30) + '...' : 'your post';
            await window.CampusLink.notifications.createNotification(
              post.user_id,
              'comment',
              `${actorName} commented on your post`,
              `"${content.substring(0, 40)}${content.length > 40 ? '...' : ''}"`,
              `index.html`,
              currentUser.id
            );
          }
        } catch (notifErr) {
          console.warn('Error sending comment notification:', notifErr);
        }
      }

      inputField.value = '';
      loadFeed();
    } catch (err) {
      console.error('Error submitting comment:', err);
      alert('Failed to post comment: ' + err.message);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  // Load Trending Events Sidebar Widget
  async function loadTrendingEventsWidget() {
    const list = document.getElementById('trending-events-list');
    if (!list) return;

    try {
      // Fetch approved schools first to filter
      const { data: approvedSchools } = await supabase
        .from('schools')
        .select('id')
        .eq('status', 'approved');

      const approvedSchoolIds = new Set((approvedSchools || []).map(s => s.id));

      const { data: dbEvents, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const filteredEvents = (dbEvents || []).filter(e => approvedSchoolIds.has(e.school_id)).slice(0, 5);

      list.innerHTML = '';
      if (filteredEvents.length === 0) {
        list.innerHTML = `<div class="widget-list-empty">No upcoming events listed.</div>`;
        return;
      }

      filteredEvents.forEach(e => {
        const item = document.createElement('div');
        item.className = 'widget-item';
        item.innerHTML = `
          <div class="widget-item-logo">${e.logo_letter || '🎉'}</div>
          <div class="widget-item-info">
            <a href="event-detail.html?id=${e.id}" class="widget-item-title">${e.title}</a>
            <span class="widget-item-subtitle">${e.school_name || 'Partner School'}</span>
            <span class="widget-item-meta">${e.event_date || 'Upcoming'} • ${e.registrations || '0 Registered'}</span>
          </div>
        `;
        list.appendChild(item);
      });
    } catch (err) {
      console.warn('Error loading trending events widget:', err);
      list.innerHTML = `<div class="widget-list-empty">Failed to load events.</div>`;
    }
  }

  // Load Featured Schools Sidebar Widget
  async function loadFeaturedSchoolsWidget() {
    const list = document.getElementById('suggested-schools-list');
    if (!list) return;

    try {
      const { data: dbSchools, error } = await supabase
        .from('schools')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      list.innerHTML = '';
      if ((dbSchools || []).length === 0) {
        list.innerHTML = `<div class="widget-list-empty">No featured schools found.</div>`;
        return;
      }

      dbSchools.forEach(s => {
        const letter = s.logo_letter || s.name.charAt(0).toUpperCase();
        const colorClass = s.color_class || 'bg-gradient-1';
        const item = document.createElement('div');
        item.className = 'widget-item';
        item.innerHTML = `
          <div class="widget-item-school-logo ${colorClass}">${s.logo_url ? `<img src="${s.logo_url}" alt="${s.name}">` : letter}</div>
          <div class="widget-item-info">
            <a href="school-profile.html?id=${s.id}" class="widget-item-title">${s.name}</a>
            <span class="widget-item-subtitle">${s.city || ''}${s.state ? `, ${s.state}` : ''}</span>
            <span class="widget-item-meta">${s.board || 'CBSE/ICSE'} Board</span>
          </div>
        `;
        list.appendChild(item);
      });
    } catch (err) {
      console.warn('Error loading featured schools widget:', err);
      list.innerHTML = `<div class="widget-list-empty">Failed to load schools.</div>`;
    }
  }

  // Initialise Social Feed
  if (document.getElementById('social-feed')) {
    initSocialFeed();
  }

  // Close post more dropdowns on click outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.post-more-dropdown.active').forEach(dropdown => {
      dropdown.classList.remove('active');
    });
  });
});

