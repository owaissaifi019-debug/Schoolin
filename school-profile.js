document.addEventListener('DOMContentLoaded', () => {

  // Update navigation based on auth state
  if (window.CampusLink && window.CampusLink.auth) {
    window.CampusLink.auth.updateNavAuthState();
  }

  // Bind Share School Button
  const shareSchoolBtn = document.getElementById('btn-share-school');
  console.log('Share button element:', shareSchoolBtn);
  if (shareSchoolBtn) {
    shareSchoolBtn.addEventListener('click', async () => {
      console.log('Share button clicked');
      const shareUrl = window.location.href;
      const schoolName = currentProfile ? currentProfile.name : document.title;
      const shareData = {
        title: schoolName,
        text: `Check out ${schoolName} on SchoolIn!`,
        url: shareUrl
      };

      // Check for Capacitor Share API
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) {
        try {
          await window.Capacitor.Plugins.Share.share({
            title: shareData.title,
            text: shareData.text,
            url: shareData.url,
            dialogTitle: 'Share School'
          });
          return;
        } catch (err) {
          console.warn('Capacitor share failed, trying Web Share API:', err);
        }
      }

      // Check for Web Share API
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err) {
          if (err.name === 'AbortError') {
            return; // user cancelled
          }
          console.warn('Web Share failed, trying clipboard copy:', err);
        }
      }

      // Clipboard fallback
      function fallbackCopy(url) {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          showToast('School profile link copied to clipboard!');
        } catch (e) {
          console.error('Failed fallback copy:', e);
          alert('Failed to copy link: ' + url);
        }
        document.body.removeChild(textarea);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          showToast('School profile link copied to clipboard!');
        }).catch(err => {
          console.error('Failed to copy school link:', err);
          fallbackCopy(shareUrl);
        });
      } else {
        fallbackCopy(shareUrl);
      }
    });
  }

  
  /* --- Sticky Header Logic --- */
  const header = document.querySelector('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  /* --- Mobile Navigation Menu --- */
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');
  const body = document.body;

  // Loading functions
  function showLoading() {
    const loader = document.getElementById('loader-container');
    if (loader) loader.style.display = 'flex';
  }

  function hideLoading() {
    const loader = document.getElementById('loader-container');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.style.display = 'none', 500);
    }
  }

  mobileToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    body.classList.toggle('mobile-nav-active');
  });

  // Close mobile nav when clicking a link
  const navAnchors = document.querySelectorAll('.nav-links a');
  navAnchors.forEach(anchor => {
    anchor.addEventListener('click', () => {
      navLinks.classList.remove('active');
      body.classList.remove('mobile-nav-active');
    });
  });

  /* --- Profiles Database --- */
  const schoolProfiles = {
    1: {
      name: "Delhi Public School, RK Puram",
      city: "New Delhi",
      board: "CBSE",
      est: "1972",
      size: "12 Acres",
      logoLetter: "D",
      colorClass: "color-1",
      about: "Delhi Public School, RK Puram is one of India's most prestigious co-educational day-cum-boarding schools. Founded under the aegis of the DPS Society, it has consistently delivered toppers in academic boards and sports arenas alike.",
      achievements: [
        { year: "2025", title: "Ranked #1 Co-Ed Day-Boarding School", desc: "Awarded by Education World National School Rankings." },
        { year: "2024", title: "National Robotics Championship Winners", desc: "First place at the All-India STEM robotics league." },
        { year: "2023", title: "CBSE National Sports Meet Overall Trophy", desc: "Dominating in Athletics, Swimming, and Basketball tournaments." }
      ],
      admissionText: "Admissions Open: Registration for nursery and grade XI starts June 15, 2026.",
      verificationBadge: 'blue'
    },
    2: {
      name: "St. Xavier's High School",
      city: "Mumbai",
      board: "ICSE",
      est: "1869",
      size: "4 Acres",
      logoLetter: "X",
      colorClass: "color-2",
      about: "St. Xavier's High School, Fort, is a historic institution in Mumbai dedicated to nurturing young minds with robust Jesuit principles and rich academic traditions.",
      achievements: [
        { year: "2025", title: "Centennial Heritage Education Award", desc: "Recognized for preserving historical education benchmarks." },
        { year: "2024", title: "State Football League Champions", desc: "Under-17 boys clinching the Maharashtra Football Association Shield." },
        { year: "2023", title: "All-India Science Model Expo Gold Medal", desc: "Secured top honours in environmental engineering design." }
      ],
      admissionText: "Admissions Open: KG registration cycles commence from July 1, 2026.",
      verificationBadge: 'blue'
    },
    3: {
      name: "Bishop Cotton School",
      city: "Shimla",
      board: "ICSE",
      est: "1859",
      size: "56 Acres",
      logoLetter: "B",
      colorClass: "color-3",
      about: "Bishop Cotton School is one of the oldest boarding schools for boys in Asia, located in the serene hills of Shimla. It focuses on character building, outdoor adventure, and public-school discipline.",
      achievements: [
        { year: "2025", title: "Top Boarding School in Himachal Pradesh", desc: "Consistently rated #1 for heritage and boarding standards." },
        { year: "2024", title: "Inter-School Debate Championship Winners", desc: "Won the prestigious Shimla Debates overall shield." }
      ],
      admissionText: "Admissions Open: Boarding registrations open for Grades 3 to 9. Apply before July 10, 2026.",
      verificationBadge: 'gold'
    },
    4: {
      name: "St. Stephen's Academy",
      city: "Dehradun",
      board: "CBSE",
      est: "1994",
      size: "8 Acres",
      logoLetter: "S",
      colorClass: "color-4",
      about: "St. Stephen's Academy in Dehradun is known for its beautiful campus and robust sports coaching modules, nurturing national level athletes alongside academic CBSE toppers.",
      achievements: [
        { year: "2025", title: "National Basketball League Runners-Up", desc: "Fought in the finals of the Inter-School Sports Council League." },
        { year: "2024", title: "98.4% School Board Aggregate", desc: "Record highest board scores achieved in school history." }
      ],
      admissionText: "Admissions Open: Regular admission slots open for sports quotas. Apply today.",
      verificationBadge: 'none'
    },
    5: {
      name: "The Heritage School",
      city: "Gurgaon",
      board: "IB",
      est: "2002",
      size: "9 Acres",
      logoLetter: "H",
      colorClass: "color-5",
      about: "The Heritage School is an experiential learning institution in Gurgaon. Offering IB and Cambridge modules, it prioritizes hands-on project fests and collaborative study models.",
      achievements: [
        { year: "2025", title: "Leading Experiential School in NCR", desc: "Awarded for child-centric progressive methodologies." },
        { year: "2024", title: "IBDP Perfect Score Achievers", desc: "Two students secured 45/45 in the international diploma board." }
      ],
      admissionText: "Admissions Open: IB PYP, MYP, and DP intakes are open. Virtual open houses schedule available.",
      verificationBadge: 'gold'
    },
    6: {
      name: "Cathedral & John Connon School",
      city: "Mumbai",
      board: "IB",
      est: "1860",
      size: "5 Acres",
      logoLetter: "C",
      colorClass: "color-1",
      about: "The Cathedral & John Connon School is an elite co-educational school in Mumbai known for its outstanding academic history, musical theatre events, and stellar alumni accomplishments.",
      achievements: [
        { year: "2025", title: "Ranked #1 Co-Ed Day School in Maharashtra", desc: "Awarded for global college placement and student support." },
        { year: "2024", title: "International Math Olympiad Silver", desc: "Student secured global rank in the advanced math tournament." }
      ],
      admissionText: "Admissions Open: Secondary school IB intakes live. Direct prospectus requests open.",
      verificationBadge: 'blue'
    },
    7: {
      name: "Doon School",
      city: "Dehradun",
      board: "ICSE",
      est: "1935",
      size: "72 Acres",
      logoLetter: "D",
      colorClass: "color-2",
      about: "The Doon School is a premier all-boys boarding school in Dehradun, often referred to as the 'Eton of India'. It nurtures critical thinking, governance leadership, and social development.",
      achievements: [
        { year: "2025", title: "All-India Boarding School Rank #1", desc: "Consistently top-ranked boarding institution for boys." },
        { year: "2024", title: "President's Social Action Award", desc: "Recognized for community service and village uplift fests." }
      ],
      admissionText: "Admissions Open: Entrance test schedules for Class VII and VIII are active online.",
      verificationBadge: 'gold'
    },
    8: {
      name: "La Martiniere for Boys",
      city: "Kolkata",
      board: "ICSE",
      est: "1836",
      size: "8 Acres",
      logoLetter: "L",
      colorClass: "color-3",
      about: "La Martiniere for Boys in Kolkata is a historic school that offers premium science, commerce, and arts curricula, combined with classic Anglo-Indian fests and traditions.",
      achievements: [
        { year: "2025", title: "National Debating Champion Shield", desc: "Secured overall winner at the Frank Anthony Memorial Debates." },
        { year: "2024", title: "East Zone Swimming League Gold", desc: "Overall team championship won for the 5th consecutive year." }
      ],
      admissionText: "Admissions Open: Nursery & Primary admissions active. Contact registrar.",
      verificationBadge: 'blue'
    },
    9: {
      name: "Greenwood Public School",
      city: "Bangalore",
      board: "CBSE",
      est: "2006",
      size: "15 Acres",
      logoLetter: "G",
      colorClass: "color-4",
      about: "Greenwood Public School is a high-tech campus in Bangalore offering CBSE and Cambridge curricula. It is highly regarded for its green campus initiatives and coding accelerators.",
      achievements: [
        { year: "2025", title: "Green School National Gold Award", desc: "Recognized for solar powered labs and water recycling campaigns." },
        { year: "2024", title: "Inter-School Coding hackathon Winners", desc: "Secured first prize in the national junior dev challenge." }
      ],
      admissionText: "Admissions Open: Direct CBSE admissions active online for grades 1 to 9.",
      verificationBadge: 'gold'
    },
    10: {
      name: "The Shri Ram School",
      city: "New Delhi",
      board: "IB",
      est: "1988",
      size: "6 Acres",
      logoLetter: "S",
      colorClass: "color-5",
      about: "The Shri Ram School in Delhi/NCR focuses on inclusive, value-based education. It is recognized for parent-teacher collaboration, arts inclusion, and global studies preparation.",
      achievements: [
        { year: "2025", title: "#1 Day School in Delhi NCR", desc: "Ranked first for teacher training, infrastructure, and values." },
        { year: "2024", title: "International Music Fest Gold", desc: "School choir secured first place at the Asia Pacific Choral league." }
      ],
      admissionText: "Admissions Open: Applications starting shortly. Pre-register for notifications.",
      verificationBadge: 'blue'
    }
  };

  /* --- Global Opportunities Database (to filter for events tab) --- */
  const opportunities = JSON.parse(localStorage.getItem('campuslink_events')) || [
    { school: "Delhi Public School, RK Puram", title: "National Science & Robotics Fest 2026", category: "science", date: "June 24 - 26, 2026", tag: "Science & Tech", registrations: "1.2k", location: "New Delhi", logoLetter: "🔬" },
    { school: "St. Xavier's High School", title: "Synthesis Cultural Fest & Art Exhibition", category: "cultural", date: "July 12 - 14, 2026", tag: "Arts & Culture", registrations: "3.4k", location: "Mumbai, MH", logoLetter: "🎭" },
    { school: "Bishop Cotton School", title: "AI & Machine Learning Student Workshop", category: "workshop", date: "June 30, 2026", tag: "Technology", registrations: "850", location: "Shimla, HP", logoLetter: "💻" },
    { school: "St. Stephen's Academy", title: "Invitational Inter-School Basketball League", category: "sports", date: "Oct 10 - 15, 2026", tag: "Sports", registrations: "2.1k", location: "Dehradun, UK", logoLetter: "🏀" },
    { school: "The Heritage School", title: "Academic Open House & Admission Details 2026-27", category: "admissions", date: "Apply before July 5, 2026", tag: "Admissions", registrations: "1.5k", location: "Gurgaon, HR", logoLetter: "🎓" },
    { school: "Cathedral & John Connon School", title: "All-India Model United Nations (MUN)", category: "debate", date: "August 18 - 20, 2026", tag: "Leadership", registrations: "1.8k", location: "Mumbai, MH", logoLetter: "🗣️" },
    { school: "Doon School", title: "Summer Creative Writing & Theatre Workshop", category: "workshop", date: "July 8 - 15, 2026", tag: "Arts & Theatre", registrations: "620", location: "Dehradun, UK", logoLetter: "✍️" },
    { school: "La Martiniere for Boys", title: "Grand Autumn Fest & Food Carnival", category: "cultural", date: "Nov 5 - 6, 2026", tag: "Cultural & Food", registrations: "4.2k", location: "Kolkata, WB", logoLetter: "🎡" }
  ];

  /* --- Parse URL Query Parameters --- */
  const urlParams = new URLSearchParams(window.location.search);
  const schoolId = urlParams.get('id') || '1';
  let currentProfile = null;
  let followersCount = 0;
  let isFollowing = false;
  let currentUser = null;
  let isSchoolAdmin = false;
  let isSuperAdmin = false;

  async function loadSchoolProfile() {
    const supabase = window.CampusLink && window.CampusLink.supabase;
    const auth = window.CampusLink && window.CampusLink.auth;
    let loadedFromDB = false;
    
    if (auth) {
      try {
        const session = await auth.getSession();
        currentUser = session?.user || null;
      } catch (authErr) {
        console.warn('Error fetching user session:', authErr);
      }
    }
    
    if (supabase) {
      try {
        let dbSchool = null;

        // Fetch school record — by UUID
        if (schoolId.length > 8) { // UUID
          const { data } = await supabase.from('schools').select('*').eq('id', schoolId).maybeSingle();
          dbSchool = data;
        } else {
          // Mock ID fallback — do not fetch database record.
          dbSchool = null;
        }

        // Build currentProfile from the fetched school record
        console.log('[DEBUG] Received school object:', dbSchool);
        console.log('[DEBUG] logo_url:', dbSchool?.logo_url, '| cover_url:', dbSchool?.cover_url);
        if (dbSchool) {
          let description = dbSchool.about || 'Verified academic partner school.';
          let schoolAchievements = [
            { year: "2025", title: "Academic Excellence Award", desc: "Awarded for exceptional board results." },
            { year: "2024", title: "Best Sports Infrastructure", desc: "For state-of-the-art sporting facilities." }
          ];
          let schoolHighlights = [
            "Science & Robotics Core Laboratories",
            "Olympic-sized Swimming Pool & Tennis Courts",
            "Fully air-conditioned boarding fests for Boys & Girls",
            "Digital Library & Smart Classroom infrastructure"
          ];

          if (dbSchool.about && dbSchool.about.trim().startsWith('{')) {
            try {
              const parsedAbout = JSON.parse(dbSchool.about);
              description = parsedAbout.description || '';
              schoolAchievements = parsedAbout.achievements || [];
              schoolHighlights = parsedAbout.highlights || [];
            } catch (jsonErr) {
              console.warn('Failed to parse school about JSON:', jsonErr);
            }
          }

          currentProfile = {
            id: dbSchool.id,
            name: dbSchool.name,
            city: dbSchool.city || 'India',
            board: dbSchool.board || 'CBSE',
            est: dbSchool.est_year || '1995',
            size: dbSchool.campus_size || '10 Acres',
            logoLetter: dbSchool.logo_letter || dbSchool.name.charAt(0).toUpperCase(),
            logoUrl: dbSchool.logo_url || '',
            coverUrl: dbSchool.cover_url || '',
            colorClass: dbSchool.color_class || 'color-1',
            about: description,
            achievements: schoolAchievements,
            highlights: schoolHighlights,
            admissionText: "No active admissions at the moment.",
            verificationBadge: dbSchool.verification_badge || 'none',
            address: dbSchool.address || '',
            contactEmail: dbSchool.contact_email || '',
            website: dbSchool.website || '',
            contactPhone: dbSchool.contact_phone || '',
            adminUserId: dbSchool.admin_user_id || null
          };
          
          // Fetch Followers count from DB
          try {
            const { count: countVal, error: countError } = await supabase
              .from('follows')
              .select('*', { count: 'exact', head: true })
              .eq('following_school_id', dbSchool.id);
            if (!countError) {
              followersCount = countVal || 0;
            }
          } catch (followersErr) {
            console.warn('Error fetching followers count:', followersErr);
          }

          if (currentUser) {
            isSchoolAdmin = currentUser.id === dbSchool.admin_user_id;
            const userRole = await auth.getUserRole();
            isSuperAdmin = userRole === 'super_admin';
            
            if (isSchoolAdmin) {
              const editBtn = document.getElementById('btn-edit-school');
              if (editBtn) {
                editBtn.style.display = 'inline-flex';
                setupSchoolEditFeatures(dbSchool);
              }
            }

            // Check if currently following
            try {
              const { data: followData, error: followCheckError } = await supabase
                .from('follows')
                .select('*')
                .eq('follower_id', currentUser.id)
                .eq('following_school_id', dbSchool.id)
                .maybeSingle();
              if (!followCheckError && followData) {
                isFollowing = true;
              }
            } catch (err) {
              console.warn('Error checking follow status:', err);
            }
          }
          
          // Load admissions data
          const { data: dbAdmissions } = await supabase.from('admissions').select('*').eq('school_id', dbSchool.id).eq('status', 'open').maybeSingle();
          if (dbAdmissions) {
            currentProfile.admissionText = `Admissions Open: Registration for ${dbAdmissions.classes_open} is open until ${dbAdmissions.last_date}.`;
          }
          
          // Load events data
          const { data: dbEvents } = await supabase.from('events').select('*').eq('school_id', dbSchool.id);
          if (dbEvents && dbEvents.length > 0) {
            opportunities.length = 0;
            dbEvents.forEach(e => {
              opportunities.push({
                id: e.id,
                school: dbSchool.name,
                title: e.title,
                category: e.category || 'competitions',
                date: e.event_date || '',
                venue: e.venue || '',
                tag: e.tag || 'Opportunity',
                registrations: e.registrations || '0 Registered',
                location: dbSchool.city || 'India',
                logoLetter: e.logo_letter || '🎉',
                bannerUrl: e.banner_url || ''
              });
            });
          }
          
          loadedFromDB = true;
        }
      } catch (err) {
        console.warn('Error loading school profile from Supabase, using fallback:', err);
      }
    }
    
    if (!loadedFromDB) {
      const idx = parseInt(schoolId, 10) || 1;
      currentProfile = schoolProfiles[idx] || schoolProfiles[1];
      if (currentProfile) {
        currentProfile.id = String(idx);
      }
      // For mock schools, still resolve isSuperAdmin if user is logged in
      if (currentUser && auth && !isSuperAdmin) {
        try {
          const userRole = await auth.getUserRole();
          isSuperAdmin = userRole === 'super_admin';
        } catch (roleErr) {
          console.warn('Could not resolve user role for mock school:', roleErr);
        }
      }
    }
    
    populateProfilePage();
  }

  /* --- Load Profile Page Content Dynamically --- */
  function populateProfilePage() {
    console.log('[school-profile v2.0] populateProfilePage | isSchoolAdmin:', isSchoolAdmin, '| isSuperAdmin:', isSuperAdmin, '| currentUser:', currentUser?.id || 'guest');
    // Banner & Logo
    const banner = document.getElementById('profile-banner-bg');
    const logo = document.getElementById('profile-logo');
    
    if (banner) {
      if (currentProfile.coverUrl) {
        banner.className = 'profile-banner';
        banner.style.backgroundImage = `url('${currentProfile.coverUrl}')`;
        banner.style.display = 'block';
      } else {
        banner.className = `profile-banner ${currentProfile.colorClass}`;
        banner.style.backgroundImage = '';
        banner.style.display = 'none';
      }
    }
    if (logo) {
      if (currentProfile.logoUrl) {
        logo.style.backgroundImage = `url('${currentProfile.logoUrl}')`;
        logo.style.backgroundSize = 'cover';
        logo.style.backgroundPosition = 'center';
        logo.style.border = '4px solid var(--white)';
        logo.textContent = '';
      } else {
        logo.style.backgroundImage = '';
        logo.textContent = currentProfile.logoLetter;
      }
    }

    // Name & Badges
    const nameHeading = document.getElementById('profile-school-name');
    const boardBadge = document.getElementById('profile-board-badge');
    const locationText = document.getElementById('profile-location-text');
    
    if (nameHeading) {
      let badgeHtml = '';
      if (currentProfile.verificationBadge === 'blue') {
        badgeHtml = `
          <svg class="verified-badge verified-badge-lg" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Partner School" style="display:inline-block; vertical-align:middle; margin-left:8px;">
            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
            <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
          </svg>`;
      } else if (currentProfile.verificationBadge === 'gold') {
        badgeHtml = `
          <svg class="verified-badge verified-badge-lg gold" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Gold Partner School" style="display:inline-block; vertical-align:middle; margin-left:8px;">
            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
            <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
          </svg>`;
      }

      nameHeading.innerHTML = `
        ${currentProfile.name}
        ${badgeHtml}
      `;
    }
    if (boardBadge) {
      boardBadge.textContent = `${currentProfile.board} Affiliated`;
    }
    if (locationText) {
      locationText.textContent = `${currentProfile.city}, India`;
    }

    // About panel details
    const aboutPara = document.getElementById('about-intro-para');
    const metaEst = document.getElementById('meta-est');
    const metaBoard = document.getElementById('meta-board');
    const metaSize = document.getElementById('meta-size');
    
    if (aboutPara) {
      aboutPara.textContent = currentProfile.about;
    }
    if (metaEst) {
      metaEst.textContent = currentProfile.est;
    }
    if (metaBoard) {
      metaBoard.textContent = currentProfile.board;
    }
    if (metaSize) {
      metaSize.textContent = currentProfile.size || '10 Acres';
    }

    // Populate Contact Details card
    const contactCard = document.getElementById('contact-info-card');
    const contactList = document.getElementById('contact-meta-list');
    
    if (contactCard && contactList) {
      let contactHtml = '';
      let hasContactInfo = false;

      if (currentProfile.contactEmail) {
        hasContactInfo = true;
        contactHtml += `
          <li style="display: flex; align-items: flex-start; gap: 10px; font-size: 0.9rem;">
            <span style="color: var(--primary); font-size: 1.1rem; width: 20px; text-align: center; line-height: 1;">✉️</span>
            <div style="flex: 1; min-width: 0; word-break: break-all;">
              <strong style="display: block; font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 2px;">Official Email</strong>
              <a href="mailto:${currentProfile.contactEmail}" style="color: var(--primary); font-weight: 500; text-decoration: none; word-break: break-all;">${currentProfile.contactEmail}</a>
            </div>
          </li>
        `;
      }

      if (currentProfile.website) {
        hasContactInfo = true;
        let cleanUrl = currentProfile.website;
        if (!/^https?:\/\//i.test(cleanUrl)) {
          cleanUrl = 'https://' + cleanUrl;
        }
        let displayUrl = currentProfile.website.replace(/^(https?:\/\/)?(www\.)?/i, '');
        contactHtml += `
          <li style="display: flex; align-items: flex-start; gap: 10px; font-size: 0.9rem;">
            <span style="color: var(--primary); font-size: 1.1rem; width: 20px; text-align: center; line-height: 1;">🔗</span>
            <div style="flex: 1; min-width: 0; word-break: break-all;">
              <strong style="display: block; font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 2px;">Website</strong>
              <a href="${cleanUrl}" target="_blank" style="color: var(--primary); font-weight: 500; text-decoration: none; word-break: break-all;">${displayUrl}</a>
            </div>
          </li>
        `;
      }

      if (currentProfile.contactPhone) {
        hasContactInfo = true;
        contactHtml += `
          <li style="display: flex; align-items: flex-start; gap: 10px; font-size: 0.9rem;">
            <span style="color: var(--primary); font-size: 1.1rem; width: 20px; text-align: center; line-height: 1;">📞</span>
            <div style="flex: 1; min-width: 0;">
              <strong style="display: block; font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 2px;">Phone Number</strong>
              <span style="color: var(--text-main); font-weight: 500;">${currentProfile.contactPhone}</span>
            </div>
          </li>
        `;
      }

      if (currentProfile.address || currentProfile.city || currentProfile.state) {
        hasContactInfo = true;
        let fullAddress = currentProfile.address || '';
        let cityState = [currentProfile.city, currentProfile.state].filter(Boolean).join(', ');
        let displayAddress = [fullAddress, cityState].filter(Boolean).join(', ') || 'Address not listed';

        contactHtml += `
          <li style="display: flex; align-items: flex-start; gap: 10px; font-size: 0.9rem;">
            <span style="color: var(--primary); font-size: 1.1rem; width: 20px; text-align: center; line-height: 1;">📍</span>
            <div style="flex: 1;">
              <strong style="display: block; font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 2px;">Address</strong>
              <span style="color: var(--text-main); font-weight: 500; line-height: 1.4;">${displayAddress}</span>
            </div>
          </li>
        `;
      }

      if (hasContactInfo) {
        contactList.innerHTML = contactHtml;
        contactCard.style.display = 'block';
      } else {
        contactCard.style.display = 'none';
      }
    }

    // Admissions status box text & Apply Now button
    const statusBox = document.getElementById('admission-status-box');
    const applyBtn = document.getElementById('btn-profile-apply-admission');
    if (statusBox) {
      statusBox.textContent = currentProfile.admissionText;
    }
    if (applyBtn) {
      const showApply = currentProfile.admissionText && !currentProfile.admissionText.toLowerCase().includes('no active admission');
      if (showApply) {
        applyBtn.href = `apply-admission.html?school_id=${currentProfile.id}`;
        applyBtn.style.display = 'inline-flex';
      } else {
        applyBtn.style.display = 'none';
      }
    }

    // Achievements Timeline loading
    const timeline = document.getElementById('achievements-timeline-box');
    if (timeline) {
      timeline.innerHTML = '';
      currentProfile.achievements.forEach(ach => {
        const item = document.createElement('div');
        item.className = 'achievement-item';
        item.innerHTML = `
          <div class="achievement-dot">🏆</div>
          <h4 class="achievement-title">${ach.title}</h4>
          <div class="achievement-meta">${ach.year} • National Level Award</div>
          <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 20px;">
            ${ach.desc}
          </p>
        `;
        timeline.appendChild(item);
      });
    }

    // Highlights list loading
    const highlightsList = document.getElementById('profile-highlights-list');
    if (highlightsList) {
      highlightsList.innerHTML = '';
      const hls = currentProfile.highlights || [];
      if (hls.length === 0) {
        highlightsList.innerHTML = '<li style="list-style:none; color:var(--text-muted);">No infrastructure highlights specified yet.</li>';
      } else {
        hls.forEach(hl => {
          const li = document.createElement('li');
          li.textContent = hl;
          highlightsList.appendChild(li);
        });
      }
    }

    // School Events tab loading
    const eventsGrid = document.getElementById('profile-events-grid');
    if (eventsGrid) {
      eventsGrid.innerHTML = '';
      // Filter global opportunities matching current school name
      const schoolEvents = opportunities.filter(op => op.school.toLowerCase().includes(currentProfile.name.toLowerCase()) || currentProfile.name.toLowerCase().includes(op.school.toLowerCase()));

      if (schoolEvents.length === 0) {
        eventsGrid.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; background-color: var(--light-bg); border-radius: var(--radius-md);">
            <p style="color: var(--text-muted);">No active events are currently scheduled at this school. Check back later.</p>
          </div>
        `;
      } else {
        schoolEvents.forEach(item => {
          const card = document.createElement('div');
          card.className = 'event-card';
          card.innerHTML = `
            <div class="event-card-header">
              <div class="event-card-logo">${item.logoLetter}</div>
              <div class="event-card-school-info">
                <span class="event-card-school-name">${item.school}</span>
                <span class="event-card-school-location">${item.location}</span>
              </div>
            </div>
            <div class="event-card-body">
              <span class="badge badge-primary event-card-type">${item.tag}</span>
              <h3 class="event-card-title">${item.title}</h3>
              <div class="event-meta-list">
                <div class="event-meta-item">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M9 1v2h6V1h2v2h4a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4V1h2zm11 9H4v10h16V10zm-2-5H4v3h16V5zm-6 7.5h5v5h-5v-5z"/>
                  </svg>
                  <span>${item.date}</span>
                </div>
              </div>
            </div>
            <div class="event-card-footer">
              <div class="event-card-registrations">
                <span class="registrations-count">${item.registrations}</span>
                <span class="registrations-label">Registrations</span>
              </div>
              <button class="btn btn-secondary btn-register-action" style="padding: 8px 16px; font-size: 0.85rem;" data-title="${item.title}">Register</button>
            </div>
          `;
          eventsGrid.appendChild(card);
        });

        // Rebind dynamically loaded event register actions
        eventsGrid.querySelectorAll('.btn-register-action').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const title = e.currentTarget.getAttribute('data-title');
            openRegistrationModal(`Register for: ${title}`);
          });
        });
      }
    }

    // Update Followers count text
    const followersEl = document.getElementById('profile-followers-count');
    if (followersEl) {
      followersEl.textContent = `${followersCount} follower${followersCount !== 1 ? 's' : ''}`;
    }
    const followersStatVal = document.getElementById('profile-followers-count-stat');
    if (followersStatVal) {
      followersStatVal.textContent = followersCount;
    }

    // Determine if current user is an owner or super admin
    const isOwnerOrAdmin = isSchoolAdmin || isSuperAdmin;

    // Update Follow Button: hide for owners & super admins
    const followBtn = document.getElementById('btn-follow-school');
    if (followBtn) {
      if (!isOwnerOrAdmin) {
        followBtn.style.display = 'inline-flex';
        updateSchoolFollowButtonState(followBtn, isFollowing);
        // If it's a fallback school, disable following database actions
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(currentProfile.id)) {
          setupSchoolFollowButton(currentProfile.id, isFollowing, followersCount, currentUser);
        } else {
          // Mock follow button toggle without DB persistence
          followBtn.onclick = () => {
            isFollowing = !isFollowing;
            updateSchoolFollowButtonState(followBtn, isFollowing);
            followersCount += isFollowing ? 1 : -1;
            if (followersEl) {
              followersEl.textContent = `${followersCount} follower${followersCount !== 1 ? 's' : ''}`;
            }
            if (followersStatVal) {
              followersStatVal.textContent = followersCount;
            }
            showToast(isFollowing ? 'Mock followed successfully!' : 'Mock unfollowed successfully!');
          };
        }
      } else {
        followBtn.style.display = 'none';
      }
    }

    // Update Contact School Button: hide for owners & super admins
    const contactBtn = document.getElementById('btn-contact-school');
    if (contactBtn) {
      if (!isOwnerOrAdmin) {
        contactBtn.style.display = 'inline-flex';
        setupContactSchoolButton(currentProfile);
      } else {
        contactBtn.style.display = 'none';
      }
    }

    // Show School Management row for owners & super admins
    const adminActionsRow = document.getElementById('profile-admin-actions');
    if (adminActionsRow) {
      adminActionsRow.style.display = isOwnerOrAdmin ? 'flex' : 'none';
    }
  }

  /* --- Check Join School State --- */
  function checkJoinState() {
    const joinBtn = document.getElementById('btn-join-school');
    if (!joinBtn) return;

    // Owners and super admins should never see the Join button
    if (isSchoolAdmin || isSuperAdmin) {
      joinBtn.style.display = 'none';
      return;
    }

    // For real DB schools, check membership via Supabase
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!currentProfile || !uuidRegex.test(currentProfile.id) || !currentUser) {
      // Guest or mock school — show Join button
      joinBtn.style.display = 'inline-flex';
      joinBtn.addEventListener('click', () => {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
      });
      return;
    }

    // Async check: is this user already a member of this school?
    const supabase = window.CampusLink && window.CampusLink.supabase;
    if (!supabase) {
      joinBtn.style.display = 'inline-flex';
      return;
    }

    supabase
      .from('school_members')
      .select('id')
      .eq('school_id', currentProfile.id)
      .eq('user_id', currentUser.id)
      .maybeSingle()
      .then(({ data: memberData, error: memberErr }) => {
        if (memberErr) {
          console.warn('Error checking school membership:', memberErr);
          joinBtn.style.display = 'inline-flex';
          return;
        }
        if (memberData) {
          // Already a member
          joinBtn.textContent = 'Joined ✓';
          joinBtn.disabled = true;
          joinBtn.style.display = 'inline-flex';
          joinBtn.style.opacity = '0.6';
          joinBtn.style.cursor = 'default';
        } else {
          joinBtn.style.display = 'inline-flex';
          joinBtn.addEventListener('click', () => {
            openRegistrationModal('Join ' + (currentProfile.name || 'School'));
          });
        }
      });
  }

  // Populate dynamic elements
  loadSchoolProfile().then(() => {
    checkJoinState();
    loadSchoolMembers();
    loadAndRenderSchoolPosts();
    loadAndRenderSchoolEvents();
    setupStatsClickHandlers();
  });

  /* --- Tab Navigation Logic --- */
  const tabButtons = document.querySelectorAll('.profile-tab-btn');
  const tabPanels = document.querySelectorAll('.profile-tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active states
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      // Activate clicked
      btn.classList.add('active');
      const tabTarget = btn.getAttribute('data-tab');
      const activePanel = document.getElementById(`panel-${tabTarget}`);
      if (activePanel) {
        activePanel.classList.add('active');
      }
    });
  });

  /* --- Onboarding Modal Logic --- */
  const modalOverlay = document.getElementById('registration-modal');
  const modalClose = document.getElementById('modal-close');
  const formSteps = document.querySelectorAll('.form-step');
  const nextStepBtns = document.querySelectorAll('.btn-next');
  const prevStepBtns = document.querySelectorAll('.btn-prev');
  const regForm = document.getElementById('school-registration-form');
  const successScreen = document.getElementById('success-screen');
  const modalContextTitle = document.getElementById('modal-context-title');

  let currentStep = 0;

  function openRegistrationModal(context = "Create Free School Account") {
    if (!modalOverlay) return;
    modalContextTitle.textContent = context;
    modalOverlay.classList.add('active');
    body.style.overflow = 'hidden';
    
    currentStep = 0;
    showStep(0);
    regForm.style.display = 'block';
    successScreen.classList.remove('active');
    regForm.reset();
  }

  function closeRegistrationModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('active');
    body.style.overflow = 'auto';
  }

  function showStep(stepIndex) {
    formSteps.forEach((step, idx) => {
      if (idx === stepIndex) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });
    currentStep = stepIndex;
  }

  // Trigger modal from primary/secondary buttons in header
  const headerTriggers = document.querySelectorAll('header .btn-modal-trigger, .mobile-only .btn-modal-trigger');
  headerTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const actionText = e.currentTarget.textContent.trim().toLowerCase();
      
      if (actionText.includes('register school') || actionText.includes('get started') || actionText.includes('join')) {
        window.location.href = 'login.html#register';
        return;
      }
      if (actionText.includes('login') || actionText.includes('sign in')) {
        window.location.href = 'login.html';
        return;
      }
      
      openRegistrationModal('Join CampusLink School Network');
    });
  });

  // Bind generic modal triggers
  const triggers = document.querySelectorAll('.btn-modal-trigger');
  triggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      if (e.currentTarget.closest('header') || e.currentTarget.closest('.mobile-only')) return;
      e.preventDefault();
      const actionText = e.currentTarget.textContent.trim().toLowerCase();
      let context = 'Join CampusLink School Network';
      
      if (actionText.includes('login') || actionText.includes('sign in')) {
        window.location.href = 'login.html';
        return;
      } else if (actionText.includes('inquire') || actionText.includes('callback')) {
        context = `Inquiry: ${currentProfile.name}`;
      }
      
      openRegistrationModal(context);
    });
  });

  // Join button logic
  const joinBtn = document.getElementById('btn-join-school');
  const auth = window.CampusLink && window.CampusLink.auth;
  const supabase = window.CampusLink && window.CampusLink.supabase;

  async function checkJoinState() {
    if (!joinBtn || !auth || !supabase || !currentProfile) return;

    const session = await auth.getSession();
    if (!session || !session.user) {
      // Not logged in — show default "Join School" state
      styleNotJoinedState();
      return;
    }

    try {
      const profile = await auth.getProfile(session.user.id);
      if (profile && profile.school_id === currentProfile.id) {
        styleJoinedState();
      } else {
        styleNotJoinedState();
      }
    } catch (err) {
      console.warn('Error checking joined state:', err);
    }
  }

  function styleJoinedState() {
    if (!joinBtn) return;
    joinBtn.textContent = 'Joined ✓';
    joinBtn.style.color = 'var(--white)';
    joinBtn.style.backgroundColor = 'var(--primary)';
    joinBtn.style.borderColor = 'var(--primary)';
    joinBtn.classList.remove('btn-secondary');
    joinBtn.classList.add('btn-primary');
  }

  function styleNotJoinedState() {
    if (!joinBtn) return;
    joinBtn.textContent = 'Join School';
    joinBtn.style.color = 'var(--primary)';
    joinBtn.style.backgroundColor = 'transparent';
    joinBtn.style.borderColor = 'rgba(0, 102, 200, 0.3)';
    joinBtn.classList.remove('btn-primary');
    joinBtn.classList.add('btn-secondary');
  }

  if (joinBtn) {
    joinBtn.addEventListener('click', async () => {
      if (!auth || !supabase) return;

      const session = await auth.getSession();
      if (!session || !session.user) {
        // Not logged in — redirect to login page
        window.location.href = 'login.html';
        return;
      }

      try {
        const profile = await auth.getProfile(session.user.id);
        const isJoined = profile && profile.school_id === currentProfile.id;

        if (isJoined) {
          if (confirm(`Are you sure you want to leave ${currentProfile.name}?`)) {
            const { error } = await supabase
              .from('profiles')
              .update({ school_id: null })
              .eq('id', session.user.id);

            if (error) throw error;
            
            styleNotJoinedState();
            alert(`You have left ${currentProfile.name}.`);
          }
        } else {
          const { error } = await supabase
            .from('profiles')
            .update({ school_id: currentProfile.id })
            .eq('id', session.user.id);

          if (error) throw error;

          styleJoinedState();
          alert(`You have successfully joined ${currentProfile.name}!`);
        }
      } catch (err) {
        console.error('Failed to update school join state:', err);
        alert('Failed to update join state: ' + err.message);
      }
    });
  }

  if (modalClose) {
    modalClose.addEventListener('click', closeRegistrationModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeRegistrationModal();
    });
  }

  nextStepBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const currentFields = formSteps[currentStep].querySelectorAll('input, select');
      let isValid = true;
      currentFields.forEach(field => {
        if (field.hasAttribute('required') && !field.value.trim()) {
          isValid = false;
          field.style.borderColor = 'red';
          setTimeout(() => field.style.borderColor = '', 2000);
        }
      });

      // Ensure loading overlay is shown when loading profile data
showLoading();

if (isValid && currentStep < formSteps.length - 1) {
        showStep(currentStep + 1);
      }
    });
  });

  prevStepBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentStep > 0) {
        showStep(currentStep - 1);
      }
    });
  });

  if (regForm) {
    regForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const schoolName = document.getElementById('school-name').value;
      const adminName = document.getElementById('admin-name').value;

      const successTitle = successScreen.querySelector('h3');
      const successDesc = successScreen.querySelector('p');

      if (modalContextTitle.textContent.includes('Inquiry:') || modalContextTitle.textContent.includes('Register for:')) {
        successTitle.textContent = "Query Submitted!";
        successDesc.textContent = `Thank you, ${adminName}. Your request has been logged successfully and forwarded to the administrator.`;
      } else {
        successTitle.textContent = "School Registered successfully!";
        successDesc.textContent = `Welcome ${schoolName}! We've sent a verification email to the representative to activate your administrator dashboard.`;
      }

      regForm.style.display = 'none';
      successScreen.classList.add('active');
      
      setTimeout(() => {
        closeRegistrationModal();
      }, 3500);
    });
  }

  /* --- Newsletter subscription feedback --- */
  const newsletterForm = document.querySelector('.newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = newsletterForm.querySelector('input');
      const email = input.value.trim();
      if (email) {
        const originalBtnText = newsletterForm.querySelector('button').textContent;
        newsletterForm.querySelector('button').textContent = "Subscribed!";
        newsletterForm.querySelector('button').disabled = true;
        input.value = '';
        input.disabled = true;
        
        setTimeout(() => {
          newsletterForm.querySelector('button').textContent = originalBtnText;
          newsletterForm.querySelector('button').disabled = false;
          input.disabled = false;
        }, 3000);
      }
    });
  }

  // --- School Profile Edit Features ---
  function showLoading() {
  const overlay = document.getElementById('loader-overlay');
  if (overlay) overlay.classList.remove('hidden');
}

function hideLoading() {
  const overlay = document.getElementById('loader-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function showToast(message, type = 'success') {
    let activeContainer = document.getElementById('toast-container');
  // Ensure loading overlay is hidden after any toast (optional)
  hideLoading();
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

  async function setupSchoolEditFeatures(dbSchool) {
    const editBtn = document.getElementById('btn-edit-school');
    const modal = document.getElementById('edit-school-modal');
    const closeBtn = document.getElementById('edit-school-close');
    const cancelBtn = document.getElementById('edit-school-cancel');
    const form = document.getElementById('edit-school-form');

    if (!editBtn || !modal) return;

    // Secure load-time check
    const auth = window.CampusLink && window.CampusLink.auth;
    if (!auth) {
      editBtn.style.display = 'none';
      return;
    }
    try {
      const session = await auth.getSession();
      if (!session || !session.user) {
        editBtn.style.display = 'none';
        return;
      }
      const userRole = await auth.getUserRole();
      const isSuperAdmin = userRole === 'super_admin';
      const isSchoolOwner = session.user.id === dbSchool.admin_user_id;
      if (!isSchoolOwner) {
        editBtn.style.display = 'none';
        return;
      }
    } catch (err) {
      console.warn('Error verifying permissions on edit setup:', err);
      editBtn.style.display = 'none';
      return;
    }

    let tempAchievements = [];
    let tempHighlights = [];
    let tempLogoUrl = dbSchool.logo_url || '';
    let tempCoverUrl = dbSchool.cover_url || '';

    function renderEditAchievements() {
      const listEl = document.getElementById('sch-achievements-editable-list');
      if (!listEl) return;
      listEl.innerHTML = '';
      tempAchievements.forEach((ach, index) => {
        const li = document.createElement('li');
        li.className = 'editable-list-item';
        li.innerHTML = `
          <div style="flex-grow: 1;">
            <strong>${ach.year}</strong> - ${ach.title}
            <p style="font-size:0.75rem; color:var(--text-muted); margin:0; font-weight:400;">${ach.desc}</p>
          </div>
          <button type="button" class="btn-remove-list-item" data-index="${index}">&times;</button>
        `;
        listEl.appendChild(li);
      });

      // Bind delete buttons
      listEl.querySelectorAll('.btn-remove-list-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
          tempAchievements.splice(idx, 1);
          renderEditAchievements();
        });
      });
    }

    function renderEditHighlights() {
      const listEl = document.getElementById('sch-highlights-editable-list');
      if (!listEl) return;
      listEl.innerHTML = '';
      tempHighlights.forEach((hl, index) => {
        const li = document.createElement('li');
        li.className = 'editable-list-item';
        li.innerHTML = `
          <div style="flex-grow: 1; font-weight:600;">${hl}</div>
          <button type="button" class="btn-remove-list-item" data-index="${index}">&times;</button>
        `;
        listEl.appendChild(li);
      });

      // Bind delete buttons
      listEl.querySelectorAll('.btn-remove-list-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
          tempHighlights.splice(idx, 1);
          renderEditHighlights();
        });
      });
    }

    // Helper to position active indicator
    const updateTabIndicator = (activeBtn) => {
      if (!activeBtn) return;
      const tabsContainer = activeBtn.parentElement;
      if (!tabsContainer) return;
      let indicator = tabsContainer.querySelector('.tab-indicator');
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'tab-indicator';
        tabsContainer.appendChild(indicator);
      }
      indicator.style.width = `${activeBtn.offsetWidth}px`;
      indicator.style.left = `${activeBtn.offsetLeft}px`;
    };

    // Helper to update wizard navigation buttons
    const updateWizardButtons = (activeTabId) => {
      const prevBtn = document.getElementById('edit-school-prev');
      const cancelBtn = document.getElementById('edit-school-cancel');
      const nextBtn = document.getElementById('edit-school-next');
      const saveBtn = document.getElementById('edit-school-save');

      if (!prevBtn || !cancelBtn || !nextBtn || !saveBtn) return;

      if (activeTabId === 'tab-sch-basic') {
        prevBtn.style.display = 'none';
        cancelBtn.style.display = 'inline-flex';
        nextBtn.style.display = 'inline-flex';
        saveBtn.style.display = 'none';
      } else if (activeTabId === 'tab-sch-highlights') {
        prevBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        saveBtn.style.display = 'inline-flex';
      } else {
        prevBtn.style.display = 'inline-flex';
        cancelBtn.style.display = 'none';
        nextBtn.style.display = 'inline-flex';
        saveBtn.style.display = 'none';
      }
    };

    // Setup tab switching inside modal
    const modalTabButtons = modal.querySelectorAll('.modal-tabs .tab-btn');
    const modalTabPanes = modal.querySelectorAll('.tab-pane');

    modalTabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        modalTabButtons.forEach(b => b.classList.remove('active'));
        modalTabPanes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const tabTarget = btn.getAttribute('data-tab');
        const activePane = document.getElementById(tabTarget);
        if (activePane) {
          activePane.classList.add('active');
        }

        // Center active tab horizontally & slide animated indicator
        updateTabIndicator(btn);
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center' });

        // Update navigation button visibilities
        updateWizardButtons(tabTarget);
      });
    });

    // Previous / Next button wizard navigation
    const prevBtnEl = document.getElementById('edit-school-prev');
    const nextBtnEl = document.getElementById('edit-school-next');
    const tabOrder = ['tab-sch-basic', 'tab-sch-contact', 'tab-sch-achievements', 'tab-sch-highlights'];

    if (nextBtnEl) {
      nextBtnEl.addEventListener('click', (e) => {
        e.preventDefault();
        const activeBtn = modal.querySelector('.modal-tabs .tab-btn.active');
        if (!activeBtn) return;
        const currentTab = activeBtn.getAttribute('data-tab');
        const currentIndex = tabOrder.indexOf(currentTab);
        if (currentIndex !== -1 && currentIndex < tabOrder.length - 1) {
          const nextTabId = tabOrder[currentIndex + 1];
          const nextTabBtn = modal.querySelector(`.modal-tabs .tab-btn[data-tab="${nextTabId}"]`);
          if (nextTabBtn) nextTabBtn.click();
        }
      });
    }

    if (prevBtnEl) {
      prevBtnEl.addEventListener('click', (e) => {
        e.preventDefault();
        const activeBtn = modal.querySelector('.modal-tabs .tab-btn.active');
        if (!activeBtn) return;
        const currentTab = activeBtn.getAttribute('data-tab');
        const currentIndex = tabOrder.indexOf(currentTab);
        if (currentIndex > 0) {
          const prevTabId = tabOrder[currentIndex - 1];
          const prevTabBtn = modal.querySelector(`.modal-tabs .tab-btn[data-tab="${prevTabId}"]`);
          if (prevTabBtn) prevTabBtn.click();
        }
      });
    }

    // Keep active indicator in place when window is resized
    window.addEventListener('resize', () => {
      const activeBtn = modal.querySelector('.modal-tabs .tab-btn.active');
      if (activeBtn) {
        updateTabIndicator(activeBtn);
      }
    });

    // Add achievement
    const addAchBtn = document.getElementById('btn-add-sch-ach');
    if (addAchBtn) {
      addAchBtn.addEventListener('click', () => {
        const yearInput = document.getElementById('edit-sch-ach-year');
        const titleInput = document.getElementById('edit-sch-ach-title');
        const descInput = document.getElementById('edit-sch-ach-desc');

        const year = yearInput.value.trim();
        const title = titleInput.value.trim();
        const desc = descInput.value.trim();

        if (!year || !title) {
          alert('Please enter at least Year and Title for the achievement.');
          return;
        }

        tempAchievements.push({ year, title, desc });
        renderEditAchievements();

        // Clear inputs
        yearInput.value = '';
        titleInput.value = '';
        descInput.value = '';
      });
    }

    // Add highlight
    const addHlBtn = document.getElementById('btn-add-sch-hl');
    if (addHlBtn) {
      addHlBtn.addEventListener('click', () => {
        const hlInput = document.getElementById('edit-sch-hl-input');
        const val = hlInput.value.trim();
        if (!val) return;

        tempHighlights.push(val);
        renderEditHighlights();

        hlInput.value = '';
      });
    }

    // Open modal
    editBtn.addEventListener('click', () => {
      document.getElementById('edit-sch-name').value = dbSchool.name || '';
      document.getElementById('edit-sch-board').value = dbSchool.board || '';
      document.getElementById('edit-sch-city').value = dbSchool.city || '';
      document.getElementById('edit-sch-address').value = dbSchool.address || '';
      document.getElementById('edit-sch-email').value = dbSchool.contact_email || '';
      document.getElementById('edit-sch-website').value = dbSchool.website || '';
      document.getElementById('edit-sch-phone').value = dbSchool.contact_phone || '';
      document.getElementById('edit-sch-est').value = dbSchool.est_year || '';
      document.getElementById('edit-sch-size').value = dbSchool.campus_size || '';
      document.getElementById('edit-sch-logo-letter').value = dbSchool.logo_letter || '';
      document.getElementById('edit-sch-color-class').value = dbSchool.color_class || 'color-1';
      document.getElementById('edit-sch-about').value = currentProfile.about || '';

      // Initialize lists
      tempAchievements = [...(currentProfile.achievements || [])];
      tempHighlights = [...(currentProfile.highlights || [])];
      renderEditAchievements();
      renderEditHighlights();

      // Initialize logo/cover previews
      tempLogoUrl = dbSchool.logo_url || '';
      tempCoverUrl = dbSchool.cover_url || '';

      const editLogoPreview = document.getElementById('edit-sch-logo-preview');
      if (editLogoPreview) {
        if (tempLogoUrl) {
          editLogoPreview.style.backgroundImage = `url('${tempLogoUrl}')`;
          editLogoPreview.textContent = '';
        } else {
          editLogoPreview.style.backgroundImage = '';
          editLogoPreview.textContent = dbSchool.logo_letter || (dbSchool.name ? dbSchool.name.charAt(0).toUpperCase() : '');
        }
      }

      const editCoverPreview = document.getElementById('edit-sch-cover-preview');
      if (editCoverPreview) {
        if (tempCoverUrl) {
          editCoverPreview.style.backgroundImage = `url('${tempCoverUrl}')`;
          editCoverPreview.textContent = '';
        } else {
          editCoverPreview.style.backgroundImage = '';
          editCoverPreview.textContent = 'No Banner';
        }
      }

      modal.classList.add('active');
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';

      // Reset active tab to Basic
      const basicTabBtn = modal.querySelector('.modal-tabs .tab-btn[data-tab="tab-sch-basic"]');
      if (basicTabBtn) {
        basicTabBtn.click();
        // Wait for rendering to settle to accurately position indicator
        setTimeout(() => {
          updateTabIndicator(basicTabBtn);
        }, 150);
      }
    });

    // Upload Change Listeners for logo and cover in edit modal
    const uploadLogoInput = document.getElementById('edit-sch-upload-logo');
    const uploadCoverInput = document.getElementById('edit-sch-upload-cover');

    if (uploadLogoInput) {
      uploadLogoInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
          showToast('Logo image must be smaller than 2MB.', 'error');
          uploadLogoInput.value = '';
          return;
        }

        showToast('Uploading logo...', 'info');

        const supabase = window.CampusLink && window.CampusLink.supabase;
        console.log('[UPLOAD-DEBUG] Profile modal logo upload started. supabase:', !!supabase, '| dbSchool.id:', dbSchool.id);
        if (supabase && dbSchool.id && dbSchool.id.length > 8) {
          try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${dbSchool.id}/${fileName}`;
            console.log('[UPLOAD-DEBUG] Profile logo filePath:', filePath);

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('school-logos')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
              });

            console.log('[UPLOAD-DEBUG] Profile logo storage upload result:', { uploadData, uploadError });
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('school-logos').getPublicUrl(filePath);
            const publicUrl = urlData?.publicUrl;
            console.log('[UPLOAD-DEBUG] Profile logo publicUrl:', publicUrl);

            if (!publicUrl) throw new Error('Failed to get public URL');

            tempLogoUrl = publicUrl;
            
            const editLogoPreview = document.getElementById('edit-sch-logo-preview');
            if (editLogoPreview) {
              editLogoPreview.style.backgroundImage = `url('${publicUrl}')`;
              editLogoPreview.textContent = '';
            }

            showToast('Logo uploaded successfully!');
          } catch (err) {
            console.error('Logo upload failed:', err);
            showToast('Failed to upload logo: ' + err.message, 'error');
          }
        } else {
          // Local fallback (base64)
          const reader = new FileReader();
          reader.onload = (event) => {
            tempLogoUrl = event.target.result;
            const editLogoPreview = document.getElementById('edit-sch-logo-preview');
            if (editLogoPreview) {
              editLogoPreview.style.backgroundImage = `url('${tempLogoUrl}')`;
              editLogoPreview.textContent = '';
            }
            showToast('Logo updated (local state)!');
          };
          reader.readAsDataURL(file);
        }
        uploadLogoInput.value = '';
      });
    }

    if (uploadCoverInput) {
      uploadCoverInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
          showToast('Cover photo must be smaller than 2MB.', 'error');
          uploadCoverInput.value = '';
          return;
        }

        showToast('Uploading cover banner...', 'info');

        const supabase = window.CampusLink && window.CampusLink.supabase;
        console.log('[UPLOAD-DEBUG] Profile modal cover upload started. supabase:', !!supabase, '| dbSchool.id:', dbSchool.id);
        if (supabase && dbSchool.id && dbSchool.id.length > 8) {
          try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${dbSchool.id}/${fileName}`;
            console.log('[UPLOAD-DEBUG] Profile cover filePath:', filePath);

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('school-covers')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
              });

            console.log('[UPLOAD-DEBUG] Profile cover storage upload result:', { uploadData, uploadError });
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('school-covers').getPublicUrl(filePath);
            const publicUrl = urlData?.publicUrl;
            console.log('[UPLOAD-DEBUG] Profile cover publicUrl:', publicUrl);

            if (!publicUrl) throw new Error('Failed to get public URL');

            tempCoverUrl = publicUrl;

            const editCoverPreview = document.getElementById('edit-sch-cover-preview');
            if (editCoverPreview) {
              editCoverPreview.style.backgroundImage = `url('${publicUrl}')`;
              editCoverPreview.textContent = '';
            }

            showToast('Cover banner uploaded successfully!');
          } catch (err) {
            console.error('Cover upload failed:', err);
            showToast('Failed to upload cover banner: ' + err.message, 'error');
          }
        } else {
          // Local fallback (base64)
          const reader = new FileReader();
          reader.onload = (event) => {
            tempCoverUrl = event.target.result;
            const editCoverPreview = document.getElementById('edit-sch-cover-preview');
            if (editCoverPreview) {
              editCoverPreview.style.backgroundImage = `url('${tempCoverUrl}')`;
              editCoverPreview.textContent = '';
            }
            showToast('Cover banner updated (local state)!');
          };
          reader.readAsDataURL(file);
        }
        uploadCoverInput.value = '';
      });
    }

    // Close modal
    const closeModal = () => {
      modal.classList.remove('active');
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Submit form
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const supabase = window.CampusLink && window.CampusLink.supabase;
        const auth = window.CampusLink && window.CampusLink.auth;

        if (!supabase || !auth) {
          showToast('Security Error: System config is missing.', 'error');
          return;
        }

        try {
          const session = await auth.getSession();
          if (!session || !session.user) {
            showToast('Access Denied: You must be logged in.', 'error');
            return;
          }
          const userRole = await auth.getUserRole();
          const isSuperAdmin = userRole === 'super_admin';
          const isSchoolOwner = session.user.id === dbSchool.admin_user_id;
          if (!isSuperAdmin && !isSchoolOwner) {
            showToast('Access Denied: You do not have permission to edit this school.', 'error');
            return;
          }
        } catch (err) {
          console.error('Permission check failed on save:', err);
          showToast('Security Error: Permission check failed.', 'error');
          return;
        }
        
        showToast('Saving school details...', 'info');

        const aboutJSON = JSON.stringify({
          description: document.getElementById('edit-sch-about').value.trim(),
          achievements: tempAchievements,
          highlights: tempHighlights
        });

        const updateData = {
          name: document.getElementById('edit-sch-name').value.trim(),
          board: document.getElementById('edit-sch-board').value,
          city: document.getElementById('edit-sch-city').value.trim(),
          address: document.getElementById('edit-sch-address').value.trim() || null,
          contact_email: document.getElementById('edit-sch-email').value.trim() || null,
          website: document.getElementById('edit-sch-website').value.trim() || null,
          contact_phone: document.getElementById('edit-sch-phone').value.trim() || null,
          est_year: document.getElementById('edit-sch-est').value.trim() || null,
          campus_size: document.getElementById('edit-sch-size').value.trim() || null,
          logo_letter: document.getElementById('edit-sch-logo-letter').value.trim().toUpperCase() || null,
          color_class: document.getElementById('edit-sch-color-class').value,
          logo_url: tempLogoUrl || null,
          cover_url: tempCoverUrl || null,
          about: aboutJSON
        };

        console.log('[UPLOAD-DEBUG] Form submit updateData:', updateData);
        console.log('[UPLOAD-DEBUG] tempLogoUrl:', tempLogoUrl, '| tempCoverUrl:', tempCoverUrl);

        try {
          const { data: saveData, error } = await supabase
            .from('schools')
            .update(updateData)
            .eq('id', dbSchool.id)
            .select();

          console.log('[UPLOAD-DEBUG] Form submit DB result:', { saveData, error, schoolId: dbSchool.id });
          if (error) throw error;

          showToast('School profile updated successfully!');
          setTimeout(() => {
            window.location.reload();
          }, 1500);

        } catch (err) {
          console.error('Error updating school:', err);
          showToast(err.message || 'Failed to save school details', 'error');
        }
      });
    }
  }

  // --- School Follow Functions ---
  function updateSchoolFollowButtonState(btn, following) {
    if (following) {
      btn.className = 'btn btn-following';
      btn.style.backgroundColor = 'transparent';
      btn.style.color = 'var(--primary)';
      btn.style.border = '2px solid var(--primary)';
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <span>Following</span>
      `;
    } else {
      btn.className = 'btn btn-follow btn-secondary';
      btn.style.backgroundColor = 'transparent';
      btn.style.color = 'var(--primary)';
      btn.style.border = '1px solid rgba(0, 102, 200, 0.3)';
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span>Follow</span>
      `;
    }
  }

  function setupSchoolFollowButton(schoolId, initialFollowing, initialCount, currentUser) {
    const followBtn = document.getElementById('btn-follow-school');
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

      if (!supabase) return;

      newFollowBtn.disabled = true;

      try {
        if (isFollowing) {
          // Unfollow
          const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', currentUser.id)
            .eq('following_school_id', schoolId);

          if (error) throw error;

          isFollowing = false;
          count = Math.max(0, count - 1);
          showToast('Unfollowed school');
        } else {
          // Follow
          const { error } = await supabase
            .from('follows')
            .insert({
              follower_id: currentUser.id,
              following_school_id: schoolId,
              follow_type: 'school'
            });

          if (error) throw error;

          isFollowing = true;
          count++;
          showToast('Following school');

          // Trigger notification to school representative / admin
          if (window.CampusLink && window.CampusLink.notifications) {
            try {
              const { data: schoolData } = await supabase
                .from('schools')
                .select('admin_user_id, name')
                .eq('id', schoolId)
                .maybeSingle();

              if (schoolData && schoolData.admin_user_id) {
                // Fetch current user name
                const { data: followerProfile } = await supabase
                  .from('profiles')
                  .select('full_name')
                  .eq('id', currentUser.id)
                  .single();
                const actorName = followerProfile?.full_name || 'Someone';
                await window.CampusLink.notifications.createNotification(
                  schoolData.admin_user_id,
                  'follow',
                  `${actorName} started following ${schoolData.name}`,
                  `Click to view their profile`,
                  `profile.html?id=${currentUser.id}`,
                  currentUser.id
                );
              }
            } catch (notifErr) {
              console.warn('Error sending school follow notification:', notifErr);
            }
          }
        }

        updateSchoolFollowButtonState(newFollowBtn, isFollowing);
        const followersEl = document.getElementById('profile-followers-count');
        if (followersEl) {
          followersEl.textContent = `${count} follower${count !== 1 ? 's' : ''}`;
        }
        const followersStatVal = document.getElementById('profile-followers-count-stat');
        if (followersStatVal) {
          followersStatVal.textContent = count;
        }
      } catch (err) {
        console.error('Follow school toggle failed:', err);
        showToast(err.message || 'Failed to update follow state', 'error');
      } finally {
        newFollowBtn.disabled = false;
      }
    });
  }

  function setupContactSchoolButton(dbSchool) {
    const contactBtn = document.getElementById('btn-contact-school');
    const modal = document.getElementById('contact-school-modal');
    const form = document.getElementById('contact-school-form');
    
    if (!contactBtn || !modal || !form) return;

    // Clone button and form to remove any previously attached listeners
    const newContactBtn = contactBtn.cloneNode(true);
    contactBtn.parentNode.replaceChild(newContactBtn, contactBtn);

    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    const closeBtn = document.getElementById('contact-modal-close');

    const closeModal = () => {
      modal.classList.remove('active');
      document.body.style.overflow = 'auto';
      newForm.reset();
    };

    newContactBtn.addEventListener('click', () => {
      if (!currentUser) {
        window.location.href = 'login.html';
        return;
      }
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });

    if (closeBtn) {
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
      newCloseBtn.addEventListener('click', closeModal);
    }
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Handle form submission
    newForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const inquiryType = document.getElementById('contact-inquiry-type').value;
      const messageText = document.getElementById('contact-message').value.trim();

      if (!inquiryType || !messageText) return;

      const submitBtn = document.getElementById('btn-submit-contact');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending Inquiry...';

      try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(dbSchool.id)) {
          closeModal();
          alert(`Demo Mode: Contact inquiry simulated successfully for fallback school "${dbSchool.name}"!`);
          return;
        }

        const sb = window.CampusLink.supabase;
        const auth = window.CampusLink.auth;
        
        let conversationStatus = 'pending';
        if (auth && currentUser) {
          try {
            const profile = await auth.getProfile(currentUser.id);
            if (profile && profile.school_id === dbSchool.id) {
              conversationStatus = 'accepted';
            }
          } catch (profileErr) {
            console.warn('Error verifying school membership for inquiry:', profileErr);
          }
        }
        
        // 1. Create a conversation
        const { data: conv, error: convError } = await sb
          .from('conversations')
          .insert({
            status: conversationStatus,
            initiator_id: currentUser.id,
            school_id: dbSchool.id,
            inquiry_type: inquiryType
          })
          .select()
          .single();

        if (convError) throw convError;

        // 2. Add participants: the initiator (user) and the school
        const { error: partError } = await sb
          .from('conversation_participants')
          .insert([
            { conversation_id: conv.id, user_id: currentUser.id },
            { conversation_id: conv.id, school_id: dbSchool.id }
          ]);

        if (partError) throw partError;

        // 3. Send the message
        const { error: msgError } = await sb
          .from('messages')
          .insert({
            conversation_id: conv.id,
            sender_id: currentUser.id,
            receiver_school_id: dbSchool.id,
            message: `[Inquiry: ${inquiryType.toUpperCase()}] ${messageText}`,
            read_status: false
          });

        if (msgError) throw msgError;

        console.log('Message created successfully (School Profile Inquiry):', {
          conversation_id: conv.id,
          sender_id: currentUser.id,
          receiver_school_id: dbSchool.id,
          message: `[Inquiry: ${inquiryType.toUpperCase()}] ${messageText}`
        });

        // 4. Trigger notification to school representative / admin
        if (window.CampusLink && window.CampusLink.notifications) {
          try {
            const recipientId = dbSchool.adminUserId;
            if (recipientId) {
              // Fetch current user name
              const { data: senderProfile } = await sb
                .from('profiles')
                .select('full_name')
                .eq('id', currentUser.id)
                .single();
              const senderName = senderProfile?.full_name || 'Someone';

              await window.CampusLink.notifications.createNotification(
                recipientId,
                'message',
                `New message from ${senderName}`,
                `[Inquiry: ${inquiryType.toUpperCase()}] ${messageText}`.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
                `messaging.html?chat_id=${conv.id}`,
                currentUser.id
              );
            }
          } catch (notifErr) {
            console.warn('Error sending contact school notification:', notifErr);
          }
        }

        closeModal();
        showToast('Inquiry sent successfully!');
        document.getElementById('contact-message').value = '';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message Request';
      } catch (err) {
        console.error('Failed to send inquiry:', err);
        alert('Failed to send inquiry: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message Request';
      }
    });
  }

  // --- Load and Render School Community Members ---
  async function loadSchoolMembers() {
    const supabase = window.CampusLink && window.CampusLink.supabase;
    if (!supabase || !currentProfile || !currentProfile.id) return;

    const cmGridFaculty = document.getElementById('cm-grid-faculty');
    const cmGridAlumni = document.getElementById('cm-grid-alumni');
    const cmGridStaff = document.getElementById('cm-grid-staff');
    const cmGridStudents = document.getElementById('cm-grid-students');
    
    const cmSecFaculty = document.getElementById('cm-section-faculty');
    const cmSecAlumni = document.getElementById('cm-section-alumni');
    const cmSecStaff = document.getElementById('cm-section-staff');
    const cmSecStudents = document.getElementById('cm-section-students');
    const cmEmptyState = document.getElementById('cm-empty-state');

    // Prevent querying for non-UUID mock school IDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(currentProfile.id)) {
      if (cmEmptyState) cmEmptyState.style.display = 'block';
      if (cmSecFaculty) cmSecFaculty.style.display = 'none';
      if (cmSecAlumni) cmSecAlumni.style.display = 'none';
      if (cmSecStaff) cmSecStaff.style.display = 'none';
      if (cmSecStudents) cmSecStudents.style.display = 'none';
      return;
    }

    try {
      const { data: members, error } = await supabase
        .from('school_members')
        .select(`
          id, role, assigned_at,
          user:profiles!user_id(id, full_name, avatar_url, user_type, class, is_verified)
        `)
        .eq('school_id', currentProfile.id)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      // Group by roles
      const facultyList = [];
      const alumniList = [];
      const staffList = [];
      const studentList = [];

      (members || []).forEach(m => {
        if (['teacher', 'faculty', 'counselor'].includes(m.role)) {
          facultyList.push(m);
        } else if (m.role === 'alumni') {
          alumniList.push(m);
        } else if (m.role === 'staff') {
          staffList.push(m);
        } else if (m.role === 'student') {
          studentList.push(m);
        }
      });

      const totalMembers = (members || []).length;

      // Render function
      const renderGrid = (gridEl, sectionEl, list) => {
        if (!gridEl) return;
        gridEl.innerHTML = '';
        if (list.length > 0) {
          if (sectionEl) sectionEl.style.display = 'block';
          list.forEach(m => {
            const u = m.user || {};
            const name = u.full_name || 'Unknown';
            const initial = name.charAt(0).toUpperCase();
            
            const avatarHtml = u.avatar_url
              ? `<div class="cm-member-avatar" style="background-image: url(${u.avatar_url});"></div>`
              : `<div class="cm-member-avatar-placeholder">${initial}</div>`;
            
            const verifiedBadgeHtml = u.is_verified ? `
              <svg class="verified-badge verified-badge-sm" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Profile" style="width: 14px; height: 14px; color: var(--primary); display: inline-block; vertical-align: middle; margin-left: 4px;">
                <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
                <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
              </svg>
            ` : '';

            let subtext = '';
            if (m.role === 'student') {
              subtext = u.class ? `Class ${u.class}` : 'Student';
            } else if (m.role === 'alumni') {
              subtext = u.class ? `Graduated Class of ${u.class}` : 'Alumni';
            } else {
              subtext = m.role;
            }

            const card = document.createElement('div');
            card.className = 'cm-member-card';
            card.innerHTML = `
              ${avatarHtml}
              <div class="cm-member-name">
                <span>${name}</span>
                ${verifiedBadgeHtml}
              </div>
              <div class="cm-member-title">${subtext}</div>
              <a href="profile.html?id=${u.id}" class="cm-member-btn">View Profile</a>
            `;
            gridEl.appendChild(card);
          });
        } else {
          if (sectionEl) sectionEl.style.display = 'none';
        }
      };

      renderGrid(cmGridFaculty, cmSecFaculty, facultyList);
      renderGrid(cmGridAlumni, cmSecAlumni, alumniList);
      renderGrid(cmGridStaff, cmSecStaff, staffList);
      renderGrid(cmGridStudents, cmSecStudents, studentList);

      if (totalMembers > 0) {
        if (cmEmptyState) cmEmptyState.style.display = 'none';
      } else {
        if (cmEmptyState) cmEmptyState.style.display = 'block';
      }
    } catch (err) {
      console.error('Failed to load school members:', err);
      if (cmEmptyState) {
        cmEmptyState.style.display = 'block';
        cmEmptyState.innerHTML = `
          <p style="font-size: 1.1rem; color: #EF4444;">Error loading community members.</p>
          <p style="font-size: 0.88rem;">${err.message || 'Please try again later.'}</p>
        `;
      }
    }
  }

  // --- Start of School Profile Redesign Additions ---

  const mockPosts = [
    {
      id: "mock-post-1",
      school_id: "1",
      content: "Delhi Public School, RK Puram is proud to announce its 100% board results. Special congratulations to our toppers who scored a perfect 99.8% in Science and Commerce streams! #AcademicExcellence",
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
    },
    {
      id: "mock-post-2",
      school_id: "1",
      content: "Register now for the National Science & Robotics Fest 2026! Over 50 schools across the country have already registered. Exciting cash prizes and internship opportunities await the winners.",
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
    },
    {
      id: "mock-post-3",
      school_id: "2",
      content: "Our St. Xavier's High School Football Team (U-17 Boys) has won the Mumbai Inter-School Football League! Congratulations to the team and their coach for the stellar performance. Go Xavierites!",
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "mock-post-4",
      school_id: "3",
      content: "Bishop Cotton School is hosting its annual Inter-School Debate Championship this weekend in Shimla. Wishing all our speakers the best of luck!",
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const mockFollowersList = [
    {
      id: "mock-follower-1",
      follower_id: "m-user-1",
      profiles: {
        id: "m-user-1",
        full_name: "Aarav Sharma",
        avatar_url: null,
        user_type: "student",
        is_verified: false
      }
    },
    {
      id: "mock-follower-2",
      follower_id: "m-user-2",
      profiles: {
        id: "m-user-2",
        full_name: "Priya Patel",
        avatar_url: null,
        user_type: "parent",
        is_verified: false
      }
    },
    {
      id: "mock-follower-3",
      follower_id: "m-user-3",
      profiles: {
        id: "m-user-3",
        full_name: "Rajesh Kumar",
        avatar_url: null,
        user_type: "teacher",
        is_verified: true
      }
    },
    {
      id: "mock-follower-4",
      follower_id: "m-user-4",
      profiles: {
        id: "m-user-4",
        full_name: "Sneha Reddy",
        avatar_url: null,
        user_type: "student",
        is_verified: false
      }
    }
  ];

  function classifyEventDate(dateStr) {
    if (!dateStr) return 'upcoming';
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let parsedDate = null;
    let endDate = null;

    const rangeRegex = /([A-Za-z]+)\s+(\d+)\s*-\s*(\d+),\s*(\d{4})/;
    const singleRegex = /([A-Za-z]+)\s+(\d+),\s*(\d{4})/;
    const isoRegex = /(\d{4})-(\d{2})-(\d{2})/;

    let match;
    if ((match = dateStr.match(rangeRegex))) {
      const month = match[1];
      const startDay = parseInt(match[2], 10);
      const endDay = parseInt(match[3], 10);
      const year = match[4];
      parsedDate = new Date(`${month} ${startDay}, ${year}`);
      endDate = new Date(`${month} ${endDay}, ${year}`);
    } else if ((match = dateStr.match(singleRegex))) {
      const month = match[1];
      const day = match[2];
      const year = match[3];
      parsedDate = new Date(`${month} ${day}, ${year}`);
      endDate = parsedDate;
    } else if ((match = dateStr.match(isoRegex))) {
      parsedDate = new Date(dateStr);
      endDate = parsedDate;
    } else {
      parsedDate = new Date(dateStr);
      endDate = parsedDate;
    }

    if (isNaN(parsedDate.getTime())) {
      const beforeMatch = dateStr.match(/before\s+([A-Za-z]+\s+\d+,\s*\d{4})/i);
      if (beforeMatch) {
        const d = new Date(beforeMatch[1]);
        if (!isNaN(d.getTime())) {
          return d < now ? 'past' : 'upcoming';
        }
      }
      return 'upcoming';
    }

    endDate.setHours(23, 59, 59, 999);
    parsedDate.setHours(0, 0, 0, 0);

    if (now > endDate) {
      return 'past';
    } else if (now < parsedDate) {
      return 'upcoming';
    } else {
      return 'ongoing';
    }
  }

  // --- Format Content with Clickable Mention Links ---
  function formatContentWithMentions(content, mentions) {
    if (!content) return '';
    let formatted = content;
    if (!mentions || mentions.length === 0) return formatted;

    const sortedMentions = [...mentions].sort((a, b) => {
      const nameA = a.profiles?.full_name || a.schools?.name || '';
      const nameB = b.profiles?.full_name || b.schools?.name || '';
      return nameB.length - nameA.length;
    });

    sortedMentions.forEach(mention => {
      const name = mention.profiles?.full_name || mention.schools?.name;
      if (!name) return;

      const mentionText = `@${name}`;
      const url = mention.mentioned_user_id 
        ? `profile.html?id=${mention.mentioned_user_id}` 
        : `school-profile.html?id=${mention.mentioned_school_id}`;

      const escapedMentionText = mentionText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedMentionText, 'g');
      formatted = formatted.replace(regex, `<a href="${url}" class="mention-link" style="color: #0066c8; font-weight: 700; text-decoration: none;">@${name}</a>`);
    });

    return formatted;
  }

  async function loadAndRenderSchoolPosts() {
    const postsListContainer = document.getElementById('school-activity-posts');
    if (!postsListContainer) return;

    postsListContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.95rem; padding: 20px 0;">Loading updates...</p>';

    const supabase = window.CampusLink && window.CampusLink.supabase;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let posts = [];

    if (supabase && uuidRegex.test(currentProfile.id)) {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            id,
            content,
            created_at,
            user_id,
            post_type,
            topic,
            mentions (
              id,
              post_id,
              comment_id,
              mentioned_user_id,
              mentioned_school_id,
              mentioned_by,
              profiles:profiles!mentions_mentioned_user_id_fkey (
                id,
                full_name
              ),
              schools:schools!mentions_mentioned_school_id_fkey (
                id,
                name
              )
            )
          `)
          .eq('school_id', currentProfile.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        posts = data || [];
      } catch (err) {
        console.warn('Error fetching school posts from database:', err);
      }
    }

    if (posts.length === 0) {
      posts = mockPosts.filter(p => p.school_id === currentProfile.id);
      if (posts.length === 0) {
        posts = [
          {
            id: `mock-generic-1`,
            content: `Welcome to the official CampusLink profile page of ${currentProfile.name}. We look forward to connecting with students, alumni, and parents!`,
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: `mock-generic-2`,
            content: `Stay tuned for official updates, event announcements, and admissions information from our administration.`,
            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
      }
    }

    postsListContainer.innerHTML = '';
    
    const postsCountEl = document.getElementById('profile-posts-count');
    if (postsCountEl) {
      postsCountEl.textContent = posts.length;
    }

    posts.forEach(post => {
      const card = document.createElement('div');
      card.className = 'feed-post-card';
      card.style.cssText = `
        background-color: var(--white);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        padding: 20px;
        margin-bottom: 16px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      `;
      
      const name = currentProfile.name;
      const initial = currentProfile.logoLetter || name.charAt(0).toUpperCase();
      
      const avatarHtml = currentProfile.logoUrl
        ? `<div style="width: 48px; height: 48px; border-radius: 50%; background-image: url('${currentProfile.logoUrl}'); background-size: cover; background-position: center; border: 1px solid var(--border-color);"></div>`
        : `<div style="width: 48px; height: 48px; border-radius: 50%; background-color: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem; border: 1px solid var(--border-color);">${initial}</div>`;
      
      let badgeHtml = '';
      if (currentProfile.verificationBadge === 'blue') {
        badgeHtml = `
          <svg class="verified-badge verified-badge-sm" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Partner School" style="width: 14px; height: 14px; color: var(--primary); display: inline-block; vertical-align: middle; margin-left: 4px;">
            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
            <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
          </svg>`;
      } else if (currentProfile.verificationBadge === 'gold') {
        badgeHtml = `
          <svg class="verified-badge verified-badge-sm gold" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Gold Partner School" style="width: 14px; height: 14px; color: var(--primary); display: inline-block; vertical-align: middle; margin-left: 4px;">
            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239(1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
            <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
          </svg>`;
      }

      const relativeTime = formatRelativeTime(post.created_at);

      card.innerHTML = `
        <div style="display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px;">
          ${avatarHtml}
          <div>
            <div style="font-weight: 700; color: var(--dark-bg); font-size: 0.95rem; display: flex; align-items: center; gap: 4px;">
              <span>${name}</span>
              ${badgeHtml}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
              <span>Official Update</span> • <span>${relativeTime}</span>
            </div>
          </div>
        </div>
        <div class="post-text-content" style="font-size: 0.95rem; color: var(--text-main); line-height: 1.5; white-space: pre-wrap; word-break: break-word;">${formatContentWithMentions(post.content, post.mentions)}</div>
      `;

      postsListContainer.appendChild(card);
    });
  }

  function formatRelativeTime(dateStr) {
    if (!dateStr) return 'Just now';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 30) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function loadAndRenderSchoolEvents() {
    const upcomingList = document.getElementById('events-upcoming-list');
    const ongoingList = document.getElementById('events-ongoing-list');
    const pastList = document.getElementById('events-past-list');

    const upcomingGroup = document.getElementById('events-upcoming-group');
    const ongoingGroup = document.getElementById('events-ongoing-group');
    const pastGroup = document.getElementById('events-past-group');

    if (!upcomingList || !ongoingList || !pastList) return;

    upcomingList.innerHTML = '';
    ongoingList.innerHTML = '';
    pastList.innerHTML = '';

    const schoolEvents = opportunities.filter(op => 
      op.school.toLowerCase().includes(currentProfile.name.toLowerCase()) || 
      currentProfile.name.toLowerCase().includes(op.school.toLowerCase())
    );

    const eventsCountEl = document.getElementById('profile-events-count');
    if (eventsCountEl) {
      eventsCountEl.textContent = schoolEvents.length;
    }

    if (schoolEvents.length === 0) {
      upcomingList.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; background-color: var(--light-bg); border-radius: var(--radius-md); width: 100%;">
          <p style="color: var(--text-muted);">No active events are currently scheduled at this school. Check back later.</p>
        </div>
      `;
      if (upcomingGroup) upcomingGroup.style.display = 'block';
      if (ongoingGroup) ongoingGroup.style.display = 'none';
      if (pastGroup) pastGroup.style.display = 'none';
      return;
    }

    let upcomingCount = 0;
    let ongoingCount = 0;
    let pastCount = 0;

    schoolEvents.forEach(item => {
      const status = classifyEventDate(item.date);
      
      const card = document.createElement('div');
      card.className = 'event-card-modern';
      card.innerHTML = `
        <div class="event-image-container" style="${item.bannerUrl ? `background-image: url('${item.bannerUrl}'); background-size: cover; background-position: center;` : ''}">
          ${!item.bannerUrl ? `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:2rem; background: linear-gradient(135deg, var(--primary), var(--primary-light)); color:white;">${item.logoLetter}</div>` : ''}
        </div>
        <div class="event-details">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%; gap:8px;">
            <div>
              <span class="status-badge ${status}">${status}</span>
              <h3 class="event-card-grid-title" style="margin-top:6px; font-size:1.1rem; font-weight:700; margin-bottom:0;">
                <a href="event-detail.html?id=${item.id || ''}" style="color:var(--dark-bg); text-decoration:none;">${item.title}</a>
              </h3>
            </div>
            <span class="badge badge-primary" style="margin:0; font-size:0.75rem;">${item.tag}</span>
          </div>
          <div style="display:flex; gap:16px; margin: 10px 0; font-size:0.85rem; color:var(--text-muted); flex-wrap:wrap;">
            <span style="display:flex; align-items:center; gap:4px;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M9 1v2h6V1h2v2h4a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4V1h2zm11 9H4v10h16V10zm-2-5H4v3h16V5zm-6 7.5h5v5h-5v-5z"/>
              </svg>
              <span>${item.date}</span>
            </span>
            ${item.venue ? `
            <span style="display:flex; align-items:center; gap:4px;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
              </svg>
              <span>${item.venue}</span>
            </span>` : ''}
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; width:100%; border-top:1px solid var(--border-color); padding-top:10px; margin-top:8px;">
            <div class="event-card-registrations">
              <span class="registrations-count" style="font-weight:700; color:var(--dark-bg); font-size:0.95rem;">${item.registrations}</span>
              <span class="registrations-label" style="font-size:0.8rem; color:var(--text-muted);">Registrations</span>
            </div>
            <button class="btn btn-secondary btn-register-action" style="padding: 6px 14px; font-size: 0.8rem;" data-title="${item.title}">Register</button>
          </div>
        </div>
      `;

      if (status === 'upcoming') {
        upcomingList.appendChild(card);
        upcomingCount++;
      } else if (status === 'ongoing') {
        ongoingList.appendChild(card);
        ongoingCount++;
      } else {
        pastList.appendChild(card);
        pastCount++;
      }
    });

    if (upcomingGroup) upcomingGroup.style.display = upcomingCount > 0 ? 'block' : 'none';
    if (ongoingGroup) ongoingGroup.style.display = ongoingCount > 0 ? 'block' : 'none';
    if (pastGroup) pastGroup.style.display = pastCount > 0 ? 'block' : 'none';

    if (upcomingCount === 0 && ongoingCount === 0 && pastCount === 0) {
      if (upcomingGroup) {
        upcomingGroup.style.display = 'block';
        upcomingList.innerHTML = `
          <div style="text-align: center; padding: 40px 20px; background-color: var(--light-bg); border-radius: var(--radius-md); width:100%;">
            <p style="color: var(--text-muted);">No active events are currently scheduled at this school. Check back later.</p>
          </div>
        `;
      }
    }

    document.querySelectorAll('.btn-register-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const title = e.currentTarget.getAttribute('data-title');
        openRegistrationModal(`Register for: ${title}`);
      });
    });
  }

  const followersModal = document.getElementById('followers-modal');
  const followersModalClose = document.getElementById('followers-modal-close');
  const followersListContainer = document.getElementById('followers-list-container');

  if (followersModalClose && followersModal) {
    followersModalClose.addEventListener('click', () => {
      followersModal.style.display = 'none';
    });
    followersModal.addEventListener('click', (e) => {
      if (e.target === followersModal) {
        followersModal.style.display = 'none';
      }
    });
  }

  async function openFollowersModal() {
    console.log('[DEBUG] openFollowersModal called, followersModal:', !!followersModal);
    if (followersModal) {
      followersModal.style.display = 'flex';
      await loadFollowersModal();
    }
  }

  async function loadFollowersModal() {
    if (!followersListContainer) return;
    followersListContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-size: 0.95rem; padding: 20px 0;">Loading followers...</p>';

    const supabase = window.CampusLink && window.CampusLink.supabase;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let followers = [];

    if (supabase && uuidRegex.test(currentProfile.id)) {
      try {
        const { data, error } = await supabase
          .from('follows')
          .select(`
            id,
            follower_id,
            profiles:profiles!follower_id (
              id,
              full_name,
              avatar_url,
              user_type,
              is_verified
            )
          `)
          .eq('following_school_id', currentProfile.id)
          .eq('follow_type', 'school');

        if (error) throw error;
        followers = data || [];
      } catch (err) {
        console.warn('Error fetching followers list:', err);
      }
    }

    if (followers.length === 0) {
      followers = mockFollowersList;
    }

    const subtitleEl = document.getElementById('followers-modal-subtitle');
    if (subtitleEl) {
      subtitleEl.textContent = `${followers.length} people follow this school`;
    }

    const followedUserIds = new Set();
    if (currentUser && supabase && followers.length > 0) {
      try {
        const followerIds = followers.map(f => f.profiles?.id).filter(Boolean);
        if (followerIds.length > 0) {
          const { data: followData } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', currentUser.id)
            .in('following_id', followerIds);
          if (followData) {
            followData.forEach(f => followedUserIds.add(f.following_id));
          }
        }
      } catch (err) {
        console.warn('Error checking user follows:', err);
      }
    }

    followersListContainer.innerHTML = '';
    
    followers.forEach(f => {
      const u = f.profiles || {};
      if (!u.id) return;

      const name = u.full_name || 'Anonymous User';
      const userType = u.user_type || 'Student';
      const initial = name.charAt(0).toUpperCase();

      const avatarHtml = u.avatar_url
        ? `<div style="width: 40px; height: 40px; border-radius: 50%; background-image: url('${u.avatar_url}'); background-size: cover; background-position: center; border: 1px solid var(--border-color); flex-shrink: 0;"></div>`
        : `<div style="width: 40px; height: 40px; border-radius: 50%; background-color: var(--light-bg); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700; border: 1px solid var(--border-color); flex-shrink: 0;">${initial}</div>`;

      let badgeHtml = '';
      if (u.is_verified) {
        badgeHtml = `
          <svg class="verified-badge verified-badge-sm" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" title="Verified Profile" style="width: 12px; height: 12px; color: var(--primary); display: inline-block; vertical-align: middle; margin-left: 2px;">
            <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239C1.266.296 1.903.164 1.903.164c.636-.132 1.22-.447 1.68-.907c.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246c.354-.54.551-1.17.569-1.816z" fill="currentColor"/>
            <path d="M9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#FFFFFF"/>
          </svg>`;
      }

      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border-radius: var(--radius-md);
        background-color: var(--light-bg);
        border: 1px solid var(--border-color);
        gap: 12px;
      `;

      const isFollowingUser = followedUserIds.has(u.id);
      const isSelf = currentUser && currentUser.id === u.id;
      let followBtnHtml = '';
      if (!isSelf) {
        followBtnHtml = `
          <button class="btn btn-sm btn-follow-user-toggle ${isFollowingUser ? 'following' : ''}" 
                  data-id="${u.id}" 
                  style="padding: 6px 12px; font-size: 0.8rem; min-width: 90px; height: 32px; border-radius: var(--radius-sm); border: none; font-weight: 600; cursor: pointer; transition: all 0.2s;
                         background-color: ${isFollowingUser ? '#E8EFFE' : 'var(--primary)'};
                         color: ${isFollowingUser ? 'var(--primary)' : 'var(--white)'};">
            ${isFollowingUser ? 'Following' : 'Follow'}
          </button>
        `;
      }

      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
          ${avatarHtml}
          <div style="min-width: 0;">
            <div style="font-weight: 700; color: var(--dark-bg); font-size: 0.9rem; display: flex; align-items: center; gap: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              <a href="profile.html?id=${u.id}" style="color: inherit; text-decoration: none;">${name}</a>
              ${badgeHtml}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: capitalize; margin-top: 2px;">${userType}</div>
          </div>
        </div>
        ${followBtnHtml}
      `;

      followersListContainer.appendChild(item);
    });

    followersListContainer.querySelectorAll('.btn-follow-user-toggle').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (!currentUser) {
          window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
          return;
        }

        const button = e.currentTarget;
        const targetUserId = button.getAttribute('data-id');
        button.disabled = true;

        const isFollowingUser = button.classList.contains('following');

        if (supabase && uuidRegex.test(targetUserId)) {
          try {
            if (isFollowingUser) {
              const { error } = await supabase
                .from('follows')
                .delete()
                .eq('follower_id', currentUser.id)
                .eq('following_id', targetUserId);
              if (error) throw error;
              
              button.classList.remove('following');
              button.style.backgroundColor = 'var(--primary)';
              button.style.color = 'var(--white)';
              button.textContent = 'Follow';
              showToast('Unfollowed user');
            } else {
              const { error } = await supabase
                .from('follows')
                .insert({
                  follower_id: currentUser.id,
                  following_id: targetUserId,
                  follow_type: 'user'
                });
              if (error) throw error;

              button.classList.add('following');
              button.style.backgroundColor = '#E8EFFE';
              button.style.color = 'var(--primary)';
              button.textContent = 'Following';
              showToast('Following user');
            }
          } catch (err) {
            console.error('Error toggling user follow:', err);
            showToast('Failed to update follow status: ' + err.message, 'error');
          } finally {
            button.disabled = false;
          }
        } else {
          const newFollowing = !isFollowingUser;
          if (newFollowing) {
            button.classList.add('following');
            button.style.backgroundColor = '#E8EFFE';
            button.style.color = 'var(--primary)';
            button.textContent = 'Following';
            showToast('Following user (mock)');
          } else {
            button.classList.remove('following');
            button.style.backgroundColor = 'var(--primary)';
            button.style.color = 'var(--white)';
            button.textContent = 'Follow';
            showToast('Unfollowed user (mock)');
          }
          button.disabled = false;
        }
      });
    });
  }

  function setupStatsClickHandlers() {
    console.log('[DEBUG] setupStatsClickHandlers called');
    const postsStat = document.getElementById('stat-posts');
    const eventsStat = document.getElementById('stat-events');
    const followersStat = document.getElementById('stat-followers');
    console.log('[DEBUG] stats elements:', { postsStat: !!postsStat, eventsStat: !!eventsStat, followersStat: !!followersStat });

    if (postsStat) {
      postsStat.addEventListener('click', () => {
        console.log('[DEBUG] postsStat clicked');
        const sectionActivity = document.getElementById('section-activity');
        if (sectionActivity) {
          sectionActivity.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    if (eventsStat) {
      eventsStat.addEventListener('click', () => {
        console.log('[DEBUG] eventsStat clicked');
        const btnEvents = document.querySelector('.profile-tab-btn[data-tab="events"]');
        if (btnEvents) {
          btnEvents.click();
        }
        const panelEvents = document.getElementById('panel-events');
        if (panelEvents) {
          panelEvents.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    if (followersStat) {
      followersStat.addEventListener('click', () => {
        console.log('[DEBUG] followersStat clicked');
        openFollowersModal();
      });
    }
  }

  // --- End of School Profile Redesign Additions ---
});
