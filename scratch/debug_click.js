const { chromium } = require('playwright');

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Listen for console logs
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
    if (msg.location()) {
      console.log(`  at ${msg.location().url}:${msg.location().lineNumber}`);
    }
  });

  // Listen for page errors (uncaught exceptions)
  page.on('pageerror', err => {
    console.error(`[BROWSER UNCAUGHT EXCEPTION]:`, err);
  });

  console.log('Navigating to school profile page...');
  await page.goto('http://localhost:3000/school-profile.html?id=1');
  
  await page.waitForTimeout(2000);
  
  console.log('Checking if Contact School button is visible...');
  const contactBtn = page.locator('#btn-contact-school');
  const visible = await contactBtn.isVisible();
  console.log(`Button visible: ${visible}`);
  
  if (visible) {
    console.log('Clicking Contact School button...');
    await contactBtn.click();
    await page.waitForTimeout(2000);
  } else {
    console.log('Button is not visible, HTML check:');
    const html = await page.evaluate(() => document.getElementById('profile-actions-area')?.innerHTML);
    console.log(html);
  }

  await browser.close();
  console.log('Done.');
}

run().catch(console.error);
