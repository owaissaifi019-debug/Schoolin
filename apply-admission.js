document.addEventListener('DOMContentLoaded', async () => {
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

  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      body.classList.toggle('mobile-nav-active');
    });
  }

  /* --- URL Parsing & School Fetch --- */
  const urlParams = new URLSearchParams(window.location.search);
  const schoolId = urlParams.get('school_id');

  if (!schoolId) {
    alert('Invalid Access: No school ID specified.');
    window.location.href = 'admissions.html';
    return;
  }

  const supabase = window.CampusLink && window.CampusLink.supabase;
  const auth = window.CampusLink && window.CampusLink.auth;

  // Verify auth state: Redirect to login if user is not authenticated
  let currentUser = null;
  if (auth) {
    const session = await auth.getSession();
    if (!session) {
      alert('Authentication Required: Please login to submit an admission application.');
      window.location.href = `login.html?redirect=apply-admission.html?school_id=${schoolId}`;
      return;
    }
    currentUser = session.user;
  }

  // Load School Metadata
  let schoolName = 'Partner School';
  let schoolBoard = 'CBSE';
  let schoolCity = 'India';

  // Mock Database mapping if using mock IDs
  const schoolProfiles = {
    1: { name: "Delhi Public School, RK Puram", board: "CBSE", city: "New Delhi" },
    2: { name: "St. Xavier's High School", board: "ICSE", city: "Mumbai" },
    3: { name: "Bishop Cotton School", board: "ICSE", city: "Shimla" },
    4: { name: "St. Stephen's Academy", board: "CBSE", city: "Dehradun" },
    5: { name: "The Heritage School", board: "IB", city: "Gurgaon" },
    6: { name: "Cathedral & John Connon School", board: "IB", city: "Mumbai" },
    7: { name: "Doon School", board: "ICSE", city: "Dehradun" },
    8: { name: "La Martiniere for Boys", board: "ICSE", city: "Kolkata" },
    9: { name: "Greenwood Public School", board: "CBSE", city: "Bangalore" },
    10: { name: "The Shri Ram School", board: "IB", city: "New Delhi" }
  };

  if (schoolId.length > 8 && supabase) {
    // DB Fetch
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('name, board, city')
        .eq('id', schoolId)
        .maybeSingle();

      if (!error && data) {
        schoolName = data.name;
        schoolBoard = data.board || 'CBSE';
        schoolCity = data.city || 'India';
      }
    } catch (err) {
      console.warn('Failed to load school details from Supabase:', err);
    }
  } else {
    // Mock ID fallback
    const idx = parseInt(schoolId, 10);
    const mockSchool = schoolProfiles[idx] || schoolProfiles[1];
    schoolName = mockSchool.name;
    schoolBoard = mockSchool.board;
    schoolCity = mockSchool.city;
  }

  // Update UI Header
  const titleEl = document.getElementById('apply-school-title');
  const metaEl = document.getElementById('apply-school-meta');
  if (titleEl) titleEl.textContent = `Apply for Admission: ${schoolName}`;
  if (metaEl) metaEl.textContent = `${schoolBoard} Board Affiliated • ${schoolCity}`;

  /* --- Multi-step Form Navigation Logic --- */
  const steps = document.querySelectorAll('.progress-step');
  const panels = document.querySelectorAll('.apply-step-panel');
  const btnNext = document.getElementById('btn-next');
  const btnBack = document.getElementById('btn-back');
  const form = document.getElementById('admission-apply-form');
  const successScreen = document.getElementById('apply-success-screen');
  const progressBar = document.getElementById('apply-progress-bar');

  let currentStep = 0;

  function showStep(stepIndex) {
    panels.forEach((panel, idx) => {
      panel.classList.toggle('active', idx === stepIndex);
    });
    steps.forEach((step, idx) => {
      step.classList.toggle('active', idx === stepIndex);
      step.classList.toggle('completed', idx < stepIndex);
    });

    btnBack.style.visibility = stepIndex === 0 ? 'hidden' : 'visible';
    btnNext.textContent = stepIndex === panels.length - 1 ? 'Submit Application' : 'Next Step';
    currentStep = stepIndex;
  }

  function validateStepFields(stepIndex) {
    const currentPanel = panels[stepIndex];
    const fields = currentPanel.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;

    fields.forEach(field => {
      if (!field.value.trim()) {
        isValid = false;
        field.style.borderColor = '#EF4444';
        setTimeout(() => field.style.borderColor = '', 2000);
      }
    });

    return isValid;
  }

  function populateReviewScreen() {
    document.getElementById('review-student-name').textContent = document.getElementById('student-name').value;
    document.getElementById('review-grade').textContent = document.getElementById('student-grade').value;
    document.getElementById('review-dob').textContent = document.getElementById('student-dob').value;
    document.getElementById('review-prev-school').textContent = document.getElementById('student-prev-school').value || 'None';
    document.getElementById('review-parent-name').textContent = document.getElementById('parent-name').value;
    document.getElementById('review-phone').textContent = document.getElementById('parent-phone').value;
    document.getElementById('review-email').textContent = document.getElementById('parent-email').value;
    document.getElementById('review-address').textContent = document.getElementById('parent-address').value;
  }

  btnNext.addEventListener('click', async () => {
    if (!validateStepFields(currentStep)) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    if (currentStep === 0) {
      showStep(1);
    } else if (currentStep === 1) {
      populateReviewScreen();
      showStep(2);
    } else if (currentStep === 2) {
      await submitApplication();
    }
  });

  btnBack.addEventListener('click', () => {
    if (currentStep > 0) {
      showStep(currentStep - 1);
    }
  });

  /* --- Form Submission Logic --- */
  async function submitApplication() {
    btnNext.disabled = true;
    btnNext.textContent = 'Submitting...';

    const payload = {
      school_id: schoolId,
      applicant_user_id: currentUser ? currentUser.id : null,
      student_name: document.getElementById('student-name').value.trim(),
      parent_name: document.getElementById('parent-name').value.trim(),
      email: document.getElementById('parent-email').value.trim(),
      phone: document.getElementById('parent-phone').value.trim(),
      grade_applied: document.getElementById('student-grade').value,
      previous_school: document.getElementById('student-prev-school').value.trim() || null,
      dob: document.getElementById('student-dob').value || null,
      address: document.getElementById('parent-address').value.trim(),
      status: 'pending'
    };

    let submitted = false;

    // 1. Submit to Supabase if DB exists & schoolId is uuid
    if (supabase && schoolId.length > 8) {
      try {
        const { error } = await supabase
          .from('admission_applications')
          .insert(payload);

        if (error) throw error;
        submitted = true;

        // Trigger notification to school representative / admin
        if (window.CampusLink && window.CampusLink.notifications) {
          try {
            const { data: schoolData } = await supabase
              .from('schools')
              .select('admin_user_id, name')
              .eq('id', schoolId)
              .maybeSingle();

            if (schoolData && schoolData.admin_user_id) {
              const applicantName = payload.student_name || 'A student';
              await window.CampusLink.notifications.createNotification(
                schoolData.admin_user_id,
                'admission_application',
                `New admission application for ${schoolData.name}`,
                `From applicant: ${applicantName} (Grade: ${payload.grade_applied})`,
                `dashboard.html`,
                currentUser ? currentUser.id : null
              );
            }
          } catch (notifErr) {
            console.warn('Error sending admission application notification:', notifErr);
          }
        }
      } catch (err) {
        console.warn('Failed to insert application into Supabase, utilizing LocalStorage backup:', err);
      }
    }

    // 2. Always backup/write to LocalStorage to ensure dashboard sync works smoothly in all envs
    try {
      const localApps = JSON.parse(localStorage.getItem('campuslink_admission_applications')) || [];
      const newApp = {
        id: Math.floor(Math.random() * 1000000), // Mock ID
        ...payload,
        school_name: schoolName,
        created_at: new Date().toISOString()
      };
      localApps.push(newApp);
      localStorage.setItem('campuslink_admission_applications', JSON.stringify(localApps));
      submitted = true;
    } catch (localErr) {
      console.error('LocalStorage write failed:', localErr);
    }

    if (submitted) {
      showToast('Application submitted successfully!');
      form.style.display = 'none';
      progressBar.style.display = 'none';
      successScreen.style.display = 'flex';
    } else {
      showToast('Failed to submit application. Please try again.', 'error');
      btnNext.disabled = false;
      btnNext.textContent = 'Submit Application';
    }
  }

  // Toast container notifier helper
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
});
