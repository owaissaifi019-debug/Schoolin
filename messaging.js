// messaging.js
// SchoolIn LinkedIn-style Messaging Controller
// Handles inbox sidebar, active conversations, real-time sync, accept/ignore request flow, and mobile responsiveness.

(function () {
  'use strict';

  // State
  let currentUser = null;
  let currentUserProfile = null;
  let conversations = [];
  let activeChatId = null;
  let currentTab = 'active'; // 'active' or 'requests'
  let conversationSearchQuery = '';
  let realtimeChannelMessages = null;
  let realtimeChannelConversations = null;

  // DOM Elements
  const conversationList = document.getElementById('conversation-list');
  const chatEmptyState = document.getElementById('chat-empty-state');
  const chatActiveInterface = document.getElementById('chat-active-interface');
  const chatRecipientAvatar = document.getElementById('chat-recipient-avatar');
  const chatRecipientName = document.getElementById('chat-recipient-name');
  const chatRecipientHeadline = document.getElementById('chat-recipient-headline');
  const chatHeaderActions = document.getElementById('chat-header-actions');
  const messageRequestBar = document.getElementById('message-request-bar');
  const requestBarText = document.getElementById('request-bar-text');
  const btnAcceptRequest = document.getElementById('btn-accept-request');
  const btnIgnoreRequest = document.getElementById('btn-ignore-request');
  const messageHistory = document.getElementById('message-history');
  const chatSendForm = document.getElementById('chat-send-form');
  const chatMessageInput = document.getElementById('chat-message-input');
  const btnSendMessage = document.getElementById('btn-send-message');
  const conversationSearch = document.getElementById('conversation-search');
  const tabActiveChats = document.getElementById('tab-active-chats');
  const tabMessageRequests = document.getElementById('tab-message-requests');
  const requestsCountBadge = document.getElementById('requests-count-badge');
  const btnChatBack = document.getElementById('btn-chat-back');
  const messagingCard = document.querySelector('.messaging-card');

  // Helper getters
  function getSupabase() {
    return window.CampusLink?.supabase;
  }

  function getAuth() {
    return window.CampusLink?.auth;
  }

  // --- Initialise Module ---
  async function init() {
    const auth = getAuth();
    if (!auth) {
      console.error('Auth module not loaded.');
      return;
    }

    // Update nav auth buttons
    await auth.updateNavAuthState();

    // Bind Mobile menu toggle
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

    // Verify session
    const session = await auth.getSession();
    if (!session || !session.user) {
      // Access denied for guests
      window.location.href = 'login.html';
      return;
    }

    currentUser = session.user;
    currentUserProfile = await auth.getProfile(currentUser.id);

    // Initial load
    await loadConversations();
    setupEventListeners();
    setupRealtimeSubscription();

    // Check query params
    const urlParams = new URLSearchParams(window.location.search);
    const chatIdParam = urlParams.get('chat_id');
    const newChatWithUser = urlParams.get('new_chat_with');

    if (chatIdParam) {
      selectConversation(chatIdParam);
    } else if (newChatWithUser) {
      await initNewDirectChat(newChatWithUser);
    }
  }

  // --- Load and Render Conversations ---
  async function loadConversations() {
    const sb = getSupabase();
    if (!sb || !currentUser) return;

    try {
      const mySchoolId = currentUserProfile?.school_id;
      const isSchoolRep = currentUserProfile?.user_type === 'school_representative';

      // 1. Fetch participants rows matching current user (or their school)
      let query = sb.from('conversation_participants').select('conversation_id');

      if (isSchoolRep && mySchoolId) {
        query = query.or(`user_id.eq.${currentUser.id},school_id.eq.${mySchoolId}`);
      } else {
        query = query.eq('user_id', currentUser.id);
      }

      const { data: myParticipants, error: err1 } = await query;
      if (err1) throw err1;

      if (!myParticipants || myParticipants.length === 0) {
        conversations = [];
        renderConversationList();
        updateRequestsCountBadge();
        return;
      }

      const conversationIds = myParticipants.map(p => p.conversation_id);

      // 2. Fetch conversations details
      const { data: convData, error: err2 } = await sb
        .from('conversations')
        .select(`
          *,
          conversation_participants (
            *,
            profile:profiles(
              id, 
              full_name, 
              avatar_url, 
              user_type, 
              class, 
              is_verified,
              school_id,
              username,
              school:schools(id, name)
            ),
            school:schools(id, name, logo_letter, color_class, city, board, verification_badge, logo_url)
          ),
          messages (
            id,
            message,
            sender_id,
            created_at,
            read_status
          )
        `)
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (err2) throw err2;

      conversations = convData || [];

      // Sort messages inside conversations since PostgREST ordering might vary
      conversations.forEach(c => {
        if (c.messages && c.messages.length > 0) {
          c.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        }
      });

      renderConversationList();
      updateRequestsCountBadge();

      // Refresh current active chat if open
      if (activeChatId) {
        const updatedActive = conversations.find(c => c.id === activeChatId);
        if (updatedActive) {
          renderActiveChat(updatedActive);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
      showToast('Error loading inbox: ' + err.message, 'error');
    }
  }

  // Helper to parse participant info
  function getOtherParticipant(conv) {
    const isSchoolRep = currentUserProfile?.user_type === 'school_representative';
    const mySchoolId = currentUserProfile?.school_id;

    // Filter participants that are NOT current user
    const otherPart = conv.conversation_participants.find(p => {
      if (p.user_id && p.user_id !== currentUser.id) return true;
      if (p.school_id && (!isSchoolRep || p.school_id !== mySchoolId)) return true;
      return false;
    });

    if (!otherPart) {
      const firstPart = conv.conversation_participants[0];
      if (firstPart?.school) {
        return {
          id: firstPart.school_id || firstPart.school.id,
          name: firstPart.school.name,
          logoLetter: firstPart.school.logo_letter || firstPart.school.name.charAt(0).toUpperCase(),
          colorClass: firstPart.school.color_class || 'bg-gradient-1',
          avatarUrl: firstPart.school.logo_url || null,
          headline: `${firstPart.school.city || 'India'} • School Account`,
          isSchool: true,
          city: firstPart.school.city || 'India',
          board: firstPart.school.board || 'CBSE',
          verificationBadge: firstPart.school.verification_badge || 'blue'
        };
      } else if (firstPart?.profile) {
        const auth = getAuth();
        const roleLabel = auth ? auth.getUserTypeLabel(firstPart.profile.user_type) : 'Member';
        const headline = firstPart.profile.class ? `${firstPart.profile.class} • ${roleLabel}` : roleLabel;
        return {
          id: firstPart.user_id || firstPart.profile.id,
          name: firstPart.profile.full_name || 'Member',
          avatarUrl: firstPart.profile.avatar_url,
          logoLetter: (firstPart.profile.full_name || 'M').charAt(0).toUpperCase(),
          colorClass: 'bg-gradient-1',
          headline: headline,
          isSchool: false,
          isVerified: firstPart.profile.is_verified,
          userType: roleLabel,
          schoolName: firstPart.profile.school?.name || 'Not Linked',
          username: firstPart.profile.username
        };
      }
      return { id: 'unknown', name: 'SchoolIn Member', avatarUrl: null, logoLetter: 'S', headline: '', isSchool: false };
    }

    if (otherPart.school_id || otherPart.school) {
      const schoolObj = otherPart.school || {};
      const schoolName = schoolObj.name || 'School';
      return {
        id: otherPart.school_id || schoolObj.id,
        name: schoolName,
        logoLetter: schoolObj.logo_letter || schoolName.charAt(0).toUpperCase(),
        colorClass: schoolObj.color_class || 'bg-gradient-1',
        avatarUrl: schoolObj.logo_url || null,
        headline: `${schoolObj.city || 'India'} • School Account`,
        isSchool: true,
        city: schoolObj.city || 'India',
        board: schoolObj.board || 'CBSE',
        verificationBadge: schoolObj.verification_badge || 'blue'
      };
    } else {
      const profileObj = otherPart.profile || {};
      const auth = getAuth();
      const roleLabel = profileObj.user_type ? auth.getUserTypeLabel(profileObj.user_type) : 'Member';
      const headline = profileObj.class ? `${profileObj.class} • ${roleLabel}` : roleLabel;
      return {
        id: otherPart.user_id || profileObj.id,
        name: profileObj.full_name || 'Member',
        avatarUrl: profileObj.avatar_url || null,
        logoLetter: (profileObj.full_name || '?').charAt(0).toUpperCase(),
        colorClass: 'bg-gradient-1',
        headline: headline,
        isSchool: false,
        isVerified: !!profileObj.is_verified,
        userType: roleLabel,
        schoolName: profileObj.school?.name || 'Not Linked',
        username: profileObj.username
      };
    }
  }

  // --- Render Conversation Sidebar List ---
  function renderConversationList() {
    if (!conversationList) return;

    // Filter conversations based on Tab and Search Query
    const filtered = conversations.filter(c => {
      // 1. Tab filter
      // Active Tab contains status = 'accepted'
      // Requests Tab contains status = 'pending' (and we are NOT the initiator)
      // Wait, let's look at pending requests:
      // If conversation is pending:
      // - If we are initiator, we show it in Chats as "requested" or pending
      // - If we are receiver, it goes to Requests tab!
      const isInitiator = c.initiator_id === currentUser.id;

      if (currentTab === 'active') {
        // Show accepted conversations, and pending conversations only if we are the initiator
        if (c.status === 'ignored') return false;
        if (c.status === 'pending' && !isInitiator) return false; // Receiver sees pending only in Requests tab
      } else {
        // Show pending requests where we are the receiver
        if (c.status !== 'pending' || isInitiator) return false;
      }

      // 2. Search filter
      if (conversationSearchQuery.trim() !== '') {
        const other = getOtherParticipant(c);
        const search = conversationSearchQuery.toLowerCase();
        const nameMatch = other.name.toLowerCase().includes(search);
        const lastMsgMatch = c.messages && c.messages.length > 0 && c.messages[c.messages.length - 1].message.toLowerCase().includes(search);
        return nameMatch || lastMsgMatch;
      }

      return true;
    });

    conversationList.innerHTML = '';

    if (filtered.length === 0) {
      conversationList.innerHTML = `
        <div class="list-empty-state">
          <span>📬</span>
          <p>${conversationSearchQuery ? 'No matching conversations' : 'No messages here yet'}</p>
        </div>
      `;
      return;
    }

    filtered.forEach(conv => {
      const other = getOtherParticipant(conv);
      const item = document.createElement('div');
      item.className = `conversation-item ${conv.id === activeChatId ? 'active' : ''}`;
      
      // Calculate unread status:
      // If last message is sent by other party and read_status is false
      let isUnread = false;
      if (conv.messages && conv.messages.length > 0) {
        const lastMsg = conv.messages[conv.messages.length - 1];
        if (lastMsg.sender_id !== currentUser.id && !lastMsg.read_status) {
          isUnread = true;
        }
      }
      if (isUnread) item.classList.add('unread');

      // Avatar setup
      let avatarHtml = '';
      if (other.isSchool) {
        if (other.avatarUrl) {
          avatarHtml = `<div class="conversation-avatar" style="background-image: url(${other.avatarUrl}); border-radius:var(--radius-sm);"></div>`;
        } else {
          avatarHtml = `<div class="conversation-avatar ${other.colorClass}" style="border-radius:var(--radius-sm); color:var(--white);">${other.logoLetter}</div>`;
        }
      } else if (other.avatarUrl) {
        avatarHtml = `<div class="conversation-avatar" style="background-image: url(${other.avatarUrl});"></div>`;
      } else {
        avatarHtml = `<div class="conversation-avatar">${other.logoLetter}</div>`;
      }

      // Last message summary
      let lastMsgText = 'No messages yet';
      let lastMsgTime = '';
      if (conv.messages && conv.messages.length > 0) {
        const lastMsg = conv.messages[conv.messages.length - 1];
        lastMsgText = lastMsg.message.startsWith('[Inquiry:') ? lastMsg.message.substring(lastMsg.message.indexOf(']') + 2) : lastMsg.message;
        
        const msgDate = new Date(lastMsg.created_at);
        const today = new Date();
        if (msgDate.toDateString() === today.toDateString()) {
          lastMsgTime = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
          lastMsgTime = msgDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
      }

      // Verification badge SVG
      let verificationBadgeHtml = '';
      if (other.isSchool) {
        if (other.verificationBadge === 'gold') {
          verificationBadgeHtml = `
            <svg class="verified-badge verified-badge-sm gold" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Gold Partner School">
              <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
              <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
            </svg>
          `;
        } else if (other.verificationBadge === 'blue') {
          verificationBadgeHtml = `
            <svg class="verified-badge verified-badge-sm" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified School">
              <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
              <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
            </svg>
          `;
        }
      } else if (other.isVerified) {
        verificationBadgeHtml = `
          <svg class="verified-badge verified-badge-sm" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Profile">
            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
            <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
          </svg>
        `;
      }

      // Determine colored category
      let category = 'Networking';
      let categoryClass = 'networking';
      if (conv.inquiry_type === 'admissions') {
        category = 'Admission';
        categoryClass = 'admission';
      } else if (conv.inquiry_type === 'events') {
        category = 'Event';
        categoryClass = 'event';
      } else if (conv.inquiry_type === 'general_inquiry') {
        category = 'Networking';
        categoryClass = 'networking';
      } else {
        if (other.userType && (other.userType.toLowerCase().includes('alumni') || other.userType.toLowerCase().includes('teacher') || other.userType.toLowerCase().includes('mentor'))) {
          category = 'Mentorship';
          categoryClass = 'mentorship';
        } else {
          category = 'Networking';
          categoryClass = 'networking';
        }
      }

      let categoryBadgeHtml = `<span class="category-card-badge ${categoryClass}">${category}</span>`;

      // Pending badge if sent request
      let statusBadge = '';
      if (conv.status === 'pending' && conv.initiator_id === currentUser.id) {
        statusBadge = `<span class="status-badge-sent">Sent Request</span>`;
      }

      // Unread badge layout (LinkedIn style green or primary dot)
      let unreadDotHtml = isUnread ? `<span class="unread-dot-indicator"></span>` : '';

      item.innerHTML = `
        ${avatarHtml}
        <div class="conversation-info">
          <div class="conversation-meta-row">
            <span class="conversation-name">${other.name}${verificationBadgeHtml}</span>
            <span class="conversation-time">${lastMsgTime}</span>
          </div>
          ${(!other.isSchool && other.username) ? `<div class="conversation-username" style="font-size: 0.75rem; color: var(--text-muted); font-weight: 400; margin-top: 1px; margin-bottom: 2px;">@${other.username}</div>` : ''}
          <p class="conversation-last-msg">${lastMsgText}</p>
          <div class="conversation-badges-row">
            ${categoryBadgeHtml}
            ${statusBadge}
          </div>
        </div>
        ${unreadDotHtml}
      `;

      item.addEventListener('click', () => selectConversation(conv.id));
      conversationList.appendChild(item);
    });
  }

  // --- Toggle Requests Badges ---
  function updateRequestsCountBadge() {
    if (!requestsCountBadge) return;

    // Count pending conversations where we are NOT initiator
    const pendingCount = conversations.filter(c => c.status === 'pending' && c.initiator_id !== currentUser.id).length;

    if (pendingCount > 0) {
      requestsCountBadge.style.display = 'inline-flex';
      requestsCountBadge.textContent = pendingCount;
    } else {
      requestsCountBadge.style.display = 'none';
    }
  }

  // --- Select a Conversation ---
  async function selectConversation(chatId) {
    activeChatId = chatId;

    // Highlight item
    const items = conversationList.querySelectorAll('.conversation-item');
    items.forEach(el => el.classList.remove('active'));

    // Find in local array
    const conv = conversations.find(c => c.id === chatId);
    if (!conv) {
      console.warn('Selected conversation not found locally, loading all...');
      return;
    }

    // Update URL query parameter without reloading
    const newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + `?chat_id=${chatId}`;
    window.history.pushState({ chatOpen: true, chatId: chatId }, '', newurl);

    // Mobile view transition
    if (messagingCard) {
      messagingCard.classList.add('chat-open');
    }

    renderActiveChat(conv);
    await markMessagesAsRead(conv);
  }

  // Toggle collapsible profile panel state
  let profilePanelCollapsed = false;

  function renderProfilePanel(other) {
    const panel = document.getElementById('chat-profile-panel');
    if (!panel) return;

    if (profilePanelCollapsed) {
      panel.style.display = 'none';
      if (messagingCard) {
        messagingCard.classList.remove('profile-panel-open');
      }
      return;
    }

    panel.style.display = 'block';
    if (messagingCard) {
      messagingCard.classList.add('profile-panel-open');
    }

    let contentHtml = '';
    if (other.isSchool) {
      let logoHtml = '';
      if (other.avatarUrl) {
        logoHtml = `<div class="panel-school-logo" style="background-image: url('${other.avatarUrl}');"></div>`;
      } else {
        logoHtml = `<div class="panel-school-logo-letter ${other.colorClass}">${other.logoLetter}</div>`;
      }

      let badgeHtml = '';
      if (other.verificationBadge === 'gold') {
        badgeHtml = `
          <svg class="verified-badge verified-badge-md gold" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Gold Partner School">
            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
            <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
          </svg>
        `;
      } else if (other.verificationBadge === 'blue') {
        badgeHtml = `
          <svg class="verified-badge verified-badge-md" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified School">
            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
            <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
          </svg>
        `;
      }

      contentHtml = `
        <div class="panel-header-close">
          <button class="btn-panel-close" id="btn-panel-close-action" aria-label="Close panel">&times;</button>
        </div>
        <div class="panel-content-scroll">
          <div class="panel-identity-card">
            ${logoHtml}
            <h3 class="panel-name">${other.name} ${badgeHtml}</h3>
            <span class="panel-subtitle">School Profile</span>
          </div>
          <div class="panel-details-list">
            <div class="panel-detail-item">
              <span class="detail-label">City</span>
              <span class="detail-value">${other.city}</span>
            </div>
            <div class="panel-detail-item">
              <span class="detail-label">Board</span>
              <span class="detail-value">${other.board}</span>
            </div>
          </div>
          <div class="panel-actions-list">
            <a href="school-profile.html?id=${other.id}" class="btn btn-secondary panel-btn">View School</a>
            <a href="school-profile.html?id=${other.id}#panel-events" class="btn btn-secondary panel-btn">View Events</a>
            <a href="school-profile.html?id=${other.id}#panel-admissions" class="btn btn-secondary panel-btn">View Admissions</a>
          </div>
        </div>
      `;
    } else {
      let avatarHtml = '';
      if (other.avatarUrl) {
        avatarHtml = `<div class="panel-user-avatar" style="background-image: url('${other.avatarUrl}');"></div>`;
      } else {
        avatarHtml = `<div class="panel-user-avatar-letter">${other.logoLetter}</div>`;
      }

      let badgeHtml = '';
      if (other.isVerified) {
        badgeHtml = `
          <svg class="verified-badge verified-badge-md" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Profile">
            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
            <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
          </svg>
        `;
      }

      contentHtml = `
        <div class="panel-header-close">
          <button class="btn-panel-close" id="btn-panel-close-action" aria-label="Close panel">&times;</button>
        </div>
        <div class="panel-content-scroll">
          <div class="panel-identity-card">
            ${avatarHtml}
            <h3 class="panel-name">${other.name} ${badgeHtml}</h3>
            ${other.username ? `<span class="panel-username" style="font-size: 0.8rem; color: var(--text-muted); font-weight: 400; display: block; margin-top: 2px; margin-bottom: 4px;">@${other.username}</span>` : ''}
            <span class="panel-subtitle">Member Profile</span>
          </div>
          <div class="panel-details-list">
            <div class="panel-detail-item">
              <span class="detail-label">User Type</span>
              <span class="detail-value">${other.userType || 'Student'}</span>
            </div>
            <div class="panel-detail-item">
              <span class="detail-label">School</span>
              <span class="detail-value">${other.schoolName || 'Not Linked'}</span>
            </div>
          </div>
          <div class="panel-actions-list">
            <a href="profile.html?id=${other.id}" class="btn btn-secondary panel-btn">View Profile</a>
          </div>
        </div>
      `;
    }

    panel.innerHTML = contentHtml;

    const closeBtn = document.getElementById('btn-panel-close-action');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        profilePanelCollapsed = true;
        panel.style.display = 'none';
        if (messagingCard) {
          messagingCard.classList.remove('profile-panel-open');
        }
      });
    }
  }

  // --- Render Active Chat Details ---
  function renderActiveChat(conv) {
    if (!chatEmptyState || !chatActiveInterface) return;

    chatEmptyState.style.display = 'none';
    chatActiveInterface.style.display = 'flex';

    const other = getOtherParticipant(conv);

    // Header
    if (chatRecipientName) {
      let badgeHtml = '';
      if (other.isSchool) {
        if (other.verificationBadge === 'gold') {
          badgeHtml = `
            <svg class="verified-badge verified-badge-md gold" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Gold Partner School" style="display:inline-block; vertical-align:middle; margin-left:4px;">
              <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
              <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
            </svg>
          `;
        } else if (other.verificationBadge === 'blue') {
          badgeHtml = `
            <svg class="verified-badge verified-badge-md" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified School" style="display:inline-block; vertical-align:middle; margin-left:4px;">
              <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
              <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
            </svg>
          `;
        }
      } else if (other.isVerified) {
        badgeHtml = `
          <svg class="verified-badge verified-badge-md" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Profile" style="display:inline-block; vertical-align:middle; margin-left:4px;">
            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
            <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
          </svg>
        `;
      }
      chatRecipientName.innerHTML = other.name + badgeHtml;
    }
    const recipientUsernameEl = document.getElementById('chat-recipient-username');
    if (recipientUsernameEl) {
      if (!other.isSchool && other.username) {
        recipientUsernameEl.textContent = `@${other.username}`;
        recipientUsernameEl.style.display = 'block';
      } else {
        recipientUsernameEl.textContent = '';
        recipientUsernameEl.style.display = 'none';
      }
    }
    if (chatRecipientHeadline) chatRecipientHeadline.textContent = other.headline;
    
    if (chatRecipientAvatar) {
      chatRecipientAvatar.innerHTML = '';
      if (other.isSchool) {
        if (other.avatarUrl) {
          chatRecipientAvatar.className = 'chat-recipient-avatar';
          chatRecipientAvatar.style.borderRadius = 'var(--radius-sm)';
          chatRecipientAvatar.style.backgroundImage = `url('${other.avatarUrl}')`;
          chatRecipientAvatar.style.backgroundSize = 'cover';
          chatRecipientAvatar.textContent = '';
        } else {
          chatRecipientAvatar.className = `chat-recipient-avatar ${other.colorClass}`;
          chatRecipientAvatar.style.borderRadius = 'var(--radius-sm)';
          chatRecipientAvatar.style.backgroundImage = 'none';
          chatRecipientAvatar.style.color = 'var(--white)';
          chatRecipientAvatar.textContent = other.logoLetter;
        }
      } else if (other.avatarUrl) {
        chatRecipientAvatar.className = 'chat-recipient-avatar';
        chatRecipientAvatar.style.borderRadius = '50%';
        chatRecipientAvatar.style.backgroundImage = `url(${other.avatarUrl})`;
        chatRecipientAvatar.textContent = '';
      } else {
        chatRecipientAvatar.className = 'chat-recipient-avatar bg-gradient-1';
        chatRecipientAvatar.style.borderRadius = '50%';
        chatRecipientAvatar.style.backgroundImage = 'none';
        chatRecipientAvatar.style.color = 'var(--primary)';
        chatRecipientAvatar.textContent = other.logoLetter;
      }
    }

    // Inquiry label & Toggle Profile button in header actions
    if (chatHeaderActions) {
      chatHeaderActions.innerHTML = '';
      if (conv.school_id && conv.inquiry_type) {
        const labels = {
          admissions: 'Admissions Inquiry',
          events: 'Event Inquiry',
          general_inquiry: 'General Inquiry'
        };
        const label = labels[conv.inquiry_type] || 'Inquiry';
        const badgeSpan = document.createElement('span');
        badgeSpan.className = `inquiry-badge-tag ${conv.inquiry_type}`;
        badgeSpan.style.cssText = 'font-size:0.8rem; padding: 6px 12px; border-radius: var(--radius-sm); margin-top: 0;';
        badgeSpan.textContent = label;
        chatHeaderActions.appendChild(badgeSpan);
      }

      // Add "Request Sent" badge if pending and initiated by current user
      if (conv.status === 'pending' && conv.initiator_id === currentUser.id) {
        const sentBadge = document.createElement('span');
        sentBadge.className = 'inquiry-badge-tag general_inquiry';
        sentBadge.style.cssText = 'font-size:0.8rem; padding: 6px 12px; border-radius: var(--radius-sm); margin-top: 0; background-color: var(--warning-light, #FFFBEB); color: var(--warning, #D97706);';
        sentBadge.textContent = 'Request Sent';
        chatHeaderActions.appendChild(sentBadge);
      }

      // Add collapsible toggle button
      const toggleProfileBtn = document.createElement('button');
      toggleProfileBtn.className = 'btn-toggle-profile';
      toggleProfileBtn.id = 'btn-toggle-profile';
      toggleProfileBtn.title = 'Recipient Details';
      toggleProfileBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      `;
      chatHeaderActions.appendChild(toggleProfileBtn);

      toggleProfileBtn.addEventListener('click', () => {
        profilePanelCollapsed = !profilePanelCollapsed;
        renderProfilePanel(other);
      });
    }

    // Render/update profile panel
    renderProfilePanel(other);

    // Message Request Bar setup
    if (messageRequestBar) {
      if (conv.status === 'pending') {
        if (conv.initiator_id === currentUser.id) {
          // Hide request bar, disable nothing for initiator
          messageRequestBar.style.display = 'none';
          chatMessageInput.disabled = false;
          btnSendMessage.disabled = false;
        } else {
          // Show Accept/Ignore buttons, disable typing for receiver
          messageRequestBar.style.display = 'block';
          if (requestBarText) requestBarText.textContent = 'Would you like to accept this message request?';
          document.getElementById('btn-accept-request').style.display = 'inline-flex';
          document.getElementById('btn-ignore-request').style.display = 'inline-flex';
          chatMessageInput.disabled = true;
          btnSendMessage.disabled = true;
        }
      } else if (conv.status === 'ignored') {
        messageRequestBar.style.display = 'block';
        if (requestBarText) requestBarText.textContent = '🚫 This request has been ignored. You cannot send messages.';
        document.getElementById('btn-accept-request').style.display = 'none';
        document.getElementById('btn-ignore-request').style.display = 'none';
        chatMessageInput.disabled = true;
        btnSendMessage.disabled = true;
      } else {
        // Accepted
        messageRequestBar.style.display = 'none';
        chatMessageInput.disabled = false;
        btnSendMessage.disabled = false;
      }
    }

    // Render messages history
    renderMessageHistory(conv.messages);
  }

  // --- Render Messages History ---
  function renderMessageHistory(messages) {
    if (!messageHistory) return;

    messageHistory.innerHTML = '';

    if (!messages || messages.length === 0) {
      messageHistory.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); margin: auto 0; padding: 40px 0;">
          <p>No messages yet. Send a message to start the conversation.</p>
        </div>
      `;
      return;
    }

    let lastDateStr = '';

    messages.forEach(msg => {
      const msgDate = new Date(msg.created_at);
      const dateStr = msgDate.toDateString();

      // Add date separator
      if (dateStr !== lastDateStr) {
        const sep = document.createElement('div');
        sep.className = 'message-date-separator';
        
        let displayDate = dateStr;
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (dateStr === today.toDateString()) {
          displayDate = 'Today';
        } else if (dateStr === yesterday.toDateString()) {
          displayDate = 'Yesterday';
        } else {
          displayDate = msgDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
        }

        sep.innerHTML = `<span>${displayDate}</span>`;
        messageHistory.appendChild(sep);
        lastDateStr = dateStr;
      }

      // Bubble layout
      const isSent = msg.sender_id === currentUser.id;
      const row = document.createElement('div');
      row.className = `message-bubble-row ${isSent ? 'sent' : 'received'}`;

      const timeStr = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Read indicator tick (only for outgoing messages)
      let ticksHtml = '';
      if (isSent) {
        ticksHtml = `
          <span class="read-status-indicator ${msg.read_status ? 'read' : ''}" title="${msg.read_status ? 'Read' : 'Delivered'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
        `;
      }

      // Clean message if it has inquiry tag prefix
      let cleanMsg = msg.message;
      if (cleanMsg.startsWith('[Inquiry:')) {
        cleanMsg = cleanMsg.substring(cleanMsg.indexOf(']') + 2);
      }

      row.innerHTML = `
        <div class="message-bubble-wrapper">
          <div class="message-bubble">${cleanMsg}</div>
          <div class="message-time-meta">
            <span>${timeStr}</span>
            ${ticksHtml}
          </div>
        </div>
      `;

      messageHistory.appendChild(row);
    });

    // Scroll to bottom
    setTimeout(() => {
      messageHistory.scrollTop = messageHistory.scrollHeight;
    }, 50);
  }

  // --- Mark Messages as Read ---
  async function markMessagesAsRead(conv) {
    const sb = getSupabase();
    if (!sb || !currentUser) return;

    // Filter unread messages sent by the other participant
    const unread = conv.messages.filter(msg => msg.sender_id !== currentUser.id && !msg.read_status);
    if (unread.length === 0) return;

    try {
      const msgIds = unread.map(m => m.id);

      const { error } = await sb
        .from('messages')
        .update({ read_status: true })
        .in('id', msgIds);

      if (error) throw error;

      // Update local state
      unread.forEach(m => m.read_status = true);
      renderConversationList();
    } catch (err) {
      console.warn('Failed to mark messages as read:', err);
    }
  }

  // --- Initialize a New Direct Chat ---
  async function initNewDirectChat(profileId) {
    const sb = getSupabase();
    if (!sb) return;

    try {
      // Fetch details of the recipient profile
      const { data: profile, error } = await sb
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();

      if (error) throw error;

      if (!profile) {
        showToast('Recipient profile not found', 'error');
        return;
      }

      // Generate a temporary/virtual conversation state to render header details
      const auth = getAuth();
      const roleLabel = auth.getUserTypeLabel(profile.user_type);
      const headline = profile.class ? `${profile.class} • ${roleLabel}` : roleLabel;

      chatEmptyState.style.display = 'none';
      chatActiveInterface.style.display = 'flex';

      // Mobile: open chat view full-screen
      if (messagingCard) {
        messagingCard.classList.add('chat-open');
      }
      // Replace current history entry with inbox URL (so back goes to inbox first, then previous page)
      const inboxUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ chatOpen: false }, '', inboxUrl);
      // Push chat-open state so browser back returns to inbox
      const chatUrl = inboxUrl + `?new_chat_with=${profileId}`;
      window.history.pushState({ chatOpen: true, newChatWith: profileId }, '', chatUrl);

      if (chatRecipientName) {
        const verifiedBadge = profile.is_verified ? `
          <svg class="verified-badge verified-badge-md" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Profile">
            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
            <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
          </svg>
        ` : '';
        chatRecipientName.innerHTML = profile.full_name + verifiedBadge;
      }
      if (chatRecipientHeadline) chatRecipientHeadline.textContent = headline;
      
      if (chatRecipientAvatar) {
        chatRecipientAvatar.innerHTML = '';
        if (profile.avatar_url) {
          chatRecipientAvatar.className = 'chat-recipient-avatar';
          chatRecipientAvatar.style.borderRadius = '50%';
          chatRecipientAvatar.style.backgroundImage = `url(${profile.avatar_url})`;
        } else {
          chatRecipientAvatar.className = 'chat-recipient-avatar bg-gradient-1';
          chatRecipientAvatar.style.borderRadius = '50%';
          chatRecipientAvatar.style.color = 'var(--primary)';
          chatRecipientAvatar.textContent = (profile.full_name || '?').charAt(0).toUpperCase();
        }
      }

      if (chatHeaderActions) chatHeaderActions.innerHTML = '';
      if (messageRequestBar) {
        messageRequestBar.style.display = 'block';
        if (requestBarText) requestBarText.innerHTML = `✉️ Send your first message to initiate a connection request with <strong>${profile.full_name}</strong>.`;
        document.getElementById('btn-accept-request').style.display = 'none';
        document.getElementById('btn-ignore-request').style.display = 'none';
      }

      if (messageHistory) {
        messageHistory.innerHTML = `
          <div style="text-align: center; color: var(--text-muted); margin: auto 0; padding: 40px 0;">
            <p>Write your message below to send a connection request. Chat starts once accepted.</p>
          </div>
        `;
      }

      chatMessageInput.disabled = false;
      btnSendMessage.disabled = false;
      
      // Store virtual recipient profile id in dataset for submit handler
      chatSendForm.dataset.newChatRecipient = profileId;
    } catch (err) {
      console.error('Failed to load recipient details:', err);
      showToast('Error setting up chat: ' + err.message, 'error');
    }
  }
  // --- Close Mobile Chat (WhatsApp-style back navigation) ---
  function closeMobileChat() {
    activeChatId = null;
    if (messagingCard) {
      messagingCard.classList.remove('chat-open');
    }
    // Reset chat interface to empty state
    if (chatActiveInterface) chatActiveInterface.style.display = 'none';
    if (chatEmptyState) chatEmptyState.style.display = 'flex';
    // Clear new chat recipient if any
    if (chatSendForm) delete chatSendForm.dataset.newChatRecipient;
    renderConversationList();

    // Navigate back in history (pops the chat-open state)
    window.history.back();
  }

  // --- Bind Event Listeners ---
  function setupEventListeners() {
    // Tabs
    if (tabActiveChats) {
      tabActiveChats.addEventListener('click', () => {
        currentTab = 'active';
        tabActiveChats.classList.add('active');
        tabMessageRequests.classList.remove('active');
        renderConversationList();
      });
    }

    if (tabMessageRequests) {
      tabMessageRequests.addEventListener('click', () => {
        currentTab = 'requests';
        tabMessageRequests.classList.add('active');
        tabActiveChats.classList.remove('active');
        renderConversationList();
      });
    }

    // Search input
    if (conversationSearch) {
      conversationSearch.addEventListener('input', (e) => {
        conversationSearchQuery = e.target.value;
        renderConversationList();
      });
    }

    // Back Button (Mobile layout toggle)
    if (btnChatBack) {
      btnChatBack.addEventListener('click', () => {
        closeMobileChat();
      });
    }

    // Browser back button support (popstate)
    window.addEventListener('popstate', (e) => {
      if (messagingCard && messagingCard.classList.contains('chat-open')) {
        // We came back from a chat-open state, close the chat view
        messagingCard.classList.remove('chat-open');
        activeChatId = null;
        // Reset chat interface
        if (chatActiveInterface) chatActiveInterface.style.display = 'none';
        if (chatEmptyState) chatEmptyState.style.display = 'flex';
        // Clear new chat recipient if any
        if (chatSendForm) delete chatSendForm.dataset.newChatRecipient;
        renderConversationList();
      }
    });

    // Accept Message Request
    if (btnAcceptRequest) {
      btnAcceptRequest.addEventListener('click', async () => {
        if (!activeChatId) return;

        btnAcceptRequest.disabled = true;
        btnIgnoreRequest.disabled = true;

        try {
          const sb = getSupabase();
          const { error } = await sb
            .from('conversations')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('id', activeChatId);

          if (error) throw error;

          showToast('Message request accepted!');
          await loadConversations();
        } catch (err) {
          console.error('Accept request failed:', err);
          showToast('Failed to accept request: ' + err.message, 'error');
          btnAcceptRequest.disabled = false;
          btnIgnoreRequest.disabled = false;
        }
      });
    }

    // Ignore Message Request
    if (btnIgnoreRequest) {
      btnIgnoreRequest.addEventListener('click', async () => {
        if (!activeChatId) return;

        if (confirm('Are you sure you want to ignore this request? You will not receive any more messages from this chat.')) {
          btnAcceptRequest.disabled = true;
          btnIgnoreRequest.disabled = true;

          try {
            const sb = getSupabase();
            const { error } = await sb
              .from('conversations')
              .update({ status: 'ignored', updated_at: new Date().toISOString() })
              .eq('id', activeChatId);

            if (error) throw error;

            showToast('Request ignored.');
            activeChatId = null;
            if (chatActiveInterface) chatActiveInterface.style.display = 'none';
            if (chatEmptyState) chatEmptyState.style.display = 'flex';
            await loadConversations();
          } catch (err) {
            console.error('Ignore request failed:', err);
            showToast('Failed to ignore request: ' + err.message, 'error');
            btnAcceptRequest.disabled = false;
            btnIgnoreRequest.disabled = false;
          }
        }
      });
    }

    // Send Message Form submission
    if (chatSendForm) {
      chatSendForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const messageText = chatMessageInput.value.trim();
        if (!messageText) return;

        const sb = getSupabase();
        if (!sb || !currentUser) return;

        chatMessageInput.disabled = true;
        btnSendMessage.disabled = true;

        try {
          const newRecipientId = chatSendForm.dataset.newChatRecipient;

          if (newRecipientId) {
            // Check connections table to see if they are connected
            let isConnected = false;
            try {
              const { data: connData, error: connError } = await sb
                .from('connections')
                .select('status')
                .or(`and(requester_id.eq.${currentUser.id},receiver_id.eq.${newRecipientId}),and(requester_id.eq.${newRecipientId},receiver_id.eq.${currentUser.id})`)
                .maybeSingle();

              if (!connError && connData && connData.status === 'accepted') {
                isConnected = true;
              }
            } catch (connCheckErr) {
              console.warn('Failed to verify connection status, defaulting to pending request:', connCheckErr);
            }

            const convStatus = isConnected ? 'accepted' : 'pending';

            // SCENARIO A: Creating a new direct conversation on first message
            // 1. Create conversation record
            const { data: conv, error: convError } = await sb
              .from('conversations')
              .insert({
                status: convStatus,
                initiator_id: currentUser.id
              })
              .select()
              .single();

            if (convError) throw convError;

            // 2. Add participants
            const { error: partError } = await sb
              .from('conversation_participants')
              .insert([
                { conversation_id: conv.id, user_id: currentUser.id },
                { conversation_id: conv.id, user_id: newRecipientId }
              ]);

            if (partError) throw partError;

            const { error: msgError } = await sb
              .from('messages')
              .insert({
                conversation_id: conv.id,
                sender_id: currentUser.id,
                receiver_id: newRecipientId,
                message: messageText,
                read_status: false
              });

            if (msgError) throw msgError;

            console.log('Message created successfully (Scenario A):', { conversation_id: conv.id, sender_id: currentUser.id, receiver_id: newRecipientId, message: messageText });

            // Trigger notification
            if (window.CampusLink && window.CampusLink.notifications) {
              try {
                const senderName = currentUserProfile?.full_name || 'Someone';
                await window.CampusLink.notifications.createNotification(
                  newRecipientId,
                  'message',
                  `New message from ${senderName}`,
                  messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
                  `messaging.html?chat_id=${conv.id}`,
                  currentUser.id
                );
              } catch (notifErr) {
                console.warn('Error sending message notification:', notifErr);
              }
            }

            // Clear datasets, reload conversations, and activate chat
            delete chatSendForm.dataset.newChatRecipient;
            chatMessageInput.value = '';
            
            showToast(convStatus === 'accepted' ? 'Message sent!' : 'Message request sent!');
            activeChatId = conv.id;
            await loadConversations();
            selectConversation(conv.id);
          } else if (activeChatId) {
            // SCENARIO B: Sending message in an existing conversation
            const activeConv = conversations.find(c => c.id === activeChatId);
            if (!activeConv) throw new Error('Active conversation not found');

            const other = getOtherParticipant(activeConv);

            // Configure receiver variables
            const msgPayload = {
              conversation_id: activeChatId,
              sender_id: currentUser.id,
              message: messageText,
              read_status: false
            };

            let notificationRecipientId = null;

            if (other.isSchool) {
              msgPayload.receiver_school_id = other.id;
              // Fetch the admin user ID of the school to trigger notifications, but do NOT insert it as receiver_id in messages table
              const { data: sch } = await sb.from('schools').select('admin_user_id').eq('id', other.id).maybeSingle();
              notificationRecipientId = sch?.admin_user_id || null;
            } else {
              msgPayload.receiver_id = other.id;
              notificationRecipientId = other.id;
            }

            const { error: msgError } = await sb
              .from('messages')
              .insert(msgPayload);

            if (msgError) throw msgError;

            console.log('Message created successfully (Scenario B):', msgPayload);

            // Trigger notification
            if (window.CampusLink && window.CampusLink.notifications) {
              try {
                const senderName = currentUserProfile?.full_name || 'Someone';
                const recipientId = notificationRecipientId;
                if (recipientId) {
                  await window.CampusLink.notifications.createNotification(
                    recipientId,
                    'message',
                    `New message from ${senderName}`,
                    messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
                    `messaging.html?chat_id=${activeChatId}`,
                    currentUser.id
                  );
                }
              } catch (notifErr) {
                console.warn('Error sending message notification:', notifErr);
              }
            }

            // Update conversations updated_at timestamp and set status to accepted if pending
            const convUpdateData = { updated_at: new Date().toISOString() };
            if (activeConv.status === 'pending') {
              convUpdateData.status = 'accepted';
            }
            await sb
              .from('conversations')
              .update(convUpdateData)
              .eq('id', activeChatId);

            chatMessageInput.value = '';
          }
        } catch (err) {
          console.error('Failed to send message:', err);
          showToast('Failed to send message: ' + err.message, 'error');
        } finally {
          chatMessageInput.disabled = false;
          btnSendMessage.disabled = false;
          chatMessageInput.focus();
        }
      });

      // Handle Enter key inside textarea to submit instead of line break
      if (chatMessageInput) {
        chatMessageInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatSendForm.dispatchEvent(new Event('submit'));
          }
        });
      }
    }
  }

  // --- Supabase Realtime Channels Subscription ---
  function setupRealtimeSubscription() {
    const sb = getSupabase();
    if (!sb || !currentUser) return;

    // Channel for message updates
    realtimeChannelMessages = sb
      .channel('public-messages-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        async (payload) => {
          console.log('Realtime message update:', payload);
          // Reload inbox details to pull new message
          await loadConversations();
        }
      )
      .subscribe();

    // Channel for conversation state updates (e.g. status changes, new chats created)
    realtimeChannelConversations = sb
      .channel('public-conversations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        async (payload) => {
          console.log('Realtime conversation update:', payload);
          // Reload inbox details
          await loadConversations();
        }
      )
      .subscribe();
  }

  // --- Toast notifications ---
  function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
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

  // Run on load (robust ready state check)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
