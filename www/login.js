// login.js
// CampusLink Login Page Logic
// Handles form submissions, tab switching, password visibility, avatar upload, validation.

document.addEventListener('DOMContentLoaded', async () => {

  // ── Element References ──────────────────────────────────
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const indicator = document.getElementById('auth-tab-indicator');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const switchToRegister = document.getElementById('switch-to-register');
  const switchToLogin = document.getElementById('switch-to-login');
  const successState = document.getElementById('auth-success-state');
  const toast = document.getElementById('auth-toast');
  const toastMsg = document.getElementById('auth-toast-msg');
  const toastClose = document.getElementById('auth-toast-close');

  // Forgot & Verify References
  const forgotForm = document.getElementById('forgot-form');
  const verifyWindow = document.getElementById('verify-email-window');
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  const forgotBackToLogin = document.getElementById('forgot-back-to-login');
  const verifyBackToLogin = document.getElementById('verify-back-to-login');
  const btnResendVerification = document.getElementById('btn-resend-verification');
  const verifyEmailAddress = document.getElementById('verify-email-address');

  // Update Password References
  const updatePasswordForm = document.getElementById('update-password-form');

  // ── Toast ───────────────────────────────────────────────
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

  // Robust Error Message Extractor
  function getErrorMessage(err, defaultMsg) {
    if (!err) return defaultMsg;

    // Check for network/fetch errors
    if (err.name === 'AuthRetryableFetchError' || 
        err.message === 'Failed to fetch' || 
        (err.message && err.message.toLowerCase().includes('fetch')) ||
        (err.stack && err.stack.includes('FetchError'))) {
      return 'Network connection error: Supabase is unreachable. Please check your internet connection or disable any ad-blockers.';
    }

    if (typeof err === 'string') {
      try {
        const parsed = JSON.parse(err);
        return getErrorMessage(parsed, defaultMsg);
      } catch (e) {
        return err;
      }
    }
    if (err.message) {
      return getErrorMessage(err.message, defaultMsg);
    }
    if (err.error_description) return err.error_description;
    if (err.error) return getErrorMessage(err.error, defaultMsg);
    
    try {
      const str = JSON.stringify(err);
      if (str === '{}' || str === '' || str === '[]') return defaultMsg;
      return str;
    } catch (e) {
      return defaultMsg;
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
     showToast('Failed to initialize the authentication module. Please check your internet connection and Supabase settings.');
     return;
  }

  // Check URL hash/params or sessionStorage for password recovery flow
  const isRecovery = sessionStorage.getItem('is_recovery_flow') === 'true' ||
                     window.location.hash.includes('type=recovery') || 
                     window.location.hash.includes('recovery') || 
                     window.location.search.includes('type=recovery');

  // If already logged in, redirect (skip if in password recovery flow)
  const existingSession = await auth.getSession();
  if (existingSession && !isRecovery) {
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

  // ── Tab / View Switching ────────────────────────────────
  function switchView(viewName) {
    clearAllErrors();
    const tabToggle = document.querySelector('.auth-tab-toggle');
    
    // Hide all views first
    loginForm.style.display = 'none';
    loginForm.classList.remove('active');
    registerForm.style.display = 'none';
    registerForm.classList.remove('active');
    if (forgotForm) { forgotForm.style.display = 'none'; forgotForm.classList.remove('active'); }
    if (verifyWindow) { verifyWindow.style.display = 'none'; verifyWindow.classList.remove('active'); }
    if (updatePasswordForm) { updatePasswordForm.style.display = 'none'; updatePasswordForm.classList.remove('active'); }
    successState.style.display = 'none';
    
    if (viewName === 'login') {
      loginForm.style.display = 'block';
      loginForm.classList.add('active');
      if (tabToggle) tabToggle.style.display = 'flex';
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      if (indicator) indicator.style.transform = 'translateX(0)';
    } else if (viewName === 'register') {
      registerForm.style.display = 'block';
      registerForm.classList.add('active');
      if (tabToggle) tabToggle.style.display = 'flex';
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      if (indicator) indicator.style.transform = 'translateX(100%)';
    } else if (viewName === 'forgot') {
      if (forgotForm) {
        forgotForm.style.display = 'block';
        forgotForm.classList.add('active');
      }
      if (tabToggle) tabToggle.style.display = 'none';
    } else if (viewName === 'verify') {
      if (verifyWindow) {
        verifyWindow.style.display = 'block';
        verifyWindow.classList.add('active');
      }
      if (tabToggle) tabToggle.style.display = 'none';
    } else if (viewName === 'update') {
      if (updatePasswordForm) {
        updatePasswordForm.style.display = 'block';
        updatePasswordForm.classList.add('active');
      }
      if (tabToggle) tabToggle.style.display = 'none';
    }
  }

  tabLogin.addEventListener('click', () => switchView('login'));
  tabRegister.addEventListener('click', () => switchView('register'));
  switchToRegister.addEventListener('click', (e) => { e.preventDefault(); switchView('register'); });
  switchToLogin.addEventListener('click', (e) => { e.preventDefault(); switchView('login'); });
  
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Pre-fill email if typed
      const typedEmail = document.getElementById('login-email')?.value.trim();
      const forgotEmailInput = document.getElementById('forgot-email');
      if (typedEmail && forgotEmailInput) {
        forgotEmailInput.value = typedEmail;
      }
      switchView('forgot');
    });
  }
  
  if (forgotBackToLogin) {
    forgotBackToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('login');
    });
  }
  
  if (verifyBackToLogin) {
    verifyBackToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('login');
    });
  }

  // Check URL hash for initial tab or recovery flow
  if (isRecovery) {
    sessionStorage.removeItem('is_recovery_flow');
    // Clear hash parameters to clean URL bar but maintain session
    try {
      history.replaceState(null, null, ' ');
    } catch (e) {
      window.location.hash = '';
    }
    switchView('update');
  } else if (window.location.hash === '#register') {
    switchView('register');
  } else {
    switchView('login');
  }

  // ── Error Helpers ───────────────────────────────────────
  function showError(fieldId, message) {
    const errorEl = document.getElementById(`err-${fieldId}`);
    const inputEl = document.getElementById(fieldId);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
    if (inputEl) {
      const wrapper = inputEl.closest('.input-icon-wrapper');
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
      const wrapper = inputEl.closest('.input-icon-wrapper');
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

  // ── Button Loading State ────────────────────────────────
  function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
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

  // ── Password Visibility Toggle ──────────────────────────
  function setupPasswordToggle(toggleId, inputId) {
    const toggle = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    if (!toggle || !input) return;

    toggle.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggle.classList.toggle('active', !isPassword);
    });
  }

  setupPasswordToggle('toggle-login-pw', 'login-password');
  setupPasswordToggle('toggle-reg-pw', 'reg-password');

  // ── Password Strength Meter ─────────────────────────────
  const regPassword = document.getElementById('reg-password');
  const strengthFill = document.getElementById('strength-fill');
  const strengthLabel = document.getElementById('strength-label');

  function checkPasswordStrength(password) {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
      { label: '', color: 'transparent', width: '0%' },
      { label: 'Weak', color: '#EF4444', width: '20%' },
      { label: 'Fair', color: '#F59E0B', width: '40%' },
      { label: 'Good', color: '#3B82F6', width: '60%' },
      { label: 'Strong', color: '#10B981', width: '80%' },
      { label: 'Excellent', color: '#059669', width: '100%' }
    ];

    const level = levels[Math.min(score, 5)];
    strengthFill.style.width = level.width;
    strengthFill.style.backgroundColor = level.color;
    strengthLabel.textContent = level.label;
    strengthLabel.style.color = level.color;
  }

  if (regPassword) {
    regPassword.addEventListener('input', () => {
      checkPasswordStrength(regPassword.value);
    });
  }

  // ── Avatar Upload ───────────────────────────────────────
  const avatarUploadArea = document.getElementById('avatar-upload-area');
  const avatarInput = document.getElementById('reg-avatar');
  const avatarPreview = document.getElementById('avatar-preview');
  let selectedAvatarFile = null;

  if (avatarUploadArea && avatarInput) {
    avatarUploadArea.addEventListener('click', () => {
      avatarInput.click();
    });

    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleAvatarFile(file);
      }
    });

    // Drag and drop support
    ['dragenter', 'dragover'].forEach(eventName => {
      avatarUploadArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        avatarUploadArea.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      avatarUploadArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        avatarUploadArea.classList.remove('dragover');
      }, false);
    });

    avatarUploadArea.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const file = dt.files[0];
      if (file && file.type.startsWith('image/')) {
        handleAvatarFile(file);
      }
    });
  }

  function handleAvatarFile(file) {
    // Validate size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      showError('reg-avatar', 'Image must be under 2MB');
      return;
    }

    // Validate type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showError('reg-avatar', 'Please upload a JPG, PNG, or WebP image');
      return;
    }

    selectedAvatarFile = file;
    clearError('reg-avatar');

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (avatarPreview) {
        avatarPreview.innerHTML = `<img src="${e.target.result}" alt="Profile preview">`;
        avatarUploadArea.classList.add('has-image');
      }
    };
    reader.readAsDataURL(file);
  }

  // Clear errors on input/change
  document.querySelectorAll('input, select').forEach(input => {
    const eventType = input.type === 'checkbox' ? 'change' : 'input';
    input.addEventListener(eventType, () => {
      clearError(input.id);
    });
  });

  // ── Login Form Submit ───────────────────────────────────
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    // Validate
    let hasError = false;
    if (!email) { showError('login-email', 'Email is required'); hasError = true; }
    if (!password) { showError('login-password', 'Password is required'); hasError = true; }
    if (hasError) return;

    setLoading('btn-login', true);

    try {
      const loginData = await auth.signIn(email, password);

      // Fetch profile to determine redirect
      const profile = await auth.getProfile(loginData.user.id);
      const platformRole = profile?.platform_role || 'user';
      const userType = profile?.user_type || 'student';
      const displayName = profile?.full_name || loginData.user.user_metadata?.full_name || 'User';

      let redirectPage = 'index.html';
      if (platformRole === 'super_admin') {
        redirectPage = 'admin/index.html';
      } else if (platformRole === 'school_admin') {
        redirectPage = 'dashboard.html';
      }

      // Show success and redirect
      loginForm.style.display = 'none';
      document.querySelector('.auth-tab-toggle').style.display = 'none';
      successState.style.display = 'flex';
      document.getElementById('success-title').textContent = 'Welcome Back!';
      document.getElementById('success-message').textContent = `Hello, ${displayName}! Redirecting...`;

      setTimeout(() => {
        window.location.href = redirectPage;
      }, 1500);
    } catch (error) {
      setLoading('btn-login', false);
      let msg = getErrorMessage(error, 'Login failed. Please check your credentials.');

      if (msg === 'Failed to fetch' || msg.toLowerCase().includes('fetch')) {
        msg = 'Connection error. Please configure your actual Supabase URL and Anon Key in supabase.js.';
        showToast(msg);
      } else if (msg.toLowerCase().includes('confirm') || msg.toLowerCase().includes('verify') || msg.toLowerCase().includes('verification')) {
        if (verifyEmailAddress) verifyEmailAddress.textContent = email;
        switchView('verify');
      } else if (msg.toLowerCase().includes('email')) {
        showError('login-email', msg);
      } else if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('credentials')) {
        showError('login-password', 'Invalid email or password');
      } else {
        showToast(msg);
      }
    }
  });

  // ── Register Form Submit ────────────────────────────────
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();

    const fullName = document.getElementById('reg-full-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const userType = document.getElementById('reg-user-type').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const termsConsent = document.getElementById('reg-terms-consent');
    const isConsentChecked = termsConsent ? termsConsent.checked : false;

    // Validate
    let hasError = false;

    if (!fullName) { showError('reg-full-name', 'Full name is required'); hasError = true; }
    else if (fullName.length < 2) { showError('reg-full-name', 'Name must be at least 2 characters'); hasError = true; }

    if (!email) { showError('reg-email', 'Email is required'); hasError = true; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('reg-email', 'Enter a valid email address'); hasError = true; }

    if (!userType) { showError('reg-user-type', 'Please select how you want to join'); hasError = true; }

    if (!password) { showError('reg-password', 'Password is required'); hasError = true; }
    else if (password.length < 6) { showError('reg-password', 'Password must be at least 6 characters'); hasError = true; }

    if (password !== confirmPassword) { showError('reg-confirm-password', 'Passwords do not match'); hasError = true; }

    if (!isConsentChecked) { showError('reg-terms-consent', 'You must agree to the Terms & Conditions and Privacy Policy'); hasError = true; }

    if (hasError) return;

    setLoading('btn-register', true);

    try {
      const result = await auth.signUp(email, password, fullName, userType, selectedAvatarFile, isConsentChecked);

      // Show success and redirect
      registerForm.style.display = 'none';
      document.querySelector('.auth-tab-toggle').style.display = 'none';
      successState.style.display = 'flex';

      // Get user type label
      const typeLabel = auth.getUserTypeLabel(userType);

      if (result.emailConfirmationRequired) {
        if (verifyEmailAddress) verifyEmailAddress.textContent = email;
        switchView('verify');
      } else {
        registerForm.style.display = 'none';
        document.querySelector('.auth-tab-toggle').style.display = 'none';
        successState.style.display = 'flex';
        document.getElementById('success-title').textContent = 'Account Created!';
        document.getElementById('success-message').textContent = `Welcome, ${fullName}! You've joined CampusLink as a ${typeLabel}. Redirecting...`;

        setTimeout(() => {
          window.location.href = 'index.html';
        }, 2000);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setLoading('btn-register', false);
      let msg = getErrorMessage(error, 'Registration failed. Please try again.');

      if (msg === 'Failed to fetch' || msg.toLowerCase().includes('fetch')) {
        msg = 'Connection error. Please configure your actual Supabase URL and Anon Key in supabase.js.';
        showToast(msg);
      } else if (msg.toLowerCase().includes('email')) {
        showError('reg-email', msg);
      } else if (msg.toLowerCase().includes('password')) {
        showError('reg-password', msg);
      } else {
        showToast(msg);
      }
    }
  });

  // ── Forgot Password Form Submit ──────────────────────────
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAllErrors();

      const sanitize = window.CampusLink?.security?.sanitizeString || (s => s.trim());
      const validateEmail = window.CampusLink?.security?.validateEmail || (s => null);

      const email = sanitize(document.getElementById('forgot-email').value);
      const emailErr = validateEmail(email);
      if (emailErr) {
        showError('forgot-email', emailErr);
        return;
      }

      setLoading('btn-forgot-submit', true);

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/login.html'
        });

        if (error) throw error;

        showToast('Password reset link sent! Please check your email.');
        setTimeout(() => {
          switchView('login');
        }, 2500);
      } catch (err) {
        console.error('Forgot password error:', err);
        showError('forgot-email', getErrorMessage(err, 'Could not send reset link. Please check your email address.'));
      } finally {
        setLoading('btn-forgot-submit', false);
      }
    });
  }

  // ── Resend Email Verification ────────────────────────────
  if (btnResendVerification) {
    btnResendVerification.addEventListener('click', async () => {
      const email = verifyEmailAddress ? verifyEmailAddress.textContent.trim() : '';
      if (!email) {
        showToast('No email address found to verify.');
        return;
      }

      setLoading('btn-resend-verification', true);

      try {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: email,
          options: {
            emailRedirectTo: window.location.origin + '/login.html'
          }
        });

        if (error) throw error;

        showToast('Verification email resent successfully!');
      } catch (err) {
        console.error('Resend verification error:', err);
        showToast(getErrorMessage(err, 'Failed to resend verification email.'));
      } finally {
        setLoading('btn-resend-verification', false);
      }
    });
  }

  // ── Update Password Form Submit ──────────────────────────
  if (updatePasswordForm) {
    updatePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAllErrors();

      const newPassword = document.getElementById('update-password').value;
      const confirmPassword = document.getElementById('update-confirm-password').value;

      let hasError = false;
      if (!newPassword) {
        showError('update-password', 'Password is required');
        hasError = true;
      } else if (newPassword.length < 6) {
        showError('update-password', 'Password must be at least 6 characters');
        hasError = true;
      }

      if (newPassword !== confirmPassword) {
        showError('update-confirm-password', 'Passwords do not match');
        hasError = true;
      }

      if (hasError) return;

      setLoading('btn-update-password-submit', true);

      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) throw error;

        // Show success toast and redirect
        showToast('Password updated successfully! Redirecting...');
        
        // Fetch profile to redirect correctly
        const user = await auth.getUser();
        let redirectPage = 'index.html';
        if (user) {
          const profile = await auth.getProfile(user.id);
          const platformRole = profile?.platform_role || 'user';
          if (platformRole === 'super_admin') {
            redirectPage = 'admin/index.html';
          } else if (platformRole === 'school_admin') {
            redirectPage = 'dashboard.html';
          }
        }
        
        setTimeout(() => {
          window.location.href = redirectPage;
        }, 2000);
      } catch (err) {
        console.error('Update password error:', err);
        showError('update-password', getErrorMessage(err, 'Could not update password. Please try again.'));
      } finally {
        setLoading('btn-update-password-submit', false);
      }
    });
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // If DOMContentLoaded fired already, init()
  }

});
