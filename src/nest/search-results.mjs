// Publish each result stream independently. Roommate errors must not hide homes.
export async function loadSearchResults(goal, service, handlers) {
  const homes = goal.intent !== 'Roommate';
  const people = goal.intent !== 'Home';
  if (!homes) handlers.homes([]);
  if (!people) handlers.people([]);
  await Promise.allSettled([
    homes ? Promise.resolve().then(()=>service.getHomeMatches(goal)).then(handlers.homes,handlers.homeError) : null,
    people ? Promise.resolve().then(()=>service.getRoommateMatches(goal)).then(handlers.people,handlers.peopleError) : null,
  ]);
}
