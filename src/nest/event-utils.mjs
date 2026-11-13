export const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !isNaN(Date.parse(value)) && new Date(value+'T12:00:00Z').toISOString().slice(0,10) === value;
export const same = (a,b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
export const hasStay = g => !!g?.city && validDate(g.startDate) && validDate(g.endDate) && g.startDate <= g.endDate;
export function localDay(value, timezone='America/Los_Angeles') {
  if(validDate(value)) return value;
  if(!value || isNaN(Date.parse(value))) return null;
  try { const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value)); const p=k=>parts.find(x=>x.type===k)?.value; return `${p('year')}-${p('month')}-${p('day')}`; } catch { return null; }
}
export function eligible(e,g) {
  const start=localDay(e.startsAt,e.timezone),end=localDay(e.endsAt || e.startsAt,e.timezone);
  return hasStay(g) && same(e.city,g.city) && e.status!=='cancelled' && start && end && end>=start && start<=g.endDate && end>=g.startDate && (g.sourceIds || []).includes(e.sourceId);
}
export function selectEvents(events, {goal,area,interests=[]}, filters={}) {
  const tags=[...interests,...(goal?.preferences || [])];
  const score=e=>tags.filter(t=>e.interests?.some(x=>same(x,t))).length*10+(same(area,e.neighborhood)?1:0);
  const query=(filters.query || '').toLowerCase().trim();
  const seen=new Set();
  return events.filter(e=>eligible(e,goal)).filter(e=>{
    const key=e.eventKey || [e.title,e.city,e.neighborhood,e.startsAt].join('|').toLowerCase();
    if(seen.has(key))return false;seen.add(key);return true;
  }).filter(e=>(!filters.source || e.sourceId===filters.source) && (!filters.savedOnly || filters.savedIds?.includes(e.id)) && (!filters.category || e.category===filters.category) && (!filters.area || same(e.neighborhood,filters.area)) && (!filters.month || (localDay(e.startsAt,e.timezone).slice(0,7)<=filters.month && localDay(e.endsAt || e.startsAt,e.timezone).slice(0,7)>=filters.month)) && (!filters.upcoming || localDay(e.endsAt || e.startsAt,e.timezone)>=localDay(new Date().toISOString(),e.timezone)) && (!query || [e.title,e.description,e.venue,e.sourceName,e.neighborhood].join(' ').toLowerCase().includes(query)))
    .sort((a,b)=>(filters.sort==='soonest'?0:score(b)-score(a)) || a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id))
    .map(e=>({...e,reasons:[`During your ${goal.city} stay`,...(area && same(area,e.neighborhood)?[`In ${area}`]:[]),...tags.filter(t=>e.interests?.some(x=>same(x,t))).slice(0,1).map(t=>`Matches your interest in ${t}`)]}));
}
export function eventDate(e) {
  const start=localDay(e.startsAt,e.timezone),end=localDay(e.endsAt || e.startsAt,e.timezone);
  if(!start)return 'Date unavailable';
  const fmt=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'});
  return fmt(start)+(end!==start?` – ${fmt(end)}`:'')+' · '+(validDate(e.startsAt)?'Time to be confirmed':new Date(e.startsAt).toLocaleTimeString('en-US',{timeZone:e.timezone,hour:'numeric',minute:'2-digit',timeZoneName:'short'}));
}
export const priceLabel=e=>e.price===0?'Free':e.price!=null && e.currency?`${e.currency} ${e.price}`:'Price not specified';
