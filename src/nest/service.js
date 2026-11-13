import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  homes,
  roommates,
  events,
  people,
  demoGoal,
  sources,
  defaultPrompt,
} from "./fixtures";
import { interpretPrompt, matchHomes, toggleSaved } from "./matching";
const KEY = "nest.demo.v1";
const initial = {
  goal: null,
  draft: null,
  saved: { homes: [], people: [], events: [] },
  selectedId: "home-1",
  mapMinimized: false,
  interests: [],
  homeArea: null,
  communityArea: null,
};
let state = initial;
let hydrated;
let writes = Promise.resolve();
async function load() {
  if (!hydrated)
    hydrated = AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) {
        try {
          state = { ...initial, ...JSON.parse(raw) };
        } catch {
          state = initial;
        }
      }
      return state;
    });
  await hydrated;
  return state;
}
async function patch(values) {
  await load();
  state = { ...state, ...values };
  const snapshot = JSON.stringify(state);
  writes = writes
    .catch(() => {})
    .then(() => AsyncStorage.setItem(KEY, snapshot));
  await writes;
  return state;
}
export const nestService = {
  getState: load,
  getSetup: () => ({
    demoGoal: { ...demoGoal },
    sources,
    defaultPrompt,
    areas: ["South Lake Union", "Capitol Hill"],
    interests: ["Markets", "Tennis", "Weekend coffee", "Hiking", "Board games"],
  }),
  interpretGoal: async (raw, base = demoGoal) => interpretPrompt(raw, base),
  saveGoal: async (goal) => {
    const confirmed = { ...goal, updatedAt: new Date().toISOString() };
    await patch({ goal: confirmed, draft: confirmed });
    return confirmed;
  },
  getGoal: async () => (await load()).goal,
  saveDraft: (draft) => patch({ draft }),
  getHomeMatches: async (goal) => matchHomes(homes, goal),
  getRoommateMatches: async (goal) =>
    roommates
      .filter(
        (p) =>
          p.seekingRoommates &&
          goal.sourceIds.includes("interns") &&
          goal.budgetBasis === "person" &&
          p.budgetPerPerson <= goal.budgetAmount &&
          p.dates[0] <= goal.startDate &&
          p.dates[1] >= goal.endDate &&
          p.preferredAreas.some((a) => goal.preferredNeighborhoods.includes(a)),
      )
      .map((p) => ({
        ...p,
        criteria: [
          {
            criterionId: "dates",
            label: "Your dates overlap",
            explanation: "The stated dates cover your stay",
            status: "matched",
            evidence: `${p.dates[0]} to ${p.dates[1]}`,
          },
          {
            criterionId: "budget",
            label: "Similar housing budget",
            explanation: "Their per-person budget is within yours",
            status: "matched",
            evidence: `$${p.budgetPerPerson} per person`,
          },
          {
            criterionId: "quiet",
            label: "Also prefers a quiet home",
            explanation: "Only matched when you also prefer a quiet home",
            status: goal.preferences.includes("Quiet home")
              ? "matched"
              : "unknown",
            evidence: "Their original post explicitly requests a quiet home",
          },
        ],
      })),
  getCommunity: async (area, interests = []) => ({
    events: events
      .filter((e) => e.neighborhood === area)
      .sort(
        (a, b) =>
          b.interests.filter((x) => interests.includes(x)).length -
          a.interests.filter((x) => interests.includes(x)).length,
      ),
    people: people.filter(
      (p) =>
        p.openToMeeting &&
        p.neighborhood === area &&
        (!interests.length || p.interests.some((x) => interests.includes(x))),
    ),
  }),
  updateSearchSchedule: async (cadence, notificationsEnabled) => {
    const { goal } = await load();
    return goal
      ? nestService.saveGoal({ ...goal, cadence, notificationsEnabled })
      : null;
  },
  setSaved: async (kind, id) => {
    await load();
    return patch({ saved: toggleSaved(state.saved, kind, id) });
  },
  setHomeContext: (area) => patch({ homeArea: area, communityArea: null }),
  updateState: patch,
  getSavedItems: async () => {
    const { saved } = await load();
    return [
      ...homes
        .filter((x) => saved.homes.includes(x.id))
        .map((x) => ({ ...x, kind: "home", label: x.title })),
      ...[...roommates, ...people]
        .filter((x) => saved.people.includes(x.id))
        .map((x) => ({ ...x, kind: "person", label: x.name })),
      ...events
        .filter((x) => saved.events.includes(x.id))
        .map((x) => ({ ...x, kind: "event", label: x.title })),
    ];
  },
};
