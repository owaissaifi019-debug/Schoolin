// complete-profile.js
// Logic for completing OAuth / brand-new user profile onboarding

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('complete-profile-form');
  const toast = document.getElementById('auth-toast');
  const toastMsg = document.getElementById('auth-toast-msg');
  const toastClose = document.getElementById('auth-toast-close');

  // --- Toast ---
  function showToast(message) {
    if (toastMsg && toast) {
      toastMsg.textContent = message;
      toast.style.display = 'flex';
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { toast.style.display = 'none'; }, 300);
      }, 5000);
    }
  }

  if (toastClose) {
    toastClose.addEventListener('click', () => {
      toast.classList.remove('show');
      setTimeout(() => { toast.style.display = 'none'; }, 300);
    });
  }

  const auth = window.CampusLink && window.CampusLink.auth;
  const supabase = window.CampusLink && window.CampusLink.supabase;
  if (!auth || !supabase) {
    console.error('Auth or Supabase module not loaded');
    showToast('Failed to initialize the profile setup module. Please check your connection.');
    return;
  }

  // --- Auth Verification ---
  const session = await auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  const userId = session.user.id;
  const userMetadata = session.user.user_metadata || {};
  const userEmail = session.user.email;

  // --- Load Profile & Pre-populate ---
  let userProfile = null;
  try {
    userProfile = await auth.getProfile(userId);
    if (userProfile && userProfile.is_profile_complete) {
      // Profile already completed, redirect directly
      const role = await auth.getUserRole();
      if (role === 'school_admin') {
        window.location.href = 'dashboard.html';
      } else if (role === 'super_admin') {
        window.location.href = 'admin/index.html';
      } else {
        window.location.href = 'index.html';
      }
      return;
    }
  } catch (err) {
    console.error('Error fetching user profile:', err);
  }

  // --- Username Field Setup & Validation ---
  const usernameGroup = document.getElementById('complete-username-group');
  const usernameInput = document.getElementById('complete-username');
  let usernameAvailable = false;
  let usernameTimeout = null;

  const isUsernameMissing = !userProfile || !userProfile.username;
  if (isUsernameMissing) {
    if (usernameGroup) usernameGroup.style.display = 'block';
    if (usernameInput) usernameInput.setAttribute('required', 'required');
  } else {
    usernameAvailable = true; // Already has a username, valid by default
  }

  function showCompleteUsernameStatus(status, message) {
    const errorEl = document.getElementById('err-complete-username');
    const inputEl = document.getElementById('complete-username');
    if (!errorEl) return;

    if (status === 'success') {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
      errorEl.style.color = '#10B981'; // Green
      if (inputEl) {
        const wrapper = inputEl.closest('.input-icon-wrapper') || inputEl.parentElement;
        if (wrapper) {
          wrapper.style.borderColor = '#10B981';
          wrapper.classList.remove('input-error');
        }
      }
    } else if (status === 'error') {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
      errorEl.style.color = '#EF4444'; // Red
      if (inputEl) {
        const wrapper = inputEl.closest('.input-icon-wrapper') || inputEl.parentElement;
        if (wrapper) {
          wrapper.style.borderColor = '#EF4444';
          wrapper.classList.add('input-error');
        }
      }
    } else if (status === 'checking') {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
      errorEl.style.color = '#9CA3AF'; // Gray
      if (inputEl) {
        const wrapper = inputEl.closest('.input-icon-wrapper') || inputEl.parentElement;
        if (wrapper) {
          wrapper.style.borderColor = '';
          wrapper.classList.remove('input-error');
        }
      }
    } else {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
      if (inputEl) {
        const wrapper = inputEl.closest('.input-icon-wrapper') || inputEl.parentElement;
        if (wrapper) {
          wrapper.style.borderColor = '';
          wrapper.classList.remove('input-error');
        }
      }
    }
  }

  if (usernameInput) {
    usernameInput.addEventListener('input', () => {
      const username = usernameInput.value.trim();
      clearTimeout(usernameTimeout);
      usernameAvailable = false;

      if (!username) {
        showCompleteUsernameStatus('', '');
        return;
      }

      const usernameRegex = /^[a-zA-Z0-9_.]+$/;
      if (username.length < 3 || username.length > 20) {
        showCompleteUsernameStatus('error', 'Username must be 3-20 characters');
        return;
      }
      if (!usernameRegex.test(username)) {
        showCompleteUsernameStatus('error', 'Username can only contain letters, numbers, underscores, and periods');
        return;
      }

      showCompleteUsernameStatus('checking', 'Checking availability...');

      usernameTimeout = setTimeout(async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .ilike('username', username)
            .maybeSingle();

          if (error) throw error;

          if (usernameInput.value.trim() !== username) return;

          if (data) {
            showCompleteUsernameStatus('error', '✗ Username already taken');
            usernameAvailable = false;
          } else {
            showCompleteUsernameStatus('success', '✓ Username available');
            usernameAvailable = true;
          }
        } catch (err) {
          console.error('Error checking username:', err);
          showCompleteUsernameStatus('error', 'Error checking availability');
        }
      }, 300);
    });
  }

  // Pre-populate name and email
  const fullName = userProfile?.full_name || userMetadata.full_name || userMetadata.name || 'User';
  document.getElementById('complete-name').textContent = fullName;
  document.getElementById('complete-email').textContent = userEmail;

  // Pre-populate avatar picture
  const avatarContainer = document.getElementById('complete-avatar-container');
  const avatarUrl = userProfile?.avatar_url || userMetadata.avatar_url || userMetadata.picture;
  if (avatarContainer) {
    if (avatarUrl) {
      avatarContainer.innerHTML = `<img src="${avatarUrl}" alt="Profile avatar" class="complete-avatar-img" onerror="this.style.display='none'; document.getElementById('avatar-fallback').style.display='flex';">
      <div id="avatar-fallback" class="complete-avatar-placeholder" style="display:none;">${fullName.charAt(0).toUpperCase()}</div>`;
    } else {
      avatarContainer.innerHTML = `<div class="complete-avatar-placeholder">${fullName.charAt(0).toUpperCase()}</div>`;
    }
  }

  // Auto-select initial user type card if present
  const initialRole = userProfile?.user_type || userMetadata.user_type;
  if (initialRole) {
    const cardToClick = document.querySelector(`.role-card[data-role="${initialRole}"]`);
    if (cardToClick) {
      cardToClick.click();
    }
  }

  // --- Load Schools ---
  const schoolSelect = document.getElementById('complete-school');
  try {
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name')
      .order('name', { ascending: true });

    if (schoolsError) throw schoolsError;

    if (schools && schoolSelect) {
      schools.forEach(school => {
        const option = document.createElement('option');
        option.value = school.id;
        option.textContent = school.name;
        schoolSelect.appendChild(option);
      });
    }
  } catch (err) {
    console.error('Error loading schools list:', err);
    showToast('Failed to load schools list. Please refresh the page.');
  }

  // --- Error Helpers ---
  function showError(fieldId, message) {
    const errorEl = document.getElementById(`err-${fieldId}`);
    const inputEl = document.getElementById(fieldId);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
    if (inputEl) {
      const wrapper = inputEl.closest('.input-icon-wrapper') || inputEl.parentElement;
      if (wrapper) wrapper.classList.add('input-error');
    }
  }

  function clearError(fieldId) {
    const errorEl = document.getElementById(`err-${fieldId}`);
    const inputEl = document.getElementById(fieldId);
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
    if (inputEl) {
      const wrapper = inputEl.closest('.input-icon-wrapper') || inputEl.parentElement;
      if (wrapper) wrapper.classList.remove('input-error');
    }
  }

  function clearAllErrors() {
    document.querySelectorAll('.error-msg').forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });
    document.querySelectorAll('.input-icon-wrapper').forEach(el => {
      el.classList.remove('input-error');
    });
  }

  function setLoading(loading) {
    const btn = document.getElementById('btn-complete-submit');
    if (!btn) return;
    const textEl = btn.querySelector('.btn-text');
    const loaderEl = btn.querySelector('.btn-loader');

    if (loading) {
      btn.disabled = true;
      if (textEl) textEl.style.display = 'none';
      if (loaderEl) loaderEl.style.display = 'inline-flex';
    } else {
      btn.disabled = false;
      if (textEl) textEl.style.display = 'inline';
      if (loaderEl) loaderEl.style.display = 'none';
    }
  }

  const userTypeSelect = document.getElementById('complete-user-type');
  const classInput = document.getElementById('complete-class');
  const sectionInput = document.getElementById('complete-section');
  const batchInput = document.getElementById('complete-batch');

  function toggleAcademicFields() {
    const userType = userTypeSelect ? userTypeSelect.value : '';
    const isStudentOrAlumni = userType === 'student' || userType === 'alumni';
    
    [classInput, sectionInput, batchInput].forEach(input => {
      if (!input) return;
      const formGroup = input.closest('.form-group');
      if (formGroup) {
        formGroup.style.display = isStudentOrAlumni ? 'block' : 'none';
      }
      if (isStudentOrAlumni) {
        input.setAttribute('required', 'required');
      } else {
        input.removeAttribute('required');
      }
    });
  }

  if (userTypeSelect) {
    userTypeSelect.addEventListener('change', toggleAcademicFields);
    toggleAcademicFields();
  }

  // Clear errors on input/change
  document.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('input', () => clearError(input.id));
    input.addEventListener('change', () => clearError(input.id));
  });

  // --- Form Submission ---
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAllErrors();

      const userType = userTypeSelect ? userTypeSelect.value : '';
      const usernameVal = usernameInput ? usernameInput.value.trim() : '';
      const schoolId = document.getElementById('complete-school').value;
      const classVal = classInput ? classInput.value.trim() : '';
      const sectionVal = sectionInput ? sectionInput.value.trim() : '';
      const batchVal = batchInput ? batchInput.value.trim() : '';
      const phoneVal = document.getElementById('complete-phone').value.trim();

      // Validate
      let hasError = false;

      if (isUsernameMissing) {
        const usernameRegex = /^[a-zA-Z0-9_.]+$/;
        if (!usernameVal) { showCompleteUsernameStatus('error', 'Username is required'); hasError = true; }
        else if (usernameVal.length < 3 || usernameVal.length > 20) { showCompleteUsernameStatus('error', 'Username must be 3-20 characters'); hasError = true; }
        else if (!usernameRegex.test(usernameVal)) { showCompleteUsernameStatus('error', 'Username can only contain letters, numbers, underscores, and periods'); hasError = true; }
        else if (!usernameAvailable) { showCompleteUsernameStatus('error', '✗ Username already taken'); hasError = true; }
      }

      if (!userType) { showError('complete-user-type', 'Please select how you want to join'); hasError = true; }
      if (!schoolId) { showError('complete-school', 'Please select your school'); hasError = true; }
      
      const isStudentOrAlumni = userType === 'student' || userType === 'alumni';
      if (isStudentOrAlumni) {
        if (!classVal) { showError('complete-class', 'Class is required'); hasError = true; }
        if (!sectionVal) { showError('complete-section', 'Section is required'); hasError = true; }
        if (!batchVal) { showError('complete-batch', 'Batch is required'); hasError = true; }
      }

      if (hasError) return;

      setLoading(true);

      try {
        // Build update payload
        const updatePayload = {
          full_name: fullName,
          user_type: userType,
          school_id: schoolId,
          class: isStudentOrAlumni ? classVal : null,
          section: isStudentOrAlumni ? sectionVal : null,
          batch: isStudentOrAlumni ? batchVal : null,
          phone: phoneVal || null,
          avatar_url: avatarUrl || null,
          is_profile_complete: true
        };

        if (isUsernameMissing) {
          updatePayload.username = usernameVal.toLowerCase();
        }

        // Update profile in database
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', userId);

        if (updateError) throw updateError;

        showToast('Profile setup complete! Redirecting...');

        // Fetch updated role to determine correct redirect page
        const role = await auth.getUserRole();
        let redirectPage = 'index.html';
        if (role === 'super_admin') {
          redirectPage = 'admin/index.html';
        } else if (role === 'school_admin') {
          redirectPage = 'dashboard.html';
        }

        setTimeout(() => {
          window.location.href = redirectPage;
        }, 1500);

      } catch (err) {
        setLoading(false);
        console.error('Error completing profile setup:', err);
        showToast('Failed to save profile: ' + (err.message || 'Unknown error'));
      }
    });
  }
});
