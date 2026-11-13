const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const {demoGoal}=await import('../src/nest/fixtures.js');const root=path.resolve('.tools/both-search');
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
 try{for(const width of [375,390]){
 const page=await browser.newPage({viewport:{width,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));let release;
 const pending=new Promise(resolve=>release=resolve);
 await page.route('http://nest.test/**',r=>{let f=path.resolve(root,'.'+new URL(r.request().url()).pathname);if(!f.startsWith(root+path.sep)||!fs.existsSync(f))f=path.join(root,'index.html');return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html':f.endsWith('.png')?'image/png':'application/octet-stream'});});
 await page.route('https://tile.openstreetmap.org/**',r=>r.abort());
 await require('./nest-api-mock.cjs').mockNestApi(page);
 await page.route('**/api/search',async r=>{if(r.request().postDataJSON().kind==='roommates'){await pending;return r.fulfill({status:500,json:{error:'Roommate-only outage'}});}return r.fallback();});
 await page.route('**/rest/v1/**',r=>r.fulfill({json:r.request().url().includes('nest_preferences')?null:r.request().headers().accept?.includes('vnd.pgrst.object')?{id:'test',name:'Test User'}:[]}));
 await page.addInitScript(g=>localStorage.setItem('nest.v2',JSON.stringify({goal:{...g,intent:'Both',roommateCount:1},draft:{...g,intent:'Both',roommateCount:1},saved:{homes:[],people:[],events:[]}})),demoGoal);
 await page.goto('http://nest.test');await page.getByRole('button',{name:'Open Facebook menu'}).click();await page.getByRole('button',{name:'Nest',exact:true}).click();
 await expect(page.getByText('1 of 5',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Edit search',exact:true}).click();await page.getByRole('button',{name:'Find homes & roommates',exact:true}).click();
 await expect(page.getByRole('tab',{name:'Homes',exact:true})).toHaveAttribute('aria-selected','true');
 await expect(page.getByText('1 of 5',{exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'Roommates',exact:true}).click();await expect(page.getByLabel('Loading roommate matches')).toBeVisible();
 release();await expect(page.getByText('Could not load roommate matches. Your housing results are still available.',{exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'Homes',exact:true}).click();await expect(page.getByText('1 of 5',{exact:true})).toBeVisible();
 expect(errors).toEqual([]);console.log('PASS '+width+': Both confirms without profile gate; homes remain available during delayed/failed roommate search');await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
