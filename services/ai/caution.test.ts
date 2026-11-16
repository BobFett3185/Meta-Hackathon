import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAnalysis} from './validate';
import {toHomeListing} from '../ingestion/to-listing';

const source = 'Send a gift card before viewing the room.';
const raw = (suspicious=true, quote=source) => ({category:'housing_listing', confidence:0.9, summary:'Room', housing:{rent:1200,caution:{suspicious,reasons:[{reason:'Payment requested before viewing',quote}]}},item:null});
test('only source-grounded Muse concerns reach the listing',()=>{
  const analysis=validateAnalysis(raw(),source);
  assert.equal(analysis.housing?.caution?.suspicious,true);
  const result:any={...analysis,provider:'muse',rawPostId:'x',needsReview:false};
  assert.equal(toHomeListing({id:'x',content:source},result)?.caution?.suspicious,true);
  assert.equal(toHomeListing({id:'x',content:source},{...result,provider:'mock'})?.caution,null);
});
test('invented evidence, missing assessments, and unflagged listings show no caution',()=>{
  assert.equal(validateAnalysis(raw(true,'This quote was invented'),source).housing?.caution?.suspicious,false);
  assert.equal(validateAnalysis(raw(false),source).housing?.caution?.suspicious,false);
  assert.deepEqual(validateAnalysis(raw(false),source).housing?.caution?.reasons,[]);
  assert.equal(validateAnalysis(raw()).housing?.caution,undefined);
});
