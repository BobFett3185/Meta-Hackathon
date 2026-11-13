import {supabase} from '../supabase';
import {fetchEvents} from './event-source.mjs';
import {eligible} from './event-utils.mjs';
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { people } from "./fixtures"; // Resolve legacy saved people only.
import { toggleSaved } from "./matching";
import { getNestPreferences, isSupabaseConfigured, saveNestPreferences } from "../api";
import { getMe } from "../api";
import { emptyProfile, prepareProfile } from "./profileData";
const KEY = "nest.v2";
// Nest API: the server holds the Muse key and reads Supabase.
// Resolution order: EXPO_PUBLIC_NEST_API_URL, then the same machine that serves the Expo bundle
// (so phones on the LAN reach your computer automatically), then the Android emulator alias / localhost.
const API_PORT = process.env.EXPO_PUBLIC_NEST_API_PORT || "8787";
function resolveApi() {
  if (process.env.EXPO_PUBLIC_NEST_API_URL) return process.env.EXPO_PUBLIC_NEST_API_URL;
  const hostUri = Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(":")[0];
  // LAN: talk to the API port directly. Tunnel (any non-IP host): only the Expo port is exposed,
  // so go through the dev server, which forwards /api/* to the API (see metro.config.js).
  if (host) return /^(\d+\.){3}\d+$|^localhost$/.test(host) ? `http://${host}:${API_PORT}` : `https://${host}`;
  if (Platform.OS === "web" && typeof window !== "undefined") return `http://${window.location.hostname}:${API_PORT}`;
  return `http://${Platform.OS === "android" ? "10.0.2.2" : "localhost"}:${API_PORT}`;
}
const API = resolveApi();
async function api(path, body) {
  const userId = (await getMe()).id; // lets the backend tie queries to the user
  let res;
  try {
    res = await fetch(API + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, userId }),
    });
  } catch {
    throw new Error(
      `Can't reach the Nest server at ${API}. Start everything with "npm run dev" (or "npm run server" in a second terminal). In Expo tunnel mode, set EXPO_PUBLIC_NEST_API_URL.`,
    );
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.error || `Nest server error (${res.status})`);
  }
  return res.json();
}
// Setup (groups, cities, default search) comes from Supabase via the server.
let setup = null;
// Last live results, so saved items and details can resolve ids.
let live = { homes: [], roommates: [] };
// Dedupes the parallel homes + roommates calls only; refresh and retry always re-query.
let lastSearch = { key: "", at: 0, promise: null };
function search(goal) {
  const key = JSON.stringify(goal);
  if (lastSearch.key !== key || Date.now() - lastSearch.at > 2000) {
    const promise = api("/api/search", { goal, query: goal.rawPrompt }).then(
      (r) => {
        live = { homes: r.homes.map((m) => m.listing), roommates: r.roommates };
        return r;
      },
    );
    lastSearch = { key, at: Date.now(), promise };
    promise.catch(() => {
      if (lastSearch.promise === promise) lastSearch = { key: "", at: 0, promise: null };
    });
  }
  return lastSearch.promise;
}
const initial = {
  goal: null,
  draft: null,
  saved: { homes: [], people: [], events: [] },
  selectedId: null,
  mapMinimized: false,
  interests: [],
  homeArea: null,
  communityArea: null,
  profile: null,
  profileDraft: null,
};
let state = initial;
let hydrated;
let writes = Promise.resolve();
async function load() {
  if (!hydrated)
    hydrated = AsyncStorage.getItem(KEY).then(async (raw) => {
      if (raw) {
        try {
          state = { ...initial, ...JSON.parse(raw) };
        } catch {
          state = initial;
        }
      }
      // Carry the UI-only profile across the demo-to-live storage transition.
      // Demo search goals and fixture listing IDs must not replace live state.
      if (!state.profile && !state.profileDraft) {
        try {
          const legacy = JSON.parse(await AsyncStorage.getItem("nest.demo.v1"));
          if (legacy?.profile || legacy?.profileDraft) {
            state = { ...state, profile: legacy.profile ?? null, profileDraft: legacy.profileDraft ?? null };
            await AsyncStorage.setItem(KEY, JSON.stringify(state));
          }
        } catch {
          // An unreadable legacy draft must not block the live app.
        }
      }
      if (isSupabaseConfigured) {
        try {
          const remoteGoal = await getNestPreferences();
          if (
            remoteGoal &&
            (!state.goal || remoteGoal.updatedAt > state.goal.updatedAt)
          ) {
            state = { ...state, goal: remoteGoal, draft: remoteGoal };
          }
        } catch (error) {
          console.warn("Could not load Nest preferences from Supabase.", error);
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
  getIdentity: getMe,
  saveProfile: async (profile) => {
    const identity = await getMe();
    const confirmed = prepareProfile({ ...emptyProfile, ...profile }, identity.id);
    await patch({ profile: confirmed, profileDraft: null });
    return confirmed;
  },
  loadSetup: async () => (setup = await api("/api/setup", {})),
  getSetup: () => {
    if (!setup) throw new Error("Nest setup has not loaded yet");
    return {
      defaultGoal: setup.defaultGoal,
      sources: setup.sources,
      cities: setup.cities,
      areas: setup.neighborhoodsByCity[setup.defaultGoal.city] || [],
      interests: ["Markets", "Tennis", "Weekend coffee", "Hiking", "Board games"],
    };
  },
  // Muse interprets the query on the server. Works for any city.
  interpretGoal: async (raw, base = setup?.defaultGoal) => {
    const { goal, missing } = await api("/api/interpret", { text: raw, base });
    return { goal, missing };
  },
  saveGoal: async (goal) => {
    const confirmed = { ...goal, updatedAt: new Date().toISOString() };
    await patch({ goal: confirmed, draft: confirmed });
    // Keep local saves usable when cloud sync fails, and report the outcome.
    let persistence = "local";
    if (isSupabaseConfigured) {
      try {
        await saveNestPreferences(confirmed);
        persistence = "synced";
      } catch {
        persistence = "local-only";
      }
    }
    return { ...confirmed, persistence };
  },
  getGoal: async () => (await load()).goal,
  saveDraft: (draft) => patch({ draft }),
  // Live results: everything Muse extracted from the user's groups, read from Supabase by the server.
  // Everything Muse extracted from the groups, read from Supabase by the server.
  getHomeMatches: async (goal) => (await search(goal)).homes,
  getRoommateMatches: async (goal) => (await search(goal)).roommates,
  getCommunity: async (goal) => ({events:(await fetchEvents(supabase)).filter(e=>eligible(e,goal)),people:[],fetchedAt:new Date().toISOString()}),
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
    let savedEvents=[];
    if(saved.events.length){
      try{savedEvents=await fetchEvents(supabase,saved.events);}
      catch{savedEvents=saved.events.map(id=>({id,title:'Unable to load event. Reopen Saved to retry.',unavailable:true}));}
    }
    return [
      ...live.homes
        .filter((x) => saved.homes.includes(x.id))
        .map((x) => ({ ...x, kind: "home", label: x.title })),
      ...[...live.roommates, ...people]
        .filter((x) => saved.people.includes(x.id))
        .map((x) => ({ ...x, kind: "person", label: x.name })),
      ...savedEvents
        .map((x) => ({ ...x, kind: "event", label: x.title })),
    ];
  },
};
