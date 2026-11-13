import test from 'node:test';
import assert from 'node:assert/strict';
import {eligible,localDay,selectEvents,eventDate} from './event-utils.mjs';
const goal={city:'Seattle',startDate:'2027-06-01',endDate:'2027-08-31',sourceIds:['g']};
const event={id:'a',title:'Coffee',city:'Seattle',neighborhood:'South Lake Union',sourceId:'g',startsAt:'2027-06-01',timezone:'America/Los_Angeles',category:'Coffee',interests:['Weekend coffee']};
test('city, dates, sources, cancellations and inclusive boundaries',()=>{
 assert.equal(eligible(event,goal),true);assert.equal(eligible({...event,startsAt:'2027-08-31'},goal),true);
 for(const patch of [{city:'Bellevue'},{startsAt:'2027-05-31'},{startsAt:'2027-09-01'},{sourceId:'other'},{status:'cancelled'},{startsAt:'2027-02-30'}])assert.ok(!eligible({...event,...patch},goal));
});
test('local timezone, calendar dates and multi-day overlap',()=>{
 assert.equal(localDay('2027-06-01T01:00:00Z'),'2027-05-31');assert.equal(localDay('2027-06-01'),'2027-06-01');
 assert.equal(eligible({...event,startsAt:'2027-05-30',endsAt:'2027-06-02'},goal),true);assert.match(eventDate(event),/Jun 1, 2027/);
});
test('search, month, area, interests and deterministic deduplication',()=>{
 const other={...event,id:'b',title:'Hiking',startsAt:'2027-07-01',category:'Outdoors',interests:['Hiking']};
 const context={goal,interests:['Hiking']};
 assert.deepEqual(selectEvents([event,other],context).map(e=>e.id),['b','a']);
 assert.equal(selectEvents([event,other],context,{query:'hiking'}).length,1);
 assert.equal(selectEvents([event],context,{month:'2027-07'}).length,0);
 assert.equal(selectEvents([event],context,{area:'Fremont'}).length,0);
 assert.equal(selectEvents([event,{...event,id:'duplicate'}],context).length,1);
});
