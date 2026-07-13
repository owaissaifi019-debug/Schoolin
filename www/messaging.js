// messaging.js
// SchoolIn LinkedIn-style Messaging Controller
// Handles inbox sidebar, active conversations, real-time sync, accept/ignore request flow, and mobile responsiveness.

(function () {
  'use strict';

  console.log('校园社交 messaging.js: Script executed and IIFE started.');

  // State
  let currentUser = null;
  let currentUserProfile = null;
  let conversations = [];
  let activeChatId = null;
  let activeConv = null;
  let activeOther = null;
  let currentTab = 'active'; // 'active' or 'requests'
  let conversationSearchQuery = '';
  let realtimeChannelMessages = null;
  let realtimeChannelConversations = null;
  let replyingToMessageId = null;
  let forwardingMessageId = null;
  let selectedMobileMessageId = null;
  let selectedMobileRowEl = null;

  // DOM Elements
  const conversationList = document.getElementById('conversation-list');
  const chatEmptyState = document.getElementById('chat-empty-state');
  const chatActiveInterface = document.getElementById('chat-active-interface');
  const chatRecipientAvatar = document.getElementById('chat-recipient-avatar');
  const chatRecipientName = document.getElementById('chat-recipient-name');
  const chatRecipientHeadline = document.getElementById('chat-recipient-headline');
  const chatHeaderActions = document.getElementById('chat-header-actions');
  const chatRecipientBadges = document.getElementById('chat-recipient-badges');
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
    console.log('校园社交 messaging.js: init() function started.');
    const auth = getAuth();
    if (!auth) {
      console.error('校园社交 messaging.js: Auth module not loaded.');
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
    console.log('校园社交 messaging.js: Current user authenticated:', currentUser.id);
    currentUserProfile = await auth.getProfile(currentUser.id);
    console.log('校园社交 messaging.js: Fetched user profile:', currentUserProfile);

    // Dynamic "+ New Group" vs "+ New Chat" button presentation based on user role
    const isSchoolOrCollegeAdmin = (currentUserProfile?.user_type === 'school_representative' || currentUserProfile?.platform_role === 'school_admin');
    const createGroupBtn = document.getElementById('btn-create-group');
    if (createGroupBtn) {
      if (isSchoolOrCollegeAdmin) {
        createGroupBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
          New Group
        `;
      } else {
        createGroupBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          New Chat
        `;
      }
    }

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
            read_status,
            parent_message_id,
            sender:profiles!sender_id (
              id,
              full_name,
              avatar_url,
              user_type,
              username
            )
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
    // If the conversation is a Group, Classroom, or School Community
    if (conv.type === 'CLASSROOM' || conv.type === 'SCHOOL' || conv.type === 'CLUB' || (conv.name && conv.name !== 'Direct Message' && conv.name.trim() !== '')) {
      return {
        id: conv.id,
        name: conv.name || 'Group Chat',
        logoLetter: (conv.name || 'G').charAt(0).toUpperCase(),
        colorClass: 'bg-gradient-3',
        avatarUrl: conv.avatar_url || null,
        headline: conv.description || 'Group Conversation',
        description: conv.description || null,
        isSchool: false,
        isGroup: true,
        isVerified: false
      };
    }

    const isSchoolRep = currentUserProfile?.user_type === 'school_representative';
    const mySchoolId = currentUserProfile?.school_id;

    // Filter participants that are NOT current user
    const otherPart = conv.conversation_participants ? conv.conversation_participants.find(p => {
      if (p.user_id && p.user_id !== currentUser.id) return true;
      if (p.school_id && (!isSchoolRep || p.school_id !== mySchoolId)) return true;
      return false;
    }) : null;

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
      if (other.isGroup) {
        if (other.avatarUrl) {
          avatarHtml = `<div class="conversation-avatar" style="background-image: url('${other.avatarUrl}'); background-size: cover; background-position: center; border-radius: 50%;"></div>`;
        } else {
          avatarHtml = `<div class="conversation-avatar" style="background: var(--primary-light); color: var(--primary); font-weight: bold; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; border-radius: 50%;">👥</div>`;
        }
      } else if (other.isSchool) {
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
        let rawText = lastMsg.message.startsWith('[Inquiry:') ? lastMsg.message.substring(lastMsg.message.indexOf(']') + 2) : lastMsg.message;
        // Sanitize: strip HTML tags and collapse whitespace
        rawText = rawText.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        // Truncate to 80 chars for sidebar preview
        lastMsgText = rawText.length > 80 ? rawText.substring(0, 80) + '…' : rawText;
        
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
          <p class="conversation-last-msg" data-last-msg></p>
          <div class="conversation-badges-row">
            ${categoryBadgeHtml}
            ${statusBadge}
          </div>
        </div>
        ${unreadDotHtml}
      `;

      item.addEventListener('click', () => selectConversation(conv.id));
      // Safely set last message preview text via textContent (prevents XSS / raw code display)
      const lastMsgEl = item.querySelector('[data-last-msg]');
      if (lastMsgEl) lastMsgEl.textContent = lastMsgText;
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
    if (window.exitMobileSelectionMode) window.exitMobileSelectionMode();
    const sb = getSupabase();
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

    activeConv = conv;
    activeOther = getOtherParticipant(conv);

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
  let profilePanelCollapsed = true;

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
    if (other.isGroup) {
      let avatarHtml = '';
      if (other.avatarUrl) {
        avatarHtml = `<div id="group-panel-avatar-img" class="whatsapp-avatar-image" style="background-image: url('${other.avatarUrl}');"></div>
                      <div id="group-panel-avatar-letter" class="whatsapp-avatar-letter" style="display:none;">👥</div>`;
      } else {
        avatarHtml = `<div id="group-panel-avatar-img" class="whatsapp-avatar-image" style="display:none; background-size: cover; background-position: center; background-repeat: no-repeat;"></div>
                      <div id="group-panel-avatar-letter" class="whatsapp-avatar-letter">👥</div>`;
      }

      contentHtml = `
        <!-- Sticky WhatsApp-style Header -->
        <div class="whatsapp-header" style="display:flex; align-items:center; background:var(--primary); color:#ffffff; padding: 12px 16px; position:sticky; top:0; z-index:100; box-shadow: 0 2px 4px rgba(0,0,0,0.1); height:56px;">
          <button class="whatsapp-back-btn" id="btn-panel-close-action" style="background:none; border:none; color:#ffffff; font-size:1.4rem; cursor:pointer; display:flex; align-items:center; padding:0; margin-right:20px;" aria-label="Close panel">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div style="display:flex; flex-direction:column;">
            <span style="font-weight:600; font-size:1.15rem; letter-spacing:0.01em;">Group info</span>
          </div>
        </div>

        <!-- WhatsApp Scroll Container -->
        <div class="whatsapp-scroll-content" style="background:var(--light-bg); flex:1; overflow-y:auto; display:flex; flex-direction:column; padding-bottom:30px;">
          
          <!-- Hero Section: Group Picture, Title, Subtitle -->
          <div class="whatsapp-card" style="background:var(--white); padding: 28px 16px 20px; text-align:center; box-shadow:0 1px 2px var(--border-color);">
            <div class="whatsapp-avatar-container" style="position:relative; width:120px; height:120px; margin:0 auto 16px; cursor:pointer; border-radius:50%; overflow:hidden;" id="group-avatar-container" onclick="triggerGroupAvatarUpload('${other.id}')">
              ${avatarHtml}
              <div class="avatar-edit-overlay" id="group-avatar-edit-overlay" style="position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.4); display:none; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              </div>
              <input type="file" id="group-avatar-file-input-${other.id}" style="display:none;" accept="image/*" onchange="handleGroupAvatarUpload('${other.id}', this.files)">
            </div>
            
            <h2 class="whatsapp-group-title" style="font-size:1.45rem; font-weight:700; color:var(--text-main); margin:0; display:flex; align-items:center; justify-content:center; gap:8px;">
              <span id="group-panel-name-text">${other.name}</span>
              <button id="btn-edit-group-name" class="btn-whatsapp-edit" style="display:none; background:none; border:none; cursor:pointer; padding:4px;" onclick="editGroupName('${other.id}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#667781" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
            </h2>
            <p style="font-size:0.88rem; color:var(--text-muted); margin:6px 0 0;" id="group-panel-header-count">Group · Loading...</p>
          </div>
          
          <!-- Divider -->
          <div class="whatsapp-divider" style="height:12px; background:var(--light-bg); border-top:1px solid var(--border-color); border-bottom:1px solid var(--border-color);"></div>

          <!-- Description Section -->
          <div class="whatsapp-card" style="background:var(--white); padding:16px; display:flex; flex-direction:column; gap:4px; box-shadow:0 1px 2px var(--border-color);">
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
              <span style="font-size:0.88rem; color:var(--text-muted); font-weight:500;">Group description</span>
              <button id="btn-edit-group-desc" class="btn-whatsapp-edit" style="display:none; background:none; border:none; cursor:pointer; padding:4px;" onclick="editGroupDescription('${other.id}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#667781" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
            </div>
            <div id="group-panel-desc-text" style="font-size:0.95rem; color:var(--text-main); line-height:1.4; margin-top:2px;">
              ${other.description || 'Add group description'}
            </div>
          </div>

          <!-- Divider -->
          <div class="whatsapp-divider" style="height:12px; background:var(--light-bg); border-top:1px solid var(--border-color); border-bottom:1px solid var(--border-color);"></div>

          <!-- Settings Option Row -->
          <div class="whatsapp-card" id="group-panel-settings-section" style="display:none; background:var(--white); box-shadow:0 1px 2px var(--border-color); padding:0 16px;">
            <details style="width:100%; border:none; padding:16px 0;">
              <summary style="font-size:0.95rem; color:var(--text-main); font-weight:500; display:flex; justify-content:space-between; align-items:center; outline:none; list-style:none; cursor:pointer;">
                <div style="display:flex; align-items:center; gap:16px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#667781" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                  <span>Group settings</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#667781" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </summary>
              <div style="display:flex; flex-direction:column; gap:16px; margin-top:16px; padding-left:36px; border-top:1px solid var(--border-color); padding-top:16px;">
                <div>
                  <label style="display:block; font-size:0.85rem; font-weight:600; color:var(--text-main); margin-bottom:6px;">Who can send messages</label>
                  <select id="setting-send-messages-${other.id}" style="width:100%; padding:8px 12px; font-size:0.88rem; border-radius:8px; border:1px solid var(--border-color); outline:none; background:var(--light-bg); color:var(--text-main);" onchange="updateGroupSetting('${other.id}', 'send_messages_threshold', this.value)">
                    <option value="Everyone">All Participants</option>
                    <option value="Admin">Only Admins</option>
                  </select>
                </div>
                <div>
                  <label style="display:block; font-size:0.85rem; font-weight:600; color:var(--text-main); margin-bottom:6px;">Who can edit group info</label>
                  <select id="setting-edit-info-${other.id}" style="width:100%; padding:8px 12px; font-size:0.88rem; border-radius:8px; border:1px solid var(--border-color); outline:none; background:var(--light-bg); color:var(--text-main);" onchange="updateGroupSetting('${other.id}', 'edit_info_threshold', this.value)">
                    <option value="Everyone">All Participants</option>
                    <option value="Admin">Only Admins</option>
                  </select>
                </div>
              </div>
            </details>
          </div>

          <!-- Divider -->
          <div class="whatsapp-divider" style="height:12px; background:var(--light-bg); border-top:1px solid var(--border-color); border-bottom:1px solid var(--border-color);"></div>

          <!-- Participants List Card -->
          <div class="whatsapp-card" style="background:var(--white); box-shadow:0 1px 2px var(--border-color); padding: 16px 16px 8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
              <span id="group-panel-member-count" style="font-size:0.95rem; font-weight:600; color:var(--text-main);">Participants</span>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:6px;">
              <!-- Add Participants Row (WhatsApp style) -->
              <div id="btn-group-add-member" style="display:none; align-items:center; gap:16px; padding:10px 0; cursor:pointer;" onclick="openAddMemberSubModal('${other.id}')">
                <div style="width:40px; height:40px; border-radius:50%; background:var(--primary); color:#ffffff; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                </div>
                <div style="display:flex; flex-direction:column; flex:1;">
                  <span style="font-size:0.95rem; font-weight:600; color:var(--primary);">Add participants</span>
                </div>
              </div>

              <!-- Invite via Link Row -->
              <div style="display:flex; align-items:center; gap:16px; padding:10px 0; cursor:pointer; border-bottom:1px solid var(--border-color);" onclick="copyGroupInviteLink('${other.id}')">
                <div style="width:40px; height:40px; border-radius:50%; background:var(--primary); color:#ffffff; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                </div>
                <div style="display:flex; flex-direction:column; flex:1;">
                  <span style="font-size:0.95rem; font-weight:600; color:var(--primary);">Invite via link</span>
                </div>
              </div>

              <!-- Real members injected here -->
              <div id="group-panel-members-list" style="display:flex; flex-direction:column; overflow-y:auto; max-height:350px; margin-top:8px;">
                <div style="text-align:center; padding:12px; color:var(--text-muted); font-size:0.88rem;">Loading participants...</div>
              </div>
            </div>
          </div>

          <!-- Divider -->
          <div class="whatsapp-divider" style="height:12px; background:var(--light-bg); border-top:1px solid var(--border-color); border-bottom:1px solid var(--border-color);"></div>

          <!-- Exit / Block Group Rows (WhatsApp style) -->
          <div class="whatsapp-card" style="background:var(--white); box-shadow:0 1px 2px var(--border-color); padding:0 16px;">
            <div style="display:flex; align-items:center; gap:16px; padding:16px 0; color:#ea0038; cursor:pointer;" onclick="exitGroup('${other.id}')">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              <span style="font-size:0.98rem; font-weight:600;">Exit group</span>
            </div>
          </div>

        </div>
      `;
      
      loadGroupPanelMembers(other.id);
    } else if (other.isSchool) {
      let logoHtml = '';
      if (other.avatarUrl) {
        logoHtml = `<div class="whatsapp-avatar-image" style="background-image: url('${other.avatarUrl}');"></div>`;
      } else {
        logoHtml = `<div class="whatsapp-avatar-letter">🏫</div>`;
      }

      let badgeHtml = '';
      if (other.verificationBadge === 'gold') {
        badgeHtml = `
          <svg class="verified-badge verified-badge-md gold" style="color: #D97706;" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Gold Partner School">
            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
            <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
          </svg>
        `;
      } else if (other.verificationBadge === 'blue') {
        badgeHtml = `
          <svg class="verified-badge verified-badge-md" style="color: var(--primary);" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified School">
            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
            <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
          </svg>
        `;
      }

      contentHtml = `
        <!-- Sticky WhatsApp-style Header -->
        <div class="whatsapp-header" style="display:flex; align-items:center; background:var(--primary); color:#ffffff; padding: 12px 16px; position:sticky; top:0; z-index:100; box-shadow: 0 2px 4px rgba(0,0,0,0.1); height:56px;">
          <button class="whatsapp-back-btn" id="btn-panel-close-action" style="background:none; border:none; color:#ffffff; font-size:1.4rem; cursor:pointer; display:flex; align-items:center; padding:0; margin-right:20px;" aria-label="Close panel">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div style="display:flex; flex-direction:column;">
            <span style="font-weight:600; font-size:1.15rem; letter-spacing:0.01em;">School info</span>
          </div>
        </div>

        <!-- WhatsApp Scroll Container -->
        <div class="whatsapp-scroll-content" style="background:#f0f2f5; flex:1; overflow-y:auto; display:flex; flex-direction:column; padding-bottom:30px;">
          
          <!-- Hero Section -->
          <div class="whatsapp-card" style="background:#ffffff; padding: 28px 16px 20px; text-align:center; box-shadow:0 1px 2px rgba(11,20,26,0.08);">
            <div style="width:120px; height:120px; margin:0 auto 16px; border-radius:50%; overflow:hidden;">
              ${logoHtml}
            </div>
            <h2 style="font-size:1.45rem; font-weight:700; color:#111b21; margin:0; display:flex; align-items:center; justify-content:center; gap:8px;">
              ${other.name} ${badgeHtml}
            </h2>
            <p style="font-size:0.88rem; color:#667781; margin:6px 0 0;">School Profile</p>
          </div>

          <!-- Divider -->
          <div class="whatsapp-divider" style="height:12px; background:#f0f2f5; border-top:1px solid rgba(11,20,26,0.08); border-bottom:1px solid rgba(11,20,26,0.08);"></div>

          <!-- Details Card -->
          <div class="whatsapp-card" style="background:#ffffff; padding:16px; display:flex; flex-direction:column; gap:16px; box-shadow:0 1px 2px rgba(11,20,26,0.08);">
            <div>
              <span style="font-size:0.85rem; color:#667781; font-weight:500; display:block;">City</span>
              <span style="font-size:1rem; color:#111b21; font-weight:600;">${other.city || 'N/A'}</span>
            </div>
            <div style="border-top:1px solid #f0f2f5; padding-top:12px;">
              <span style="font-size:0.85rem; color:#667781; font-weight:500; display:block;">Board</span>
              <span style="font-size:1rem; color:#111b21; font-weight:600;">${other.board || 'N/A'}</span>
            </div>
          </div>

          <!-- Divider -->
          <div class="whatsapp-divider" style="height:12px; background:#f0f2f5; border-top:1px solid rgba(11,20,26,0.08); border-bottom:1px solid rgba(11,20,26,0.08);"></div>

          <!-- Actions Card -->
          <div class="whatsapp-card" style="background:#ffffff; box-shadow:0 1px 2px rgba(11,20,26,0.08); display:flex; flex-direction:column; padding:8px 16px;">
            <a href="school-profile.html?id=${other.id}" style="display:flex; align-items:center; gap:16px; padding:16px 0; color:var(--primary); text-decoration:none; font-weight:600; border-bottom:1px solid #f0f2f5;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
              <span>View School Portal</span>
            </a>
            <a href="school-profile.html?id=${other.id}#panel-events" style="display:flex; align-items:center; gap:16px; padding:16px 0; color:var(--primary); text-decoration:none; font-weight:600; border-bottom:1px solid #f0f2f5;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>View Events</span>
            </a>
            <a href="school-profile.html?id=${other.id}#panel-admissions" style="display:flex; align-items:center; gap:16px; padding:16px 0; color:var(--primary); text-decoration:none; font-weight:600;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              <span>View Admissions</span>
            </a>
          </div>

        </div>
      `;
    } else {
      let avatarHtml = '';
      if (other.avatarUrl) {
        avatarHtml = `<div class="whatsapp-avatar-image" style="background-image: url('${other.avatarUrl}');"></div>`;
      } else {
        avatarHtml = `<div class="whatsapp-avatar-letter">👤</div>`;
      }

      let badgeHtml = '';
      if (other.isVerified) {
        badgeHtml = `
          <svg class="verified-badge verified-badge-md" style="color: var(--primary);" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Profile">
            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
            <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
          </svg>
        `;
      }

      contentHtml = `
        <!-- Sticky WhatsApp-style Header -->
        <div class="whatsapp-header" style="display:flex; align-items:center; background:var(--primary); color:#ffffff; padding: 12px 16px; position:sticky; top:0; z-index:100; box-shadow: 0 2px 4px rgba(0,0,0,0.1); height:56px;">
          <button class="whatsapp-back-btn" id="btn-panel-close-action" style="background:none; border:none; color:#ffffff; font-size:1.4rem; cursor:pointer; display:flex; align-items:center; padding:0; margin-right:20px;" aria-label="Close panel">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div style="display:flex; flex-direction:column;">
            <span style="font-weight:600; font-size:1.15rem; letter-spacing:0.01em;">Contact info</span>
          </div>
        </div>

        <!-- WhatsApp Scroll Container -->
        <div class="whatsapp-scroll-content" style="background:#f0f2f5; flex:1; overflow-y:auto; display:flex; flex-direction:column; padding-bottom:30px;">
          
          <!-- Hero Section -->
          <div class="whatsapp-card" style="background:#ffffff; padding: 28px 16px 20px; text-align:center; box-shadow:0 1px 2px rgba(11,20,26,0.08);">
            <div style="width:120px; height:120px; margin:0 auto 16px; border-radius:50%; overflow:hidden;">
              ${avatarHtml}
            </div>
            <h2 style="font-size:1.45rem; font-weight:700; color:#111b21; margin:0; display:flex; align-items:center; justify-content:center; gap:8px;">
              ${other.name} ${badgeHtml}
            </h2>
            ${other.username ? `<p style="font-size:0.9rem; color:#667781; margin:4px 0 0;">@${other.username}</p>` : ''}
            <p style="font-size:0.88rem; color:#667781; margin:6px 0 0;">Member Profile</p>
          </div>

          <!-- Divider -->
          <div class="whatsapp-divider" style="height:12px; background:#f0f2f5; border-top:1px solid rgba(11,20,26,0.08); border-bottom:1px solid rgba(11,20,26,0.08);"></div>

          <!-- Details Card -->
          <div class="whatsapp-card" style="background:#ffffff; padding:16px; display:flex; flex-direction:column; gap:16px; box-shadow:0 1px 2px rgba(11,20,26,0.08);">
            <div>
              <span style="font-size:0.85rem; color:#667781; font-weight:500; display:block;">User Type</span>
              <span style="font-size:1rem; color:#111b21; font-weight:600; text-transform:capitalize;">${other.userType || 'Student'}</span>
            </div>
            <div style="border-top:1px solid #f0f2f5; padding-top:12px;">
              <span style="font-size:0.85rem; color:#667781; font-weight:500; display:block;">School / Institution</span>
              <span style="font-size:1rem; color:#111b21; font-weight:600;">${other.schoolName || 'Not Linked'}</span>
            </div>
          </div>

          <!-- Divider -->
          <div class="whatsapp-divider" style="height:12px; background:#f0f2f5; border-top:1px solid rgba(11,20,26,0.08); border-bottom:1px solid rgba(11,20,26,0.08);"></div>

          <!-- Actions Card -->
          <div class="whatsapp-card" style="background:#ffffff; box-shadow:0 1px 2px rgba(11,20,26,0.08); display:flex; flex-direction:column; padding:8px 16px;">
            <a href="profile.html?id=${other.id}" style="display:flex; align-items:center; gap:16px; padding:16px 0; color:var(--primary); text-decoration:none; font-weight:600;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>View Full Profile</span>
            </a>
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
    const sb = getSupabase();
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
      if (other.isGroup) {
        chatRecipientAvatar.className = 'chat-recipient-avatar';
        chatRecipientAvatar.style.borderRadius = '50%';
        if (other.avatarUrl) {
          chatRecipientAvatar.style.backgroundImage = `url('${other.avatarUrl}')`;
          chatRecipientAvatar.style.backgroundSize = 'cover';
          chatRecipientAvatar.style.backgroundPosition = 'center';
          chatRecipientAvatar.textContent = '';
          chatRecipientAvatar.style.backgroundColor = 'transparent';
        } else {
          chatRecipientAvatar.style.background = 'var(--primary-light)';
          chatRecipientAvatar.style.color = 'var(--primary)';
          chatRecipientAvatar.style.display = 'flex';
          chatRecipientAvatar.style.alignItems = 'center';
          chatRecipientAvatar.style.justifyContent = 'center';
          chatRecipientAvatar.style.fontSize = '1.25rem';
          chatRecipientAvatar.textContent = '👥';
          chatRecipientAvatar.style.backgroundImage = 'none';
        }
      } else if (other.isSchool) {
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

    // Clear badges container
    if (chatRecipientBadges) {
      chatRecipientBadges.innerHTML = '';
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
        badgeSpan.style.cssText = 'font-size: 0.7rem; padding: 3px 8px; border-radius: 4px; display: inline-block; white-space: nowrap; margin: 0;';
        badgeSpan.textContent = label;
        if (chatRecipientBadges) {
          chatRecipientBadges.appendChild(badgeSpan);
        } else {
          chatHeaderActions.appendChild(badgeSpan);
        }
      }

      // Add "Request Sent" badge if pending and initiated by current user
      if (conv.status === 'pending' && conv.initiator_id === currentUser.id) {
        const sentBadge = document.createElement('span');
        sentBadge.className = 'inquiry-badge-tag general_inquiry';
        sentBadge.style.cssText = 'font-size: 0.7rem; padding: 3px 8px; border-radius: 4px; display: inline-block; white-space: nowrap; margin: 0; background-color: var(--warning-light, #FFFBEB); color: var(--warning, #D97706);';
        sentBadge.textContent = 'Request Sent';
        if (chatRecipientBadges) {
          chatRecipientBadges.appendChild(sentBadge);
        } else {
          chatHeaderActions.appendChild(sentBadge);
        }
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
        
        // Check message send threshold constraints (WhatsApp-style lock)
        if (other.isGroup && sb) {
          (async () => {
            try {
              const { data: myMember } = await sb
                .from('conversation_members')
                .select('role')
                .eq('conversation_id', conv.id)
                .eq('user_id', currentUser.id)
                .is('left_at', null)
                .maybeSingle();
                
              const myRole = myMember?.role || 'Member';
              const isSchoolRep = currentUserProfile?.user_type === 'school_representative' || currentUserProfile?.platform_role === 'school_admin';
              const isUserAdmin = (myRole === 'Owner' || myRole === 'Admin' || isSchoolRep);

              const { data: settings } = await sb
                .from('conversation_settings')
                .select('send_messages_threshold')
                .eq('conversation_id', conv.id)
                .maybeSingle();

              if (settings && settings.send_messages_threshold === 'Admin') {
                if (!isUserAdmin) {
                  chatMessageInput.disabled = true;
                  chatMessageInput.placeholder = 'Only admins can send messages to this group.';
                  btnSendMessage.disabled = true;
                } else {
                  chatMessageInput.disabled = false;
                  chatMessageInput.placeholder = 'Write a message...';
                  btnSendMessage.disabled = false;
                }
              } else {
                chatMessageInput.disabled = false;
                chatMessageInput.placeholder = 'Write a message...';
                btnSendMessage.disabled = false;
              }
            } catch (e) {
              console.warn('Failed to verify send messages threshold:', e);
            }
          })();
        }
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
      const isConvOwner = activeConv && (activeConv.created_by === currentUser.id || activeConv.initiator_id === currentUser.id);
      const canDelete = isSent || isConvOwner;
      
      // Determine if we need to show sender name (Group chats received messages)
      let senderNameHtml = '';
      if (!isSent && activeOther && activeOther.isGroup) {
        let senderName = 'Member';
        if (msg.sender) {
          senderName = msg.sender.full_name || 'Member';
        } else if (activeConv && activeConv.conversation_participants) {
          const participant = activeConv.conversation_participants.find(p => p.profile && p.profile.id === msg.sender_id);
          if (participant && participant.profile) {
            senderName = participant.profile.full_name || 'Member';
          }
        }
        const stringHash = (str) => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
          }
          return hash;
        };
        const getHashColor = (str) => {
          const hash = stringHash(str);
          const h = Math.abs(hash % 360);
          return `hsl(${h}, 65%, 40%)`;
        };
        const nameColor = getHashColor(senderName);
        senderNameHtml = `<a href="profile.html?id=${msg.sender_id}" class="message-sender-name" style="font-size: 0.72rem; font-weight: 700; color: ${nameColor}; display: block; margin-bottom: 4px; text-decoration: none; cursor: pointer;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'" onclick="event.stopPropagation();">${senderName}</a>`;
      }

      const row = document.createElement('div');
      row.id = `msg-${msg.id}`;
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

      const starredKey = `starred_messages_${currentUser.id}`;
      let starredIds = [];
      try {
        starredIds = JSON.parse(localStorage.getItem(starredKey)) || [];
      } catch (e) {
        starredIds = [];
      }
      const isStarred = starredIds.includes(msg.id);
      const starText = isStarred ? 'Unstar' : 'Star';

      let replyQuoteHtml = '';
      if (msg.parent_message_id) {
        const parentMsg = messages.find(m => m.id === msg.parent_message_id);
        if (parentMsg) {
          let parentSenderName = 'Someone';
          if (parentMsg.sender_id === currentUser.id) {
            parentSenderName = 'You';
          } else if (parentMsg.sender) {
            parentSenderName = parentMsg.sender.full_name || 'Member';
          } else if (activeConv && activeConv.conversation_participants) {
            const p = activeConv.conversation_participants.find(cp => cp.profile && cp.profile.id === parentMsg.sender_id);
            if (p && p.profile) parentSenderName = p.profile.full_name || 'Member';
          }

          let parentText = parentMsg.message || '';
          if (parentText.startsWith('[Inquiry:')) {
            parentText = parentText.substring(parentText.indexOf(']') + 2);
          }
          if (parentText.length > 60) parentText = parentText.substring(0, 60) + '...';

          replyQuoteHtml = isSent
            ? `
              <div class="message-reply-quote" onclick="scrollToMessage('${msg.parent_message_id}')" style="background: rgba(255,255,255,0.18); border-left: 3px solid rgba(255,255,255,0.7); padding: 4px 8px; border-radius: 4px; margin-bottom: 6px; font-size: 0.78rem; cursor: pointer; display: flex; flex-direction: column;">
                <span style="font-weight: 700; color: rgba(255,255,255,0.95); font-size: 0.72rem;">${parentSenderName}</span>
                <span style="color: rgba(255,255,255,0.8); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 250px;">${parentText}</span>
              </div>
            `
            : `
              <div class="message-reply-quote" onclick="scrollToMessage('${msg.parent_message_id}')" style="background: rgba(37,99,235,0.08); border-left: 3px solid var(--primary); padding: 4px 8px; border-radius: 4px; margin-bottom: 6px; font-size: 0.78rem; cursor: pointer; display: flex; flex-direction: column;">
                <span style="font-weight: 700; color: var(--primary); font-size: 0.72rem;">${parentSenderName}</span>
                <span style="color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 250px;">${parentText}</span>
              </div>
            `;
        }
      }

      const starIndicatorHtml = isStarred ? `
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="#D97706" stroke="#D97706" stroke-width="2" style="vertical-align: middle; margin-right: 4px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      ` : '';

      row.innerHTML = `
        <div class="message-bubble-wrapper" style="position: relative;">
          <div class="message-bubble" style="position: relative; padding-right: 32px;">
            ${senderNameHtml}
            ${replyQuoteHtml}
            <span class="message-text-content">${linkifyText(cleanMsg)}</span>
            <button class="message-options-btn" style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: none; border: none; width: 24px; height: 24px; cursor: pointer; color: inherit; opacity: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; transition: opacity 0.2s, background-color 0.2s;" onclick="toggleMessageMenu(event, '${msg.id}')" aria-label="Message options">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div id="menu-${msg.id}" class="message-dropdown-menu" style="display: none; position: absolute; right: 0; top: 100%; background: var(--white); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 99; min-width: 130px; padding: 4px 0;">
              <a href="#" style="display: flex; align-items: center; gap: 8px; padding: 8px 14px; font-size: 0.8rem; color: var(--text-main); text-decoration: none; transition: background 0.15s;" onclick="copyMessageText(event, '${msg.id}', this)">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.7; flex-shrink: 0;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span>Copy</span>
              </a>
              <a href="#" style="display: flex; align-items: center; gap: 8px; padding: 8px 14px; font-size: 0.8rem; color: var(--text-main); text-decoration: none; transition: background 0.15s;" onclick="replyToMessage(event, '${msg.id}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.7; flex-shrink: 0;"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
                <span>Reply</span>
              </a>
              <a href="#" style="display: flex; align-items: center; gap: 8px; padding: 8px 14px; font-size: 0.8rem; color: var(--text-main); text-decoration: none; transition: background 0.15s;" onclick="openForwardModal(event, '${msg.id}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.7; flex-shrink: 0;"><polyline points="15 17 20 12 15 7"></polyline><path d="M4 18v-2a4 4 0 0 1 4-4h12"></path></svg>
                <span>Forward</span>
              </a>
              <a href="#" style="display: flex; align-items: center; gap: 8px; padding: 8px 14px; font-size: 0.8rem; color: var(--text-main); text-decoration: none; transition: background 0.15s;" onclick="toggleStarMessage(event, '${msg.id}')">
                ${isStarred 
                  ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="#D97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #D97706; flex-shrink: 0;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
                  : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.7; flex-shrink: 0;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
                }
                <span>${starText}</span>
              </a>
              <a href="#" style="display: flex; align-items: center; gap: 8px; padding: 8px 14px; font-size: 0.8rem; color: var(--text-main); text-decoration: none; transition: background 0.15s;" onclick="showMessageInfo(event, '${msg.id}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.7; flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                <span>Info</span>
              </a>
              ${canDelete ? `
                <a href="#" style="display: flex; align-items: center; gap: 8px; padding: 8px 14px; font-size: 0.8rem; color: #EF4444; text-decoration: none; transition: background 0.15s;" onclick="deleteMessage(event, '${msg.id}')">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  <span>Delete</span>
                </a>
              ` : ''}
            </div>
          </div>
          <div class="message-time-meta">
            ${starIndicatorHtml}
            <span>${timeStr}</span>
            ${ticksHtml}
          </div>
        </div>
      `;

      messageHistory.appendChild(row);

      // Async: inject link preview if message contains a URL
      const msgUrl = extractFirstUrl(cleanMsg);
      if (msgUrl) {
        (async () => {
          let preview = _previewCache[msgUrl];
          if (!preview) {
            preview = await buildMessageLinkPreviewHtml(msgUrl);
            if (preview) _previewCache[msgUrl] = preview;
          }
          if (preview) injectLinkPreviewIntoRow(row, preview, isSent);
        })();
      }

      // Mobile long-press selection event listeners
      const bubble = row.querySelector('.message-bubble');
      if (bubble) {
        let pressTimer = null;
        const startPress = (e) => {
          if (window.innerWidth > 768) return;
          pressTimer = setTimeout(() => {
            selectMessageForMobileActions(msg.id, row);
          }, 500);
        };

        const cancelPress = () => {
          clearTimeout(pressTimer);
        };

        bubble.addEventListener('touchstart', startPress);
        bubble.addEventListener('touchend', cancelPress);
        bubble.addEventListener('touchmove', cancelPress);

        bubble.addEventListener('mousedown', startPress);
        bubble.addEventListener('mouseup', cancelPress);
        bubble.addEventListener('mouseleave', cancelPress);
        bubble.addEventListener('mousemove', cancelPress);
      }
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
            dismissLinkPreview();
            _linkPreviewDismissed = false; _lastPreviewUrl = null;

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
            if (replyingToMessageId) {
              msgPayload.parent_message_id = replyingToMessageId;
            }

            let notificationRecipientId = null;

            if (other.isGroup) {
              msgPayload.receiver_id = null;
              msgPayload.receiver_school_id = null;
            } else if (other.isSchool) {
              msgPayload.receiver_school_id = other.id;
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

            cancelReply();

            console.log('Message created successfully (Scenario B):', msgPayload);

            // Trigger notification
            if (window.CampusLink && window.CampusLink.notifications) {
              try {
                const senderName = currentUserProfile?.full_name || 'Someone';
                if (other.isGroup) {
                  // Fetch other participants
                  const { data: participants } = await sb
                    .from('conversation_participants')
                    .select('user_id')
                    .eq('conversation_id', activeChatId)
                    .neq('user_id', currentUser.id);

                  if (participants && participants.length > 0) {
                    for (const part of participants) {
                      if (part.user_id) {
                        try {
                          await window.CampusLink.notifications.createNotification(
                            part.user_id,
                            'message',
                            `New message in ${other.name}`,
                            `${senderName}: ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`,
                            `messaging.html?chat_id=${activeChatId}`,
                            currentUser.id
                          );
                        } catch (e) {
                          console.warn('Failed to notify participant:', part.user_id, e);
                        }
                      }
                    }
                  }
                } else {
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
            dismissLinkPreview();
            _linkPreviewDismissed = false; _lastPreviewUrl = null;

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

        // Detect URLs while typing and show link preview
        chatMessageInput.addEventListener('input', () => {
          const text = chatMessageInput.value;
          const url = extractFirstUrl(text);
          if (!url) {
            _linkPreviewDismissed = false;
            _lastPreviewUrl = null;
            const container = document.getElementById('link-preview-container');
            if (container) container.style.display = 'none';
            return;
          }
          if (url === _lastPreviewUrl || _linkPreviewDismissed) return;
          clearTimeout(_linkPreviewDebounce);
          _linkPreviewDebounce = setTimeout(async () => {
            _lastPreviewUrl = url;
            const data = await fetchLinkPreview(url);
            if (data && !_linkPreviewDismissed) showInputLinkPreview(data, url);
          }, 700);
        });

        // Reset dismiss flag when input cleared
        chatMessageInput.addEventListener('input', () => {
          if (!chatMessageInput.value.trim()) {
            _linkPreviewDismissed = false;
            _lastPreviewUrl = null;
          }
        });
      }
    }

    // Make header container clickable to open settings panel (WhatsApp style)
    const chatHeader = document.querySelector('.chat-header');
    if (chatHeader) {
      chatHeader.style.cursor = 'pointer';
      chatHeader.addEventListener('click', (e) => {
        if (e.target.closest('#btn-chat-back') || e.target.closest('#btn-toggle-profile') || e.target.closest('.inquiry-badge-tag')) {
          return;
        }
        if (activeChatId) {
          const activeConv = conversations.find(c => c.id === activeChatId);
          if (activeConv) {
            const other = getOtherParticipant(activeConv);
            profilePanelCollapsed = !profilePanelCollapsed;
            renderProfilePanel(other);
          }
        }
      });
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

  // ── Message Bubble Dropdown Options ──
  window.toggleMessageMenu = function(event, msgId) {
    event.stopPropagation();
    if (window.innerWidth <= 768) {
      const rowEl = document.getElementById(`msg-${msgId}`);
      if (rowEl) {
        selectMessageForMobileActions(msgId, rowEl);
      }
      return;
    }
    // Close any other open message menus first
    document.querySelectorAll('.message-dropdown-menu').forEach(m => {
      if (m.id !== 'menu-' + msgId) m.style.display = 'none';
    });
    
    const menu = document.getElementById('menu-' + msgId);
    if (menu) {
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
  };

  // Close menus when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.message-dropdown-menu').forEach(m => m.style.display = 'none');
  });

  window.copyMessageText = function(event, msgId, triggerBtn) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const rowEl = document.getElementById(`msg-${msgId}`);
    if (rowEl) {
      const bubble = rowEl.querySelector('.message-bubble');
      if (bubble) {
        const textContentSpan = bubble.querySelector('.message-text-content');
        const text = textContentSpan ? textContentSpan.textContent.trim() : bubble.textContent.trim();
        navigator.clipboard.writeText(text).then(() => {
          const btn = triggerBtn || document.getElementById('mobile-action-copy');
          if (btn) {
            const isLink = btn.tagName === 'A';
            if (isLink) {
              // Dropdown link: flash green "✓ Copied" text
              const originalText = btn.textContent;
              const originalColor = btn.style.color;
              btn.textContent = '✓ Copied';
              btn.style.color = '#22c55e';
              btn.style.fontWeight = '600';
              setTimeout(() => {
                btn.textContent = originalText;
                btn.style.color = originalColor;
                btn.style.fontWeight = '';
              }, 1500);
            } else {
              // Icon button: swap to green checkmark SVG
              const originalSvg = btn.innerHTML;
              btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
              btn.style.transform = 'scale(1.3)';
              btn.style.transition = 'transform 0.15s ease';
              setTimeout(() => {
                btn.innerHTML = originalSvg;
                btn.style.transform = 'scale(1)';
              }, 1500);
            }
          }
        }).catch(err => {
          console.error('Failed to copy message:', err);
        });
      }
    }
  };

  window.deleteMessage = async function(event, msgId) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    const sb = getSupabase();
    if (!sb) return;

    try {
      const { error } = await sb
        .from('messages')
        .delete()
        .eq('id', msgId);

      if (error) throw error;
      
      showToast('Message deleted successfully', 'success');
      
      // Update local state and re-render
      if (activeChatId) {
        const conv = conversations.find(c => c.id === activeChatId);
        if (conv) {
          conv.messages = conv.messages.filter(m => m.id !== msgId);
          renderMessageHistory(conv.messages);
        }
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
      showToast('Failed to delete message: ' + err.message, 'error');
    }
  };

  window.replyToMessage = function(event, msgId) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const menu = document.getElementById(`menu-${msgId}`);
    if (menu) menu.style.display = 'none';

    if (!activeConv) return;
    const msg = activeConv.messages.find(m => m.id === msgId);
    if (!msg) return;

    replyingToMessageId = msgId;

    let senderName = 'Someone';
    if (msg.sender_id === currentUser.id) {
      senderName = 'You';
    } else if (msg.sender) {
      senderName = msg.sender.full_name || 'Member';
    } else if (activeConv.conversation_participants) {
      const p = activeConv.conversation_participants.find(cp => cp.profile && cp.profile.id === msg.sender_id);
      if (p && p.profile) senderName = p.profile.full_name || 'Member';
    }

    let cleanMsg = msg.message;
    if (cleanMsg.startsWith('[Inquiry:')) {
      cleanMsg = cleanMsg.substring(cleanMsg.indexOf(']') + 2);
    }

    const replyContainer = document.getElementById('reply-preview-container');
    const replySender = document.getElementById('reply-preview-sender');
    const replyText = document.getElementById('reply-preview-text');

    if (replyContainer && replySender && replyText) {
      replySender.textContent = senderName;
      replyText.textContent = cleanMsg;
      replyContainer.style.display = 'flex';
    }

    if (chatMessageInput) {
      chatMessageInput.focus();
    }
  };

  window.cancelReply = function() {
    replyingToMessageId = null;
    const replyContainer = document.getElementById('reply-preview-container');
    if (replyContainer) {
      replyContainer.style.display = 'none';
    }
  };

  // ── Link Preview Feature ─────────────────────────────────────────────────
  let _linkPreviewDebounce = null;
  let _linkPreviewDismissed = false;
  let _lastPreviewUrl = null;

  // Normalise a raw URL match to a full href (add https:// if missing)
  function normaliseUrl(raw) {
    return /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
  }

  // Regex that matches: https://... | http://... | www.foo.bar | foo.com/... | foo.org
  const URL_REGEX = /(https?:\/\/[^\s<>"']+|(?:www\.)[^\s<>"']+|[a-zA-Z0-9][a-zA-Z0-9-]*\.(?:com|org|net|io|edu|gov|co|app|dev|in|uk|de|fr|au|ca|us|info|biz|me|tv|ai|tech|online|site|blog|store|shop|news|pk|ae|sa)(?:\/[^\s<>"']*)?)/gi;

  // Convert plain URLs in text to clickable <a> tags
  function linkifyText(text) {
    URL_REGEX.lastIndex = 0;
    return text.replace(URL_REGEX, (raw) => {
      const href = normaliseUrl(raw);
      const display = raw.length > 50 ? raw.substring(0, 47) + '...' : raw;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline; word-break: break-all;" onclick="event.stopPropagation();">${display}</a>`;
    });
  }

  // Extract first URL from text and return as a full https:// URL
  function extractFirstUrl(text) {
    URL_REGEX.lastIndex = 0;
    const match = URL_REGEX.exec(text);
    return match ? normaliseUrl(match[0]) : null;
  }

  // Fetch OG / metadata for a URL via microlink.io (free, CORS-enabled)
  async function fetchLinkPreview(url) {
    try {
      const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) return null;
      const json = await res.json();
      if (json.status !== 'success') return null;
      return json.data;
    } catch (e) {
      return null;
    }
  }

  // Show link preview card above the input
  function showInputLinkPreview(data, url) {
    const container = document.getElementById('link-preview-container');
    const card = document.getElementById('link-preview-card');
    if (!container || !card) return;
    const img = data.image?.url || data.logo?.url || '';
    const title = data.title || url;
    const desc = data.description ? data.description.substring(0, 100) + (data.description.length > 100 ? '…' : '') : '';
    const site = data.publisher || new URL(url).hostname;
    card.innerHTML = `
      ${img ? `<img src="${img}" alt="" style="width:60px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;">` : ''}
      <div style="flex:1;min-width:0;">
        <div style="font-size:0.72rem;color:var(--primary);font-weight:600;margin-bottom:2px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;">${site}</div>
        <div style="font-size:0.82rem;font-weight:700;color:var(--text-main);margin-bottom:3px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;">${title}</div>
        ${desc ? `<div style="font-size:0.75rem;color:var(--text-muted);line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${desc}</div>` : ''}
      </div>
    `;
    container.style.display = 'flex';
  }

  window.dismissLinkPreview = function() {
    _linkPreviewDismissed = true;
    const container = document.getElementById('link-preview-container');
    if (container) container.style.display = 'none';
  };

  // Build inline link-preview card HTML for a message (shown below message text)
  async function buildMessageLinkPreviewHtml(url) {
    const data = await fetchLinkPreview(url);
    if (!data) return null;
    const img = data.image?.url || data.logo?.url || '';
    const title = data.title || url;
    const desc = data.description ? data.description.substring(0, 120) + (data.description.length > 120 ? '…' : '') : '';
    const site = data.publisher || new URL(url).hostname;
    return { img, title, desc, site, url };
  }

  // Cache for fetched previews to avoid re-fetching on re-render
  const _previewCache = {};

  // Inject a link preview card into an existing rendered message row
  function injectLinkPreviewIntoRow(rowEl, previewData, isSent) {
    const existingPreview = rowEl.querySelector('.msg-link-preview');
    if (existingPreview) return; // already injected
    const bubble = rowEl.querySelector('.message-bubble');
    if (!bubble) return;
    const { img, title, desc, site, url } = previewData;
    const bgColor     = isSent ? 'rgba(255,255,255,0.15)' : 'var(--light-bg)';
    const borderColor = isSent ? 'rgba(255,255,255,0.4)'  : 'var(--border-color)';
    const titleColor  = isSent ? 'rgba(255,255,255,0.95)' : 'var(--text-main)';
    const descColor   = isSent ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)';
    const siteColor   = isSent ? 'rgba(255,255,255,0.6)'  : 'var(--primary)';
    const urlColor    = isSent ? 'rgba(255,255,255,0.7)'  : 'var(--primary)';

    const previewEl = document.createElement('a');
    previewEl.href = url;
    previewEl.target = '_blank';
    previewEl.rel = 'noopener noreferrer';
    previewEl.className = 'msg-link-preview';
    previewEl.style.cssText = `display:block;text-decoration:none;background:${bgColor};border:1px solid ${borderColor};border-radius:8px;overflow:hidden;margin-bottom:6px;cursor:pointer;`;
    previewEl.innerHTML = `
      ${img ? `<img src="${img}" alt="" style="width:100%;max-height:160px;object-fit:cover;display:block;">` : ''}
      <div style="padding:8px 10px;">
        <div style="font-size:0.68rem;color:${siteColor};font-weight:600;margin-bottom:2px;">${site}</div>
        <div style="font-size:0.82rem;font-weight:700;color:${titleColor};margin-bottom:3px;line-height:1.3;">${title}</div>
        ${desc ? `<div style="font-size:0.72rem;color:${descColor};line-height:1.4;margin-bottom:4px;">${desc}</div>` : ''}
        <div style="font-size:0.68rem;color:${urlColor};margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${url}</div>
      </div>
    `;
    previewEl.addEventListener('click', e => e.stopPropagation());

    // WhatsApp style: card goes BEFORE the message text span
    // so layout is: [preview card] → [URL text below]
    const textSpan = bubble.querySelector('.message-text-content');
    if (textSpan) {
      bubble.insertBefore(previewEl, textSpan);
      // Make the raw URL text below appear smaller and muted
      textSpan.style.cssText = `font-size:0.78rem;color:${urlColor};display:block;margin-top:2px;word-break:break-all;`;
    } else {
      const optionsBtn = bubble.querySelector('.message-options-btn');
      if (optionsBtn) bubble.insertBefore(previewEl, optionsBtn);
      else bubble.appendChild(previewEl);
    }
  }



  window.toggleStarMessage = function(event, msgId) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const menu = document.getElementById(`menu-${msgId}`);
    if (menu) menu.style.display = 'none';

    const starredKey = `starred_messages_${currentUser.id}`;
    let starredIds = [];
    try {
      starredIds = JSON.parse(localStorage.getItem(starredKey)) || [];
    } catch (e) {
      starredIds = [];
    }

    const idx = starredIds.indexOf(msgId);
    if (idx > -1) {
      starredIds.splice(idx, 1);
      showToast('Message unstarred', 'info');
    } else {
      starredIds.push(msgId);
      showToast('Message starred', 'success');
    }

    localStorage.setItem(starredKey, JSON.stringify(starredIds));

    if (activeConv) {
      renderMessageHistory(activeConv.messages);
    }
  };

  window.showMessageInfo = function(event, msgId) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const menu = document.getElementById(`menu-${msgId}`);
    if (menu) menu.style.display = 'none';

    if (!activeConv) return;
    const msg = activeConv.messages?.find(m => m.id === msgId);
    if (!msg) return;

    const isSentByMe = msg.sender_id === currentUser?.id;

    const msgDate = new Date(msg.created_at);
    const dateStr = msgDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Participant stats (for group or DM)
    const participants = (activeConv.conversation_participants || []).filter(p => p.profile?.id !== currentUser?.id);
    const total = participants.length || 1;
    // For now use read_status as proxy for "seen by recipient";
    // in a group all we know is the global read_status flag
    const seenCount  = msg.read_status ? total : 0;
    const delivCount = total; // always delivered if message exists
    const pendCount  = total - seenCount;
    const seenPct    = Math.round((seenCount  / total) * 100);
    const delivPct   = Math.round((delivCount / total) * 100);

    // Build participant rows for the seen/delivered lists
    const seenRows = participants.map(p => {
      const name   = p.profile?.full_name || 'Member';
      const avatar = p.profile?.avatar_url;
      const initials = name.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-color);">
          ${ avatar
            ? `<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;flex-shrink:0;"><img src="${avatar}" alt="" style="width:100%;height:100%;object-fit:cover;object-position:center;display:block;"></div>`
            : `<div style="width:36px;height:36px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;flex-shrink:0;">${initials}</div>`
          }
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.85rem;font-weight:600;color:var(--text-main);">${name}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);">${msg.read_status ? 'Seen · ' + timeStr : 'Delivered'}</div>
          </div>
          ${ msg.read_status
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
          }
        </div>
      `;
    }).join('');


    // Create or reuse the bottom sheet
    let sheet = document.getElementById('msg-info-sheet');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.id = 'msg-info-sheet';
      document.body.appendChild(sheet);
    }

    sheet.innerHTML = `
      <!-- Backdrop -->
      <div id="msg-info-backdrop" onclick="closeMsgInfoSheet()" style="
        position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9998;
        opacity:0;transition:opacity 0.3s ease;
      "></div>
      <!-- Sheet -->
      <div id="msg-info-panel" style="
        position:fixed;bottom:0;left:0;right:0;
        background:#fff;border-radius:18px 18px 0 0;
        box-shadow:0 -4px 32px rgba(0,0,0,0.18);
        z-index:9999;max-height:80vh;display:flex;flex-direction:column;
        transform:translateY(100%);transition:transform 0.35s cubic-bezier(0.32,0.72,0,1);
      ">
        <!-- Handle bar -->
        <div style="display:flex;justify-content:center;padding:10px 0 4px;">
          <div style="width:40px;height:4px;border-radius:2px;background:#d1d5db;"></div>
        </div>
        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 18px 12px;border-bottom:1px solid var(--border-color);">
          <h3 style="margin:0;font-size:1rem;font-weight:700;color:var(--text-main);">Message Info</h3>
          <button onclick="closeMsgInfoSheet()" style="background:none;border:none;padding:4px;cursor:pointer;color:var(--text-muted);font-size:1.2rem;line-height:1;">✕</button>
        </div>
        <!-- Scrollable body -->
        <div style="overflow-y:auto;flex:1;padding:0 18px 24px;">

          <!-- Message preview bubble -->
          <div style="margin:14px 0;padding:10px 14px;background:#f0f7ff;border-left:3px solid var(--primary);border-radius:8px;font-size:0.85rem;color:var(--text-main);line-height:1.5;">
            ${msg.message.substring(0, 200)}${msg.message.length > 200 ? '…' : ''}
          </div>

          ${ isSentByMe ? `
          <!-- Stats row -->
          <div style="display:flex;gap:12px;margin-bottom:20px;">
            <!-- Read -->
            <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 14px;text-align:center;">
              <div style="font-size:1.5rem;font-weight:800;color:#16a34a;">${seenPct}%</div>
              <div style="font-size:0.72rem;color:#15803d;font-weight:600;margin-top:2px;">Seen</div>
              <div style="font-size:0.68rem;color:#4ade80;margin-top:1px;">${seenCount}/${total}</div>
            </div>
            <!-- Delivered -->
            <div style="flex:1;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:12px 14px;text-align:center;">
              <div style="font-size:1.5rem;font-weight:800;color:#2563eb;">${delivPct}%</div>
              <div style="font-size:0.72rem;color:#1d4ed8;font-weight:600;margin-top:2px;">Delivered</div>
              <div style="font-size:0.68rem;color:#93c5fd;margin-top:1px;">${delivCount}/${total}</div>
            </div>
            <!-- Pending -->
            <div style="flex:1;background:#fafafa;border:1px solid var(--border-color);border-radius:12px;padding:12px 14px;text-align:center;">
              <div style="font-size:1.5rem;font-weight:800;color:var(--text-muted);">${pendCount}</div>
              <div style="font-size:0.72rem;color:var(--text-muted);font-weight:600;margin-top:2px;">Pending</div>
              <div style="font-size:0.68rem;color:#d1d5db;margin-top:1px;">not yet</div>
            </div>
          </div>

          <!-- Participants list -->
          ${ participants.length > 0 ? `
          <div style="font-size:0.72rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">
            ${ msg.read_status ? 'Read by' : 'Delivered to' }
          </div>
          ${seenRows}
          ` : '' }
          ` : `
          <!-- Received message info -->
          <div style="text-align:center;padding:16px 0;color:var(--text-muted);font-size:0.85rem;">
            Received from sender
          </div>
          ` }

          <!-- Meta row -->
          <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-color);display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;justify-content:space-between;font-size:0.8rem;">
              <span style="color:var(--text-muted);font-weight:600;">Sent</span>
              <span style="color:var(--text-main);">${dateStr} · ${timeStr}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:0.8rem;">
              <span style="color:var(--text-muted);font-weight:600;">Status</span>
              <span style="color:var(--text-main);">${msg.read_status ? '✓✓ Read' : '✓ Delivered'}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Show with animation
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      const backdrop = document.getElementById('msg-info-backdrop');
      const panel    = document.getElementById('msg-info-panel');
      if (backdrop) backdrop.style.opacity = '1';
      if (panel)    panel.style.transform  = 'translateY(0)';
    });
  };

  window.closeMsgInfoSheet = function() {
    const backdrop = document.getElementById('msg-info-backdrop');
    const panel    = document.getElementById('msg-info-panel');
    if (backdrop) backdrop.style.opacity = '0';
    if (panel)    panel.style.transform  = 'translateY(100%)';
    setTimeout(() => {
      const sheet = document.getElementById('msg-info-sheet');
      if (sheet) sheet.innerHTML = '';
      document.body.style.overflow = '';
    }, 380);
  };


  window.openForwardModal = function(event, msgId) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const menu = document.getElementById(`menu-${msgId}`);
    if (menu) menu.style.display = 'none';

    forwardingMessageId = msgId;

    const modal = document.getElementById('forward-message-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
      setTimeout(() => {
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
      }, 50);
    }

    renderForwardChatsList();
  };

  window.closeForwardModal = function() {
    forwardingMessageId = null;
    const modal = document.getElementById('forward-message-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.style.opacity = '0';
      modal.style.visibility = 'hidden';
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    }
  };

  window.filterForwardChats = function() {
    const search = document.getElementById('forward-search-input').value.toLowerCase().trim();
    renderForwardChatsList(search);
  };

  window.renderForwardChatsList = function(filterText = '') {
    const listContainer = document.getElementById('forward-chats-list');
    if (!listContainer) return;

    if (conversations.length === 0) {
      listContainer.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:0.88rem;">No active chats to forward to.</div>';
      return;
    }

    const filtered = conversations.filter(c => {
      const other = getOtherParticipant(c);
      return other.name.toLowerCase().includes(filterText);
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:0.88rem;">No matching chats.</div>';
      return;
    }

    listContainer.innerHTML = filtered.map(c => {
      const other = getOtherParticipant(c);
      let avatarHtml = '';
      if (other.isGroup) {
        avatarHtml = `<div style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem; flex-shrink: 0;">👥</div>`;
      } else if (other.avatarUrl) {
        avatarHtml = `<div style="width: 36px; height: 36px; border-radius: 50%; background-image: url('${other.avatarUrl}'); background-size: cover; background-position: center; flex-shrink: 0;"></div>`;
      } else {
        avatarHtml = `<div style="width: 36px; height: 36px; border-radius: 50%; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem; flex-shrink: 0;">${other.logoLetter}</div>`;
      }

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-sm); gap: 12px;">
          <div style="display: flex; align-items: center; gap: 10px; overflow: hidden; flex: 1;">
            ${avatarHtml}
            <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${other.name}</span>
          </div>
          <button class="forward-send-btn" onclick="executeForward('${c.id}')">Send</button>
        </div>
      `;
    }).join('');
  };

  window.executeForward = async function(targetConvId) {
    if (!forwardingMessageId) return;

    const sb = getSupabase();
    if (!sb || !currentUser) return;

    const activeConv = conversations.find(c => c.messages.some(m => m.id === forwardingMessageId));
    if (!activeConv) {
      showToast('Message not found', 'error');
      return;
    }

    const msg = activeConv.messages.find(m => m.id === forwardingMessageId);
    if (!msg) return;

    let messageText = msg.message;
    
    const targetConv = conversations.find(c => c.id === targetConvId);
    if (!targetConv) return;
    const targetOther = getOtherParticipant(targetConv);

    const msgPayload = {
      conversation_id: targetConvId,
      sender_id: currentUser.id,
      message: messageText,
      read_status: false
    };

    if (targetOther.isGroup) {
      msgPayload.receiver_id = null;
      msgPayload.receiver_school_id = null;
    } else if (targetOther.isSchool) {
      msgPayload.receiver_school_id = targetOther.id;
    } else {
      msgPayload.receiver_id = targetOther.id;
    }

    try {
      const { error } = await sb
        .from('messages')
        .insert(msgPayload);

      if (error) throw error;

      showToast('Message forwarded!', 'success');
      closeForwardModal();
      await loadConversations();
    } catch (err) {
      console.error('Failed to forward message:', err);
      showToast('Failed to forward message: ' + err.message, 'error');
    }
  };

  window.scrollToMessage = function(msgId) {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const bubble = el.querySelector('.message-bubble');
      if (bubble) {
        const originalBg = bubble.style.backgroundColor;
        bubble.style.backgroundColor = '#FEF08A';
        setTimeout(() => {
          bubble.style.backgroundColor = originalBg;
        }, 1500);
      }
    }
  };

  function selectMessageForMobileActions(msgId, rowEl) {
    try {
      exitMobileSelectionMode();

      selectedMobileMessageId = msgId;
      selectedMobileRowEl = rowEl;

      const bubble = rowEl.querySelector('.message-bubble');
      if (bubble) {
        bubble.style.backgroundColor = 'rgba(99, 102, 241, 0.12)';
        bubble.style.border = '1.5px solid var(--primary)';
      }

      const mobileBar = document.getElementById('mobile-action-bar');
      if (mobileBar) {
        mobileBar.style.display = 'flex';
      }

      const replyBtn = document.getElementById('mobile-action-reply');
      const starBtn = document.getElementById('mobile-action-star');
      const copyBtn = document.getElementById('mobile-action-copy');
      const forwardBtn = document.getElementById('mobile-action-forward');
      const infoBtn = document.getElementById('mobile-action-info');
      const deleteBtn = document.getElementById('mobile-action-delete');

      // Find the message defensively
      let msg = null;
      if (activeConv && activeConv.messages) {
        msg = activeConv.messages.find(m => m.id === msgId);
      }
      if (!msg && conversations) {
        for (const c of conversations) {
          if (c.messages) {
            msg = c.messages.find(m => m.id === msgId);
            if (msg) break;
          }
        }
      }

      if (replyBtn) {
        if (msg) {
          replyBtn.style.display = 'flex';
          replyBtn.onclick = (e) => { replyToMessage(e, msgId); exitMobileSelectionMode(); };
        } else {
          replyBtn.style.display = 'none';
        }
      }
      
      const starredKey = currentUser ? `starred_messages_${currentUser.id}` : 'starred_messages_default';
      let starredIds = [];
      try {
        starredIds = JSON.parse(localStorage.getItem(starredKey)) || [];
      } catch (e) {}
      const isStarred = starredIds.includes(msgId);
      if (starBtn) {
        starBtn.onclick = (e) => { toggleStarMessage(e, msgId); exitMobileSelectionMode(); };
        const starSvg = starBtn.querySelector('svg');
        if (starSvg) {
          starSvg.setAttribute('fill', isStarred ? '#ffffff' : 'none');
        }
      }

      if (copyBtn) copyBtn.onclick = (e) => { copyMessageText(e, msgId, copyBtn); setTimeout(() => exitMobileSelectionMode(), 1600); };
      if (forwardBtn) forwardBtn.onclick = (e) => { openForwardModal(e, msgId); exitMobileSelectionMode(); };
      if (infoBtn) infoBtn.onclick = (e) => { showMessageInfo(e, msgId); exitMobileSelectionMode(); };

      if (deleteBtn) {
        const isSent = msg && currentUser && msg.sender_id === currentUser.id;
        const isConvOwner = activeConv && currentUser && (activeConv.created_by === currentUser.id || activeConv.initiator_id === currentUser.id);
        const canDelete = isSent || isConvOwner;

        if (canDelete) {
          deleteBtn.style.display = 'flex';
          deleteBtn.onclick = (e) => { deleteMessage(e, msgId); exitMobileSelectionMode(); };
        } else {
          deleteBtn.style.display = 'none';
        }
      }
    } catch (err) {
      console.error("selectMessageForMobileActions error:", err);
      showToast("Selection error: " + err.message, "error");
    }
  }

  window.exitMobileSelectionMode = function() {
    if (selectedMobileRowEl) {
      const bubble = selectedMobileRowEl.querySelector('.message-bubble');
      if (bubble) {
        bubble.style.backgroundColor = '';
        bubble.style.border = '';
      }
    }
    const mobileBar = document.getElementById('mobile-action-bar');
    if (mobileBar) {
      mobileBar.style.display = 'none';
    }
    selectedMobileMessageId = null;
    selectedMobileRowEl = null;
  };

  // ── Multi-Step Conversation Creator State ──
  let currentGroupMembersList = [];
  let schoolAlumniBatches = [];
  let selectedGroupMembers = new Set();
  let selectedGroupPhotoBase64 = null;
  let activeConvType = 'group'; // 'group' or 'dm'

  window.selectConvType = function(type) {
    if (type !== 'dm' && type !== 'group') return;
    activeConvType = type;

    // Update Card Borders
    document.querySelectorAll('.conv-type-card').forEach(card => {
      const cardType = card.dataset.type;
      if (cardType === type) {
        card.style.borderColor = 'var(--primary)';
        card.style.background = 'rgba(99, 102, 241, 0.04)';
        card.classList.add('active');
      } else {
        card.style.borderColor = 'var(--border-color)';
        card.style.background = 'var(--white)';
        card.classList.remove('active');
      }
    });

    // Toggle blocks
    const groupInfoSection = document.getElementById('section-group-info');
    const permissionsSection = document.getElementById('section-permissions');
    const visibilitySection = document.getElementById('section-visibility');
    const countEl = document.getElementById('selected-members-count');

    if (type === 'dm') {
      if (groupInfoSection) groupInfoSection.style.display = 'none';
      if (permissionsSection) permissionsSection.style.display = 'none';
      if (visibilitySection) visibilitySection.style.display = 'none';
      if (countEl) countEl.textContent = 'Select recipient';
    } else {
      if (groupInfoSection) groupInfoSection.style.display = 'flex';
      if (permissionsSection) permissionsSection.style.display = 'flex';
      if (visibilitySection) visibilitySection.style.display = 'block';
      if (countEl) countEl.textContent = '0 selected';
    }

    selectedGroupMembers.clear();
    renderMemberChips();
    renderGroupMembers();
  };

  window.handleGroupPhotoChange = function(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        selectedGroupPhotoBase64 = e.target.result;
        const preview = document.getElementById('group-photo-preview');
        if (preview) {
          preview.textContent = '';
          preview.style.backgroundImage = `url('${selectedGroupPhotoBase64}')`;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  function renderGroupMembers(filterText = '') {
    const listContainer = document.getElementById('group-members-list');
    if (!listContainer) return;

    if (currentGroupMembersList.length === 0) {
      listContainer.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:0.8rem;">No members found.</div>';
      return;
    }

    const search = filterText.toLowerCase().trim();
    const filtered = currentGroupMembersList.filter(p => {
      return (p.full_name || '').toLowerCase().includes(search) || 
             (p.username || '').toLowerCase().includes(search) ||
             (p.passing_year || '').toString().toLowerCase().includes(search) ||
             (p.class || '').toLowerCase().includes(search) ||
             (p.department || '').toLowerCase().includes(search) ||
             (p.user_type || '').toLowerCase().includes(search);
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:0.8rem;">No matching members.</div>';
      return;
    }

    // Role Grouping
    const teachers = filtered.filter(p => p.user_type === 'teacher');
    const reps = filtered.filter(p => p.user_type === 'school_representative');
    
    // Grouping Collections
    const studentsByBatch = {};
    const ungroupedStudents = [];
    const alumniByBatch = {};
    const ungroupedAlumni = [];
    const others = [];

    filtered.forEach(p => {
      if (p.user_type === 'student') {
        if (p.passing_year) {
          const yearKey = p.passing_year.toString().trim();
          if (!studentsByBatch[yearKey]) {
            studentsByBatch[yearKey] = [];
          }
          studentsByBatch[yearKey].push(p);
        } else {
          ungroupedStudents.push(p);
        }
      } else if (p.user_type === 'alumni') {
        if (p.passing_year) {
          const yearKey = p.passing_year.toString().trim();
          if (!alumniByBatch[yearKey]) {
            alumniByBatch[yearKey] = [];
          }
          alumniByBatch[yearKey].push(p);
        } else {
          ungroupedAlumni.push(p);
        }
      } else if (p.user_type !== 'teacher' && p.user_type !== 'school_representative') {
        others.push(p);
      }
    });

    let html = '';
    const auth = getAuth();

    const renderSection = (title, list) => {
      if (list.length === 0) return '';
      let sectHtml = `<div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; padding: 6px 8px 4px 8px; background: rgba(0,0,0,0.02); border-radius: 4px; margin-top: 6px;">${title} (${list.length})</div>`;
      sectHtml += list.map(p => {
        const isChecked = selectedGroupMembers.has(p.id);
        
        let roleLabel = auth ? auth.getUserTypeLabel(p.user_type) : 'Member';
        if (p.user_type === 'alumni') {
          if (p.passing_year) {
            roleLabel = p.department ? `Alumni (${p.department}, Class of ${p.passing_year})` : `Alumni (Class of ${p.passing_year})`;
          } else {
            roleLabel = 'Alumni';
          }
        } else if (p.user_type === 'student' && p.class) {
          roleLabel = `Student (${p.class})`;
        } else if (p.user_type === 'teacher' && p.department) {
          roleLabel = `Teacher (${p.department})`;
        }

        const initials = (p.full_name || '?').charAt(0).toUpperCase();
        const avatarHtml = p.avatar_url 
          ? `<div style="width:30px;height:30px;border-radius:50%;background-image:url('${p.avatar_url}');background-size:cover;flex-shrink:0;"></div>`
          : `<div style="width:30px;height:30px;border-radius:50%;background:var(--primary-light);color:var(--primary);font-weight:700;font-size:0.75rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${initials}</div>`;

        const inputType = activeConvType === 'dm' ? 'radio' : 'checkbox';
        const inputName = activeConvType === 'dm' ? 'group-member-radio' : 'group-member-checkbox';

        return `
          <label style="display:flex;align-items:center;gap:10px;padding:8px;cursor:pointer;border-bottom:1px solid rgba(0,0,0,0.03);margin:0;transition:background 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.02)'" onmouseout="this.style.background='transparent'">
            <input type="${inputType}" name="${inputName}" value="${p.id}" ${isChecked ? 'checked' : ''} style="margin:0;cursor:pointer;" onchange="toggleMemberSelection('${p.id}', this.checked)">
            ${avatarHtml}
            <div style="flex-grow:1;min-width:0;line-height:1.2;">
              <div style="font-size:0.85rem;font-weight:600;color:var(--dark-bg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.full_name}</div>
              <div style="font-size:0.7rem;color:var(--text-muted);">${roleLabel}</div>
            </div>
          </label>
        `;
      }).join('');
      return sectHtml;
    };

    html += renderSection('Teachers', teachers);
    html += renderSection('School Representatives', reps);

    // Render Students grouped by Batch/Program
    const sortedStudentYears = Object.keys(studentsByBatch).map(Number).sort((a, b) => b - a);
    sortedStudentYears.forEach(year => {
      const yearKey = year.toString();
      const list = studentsByBatch[yearKey];
      const sample = list.find(s => s.class);
      let title = `Batch of ${year} (Students)`;
      if (sample && sample.class) {
        title = `${sample.class.toUpperCase()} (${year}) (STUDENT)`;
      }
      html += renderSection(title, list);
    });

    if (ungroupedStudents.length > 0) {
      html += renderSection('Students (General)', ungroupedStudents);
    }

    // Sort passing years descending (newer batches first) for Alumni
    const sortedAlumniYears = Object.keys(alumniByBatch).map(Number).sort((a, b) => b - a);
    sortedAlumniYears.forEach(year => {
      const yearKey = year.toString();
      const list = alumniByBatch[yearKey];
      const batchMatch = schoolAlumniBatches.find(b => b.passing_year === year);
      let title = `Batch of ${year} (Alumni)`;
      if (batchMatch && (batchMatch.program || batchMatch.department)) {
        const details = [batchMatch.program, batchMatch.department].filter(Boolean).join(' - ');
        title = `${details} (${year}) (Alumni)`;
      }
      html += renderSection(title, list);
    });

    if (ungroupedAlumni.length > 0) {
      html += renderSection('Alumni (General)', ungroupedAlumni);
    }
    if (others.length > 0) {
      html += renderSection('Others', others);
    }

    listContainer.innerHTML = html;
  }

  window.toggleMemberSelection = function(memberId, isChecked) {
    if (activeConvType === 'dm') {
      selectedGroupMembers.clear();
      if (isChecked) {
        selectedGroupMembers.add(memberId);
      }
    } else {
      if (isChecked) {
        selectedGroupMembers.add(memberId);
      } else {
        selectedGroupMembers.delete(memberId);
      }
    }
    
    const countEl = document.getElementById('selected-members-count');
    if (countEl) {
      if (activeConvType === 'dm') {
        countEl.textContent = selectedGroupMembers.size > 0 ? 'Recipient selected' : 'Select recipient';
      } else {
        countEl.textContent = `${selectedGroupMembers.size} selected`;
      }
    }

    renderMemberChips();
    renderGroupMembers(document.getElementById('group-member-search')?.value || '');
  };

  function renderMemberChips() {
    const chipsContainer = document.getElementById('selected-members-chips');
    if (!chipsContainer) return;
    
    chipsContainer.innerHTML = '';
    selectedGroupMembers.forEach(id => {
      const member = currentGroupMembersList.find(p => p.id === id);
      if (member) {
        const chip = document.createElement('span');
        chip.style.cssText = 'display:inline-flex; align-items:center; gap:6px; background:var(--primary-light); color:var(--primary); font-size:0.78rem; font-weight:600; padding:4px 10px; border-radius:100px; margin-bottom:4px;';
        chip.innerHTML = `
          ${member.full_name}
          <span style="cursor:pointer; font-weight:bold; font-size:0.9rem;" onclick="removeMemberChip('${id}')">&times;</span>
        `;
        chipsContainer.appendChild(chip);
      }
    });
  }

  window.removeMemberChip = function(id) {
    selectedGroupMembers.delete(id);
    const countEl = document.getElementById('selected-members-count');
    if (countEl) {
      if (activeConvType === 'dm') {
        countEl.textContent = 'Select recipient';
      } else {
        countEl.textContent = `${selectedGroupMembers.size} selected`;
      }
    }
    renderMemberChips();
    renderGroupMembers(document.getElementById('group-member-search')?.value || '');
  };

  window.filterGroupMembers = function() {
    const searchVal = document.getElementById('group-member-search').value;
    renderGroupMembers(searchVal);
  };

  window.openGroupModal = async function() {
    console.log('校园社交 messaging.js: openGroupModal() called');
    const modal = document.getElementById('create-group-modal');
    console.log('校园社交 messaging.js: modal element found:', modal);
    if (!modal) return;
    modal.style.display = 'flex';
    modal.classList.add('active');

    if (!currentUserProfile && currentUser) {
      console.log('校园社交 messaging.js: Profile not loaded yet. Loading now...');
      const auth = getAuth();
      if (auth) {
        currentUserProfile = await auth.getProfile(currentUser.id);
        console.log('校园社交 messaging.js: Loaded profile inside modal:', currentUserProfile);
      }
    }

    const isSchoolOrCollegeAdmin = (currentUserProfile?.user_type === 'school_representative' || currentUserProfile?.platform_role === 'school_admin');
    console.log('校园社交 messaging.js: isSchoolOrCollegeAdmin:', isSchoolOrCollegeAdmin);
    
    const modalTitle = modal.querySelector('h3');
    const modalDesc = modal.querySelector('p');
    
    if (isSchoolOrCollegeAdmin) {
      if (modalTitle) modalTitle.textContent = 'Create Conversation';
      if (modalDesc) modalDesc.textContent = 'Start a new conversation or group in your school community.';
    } else {
      if (modalTitle) modalTitle.textContent = 'New Message';
      if (modalDesc) modalDesc.textContent = 'Start a direct message conversation with another school member.';
    }

    // Clear inputs
    document.getElementById('group-name-input').value = '';
    document.getElementById('group-desc-input').value = '';
    document.getElementById('group-member-search').value = '';
    document.getElementById('group-purpose-select').value = 'Class Section Group';
    
    // Clear image previews
    selectedGroupPhotoBase64 = null;
    const preview = document.getElementById('group-photo-preview');
    if (preview) {
      preview.textContent = '👥';
      preview.style.backgroundImage = 'none';
    }

    selectedGroupMembers.clear();
    renderMemberChips();

    // Hide Conversation Type selection for non-admin users
    const convTypeContainer = document.getElementById('conv-type-container');
    if (convTypeContainer && convTypeContainer.parentElement) {
      if (isSchoolOrCollegeAdmin) {
        convTypeContainer.parentElement.style.display = 'block';
        window.selectConvType('group');
      } else {
        convTypeContainer.parentElement.style.display = 'none';
        window.selectConvType('dm');
      }
    } else {
      window.selectConvType(isSchoolOrCollegeAdmin ? 'group' : 'dm');
    }

    const listContainer = document.getElementById('group-members-list');
    if (!listContainer) return;
    listContainer.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:0.8rem;">Loading school members...</div>';

    const sb = getSupabase();
    if (!sb || !currentUserProfile?.school_id) {
      listContainer.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:0.8rem;">No members found. Connect to a school first.</div>';
      return;
    }

    try {
      const { data: profiles, error } = await sb
        .from('profiles')
        .select('id, full_name, username, avatar_url, user_type, passing_year, department, class')
        .eq('school_id', currentUserProfile.school_id)
        .not('id', 'eq', currentUser.id)
        .order('full_name');

      if (error) throw error;

      currentGroupMembersList = profiles || [];

      try {
        const { data: batchData } = await sb
          .from('alumni_batches')
          .select('id, passing_year, program, department')
          .eq('school_id', currentUserProfile.school_id)
          .order('passing_year', { ascending: false });
        schoolAlumniBatches = batchData || [];
      } catch (batchErr) {
        console.warn('Failed to load alumni batches:', batchErr);
        schoolAlumniBatches = [];
      }

      renderGroupMembers();

    } catch (err) {
      console.error('Failed to load school members:', err);
      listContainer.innerHTML = '<div style="padding:12px;text-align:center;color:#EF4444;font-size:0.8rem;">Failed to load members.</div>';
    }
  };

  window.closeGroupModal = function() {
    const modal = document.getElementById('create-group-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
  };

  window.submitCreateGroup = async function() {
    const sb = getSupabase();
    if (!sb || !currentUser) return;

    if (activeConvType === 'group') {
      const isSchoolOrCollegeAdmin = (currentUserProfile?.user_type === 'school_representative' || currentUserProfile?.platform_role === 'school_admin');
      if (!isSchoolOrCollegeAdmin) {
        alert("Only schools and colleges can create groups.");
        return;
      }

      const name = document.getElementById('group-name-input').value.trim();
      const description = document.getElementById('group-desc-input').value.trim();
      const purpose = document.getElementById('group-purpose-select').value;
      const visibility = document.querySelector('input[name="conv-visibility"]:checked')?.value || 'Private';

      if (!name) {
        alert('Please enter a group name.');
        return;
      }

      if (selectedGroupMembers.size === 0) {
        alert('Please select at least one member.');
        return;
      }

      const btn = document.getElementById('btn-submit-group');
      btn.disabled = true;
      btn.textContent = 'Creating...';

      try {
        const { data: newConv, error: err1 } = await sb
          .from('conversations')
          .insert({
            school_id: currentUserProfile.school_id,
            name: name,
            description: purpose, // Storing purpose directly in description so it matches the badge
            avatar_url: selectedGroupPhotoBase64 || null,
            type: 'CLUB',
            initiator_id: currentUser.id,
            status: 'accepted',
            is_archived: false,
            created_by: currentUser.id
          })
          .select()
          .single();

        if (err1) throw err1;

        const allParticipants = [currentUser.id, ...selectedGroupMembers];
        const participantRows = allParticipants.map(uid => ({
          conversation_id: newConv.id,
          user_id: uid
        }));

        const { error: err2 } = await sb
          .from('conversation_participants')
          .insert(participantRows);

        if (err2) throw err2;

        const memberRows = allParticipants.map(uid => ({
          conversation_id: newConv.id,
          user_id: uid,
          role: uid === currentUser.id ? 'Owner' : 'Member'
        }));

        const { error: err3 } = await sb
          .from('conversation_members')
          .insert(memberRows);

        if (err3) throw err3;

        await sb.from('messages').insert({
          conversation_id: newConv.id,
          sender_id: currentUser.id,
          content: `Group "${name}" created for ${purpose}. Visibility is set to ${visibility}.`,
          message: `Group "${name}" created for ${purpose}. Visibility is set to ${visibility}.`,
          type: 'SYSTEM'
        });

        showToast('Group conversation created successfully!', 'success');
        closeGroupModal();

        await loadConversations();
        selectConversation(newConv.id);

        if (chatMessageInput) {
          chatMessageInput.focus();
        }

      } catch (err) {
        console.error('Failed to create group:', err);
        showToast('Failed to create group: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Create Conversation';
      }
    } else {
      if (selectedGroupMembers.size === 0) {
        alert('Please select a recipient.');
        return;
      }
      
      const recipientId = Array.from(selectedGroupMembers)[0];
      closeGroupModal();
      
      await initNewDirectChat(recipientId);
      
      if (chatMessageInput) {
        chatMessageInput.focus();
      }
      
      showToast('Direct conversation opened', 'success');
    }
  };

  // Load group panel members dynamically
  // Load group panel members dynamically
  async function loadGroupPanelMembers(convId) {
    const sb = getSupabase();
    if (!sb) return;

    try {
      // 1. Fetch group participants profiles
      const { data: participants, error } = await sb
        .from('conversation_participants')
        .select(`
          user_id,
          profile:profiles(id, full_name, username, avatar_url, user_type)
        `)
        .eq('conversation_id', convId);

      if (error) throw error;

      // 2. Fetch conversation details to verify creator
      const { data: convDetails, error: detailsErr } = await sb
        .from('conversations')
        .select('created_by, initiator_id')
        .eq('id', convId)
        .single();
        
      if (detailsErr) throw detailsErr;

      // 3. Fetch member roles mapping
      const { data: membersList, error: membersErr } = await sb
        .from('conversation_members')
        .select('user_id, role')
        .eq('conversation_id', convId)
        .is('left_at', null);

      if (membersErr) throw membersErr;

      const memberRoleMap = {};
      membersList.forEach(m => {
        memberRoleMap[m.user_id] = m.role;
      });

      // 4. Fetch group settings
      let settings = null;
      try {
        const { data: settingsData, error: settingsErr } = await sb
          .from('conversation_settings')
          .select('*')
          .eq('conversation_id', convId)
          .single();
        if (settingsErr && settingsErr.code === 'PGRST116') {
          const { data: newSettings } = await sb
            .from('conversation_settings')
            .insert({ conversation_id: convId })
            .select()
            .single();
          settings = newSettings;
        } else if (!settingsErr) {
          settings = settingsData;
        }
      } catch (e) {
        console.warn('Failed to load settings inside panel:', e);
      }

      const isOwner = convDetails && (convDetails.created_by === currentUser.id || convDetails.initiator_id === currentUser.id);
      const isSchoolRep = currentUserProfile?.user_type === 'school_representative' || currentUserProfile?.platform_role === 'school_admin';
      const myRole = memberRoleMap[currentUser.id] || 'Member';
      const hasAdminPrivileges = (myRole === 'Owner' || myRole === 'Admin' || isSchoolRep);

      // Show/Hide settings edit options based on permissions
      if (hasAdminPrivileges) {
        const avatarOverlay = document.getElementById('group-avatar-edit-overlay');
        if (avatarOverlay) avatarOverlay.style.display = 'flex';

        const editNameBtn = document.getElementById('btn-edit-group-name');
        if (editNameBtn) editNameBtn.style.display = 'inline-block';

        const editDescBtn = document.getElementById('btn-edit-group-desc');
        if (editDescBtn) editDescBtn.style.display = 'inline-block';

        const settingsSection = document.getElementById('group-panel-settings-section');
        if (settingsSection) settingsSection.style.display = 'block';

        if (settings) {
          const sendSelect = document.getElementById(`setting-send-messages-${convId}`);
          if (sendSelect) sendSelect.value = settings.send_messages_threshold === 'Admin' ? 'Admin' : 'Everyone';

          const editSelect = document.getElementById(`setting-edit-info-${convId}`);
          if (editSelect) editSelect.value = settings.edit_info_threshold === 'Admin' ? 'Admin' : 'Everyone';
        }
      }

      const addBtn = document.getElementById('btn-group-add-member');
      if (addBtn && (isOwner || isSchoolRep || myRole === 'Admin')) {
        addBtn.style.display = 'flex';
      }

      const listContainer = document.getElementById('group-panel-members-list');
      const countEl = document.getElementById('group-panel-member-count');
      const headerCountEl = document.getElementById('group-panel-header-count');
      
      if (listContainer) {
        listContainer.innerHTML = '';
        if (!participants || participants.length === 0) {
          listContainer.innerHTML = '<div style="text-align:center;color:#8696a0;font-size:0.88rem;padding:8px;">No participants found.</div>';
          return;
        }

        if (countEl) {
          countEl.textContent = `${participants.length} participants`;
        }
        if (headerCountEl) {
          headerCountEl.textContent = `Group · ${participants.length} participants`;
        }

        participants.forEach(p => {
          if (!p.profile) return;
          const prof = p.profile;
          const isCurrentUser = prof.id === currentUser.id;
          const avatarUrl = prof.avatar_url;
          const name = prof.full_name || 'Member';
          const username = prof.username ? `@${prof.username}` : '';
          const role = memberRoleMap[prof.id] || 'Member';
          const roleLabel = isCurrentUser ? 'You' : (role === 'Owner' || role === 'Admin' ? 'Admin' : prof.user_type || 'Member');
          
          const item = document.createElement('div');
          item.className = 'whatsapp-member-row';
          
          const avatarDiv = avatarUrl 
            ? `<div class="whatsapp-member-avatar" style="background-image: url('${avatarUrl}');"></div>`
            : `<div class="whatsapp-member-avatar-letter">${name.charAt(0).toUpperCase()}</div>`;

          let actionBtnHtml = '';
          if (hasAdminPrivileges && !isCurrentUser && role !== 'Owner') {
            actionBtnHtml = `
              <div style="position:relative; display:inline-block;">
                <button class="btn btn-sm btn-icon" style="padding: 2px 4px; background:none; border:none; cursor:pointer; color:#667781;" onclick="toggleMemberActionsMenu(event, '${prof.id}')">
                  ⚙️
                </button>
                <div id="member-actions-menu-${prof.id}" class="member-actions-menu" style="display:none; position:absolute; right:0; top:20px; background:var(--white); border:1px solid var(--border-color); border-radius:var(--radius-sm); box-shadow:var(--shadow-md); z-index:100; min-width:110px; flex-direction:column; padding:4px;">
                  ${role === 'Admin' ? `
                    <button style="padding:6px 10px; font-size:0.7rem; border:none; background:none; cursor:pointer; text-align:left; color:var(--text-main); width:100%;" onmouseover="this.style.background='var(--light-bg)'" onmouseout="this.style.background='none'" onclick="updateMemberRole('${convId}', '${prof.id}', 'Member')">Dismiss Admin</button>
                  ` : `
                    <button style="padding:6px 10px; font-size:0.7rem; border:none; background:none; cursor:pointer; text-align:left; color:var(--text-main); width:100%;" onmouseover="this.style.background='var(--light-bg)'" onmouseout="this.style.background='none'" onclick="updateMemberRole('${convId}', '${prof.id}', 'Admin')">Make Admin</button>
                  `}
                  <button style="padding:6px 10px; font-size:0.7rem; border:none; background:none; cursor:pointer; text-align:left; color:#EF4444; width:100%; border-top:1px solid var(--border-color);" onmouseover="this.style.background='var(--light-bg)'" onmouseout="this.style.background='none'" onclick="removeMemberFromGroup('${convId}', '${prof.id}')">Remove</button>
                </div>
              </div>
            `;
          }

          item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; overflow: hidden; flex-grow: 1;">
              ${avatarDiv}
              <div style="display: flex; flex-direction: column; overflow: hidden;">
                <span style="font-size: 0.95rem; font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${name}${isCurrentUser ? ' (You)' : ''}
                </span>
                <span style="font-size: 0.8rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${username || 'Available'}
                </span>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
              ${role === 'Admin' || role === 'Owner' ? `
                <span class="whatsapp-admin-badge">Group admin</span>
              ` : `
                <span style="font-size: 0.72rem; color: var(--text-muted); background: var(--light-bg); padding: 2.5px 8px; border-radius: 99px; font-weight: 500;">
                  ${roleLabel}
                </span>
              `}
              ${actionBtnHtml}
            </div>
          `;
          listContainer.appendChild(item);
        });
      }

    } catch (err) {
      console.error('Failed to load group panel participants:', err);
      const listContainer = document.getElementById('group-panel-members-list');
      if (listContainer) {
        listContainer.innerHTML = '<div style="text-align:center;color:#EF4444;font-size:0.8rem;padding:8px;">Failed to load.</div>';
      }
    }
  }

  // --- WhatsApp-style Setting & Member Management Helper Actions ---

  window.toggleMemberActionsMenu = function(event, memberId) {
    event.stopPropagation();
    document.querySelectorAll('.member-actions-menu').forEach(menu => {
      if (menu.id !== `member-actions-menu-${memberId}`) {
        menu.style.display = 'none';
      }
    });
    const menu = document.getElementById(`member-actions-menu-${memberId}`);
    if (menu) {
      menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
    }
  };

  // Close menus on click outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.member-actions-menu').forEach(menu => {
      menu.style.display = 'none';
    });
  });

  window.triggerGroupAvatarUpload = function(convId) {
    const input = document.getElementById(`group-avatar-file-input-${convId}`);
    if (input) input.click();
  };

  window.handleGroupAvatarUpload = async function(convId, files) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = async function(e) {
      const base64 = e.target.result;
      const sb = getSupabase();
      if (!sb) return;
      try {
        const { error } = await sb
          .from('conversations')
          .update({ avatar_url: base64 })
          .eq('id', convId);
        if (error) throw error;
        
        await sb.from('messages').insert({
          conversation_id: convId,
          sender_id: currentUser.id,
          content: `${currentUserProfile.full_name || 'Admin'} changed the group profile photo.`,
          message: `${currentUserProfile.full_name || 'Admin'} changed the group profile photo.`,
          type: 'SYSTEM'
        });
        
        showToast('Group profile picture updated!', 'success');
        
        const activeImg = document.getElementById('group-panel-avatar-img');
        if (activeImg) {
          activeImg.style.backgroundImage = `url('${base64}')`;
          activeImg.style.display = 'block';
          const letter = document.getElementById('group-panel-avatar-letter');
          if (letter) letter.style.display = 'none';
        }
        await loadConversations();
        const conv = conversations.find(c => c.id === convId);
        if (conv) selectConversation(convId);
      } catch (err) {
        console.error('Failed to upload group DP:', err);
        showToast('Failed to update group picture: ' + err.message, 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  window.editGroupName = function(convId) {
    const nameTextSpan = document.getElementById('group-panel-name-text');
    const editBtn = document.getElementById('btn-edit-group-name');
    if (!nameTextSpan || !editBtn) return;
    
    if (nameTextSpan.querySelector('input')) return;

    const currentName = nameTextSpan.textContent.trim();
    editBtn.style.display = 'none';
    
    nameTextSpan.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; width: 100%; max-width: 320px; margin: 0 auto;">
        <input type="text" id="inline-group-name-input" value="${currentName}" maxLength="25" style="flex: 1; padding: 6px 10px; font-size: 1.1rem; font-weight: 600; border: 1.5px solid var(--primary); border-radius: 6px; outline: none; text-align: center; background: #ffffff; color: #111b21; box-sizing: border-box;" />
        <button id="btn-save-inline-name" style="background: var(--primary); border: none; color: #ffffff; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;" title="Save">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display: block !important; stroke: #ffffff !important; stroke-width: 3px !important; fill: none !important; width: 16px !important; height: 16px !important;"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button id="btn-cancel-inline-name" style="background: #e9edef; border: none; color: #54656f; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;" title="Cancel">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#54656f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display: block !important; stroke: #54656f !important; stroke-width: 3px !important; fill: none !important; width: 16px !important; height: 16px !important;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `;

    const input = document.getElementById('inline-group-name-input');
    if (input) {
      input.focus();
      input.select();
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          saveName();
        } else if (e.key === 'Escape') {
          cancelEdit();
        }
      });
    }

    async function saveName() {
      const newName = input.value.trim();
      if (!newName) {
        showToast('Group name cannot be empty', 'error');
        return;
      }
      
      const sb = getSupabase();
      if (!sb) return;

      try {
        const { error } = await sb
          .from('conversations')
          .update({ name: newName })
          .eq('id', convId);
        
        if (error) throw error;

        await sb.from('messages').insert({
          conversation_id: convId,
          sender_id: currentUser.id,
          content: `${currentUserProfile.full_name || 'Admin'} renamed the group to "${newName}".`,
          message: `${currentUserProfile.full_name || 'Admin'} renamed the group to "${newName}".`,
          type: 'SYSTEM'
        });

        const conv = conversations.find(c => c.id === convId);
        if (conv) conv.name = newName;

        showToast('Group name updated!', 'success');
        nameTextSpan.textContent = newName;
        editBtn.style.display = 'inline-block';
        
        await loadConversations();
        selectConversation(convId);
      } catch (err) {
        console.error('Failed to edit group name:', err);
        showToast('Failed to update group name: ' + err.message, 'error');
        cancelEdit();
      }
    }

    function cancelEdit() {
      nameTextSpan.textContent = currentName;
      editBtn.style.display = 'inline-block';
    }

    document.getElementById('btn-save-inline-name').onclick = (e) => {
      e.stopPropagation();
      saveName();
    };

    document.getElementById('btn-cancel-inline-name').onclick = (e) => {
      e.stopPropagation();
      cancelEdit();
    };
  };

  window.editGroupDescription = function(convId) {
    const descTextSpan = document.getElementById('group-panel-desc-text');
    const editBtn = document.getElementById('btn-edit-group-desc');
    if (!descTextSpan || !editBtn) return;

    if (descTextSpan.querySelector('textarea')) return;

    const currentDesc = descTextSpan.textContent.trim() === 'Add group description' ? '' : descTextSpan.textContent.trim();
    editBtn.style.display = 'none';

    descTextSpan.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px; width: 100%; margin-top: 6px;">
        <textarea id="inline-group-desc-input" rows="3" maxLength="500" style="width: 100%; padding: 8px 12px; font-size: 0.95rem; line-height: 1.4; border: 1.5px solid var(--primary); border-radius: 6px; outline: none; background: #ffffff; color: #111b21; resize: vertical; box-sizing: border-box; font-family: inherit;">${currentDesc}</textarea>
        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px;">
          <span id="inline-desc-char-count" style="font-size: 0.75rem; color: #667781; margin-right: auto;">${500 - currentDesc.length} characters left</span>
          <button id="btn-save-inline-desc" style="background: var(--primary); border: none; color: #ffffff; padding: 6px 12px; font-size: 0.85rem; font-weight: 600; border-radius: 20px; display: flex; align-items: center; gap: 4px; cursor: pointer;" title="Save">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display: block !important; stroke: #ffffff !important; stroke-width: 3px !important; fill: none !important; width: 14px !important; height: 14px !important;"><polyline points="20 6 9 17 4 12"/></svg>
            <span>Save</span>
          </button>
          <button id="btn-cancel-inline-desc" style="background: #e9edef; border: none; color: #54656f; padding: 6px 12px; font-size: 0.85rem; font-weight: 600; border-radius: 20px; display: flex; align-items: center; gap: 4px; cursor: pointer;" title="Cancel">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#54656f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display: block !important; stroke: #54656f !important; stroke-width: 3px !important; fill: none !important; width: 14px !important; height: 14px !important;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            <span>Cancel</span>
          </button>
        </div>
      </div>
    `;

    const textarea = document.getElementById('inline-group-desc-input');
    const charCountSpan = document.getElementById('inline-desc-char-count');
    if (textarea) {
      textarea.focus();
      textarea.select();

      textarea.addEventListener('input', () => {
        const left = 500 - textarea.value.length;
        if (charCountSpan) charCountSpan.textContent = `${left} characters left`;
      });

      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          cancelEdit();
        }
      });
    }

    async function saveDesc() {
      const newDesc = textarea.value.trim();
      const sb = getSupabase();
      if (!sb) return;

      try {
        const { error } = await sb
          .from('conversations')
          .update({ description: newDesc || null })
          .eq('id', convId);
        
        if (error) throw error;

        await sb.from('messages').insert({
          conversation_id: convId,
          sender_id: currentUser.id,
          content: `${currentUserProfile.full_name || 'Admin'} updated the group description.`,
          message: `${currentUserProfile.full_name || 'Admin'} updated the group description.`,
          type: 'SYSTEM'
        });

        const conv = conversations.find(c => c.id === convId);
        if (conv) conv.description = newDesc || null;

        showToast('Group description updated!', 'success');
        descTextSpan.textContent = newDesc || 'Add group description';
        editBtn.style.display = 'inline-block';

        await loadConversations();
        const updatedConv = conversations.find(c => c.id === convId);
        if (updatedConv) {
          const other = getOtherParticipant(updatedConv);
          renderProfilePanel(other);
        }
      } catch (err) {
        console.error('Failed to edit group description:', err);
        showToast('Failed to update group description: ' + err.message, 'error');
        cancelEdit();
      }
    }

    function cancelEdit() {
      descTextSpan.textContent = currentDesc || 'Add group description';
      editBtn.style.display = 'inline-block';
    }

    document.getElementById('btn-save-inline-desc').onclick = (e) => {
      e.stopPropagation();
      saveDesc();
    };

    document.getElementById('btn-cancel-inline-desc').onclick = (e) => {
      e.stopPropagation();
      cancelEdit();
    };
  };

  window.updateGroupSetting = async function(convId, settingField, value) {
    const sb = getSupabase();
    if (!sb) return;
    try {
      const updateData = {};
      updateData[settingField] = value;
      const { error } = await sb
        .from('conversation_settings')
        .update(updateData)
        .eq('conversation_id', convId);
      if (error) throw error;
      
      let changeDesc = '';
      if (settingField === 'send_messages_threshold') {
        changeDesc = value === 'Admin' ? 'only admins can send messages' : 'all participants can send messages';
      } else if (settingField === 'edit_info_threshold') {
        changeDesc = value === 'Admin' ? 'only admins can edit group settings' : 'all participants can edit group settings';
      }
      
      await sb.from('messages').insert({
        conversation_id: convId,
        sender_id: currentUser.id,
        content: `${currentUserProfile.full_name || 'Admin'} changed group settings: ${changeDesc}.`,
        message: `${currentUserProfile.full_name || 'Admin'} changed group settings: ${changeDesc}.`,
        type: 'SYSTEM'
      });
      
      showToast('Group settings updated!', 'success');
      selectConversation(convId);
    } catch (err) {
      console.error('Failed to update group setting:', err);
      showToast('Failed to update setting: ' + err.message, 'error');
    }
  };

  window.updateMemberRole = async function(convId, memberId, newRole) {
    const sb = getSupabase();
    if (!sb) return;
    try {
      const { error } = await sb
        .from('conversation_members')
        .update({ role: newRole })
        .eq('conversation_id', convId)
        .eq('user_id', memberId);
      if (error) throw error;
      
      const { data: prof } = await sb.from('profiles').select('full_name').eq('id', memberId).single();
      const memberName = prof?.full_name || 'Member';
      
      const announcement = newRole === 'Admin' 
        ? `${currentUserProfile.full_name || 'Admin'} promoted ${memberName} to Group Admin.`
        : `${currentUserProfile.full_name || 'Admin'} dismissed ${memberName} as Group Admin.`;
         
      await sb.from('messages').insert({
        conversation_id: convId,
        sender_id: currentUser.id,
        content: announcement,
        message: announcement,
        type: 'SYSTEM'
      });
      
      showToast(`Role updated to ${newRole}!`, 'success');
      loadGroupPanelMembers(convId);
      selectConversation(convId);
    } catch (err) {
      console.error('Failed to update member role:', err);
      showToast('Failed to update member role: ' + err.message, 'error');
    }
  };

  window.removeMemberFromGroup = async function(convId, memberId) {
    if (!confirm('Are you sure you want to remove this member from the group?')) return;
    const sb = getSupabase();
    if (!sb) return;
    try {
      const { error: err1 } = await sb
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', convId)
        .eq('user_id', memberId);
      if (err1) throw err1;
      
      const { error: err2 } = await sb
        .from('conversation_members')
        .delete()
        .eq('conversation_id', convId)
        .eq('user_id', memberId);
      if (err2) throw err2;
      
      const { data: prof } = await sb.from('profiles').select('full_name').eq('id', memberId).single();
      const memberName = prof?.full_name || 'Member';
      
      const announcement = `${currentUserProfile.full_name || 'Admin'} removed ${memberName} from the group.`;
      await sb.from('messages').insert({
        conversation_id: convId,
        sender_id: currentUser.id,
        content: announcement,
        message: announcement,
        type: 'SYSTEM'
      });
      
      showToast('Member removed from group.', 'success');
      loadGroupPanelMembers(convId);
      selectConversation(convId);
    } catch (err) {
      console.error('Failed to remove member:', err);
      showToast('Failed to remove member: ' + err.message, 'error');
    }
  };

  // Exit group chat (WhatsApp style)
  window.exitGroup = async function(convId) {
    if (!confirm('Are you sure you want to exit this group?')) return;
    const sb = getSupabase();
    if (!sb) return;
    try {
      const { error: err1 } = await sb
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', convId)
        .eq('user_id', currentUser.id);
      if (err1) throw err1;
      
      const { error: err2 } = await sb
        .from('conversation_members')
        .delete()
        .eq('conversation_id', convId)
        .eq('user_id', currentUser.id);
      if (err2) throw err2;
      
      // Post system announcement that the user left
      const announcement = `${currentUserProfile.full_name || 'Member'} left the group.`;
      await sb.from('messages').insert({
        conversation_id: convId,
        sender_id: currentUser.id,
        content: announcement,
        message: announcement,
        type: 'SYSTEM'
      });

      showToast('You have exited the group.');
      
      // Close panel and reset active chat
      profilePanelCollapsed = true;
      const panel = document.getElementById('chat-profile-panel');
      if (panel) panel.style.display = 'none';
      if (messagingCard) {
        messagingCard.classList.remove('profile-panel-open');
        messagingCard.classList.remove('chat-open');
      }
      activeChatId = null;
      if (chatActiveInterface) chatActiveInterface.style.display = 'none';
      if (chatEmptyState) chatEmptyState.style.display = 'flex';
      
      await loadConversations();
    } catch (err) {
      console.error('Exit group failed:', err);
      showToast('Failed to exit group: ' + err.message, 'error');
    }
  };

  // Copy group invite link
  window.copyGroupInviteLink = function(convId) {
    const inviteUrl = window.location.origin + window.location.pathname + '?chat_id=' + convId;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      showToast('Invite link copied to clipboard!', 'success');
    }).catch(err => {
      console.error('Failed to copy link:', err);
      // Fallback method
      const input = document.createElement('input');
      input.value = inviteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showToast('Invite link copied to clipboard!', 'success');
    });
  };

  // Add school member directly to the active group chat
  window.openAddMemberSubModal = async function(convId) {
    console.log('openAddMemberSubModal called for:', convId);
    const sb = getSupabase();
    const auth = getAuth();
    if (!sb) return;

    if (!currentUserProfile && currentUser) {
      try {
        currentUserProfile = await auth.getProfile(currentUser.id);
      } catch (e) {
        console.error('Failed to load user profile in modal:', e);
      }
    }

    if (!currentUserProfile?.school_id) {
      showToast('Unable to add members: Profile school details not found.', 'error');
      return;
    }
    
    try {
      // 1. Fetch current members in group
      const { data: currentMembers, error: err1 } = await sb
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', convId);
        
      if (err1) throw err1;
      const existingUserIds = new Set(currentMembers.map(m => m.user_id));
      
      // 2. Fetch all school members
      const { data: allProfiles, error: err2 } = await sb
        .from('profiles')
        .select('id, full_name, username, avatar_url, user_type, passing_year, department, class')
        .eq('school_id', currentUserProfile.school_id)
        .order('full_name');
        
      if (err2) throw err2;
      
      const eligibleUsers = allProfiles.filter(p => !existingUserIds.has(p.id));
      
      if (eligibleUsers.length === 0) {
        alert("All school members are already participants of this group.");
        return;
      }
      
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay active';
      overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 1000000 !important; display: flex; align-items: center; justify-content: center; padding: 20px;';
      
      overlay.innerHTML = `
        <div style="background: var(--white); border-radius: var(--radius-lg); width: 100%; max-width: 440px; box-shadow: var(--shadow-xl); overflow: hidden; display: flex; flex-direction: column; max-height: 80vh; border: 1px solid var(--border-color);">
          <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <h4 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: var(--dark-bg);">Add Participant</h4>
            <button id="close-add-member-modal" style="background: none; border: none; font-size: 1.35rem; cursor: pointer; color: var(--text-muted);">&times;</button>
          </div>
          <div style="padding: 12px 20px; border-bottom: 1px solid var(--border-color);">
            <input type="text" id="add-member-search" placeholder="Search members to add..." style="width: 100%; padding: 8px 12px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.8rem; outline: none; background: var(--light-bg);">
          </div>
          <div id="add-member-list-container" style="padding: 12px 20px; overflow-y: auto; flex-grow: 1; display: flex; flex-direction: column; gap: 8px;">
            <!-- Eligible members rendered here -->
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      const listContainer = overlay.querySelector('#add-member-list-container');
      const searchInput = overlay.querySelector('#add-member-search');
      
      const renderEligible = (query = '') => {
        listContainer.innerHTML = '';
        const filtered = eligibleUsers.filter(u => {
          const name = (u.full_name || '').toLowerCase();
          const uname = (u.username || '').toLowerCase();
          return name.includes(query.toLowerCase()) || uname.includes(query.toLowerCase());
        });
        
        if (filtered.length === 0) {
          listContainer.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:0.8rem;padding:12px;">No members found.</div>';
          return;
        }
        
        filtered.forEach(u => {
          const name = u.full_name || 'Member';
          const avatarUrl = u.avatar_url;
          
          let roleLabel = auth ? auth.getUserTypeLabel(u.user_type) : 'Member';
          if (u.user_type === 'alumni') {
            if (u.passing_year) {
              roleLabel = u.department ? `Alumni (${u.department}, Class of ${u.passing_year})` : `Alumni (Class of ${u.passing_year})`;
            } else {
              roleLabel = 'Alumni';
            }
          } else if (u.user_type === 'student' && u.class) {
            roleLabel = `Student (${u.class})`;
          } else if (u.user_type === 'teacher' && u.department) {
            roleLabel = `Teacher (${u.department})`;
          }
          
          const row = document.createElement('div');
          row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px; border-radius: var(--radius-sm); background: var(--light-bg); border: 1px solid var(--border-color); transition: all 0.2s ease;';
          
          const avatarDiv = avatarUrl 
            ? `<div style="width: 32px; height: 32px; border-radius: 50%; background-image: url('${avatarUrl}'); background-size: cover; background-position: center; flex-shrink:0;"></div>`
            : `<div style="width: 32px; height: 32px; border-radius: 50%; background: #E2E8F0; color: #64748B; font-weight: 700; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; flex-shrink:0;">${name.charAt(0).toUpperCase()}</div>`;
            
          row.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; overflow: hidden; flex-grow: 1;">
              ${avatarDiv}
              <div style="display: flex; flex-direction: column; overflow: hidden;">
                <span style="font-size: 0.8rem; font-weight: 600; color: var(--dark-bg);">${name}</span>
                <span style="font-size: 0.7rem; color: var(--text-muted);">${roleLabel}</span>
              </div>
            </div>
            <button class="btn btn-sm btn-primary btn-add-user" style="padding: 4px 10px; font-size: 0.72rem; border-radius: var(--radius-sm); cursor: pointer;">Add</button>
          `;
          
          row.querySelector('.btn-add-user').addEventListener('click', async (e) => {
            e.currentTarget.disabled = true;
            e.currentTarget.textContent = 'Adding...';
            try {
              const { error: insErr1 } = await sb
                .from('conversation_participants')
                .insert({ conversation_id: convId, user_id: u.id });
                
              if (insErr1) throw insErr1;
              
              const { error: insErr2 } = await sb
                .from('conversation_members')
                .insert({ conversation_id: convId, user_id: u.id, role: 'Member' });
                
              if (insErr2) throw insErr2;
              
              await sb.from('messages').insert({
                conversation_id: convId,
                sender_id: currentUser.id,
                content: `${currentUserProfile.full_name || 'Admin'} added ${name} to the group.`,
                message: `${currentUserProfile.full_name || 'Admin'} added ${name} to the group.`,
                type: 'SYSTEM'
              });
              
              showToast(`${name} added successfully!`);
              document.body.removeChild(overlay);
              loadGroupPanelMembers(convId);
              
            } catch (addErr) {
              console.error('Failed to add participant:', addErr);
              alert('Failed to add participant: ' + addErr.message);
              e.currentTarget.disabled = false;
              e.currentTarget.textContent = 'Add';
            }
          });
          
          listContainer.appendChild(row);
        });
      };
      
      renderEligible();
      
      searchInput.addEventListener('input', (e) => {
        renderEligible(e.target.value);
      });
      
      overlay.querySelector('#close-add-member-modal').addEventListener('click', () => {
        document.body.removeChild(overlay);
      });
      
    } catch (err) {
      console.error('Failed to load eligible members to add:', err);
      showToast('Failed to load eligible members: ' + err.message, 'error');
    }
  };

  // Run on load (robust ready state check)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
