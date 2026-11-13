const { chromium, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  const out = path.resolve('artifacts/nest/refinements'); fs.mkdirSync(out, { recursive: true });
  try {
    for (const width of [390, 375]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      const errors=[]; page.on('pageerror', e=>{errors.push(e.message); console.error(e.message);});
      // Never read or mutate a connected account during UI verification.
      await page.route('**/rest/v1/**', route => route.fulfill({status:200, contentType:'application/json', body: new URL(route.request().url()).pathname.endsWith('/fb_users') && route.request().headers().accept?.includes('vnd.pgrst.object') ? JSON.stringify({id:'test-user', name:'Test User'}) : route.request().method()==='POST' ? '' : route.request().url().includes('nest_preferences') ? 'null' : '[]'}));
      await page.goto(process.env.NEST_URL || 'http://localhost:8086');
      await page.getByRole('button', {name:'Open Facebook menu'}).click();
      await page.getByRole('button', {name:'Nest', exact:true}).click();
      await page.getByRole('button', {name:'Add a goal', exact:true}).waitFor();
      await page.waitForTimeout(700);
      await page.screenshot({path:path.join(out,`welcome-${width}.png`)});
      await page.getByRole('button', {name:'Give Nest a squish'}).click();
      await page.getByRole('button', {name:'Add a goal', exact:true}).click();
      for (const mode of ['Home','Roommate','Both']) {
        await page.getByRole('tab', {name:mode, exact:true}).click();
        await expect(page.getByText(mode==='Home'?'Let’s find your place.':mode==='Roommate'?'Let’s find your people.':'Your people. Your place.', {exact:true})).toBeVisible();
        if(mode==='Home') {
          await expect(page.getByText('How many roommates?',{exact:true})).toHaveCount(0);
          await page.getByRole('radio',{name:'An entire home',exact:true}).click();
        }
        if(mode==='Roommate') {
          await expect(page.getByText('What kind of home?',{exact:true})).toHaveCount(0);
          await page.getByRole('radio',{name:'I have a place',exact:true}).click();
          await expect(page.getByText('How many people can move in?',{exact:true})).toBeVisible();
          await page.getByRole('radio',{name:'2 roommates',exact:true}).click();
        }
        if(mode==='Both') {
          await expect(page.getByRole('radio',{name:'An entire home',exact:true})).toHaveAttribute('aria-checked','true');
          await expect(page.getByRole('radio',{name:'2 roommates',exact:true})).toHaveAttribute('aria-checked','true');
          await page.getByRole('radio',{name:'A room',exact:true}).click();
        }
        await page.waitForTimeout(350);
        await page.screenshot({path:path.join(out,`intake-${mode.toLowerCase()}-${width}.png`)});
      }
      await page.getByRole('button',{name:'Review preferences',exact:true}).click();
      await page.getByRole('button',{name:'Find homes & roommates',exact:true}).click();
      await page.getByRole('button',{name:'View home',exact:true}).waitFor();
      await page.waitForTimeout(600);
      const card=page.getByRole('button',{name:'Home 1 of 5, $1,350 per month',exact:true});
      await card.evaluate(e=>e.dataset.stableCard='yes');
      const box=await card.boundingBox();
      await page.mouse.move(box.x+box.width*.5,box.y+80);
      await page.mouse.down();
      await page.mouse.move(box.x+box.width*.5-65,box.y+83,{steps:10});
      const dragged=await card.boundingBox();
      expect(dragged.x).toBeLessThan(box.x-20);
      await page.screenshot({path:path.join(out,`gallery-drag-${width}.png`)});
      await page.mouse.up();
      await expect(page.getByText('2 of 5',{exact:true})).toBeVisible();
      await expect(card).toHaveAttribute('data-stable-card','yes');
      await expect(page.getByRole('button',{name:'Map pin $1,200',exact:true})).toHaveAttribute('aria-pressed','true');
      await page.screenshot({path:path.join(out,`gallery-settled-${width}.png`)});
      await page.getByRole('button',{name:'Previous home',exact:true}).click();
      await expect(page.getByText('1 of 5',{exact:true})).toBeVisible();
      await page.getByRole('button',{name:'Previous home',exact:true}).click();
      await expect(page.getByText('5 of 5',{exact:true})).toBeVisible();
      await page.getByRole('button',{name:'Next home',exact:true}).click();
      await expect(page.getByText('1 of 5',{exact:true})).toBeVisible();
      await page.getByRole('button',{name:'Edit search',exact:true}).click();
      await page.getByRole('tab',{name:'Roommate',exact:true}).click();
      await page.getByRole('button',{name:'Update profile and find roommates',exact:true}).click();
      await expect(page.getByText('Your roommate matches',{exact:true})).toBeVisible();
      await page.getByRole('tab',{name:'Homes',exact:true}).click();
      await expect(page.getByText(/Your search is focused on roommates/)).toBeVisible();
      expect(errors).toEqual([]);
      console.log(`PASS ${width}: conditional intake, preserved controls, continuous swipe, stable card nodes, circular wrap, map synchronization, correct result routing; no runtime errors.`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1);});
