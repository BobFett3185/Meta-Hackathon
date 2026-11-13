const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { transformFileSync } = require('@babel/core');

test('merged service preserves API search, local profiles, migration and cloud failure reporting', async () => {
  const { emptyProfile, prepareProfile } = await import('../src/nest/profileData.js');
  const storage = new Map([['nest.demo.v1', JSON.stringify({
    profile: {...emptyProfile, introduction:'Existing introduction'},
    goal:{city:'Do not migrate demo goal'}, selectedId:'home-1',
  })]]);
  const calls = [];
  let failSearch = false;
  const modules = {
    'expo-constants': {expoConfig:{hostUri:'192.168.1.5:8081'}},
    'react-native': {Platform:{OS:'ios'}},
    '@react-native-async-storage/async-storage': {
      getItem: async key => storage.get(key) ?? null,
      setItem: async (key,value) => storage.set(key,value),
    },
    './fixtures': {events:[],people:[]},
    '../supabase': {supabase:{}},
    './event-source.mjs': {fetchEvents:async()=>[]},
    './event-utils.mjs': await import('../src/nest/event-utils.mjs'),
    './matching': {toggleSaved:()=>({})},
    './profileData': {emptyProfile,prepareProfile},
    '../api': {getMe:async()=>({id:'user-123'}),isSupabaseConfigured:true,
      getNestPreferences:async()=>null, saveNestPreferences:async()=>{throw Error('offline');}},
  };
  const code = transformFileSync('src/nest/service.js', {
    configFile:false, babelrc:false, plugins:['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const exports = {};
  vm.runInNewContext(code, {exports,require:name=>{
    assert.ok(name in modules, `Unexpected dependency ${name}`); return modules[name];
  },process:{env:{}},console,fetch:async(url,options)=>{
    const body=JSON.parse(options.body); calls.push({url,body});
    if (url.endsWith('/api/search') && failSearch) return {ok:false,json:async()=>({error:'search unavailable'})};
    return {ok:true,json:async()=>url.endsWith('/api/setup')
      ? {defaultGoal:{city:'Seattle'},sources:[],cities:['Seattle'],neighborhoodsByCity:{Seattle:[]}}
      : url.endsWith('/api/interpret') ? {goal:{city:'Vancouver'},missing:null}
      : {homes:[{listingId:'live-home',listing:{id:'live-home'}}],roommates:[{id:'live-person'}]}};
  }});
  const service=exports.nestService;
  const state=await service.getState();
  assert.equal(state.profile.introduction,'Existing introduction');
  assert.equal(state.goal,null);
  assert.equal(state.selectedId,null);
  await service.loadSetup();
  assert.equal(service.getSetup().defaultGoal.city,'Seattle');
  assert.equal((await service.interpretGoal('Moving north')).goal.city,'Vancouver');
  const goal={rawPrompt:'Find both',intent:'Both'};
  const [homes,people]=await Promise.all([service.getHomeMatches(goal),service.getRoommateMatches(goal)]);
  assert.equal(homes[0].listingId,'live-home'); assert.equal(people[0].id,'live-person');
  const searches=calls.filter(x=>x.url.endsWith('/api/search'));
  assert.equal(searches.length,2);
  assert.deepEqual(searches.map(x=>x.body.kind).sort(),['homes','roommates']);
  assert.ok(searches.every(x=>x.body.goal.intent==='Both'));
  assert.ok(calls.every(x=>x.body.userId==='user-123'));
  assert.ok(calls.every(x=>x.url.startsWith('http://192.168.1.5:8787/')));
  assert.equal((await service.saveGoal(goal)).persistence,'local-only');
  const saved=await service.saveProfile({...emptyProfile,introduction:'Hello',aboutMe:'Tidy',lookingFor:'Quiet'});
  assert.equal(saved.userId,'user-123'); assert.equal(saved.persistence,'local');
  assert.equal(JSON.parse(storage.get('nest.v2')).profile.aboutMe,'Tidy');
  failSearch=true;
  await assert.rejects(service.getHomeMatches({...goal,rawPrompt:'Another search'}),/search unavailable/);
  failSearch=false;
  assert.equal((await service.getHomeMatches({...goal,rawPrompt:'Another search'}))[0].listingId,'live-home');
});
