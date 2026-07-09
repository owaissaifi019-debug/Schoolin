/**
 * mobile-nav.js
 * Global Shared Mobile Bottom Navigation for SchoolIn (CampusLink)
 * ─────────────────────────────────────────────────────────────────
 * Usage: Include this script on every page BEFORE closing </body>.
 * It auto-injects the canonical dark pill nav and marks the active
 * item based on the current page filename.
 *
 * Navigation items:
 *   🏠 Home       → index.html
 *   🤝 Network    → networking.html
 *   ➕ Post       → (opens create-post modal if on index, else goes to index.html?openPost=1)
 *   📅 Events     → events.html
 *   🎓 School     → schools.html
 */

(function () {
  'use strict';

  // ── Page Detection ───────────────────────────────────────────────
  const path = window.location.pathname;
  const file = path.split('/').pop() || 'index.html';

  function isActive(pages) {
    return pages.some(p => file === p || file === '' && p === 'index.html');
  }

  // ── Build the nav HTML ───────────────────────────────────────────
  const homeActive    = isActive(['index.html', '']) ? 'active' : '';
  const networkActive = isActive(['networking.html', 'profile.html']) ? 'active' : '';
  const eventsActive  = isActive(['events.html', 'event-detail.html']) ? 'active' : '';
  const schoolActive  = isActive(['schools.html', 'school-profile.html']) ? 'active' : '';

  const navHTML = `
    <nav class="global-mobile-nav" id="global-mobile-nav" role="navigation" aria-label="Mobile navigation">
      <a href="index.html"
         class="gmn-item ${homeActive}"
         id="gmn-home"
         aria-label="Home">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>Home</span>
      </a>

      <a href="networking.html"
         class="gmn-item ${networkActive}"
         id="gmn-network"
         aria-label="Network">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span>Network</span>
      </a>

      <a href="#"
         class="gmn-item gmn-post-item"
         id="gmn-post"
         aria-label="Create post">
        <div class="gmn-post-circle">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
        <span>Post</span>
      </a>

      <a href="events.html"
         class="gmn-item ${eventsActive}"
         id="gmn-events"
         aria-label="Events">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>Events</span>
      </a>

      <a href="schools.html"
         class="gmn-item ${schoolActive}"
         id="gmn-school"
         aria-label="Schools">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
        </svg>
        <span>School</span>
      </a>
    </nav>
  `;

  // ── Inject the nav ───────────────────────────────────────────────
  function injectNav() {
    // Remove any existing old mobile-bottom-nav elements to prevent duplicates
    document.querySelectorAll('.mobile-bottom-nav').forEach(el => el.remove());

    // Don't inject on admin or login pages
    const skipPages = ['admin', 'login.html', 'dashboard.html'];
    if (skipPages.some(p => path.includes(p))) return;

    // Create wrapper and inject
    const wrapper = document.createElement('div');
    wrapper.innerHTML = navHTML;
    const nav = wrapper.firstElementChild;
    document.body.appendChild(nav);

    // Add bottom padding to body so content isn't hidden behind nav
    document.body.classList.add('has-global-mobile-nav');

    // ── Post button logic ────────────────────────────────────────
    const postBtn = document.getElementById('gmn-post');
    if (postBtn) {
      postBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // On home/feed page: open create post modal
        if (window.CampusLink && window.CampusLink.openCreatePostModal) {
          window.CampusLink.openCreatePostModal('general');
        } else {
          const createPostModal = document.getElementById('create-post-modal');
          if (createPostModal) {
            createPostModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
              const textarea = document.getElementById('post-content-textarea');
              if (textarea) {
                textarea.focus();
                // Bind MentionAutocomplete if not already done
                if (!textarea.hasMentionAutocomplete && window.MentionAutocomplete) {
                  textarea.hasMentionAutocomplete = true;
                  new window.MentionAutocomplete(textarea, (item) => {
                    textarea.selectedMentions = textarea.selectedMentions || [];
                    textarea.selectedMentions.push(item);
                  });
                }
              }
            }, 100);
          } else {
            // On other pages: navigate to home with openPost flag
            window.location.href = 'index.html?openPost=1';
          }
        }
      });
    }
  }

  // ── Auto-open post modal if navigated from another page ──────────
  function checkAutoOpenPost() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openPost') === '1') {
      setTimeout(() => {
        if (window.CampusLink && window.CampusLink.openCreatePostModal) {
          window.CampusLink.openCreatePostModal('general');
          window.history.replaceState({}, '', window.location.pathname);
        } else {
          const createPostModal = document.getElementById('create-post-modal');
          if (createPostModal) {
            createPostModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            const textarea = document.getElementById('post-content-textarea');
            if (textarea) {
              textarea.focus();
              // Bind MentionAutocomplete if not already done
              if (!textarea.hasMentionAutocomplete && window.MentionAutocomplete) {
                textarea.hasMentionAutocomplete = true;
                new window.MentionAutocomplete(textarea, (item) => {
                  textarea.selectedMentions = textarea.selectedMentions || [];
                  textarea.selectedMentions.push(item);
                });
              }
            }
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
          }
        }
      }, 600);
    }
  }

  // ── Init ─────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectNav();
      checkAutoOpenPost();
    });
  } else {
    injectNav();
    checkAutoOpenPost();
  }
})();
