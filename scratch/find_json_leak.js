const { chromium } = require('playwright');

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Listen for console logs
  page.on('console', msg => {
    console.log(`[CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  console.log('Navigating to login page...');
  await page.goto('http://localhost:3000/login.html');
  await page.waitForTimeout(2000);
  
  console.log('Fetching body HTML...');
  const bodyHTML = await page.evaluate(() => document.body.innerHTML);
  
  console.log('Length of body HTML:', bodyHTML.length);
  
  // Let's print the first 2000 characters of bodyHTML, where the JSON might be prepended
  console.log('--- Top of Body HTML ---');
  console.log(bodyHTML.substring(0, 2000));
  console.log('------------------------');

  // Let's also check if it is prepended directly to the document element (outside body)
  const docHTML = await page.evaluate(() => document.documentElement.innerHTML);
  console.log('--- Top of Document HTML ---');
  console.log(docHTML.substring(0, 1000));
  console.log('----------------------------');

  await browser.close();
}

run().catch(console.error);
