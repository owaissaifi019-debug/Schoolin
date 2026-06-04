const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Log all console messages
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });

  // Log all unhandled errors
  page.on('pageerror', err => {
    console.error(`[BROWSER ERROR] ${err.message}`);
  });

  console.log("Navigating to login...");
  await page.goto('http://localhost:3000/login.html');

  console.log("Filling login form...");
  await page.fill('#email', 'owaissaifi019@gmail.com');
  await page.fill('#password', 'Owais@11');
  
  console.log("Submitting login...");
  await page.click('button[type="submit"]');

  // Wait for navigation or loading state
  await page.waitForTimeout(3000);

  console.log("Navigating to profile page...");
  await page.goto('http://localhost:3000/profile.html?id=72ea700c-3e6a-4b30-b763-54212692994c');

  // Wait for loading to finish
  await page.waitForTimeout(3000);

  console.log("Checking Edit Profile button visibility...");
  const editBtnVisible = await page.isVisible('#edit-profile-btn');
  console.log("Edit Profile Button visible:", editBtnVisible);

  if (editBtnVisible) {
    console.log("Clicking Edit Profile...");
    await page.click('#edit-profile-btn');
    await page.waitForTimeout(1000);

    console.log("Inspecting School select options...");
    const options = await page.evaluate(() => {
      const select = document.getElementById('edit-school');
      return Array.from(select.options).map(o => ({ value: o.value, text: o.text }));
    });
    console.log("Select options found:", options);
  }

  await browser.close();
}

main().catch(err => {
  console.error("Script failed:", err);
});
