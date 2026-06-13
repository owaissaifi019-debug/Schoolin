const { chromium } = require('playwright');

async function run() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to http://localhost:3000/admin/index.html...');
  await page.goto('http://localhost:3000/admin/index.html');
  await page.waitForTimeout(3000);
  
  const children = await page.evaluate(() => {
    const main = document.querySelector('.dashboard-main-content');
    if (!main) return 'Main content container not found';
    
    return Array.from(main.childNodes).map(node => {
      return {
        nodeType: node.nodeType,
        nodeName: node.nodeName,
        className: node.className || '',
        id: node.id || '',
        textContent: node.textContent ? node.textContent.substring(0, 150) : '',
        outerHTML: node.nodeType === 1 ? node.outerHTML.substring(0, 300) : ''
      };
    });
  });
  
  console.log('Children of .dashboard-main-content at runtime:');
  console.log(JSON.stringify(children, null, 2));
  
  await browser.close();
}

run().catch(console.error);
