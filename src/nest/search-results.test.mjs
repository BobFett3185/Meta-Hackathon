import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSearchResults} from './search-results.mjs';
test('Both publishes homes while roommate matching is still pending',async()=>{
 let release;const people=new Promise(resolve=>release=resolve),seen=[];
 const loading=loadSearchResults({intent:'Both'},{getHomeMatches:async()=>['home'],getRoommateMatches:()=>people},{homes:x=>seen.push(['homes',x]),people:x=>seen.push(['people',x]),homeError:assert.fail,peopleError:assert.fail});
 await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual(seen,[['homes',['home']]]);
 release(['person']);await loading;assert.deepEqual(seen[1],['people',['person']]);
});
test('roommate failure cannot suppress successful housing results',async()=>{
 let homes,failed=false;
 await loadSearchResults({intent:'Both'},{getHomeMatches:async()=>['home'],getRoommateMatches:async()=>{throw Error('roommate service unavailable');}},{homes:x=>homes=x,people:assert.fail,homeError:assert.fail,peopleError:()=>failed=true});
 assert.deepEqual(homes,['home']);assert.equal(failed,true);
});
test('Home and Roommate intents request only their own result stream',async()=>{
 for(const intent of ['Home','Roommate']){const calls=[];await loadSearchResults({intent},{getHomeMatches:async()=>{calls.push('home');return[];},getRoommateMatches:async()=>{calls.push('person');return[];}},{homes:()=>{},people:()=>{},homeError:assert.fail,peopleError:assert.fail});assert.deepEqual(calls,[intent==='Home'?'home':'person']);}
});
