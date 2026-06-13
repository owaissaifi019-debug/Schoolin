const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error(`[BROWSER ERROR] ${err.message}`);
  });

  console.log('Navigating to login...');
  await page.goto('http://localhost:3000/login.html');

  console.log('Logging in as owaissaifi019@gmail.com...');
  await page.fill('#email', 'owaissaifi019@gmail.com');
  await page.fill('#password', 'Owais@11');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(3000);

  console.log('Navigating to messaging page with chat ID...');
  await page.goto('http://localhost:3000/messaging.html?chat_id=9a4f2ef2-6bc5-4719-bb86-c0a69fa646f7');

  await page.waitForTimeout(4000);

  console.log('Inspecting active chat viewport styling...');
  const chatActiveInterfaceVisible = await page.isVisible('#chat-active-interface');
  console.log('#chat-active-interface visible:', chatActiveInterfaceVisible);

  const inputPanelVisible = await page.isVisible('#chat-input-panel');
  console.log('#chat-input-panel visible:', inputPanelVisible);

  if (chatActiveInterfaceVisible) {
    const boundingBox = await page.locator('#chat-input-panel').boundingBox();
    console.log('#chat-input-panel bounding box:', boundingBox);
    
    const displayStyle = await page.evaluate(() => {
      const el = document.getElementById('chat-input-panel');
      return el ? window.getComputedStyle(el).display : 'el-not-found';
    });
    console.log('#chat-input-panel display style:', displayStyle);

    const activeInterfaceDisplay = await page.evaluate(() => {
      const el = document.getElementById('chat-active-interface');
      return el ? window.getComputedStyle(el).display : 'el-not-found';
    });
    console.log('#chat-active-interface display style:', activeInterfaceDisplay);
  }

  await browser.close();
}

main().catch(err => console.error('Script failed:', err));
