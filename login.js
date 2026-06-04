// login.js
// SchoolIn Login Page Logic
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

  // If already logged in, redirect
  const existingSession = await auth.getSession();
  if (existingSession) {
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

  // ── Tab Switching ───────────────────────────────────────
  function showTab(tab) {
    if (tab === 'login') {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      loginForm.classList.add('active');
      registerForm.classList.remove('active');
      indicator.style.transform = 'translateX(0)';
    } else {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      registerForm.classList.add('active');
      loginForm.classList.remove('active');
      indicator.style.transform = 'translateX(100%)';
    }
    clearAllErrors();
  }

  tabLogin.addEventListener('click', () => showTab('login'));
  tabRegister.addEventListener('click', () => showTab('register'));
  switchToRegister.addEventListener('click', (e) => { e.preventDefault(); showTab('register'); });
  switchToLogin.addEventListener('click', (e) => { e.preventDefault(); showTab('login'); });

  // Check URL hash for initial tab
  if (window.location.hash === '#register') {
    showTab('register');
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

  // Clear errors on input
  document.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('input', () => {
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
      let msg = error.message || 'Login failed. Please check your credentials.';

      if (msg === 'Failed to fetch' || msg.toLowerCase().includes('fetch')) {
        msg = 'Connection error. Please configure your actual Supabase URL and Anon Key in supabase.js.';
        showToast(msg);
      } else if (msg.toLowerCase().includes('confirm') || msg.toLowerCase().includes('verify') || msg.toLowerCase().includes('verification')) {
        showError('login-email', 'Please verify your email address. Check your inbox for a confirmation link.');
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

    if (hasError) return;

    setLoading('btn-register', true);

    try {
      const result = await auth.signUp(email, password, fullName, userType, selectedAvatarFile);

      // Show success and redirect
      registerForm.style.display = 'none';
      document.querySelector('.auth-tab-toggle').style.display = 'none';
      successState.style.display = 'flex';

      // Get user type label
      const typeLabel = auth.getUserTypeLabel(userType);

      if (result.emailConfirmationRequired) {
        document.getElementById('success-title').textContent = 'Verification Email Sent';
        document.getElementById('success-message').innerHTML = `
          Account created as <strong>${typeLabel}</strong>! We've sent a verification email to <strong>${email}</strong>.<br><br>
          Please check your inbox and click the verification link to activate your account.<br><br>
          <a href="login.html" class="btn btn-secondary" style="display: inline-block; margin-top: 15px; width: auto; padding: 8px 16px;">Return to Sign In</a>
        `;
      } else {
        document.getElementById('success-title').textContent = 'Account Created!';
        document.getElementById('success-message').textContent = `Welcome, ${fullName}! You've joined SchoolIn as a ${typeLabel}. Redirecting...`;

        setTimeout(() => {
          window.location.href = 'index.html';
        }, 2000);
      }
    } catch (error) {
      setLoading('btn-register', false);
      let msg = error.message || 'Registration failed. Please try again.';

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

});
