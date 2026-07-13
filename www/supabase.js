// supabase.js
// Supabase client initialization for CampusLink
// Uses the Supabase JS CDN loaded via <script> tag in HTML pages.

// ============================================================
// IMPORTANT: Replace these with your actual Supabase credentials
// ============================================================
const SUPABASE_URL = 'https://cfeeqgokzkzblddefhxn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZWVxZ29remt6YmxkZGVmaHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTM1NTIsImV4cCI6MjA5NjA4OTU1Mn0.vzeLfLLeOajdsUaE__jvs_VoxzbvmX0j7p3GVAa26lI';

// The global `supabase` namespace is provided by the CDN script
const _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Expose globally for other scripts
window.CampusLink = window.CampusLink || {};
window.CampusLink.supabase = _supabaseClient;

// Reusable security utilities for input validation & sanitization
window.CampusLink.security = {
  // Escape HTML tags to prevent XSS/HTML Injection
  escapeHTML: function(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  // Sanitize string (trim, normalize spaces, strip control characters)
  sanitizeString: function(str) {
    if (!str) return '';
    return String(str)
      .trim()
      .replace(/\s+/g, ' ') // Normalize repeated spaces
      .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, ''); // Strip control/hidden characters
  },

  // Validate Username format
  validateUsername: function(username) {
    if (!username) return 'Username is required.';
    if (username.length < 3 || username.length > 20) {
      return 'Username must be between 3 and 20 characters.';
    }
    const regex = /^[a-zA-Z0-9_\.]+$/;
    if (!regex.test(username)) {
      return 'Username can only contain letters, numbers, underscores, and periods.';
    }
    return null; // Valid
  },

  // Validate Email format
  validateEmail: function(email) {
    if (!email) return 'Email is required.';
    if (email.length > 255) return 'Email is too long.';
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) return 'Please enter a valid email address.';
    return null;
  },

  // Validate URL format
  validateURL: function(url) {
    if (!url) return null; // Optional
    try {
      new URL(url);
      return null;
    } catch (e) {
      return 'Please enter a valid URL (e.g. https://example.com).';
    }
  },

  // Validate Name length
  validateName: function(name) {
    if (!name) return 'Name is required.';
    const clean = name.trim();
    if (clean.length < 2 || clean.length > 50) {
      return 'Name must be between 2 and 50 characters.';
    }
    return null;
  },

  // Validate and sanitize image file uploads (MIME, Magic Bytes, Double extension, image decode)
  validateImageFile: function(file, maxSize = 2 * 1024 * 1024) {
    return new Promise((resolve) => {
      if (!file) {
        return resolve('No file selected.');
      }
      if (file.size === 0) {
        return resolve('Selected file is empty.');
      }
      if (file.size > maxSize) {
        const sizeMb = (maxSize / (1024 * 1024)).toFixed(0);
        return resolve(`File is too large. Maximum allowed size is ${sizeMb} MB.`);
      }

      // Check double extensions
      const name = file.name.toLowerCase();
      const segments = name.split('.');
      if (segments.length > 2) {
        // Look for any forbidden extensions in intermediate parts
        const forbiddenIntermediate = ['exe', 'php', 'js', 'html', 'htm', 'bat', 'cmd', 'sh', 'apk', 'jar', 'svg'];
        for (let i = 1; i < segments.length - 1; i++) {
          if (forbiddenIntermediate.includes(segments[i])) {
            return resolve('Double extensions or intermediate scripts are forbidden.');
          }
        }
      }

      // Check allowed final extension
      const ext = segments[segments.length - 1];
      const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
      if (!allowedExts.includes(ext)) {
        return resolve('Only JPG, JPEG, PNG, and WebP image extensions are allowed.');
      }

      // Validate MIME type
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimes.includes(file.type)) {
        return resolve('Invalid image file type.');
      }

      // Read Magic Bytes (First 12 bytes to check PDF, ZIP, RAR, EXE, and verify actual image signature)
      const reader = new FileReader();
      reader.onload = function(e) {
        const arr = new Uint8Array(e.target.result);
        if (arr.length < 4) {
          return resolve('Invalid or corrupted file structure.');
        }

        // Hex representations
        const header = Array.from(arr.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
        
        // 1. Check known executable/archive signatures to reject early
        const mzHeader = '4D5A'; // EXE/DLL (MZ)
        const zipHeader = '504B0304'; // ZIP
        const rarHeader = '52617221'; // RAR
        const pdfHeader = '25504446'; // PDF (%PDF)

        if (header.startsWith(mzHeader)) {
          return resolve('Executable files are forbidden.');
        }
        if (header === zipHeader) {
          return resolve('ZIP archives are forbidden.');
        }
        if (header === rarHeader) {
          return resolve('RAR archives are forbidden.');
        }
        if (header === pdfHeader) {
          return resolve('PDF files are forbidden.');
        }

        // 2. Validate image magic bytes
        const isPng = header === '89504E47';
        const isJpg = header.startsWith('FFD8FF');
        
        // WebP has "RIFF" at 0-4, and "WEBP" at 8-12
        let isWebp = false;
        if (header === '52494646' && arr.length >= 12) {
          const webpHeader = Array.from(arr.slice(8, 12)).map(b => String.fromCharCode(b)).join('');
          if (webpHeader === 'WEBP') {
            isWebp = true;
          }
        }

        if (!isPng && !isJpg && !isWebp) {
          return resolve('File signature verification failed. The file is not a valid JPG, PNG, or WebP image.');
        }

        // 3. Verify image decodability
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = function() {
          URL.revokeObjectURL(objectUrl);
          if (img.width === 0 || img.height === 0) {
            return resolve('Image appears to be corrupted or zero-dimensioned.');
          }
          resolve(null); // All checks passed!
        };
        img.onerror = function() {
          URL.revokeObjectURL(objectUrl);
          resolve('Failed to decode image. The file may be corrupted or malformed.');
        };
        img.src = objectUrl;
      };

      reader.onerror = function() {
        resolve('Failed to read file signature.');
      };
      reader.readAsArrayBuffer(file.slice(0, 12));
    });
  }
};

// Automatically detect and remove external debug JSON injection block from the UI/DOM
(function() {
  const removeDebugBlock = () => {
    const el = document.getElementById('cl-debug-block');
    if (el) {
      el.remove();
    }
  };
  removeDebugBlock();
  
  const observer = new MutationObserver((mutations) => {
    removeDebugBlock();
  });
  
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  
  document.addEventListener('DOMContentLoaded', removeDebugBlock);
  window.addEventListener('load', removeDebugBlock);
})();
