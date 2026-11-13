import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEvent} from './events';
const group={id:'g',name:'Young Professionals in Seattle'};
test('existing Supabase invitation format preserves unknown facts',()=>{
 const e=normalizeEvent({id:'p',group,body:"I'm Sam, new to South Lake Union. Anyone interested in coffee on Saturday June 5, 2027 at 10 AM?"});
 assert.equal(e.city,'Seattle');assert.equal(e.startsAt,'2027-06-05T10:00-07:00');assert.equal(e.price,null);assert.equal(e.venue,null);
});
test('city does not come from group name; introductions are not events',()=>{
 assert.equal(normalizeEvent({id:'p',group,body:"I'm Sam, new to Bellevue. Anyone interested in coffee on Saturday June 5, 2027 at 10 AM?"}).city,'Bellevue');
 assert.equal(normalizeEvent({id:'p',group,body:'New in Seattle, looking for friends.',created_at:'2027-06-01'}),null);
});
