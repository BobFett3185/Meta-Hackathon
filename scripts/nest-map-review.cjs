const { chromium, expect } = require('@playwright/test');
const fs = require('fs'); const path = require('path');
(async()=>{
 const {demoGoal}=await import('../src/nest/fixtures.js');
 const out=path.resolve('artifacts/nest/color-map');fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
 try{for(const width of [375,390]){
  const p=await b.newPage({viewport:{width,height:844}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await require('./nest-api-mock.cjs').mockNestApi(p);
      await p.route('**/rest/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:r.request().url().includes('nest_preferences')?'null':r.request().headers().accept?.includes('vnd.pgrst.object')?JSON.stringify({id:'test-user',name:'Test User'}):'[]'}));
  await p.addInitScript(g=>localStorage.setItem('nest.v2',JSON.stringify({goal:{...g,intent:'Home'},selectedId:'home-1'})),demoGoal);
  await p.goto(process.env.NEST_URL||'http://localhost:8086');
  await p.getByRole('button',{name:'Open Facebook menu'}).click();await p.getByRole('button',{name:'Nest',exact:true}).click();
  const shot=async name=>{await expect(p.getByText('Loading photo…',{exact:true}).filter({visible:true})).toHaveCount(0,{timeout:8000});await p.waitForTimeout(500);await p.screenshot({path:path.join(out,name+'-'+width+'.png')});};
  await expect(p.getByText('1 of 5',{exact:true})).toBeVisible();await shot('homes');
  await p.getByRole('button',{name:'Map pin $1,200',exact:true}).scrollIntoViewIfNeeded();await shot('inline-map');
  await p.getByRole('button',{name:'Squishy neighborhood guide',exact:true}).click();await expect(p.getByText('A little look around',{exact:true})).toBeVisible();await shot('guide');
  await p.getByRole('button',{name:'Explore the map',exact:true}).click();await shot('expanded-map');
  await p.getByRole('button',{name:'Map pin $1,450',exact:true}).click();
  await expect(p.getByText('Light-filled room by Cascade Park',{exact:true}).filter({visible:true})).toBeVisible();
  await p.getByRole('button',{name:'View home',exact:true}).click();
  await expect(p.getByText('How this home fits',{exact:true})).toBeVisible();await shot('details');
  await p.getByRole('button',{name:'See all criteria',exact:true}).scrollIntoViewIfNeeded();await shot('criteria');
  await p.getByRole('button',{name:'See all criteria',exact:true}).click();await expect(p.getByText('All criteria',{exact:true})).toBeVisible();
  await p.getByRole('button',{name:'Close sheet',exact:true}).last().click();
  await p.getByRole('button',{name:'Back to your matches',exact:true}).click();
  await expect(p.getByText('Around South Lake Union',{exact:true}).filter({visible:true})).toBeVisible();
  await p.getByRole('button',{name:'Back to your matches',exact:true}).click();
  await expect(p.getByText('3 of 5',{exact:true})).toBeVisible();
  await p.getByRole('button',{name:'Edit search',exact:true}).click();
  await p.getByRole('radio',{name:'An entire home',exact:true}).click();
  await p.getByRole('button',{name:'Find homes',exact:true}).click();
  await p.getByRole('button',{name:'View home',exact:true}).click();
  await expect(p.getByText('Sample listing · not an exact match',{exact:true})).toBeVisible();
  await p.getByText("Home type · doesn't match",{exact:true}).scrollIntoViewIfNeeded();
  await expect(p.getByText("Home type · doesn't match",{exact:true})).toBeVisible();await shot('sample-criteria');
  expect(errors).toEqual([]);console.log('PASS '+width+': pin/guide/preview/detail/criteria/navigation, zero runtime errors');await p.close();
 }}finally{await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});
