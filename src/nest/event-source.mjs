import {validDate} from './event-utils.mjs';
function check(result,context){if(result.error)throw Error(context+': '+result.error.message);return result.data;}
async function bounded(query){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);try{return await query.abortSignal(controller.signal);}finally{clearTimeout(timer);}}
export function normalizeEvent(post) {
  const body=String(post.body || '');
  const field=(key)=>body.match(new RegExp(`^${key}:\\s*(.+)$`,'mi'))?.[1]?.trim();
  const invitation=/Anyone interested in (.+?) on (?:\w+ )?(\w+) (\d{1,2}), (\d{4}) at (\d{1,2})(?::(\d{2}))? (AM|PM)\?/i.exec(body);
  if(!field('Event') && !invitation)return null;
  if(!post.group)return null;
  let title=field('Event'),city=field('City'),area=field('Neighborhood'),date=field('Date'),time=field('Time'),category=field('Category') || 'Social';
  if(invitation) {
    const months={january:'01',february:'02',march:'03',april:'04',may:'05',june:'06',july:'07',august:'08',september:'09',october:'10',november:'11',december:'12'};
    const month=months[invitation[2].toLowerCase()]; if(!month)return null;
    date=`${invitation[4]}-${month}-${invitation[3].padStart(2,'0')}`;
    area=body.match(/new to ([^.]+)\./i)?.[1];
    if(['Bellevue','Redmond'].includes(area || '')){city=area;area=undefined;}
    else if(['South Lake Union','Capitol Hill','Fremont','Ballard','Queen Anne','University District','Belltown','Beacon Hill'].includes(area || ''))city='Seattle';
    else return null;
    title=invitation[1][0].toUpperCase()+invitation[1].slice(1);
    category=/coffee/i.test(title)?'Coffee':/market/i.test(title)?'Markets':/tennis/i.test(title)?'Sports':/walk|hik/i.test(title)?'Outdoors':'Social';
    // These corpus invitations explicitly cover Pacific summer 2027.
    if(date<'2027-06-01'||date>'2027-08-31')return null;
    const hour=Number(invitation[5]); if(hour<1||hour>12||Number(invitation[6]||0)>59)return null;
    time=`${String(hour%12+(/pm/i.test(invitation[7])?12:0)).padStart(2,'0')}:${invitation[6] || '00'}-07:00`;
  }
  if(!title||!city||!validDate(date))return null;
  const end=field('End date');if(end && (!validDate(end)||end<date))return null;
  const timezone=field('Timezone') || (/^(Seattle|Bellevue|Redmond|Vancouver)$/i.test(city)?'America/Los_Angeles':null);
  if(!timezone)return null;
  try{new Intl.DateTimeFormat('en-US',{timeZone:timezone}).format();}catch{return null;}
  if(time && !/^(?:[01]\d|2[0-3]):[0-5]\d(?:Z|[+-]\d{2}:\d{2})$/.test(time))return null;
  const startsAt=time?`${date}T${time}`:date;if(isNaN(Date.parse(startsAt)))return null;
  const price=field('Price'),amount=/^(USD|CAD) (\d+(?:\.\d{1,2})?)$/.exec(price || '');
  return {id:`event-${post.id}`,postId:post.id,eventKey:field('Event key'),title,description:field('Description') || body,city,neighborhood:area || null,venue:field('Venue') || null,startsAt,endsAt:end || null,timezone,category,interests:(field('Interests') || (invitation ? (/coffee/i.test(title)?'Weekend coffee':/walk/i.test(title)?'Walking':/market/i.test(title)?'Markets':/tennis/i.test(title)?'Tennis':/board games/i.test(title)?'Board games':'') : '')).split(',').map(s=>s.trim()).filter(Boolean),price:/^free$/i.test(price || '')?0:amount?Number(amount[2]):null,currency:amount?.[1] || null,status:/^(cancelled|canceled)$/i.test(field('Status') || '')?'cancelled':'scheduled',imageUrl:[...(post.images || [])].sort((a,b)=>a.position-b.position)[0]?.url || null,sourceId:post.group.id,sourceName:post.group.name,sourceUrl:null,originalPostText:body,author:post.author?.name || null};
}
const select='id,title,body,group:fb_groups(id,name),author:fb_users!author_id(name),images:fb_post_images(url,position)';
export async function fetchEvents(db,ids) {
  const events=[];
  if(ids) {
    const postIds=ids.filter(id=>/^event-[0-9a-f-]{36}$/i.test(id)).map(id=>id.slice(6));
    for(let i=0;i<postIds.length;i+=100){const rows=check(await bounded(db.from('fb_posts').select(select).in('id',postIds.slice(i,i+100))),'read saved events');events.push(...rows.map(normalizeEvent).filter(Boolean));}
    return ids.map(id=>events.find(e=>e.id===id) || {id,title:'Event no longer available',unavailable:true});
  }
  for(let offset=0;;offset+=500){const rows=check(await bounded(db.from('fb_posts').select(select).or('body.ilike.%Event:%,body.ilike.%Anyone interested in%').order('id').range(offset,offset+499)),'read community events');events.push(...rows.map(normalizeEvent).filter(Boolean));if(rows.length<500)break;}
  return events;
}
