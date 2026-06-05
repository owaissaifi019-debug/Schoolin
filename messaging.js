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
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const nav = document.querySelector('nav');
    if (mobileToggle && nav) {
      mobileToggle.addEventListener('click', () => {
        mobileToggle.classList.toggle('active');
        nav.classList.toggle('active');
      });
    }

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
            profile:profiles(id, full_name, avatar_url, user_type, class, is_verified),
            school:schools(id, name, logo_letter, color_class, city)
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

    if (!otherPart) return { name: 'Unknown User', avatarUrl: null, headline: '', isSchool: false };

    if (otherPart.school) {
      return {
        id: otherPart.school.id,
        name: otherPart.school.name,
        logoLetter: otherPart.school.logo_letter || otherPart.school.name.charAt(0).toUpperCase(),
        colorClass: otherPart.school.color_class || 'bg-gradient-1',
        avatarUrl: null,
        headline: `${otherPart.school.city || 'India'} • School Account`,
        isSchool: true
      };
    } else if (otherPart.profile) {
      const auth = getAuth();
      const roleLabel = auth.getUserTypeLabel(otherPart.profile.user_type);
      const headline = otherPart.profile.class ? `${otherPart.profile.class} • ${roleLabel}` : roleLabel;
      return {
        id: otherPart.profile.id,
        name: otherPart.profile.full_name || 'Member',
        avatarUrl: otherPart.profile.avatar_url,
        logoLetter: (otherPart.profile.full_name || '?').charAt(0).toUpperCase(),
        colorClass: 'bg-gradient-1',
        headline: headline,
        isSchool: false,
        isVerified: otherPart.profile.is_verified
      };
    }

    return { name: 'SchoolIn Member', avatarUrl: null, headline: '', isSchool: false };
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
        // Show accepted, OR pending where we are the initiator (so we can view our sent request)
        if (c.status === 'ignored') return false;
        if (c.status === 'pending' && !isInitiator) return false;
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
        avatarHtml = `<div class="conversation-avatar ${other.colorClass}" style="border-radius:var(--radius-sm); color:var(--white);">${other.logoLetter}</div>`;
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

      // Inquiry badge if any
      let inquiryHtml = '';
      if (conv.school_id && conv.inquiry_type) {
        const labels = {
          admissions: 'Admissions Inquiry',
          events: 'Event Inquiry',
          general_inquiry: 'General Inquiry'
        };
        const label = labels[conv.inquiry_type] || 'Inquiry';
        inquiryHtml = `<span class="inquiry-badge-tag ${conv.inquiry_type}">${label}</span>`;
      }

      // Pending badge if sent request
      let statusBadge = '';
      if (conv.status === 'pending' && conv.initiator_id === currentUser.id) {
        statusBadge = `<span style="font-size:0.7rem; background:#ECEFF1; color:#546E7A; padding:2px 6px; border-radius:4px; margin-top:4px; display:inline-block;">Sent Request</span>`;
      }

      item.innerHTML = `
        ${avatarHtml}
        <div class="conversation-info">
          <div class="conversation-meta-row">
            <span class="conversation-name">${other.name}${other.isVerified ? `
              <svg class="verified-badge verified-badge-sm" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Profile">
                <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
                <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
              </svg>
            ` : ''}</span>
            <span class="conversation-time">${lastMsgTime}</span>
          </div>
          <p class="conversation-last-msg">${lastMsgText}</p>
          ${inquiryHtml}
          ${statusBadge}
        </div>
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
    window.history.pushState({ path: newurl }, '', newurl);

    // Mobile view transition
    if (messagingCard) {
      messagingCard.classList.add('chat-open');
    }

    renderActiveChat(conv);
    await markMessagesAsRead(conv);
  }

  // --- Render Active Chat Details ---
  function renderActiveChat(conv) {
    if (!chatEmptyState || !chatActiveInterface) return;

    chatEmptyState.style.display = 'none';
    chatActiveInterface.style.display = 'flex';

    const other = getOtherParticipant(conv);

    // Header
    if (chatRecipientName) {
          const verifiedBadge = other.isVerified ? `
        <svg class="verified-badge verified-badge-md" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Profile">
          <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
          <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
        </svg>
      ` : '';
      chatRecipientName.innerHTML = other.name + verifiedBadge;
    }
    if (chatRecipientHeadline) chatRecipientHeadline.textContent = other.headline;
    
    if (chatRecipientAvatar) {
      chatRecipientAvatar.innerHTML = '';
      if (other.isSchool) {
        chatRecipientAvatar.className = `chat-recipient-avatar ${other.colorClass}`;
        chatRecipientAvatar.style.borderRadius = 'var(--radius-sm)';
        chatRecipientAvatar.style.backgroundImage = 'none';
        chatRecipientAvatar.style.color = 'var(--white)';
        chatRecipientAvatar.textContent = other.logoLetter;
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

    // Inquiry label in header actions
    if (chatHeaderActions) {
      chatHeaderActions.innerHTML = '';
      if (conv.school_id && conv.inquiry_type) {
        const labels = {
          admissions: 'Admissions Inquiry',
          events: 'Event Inquiry',
          general_inquiry: 'General Inquiry'
        };
        const label = labels[conv.inquiry_type] || 'Inquiry';
        chatHeaderActions.innerHTML = `<span class="inquiry-badge-tag ${conv.inquiry_type}" style="font-size:0.8rem; padding: 6px 12px; border-radius: var(--radius-sm);">${label}</span>`;
      }
    }

    // Message Request Bar setup
    if (messageRequestBar) {
      if (conv.status === 'pending') {
        const isInitiator = conv.initiator_id === currentUser.id;
        messageRequestBar.style.display = 'block';

        if (isInitiator) {
          // Sent request
          if (requestBarText) requestBarText.innerHTML = `⏳ Your connection/message request is pending acceptance by <strong>${other.name}</strong>.`;
          document.getElementById('btn-accept-request').style.display = 'none';
          document.getElementById('btn-ignore-request').style.display = 'none';
          chatMessageInput.disabled = false; // Sender can send multiple messages if they want
          btnSendMessage.disabled = false;
        } else {
          // Received request
          if (requestBarText) requestBarText.innerHTML = `👋 <strong>${other.name}</strong> sent you a message request. Accept to reply.`;
          document.getElementById('btn-accept-request').style.display = 'inline-flex';
          document.getElementById('btn-ignore-request').style.display = 'inline-flex';
          chatMessageInput.disabled = true; // Block receiver replies until accepted
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
        activeChatId = null;
        if (messagingCard) {
          messagingCard.classList.remove('chat-open');
        }
        
        // Remove query param from URL
        const newurl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.pushState({ path: newurl }, '', newurl);
      });
    }

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
            // SCENARIO A: Creating a new direct conversation on first message
            // 1. Create conversation record (status pending)
            const { data: conv, error: convError } = await sb
              .from('conversations')
              .insert({
                status: 'pending',
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

            // 3. Send message
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

            // Clear datasets, reload conversations, and activate chat
            delete chatSendForm.dataset.newChatRecipient;
            chatMessageInput.value = '';
            
            showToast('Message request sent!');
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

            if (other.isSchool) {
              msgPayload.receiver_school_id = other.id;
              // Attempt to fetch the admin user ID of the school if known
              const schoolPart = activeConv.conversation_participants.find(p => p.school_id === other.id);
              // Wait, we query conversations, so we can fetch admin_user_id from schools if it wasn't preloaded
              // or let it be null. But in our db school admin user id is not in participant row, let's keep it null if not known,
              // or let Supabase trigger handle it, or query schools table. Let's do a quick query to fetch admin_user_id:
              const { data: sch } = await sb.from('schools').select('admin_user_id').eq('id', other.id).maybeSingle();
              msgPayload.receiver_id = sch?.admin_user_id || null;
            } else {
              msgPayload.receiver_id = other.id;
            }

            const { error: msgError } = await sb
              .from('messages')
              .insert(msgPayload);

            if (msgError) throw msgError;

            // Update conversations updated_at timestamp to float it to top of sidebar
            await sb
              .from('conversations')
              .update({ updated_at: new Date().toISOString() })
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

  // Run on load
  document.addEventListener('DOMContentLoaded', init);

})();
