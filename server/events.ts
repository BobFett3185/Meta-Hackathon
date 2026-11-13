import {adminDb} from '../services/ingestion/db';
import {eligible} from '../src/nest/event-utils.mjs';
import {fetchEvents} from '../src/nest/event-source.mjs';
export {normalizeEvent} from '../src/nest/event-source.mjs';
export const readEvents=(ids?:string[])=>fetchEvents(adminDb(),ids);
export async function communityEvents(goal:any){
  const unique=new Map<string,any>();
  for(const event of (await readEvents()).filter((e:any)=>eligible(e,goal))){
    const key=event.eventKey || [event.title,event.city,event.neighborhood,event.startsAt].join('|').toLowerCase();
    const source={postId:event.postId,name:event.sourceName,text:event.originalPostText};
    if(unique.has(key))unique.get(key).sources.push(source);
    else unique.set(key,{...event,sources:[source]});
  }
  return {events:[...unique.values()],people:[],fetchedAt:new Date().toISOString()};
}
