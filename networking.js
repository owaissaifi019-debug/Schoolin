document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // Update navigation based on auth state
  if (window.CampusLink && window.CampusLink.auth) {
    window.CampusLink.auth.updateNavAuthState();
  }

  /* --- Sticky Header Logic --- */
  const header = document.querySelector('header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 50);
  });

  /* --- Mobile Navigation Menu --- */
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');
  const body = document.body;

  mobileToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    body.classList.toggle('mobile-nav-active');
  });

  document.querySelectorAll('.nav-links a').forEach(anchor => {
    anchor.addEventListener('click', () => {
      navLinks.classList.remove('active');
      body.classList.remove('mobile-nav-active');
    });
  });

  /* --- State --- */
  const supabase = window.CampusLink && window.CampusLink.supabase;
  const auth = window.CampusLink && window.CampusLink.auth;
  let currentUser = null;
  let allProfiles = [];
  let userFollows = { users: new Set(), schools: new Set() };
  let userConnections = new Map();
  let pendingIncomingRequests = [];
  let activeFilter = 'all';
  let searchQuery = '';
  let showAllInvitations = false;
  let suggestedSchools = [];

  const DEFAULT_SCHOOLS = [
    { id: '1', name: "Delhi Public School, RK Puram", city: "New Delhi", logoLetter: "D", colorClass: "bg-gradient-1", verificationBadge: 'blue' },
    { id: '2', name: "St. Xavier's High School", city: "Mumbai", logoLetter: "X", colorClass: "bg-gradient-2", verificationBadge: 'blue' },
    { id: '3', name: "Bishop Cotton School", city: "Shimla", logoLetter: "B", colorClass: "bg-gradient-3", verificationBadge: 'gold' },
    { id: '4', name: "St. Stephen's Academy", city: "Dehradun", logoLetter: "S", colorClass: "bg-gradient-4", verificationBadge: 'none' }
  ];

  /* --- Init --- */
  async function init() {
    if (auth) {
      currentUser = await auth.getUser();
    }

    await Promise.all([
      loadProfiles(),
      loadFollows(),
      loadConnections()
    ]);

    // Show connections tab if logged in
    const connTab = document.getElementById('net-tab-connections');
    if (connTab && currentUser) {
      connTab.style.display = 'inline-flex';
    }

    initManageNetworkToggle();
    await loadSchoolsSuggestions();
    updateNetworkStats();

    renderPendingRequests();
    renderCards();
    setupEventListeners();
  }

  /* --- Manage My Network Collapsible Panel --- */
  function initManageNetworkToggle() {
    const card = document.getElementById('manage-network-card');
    const header = document.getElementById('manage-network-header');
    if (!card || !header) return;

    // Default State: Expanded on Desktop, Collapsed on Mobile
    const isDesktop = window.innerWidth > 992;
    if (isDesktop) {
      card.classList.remove('collapsed');
      card.classList.add('expanded');
    } else {
      card.classList.add('collapsed');
      card.classList.remove('expanded');
    }

    // Toggle click listener
    header.addEventListener('click', () => {
      if (card.classList.contains('collapsed')) {
        card.classList.remove('collapsed');
        card.classList.add('expanded');
      } else {
        card.classList.add('collapsed');
        card.classList.remove('expanded');
      }
    });
  }

  /* --- Recalculate and update sidebar network stats --- */
  function updateNetworkStats() {
    const isLogged = !!currentUser;
    const connCount = Array.from(userConnections.values()).filter(c => c.status === 'accepted').length;
    const followCount = userFollows.users.size;
    const schoolFollowCount = userFollows.schools.size;
    const alumniCount = allProfiles.filter(p => p.user_type === 'alumni').length;

    const elConn = document.getElementById('stat-connections-count');
    const elFollow = document.getElementById('stat-following-count');
    const elSchool = document.getElementById('stat-schools-count');
    const elAlumni = document.getElementById('stat-alumni-count');
    const elEvents = document.getElementById('stat-events-count');

    const elConnMob = document.getElementById('mobile-stat-connections-count');
    const elFollowMob = document.getElementById('mobile-stat-following-count');
    const elSchoolMob = document.getElementById('mobile-stat-schools-count');
    const elAlumniMob = document.getElementById('mobile-stat-alumni-count');
    const elEventsMob = document.getElementById('mobile-stat-events-count');

    function updateBadge(el, val, show) {
      if (!el) return;
      if (show) {
        el.textContent = val;
        el.style.display = 'inline-block';
      } else {
        el.style.display = 'none';
      }
    }

    updateBadge(elConn, connCount, isLogged);
    updateBadge(elFollow, followCount, isLogged);
    updateBadge(elSchool, schoolFollowCount, isLogged);
    updateBadge(elAlumni, alumniCount, isLogged);
    updateBadge(elEvents, 0, false);

    updateBadge(elConnMob, connCount, isLogged);
    updateBadge(elFollowMob, followCount, isLogged);
    updateBadge(elSchoolMob, schoolFollowCount, isLogged);
    updateBadge(elAlumniMob, alumniCount, isLogged);
    updateBadge(elEventsMob, 0, false);
  }

  /* --- Load suggested schools to follow --- */
  async function loadSchoolsSuggestions() {
    const section = document.getElementById('schools-suggestion-section');
    const grid = document.getElementById('schools-suggestions-grid');
    if (!section || !grid) return;

    if (!supabase) {
      suggestedSchools = DEFAULT_SCHOOLS;
      renderSuggestedSchools();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('status', 'approved')
        .limit(6);

      if (error) throw error;

      if (data && data.length > 0) {
        suggestedSchools = data.map(s => ({
          id: s.id,
          name: s.name,
          city: s.city || 'India',
          logoLetter: s.logo_letter || s.name.charAt(0).toUpperCase(),
          colorClass: s.color_class || 'bg-gradient-1',
          verificationBadge: s.verification_badge || 'none'
        }));
      } else {
        suggestedSchools = DEFAULT_SCHOOLS;
      }
    } catch (err) {
      console.warn('Error loading suggested schools, using defaults:', err);
      suggestedSchools = DEFAULT_SCHOOLS;
    }

    renderSuggestedSchools();
  }

  /* --- Render suggested schools grid --- */
  function renderSuggestedSchools() {
    const section = document.getElementById('schools-suggestion-section');
    const grid = document.getElementById('schools-suggestions-grid');
    if (!section || !grid) return;

    if (suggestedSchools.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    grid.innerHTML = '';

    suggestedSchools.forEach(school => {
      const isFollowing = userFollows.schools.has(school.id);
      const badgeHtml = school.verificationBadge === 'blue' ? `
        <svg class="verified-badge verified-badge-md" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified School" style="margin-left:4px; display:inline-block; vertical-align:middle;">
          <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
          <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
        </svg>` : school.verificationBadge === 'gold' ? `
        <svg class="verified-badge verified-badge-md gold" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Gold Partner School" style="margin-left:4px; display:inline-block; vertical-align:middle;">
          <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
          <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
        </svg>` : '';

      const card = document.createElement('div');
      card.className = 'suggested-school-card';
      let profileUrl = `school-profile.html?id=${school.id}`;

      card.innerHTML = `
        <div class="school-logo-box ${school.colorClass}">
          <span>${school.logoLetter}</span>
        </div>
        <div class="school-details">
          <a href="${profileUrl}" class="school-name">${school.name}${badgeHtml}</a>
          <span class="school-location">📍 ${school.city}</span>
        </div>
        <button class="btn ${isFollowing ? 'btn-following' : 'btn-follow'}" 
                data-follow-type="school" data-follow-id="${school.id}">
          ${isFollowing ? 'Following' : 'Follow'}
        </button>
      `;
      grid.appendChild(card);
    });
  }

  /* --- Data Loading --- */
  async function loadProfiles() {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, schools(name, city, verification_badge)')
        .in('user_type', ['student', 'teacher', 'alumni', 'parent'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      allProfiles = data || [];
    } catch (err) {
      console.warn('Error loading profiles:', err);
    }
  }



  async function loadFollows() {
    if (!supabase || !currentUser) return;
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id, following_school_id, follow_type')
        .eq('follower_id', currentUser.id);

      if (error) {
        console.warn('Follows table may not exist yet:', error.message);
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

  async function loadConnections() {
    if (!supabase || !currentUser) return;
    try {
      const { data, error } = await supabase
        .from('connections')
        .select('*')
        .or(`requester_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

      if (error) {
        console.warn('Connections load failed:', error.message);
        return;
      }

      userConnections.clear();
      pendingIncomingRequests = [];

      const pendingRequesters = [];

      (data || []).forEach(c => {
        const otherUserId = c.requester_id === currentUser.id ? c.receiver_id : c.requester_id;
        userConnections.set(otherUserId, c);

        if (c.status === 'pending' && c.receiver_id === currentUser.id) {
          pendingRequesters.push(c.requester_id);
        }
      });

      if (pendingRequesters.length > 0) {
        const { data: profiles, error: pError } = await supabase
          .from('profiles')
          .select('*, schools(name, verification_badge)')
          .in('id', pendingRequesters);

        if (!pError) {
          pendingIncomingRequests = profiles || [];
        }
      }
    } catch (err) {
      console.warn('Error loading connections:', err);
    }
  }

  function renderPendingRequests() {
    const inboxSection = document.getElementById('connections-requests-inbox');
    const grid = document.getElementById('connections-requests-grid');
    const titleEl = document.getElementById('invitations-title');
    const viewAllBtn = document.getElementById('btn-view-all-invitations');
    
    if (!inboxSection || !grid) return;

    if (!currentUser || pendingIncomingRequests.length === 0) {
      inboxSection.style.display = 'none';
      return;
    }

    inboxSection.style.display = 'block';

    if (titleEl) {
      titleEl.textContent = `Invitations (${pendingIncomingRequests.length})`;
    }

    if (viewAllBtn) {
      if (pendingIncomingRequests.length > 3) {
        viewAllBtn.style.display = 'inline-block';
        viewAllBtn.textContent = showAllInvitations ? 'Show Less' : 'View All';
      } else {
        viewAllBtn.style.display = 'none';
      }
    }

    grid.innerHTML = '';

    const displayRequests = showAllInvitations 
      ? pendingIncomingRequests 
      : pendingIncomingRequests.slice(0, 3);

    displayRequests.forEach(p => {
      const card = document.createElement('div');
      card.className = 'invitation-item';
      card.dataset.userId = p.id;

      const displayName = p.full_name || 'CampusLink User';
      const verifiedBadge = p.is_verified ? `
        <svg class="verified-badge verified-badge-md" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Profile">
          <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
          <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
        </svg>
      ` : '';
      const initial = displayName.charAt(0).toUpperCase();
      const typeLabel = auth ? auth.getUserTypeLabel(p.user_type) : p.user_type;
      const schoolName = p.schools?.name || '';
      
      const avatarHtml = p.avatar_url
        ? `<img src="${p.avatar_url}" alt="${displayName}" class="invitation-avatar" onerror="this.onerror=null; this.outerHTML='<div class=&quot;invitation-avatar invitation-avatar-placeholder&quot;>${initial}</div>';">`
        : `<div class="invitation-avatar invitation-avatar-placeholder">${initial}</div>`;

      // Pseudo-random mutual connections count
      const mutualCount = (p.id.charCodeAt(0) + p.id.charCodeAt(p.id.length - 1 || 0)) % 15 + 2;

      let profileUrl = `profile.html?id=${p.id}`;

      card.innerHTML = `
        <div class="invitation-main-content">
          <a href="${profileUrl}" class="invitation-avatar-link">
            ${avatarHtml}
          </a>
          <div class="invitation-details">
            <a href="${profileUrl}" class="invitation-name">${displayName}${verifiedBadge}</a>
            <span class="invitation-headline">${typeLabel}${schoolName ? ` at ${schoolName}` : ''}</span>
            <span class="invitation-mutual">👥 ${mutualCount} mutual connections</span>
          </div>
        </div>
        <div class="invitation-actions">
          <button class="btn-reject-request" data-user-id="${p.id}">Ignore</button>
          <button class="btn-accept-request" data-user-id="${p.id}">Accept</button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  /* --- Filtering --- */
  function getFilteredResults() {
    const q = searchQuery.toLowerCase().trim();
    let people = [];

    if (activeFilter === 'connections') {
      // Accepted connections only
      people = allProfiles.filter(p => {
        if (currentUser && p.id === currentUser.id) return false;
        const conn = userConnections.get(p.id);
        const isConn = conn && conn.status === 'accepted';
        if (!isConn) return false;
        if (!q) return true;
        return matchProfile(p, q);
      });
    } else if (activeFilter === 'all') {
      // People
      people = allProfiles.filter(p => {
        if (currentUser && p.id === currentUser.id) return false;
        if (!q) return true;
        return matchProfile(p, q);
      });
    } else {
      // Specific user type
      people = allProfiles.filter(p => {
        if (currentUser && p.id === currentUser.id) return false;
        if (p.user_type !== activeFilter) return false;
        if (!q) return true;
        return matchProfile(p, q);
      });
    }

    return { people };
  }

  function matchProfile(p, q) {
    return (p.full_name || '').toLowerCase().includes(q) ||
           (p.bio || '').toLowerCase().includes(q) ||
           (p.user_type || '').toLowerCase().includes(q) ||
           (p.schools?.name || '').toLowerCase().includes(q) ||
           (p.schools?.city || '').toLowerCase().includes(q) ||
           (p.skills || []).some(s => s.toLowerCase().includes(q));
  }

  /* --- Render --- */
  function renderCards() {
    const grid = document.getElementById('net-card-grid');
    const emptyState = document.getElementById('net-empty-state');
    const countEl = document.getElementById('net-results-count');
    if (!grid) return;

    const { people } = getFilteredResults();
    const totalCount = people.length;

    // Count label
    if (countEl) {
      if (activeFilter === 'all') {
        countEl.textContent = `${people.length} people found`;
      } else {
        const label = activeFilter === 'alumni' ? 'alumni' : `${activeFilter}${people.length !== 1 ? 's' : ''}`;
        countEl.textContent = `${people.length} ${label} found`;
      }
    }

    if (totalCount === 0) {
      grid.innerHTML = '';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    grid.innerHTML = '';

    // Render people cards
    people.forEach(profile => {
      grid.appendChild(createPersonCard(profile));
    });
  }

  function createPersonCard(p) {
    const card = document.createElement('div');
    card.className = 'net-card net-person-card';
    card.dataset.userId = p.id;

    const displayName = p.full_name || 'CampusLink User';
    const verifiedBadge = p.is_verified ? `
      <svg class="verified-badge verified-badge-md" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Profile">
        <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
        <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
      </svg>
    ` : '';
    const initial = displayName.charAt(0).toUpperCase();
    const typeLabel = auth ? auth.getUserTypeLabel(p.user_type) : p.user_type;
    const schoolName = p.schools?.name || '';
    const bio = p.bio || '';
    const isFollowing = userFollows.users.has(p.id);
    const conn = userConnections.get(p.id);
    let connectBtnHtml = '';

    if (currentUser && currentUser.id !== p.id) {
      if (conn) {
        if (conn.status === 'accepted') {
          connectBtnHtml = `
            <button class="btn-connected" data-connect-id="${p.id}" data-connect-status="accepted" title="Connected - Click to disconnect">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Connected</span>
            </button>
          `;
        } else if (conn.status === 'pending') {
          if (conn.requester_id === currentUser.id) {
            connectBtnHtml = `
              <button class="btn-requested" disabled>
                <span>✓ Requested</span>
              </button>
            `;
          } else {
            connectBtnHtml = `
              <button class="btn-connect" data-connect-id="${p.id}" data-connect-status="pending_received" title="Accept Request">
                <span>Accept</span>
              </button>
            `;
          }
        } else if (conn.status === 'rejected') {
          connectBtnHtml = `
            <button class="btn-connect" data-connect-id="${p.id}" data-connect-status="none" title="Connect">
              <span>Connect</span>
            </button>
          `;
        }
      } else {
        connectBtnHtml = `
          <button class="btn-connect" data-connect-id="${p.id}" data-connect-status="none" title="Connect">
            <span>Connect</span>
          </button>
        `;
      }
    } else if (!currentUser) {
      connectBtnHtml = `
        <button class="btn-connect" data-connect-id="${p.id}" data-connect-status="none" title="Connect">
          <span>Connect</span>
        </button>
      `;
    }

    const followBtnHtml = currentUser && currentUser.id !== p.id ? `
      <button class="btn ${isFollowing ? 'btn-following' : 'btn-follow'}" 
              data-follow-type="user" data-follow-id="${p.id}" title="${isFollowing ? 'Following' : 'Follow'}">
        ${isFollowing ? 'Following' : 'Follow'}
      </button>
    ` : '';

    const avatarHtml = p.avatar_url
      ? `<img src="${p.avatar_url}" alt="${displayName}" class="net-card-avatar-img" onerror="this.onerror=null; this.outerHTML='<div class=&quot;net-card-avatar-placeholder&quot;>${initial}</div>';">`
      : `<div class="net-card-avatar-placeholder">${initial}</div>`;

    let profileUrl = `profile.html?id=${p.id}`;
    if ((p.user_type === 'school_representative' || p.platform_role === 'school_admin') && p.school_id) {
      profileUrl = `school-profile.html?id=${p.school_id}`;
    }

    const mutualCount = (p.id.charCodeAt(0) + p.id.charCodeAt(p.id.length - 1 || 0)) % 25 + 3;

    card.innerHTML = `
      <div class="net-card-banner ${getColorClass(p.user_type)}"></div>
      <div class="net-card-body">
        <a href="${profileUrl}" class="net-card-avatar-link">
          ${avatarHtml}
        </a>
        <a href="${profileUrl}" class="net-card-name">${displayName}${verifiedBadge}</a>
        <span class="net-card-headline">${bio ? truncate(bio, 55) : `${typeLabel}${schoolName ? ` at ${schoolName}` : ''}`}</span>
        <span class="net-card-mutual">👥 ${mutualCount} mutual connections</span>
      </div>
      <div class="net-card-footer">
        ${currentUser && currentUser.id !== p.id ? `
          <div class="suggestion-actions-row">
            ${connectBtnHtml}
            ${followBtnHtml}
          </div>
        ` : `
          <a href="${profileUrl}" class="btn btn-secondary btn-view-profile" style="width: 100%; text-align: center;">View Profile</a>
        `}
      </div>
    `;

    return card;
  }



  /* --- Follow/Unfollow --- */
  async function toggleFollow(btn) {
    if (!currentUser || !supabase) {
      window.location.href = 'login.html';
      return;
    }

    const followType = btn.dataset.followType;
    const followId = btn.dataset.followId;
    const isCurrentlyFollowing = btn.classList.contains('btn-following');

    // Optimistic UI
    btn.disabled = true;

    try {
      if (isCurrentlyFollowing) {
        // Unfollow
        let query = supabase.from('follows').delete().eq('follower_id', currentUser.id);
        if (followType === 'user') {
          query = query.eq('following_id', followId);
          userFollows.users.delete(followId);
        } else {
          query = query.eq('following_school_id', followId);
          userFollows.schools.delete(followId);
        }
        const { error } = await query;
        if (error) throw error;

        btn.className = 'btn btn-follow';
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>Follow</span>
        `;
      } else {
        // Follow
        const insertData = {
          follower_id: currentUser.id,
          follow_type: followType
        };
        if (followType === 'user') {
          insertData.following_id = followId;
          userFollows.users.add(followId);
        } else {
          insertData.following_school_id = followId;
          userFollows.schools.add(followId);
        }

        const { error } = await supabase.from('follows').insert(insertData);
        if (error) throw error;

        btn.className = 'btn btn-following';
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Following</span>
        `;
      }
    } catch (err) {
      console.error('Follow toggle failed:', err);
      showToast(err.message || 'Failed to update follow state', 'error');
      // Revert optimistic update
      if (isCurrentlyFollowing) {
        if (followType === 'user') userFollows.users.add(followId);
        else userFollows.schools.add(followId);
      } else {
        if (followType === 'user') userFollows.users.delete(followId);
        else userFollows.schools.delete(followId);
      }
    } finally {
      btn.disabled = false;
      if (typeof renderSearchOverlayResults === 'function') {
        renderSearchOverlayResults();
      }
      renderSuggestedSchools();
      renderCards();
    }
  }

  /* --- Connection Actions --- */
  async function toggleConnection(btn) {
    if (!currentUser || !supabase) {
      window.location.href = 'login.html';
      return;
    }

    const targetUserId = btn.dataset.connectId;
    const currentStatus = btn.dataset.connectStatus;
    btn.disabled = true;

    try {
      if (currentStatus === 'none') {
        // Send request (delete any existing rejected row first)
        await supabase
          .from('connections')
          .delete()
          .or(`and(requester_id.eq.${currentUser.id},receiver_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},receiver_id.eq.${currentUser.id})`);

        const { error } = await supabase
          .from('connections')
          .insert({
            requester_id: currentUser.id,
            receiver_id: targetUserId,
            status: 'pending'
          });

        if (error) throw error;
        showToast('Connection request sent');

        // Trigger notification
        if (window.CampusLink && window.CampusLink.notifications) {
          try {
            const { data: requesterProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', currentUser.id)
              .single();
            const actorName = requesterProfile?.full_name || 'Someone';
            await window.CampusLink.notifications.createNotification(
              targetUserId,
              'connection_request',
              `${actorName} sent you a connection request`,
              `Click to view networking requests`,
              `networking.html`,
              currentUser.id
            );
          } catch (notifErr) {
            console.warn('Error sending connection request notification:', notifErr);
          }
        }
      } else if (currentStatus === 'pending_sent') {
        // Withdraw request
        const { error } = await supabase
          .from('connections')
          .delete()
          .eq('requester_id', currentUser.id)
          .eq('receiver_id', targetUserId);

        if (error) throw error;
        showToast('Connection request withdrawn');
      } else if (currentStatus === 'pending_received') {
        // Accept request
        const { error } = await supabase
          .from('connections')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('requester_id', targetUserId)
          .eq('receiver_id', currentUser.id);

        if (error) throw error;
        showToast('Connection request accepted! You are now connected.');

        // Trigger notification
        if (window.CampusLink && window.CampusLink.notifications) {
          try {
            const { data: accepterProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', currentUser.id)
              .single();
            const actorName = accepterProfile?.full_name || 'Someone';
            await window.CampusLink.notifications.createNotification(
              targetUserId,
              'connection_accepted',
              `${actorName} accepted your connection request`,
              `You are now connected!`,
              `profile.html?id=${currentUser.id}`,
              currentUser.id
            );
          } catch (notifErr) {
            console.warn('Error sending connection accepted notification:', notifErr);
          }
        }
      } else if (currentStatus === 'accepted') {
        // Disconnect
        if (confirm('Are you sure you want to disconnect?')) {
          const { error } = await supabase
            .from('connections')
            .delete()
            .or(`and(requester_id.eq.${currentUser.id},receiver_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},receiver_id.eq.${currentUser.id})`);

          if (error) throw error;
          showToast('Disconnected successfully');
        } else {
          btn.disabled = false;
          return;
        }
      }

      await loadConnections();
      renderPendingRequests();
      renderCards();
      if (typeof renderSearchOverlayResults === 'function') {
        renderSearchOverlayResults();
      }
    } catch (err) {
      console.error('Connection action failed:', err);
      showToast(err.message || 'Action failed', 'error');
    } finally {
      btn.disabled = false;
      if (typeof renderSearchOverlayResults === 'function') {
        renderSearchOverlayResults();
      }
    }
  }

  /* --- Event Listeners --- */
  function setupEventListeners() {
    // Filter tabs
    const tabs = document.querySelectorAll('.net-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeFilter = tab.dataset.filter;
        renderCards();
      });
    });

    // Search input (debounced)
    const searchInput = document.getElementById('net-search-input');
    let debounceTimer;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          searchQuery = searchInput.value;
          renderCards();
        }, 300);
      });
    }

    // Follow & Connect button delegation
    const grid = document.getElementById('net-card-grid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const followBtn = e.target.closest('.btn-follow, .btn-following');
        if (followBtn) {
          e.preventDefault();
          e.stopPropagation();
          toggleFollow(followBtn);
        }

        const connectBtn = e.target.closest('.btn-connect, .btn-requested, .btn-connected');
        if (connectBtn) {
          e.preventDefault();
          e.stopPropagation();
          toggleConnection(connectBtn);
        }
      });
    }

    // Suggested schools follow delegation
    const schoolsGrid = document.getElementById('schools-suggestions-grid');
    if (schoolsGrid) {
      schoolsGrid.addEventListener('click', (e) => {
        const followBtn = e.target.closest('.btn-follow, .btn-following');
        if (followBtn) {
          e.preventDefault();
          e.stopPropagation();
          toggleFollow(followBtn);
        }
      });
    }

    // View All Invitations click toggler
    const viewAllBtn = document.getElementById('btn-view-all-invitations');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', () => {
        showAllInvitations = !showAllInvitations;
        renderPendingRequests();
      });
    }

    // Pending requests grid delegation
    const reqGrid = document.getElementById('connections-requests-grid');
    if (reqGrid) {
      reqGrid.addEventListener('click', async (e) => {
        const acceptBtn = e.target.closest('.btn-accept-request');
        const rejectBtn = e.target.closest('.btn-reject-request');
        if (!acceptBtn && !rejectBtn) return;

        const targetUserId = acceptBtn ? acceptBtn.dataset.userId : rejectBtn.dataset.userId;
        const btn = acceptBtn || rejectBtn;
        
        if (!supabase || !currentUser) return;
        btn.disabled = true;

        try {
          if (acceptBtn) {
            const { error } = await supabase
              .from('connections')
              .update({ status: 'accepted', updated_at: new Date().toISOString() })
              .eq('requester_id', targetUserId)
              .eq('receiver_id', currentUser.id);

            if (error) throw error;
            showToast('Connection request accepted!');

            // Trigger notification
            if (window.CampusLink && window.CampusLink.notifications) {
              try {
                const { data: accepterProfile } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('id', currentUser.id)
                  .single();
                const actorName = accepterProfile?.full_name || 'Someone';
                await window.CampusLink.notifications.createNotification(
                  targetUserId,
                  'connection_accepted',
                  `${actorName} accepted your connection request`,
                  `You are now connected!`,
                  `profile.html?id=${currentUser.id}`,
                  currentUser.id
                );
              } catch (notifErr) {
                console.warn('Error sending connection accepted notification:', notifErr);
              }
            }
          } else {
            const { error } = await supabase
              .from('connections')
              .update({ status: 'rejected', updated_at: new Date().toISOString() })
              .eq('requester_id', targetUserId)
              .eq('receiver_id', currentUser.id);

            if (error) throw error;
            showToast('Connection request ignored');
          }

          // Reload and update
          await loadConnections();
          renderPendingRequests();
          renderCards();
        } catch (err) {
          console.error('Pending request action failed:', err);
          showToast(err.message || 'Action failed', 'error');
        } finally {
          btn.disabled = false;
        }
      });
    }

    // Newsletter form
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
      newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = newsletterForm.querySelector('input');
        if (input.value.trim()) {
          const btn = newsletterForm.querySelector('button');
          btn.textContent = 'Subscribed!';
          btn.disabled = true;
          input.value = '';
          input.disabled = true;
          setTimeout(() => {
            btn.textContent = 'Subscribe';
            btn.disabled = false;
            input.disabled = false;
          }, 3000);
        }
      });
    }
  
    // --- Mobile UX Event Listeners ---
    
    // 1. Mobile Inline Search Events
    const mobSearchInput = document.getElementById('mobile-search-input');
    const mobClearBtn = document.getElementById('btn-clear-mobile-search');
    const mobInlineResults = document.getElementById('mobile-inline-search-results');
    
    // Elements to hide temporarily
    const suggestionsCard = document.querySelector('.suggestions-card');
    const invitationsCard = document.getElementById('connections-requests-inbox');
    const schoolsSection = document.getElementById('schools-suggestion-section');

    function syncSearchState() {
      const query = (mobSearchInput?.value || '').trim();
      if (mobClearBtn) mobClearBtn.style.display = query ? 'block' : 'none';

      if (query.length > 0) {
        // Expand search state
        if (mobInlineResults) mobInlineResults.style.display = 'block';
        if (suggestionsCard) suggestionsCard.style.display = 'none';
        if (invitationsCard) invitationsCard.style.display = 'none';
        if (schoolsSection) schoolsSection.style.display = 'none';
        
        renderSearchOverlayResults();
      } else {
        // Restore recommendations when search is cleared/empty
        if (mobInlineResults) mobInlineResults.style.display = 'none';
        if (suggestionsCard) suggestionsCard.style.display = 'block';
        if (schoolsSection) schoolsSection.style.display = 'block';
        
        if (invitationsCard) {
          if (pendingIncomingRequests && pendingIncomingRequests.length > 0) {
            invitationsCard.style.display = 'block';
          } else {
            invitationsCard.style.display = 'none';
          }
        }
      }
    }

    if (mobSearchInput) {
      mobSearchInput.addEventListener('input', syncSearchState);
      mobSearchInput.addEventListener('focus', syncSearchState);
    }

    if (mobClearBtn && mobSearchInput) {
      mobClearBtn.addEventListener('click', () => {
        mobSearchInput.value = '';
        syncSearchState();
        mobSearchInput.focus();
      });
    }

    // Filter chip listeners inside inline search
    const searchChips = document.querySelectorAll('.search-filter-chip');
    searchChips.forEach(chip => {
      chip.addEventListener('click', () => {
        searchChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        renderSearchOverlayResults();
      });
    });

    // 2. Mobile Bottom Sheet Triggers (Manage Network)
    const btnMobileNetwork = document.getElementById('btn-mobile-network');
    const mobileNetworkOverlay = document.getElementById('mobile-network-overlay');
    const mobileNetworkSheet = document.getElementById('mobile-network-sheet');
    const btnCloseSheet = document.getElementById('btn-close-sheet');

    const openBottomSheet = () => {
      if (mobileNetworkOverlay && mobileNetworkSheet) {
        mobileNetworkOverlay.classList.add('active');
        mobileNetworkSheet.classList.add('active');
      }
    };

    const closeBottomSheet = () => {
      if (mobileNetworkOverlay && mobileNetworkSheet) {
        mobileNetworkOverlay.classList.remove('active');
        mobileNetworkSheet.classList.remove('active');
      }
    };

    if (btnMobileNetwork) {
      btnMobileNetwork.addEventListener('click', openBottomSheet);
    }

    if (btnCloseSheet) {
      btnCloseSheet.addEventListener('click', closeBottomSheet);
    }

    if (mobileNetworkOverlay) {
      mobileNetworkOverlay.addEventListener('click', closeBottomSheet);
    }

    // Mobile Bottom Sheet list items filtering
    const mobileNetworkItems = document.querySelectorAll('.mobile-network-item');
    mobileNetworkItems.forEach(item => {
      item.addEventListener('click', () => {
        const filter = item.dataset.filter;
        
        let matchedTab = null;
        if (filter === 'connections') matchedTab = document.getElementById('net-tab-connections');
        else if (filter === 'student') matchedTab = document.querySelector('.net-tab[data-filter="student"]');
        else if (filter === 'teacher') matchedTab = document.querySelector('.net-tab[data-filter="teacher"]');
        else if (filter === 'alumni') matchedTab = document.querySelector('.net-tab[data-filter="alumni"]');
        
        if (matchedTab) {
          // Trigger click on corresponding desktop tab
          matchedTab.click();
          
          // Scroll Suggestions section into view
          const suggestionsSec = document.querySelector('.suggestions-card');
          if (suggestionsSec) {
            suggestionsSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } else if (filter === 'following') {
          // Filter dynamically
          const tabsList = document.querySelectorAll('.net-tab');
          tabsList.forEach(t => t.classList.remove('active'));
          activeFilter = 'following';
          renderCards();
          const suggestionsSec = document.querySelector('.suggestions-card');
          if (suggestionsSec) {
            suggestionsSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } else if (filter === 'schools') {
          const schoolsSec = document.getElementById('schools-suggestion-section');
          if (schoolsSec) {
            schoolsSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } else if (filter === 'events') {
          window.location.href = 'events.html';


        closeBottomSheet();
      });
    });

    // 3. Search Overlay delegation for connection/follow actions
    const overlayResultsContainer = document.getElementById('mobile-inline-results-list');
    if (overlayResultsContainer) {
      overlayResultsContainer.addEventListener('click', (e) => {
        const followBtn = e.target.closest('.btn-follow, .btn-following');
        if (followBtn) {
          e.preventDefault();
          e.stopPropagation();
          toggleFollow(followBtn);
        }

        const connectBtn = e.target.closest('.btn-connect, .btn-requested, .btn-connected');
        if (connectBtn) {
          e.preventDefault();
          e.stopPropagation();
          toggleConnection(connectBtn);
        }
      });
    }
  }

  /* --- Mobile Search Overlay Results Generator --- */
  function renderSearchOverlayResults() {
    const resultsContainer = document.getElementById('mobile-inline-results-list');
    if (!resultsContainer) return;

    const query = (document.getElementById('mobile-search-input')?.value || '').toLowerCase().trim();
    
    // Find active chip type
    const activeChip = document.querySelector('.search-filter-chip.active');
    const filterType = activeChip ? activeChip.dataset.type : 'all';

    // Clear search button visibility
    const clearBtn = document.getElementById('btn-clear-mobile-search');
    if (clearBtn) {
      clearBtn.style.display = query ? 'block' : 'none';
    }

    if (!query) {
      resultsContainer.innerHTML = `
        <div class="search-empty-state">
          <p>Type to search for students, alumni, teachers, or schools.</p>
        </div>
      `;
      return;
    }

    let matchingPeople = [];
    let matchingSchools = [];

    // Filter people
    if (filterType === 'all' || filterType === 'student' || filterType === 'alumni' || filterType === 'teacher') {
      matchingPeople = allProfiles.filter(p => {
        if (currentUser && p.id === currentUser.id) return false;
        
        // Filter by user type if specified
        if (filterType !== 'all' && p.user_type !== filterType) return false;

        // Match query
        return matchProfile(p, query);
      });
    }

    // Filter schools
    if (filterType === 'all' || filterType === 'school') {
      matchingSchools = suggestedSchools.filter(school => {
        return (school.name || '').toLowerCase().includes(query) ||
               (school.city || '').toLowerCase().includes(query);
      });
    }

    const totalResults = matchingPeople.length + matchingSchools.length;

    if (totalResults === 0) {
      resultsContainer.innerHTML = `
        <div class="search-empty-state">
          <p>No results found for "${query}".</p>
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = '';

    // Render matching people
    matchingPeople.forEach(p => {
      const row = document.createElement('div');
      row.className = 'search-result-row';
      row.dataset.userId = p.id;
      
      const displayName = p.full_name || 'CampusLink User';
      const verifiedBadge = p.is_verified ? `
        <svg class="verified-badge verified-badge-md" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Profile" style="display: inline-block; vertical-align: middle; margin-left: 4px;">
          <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
          <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
        </svg>
      ` : '';
      
      const initial = displayName.charAt(0).toUpperCase();
      const typeLabel = auth ? auth.getUserTypeLabel(p.user_type) : p.user_type;
      const schoolName = p.schools?.name || '';
      
      const avatarHtml = p.avatar_url
        ? `<img src="${p.avatar_url}" alt="${displayName}" class="result-avatar" onerror="this.onerror=null; this.outerHTML='<div class=&quot;result-avatar result-avatar-placeholder&quot;>${initial}</div>';">`
        : `<div class="result-avatar result-avatar-placeholder">${initial}</div>`;
      
      const mutualCount = (p.id.charCodeAt(0) + p.id.charCodeAt(p.id.length - 1 || 0)) % 15 + 2;
      const profileUrl = `profile.html?id=${p.id}`;

      let actionBtnHtml = '';
      if (currentUser && currentUser.id !== p.id) {
        const conn = userConnections.get(p.id);
        if (conn) {
          if (conn.status === 'accepted') {
            actionBtnHtml = `
              <button class="btn-connect btn-connected" data-connect-id="${p.id}" data-connect-status="accepted">
                Connected
              </button>
            `;
          } else if (conn.status === 'pending') {
            if (conn.requester_id === currentUser.id) {
              actionBtnHtml = `
                <button class="btn-connect btn-requested" data-connect-id="${p.id}" data-connect-status="pending_sent">
                  <span>Requested</span>
                </button>
              `;
            } else {
              actionBtnHtml = `
                <button class="btn-connect btn-requested" data-connect-id="${p.id}" data-connect-status="pending_received">
                  <span>Accept</span>
                </button>
              `;
            }
          }
        } else {
          actionBtnHtml = `
            <button class="btn-connect" data-connect-id="${p.id}" data-connect-status="none">
              Connect
            </button>
          `;
        }
      }

      row.innerHTML = `
        <a href="${profileUrl}" class="result-avatar-link">
          ${avatarHtml}
        </a>
        <div class="result-info">
          <a href="${profileUrl}" class="result-name">${displayName}${verifiedBadge}</a>
          <span class="result-headline">${typeLabel}${schoolName ? ` at ${schoolName}` : ''}</span>
          <span class="result-subtext">👥 ${mutualCount} mutual connections</span>
        </div>
        <div class="result-actions">
          ${actionBtnHtml}
        </div>
      `;
      resultsContainer.appendChild(row);
    });

    // Render matching schools
    matchingSchools.forEach(school => {
      const row = document.createElement('div');
      row.className = 'search-result-row';
      row.dataset.schoolId = school.id;
      
      const isFollowing = userFollows.schools.has(school.id);
      const badgeHtml = school.verificationBadge === 'blue' ? `
        <svg class="verified-badge verified-badge-md" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified School" style="margin-left:4px; display:inline-block; vertical-align:middle; width: 14px; height: 14px;">
          <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274c.075-1.299-.165-1.903c.586-.274" fill="currentColor"/>
          <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
        </svg>` : school.verificationBadge === 'gold' ? `
        <svg class="verified-badge verified-badge-md gold" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Gold Partner School" style="margin-left:4px; display:inline-block; vertical-align:middle; width: 14px; height: 14px;">
          <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274" fill="currentColor"/>
          <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
        </svg>` : '';
      
      const profileUrl = `school-profile.html?id=${school.id}`;

      row.innerHTML = `
        <a href="${profileUrl}" class="result-avatar-link">
          <div class="result-avatar result-avatar-school ${school.colorClass}">
            <span>${school.logoLetter}</span>
          </div>
        </a>
        <div class="result-info">
          <a href="${profileUrl}" class="result-name">${school.name}${badgeHtml}</a>
          <span class="result-headline">School &bull; ${school.city}</span>
          <span class="result-subtext">📍 ${school.city}</span>
        </div>
        <div class="result-actions">
          <button class="btn ${isFollowing ? 'btn-following' : 'btn-follow'}" 
                  data-follow-type="school" data-follow-id="${school.id}">
            ${isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>
      `;
      resultsContainer.appendChild(row);
    });
  }

  /* --- Helpers --- */
  function getColorClass(userType) {
    const colors = {
      student: 'color-1',
      teacher: 'color-2',
      alumni: 'color-4',
      parent: 'color-5',
      school_representative: 'color-3'
    };
    return colors[userType] || 'color-1';
  }

  function truncate(str, maxLen) {
    if (!str || str.length <= maxLen) return str || '';
    return str.substring(0, maxLen).trim() + '...';
  }

  // Toast notifications
  const toastContainer = document.getElementById('toast-container');
  function showToast(message, type = 'success') {
    if (!toastContainer) return;
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
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }

  // Boot
  init();
});
