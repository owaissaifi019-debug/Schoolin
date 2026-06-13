const { chromium } = require('playwright');

async function main() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    if (msg.text().includes('CAMPUSLINK_RESULT')) {
      const location = msg.location();
      console.log(`[LOCATION] url: ${location.url}, line: ${location.lineNumber}, column: ${location.columnNumber}`);
    }
  });

  page.on('pageerror', err => {
    console.error(`[BROWSER ERROR] ${err.message}`);
  });

  console.log('Navigating to admin/index.html...');
  await page.goto('http://localhost:3000/admin/index.html');
  await page.waitForTimeout(2000);

  // Check if we can find the text on page initially
  let content = await page.textContent('body');
  console.log('Initial page content length:', content.length);
  console.log('Does initial content contain cl_keys?', content.includes('cl_keys'));

  // Let's scroll down and up
  console.log('Scrolling down...');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);

  console.log('Scrolling up...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);

  // Check content again
  content = await page.textContent('body');
  console.log('After scroll page content length:', content.length);
  console.log('Does content after scroll contain cl_keys?', content.includes('cl_keys'));

  // Get list of script tags
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script')).map(s => ({
      src: s.src,
      textContent: s.textContent.substring(0, 200)
    }));
  });
  console.log('Scripts loaded at runtime:', JSON.stringify(scripts, null, 2));

  // Let's see what is inside the body at the top or where it might have inserted the JSON
  const bodyHTML = await page.evaluate(() => document.body.innerHTML.substring(0, 1000));
  console.log('Body HTML start:', bodyHTML);

  await browser.close();
}

main().catch(err => console.error('Script failed:', err));
