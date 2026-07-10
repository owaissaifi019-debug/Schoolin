(async function() {
  try {
    console.log('[College Loader JS] Fetching dashboard.js logic...');
    const response = await fetch('dashboard.js');
    if (!response.ok) throw new Error('Failed to fetch dashboard.js template');
    
    let js = await response.text();
    
    // Replace the redirection guard logic
    js = js.replace(
      `if (school.institution_type && school.institution_type !== 'school') {
      window.location.href = 'college-dashboard.html';
      return;
    }`,
      `if (!school.institution_type || school.institution_type === 'school') {
      window.location.href = 'dashboard.html';
      return;
    }`
    );
    
    // Translate text terminology in messages and display elements
    js = js.replaceAll('School Admin Dashboard', 'College Admin Dashboard');
    js = js.replaceAll('School Profile Settings', 'College Profile Settings');
    js = js.replaceAll('School Representative', 'College Representative');
    js = js.replaceAll('School Admin', 'College Admin');
    js = js.replaceAll('School Partner', 'College Partner');
    js = js.replaceAll('School Profile', 'College Profile');
    js = js.replaceAll('My School', 'My College');
    js = js.replaceAll('Edit School', 'Edit College');
    js = js.replaceAll('No school associated with this administrator account.', 'No college associated with this administrator account.');
    js = js.replaceAll('Administrator account has no associated school record.', 'Administrator account has no associated college record.');
    js = js.replaceAll('Loading school...', 'Loading college...');
    js = js.replaceAll('Academic Year', 'Batch Year');
    js = js.replaceAll('Class &amp; Section', 'Program &amp; Section');
    js = js.replaceAll('Class & Section', 'Program & Section');
    
    // Execute translated code in page context
    const script = document.createElement('script');
    script.textContent = js;
    document.body.appendChild(script);
    
    console.log('[College Loader JS] Successfully mounted dashboard controller.');
  } catch (err) {
    console.error('[College Loader JS] Critical Mounting Error:', err);
  }
})();
