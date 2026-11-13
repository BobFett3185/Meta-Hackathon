// Production UI against a live Supabase snapshot; no shared-user writes or Muse calls.
const fs=require('node:fs'),path=require('node:path');
const {chromium,expect}=require('@playwright/test');
async function main(){
 const {readEvents}=await import('../server/events.ts');
 const {eligible}=await import('../src/nest/event-utils.mjs');
 const events=await readEvents();if(events.length<2)throw Error('Expected Supabase event posts');
 const sources=[...new Map(events.map(e=>[e.sourceId,{id:e.sourceId,name:e.sourceName}])).values()];
 const goal={id:'test',rawPrompt:'Seattle summer stay',intent:'Home',city:'Seattle',startDate:'2027-06-01',endDate:'2027-08-31',budgetAmount:1500,budgetBasis:'person',preferredNeighborhoods:['South Lake Union'],housingType:'any',furnishedRequirement:false,mustHaves:[],preferences:[],sourceIds:sources.map(s=>s.id),maxResults:5,cadence:'Manual',notificationsEnabled:false,updatedAt:'2030-01-01T00:00:00Z'};
 const root=path.resolve('.tools/community-current');fs.mkdirSync('.tools/community-qa',{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
 try{for(const width of [375,390]){
  const page=await browser.newPage({viewport:{width,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));let fail=false;
  await page.route('http://nest.test/**',async r=>{let f=path.resolve(root,'.'+new URL(r.request().url()).pathname);if(!f.startsWith(root+path.sep)||!fs.existsSync(f))f=path.join(root,'index.html');await r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.js')?'application/javascript':f.endsWith('.html')?'text/html':f.endsWith('.png')?'image/png':f.endsWith('.ttf')?'font/ttf':'application/octet-stream'});});
  await page.route('**/*.supabase.co/**',r=>{
    if(!new URL(r.request().url()).pathname.endsWith('/fb_posts'))return r.abort();
    const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*'};
    if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers});
    if(fail)return r.fulfill({status:400,headers,json:{message:'Test source failure'}});
    return r.fulfill({headers,json:events.map(e=>({id:e.postId,title:e.title,body:e.originalPostText,group:{id:e.sourceId,name:e.sourceName},author:{name:e.author},images:e.imageUrl?[{url:e.imageUrl,position:0}]:[]}))});
  });
  await page.route('**/api/**',async r=>{
    const headers={'access-control-allow-origin':'*','access-control-allow-headers':'content-type'};
    if(r.request().method()==='OPTIONS')return r.fulfill({status:204,headers});
    const route=new URL(r.request().url()).pathname,body=r.request().postDataJSON()||{};
    if(route==='/api/community'&&fail)return r.fulfill({status:503,headers,json:{error:'Test source failure'}});
    const json=route==='/api/setup'?{sources,cities:['Seattle'],neighborhoodsByCity:{Seattle:['South Lake Union']},defaultGoal:goal}:route==='/api/community'?{events:events.filter(e=>eligible(e,body.goal)),people:[],fetchedAt:new Date().toISOString()}:route==='/api/events/saved'?{events:body.ids.map(id=>events.find(e=>e.id===id)||{id,title:'Event no longer available',unavailable:true})}:{homes:[],roommates:[]};
    await r.fulfill({headers,json});
  });
  await page.goto('http://nest.test');await page.evaluate(g=>localStorage.setItem('nest.v2',JSON.stringify({goal:g,draft:g,saved:{homes:[],people:[],events:[]},interests:['Weekend coffee']})),goal);await page.reload();
  const open=async()=>{await page.getByRole('button',{name:'Open Facebook menu'}).click();await page.getByRole('button',{name:'Nest',exact:true}).click();await page.getByRole('tab',{name:'Community',exact:true}).click();};await open();
  await expect(page.getByText(/events during your stay/)).toBeVisible();
  await page.getByRole('textbox',{name:'Search community events'}).fill('zzzzmissing');await expect(page.getByText('No events match these filters.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Reset filters',exact:true}).first().click();
  await page.getByRole('button',{name:'Coffee',exact:true}).click();await page.getByRole('button',{name:'Save item',exact:true}).first().click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('nest.v2')).saved.events.length)).toBe(1);
  await page.getByRole('button',{name:/View event/}).first().click();await expect(page.getByRole('button',{name:'View original post',exact:true})).toBeVisible();await page.getByRole('button',{name:'View original post',exact:true}).click();await expect(page.getByText('Original post',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Close sheet',exact:true}).last().click();
  await page.reload();await open();await expect(page.getByRole('button',{name:'Unsave item',exact:true}).first()).toBeVisible();
  await page.getByRole('button',{name:'Edit stay',exact:true}).click();await page.getByRole('button',{name:'Edit location and dates',exact:true}).click();await page.getByRole('textbox',{name:'Move-in date (YYYY-MM-DD)',exact:true}).fill('2027-07-01');await page.getByRole('textbox',{name:'Move-out date (YYYY-MM-DD)',exact:true}).fill('2027-07-31');await page.getByRole('button',{name:'Find homes',exact:true}).click();await expect(page.getByText('2027-07-01 – 2027-07-31',{exact:true})).toBeVisible();
  fail=true;await page.getByRole('button',{name:'Refresh events',exact:true}).click();await expect(page.getByText(/Showing previous results/)).toBeVisible();fail=false;await page.getByRole('button',{name:'Retry events',exact:true}).click();await expect(page.getByText(/events during your stay/)).toBeVisible();
  await page.getByText('People recommendations are coming soon.',{exact:true}).scrollIntoViewIfNeeded();await expect(page.getByText('People open to meeting up',{exact:true})).toBeVisible();
  if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify({width,supabaseRecords:events.length,runtimeErrors:errors.length,checks:'search/category/save/reload/details/source/stay-edit/error-retry/empty-people'}));await page.close();
 }}finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
