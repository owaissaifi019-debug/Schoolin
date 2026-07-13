// profile.js
// CampusLink Student Profile Page Controller
// Handles profile rendering, ownership verification, editing, tag inputs, and saves.

(function () {
  'use strict';

  // State management
  let profileUser = null;
  let currentUser = null;
  let isOwner = false;
  let allSchools = [];
  
  // Tag & List edit states (temporary holding arrays during editing)
  let editSkills = [];
  let editSports = [];
  let editAchievements = [];
  let editCertificates = [];
  let editExperience = []; // Each entry: {title, type, company, location, start_date, end_date, current, description}

  // DOM Elements
  const loadingDiv = document.getElementById('profile-loading');
  const errorDiv = document.getElementById('profile-error');
  const errorMsg = document.getElementById('profile-error-msg');
  const mainDiv = document.getElementById('profile-main');

  const toastContainer = document.getElementById('toast-container');

  // Supabase Client and Auth references
  function getSupabase() {
    return window.CampusLink?.supabase;
  }

  function getAuth() {
    return window.CampusLink?.auth;
  }

  // --- Toast Notifications ---
  function showToast(message, type = 'success') {
    let activeContainer = document.getElementById('toast-container');
    if (!activeContainer) {
      activeContainer = document.createElement('div');
      activeContainer.id = 'toast-container';
      activeContainer.className = 'toast-container';
      document.body.appendChild(activeContainer);
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
    
    activeContainer.appendChild(toast);
    
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

  // --- Initialization ---
  async function init() {
    const sb = getSupabase();
    const auth = getAuth();
    if (!sb || !auth) {
      console.error('Supabase or Auth module is not loaded.');
      return;
    }

    // Refresh navbar authentication state
    await auth.updateNavAuthState();

    // Bind Mobile Navbar Toggle (for header toggle functionality on mobile viewport)
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

    // 1. Determine user profile ID from query param
    const urlParams = new URLSearchParams(window.location.search);
    let profileId = urlParams.get('id');

    // 2. Fetch authenticated session
    const session = await auth.getSession();
    currentUser = session?.user || null;

    if (!profileId) {
      // If no ID in URL, redirect to own profile or login page
      if (currentUser) {
        window.location.href = `profile.html?id=${currentUser.id}`;
        return;
      } else {
        window.location.href = 'login.html';
        return;
      }
    }

    // Bind Share Button
    const shareBtn = document.getElementById('share-profile-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const shareUrl = window.location.href;
        
        function fallbackCopy(url) {
          const textarea = document.createElement('textarea');
          textarea.value = url;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand('copy');
            showToast('Profile link copied to clipboard!');
          } catch (e) {
            console.error('Failed fallback copy:', e);
            alert('Failed to copy link: ' + url);
          }
          document.body.removeChild(textarea);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareUrl).then(() => {
            showToast('Profile link copied to clipboard!');
          }).catch(err => {
            console.error('Failed to copy profile link:', err);
            fallbackCopy(shareUrl);
          });
        } else {
          fallbackCopy(shareUrl);
        }
      });
    }

    // --- Profile More Options Dropdown ---
    const moreBtn = document.getElementById('profile-more-btn');
    const moreDropdown = document.getElementById('profile-more-dropdown');

    if (moreBtn && moreDropdown) {
      // Toggle open/close
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moreDropdown.classList.toggle('active');
      });

      // Close when clicking outside
      document.addEventListener('click', (e) => {
        if (!moreDropdown.contains(e.target) && e.target !== moreBtn) {
          moreDropdown.classList.remove('active');
        }
      });

      const closeDropdown = () => moreDropdown.classList.remove('active');

      // Share item → reuse existing share-profile-btn logic
      const ddShare = document.getElementById('dropdown-share-btn');
      if (ddShare) {
        ddShare.addEventListener('click', () => {
          closeDropdown();
          document.getElementById('share-profile-btn')?.click();
        });
      }

      // Edit Profile item → opens edit modal (visibility set in setupOwnerFeatures)
      const ddEdit = document.getElementById('dropdown-edit-btn');
      if (ddEdit) {
        ddEdit.addEventListener('click', () => {
          closeDropdown();
          openEditModal();
        });
      }

      // Connect item → delegates to the real connect-profile-btn
      const ddConnect = document.getElementById('dropdown-connect-btn');
      if (ddConnect) {
        ddConnect.addEventListener('click', () => {
          closeDropdown();
          document.getElementById('connect-profile-btn')?.click();
        });
      }

      // Follow item → delegates to the real follow-profile-btn
      const ddFollow = document.getElementById('dropdown-follow-btn');
      if (ddFollow) {
        ddFollow.addEventListener('click', () => {
          closeDropdown();
          document.getElementById('follow-profile-btn')?.click();
        });
      }

      // Report User item & Modal Setup
      const ddReport = document.getElementById('dropdown-report-btn');
      const reportUserModal = document.getElementById('report-user-modal');
      const reportUserForm = document.getElementById('report-user-form');
      const reportUserCancel = document.getElementById('report-user-modal-cancel');
      const reportUserClose = document.getElementById('report-user-modal-close');
      const reportUserReasonSelect = document.getElementById('report-user-reason-select');
      const reportUserDetailsTextarea = document.getElementById('report-user-details-textarea');
      const reportUserDetailsRequired = document.getElementById('report-user-details-required');

      function closeReportUserModal() {
        if (reportUserModal) {
          reportUserModal.classList.remove('active');
          reportUserModal.style.display = 'none';
        }
        if (reportUserForm) reportUserForm.reset();
        if (reportUserDetailsTextarea) reportUserDetailsTextarea.required = false;
        if (reportUserDetailsRequired) reportUserDetailsRequired.style.display = 'none';
        document.body.style.overflow = 'auto';
      }

      if (reportUserReasonSelect && reportUserDetailsTextarea && reportUserDetailsRequired) {
        reportUserReasonSelect.addEventListener('change', () => {
          if (reportUserReasonSelect.value === 'Other') {
            reportUserDetailsTextarea.required = true;
            reportUserDetailsRequired.style.display = 'inline';
          } else {
            reportUserDetailsTextarea.required = false;
            reportUserDetailsRequired.style.display = 'none';
          }
        });
      }

      if (reportUserCancel) reportUserCancel.addEventListener('click', closeReportUserModal);
      if (reportUserClose) reportUserClose.addEventListener('click', closeReportUserModal);
      if (reportUserModal) {
        reportUserModal.addEventListener('click', (e) => {
          if (e.target === reportUserModal) closeReportUserModal();
        });
      }

      if (ddReport) {
        ddReport.addEventListener('click', () => {
          closeDropdown();
          if (!currentUser) {
            showToast('You must be logged in to report a user.', 'error');
            return;
          }
          if (reportUserModal) {
            reportUserModal.classList.add('active');
            reportUserModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
          }
        });
      }

      const ddBlock = document.getElementById('dropdown-block-btn');
      const blockUserModal = document.getElementById('block-user-modal');
      const blockConfirmBtn = document.getElementById('block-user-modal-confirm');
      const blockCancelBtn = document.getElementById('block-user-modal-cancel');

      function closeBlockModal() {
        if (blockUserModal) {
          blockUserModal.classList.remove('active');
          blockUserModal.style.display = 'none';
        }
        document.body.style.overflow = 'auto';
      }

      if (blockCancelBtn) blockCancelBtn.addEventListener('click', closeBlockModal);
      if (blockUserModal) {
        blockUserModal.addEventListener('click', (e) => {
          if (e.target === blockUserModal) closeBlockModal();
        });
      }

      if (ddBlock) {
        ddBlock.addEventListener('click', () => {
          closeDropdown();
          if (!currentUser) {
            showToast('You must be logged in to block a user.', 'error');
            return;
          }
          if (isOwner) {
            showToast('You cannot block yourself.', 'error');
            return;
          }
          if (blockUserModal) {
            blockUserModal.classList.add('active');
            blockUserModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
          }
        });
      }

      if (blockConfirmBtn) {
        blockConfirmBtn.addEventListener('click', async () => {
          const sb = getSupabase();
          if (!sb) return;

          blockConfirmBtn.disabled = true;
          blockConfirmBtn.textContent = 'Blocking...';

          try {
            const { error } = await sb.from('user_blocks').insert({
              blocker_id: currentUser.id,
              blocked_id: profileId
            });
            if (error) throw error;
            showToast('User blocked successfully.');
            closeBlockModal();
            setTimeout(() => {
              window.location.href = 'index.html';
            }, 1000);
          } catch (err) {
            console.error('Failed to block user:', err);
            showToast('Failed to block user: ' + err.message, 'error');
            blockConfirmBtn.disabled = false;
            blockConfirmBtn.textContent = 'Block Account';
          }
        });
      }

      if (reportUserForm) {
        reportUserForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (!currentUser) {
            showToast('You must be logged in to report a user.', 'error');
            return;
          }
          const sb = getSupabase();
          if (!sb) return;

          const reason = reportUserReasonSelect ? reportUserReasonSelect.value : 'Inappropriate profile / behavior';
          const details = reportUserDetailsTextarea ? reportUserDetailsTextarea.value : 'Reported from profile dropdown menu';

          try {
            const { error } = await sb.from('user_reports').insert({
              reported_user_id: profileId,
              reporter_id: currentUser.id,
              reason: reason,
              details: details || 'No additional details provided.'
            });

            if (error) throw error;
            showToast('User report submitted. Our team will review it shortly.');
            closeReportUserModal();
          } catch (err) {
            console.error('Failed to submit user report:', err);
            showToast('Failed to submit report: ' + err.message, 'error');
          }
        });
      }
    }

    // 3. Load Profile details

    await loadProfileData(profileId);

    // If query parameters demand edit modal and user is owner
    if (isOwner && urlParams.get('open_edit') === 'true') {
      setTimeout(() => {
        openEditModal();
      }, 300);
    }
  }

  // --- Load Profile Data ---
  async function loadProfileData(profileId) {
    const sb = getSupabase();
    const auth = getAuth();

    try {
      // Fetch user profile info
      const { data: profile, error: profileError } = await sb
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        showErrorState('Student Profile Not Found');
        return;
      }

      profileUser = profile;
      isOwner = currentUser && currentUser.id === profile.id;

      // Redirect school representatives and school admins to their school profile or dashboard
      if (profile.user_type === 'school_representative' || profile.platform_role === 'school_admin') {
        let redirectSchoolId = profile.school_id;
        if (!redirectSchoolId) {
          const { data: sch } = await sb.from('schools').select('id').eq('admin_user_id', profile.id).maybeSingle();
          if (sch) {
            redirectSchoolId = sch.id;
          }
        }
        if (redirectSchoolId) {
          window.location.href = `school-profile.html?id=${redirectSchoolId}`;
          return;
        } else if (isOwner) {
          window.location.href = 'dashboard.html';
          return;
        } else {
          showErrorState('This user is a school representative / administrator and does not have a student profile.');
          return;
        }
      }

      // Fetch School details if linked
      let school = null;
      let affiliation = null;
      if (profile.school_id) {
        const { data: schoolData, error: schoolError } = await sb
          .from('schools')
          .select('*')
          .eq('id', profile.school_id)
          .maybeSingle();
        
        if (!schoolError) {
          school = schoolData;
        }

        try {
          const { data: affData, error: affError } = await sb
            .from('school_members')
            .select('id, role, assigned_at')
            .eq('school_id', profile.school_id)
            .eq('user_id', profileId)
            .maybeSingle();

          if (!affError && affData) {
            affiliation = affData;
          }
        } catch (affErr) {
          console.warn('Failed to query school affiliation:', affErr);
        }
      }

      // Fetch Follow details
      let followersCount = 0;
      let isFollowing = false;

      const { count: countVal, error: countError } = await sb
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileId);
      if (!countError) {
        followersCount = countVal || 0;
      }

      if (currentUser && currentUser.id !== profileId) {
        const { data: followData, error: followCheckError } = await sb
          .from('follows')
          .select('*')
          .eq('follower_id', currentUser.id)
          .eq('following_id', profileId)
          .maybeSingle();
        if (!followCheckError && followData) {
          isFollowing = true;
        }
      }

      // Fetch Connection details
      let connectionsCount = 0;
      let connectionStatus = null;

      // Count accepted connections for this profile (accepted user-to-user links)
      const { count: connCountVal, error: connCountError } = await sb
        .from('connections')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`requester_id.eq.${profileId},receiver_id.eq.${profileId}`);
      if (!connCountError) {
        connectionsCount = connCountVal || 0;
      }

      if (currentUser && currentUser.id !== profileId) {
        const { data: connData, error: connError } = await sb
          .from('connections')
          .select('*')
          .or(`and(requester_id.eq.${currentUser.id},receiver_id.eq.${profileId}),and(requester_id.eq.${profileId},receiver_id.eq.${currentUser.id})`)
          .maybeSingle();

        if (!connError && connData) {
          if (connData.status === 'accepted') {
            connectionStatus = 'accepted';
          } else if (connData.status === 'pending') {
            if (connData.requester_id === currentUser.id) {
              connectionStatus = 'pending_sent';
            } else {
              connectionStatus = 'pending_received';
            }
          } else if (connData.status === 'rejected') {
            if (connData.requester_id === currentUser.id) {
              connectionStatus = 'rejected_sent';
            } else {
              connectionStatus = 'rejected_received';
            }
          }
        }
      }

      // Fetch Posts Count
      let postsCount = 0;
      const { count: postsCountVal, error: postsCountError } = await sb
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profileId);
      if (!postsCountError) {
        postsCount = postsCountVal || 0;
      }

      // Fetch Events Count (Event Registrations where student registered)
      let eventsCount = 0;
      const { count: eventsCountVal, error: eventsCountError } = await sb
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', profileId);
      if (!eventsCountError) {
        eventsCount = eventsCountVal || 0;
      }

      // Render the profile views
      renderProfileView(profile, school, followersCount, isFollowing, postsCount, eventsCount, affiliation);

      // Update connections count display
      const connectionsEl = document.getElementById('profile-connections-count');
      if (connectionsEl) {
        connectionsEl.textContent = `${connectionsCount} connection${connectionsCount !== 1 ? 's' : ''}`;
      }
      
      // Setup follow and connect buttons if not owner
      if (!isOwner) {
        setupFollowButton(profileId, isFollowing, followersCount);
        setupConnectButton(profileId, connectionStatus, connectionsCount);
        setupMessageButton(profileId);
      }
      
      // Setup edit capabilities if user is profile owner
      if (isOwner) {
        setupOwnerFeatures();
      }

      // Setup super admin verification control
      const platformRole = await auth.getUserRole();
      if (currentUser && platformRole === 'super_admin') {
        setupVerifyButton(profileId, profile.is_verified);
      }

      // Show profile container, hide loader
      if (loadingDiv) loadingDiv.style.display = 'none';
      if (mainDiv) mainDiv.style.display = 'block';

    } catch (err) {
      console.error('Error loading profile data:', err);
      showErrorState(err.message || 'An error occurred while loading profile details.');
    }
  }

  // --- Show Error Screen ---
  function showErrorState(msg) {
    if (loadingDiv) loadingDiv.style.display = 'none';
    if (mainDiv) mainDiv.style.display = 'none';
    if (errorDiv) {
      errorDiv.style.display = 'flex';
      if (errorMsg) errorMsg.textContent = msg;
    }
  }

  // --- Render Profile View Mode ---
  function renderProfileView(profile, school, followersCount, isFollowing, postsCount = 0, eventsCount = 0, affiliation = null) {
    const auth = getAuth();

    // 0. Cover photo display
    const heroBannerEl = document.querySelector('.profile-hero-banner');
    if (heroBannerEl) {
      const storedCover = localStorage.getItem(`cover_photo_${profile.id}`);
      if (storedCover) {
        heroBannerEl.style.backgroundImage = `url(${storedCover})`;
        heroBannerEl.style.backgroundSize = 'cover';
        heroBannerEl.style.backgroundPosition = 'center';
      } else {
        heroBannerEl.style.backgroundImage = '';
      }
    }

    // 1. Profile Avatar & Name
    const nameEl = document.getElementById('profile-full-name');
    const headlineEl = document.getElementById('profile-headline');
    const avatarEl = document.getElementById('profile-avatar-display');

    if (nameEl) {
      const verifiedBadge = profile.is_verified ? `
        <svg class="verified-badge verified-badge-lg" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Profile">
          <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
          <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
        </svg>
      ` : '';
      const escape = window.CampusLink?.security?.escapeHTML || (s => s);
      nameEl.innerHTML = escape(profile.full_name || 'No Name Provided') + verifiedBadge;
    }

    const usernameEl = document.getElementById('profile-username');
    if (usernameEl) {
      usernameEl.textContent = profile.username ? `@${profile.username}` : '';
    }


    
    // Headline e.g. "Student at Delhi Public School"
    let headlineStr = auth.getUserTypeLabel(profile.user_type);
    if (profile.class) {
      headlineStr = `${profile.class} • ${headlineStr}`;
    }
    if (school) {
      headlineStr = `${headlineStr} at ${school.name}`;
    }
    if (headlineEl) headlineEl.textContent = headlineStr;

    // Avatar display
    if (avatarEl) {
      avatarEl.innerHTML = '';
      if (profile.avatar_url) {
        avatarEl.style.backgroundImage = `url(${profile.avatar_url})`;
        avatarEl.style.backgroundSize = 'cover';
        avatarEl.style.backgroundPosition = 'center';
      } else {
        avatarEl.style.backgroundImage = 'none';
        const initial = (profile.full_name || '?').charAt(0).toUpperCase();
        avatarEl.innerHTML = `<span class="avatar-initial">${initial}</span>`;
      }
    }

    // Badges
    const typeBadge = document.getElementById('profile-type-badge');
    const roleBadge = document.getElementById('profile-role-badge');
    if (typeBadge) {
      typeBadge.textContent = auth.getUserTypeLabel(profile.user_type);
      typeBadge.className = `badge-type ${profile.user_type || 'student'}`;
    }
    if (roleBadge) {
      if (profile.platform_role && profile.platform_role !== 'user') {
        roleBadge.textContent = auth.getPlatformRoleLabel(profile.platform_role);
        roleBadge.className = `badge-role ${profile.platform_role}`;
        roleBadge.style.display = 'inline-block';
      } else {
        roleBadge.style.display = 'none';
      }
    }

    // Show verification pending notification on profile if owner is unverified teacher
    if (profile.user_type === 'teacher' && isOwner) {
      const teachersRaw = localStorage.getItem('campuslink_teachers');
      const teachers = teachersRaw ? JSON.parse(teachersRaw) : [];
      const displayName = profile.full_name || '';
      const matchingTeacher = teachers.find(t => 
        t.fullName.toLowerCase() === displayName.toLowerCase() || 
        t.email?.toLowerCase() === currentUser.email?.toLowerCase()
      );

      const isVerified = matchingTeacher ? matchingTeacher.verificationStatus === 'verified' : false;
      
      if (!isVerified) {
        let profileNotice = document.getElementById('profile-classroom-unverified-banner');
        if (!profileNotice) {
          profileNotice = document.createElement('div');
          profileNotice.id = 'profile-classroom-unverified-banner';
          profileNotice.style.cssText = 'background: #FFFBEB; border: 1.5px dashed #F59E0B; border-radius: 12px; padding: 16px; margin-top: 16px; display: flex; flex-direction: column; gap: 8px; font-size: 0.82rem; color: #B45309; width: 100%; box-sizing: border-box;';
          profileNotice.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; font-weight:800; font-size:0.9rem;">
              <span>⚠️</span> Account Verification Pending
            </div>
            <div style="font-weight: 500;">Join a school to access Classrooms. Once a school verifies your account, your primary classroom workspace will be unlocked.</div>
          `;
          
          const profileCard = document.querySelector('.profile-header-card');
          if (profileCard) {
            profileCard.appendChild(profileNotice);
          }
        }
      } else {
        const profileNotice = document.getElementById('profile-classroom-unverified-banner');
        if (profileNotice) profileNotice.remove();
      }
    }

    // Update Stats
    const postsCountEl = document.getElementById('profile-posts-count');
    if (postsCountEl) postsCountEl.textContent = postsCount;

    const eventsCountEl = document.getElementById('profile-events-count');
    if (eventsCountEl) eventsCountEl.textContent = eventsCount;

    const followersCountStatEl = document.getElementById('profile-followers-count-stat');
    if (followersCountStatEl) followersCountStatEl.textContent = followersCount;

    // Dynamically alter share button text
    const shareBtnSpan = document.querySelector('#share-profile-btn span');
    if (shareBtnSpan) {
      shareBtnSpan.textContent = isOwner ? 'Share Profile' : 'Share';
    }

    // Follow Button display
    const followBtn = document.getElementById('follow-profile-btn');
    if (followBtn) {
      if (currentUser && !isOwner) {
        followBtn.style.display = 'inline-flex';
        updateFollowButtonState(followBtn, isFollowing);
      } else if (!currentUser) {
        followBtn.style.display = 'inline-flex';
        updateFollowButtonState(followBtn, false);
      } else {
        followBtn.style.display = 'none';
      }
    }

    // Connect / Follow / Message / Report Button display (Visitor only)
    const connectBtn = document.getElementById('connect-profile-btn');
    const ddConnectBtn = document.getElementById('dropdown-connect-btn');
    const ddFollowBtn = document.getElementById('dropdown-follow-btn');
    const ddReportBtn = document.getElementById('dropdown-report-btn');
    const shareBtn = document.getElementById('share-profile-btn');

    const isVisitor = (currentUser && !isOwner) || !currentUser;

    if (connectBtn) connectBtn.style.display = isVisitor ? 'inline-flex' : 'none';
    if (ddConnectBtn) ddConnectBtn.style.display = isVisitor ? 'flex' : 'none';
    if (ddFollowBtn) ddFollowBtn.style.display = isVisitor ? 'flex' : 'none';
    if (ddReportBtn) ddReportBtn.style.display = isVisitor ? 'flex' : 'none';
    const ddBlockBtn = document.getElementById('dropdown-block-btn');
    if (ddBlockBtn) ddBlockBtn.style.display = isVisitor ? 'flex' : 'none';
    if (shareBtn) shareBtn.style.display = isOwner ? 'inline-flex' : 'none';

    // Message Button display
    const messageBtn = document.getElementById('message-profile-btn');
    if (messageBtn) messageBtn.style.display = isVisitor ? 'inline-flex' : 'none';

    // 2. About / Bio Card
    const bioCard = document.getElementById('section-bio-card');
    const bioContent = document.getElementById('profile-bio-content');
    if (bioCard && bioContent) {
      if (profile.bio && profile.bio.trim() !== '') {
        bioContent.textContent = profile.bio;
        bioContent.style.whiteSpace = 'pre-wrap';
        bioCard.style.display = 'block';
      } else {
        bioCard.style.display = 'none';
      }
    }

    // 3. Skills Chips List
    const skillsCard = document.getElementById('section-skills-card');
    const skillsContainer = document.getElementById('profile-skills-list');
    if (skillsCard && skillsContainer) {
      const skillsArray = profile.skills || [];
      if (skillsArray.length > 0) {
        skillsContainer.innerHTML = '';
        skillsArray.forEach(skill => {
          const chip = document.createElement('span');
          chip.className = 'profile-skill-chip';
          chip.textContent = skill;
          skillsContainer.appendChild(chip);
        });
        skillsCard.style.display = 'block';
      } else {
        skillsCard.style.display = 'none';
      }
    }

    // 4. Achievements Timeline
    const achievementsCard = document.getElementById('section-achievements-card');
    const achievementsContainer = document.getElementById('profile-achievements-list');
    if (achievementsCard && achievementsContainer) {
      const achArray = profile.achievements || [];
      if (achArray.length > 0) {
        achievementsContainer.innerHTML = '';
        achArray.forEach(ach => {
          const escape = window.CampusLink?.security?.escapeHTML || (s => s);
          const item = document.createElement('div');
          item.className = 'achievements-timeline-item';
          item.innerHTML = `
            <div class="timeline-dot">🏆</div>
            <div class="timeline-content">
              <p class="timeline-desc">${escape(ach)}</p>
            </div>
          `;
          achievementsContainer.appendChild(item);
        });
        achievementsCard.style.display = 'block';
      } else {
        achievementsCard.style.display = 'none';
      }
    }

    // 5. Sports List
    const sportsCard = document.getElementById('section-sports-card');
    const sportsContainer = document.getElementById('profile-sports-list');
    if (sportsCard && sportsContainer) {
      const sportsArray = profile.sports || [];
      if (sportsArray.length > 0) {
        sportsContainer.innerHTML = '';
        sportsArray.forEach(sport => {
          const escape = window.CampusLink?.security?.escapeHTML || (s => s);
          const chip = document.createElement('span');
          chip.className = 'profile-sport-chip';
          chip.innerHTML = `<span class="sport-icon">⚽</span> ${escape(sport)}`;
          sportsContainer.appendChild(chip);
        });
        sportsCard.style.display = 'block';
      } else {
        sportsCard.style.display = 'none';
      }
    }

    // 6. Certificates Cards Grid
    const certificatesCard = document.getElementById('section-certificates-card');
    const certificatesContainer = document.getElementById('profile-certificates-list');
    if (certificatesCard && certificatesContainer) {
      const certsArray = profile.certificates || [];
      if (certsArray.length > 0) {
        certificatesContainer.innerHTML = '';
        certsArray.forEach(cert => {
          const escape = window.CampusLink?.security?.escapeHTML || (s => s);
          const card = document.createElement('div');
          card.className = 'profile-cert-card';
          card.innerHTML = `
            <div class="cert-icon">📜</div>
            <div class="cert-info">
              <h4 class="cert-title">${escape(cert)}</h4>
              <p class="cert-issuer">Verified Certificate</p>
            </div>
          `;
          certificatesContainer.appendChild(card);
        });
        certificatesCard.style.display = 'block';
      } else {
        certificatesCard.style.display = 'none';
      }
    }

    // 7. Education Sidebar Details
    const sbSchoolLogo = document.getElementById('sidebar-school-logo');
    const sbSchoolTitle = document.getElementById('sidebar-school-name');
    const sbSchoolSub = document.getElementById('sidebar-school-board');
    const sbSchoolCity = document.getElementById('sidebar-school-city');
    const sbClassVal = document.getElementById('sidebar-class-val');
    const sbEmailVal = document.getElementById('sidebar-email-val');

    if (school) {
      if (sbSchoolLogo) {
        sbSchoolLogo.textContent = school.logo_letter || school.name.charAt(0).toUpperCase();
        sbSchoolLogo.className = `school-logo-placeholder ${school.color_class || 'bg-gradient-1'}`;
      }
      if (sbSchoolTitle) {
        const escape = window.CampusLink?.security?.escapeHTML || (s => s);
        sbSchoolTitle.innerHTML = `<a href="school-profile.html?id=${school.id}">${escape(school.name)}</a>`;
      }
      if (sbSchoolSub) sbSchoolSub.textContent = school.board ? `${school.board} Affiliation` : 'Registered School';
      if (sbSchoolCity) sbSchoolCity.textContent = school.city || '';
    } else {
      if (sbSchoolLogo) {
        sbSchoolLogo.textContent = '🏫';
        sbSchoolLogo.className = 'school-logo-placeholder';
      }
      if (sbSchoolTitle) sbSchoolTitle.textContent = 'No School Linked';
      if (sbSchoolSub) sbSchoolSub.textContent = isOwner ? 'Select school in Edit Profile' : 'Not linked to any school';
      if (sbSchoolCity) sbSchoolCity.textContent = '';
    }

    if (sbClassVal) sbClassVal.textContent = profile.class || 'Not Specified';
    if (sbEmailVal) sbEmailVal.textContent = isOwner ? (profile.email || 'Private') : 'Private';

    // 8. School Affiliation Badge
    const affContainer = document.getElementById('profile-affiliation-badge-container');
    if (affContainer) {
      affContainer.style.display = 'none';
      affContainer.innerHTML = '';
      
      if (school) {
        if (affiliation) {
          // Verified member badge
          let icon = '🏅';
          let roleTitle = 'Member';
          
          if (affiliation.role === 'teacher') {
            icon = '🏅';
            roleTitle = 'Teacher';
          } else if (affiliation.role === 'alumni') {
            icon = '🎓';
            roleTitle = 'Alumni';
          } else if (affiliation.role === 'student') {
            icon = '📚';
            roleTitle = 'Student';
          } else if (affiliation.role) {
            roleTitle = affiliation.role;
          }
          
          affContainer.className = 'profile-affiliation-badge-container';
          affContainer.innerHTML = `
            <span class="profile-affiliation-icon">${icon}</span>
            <span>
              ${roleTitle} at <a href="school-profile.html?id=${school.id}">${school.name}</a>
              <span style="font-weight: normal; opacity: 0.85;">— Verified by School</span>
            </span>
            <span class="profile-affiliation-verified-tick" title="Verified Member">✓</span>
          `;
          affContainer.style.display = 'inline-flex';
        } else {
          // Unverified member badge
          affContainer.className = 'profile-affiliation-badge-container unverified';
          affContainer.innerHTML = `
            <span class="profile-affiliation-icon">🏫</span>
            <span>
              Member of <a href="school-profile.html?id=${school.id}">${school.name}</a>
              <span style="font-weight: normal; opacity: 0.85;">— Unverified</span>
            </span>
          `;
          affContainer.style.display = 'inline-flex';
        }
      }
    }

    // --- 7.5: Experience Section (LinkedIn-style) ---
    const expCard = document.getElementById('section-experience-card');
    const expContainer = document.getElementById('profile-experience-list');
    if (expCard && expContainer) {
      const expArray = profile.experience || [];
      if (expArray.length > 0) {
        expContainer.innerHTML = '';
        expArray.forEach(exp => {
          const escape = window.CampusLink?.security?.escapeHTML || (s => s);
          const typeLabels = {
            work: '💼 Work', internship: '🎯 Internship',
            volunteer: '🤝 Volunteer', education: '📚 Education',
            project: '🚀 Project', other: '📌 Other'
          };
          const typeLabel = typeLabels[exp.type] || exp.type || '📌';
          const dateStr = (() => {
            const fmt = d => d ? new Date(d + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '';
            if (exp.start_date && !exp.current && exp.end_date) return `${fmt(exp.start_date)} – ${fmt(exp.end_date)}`;
            if (exp.start_date && exp.current) return `${fmt(exp.start_date)} – Present`;
            if (exp.start_date) return fmt(exp.start_date);
            return '';
          })();
          const card = document.createElement('div');
          card.className = 'exp-card';
          card.innerHTML = `
            <div class="exp-card-left">
              <div class="exp-icon-circle">${typeLabels[exp.type]?.split(' ')[0] || '📌'}</div>
            </div>
            <div class="exp-card-body">
              <div class="exp-card-header">
                <h4 class="exp-title">${escape(exp.title || '')}</h4>
                <span class="exp-type-badge exp-type-${exp.type || 'other'}">${typeLabel}</span>
              </div>
              ${exp.company ? `<p class="exp-company">${escape(exp.company)}</p>` : ''}
              <div class="exp-meta">
                ${dateStr ? `<span class="exp-date">📅 ${dateStr}</span>` : ''}
                ${exp.location ? `<span class="exp-loc">📍 ${escape(exp.location)}</span>` : ''}
              </div>
              ${exp.description ? `<p class="exp-desc">${escape(exp.description)}</p>` : ''}
            </div>
          `;
          expContainer.appendChild(card);
        });
        expCard.style.display = 'block';
        // Show inline add btn for owner
        const addBtn = document.getElementById('exp-add-inline-btn');
        if (addBtn && isOwner) addBtn.style.display = 'inline-flex';
      } else {
        // Show section anyway for owner so they can add via inline button
        if (isOwner) {
          expContainer.innerHTML = '<p class="empty-section-msg">No experience added yet. Click + to add.</p>';
          expCard.style.display = 'block';
          const addBtn = document.getElementById('exp-add-inline-btn');
          if (addBtn) addBtn.style.display = 'inline-flex';
        } else {
          expCard.style.display = 'none';
        }
      }
    }
  }

  // --- Follow Actions ---
  function updateFollowButtonState(btn, following) {
    const ddFollowText = document.getElementById('dropdown-follow-text');
    if (ddFollowText) {
      ddFollowText.textContent = following ? 'Following' : 'Follow';
    }

    if (following) {
      btn.className = 'btn btn-following';
      btn.style.backgroundColor = 'transparent';
      btn.style.color = 'var(--primary)';
      btn.style.border = '2px solid var(--primary)';
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <span>Following</span>
      `;
    } else {
      btn.className = 'btn btn-follow btn-primary';
      btn.style.backgroundColor = 'var(--primary)';
      btn.style.color = 'var(--white)';
      btn.style.border = 'none';
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span>Follow</span>
      `;
    }
  }

  function setupFollowButton(profileId, initialFollowing, initialCount) {
    const followBtn = document.getElementById('follow-profile-btn');
    if (!followBtn) return;

    // Clone to remove previous listeners
    const newFollowBtn = followBtn.cloneNode(true);
    followBtn.parentNode.replaceChild(newFollowBtn, followBtn);

    let isFollowing = initialFollowing;
    let count = initialCount;

    newFollowBtn.addEventListener('click', async () => {
      if (!currentUser) {
        window.location.href = 'login.html';
        return;
      }

      const sb = getSupabase();
      if (!sb) return;

      newFollowBtn.disabled = true;

      try {
        if (isFollowing) {
          // Unfollow
          const { error } = await sb
            .from('follows')
            .delete()
            .eq('follower_id', currentUser.id)
            .eq('following_id', profileId);

          if (error) throw error;

          isFollowing = false;
          count = Math.max(0, count - 1);
          showToast('Unfollowed user');
        } else {
          // Follow
          const { error } = await sb
            .from('follows')
            .insert({
              follower_id: currentUser.id,
              following_id: profileId,
              follow_type: 'user'
            });

          if (error) throw error;

          isFollowing = true;
          count++;
          showToast('Following user');

          // Trigger notification
          if (window.CampusLink && window.CampusLink.notifications) {
            try {
              const { data: followerProfile } = await sb
                .from('profiles')
                .select('full_name')
                .eq('id', currentUser.id)
                .single();
              const actorName = followerProfile?.full_name || 'Someone';
              await window.CampusLink.notifications.createNotification(
                profileId,
                'follow',
                `${actorName} started following you`,
                `Click to view their profile`,
                `profile.html?id=${currentUser.id}`,
                currentUser.id
              );
            } catch (notifErr) {
              console.warn('Error sending follow notification:', notifErr);
            }
          }
        }

        updateFollowButtonState(newFollowBtn, isFollowing);
        const followersEl = document.getElementById('profile-followers-count');
        if (followersEl) {
          followersEl.textContent = `${count} follower${count !== 1 ? 's' : ''}`;
        }
      } catch (err) {
        console.error('Follow toggle failed:', err);
        showToast(err.message || 'Failed to update follow state', 'error');
      } finally {
        newFollowBtn.disabled = false;
      }
    });
  }

  // --- Connection Actions ---
  function updateConnectButtonState(btn, status) {
    // Remove any existing reject button
    const existingRejectBtn = document.getElementById('reject-profile-btn');
    if (existingRejectBtn) {
      existingRejectBtn.remove();
    }

    const ddConnectText = document.getElementById('dropdown-connect-text');
    if (ddConnectText) {
      if (status === 'accepted') {
        ddConnectText.textContent = 'Connected';
      } else if (status === 'pending_sent') {
        ddConnectText.textContent = 'Cancel Request';
      } else if (status === 'pending_received') {
        ddConnectText.textContent = 'Accept';
      } else {
        ddConnectText.textContent = 'Connect';
      }
    }

    if (status === 'accepted') {
      btn.className = 'btn-connected';
      btn.title = 'Click to disconnect';
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <span>Connected</span>
      `;
    } else if (status === 'pending_sent') {
      btn.className = 'btn-requested';
      btn.title = 'Click to withdraw request';
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>Cancel Request</span>
      `;
    } else if (status === 'pending_received') {
      btn.className = 'btn-connect';
      btn.title = 'Click to accept request';
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <span>Accept</span>
      `;
      
      // Inject Ignore button next to it
      const rejectBtn = document.createElement('button');
      rejectBtn.id = 'reject-profile-btn';
      rejectBtn.className = 'btn-requested';
      rejectBtn.style.display = 'inline-flex';
      rejectBtn.style.alignItems = 'center';
      rejectBtn.style.justifyContent = 'center';
      rejectBtn.style.gap = '8px';
      rejectBtn.style.padding = '10px 20px';
      rejectBtn.style.fontSize = '0.9rem';
      rejectBtn.title = 'Click to reject request';
      rejectBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        <span>Ignore</span>
      `;
      btn.parentNode.insertBefore(rejectBtn, btn.nextSibling);
    } else {
      // Connect (no status or rejected)
      btn.className = 'btn-connect';
      btn.title = 'Send connection request';
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
        <span>Connect</span>
      `;
    }
  }

  function setupConnectButton(profileId, initialStatus, initialCount) {
    const connectBtn = document.getElementById('connect-profile-btn');
    if (!connectBtn) return;

    // Clone to remove previous listeners
    const newConnectBtn = connectBtn.cloneNode(true);
    connectBtn.parentNode.replaceChild(newConnectBtn, connectBtn);

    let status = initialStatus;
    let count = initialCount;

    // Initial render
    updateConnectButtonState(newConnectBtn, status);

    // Dynamic delegate for Ignore button (since it is injected)
    newConnectBtn.parentNode.addEventListener('click', async (e) => {
      const rejectTarget = e.target.closest('#reject-profile-btn');
      if (!rejectTarget) return;

      const sb = getSupabase();
      if (!sb) return;

      rejectTarget.disabled = true;
      newConnectBtn.disabled = true;

      try {
        const { error } = await sb
          .from('connections')
          .update({ status: 'rejected', updated_at: new Date().toISOString() })
          .eq('requester_id', profileId)
          .eq('receiver_id', currentUser.id);

        if (error) throw error;

        status = null;
        updateConnectButtonState(newConnectBtn, status);
        showToast('Connection request ignored');
      } catch (err) {
        console.error('Ignore connection failed:', err);
        showToast(err.message || 'Failed to ignore request', 'error');
      } finally {
        newConnectBtn.disabled = false;
      }
    });

    newConnectBtn.addEventListener('click', async () => {
      if (!currentUser) {
        window.location.href = 'login.html';
        return;
      }

      const sb = getSupabase();
      if (!sb) return;

      newConnectBtn.disabled = true;

      try {
        if (!status || status === 'rejected_sent' || status === 'rejected_received') {
          // If a rejected/existing record was there, clean it up first
          if (status === 'rejected_sent' || status === 'rejected_received') {
            await sb
              .from('connections')
              .delete()
              .or(`and(requester_id.eq.${currentUser.id},receiver_id.eq.${profileId}),and(requester_id.eq.${profileId},receiver_id.eq.${currentUser.id})`);
          }

          const { error } = await sb
            .from('connections')
            .insert({
              requester_id: currentUser.id,
              receiver_id: profileId,
              status: 'pending'
            });

          if (error) throw error;

          status = 'pending_sent';
          showToast('Connection request sent');

          // Trigger notification
          if (window.CampusLink && window.CampusLink.notifications) {
            try {
              const { data: requesterProfile } = await sb
                .from('profiles')
                .select('full_name')
                .eq('id', currentUser.id)
                .single();
              const actorName = requesterProfile?.full_name || 'Someone';
              await window.CampusLink.notifications.createNotification(
                profileId,
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
        } else if (status === 'pending_sent') {
          // Withdraw request
          const { error } = await sb
            .from('connections')
            .delete()
            .eq('requester_id', currentUser.id)
            .eq('receiver_id', profileId);

          if (error) throw error;

          status = null;
          showToast('Connection request withdrawn');
        } else if (status === 'pending_received') {
          // Accept request
          const { error } = await sb
            .from('connections')
            .update({ status: 'accepted', updated_at: new Date().toISOString() })
            .eq('requester_id', profileId)
            .eq('receiver_id', currentUser.id);

          if (error) throw error;

          status = 'accepted';
          count++;
          showToast('Connection request accepted! You are now connected.');

          // Trigger notification
          if (window.CampusLink && window.CampusLink.notifications) {
            try {
              const { data: accepterProfile } = await sb
                .from('profiles')
                .select('full_name')
                .eq('id', currentUser.id)
                .single();
              const actorName = accepterProfile?.full_name || 'Someone';
              await window.CampusLink.notifications.createNotification(
                profileId,
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
        } else if (status === 'accepted') {
          // Disconnect
          if (confirm('Are you sure you want to disconnect? This will remove the connection for both of you.')) {
            const { error } = await sb
              .from('connections')
              .delete()
              .or(`and(requester_id.eq.${currentUser.id},receiver_id.eq.${profileId}),and(requester_id.eq.${profileId},receiver_id.eq.${currentUser.id})`);

            if (error) throw error;

            status = null;
            count = Math.max(0, count - 1);
            showToast('Disconnected successfully');
          }
        }

        // Update UI
        updateConnectButtonState(newConnectBtn, status);
        const connectionsEl = document.getElementById('profile-connections-count');
        if (connectionsEl) {
          connectionsEl.textContent = `${count} connection${count !== 1 ? 's' : ''}`;
        }
      } catch (err) {
        console.error('Connection action failed:', err);
        showToast(err.message || 'Failed to update connection state', 'error');
      } finally {
        newConnectBtn.disabled = false;
      }
    });
  }

  // --- Message Actions ---
  function setupMessageButton(profileId) {
    const messageBtn = document.getElementById('message-profile-btn');
    if (!messageBtn) return;

    // Clone to remove previous listeners
    const newMessageBtn = messageBtn.cloneNode(true);
    messageBtn.parentNode.replaceChild(newMessageBtn, messageBtn);

    newMessageBtn.addEventListener('click', async () => {
      if (!currentUser) {
        window.location.href = 'login.html';
        return;
      }

      const sb = getSupabase();
      if (!sb) return;

      newMessageBtn.disabled = true;
      const originalHtml = newMessageBtn.innerHTML;
      newMessageBtn.textContent = 'Connecting...';

      try {
        // Fetch all conversations of the current user
        const { data: myPart, error: err1 } = await sb
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', currentUser.id);

        if (err1) throw err1;

        let existingId = null;
        if (myPart && myPart.length > 0) {
          const convIds = myPart.map(p => p.conversation_id);
          
          const { data: otherPart, error: err2 } = await sb
            .from('conversation_participants')
            .select('conversation_id, conversation:conversations(school_id)')
            .in('conversation_id', convIds)
            .eq('user_id', profileId);

          if (!err2 && otherPart && otherPart.length > 0) {
            // Filter to find direct chat with the profile user (no school_id)
            const directConv = otherPart.find(p => p.conversation && p.conversation.school_id === null);
            if (directConv) {
              existingId = directConv.conversation_id;
            }
          }
        }

        if (existingId) {
          window.location.href = `messaging.html?chat_id=${existingId}`;
        } else {
          window.location.href = `messaging.html?new_chat_with=${profileId}`;
        }
      } catch (err) {
        console.error('Failed to initiate message:', err);
        showToast('Failed to start chat: ' + err.message, 'error');
        newMessageBtn.disabled = false;
        newMessageBtn.innerHTML = originalHtml;
      }
    });
  }

  // --- Super Admin Verification Control ---
  function setupVerifyButton(profileId, isVerified) {
    const verifyBtn = document.getElementById('verify-profile-btn');
    if (!verifyBtn) return;

    verifyBtn.style.display = 'inline-flex';
    updateVerifyButtonState(verifyBtn, isVerified);

    // Clone to remove previous listeners
    const newVerifyBtn = verifyBtn.cloneNode(true);
    verifyBtn.parentNode.replaceChild(newVerifyBtn, verifyBtn);

    newVerifyBtn.addEventListener('click', async () => {
      const sb = getSupabase();
      if (!sb) return;

      newVerifyBtn.disabled = true;
      const targetState = !isVerified;

      try {
        const { error } = await sb
          .from('profiles')
          .update({ is_verified: targetState })
          .eq('id', profileId);

        if (error) throw error;

        isVerified = targetState;
        updateVerifyButtonState(newVerifyBtn, isVerified);
        
        // Update local state
        profileUser.is_verified = isVerified;
        
        // Update the header name display with badge
        const nameEl = document.getElementById('profile-full-name');
        if (nameEl) {
          const verifiedBadge = isVerified ? `
            <svg class="verified-badge verified-badge-lg" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Profile">
              <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
              <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
            </svg>
          ` : '';
          nameEl.innerHTML = (profileUser.full_name || 'No Name Provided') + verifiedBadge;
        }

        showToast(isVerified ? 'Profile verified successfully!' : 'Profile unverified successfully!');
      } catch (err) {
        console.error('Failed to toggle verification:', err);
        showToast(err.message || 'Failed to update verification state', 'error');
      } finally {
        newVerifyBtn.disabled = false;
      }
    });
  }

  function updateVerifyButtonState(btn, isVerified) {
    if (isVerified) {
      btn.style.backgroundColor = 'transparent';
      btn.style.color = '#DC2626'; // Red
      btn.style.border = '2px solid #DC2626';
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <span>Remove Verify</span>
      `;
    } else {
      btn.style.backgroundColor = '#16A34A'; // Green
      btn.style.color = 'var(--white)';
      btn.style.border = 'none';
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span>Verify User</span>
      `;
    }
  }

  // --- Setup Owner-Only Controls ---
  function setupOwnerFeatures() {
    const editBtn = document.getElementById('edit-profile-btn');
    const avatarLabel = document.getElementById('avatar-upload-label');
    const avatarInput = document.getElementById('avatar-upload-input');
    const ctaCard = document.getElementById('sidebar-cta-card');
    const linkSchoolBtn = document.getElementById('sidebar-join-school-btn');

    // Show owner items
    if (editBtn) editBtn.style.display = 'inline-flex';
    if (avatarLabel) avatarLabel.style.display = 'flex';

    // Dropdown: show Edit, hide Connect/Follow/Report for owner
    const ddEdit = document.getElementById('dropdown-edit-btn');
    const ddConnect = document.getElementById('dropdown-connect-btn');
    const ddFollow = document.getElementById('dropdown-follow-btn');
    const ddReport = document.getElementById('dropdown-report-btn');
    if (ddEdit) ddEdit.style.display = 'flex';
    if (ddConnect) ddConnect.style.display = 'none';
    if (ddFollow) ddFollow.style.display = 'none';
    if (ddReport) ddReport.style.display = 'none';

    // School Join CTA
    if (ctaCard && !profileUser.school_id) {
      ctaCard.style.display = 'block';
    }

    // Bind edit modal triggers
    if (editBtn) editBtn.addEventListener('click', openEditModal);
    if (linkSchoolBtn) linkSchoolBtn.addEventListener('click', openEditModal);

    // Bind avatar uploader
    if (avatarInput) {
      avatarInput.addEventListener('change', handleAvatarUpload);
    }

    // Bind cover uploader
    const coverInput = document.getElementById('cover-upload-input');
    if (coverInput) {
      coverInput.addEventListener('change', handleCoverUpload);
    }

    // Expose edit modal globally so dropdown can open it
    window.CampusLink = window.CampusLink || {};
    window.CampusLink.openEditProfileModal = openEditModal;

    setupModalControls();
  }

  // --- Handle Avatar Upload ---
  async function handleAvatarUpload(e) {
    const sb = getSupabase();
    if (!sb) return;

    const file = e.target.files[0];
    if (!file) return;

    const validator = window.CampusLink?.security?.validateImageFile;
    if (validator) {
      const err = await validator(file, 2 * 1024 * 1024);
      if (err) {
        showToast(err, 'error');
        return;
      }
    }

    showToast('Uploading avatar...', 'info');

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const randomString = Math.random().toString(36).substring(2, 10);
      const fileName = `avatar_${randomString}.${ext}`;
      const filePath = `avatars/${profileUser.id}/${fileName}`;

      // Upload avatar to Supabase bucket
      const { error: uploadError } = await sb.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Retrieve public URL
      const { data: urlData } = sb.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) throw new Error('Could not retrieve public URL for uploaded avatar');

      // Update database profile record
      const { error: dbError } = await sb
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profileUser.id);

      if (dbError) throw dbError;

      // Successful update
      showToast('Avatar updated successfully!');
      
      // Update page displays
      profileUser.avatar_url = publicUrl;
      const avatarDisplay = document.getElementById('profile-avatar-display');
      if (avatarDisplay) {
        avatarDisplay.innerHTML = '';
        avatarDisplay.style.backgroundImage = `url(${publicUrl})`;
        avatarDisplay.style.backgroundSize = 'cover';
        avatarDisplay.style.backgroundPosition = 'center';
      }

      const epmAvatarDisplay = document.getElementById('epm-avatar-display');
      if (epmAvatarDisplay) {
        epmAvatarDisplay.innerHTML = '';
        epmAvatarDisplay.style.backgroundImage = `url(${publicUrl})`;
        epmAvatarDisplay.style.backgroundSize = 'cover';
        epmAvatarDisplay.style.backgroundPosition = 'center';
      }

      // Also trigger updating the navigation pill avatar
      const auth = getAuth();
      if (auth) {
        await auth.updateNavAuthState();
      }

    } catch (err) {
      console.error('Avatar upload failed:', err);
      showToast(err.message || 'Avatar upload failed. Please try again.', 'error');
    }
  }

  // --- Handle Cover Upload ---
  async function handleCoverUpload(e) {
    const sb = getSupabase();
    if (!sb) return;

    const file = e.target.files[0];
    if (!file) return;

    const validator = window.CampusLink?.security?.validateImageFile;
    if (validator) {
      const err = await validator(file, 5 * 1024 * 1024); // 5MB limit
      if (err) {
        showToast(err, 'error');
        return;
      }
    }

    showToast('Uploading cover photo...', 'info');

    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const randomString = Math.random().toString(36).substring(2, 10);
      const fileName = `cover_${randomString}.${ext}`;
      const filePath = `covers/${profileUser.id}/${fileName}`;

      // Upload cover to Supabase bucket
      const { error: uploadError } = await sb.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Retrieve public URL
      const { data: urlData } = sb.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) throw new Error('Could not retrieve public URL for uploaded cover photo');

      // Save to localStorage (persistent client-side cover)
      localStorage.setItem(`cover_photo_${profileUser.id}`, publicUrl);

      showToast('Cover photo updated successfully!');

      // Update UI displays
      const heroBannerEl = document.querySelector('.profile-hero-banner');
      if (heroBannerEl) {
        heroBannerEl.style.backgroundImage = `url(${publicUrl})`;
        heroBannerEl.style.backgroundSize = 'cover';
        heroBannerEl.style.backgroundPosition = 'center';
      }

      const epmBannerEl = document.getElementById('epm-banner-display');
      if (epmBannerEl) {
        epmBannerEl.style.backgroundImage = `url(${publicUrl})`;
        epmBannerEl.style.backgroundSize = 'cover';
        epmBannerEl.style.backgroundPosition = 'center';
      }

    } catch (err) {
      console.error('Cover upload failed:', err);
      showToast(err.message || 'Cover upload failed. Please try again.', 'error');
    }
  }

  // --- Modal Open/Close Logic ---
  async function openEditModal() {
    const sb = getSupabase();
    const auth = getAuth();
    const modal = document.getElementById('edit-profile-modal');
    if (!modal) return;

    showToast('Loading settings...', 'info');

    try {
      // 1. Populate schools list
      if (allSchools.length === 0) {
        const { data: schoolsData, error: schoolsError } = await sb
          .from('schools')
          .select('id, name, city')
          .order('name');
        
        if (schoolsError) throw schoolsError;
        allSchools = schoolsData || [];
      }

      const schoolDropdown = document.getElementById('edit-school');
      if (schoolDropdown) {
        schoolDropdown.innerHTML = '<option value="">Select your school...</option>';
        allSchools.forEach(sch => {
          const option = document.createElement('option');
          option.value = sch.id;
          option.textContent = `${sch.name} (${sch.city || ''})`;
          schoolDropdown.appendChild(option);
        });
      }

      // 2. Load inputs with current profile state
      document.getElementById('edit-full-name').value = profileUser.full_name || '';
      document.getElementById('edit-school').value = profileUser.school_id || '';
      document.getElementById('edit-class').value = profileUser.class || '';
      document.getElementById('edit-bio').value = profileUser.bio || '';

      // Set array fields in state
      editSkills = [...(profileUser.skills || [])];
      editSports = [...(profileUser.sports || [])];
      editAchievements = [...(profileUser.achievements || [])];
      editCertificates = [...(profileUser.certificates || [])];
      editExperience = JSON.parse(JSON.stringify(profileUser.experience || []));

      // 3. Render initial Tag Chips and Lists
      renderSkillsChips();
      renderSportsChips();
      renderAchievementsList();
      renderCertificatesList();
      renderExperienceEditList();

      // 4. Populate profile header in modal
      const epmAvatar = document.getElementById('epm-avatar-display');
      const epmName = document.getElementById('epm-header-name');
      const epmMeta = document.getElementById('epm-header-meta');
      const epmBanner = document.getElementById('epm-banner-display');

      if (epmBanner) {
        const storedCover = localStorage.getItem(`cover_photo_${profileUser.id}`);
        if (storedCover) {
          epmBanner.style.backgroundImage = `url(${storedCover})`;
          epmBanner.style.backgroundSize = 'cover';
          epmBanner.style.backgroundPosition = 'center';
        } else {
          epmBanner.style.backgroundImage = '';
        }
      }

      if (epmAvatar) {
        if (profileUser.avatar_url) {
          epmAvatar.style.backgroundImage = `url(${profileUser.avatar_url})`;
          epmAvatar.textContent = '';
        } else {
          epmAvatar.style.backgroundImage = 'none';
          epmAvatar.textContent = (profileUser.full_name || '?').charAt(0).toUpperCase();
        }
      }
      if (epmName) epmName.textContent = profileUser.full_name || 'Student';
      if (epmMeta) {
        let metaStr = auth ? auth.getUserTypeLabel(profileUser.user_type) : 'Student';
        const linkedSchool = allSchools.find(s => s.id === profileUser.school_id);
        if (linkedSchool) metaStr += ` at ${linkedSchool.name}`;
        epmMeta.textContent = metaStr;
      }

      // 5. Calculate profile strength
      updateProfileStrength();

      // Reset default tab to basic
      const firstTabBtn = document.querySelector('.epm-tab[data-tab="tab-basic"]');
      if (firstTabBtn) firstTabBtn.click();

      // Display the modal
      modal.classList.add('active');
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';

    } catch (err) {
      console.error('Failed to load edit modal settings:', err);
      showToast('Could not open editor: ' + err.message, 'error');
    }
  }

  function updateProfileStrength() {
    let filled = 0;
    const total = 5;
    if (profileUser.bio && profileUser.bio.trim()) filled++;
    if (profileUser.school_id) filled++;
    if (editSkills.length > 0) filled++;
    if (editAchievements.length > 0) filled++;
    if (editCertificates.length > 0) filled++;
    const pct = Math.round((filled / total) * 100);
    const pctEl = document.getElementById('epm-strength-pct');
    const fillEl = document.getElementById('epm-strength-fill');
    if (pctEl) pctEl.textContent = pct + '%';
    if (fillEl) fillEl.style.width = pct + '%';
  }

  function closeEditModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
      document.body.style.overflow = 'auto'; // restore scrolling
    }
  }

  function setupModalControls() {
    const closeBtn = document.getElementById('edit-modal-close');
    const cancelBtn = document.getElementById('edit-profile-cancel');
    const form = document.getElementById('edit-profile-form');

    if (closeBtn) closeBtn.addEventListener('click', closeEditModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeEditModal);

    // Close on click outside modal content
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeEditModal();
        }
      });
    }

    // Bind tab clicks (new .epm-tab buttons)
    const tabBtns = document.querySelectorAll('.epm-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
      });
    });

    // Tag Inputs bind
    setupTagInputs();
    // Experience Tab
    setupExperienceTab();

    // Form Submission
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
    }
  }

  // --- Tag and List Operations ---
  function setupTagInputs() {
    const skillsInput = document.getElementById('skills-tag-input');
    const sportsInput = document.getElementById('sports-tag-input');

    const addAchBtn = document.getElementById('add-achievement-btn');
    const achInput = document.getElementById('achievement-item-input');

    const addCertBtn = document.getElementById('add-certificate-btn');
    const certInput = document.getElementById('certificate-item-input');

    // Skills Enter / Comma
    if (skillsInput) {
      skillsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const val = skillsInput.value.trim().replace(/,/g, '');
          if (val && !editSkills.includes(val)) {
            editSkills.push(val);
            renderSkillsChips();
            skillsInput.value = '';
          }
        }
      });
    }

    // Sports Enter / Comma
    if (sportsInput) {
      sportsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const val = sportsInput.value.trim().replace(/,/g, '');
          if (val && !editSports.includes(val)) {
            editSports.push(val);
            renderSportsChips();
            sportsInput.value = '';
          }
        }
      });
    }

    // Achievements Add
    if (addAchBtn && achInput) {
      const addAch = () => {
        const sanitize = window.CampusLink?.security?.sanitizeString || (s => s.trim());
        const val = sanitize(achInput.value);
        if (val && !editAchievements.includes(val)) {
          editAchievements.push(val);
          renderAchievementsList();
          achInput.value = '';
        }
      };
      addAchBtn.addEventListener('click', addAch);
      achInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addAch();
        }
      });
    }

    // Certificates Add
    if (addCertBtn && certInput) {
      const addCert = () => {
        const sanitize = window.CampusLink?.security?.sanitizeString || (s => s.trim());
        const val = sanitize(certInput.value);
        if (val && !editCertificates.includes(val)) {
          editCertificates.push(val);
          renderCertificatesList();
          certInput.value = '';
        }
      };
      addCertBtn.addEventListener('click', addCert);
      certInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addCert();
        }
      });
    }
  }

  // --- Tag Rendering Helpers ---
  function renderSkillsChips() {
    const container = document.getElementById('skills-tag-container');
    const input = document.getElementById('skills-tag-input');
    if (!container || !input) return;

    // Clear chips but keep input
    container.querySelectorAll('.tag-chip').forEach(el => el.remove());

    editSkills.forEach((skill, index) => {
      const escape = window.CampusLink?.security?.escapeHTML || (s => s);
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = `${escape(skill)} <span class="tag-remove" data-index="${index}">&times;</span>`;
      container.insertBefore(chip, input);
    });

    // Bind remove event
    container.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'));
        editSkills.splice(idx, 1);
        renderSkillsChips();
      });
    });
  }

  function renderSportsChips() {
    const container = document.getElementById('sports-tag-container');
    const input = document.getElementById('sports-tag-input');
    if (!container || !input) return;

    container.querySelectorAll('.tag-chip').forEach(el => el.remove());

    editSports.forEach((sport, index) => {
      const escape = window.CampusLink?.security?.escapeHTML || (s => s);
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = `${escape(sport)} <span class="tag-remove" data-index="${index}">&times;</span>`;
      container.insertBefore(chip, input);
    });

    container.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'));
        editSports.splice(idx, 1);
        renderSportsChips();
      });
    });
  }

  function renderAchievementsList() {
    const listEl = document.getElementById('achievements-editable-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    if (editAchievements.length === 0) {
      listEl.innerHTML = '<li class="empty-list-msg">No achievements added yet.</li>';
      return;
    }

    editAchievements.forEach((ach, index) => {
      const escape = window.CampusLink?.security?.escapeHTML || (s => s);
      const li = document.createElement('li');
      li.className = 'editable-list-item';
      li.innerHTML = `
        <span>${escape(ach)}</span>
        <button type="button" class="btn-remove-list-item" data-index="${index}">&times;</button>
      `;
      listEl.appendChild(li);
    });

    listEl.querySelectorAll('.btn-remove-list-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'));
        editAchievements.splice(idx, 1);
        renderAchievementsList();
      });
    });
  }

  function renderCertificatesList() {
    const listEl = document.getElementById('certificates-editable-list');
    if (!listEl) return;

    listEl.innerHTML = '';
    if (editCertificates.length === 0) {
      listEl.innerHTML = '<li class="empty-list-msg">No certificates added yet.</li>';
      return;
    }

    editCertificates.forEach((cert, index) => {
      const escape = window.CampusLink?.security?.escapeHTML || (s => s);
      const li = document.createElement('li');
      li.className = 'editable-list-item';
      li.innerHTML = `
        <span>${escape(cert)}</span>
        <button type="button" class="btn-remove-list-item" data-index="${index}">&times;</button>
      `;
      listEl.appendChild(li);
    });

    listEl.querySelectorAll('.btn-remove-list-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'));
        editCertificates.splice(idx, 1);
        renderCertificatesList();
      });
    });
  }

  // --- Experience Edit List (modal) ---
  function renderExperienceEditList() {
    const listEl = document.getElementById('experience-editable-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (editExperience.length === 0) {
      listEl.innerHTML = '<li class="empty-list-msg">No experience entries yet.</li>';
      return;
    }

    const typeLabels = {
      work: '💼 Work', internship: '🎯 Internship',
      volunteer: '🤝 Volunteer', education: '📚 Education',
      project: '🚀 Project', other: '📌 Other'
    };

    editExperience.forEach((exp, index) => {
      const escape = window.CampusLink?.security?.escapeHTML || (s => s);
      const li = document.createElement('li');
      li.className = 'exp-edit-item';
      const dateStr = (() => {
        const fmt = d => d ? new Date(d + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : '';
        if (exp.start_date && !exp.current && exp.end_date) return `${fmt(exp.start_date)} – ${fmt(exp.end_date)}`;
        if (exp.start_date && exp.current) return `${fmt(exp.start_date)} – Present`;
        return fmt(exp.start_date);
      })();
      li.innerHTML = `
        <div class="exp-edit-info">
          <span class="exp-edit-badge">${typeLabels[exp.type] || '📌'}</span>
          <strong>${escape(exp.title || 'Untitled')}</strong>
          ${exp.company ? `<span> @ ${escape(exp.company)}</span>` : ''}
          ${dateStr ? `<span class="exp-edit-date"> · ${dateStr}</span>` : ''}
        </div>
        <button type="button" class="btn-remove-list-item" data-index="${index}">&times;</button>
      `;
      listEl.appendChild(li);
    });

    listEl.querySelectorAll('.btn-remove-list-item').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'));
        editExperience.splice(idx, 1);
        renderExperienceEditList();
      });
    });
  }

  // --- Experience Tab Setup ---
  function setupExperienceTab() {
    const addBtn = document.getElementById('exp-add-entry-btn');
    if (!addBtn) return;

    addBtn.addEventListener('click', () => {
      const title = document.getElementById('exp-title')?.value.trim();
      if (!title) {
        showToast('Please enter a title/position.', 'error');
        return;
      }
      const type = document.getElementById('exp-type')?.value || 'work';
      const company = document.getElementById('exp-company')?.value.trim() || '';
      const location = document.getElementById('exp-location')?.value.trim() || '';
      const startDate = document.getElementById('exp-start')?.value || '';
      const endDate = document.getElementById('exp-end')?.value || '';
      const current = document.getElementById('exp-current')?.checked || false;
      const description = document.getElementById('exp-description')?.value.trim() || '';

      editExperience.unshift({ title, type, company, location, start_date: startDate, end_date: current ? '' : endDate, current, description });
      renderExperienceEditList();

      // Clear form
      ['exp-title', 'exp-company', 'exp-location', 'exp-start', 'exp-end', 'exp-description'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      const cb = document.getElementById('exp-current');
      if (cb) cb.checked = false;
      const endInput = document.getElementById('exp-end');
      if (endInput) endInput.disabled = false;
      showToast('Experience entry added!', 'info');
    });

    // Toggle end date when "current" checked
    const currentCheckbox = document.getElementById('exp-current');
    const endInput = document.getElementById('exp-end');
    if (currentCheckbox && endInput) {
      currentCheckbox.addEventListener('change', () => {
        endInput.disabled = currentCheckbox.checked;
        if (currentCheckbox.checked) endInput.value = '';
      });
    }

    // Inline add btn from profile view redirects to modal tab
    const inlineAddBtn = document.getElementById('exp-add-inline-btn');
    if (inlineAddBtn) {
      inlineAddBtn.addEventListener('click', () => {
        openEditModal().then(() => {
          setTimeout(() => {
            const expTabBtn = document.querySelector('.epm-tab[data-tab="tab-experience"]');
            if (expTabBtn) expTabBtn.click();
          }, 100);
        });
      });
    }
  }

  // --- Form Submission Save ---
  async function handleFormSubmit(e) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;

    showToast('Saving profile details...', 'info');

    // Extract inputs & sanitize
    const sanitize = window.CampusLink?.security?.sanitizeString || (s => s.trim());
    const validateName = window.CampusLink?.security?.validateName || (s => null);

    const fullName = sanitize(document.getElementById('edit-full-name').value);
    const schoolId = document.getElementById('edit-school').value || null;
    const gradeClass = sanitize(document.getElementById('edit-class').value) || null;
    const bioText = sanitize(document.getElementById('edit-bio').value) || null;

    const nameErr = validateName(fullName);
    if (nameErr) {
      showToast(nameErr, 'error');
      return;
    }

    // Auto-commit any unsaved experience, achievements, or certificates currently typed in inputs
    const unsavedExpTitle = document.getElementById('exp-title')?.value.trim();
    if (unsavedExpTitle) {
      const type = document.getElementById('exp-type')?.value || 'work';
      const company = document.getElementById('exp-company')?.value.trim() || '';
      const location = document.getElementById('exp-location')?.value.trim() || '';
      const startDate = document.getElementById('exp-start')?.value || '';
      const endDate = document.getElementById('exp-end')?.value || '';
      const current = document.getElementById('exp-current')?.checked || false;
      const description = document.getElementById('exp-description')?.value.trim() || '';
      
      editExperience.unshift({
        title: unsavedExpTitle,
        type,
        company,
        location,
        start_date: startDate,
        end_date: current ? '' : endDate,
        current,
        description
      });
      
      // Clear inputs
      ['exp-title', 'exp-company', 'exp-location', 'exp-start', 'exp-end', 'exp-description'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      const cb = document.getElementById('exp-current');
      if (cb) cb.checked = false;
      const endInput = document.getElementById('exp-end');
      if (endInput) endInput.disabled = false;
    }

    const unsavedAch = document.getElementById('achievement-item-input')?.value.trim();
    if (unsavedAch && !editAchievements.includes(unsavedAch)) {
      editAchievements.push(unsavedAch);
      const el = document.getElementById('achievement-item-input');
      if (el) el.value = '';
    }

    const unsavedCert = document.getElementById('certificate-item-input')?.value.trim();
    if (unsavedCert && !editCertificates.includes(unsavedCert)) {
      editCertificates.push(unsavedCert);
      const el = document.getElementById('certificate-item-input');
      if (el) el.value = '';
    }

    try {
      // Build update payload
      const updateData = {
        full_name: fullName,
        school_id: schoolId,
        class: gradeClass,
        bio: bioText,
        skills: editSkills,
        sports: editSports,
        achievements: editAchievements,
        certificates: editCertificates,
        experience: editExperience
      };

      const { error: updateError } = await sb
        .from('profiles')
        .update(updateData)
        .eq('id', profileUser.id);

      if (updateError) throw updateError;

      showToast('Profile updated successfully!');
      closeEditModal();

      // Reload profile data dynamically
      await loadProfileData(profileUser.id);

      // Trigger update of navigation state in case the name changed
      const auth = getAuth();
      if (auth) {
        await auth.updateNavAuthState();
      }

    } catch (err) {
      console.error('Failed to update student profile:', err);
      showToast(err.message || 'Failed to update profile. Please try again.', 'error');
    }
  }

  // Run on page load (robust ready state check)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
