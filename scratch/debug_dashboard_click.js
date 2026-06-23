const { chromium } = require('playwright');

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Listen for console logs
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  // Listen for page errors (uncaught exceptions)
  page.on('pageerror', err => {
    console.error(`[BROWSER UNCAUGHT EXCEPTION]:`, err);
  });

  console.log('Navigating to login...');
  await page.goto('http://localhost:3000/login.html');

  console.log('Logging in as owaissaifi019@gmail.com...');
  await page.fill('#email', 'owaissaifi019@gmail.com');
  await page.fill('#password', 'Owais@11');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(3000);

  console.log('Navigating to dashboard...');
  await page.goto('http://localhost:3000/dashboard.html');
  await page.waitForTimeout(3000);

  console.log('Switching to Community Members tab...');
  const tabLink = page.locator('.dashboard-nav-link[data-tab="community-members"]');
  if (await tabLink.isVisible()) {
    await tabLink.click();
    await page.waitForTimeout(1000);
    
    console.log('Checking Add Member button...');
    const addMemberBtn = page.locator('#btn-add-member');
    console.log('Add Member Button visible:', await addMemberBtn.isVisible());
    
    if (await addMemberBtn.isVisible()) {
      console.log('Clicking Add Member button...');
      await addMemberBtn.click();
      await page.waitForTimeout(2000);
      
      const modal = page.locator('#add-member-modal');
      console.log('Add Member Modal display style:', await modal.evaluate(el => window.getComputedStyle(el).display));
    }
  } else {
    console.log('Community Members tab link not visible!');
  }

  await browser.close();
  console.log('Done.');
}

run().catch(console.error);
