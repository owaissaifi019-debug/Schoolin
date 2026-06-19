// notifications.js
// CampusLink Notification Panel System
// Handles creating, fetching, rendering notifications with a bell icon in the nav bar.

(function () {
  'use strict';

  function getSupabase() {
    return window.CampusLink && window.CampusLink.supabase;
  }

  let currentUser = null;
  let notifications = [];
  let unreadCount = 0;
  let pollInterval = null;
  let panelOpen = false;

  // ── Notification Type Config ─────────────────────────────
  const TYPE_CONFIG = {
    like:                  { icon: '❤️', color: '#EF4444' },
    comment:               { icon: '💬', color: '#3B82F6' },
    connection_request:    { icon: '🤝', color: '#8B5CF6' },
    connection_accepted:   { icon: '✅', color: '#10B981' },
    message:               { icon: '✉️', color: '#F59E0B' },
    admission_application: { icon: '🎓', color: '#EC4899' },
    follow:                { icon: '👤', color: '#06B6D4' }
  };

  // ── Create Notification ──────────────────────────────────
  async function createNotification(recipientId, type, title, body, link, actorId) {
    const sb = getSupabase();
    if (!sb) return;

    // Don't notify yourself
    if (actorId && recipientId === actorId) {
      console.log('Skipping notification creation: Actor is the same as recipient.', { actorId, recipientId });
      return;
    }

    console.log('Attempting to create notification:', { recipientId, type, title, body, link, actorId });

    try {
      const { error } = await sb
        .from('notifications')
        .insert({
          user_id: recipientId,
          actor_id: actorId || null,
          type: type,
          title: title || '',
          body: body || '',
          link: link || '',
          is_read: false
        });

      if (error) {
        console.warn('Failed to create notification:', error.message);
      } else {
        console.log('Notification created successfully in database:', { recipientId, type, title, body, link, actorId });
      }
    } catch (err) {
      console.warn('Notification creation error:', err);
    }
  }

  // ── Fetch Notifications ──────────────────────────────────
  async function fetchNotifications() {
    const sb = getSupabase();
    if (!sb || !currentUser) return [];

    console.log('Fetching notifications for user:', currentUser.id);

    try {
      const { data, error } = await sb
        .from('notifications')
        .select('*, actor:profiles!actor_id(full_name, avatar_url, user_type)')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.warn('Failed to fetch notifications:', error.message);
        return [];
      }

      notifications = data || [];
      unreadCount = notifications.filter(n => !n.is_read).length;
      console.log('Notifications retrieved successfully. Unread count:', unreadCount, 'Total notifications:', notifications.length, 'Notifications list:', notifications);
      return notifications;
    } catch (err) {
      console.warn('Notification fetch error:', err);
      return [];
    }
  }

  // ── Mark as Read ─────────────────────────────────────────
  async function markAsRead(notificationId) {
    const sb = getSupabase();
    if (!sb) return;

    try {
      await sb
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      const notif = notifications.find(n => n.id === notificationId);
      if (notif && !notif.is_read) {
        notif.is_read = true;
        unreadCount = Math.max(0, unreadCount - 1);
        updateBadge();
        updatePanelContent();
      }
    } catch (err) {
      console.warn('Mark as read error:', err);
    }
  }

  async function markAllAsRead() {
    const sb = getSupabase();
    if (!sb || !currentUser) return;

    try {
      await sb
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUser.id)
        .eq('is_read', false);

      notifications.forEach(n => { n.is_read = true; });
      unreadCount = 0;
      updateBadge();
      updatePanelContent();
    } catch (err) {
      console.warn('Mark all as read error:', err);
    }
  }

  // ── Time Formatting ──────────────────────────────────────
  function formatTimeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  // ── Update Badge ─────────────────────────────────────────
  function updateBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;

    if (unreadCount > 0) {
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // ── Update Panel Content ─────────────────────────────────
  function updatePanelContent() {
    const list = document.getElementById('notif-list');
    if (!list) return;

    if (notifications.length === 0) {
      list.innerHTML = `
        <div class="notif-empty">
          <div class="notif-empty-icon">🔔</div>
          <p class="notif-empty-title">No notifications yet</p>
          <p class="notif-empty-subtitle">When someone likes, comments, or connects with you, it will show up here.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = notifications.map(n => {
      const config = TYPE_CONFIG[n.type] || { icon: '🔔', color: '#64748B' };
      const actorName = n.actor?.full_name || 'Someone';
      const timeAgo = formatTimeAgo(n.created_at);
      const readClass = n.is_read ? 'notif-read' : 'notif-unread';

      return `
        <div class="notif-item ${readClass}" data-notif-id="${n.id}" data-link="${n.link || ''}">
          <div class="notif-icon" style="background-color: ${config.color}15; color: ${config.color}">
            <span>${config.icon}</span>
          </div>
          <div class="notif-content">
            <p class="notif-title">${n.title}</p>
            ${n.body ? `<p class="notif-body">${n.body}</p>` : ''}
            <span class="notif-time">${timeAgo}</span>
          </div>
          ${!n.is_read ? '<div class="notif-unread-dot"></div>' : ''}
        </div>
      `;
    }).join('');

    // Bind click handlers
    list.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', async () => {
        const id = item.dataset.notifId;
        const link = item.dataset.link;

        await markAsRead(id);

        if (link) {
          window.location.href = link;
        }
      });
    });
  }

  // ── Toggle Panel ─────────────────────────────────────────
  function togglePanel() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;

    panelOpen = !panelOpen;

    if (panelOpen) {
      panel.classList.add('notif-panel-open');
      updatePanelContent();
    } else {
      panel.classList.remove('notif-panel-open');
    }
  }

  // ── Close on outside click ───────────────────────────────
  function handleOutsideClick(e) {
    const panel = document.getElementById('notif-panel');
    const bell = document.getElementById('notif-bell-btn');
    if (!panel || !bell) return;

    if (panelOpen && !panel.contains(e.target) && !bell.contains(e.target)) {
      panelOpen = false;
      panel.classList.remove('notif-panel-open');
    }
  }

  // ── Render Bell + Panel into Nav ─────────────────────────
  function renderNotificationBell() {
    const bellBtn = document.getElementById('notif-bell-btn');
    if (!bellBtn) return;

    if (bellBtn.dataset.listenerBound) return;
    bellBtn.dataset.listenerBound = 'true';

    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePanel();
    });

    const markAllBtn = document.getElementById('notif-mark-all-btn');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        markAllAsRead();
      });
    }

    document.addEventListener('click', handleOutsideClick);
  }

  // ── Start Polling ────────────────────────────────────────
  function startPolling() {
    if (pollInterval) clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
      await fetchNotifications();
      updateBadge();
      if (panelOpen) {
        updatePanelContent();
      }
    }, 30000); // Every 30 seconds
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  // ── Initialize ───────────────────────────────────────────
  async function init() {
    const sb = getSupabase();
    if (!sb) return;

    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session || !session.user) {
        // Bind guest click handler to redirect to login
        const bellBtn = document.getElementById('notif-bell-btn');
        if (bellBtn && !bellBtn.dataset.listenerBound) {
          bellBtn.dataset.listenerBound = 'true';
          bellBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = 'login.html';
          });
        }
        return; // Not logged in, no notifications
      }

      currentUser = session.user;

      // Render bell icon in nav
      renderNotificationBell();

      // Fetch initial notifications
      await fetchNotifications();
      updateBadge();

      // Start polling
      startPolling();

    } catch (err) {
      console.warn('Notification init error:', err);
    }
  }

  // ── Auto-init on DOMContentLoaded ────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Delay slightly to let auth.js finish
      setTimeout(init, 500);
    });
  } else {
    setTimeout(init, 500);
  }

  // ── Expose API ───────────────────────────────────────────
  window.CampusLink = window.CampusLink || {};
  window.CampusLink.notifications = {
    createNotification,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount: () => unreadCount
  };

})();
