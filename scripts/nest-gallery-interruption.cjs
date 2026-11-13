const { chromium, expect } = require('@playwright/test');
(async () => {
  const { demoGoal } = await import('../src/nest/fixtures.js');
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  try {
    for (const width of [375, 390]) {
      const page = await browser.newPage({viewport:{width,height:844}});
      const errors=[]; page.on('pageerror',e=>errors.push(e.message));
      await require('./nest-api-mock.cjs').mockNestApi(page);
      await page.route('**/rest/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:r.request().url().includes('nest_preferences')?'null':r.request().headers().accept?.includes('vnd.pgrst.object')?JSON.stringify({id:'test-user',name:'Test User'}):'[]'}));
      await page.addInitScript(goal=>localStorage.setItem('nest.v2',JSON.stringify({goal:{...goal,intent:'Home'},selectedId:'home-1'})),demoGoal);
      await page.goto(process.env.NEST_URL || 'http://localhost:8086');
      await page.getByRole('button',{name:'Open Facebook menu'}).click();
      await page.getByRole('button',{name:'Nest',exact:true}).click();
      const card=page.getByRole('button',{name:'Home 1 of 5, $1,350 per month',exact:true});
      await expect(card).toBeVisible();
      // Interrupt a leftward spring with a rightward drag before it commits.
      await page.getByRole('button',{name:'Next home',exact:true}).click();
      await page.mouse.move(width/2,310); await page.mouse.down();
      await page.mouse.move(width/2+12,310,{steps:2});
      await page.waitForTimeout(30);
      const before=await card.boundingBox();
      await page.mouse.move(width/2+75,310,{steps:8});
      const during=await card.boundingBox();
      if (!(during.x > before.x + 20)) throw new Error(`Interrupted spring did not follow finger: ${JSON.stringify({before,during})}`);
      await page.mouse.up(); await page.waitForTimeout(700);
      await expect(page.getByRole('button',{name:'View home',exact:true})).toBeVisible();
      // Repeat alternating drags without allowing each spring to finish first.
      for (const direction of [-1,1,-1,1]) {
        await page.mouse.move(width/2,310); await page.mouse.down();
        await page.mouse.move(width/2+direction*70,310,{steps:7}); await page.mouse.up();
        await page.waitForTimeout(50);
      }
      await page.waitForTimeout(800);
      const selected=await page.evaluate(()=>JSON.parse(localStorage.getItem('nest.v2')).selectedId);
      const prices={'home-1':'$1,350','home-2':'$1,200','home-3':'$1,450','home-4':'$1,300','home-5':'$1,425'};
      await expect(page.getByRole('button',{name:`Map pin ${prices[selected]}`,exact:true})).toHaveAttribute('aria-pressed','true');
      await expect(page.getByRole('button',{name:'View home',exact:true})).toBeVisible();
      expect(errors).toEqual([]);
      console.log(`PASS ${width}: spring interruption follows finger, rapid direction changes settle, no accidental detail opening, map stays synchronized.`);
      await page.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
