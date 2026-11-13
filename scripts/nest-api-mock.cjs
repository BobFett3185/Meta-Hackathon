// Browser tests cross the real frontend API boundary without touching Supabase/Muse.
exports.mockNestApi = async function(page) {
  const { demoGoal, homes, roommates, sources } = await import('../src/nest/fixtures.js');
  const { demoHomeMatches, demoRoommateMatches } = await import('../src/nest/matching.js');
  const requests = [];
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().postDataJSON();
    requests.push({ path, body });
    let result;
    if (path === '/api/setup') result = {
      defaultGoal: demoGoal, sources, cities: ['Seattle'],
      neighborhoodsByCity: { Seattle: ['South Lake Union', 'Capitol Hill'] },
    };
    else if (path === '/api/interpret') result = { goal: { ...demoGoal, ...body.base, rawPrompt: body.text }, missing: null };
    else if (path === '/api/search') result = {
      homes: demoHomeMatches(homes, body.goal), roommates: demoRoommateMatches(roommates, body.goal),
      generatedAt: new Date().toISOString(),
    };
    else return route.fulfill({status:404, json:{error:'Unexpected test API route'}});
    return route.fulfill({status:200, json:result});
  });
  return requests;
};
