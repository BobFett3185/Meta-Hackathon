import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  ActivityIndicator,
  BackHandler,
  Keyboard,
  Linking,
  Animated,
  LayoutAnimation,
} from "react-native";
import { nestService } from "./service";
import { selectedMatch } from "./matching";
import {
  Header,
  Tabs,
  Label,
  Icon,
  Button,
  Link,
  Sheet,
  MapAdapter,
  Bookmark,
  ui,
  colors,
  money,
  useReducedMotion,
  Mascot,
} from "./components";
import {
  Welcome,
  Homes,
  Roommates,
  HomeDetail,
  PersonDetail,
} from "./screens";
import Intake from "./Intake";
import Community, {EventDetails} from "./Community";
import {hasStay} from "./event-utils.mjs";
import { imageSource } from "./assets";
import Profile from "./ProfileScreen";
import { profileFromGoal, emptyProfile } from "./profileData";
import { SquishyContext } from "./Squishy";
import PhotoFlight from "./PhotoFlight";
import HomePhoto from "./HomePhoto";

// Loads the user's setup (groups, cities, default search) from Supabase before showing Nest.
export default function Nest(props) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const load = useCallback(() => {
    setError(null);
    nestService.loadSetup().then(() => setReady(true), (e) => setError(e.message));
  }, []);
  useEffect(load, [load]);
  if (error)
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 16 }}>
        <Label>{error}</Label>
        <Button onPress={load}>Try again</Button>
        <Button onPress={props.onExit}>Back</Button>
      </View>
    );
  if (!ready)
    return (
      <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
        <Label>Loading your communities…</Label>
      </View>
    );
  return <NestScreen {...props} />;
}

function NestScreen({ onExit }) {
  const [store, setStore] = useState(null);
  const [tab, setTab] = useState("Homes");
  const [route, setRoute] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [intake, setIntake] = useState(null);
  const [draft, setDraft] = useState(null);
  const [matches, setMatches] = useState([]);
  const [roommates, setRoommates] = useState([]);
  const [community, setCommunity] = useState({ events: [], people: [] });
  const [communityStatus,setCommunityStatus]=useState('idle');
  const [communityError,setCommunityError]=useState(null);
  const communityRequest=useRef(0),communityLoaded=useRef(false);
  const [status, setStatus] = useState("idle");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [notice, setNotice] = useState(null);
  const [savedItems, setSavedItems] = useState([]);
  const [message, setMessage] = useState("");
  const [interestDraft, setInterestDraft] = useState([]);
  const [identity, setIdentity] = useState(null);
  const [pendingGoal, setPendingGoal] = useState(null);
  const [flight, setFlight] = useState(null);
  const rootView = useRef(null);
  const rootOrigin = useRef({ x: 0, y: 0 });
  const homePhoto = useRef(null);
  const galleryPhoto = useRef(null);
  const homeReturn = useRef(null);
  const setup = useRef(nestService.getSetup()).current;
  const request = useRef(0);
  const noticeTimer = useRef(null);
  const welcomedToCommunity = useRef(false);
  const reduced = useReducedMotion();
  const openHome = (item, rect, returnRoute = null) => {
    galleryPhoto.current = rect || null;
    homePhoto.current = null;
    homeReturn.current = returnRoute;
    setFlight(null);
    if (rect && !reduced) setFlight({ from: rect, photo: item.photoUrls[0] });
    setRoute({ type: "home", item });
  };
  const closeHome = (visiblePhoto) => {
    setFlight(null);
    if (
      !reduced &&
      galleryPhoto.current &&
      visiblePhoto?.rect &&
      visiblePhoto.index === 0 &&
      visiblePhoto.rect.y >= rootOrigin.current.y + 50
    )
      setFlight({
        from: visiblePhoto.rect,
        to: galleryPhoto.current,
        photo: route.item.photoUrls[0],
      });
    setRoute(homeReturn.current);
    galleryPhoto.current = null;
    homePhoto.current = null;
  };
  const closeProfile = () => {
    setRoute(null);
    if (pendingGoal) {
      setPendingGoal(null);
      setIntake({ review: true });
    }
  };
  useEffect(() => {
    if (!flight) return;
    const timer = setTimeout(() => setFlight(null), 700);
    return () => clearTimeout(timer);
  }, [flight]);
  const tabFade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    tabFade.setValue(reduced ? 1 : 0.6);
    Animated.timing(tabFade, {
      toValue: 1,
      duration: reduced ? 0 : 150,
      useNativeDriver: true,
    }).start();
  }, [tab, reduced]);
  const toggleMap = () => {
    if (!reduced)
      LayoutAnimation.configureNext({
        duration: 220,
        update: { type: LayoutAnimation.Types.easeInEaseOut },
      });
    update({ mapMinimized: !store.mapMinimized });
  };
  const goal = store?.goal;
  const area =
    store?.communityArea ||
    store?.homeArea ||
    goal?.preferredNeighborhoods[0] ||
    setup.areas[0] ||
    goal?.city ||
    "";
  const notify = (text, undo, squishy = false) => {
    clearTimeout(noticeTimer.current);
    setNotice({ text, undo, squishy });
    noticeTimer.current = setTimeout(() => setNotice(null), 5000);
  };
  useEffect(() => () => clearTimeout(noticeTimer.current), []);
  useEffect(() => {
    let live = true;
    nestService
      .getIdentity()
      .then((me) => {
        if (live) setIdentity(me);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    setNotice(null);
  }, [tab, route]);
  useEffect(() => {
    if (tab === "Community" && !route && !welcomedToCommunity.current) {
      welcomedToCommunity.current = true;
      notify("Let's explore your new neighborhood.", null, true);
    }
  }, [tab, route]);
  const update = async (patch) => {
    setStore(await nestService.updateState(patch));
  };
  const fetchResults = useCallback(async (search, refreshing = false) => {
    const version = ++request.current;
    setStatus(refreshing ? "refresh" : "loading");
    try {
      const [homes, people] = await Promise.all([
        search.intent === "Roommate" ? [] : nestService.getHomeMatches(search),
        search.intent === "Home" ? [] : nestService.getRoommateMatches(search),
      ]);
      if (version !== request.current) return;
      setMatches(homes);
      setRoommates(people);
      setUpdatedAt(new Date().toISOString());
      setStatus("idle");
    } catch {
      if (version === request.current) setStatus("error");
    }
  }, []);
  useEffect(() => {
    let live = true;
    nestService
      .getState()
      .then((s) => {
        if (live) {
          setStore(s);
          setDraft(s.draft);
          if (s.goal) fetchResults(s.goal);
        }
      })
      .catch(() => {
        if (live) setStatus("storage-error");
      });
    return () => {
      live = false;
    };
  }, [fetchResults]);
  const refreshCommunity=useCallback(async()=>{
    const version=++communityRequest.current;
    if(!hasStay(goal)){setCommunity({events:[],people:[]});setCommunityStatus('idle');return;}
    setCommunityStatus(communityLoaded.current?'refresh':'loading');setCommunityError(null);
    try{const result=await nestService.getCommunity(goal);if(version===communityRequest.current){communityLoaded.current=result.events.length>0;setCommunity(result);setCommunityStatus('idle');}}
    catch(e){if(version===communityRequest.current){setCommunityError(e.message);setCommunityStatus('error');}}
  },[goal]);
  useEffect(()=>{++communityRequest.current;communityLoaded.current=false;setCommunity({events:[],people:[]});setCommunityStatus('loading');setCommunityError(null);},[goal]);
  useEffect(()=>{if(tab==='Community')refreshCommunity();return()=>{++communityRequest.current;};},[tab,refreshCommunity]);
  const closeIntake = () => {
    Keyboard.dismiss();
    setIntake(null);
  };
  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (Keyboard.isVisible()) {
        Keyboard.dismiss();
        return true;
      }
      if (intake) closeIntake();
      else if (sheet) setSheet(null);
      else if (route?.type === "profile") closeProfile();
      else if (route?.type === "home") closeHome();
      else if (route) setRoute(null);
      else onExit();
      return true;
    });
    return () => listener.remove();
  }, [intake, sheet, route, pendingGoal, onExit]);
  const changeDraft = (next) => {
    setDraft(next);
    nestService
      .saveDraft(next)
      .catch(() => notify("Could not save the draft on this device."));
  };
  const openIntake = ({ example, options = false } = {}) => {
    const next =
      example != null
        ? {
            ...setup.defaultGoal,
            intent: example === 1 ? "Roommate" : "Home",
            rawPrompt:
              example === 1
                ? `I’m moving to ${setup.defaultGoal.city}. Find a roommate with a budget of $${setup.defaultGoal.budgetAmount} per person.`
                : `I’m moving to ${setup.defaultGoal.city}. Find a room under $${setup.defaultGoal.budgetAmount} per person.`,
          }
        : draft ||
          goal || {
            ...setup.defaultGoal,
            intent: tab === "Roommates" ? "Roommate" : "Both",
          };
    changeDraft(
      !goal && tab === "Roommates" ? { ...next, intent: "Roommate" } : next,
    );
    setIntake({
      review: (!!goal && next.rawPrompt === goal.rawPrompt) || example != null,
      options,
    });
  };
  const finishSearch = async (value) => {
    const saved = await nestService.saveGoal(value);
    setStore((s) => ({ ...s, goal: saved, draft: saved }));
    setDraft(saved);
    setIntake(null);
    setRoute(null);
    setPendingGoal(null);
    if (tab !== "Community") setTab(value.intent === "Roommate" ? "Roommates" : "Homes");
    await fetchResults(saved);
    if (saved.persistence === "local-only")
      notify("Search saved on this device. Cloud sync is unavailable.");
  };
  const confirm = async (value) => {
    if (value.intent === "Home") return finishSearch(value);
    setPendingGoal(value);
    setIntake(null);
    setRoute({
      type: "profile",
      profile: profileFromGoal(store.profileDraft || store.profile, value),
    });
  };
  const save = async (kind, id) => {
    try {
      const before = store.saved[kind].includes(id);
      setStore(await nestService.setSaved(kind, id));
      notify(
        before ? "Removed from Saved" : "Saved",
        async () => {
          setStore(await nestService.setSaved(kind, id));
          setNotice(null);
        },
        !before,
      );
    } catch {
      notify("Could not save on this device. Please try again.");
    }
  };
  const openSaved = async () => {
    setSavedItems(await nestService.getSavedItems());
    setSheet({ type: "saved" });
  };
  const source = (item) =>
    item.sourceUrl
      ? Linking.openURL(item.sourceUrl).catch(() =>
          notify("Unable to open the source."),
        )
      : setSheet({ type: "source", item });
  const contact = (item) => {
    setMessage(
      `Hi! I’m interested in ${item.title || `connecting with ${item.name}`}. Is this still available?`,
    );
    setSheet({ type: "contact", item });
  };
  const criteria = (items) => setSheet({ type: "criteria", items });
  const selected = selectedMatch(matches, store?.selectedId);
  const onSelect = (id) => {
    // Selection paints immediately; device storage must never delay a swipe.
    setStore((s) => ({ ...s, selectedId: id }));
    nestService
      .updateState({ selectedId: id })
      .catch(() => notify("Could not save your selection."));
  };
  const onHome = (neighborhood) => setSheet({ type: "home", neighborhood });
  const demo = async (name) => {
    setSheet(null);
    setRoute(null);
    setTab("Homes");
    if (name === "New user") {
      setStore(await nestService.updateState({ goal: null, draft: null }));
      setDraft(null);
      setMatches([]);
      return;
    }
    const g = await nestService.saveGoal(setup.defaultGoal);
    setStore(await nestService.getState());
    setDraft(g);
    await fetchResults(g);
    if (name === "No results") setMatches([]);
    if (name === "Source error") setStatus("error");
    if (name === "Initial search loading") {
      setMatches([]);
      setStatus("loading");
    }
    if (name === "Refresh with existing results") setStatus("refresh");
  };
  if (!store)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 24,
          backgroundColor: colors.bg,
        }}
      >
        {status === "storage-error" ? (
          <>
            <Label>Could not read Nest’s saved data on this device.</Label>
            <Link onPress={onExit}>Back to Facebook</Link>
          </>
        ) : (
          <ActivityIndicator color={colors.blue} />
        )}
      </View>
    );
  let content;
  if (route?.type === "profile")
    content = (
      <Profile
        profile={
          route.profile ||
          store.profileDraft ||
          store.profile ||
          (goal ? profileFromGoal(emptyProfile, goal) : emptyProfile)
        }
        identity={identity}
        findingMatches={!!pendingGoal}
        onBack={closeProfile}
        onSave={async (profile) => {
          const savedProfile = await nestService.saveProfile(profile);
          setStore((s) => ({
            ...s,
            profile: savedProfile,
            profileDraft: null,
          }));
          if (pendingGoal) {
            await finishSearch(pendingGoal);
            notify("Profile saved on this device. Finding your people.");
          }
          return savedProfile;
        }}
        onDraft={(profileDraft) => {
          setStore((s) => ({ ...s, profileDraft }));
          nestService
            .updateState({ profileDraft })
            .catch(() =>
              notify("Could not save your profile draft on this device."),
            );
        }}
        onEditSearch={() => {
          setRoute(null);
          openIntake();
        }}
        onSaved={openSaved}
      />
    );
  else if (route?.type === "home")
    content = (
      <HomeDetail
        listing={route.item}
        goal={goal}
        match={matches.find((m) => m.listingId === route.item.id)}
        event={community.events[0]}
        saved={store.saved.homes.includes(route.item.id)}
        onSave={() => save("homes", route.item.id)}
        onBack={closeHome}
        onHeroReady={(rect) => {
          homePhoto.current = rect;
          setFlight((current) =>
            current && !current.to ? { ...current, to: rect } : current,
          );
        }}
        hideHero={!!flight}
        onCriteria={criteria}
        onSource={source}
        onEvent={(item) => setSheet({ type: "event", item })}
        onContact={contact}
        onHome={onHome}
      />
    );
  else if (route?.type === "person")
    content = (
      <PersonDetail
        person={route.item}
        saved={store.saved.people.includes(route.item.id)}
        onSave={() => save("people", route.item.id)}
        onBack={() => setRoute(null)}
        onCriteria={criteria}
        onSource={source}
        onContact={contact}
      />
    );
  else if (route?.type === "map")
    content = (
      <>
        <Header title={`Around ${area}`} onBack={() => setRoute(null)} />
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <MapAdapter
            matches={matches}
            selectedId={selected?.listingId}
            onSelect={onSelect}
            expanded
            onOpen={(item) => openHome(item, null, { type: "map" })}
          />
          {selected && (
            <View
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 20,
                backgroundColor: "#FFF",
                shadowColor: "#254858",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 2,
              }}
            >
              <View style={[ui.row, { gap: 12, alignItems: "center" }]}>
                <HomePhoto
                  uri={selected.listing.photoUrls[0]}
                  style={{ width: 82, height: 82, borderRadius: 14 }}
                />
                <View style={{ flex: 1 }}>
                  <Label
                    style={{ fontSize: 20, lineHeight: 25, fontWeight: "700" }}
                  >
                    {money(selected.listing.monthlyRent)} / month
                  </Label>
                  <Label
                    numberOfLines={2}
                    style={{ fontSize: 14, lineHeight: 19, marginTop: 3 }}
                  >
                    {selected.listing.title}
                  </Label>
                  <Label
                    style={{
                      fontSize: 12,
                      color: colors.secondary,
                      marginTop: 3,
                    }}
                  >
                    {selected.listing.neighborhood}
                  </Label>
                </View>
              </View>
              <Button
                style={{ marginTop: 16 }}
                onPress={() =>
                  openHome(selected.listing, null, { type: "map" })
                }
              >
                View home
              </Button>
            </View>
          )}
        </ScrollView>
      </>
    );
  const mainContent = (
    <>
      <Header
        onBack={onExit}
        onSaved={openSaved}
        onProfile={() => setRoute({ type: "profile" })}
        onDemo={__DEV__ ? () => setSheet({ type: "demo" }) : undefined}
      />
      <Tabs value={tab} onChange={setTab} />
      <Animated.View style={{ flex: 1, opacity: tabFade }}>
        {!goal && tab !== "Community" ? (
          <Welcome
            onAdd={() => openIntake()}
            onExample={(example) => openIntake({ example })}
          />
        ) : (
          <>
            {goal && (
              <View
                style={{ flex: 1, display: tab === "Homes" ? "flex" : "none" }}
              >
                <Homes
                  saved={store.saved.homes}
                  onSave={(id) => save("homes", id)}
                  goal={goal}
                  matches={matches}
                  selectedId={selected?.listingId}
                  onSelect={onSelect}
                  minimized={store.mapMinimized}
                  onMinimize={toggleMap}
                  onExpand={() => setRoute({ type: "map" })}
                  onOpen={openHome}
                  onEdit={() => openIntake()}
                  onSettings={() => openIntake({ options: true })}
                  status={status}
                  onRetry={() => fetchResults(goal, matches.length > 0)}
                  updatedAt={updatedAt}
                />
              </View>
            )}
            {goal && (
              <View
                style={{
                  flex: 1,
                  display: tab === "Roommates" ? "flex" : "none",
                }}
              >
                <Roommates
                  goal={goal}
                  people={roommates}
                  saved={store.saved.people}
                  onSave={(id) => save("people", id)}
                  onOpen={(item) => setRoute({ type: "person", item })}
                  onCriteria={criteria}
                  onEdit={() => openIntake()}
                />
              </View>
            )}
            <View
              style={{
                flex: 1,
                display: tab === "Community" ? "flex" : "none",
              }}
            >
              <Community
                goal={goal}
                interests={store.interests || []}
                status={communityStatus}
                error={communityError}
                onRefresh={refreshCommunity}
                onEdit={()=>openIntake()}
                onSaved={openSaved}
                area={area}
                community={community}
                onArea={() => setSheet({ type: "area" })}
                onInterests={() => {
                  setInterestDraft(store.interests);
                  setSheet({ type: "interests" });
                }}
                saved={store.saved}
                onSave={save}
                onEvent={(item) => setSheet({ type: "event", item })}
              />
            </View>
          </>
        )}
      </Animated.View>
    </>
  );
  const titles = {
    criteria: "All criteria",
    source: "Original post",
    contact: "Conversation preview",
    event: sheet?.item?.title,
    interests: "Your interests",
    area: "Choose your neighborhood",
    saved: "Saved",
    home: "Make this your home area?",
    demo: "Nest demo states",
  };
  return (
    <SquishyContext.Provider
      value={store.profile?.appearance || emptyProfile.appearance}
    >
      <View
        ref={rootView}
        onLayout={() =>
          rootView.current?.measureInWindow((x, y) => {
            rootOrigin.current = { x, y };
          })
        }
        style={{ flex: 1, backgroundColor: colors.bg }}
      >
        <View style={{ flex: 1, display: route ? "none" : "flex" }}>
          {mainContent}
        </View>
        {route && <View style={{ flex: 1 }}>{content}</View>}
        {flight && (
          <PhotoFlight
            key={`${flight.from.x}-${flight.from.y}-${route?.type || "return"}`}
            flight={flight}
            origin={rootOrigin.current}
            onDone={() => setFlight(null)}
          />
        )}
        {notice && (
          <View
            accessibilityLiveRegion="polite"
            style={{
              position: "absolute",
              bottom: 76,
              left: 20,
              right: 20,
              borderRadius: 12,
              paddingHorizontal: 16,
              backgroundColor: "#16181C",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              minHeight: 48,
            }}
          >
            {notice.squishy && (
              <View style={{ marginRight: 12, paddingVertical: 6 }}>
                <Mascot size={44} mood="happy" />
              </View>
            )}
            <Label style={{ color: "#FFF", flex: 1 }}>{notice.text}</Label>
            {notice.undo && (
              <Pressable
                accessibilityRole="button"
                onPress={notice.undo}
                style={{ padding: 12 }}
              >
                <Label style={{ color: "#FFF", fontWeight: "700" }}>Undo</Label>
              </Pressable>
            )}
          </View>
        )}
        {intake && (
          <Intake
            draft={draft}
            onDraft={changeDraft}
            onClose={closeIntake}
            onConfirm={confirm}
            initialReview={intake.review}
            initialOptions={intake.options}
          />
        )}
        <Sheet
          visible={!!sheet}
          onClose={() => setSheet(null)}
          title={titles[sheet?.type] || ""}
        >
          {sheet?.type === "criteria" &&
            sheet.items.map((c) => (
              <View
                key={c.criterionId}
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderColor: colors.divider,
                }}
              >
                <View style={ui.row}>
                  <Icon
                    name={
                      c.status === "matched"
                        ? "checkmark"
                        : c.status === "unknown"
                          ? "help-circle-outline"
                          : "close"
                    }
                  />
                  <Label style={{ fontWeight: "600", flex: 1 }}>
                    {c.label}
                  </Label>
                  <Label
                    style={{
                      fontSize: 13,
                      color:
                        c.status === "matched"
                          ? colors.secondary
                          : colors.unknown,
                    }}
                  >
                    {c.status === "matched"
                      ? "Matched"
                      : c.status === "unknown"
                        ? "Unknown"
                        : "Not matched"}
                  </Label>
                </View>
                <Label style={[ui.secondary, { marginTop: 4 }]}>
                  {c.evidence}
                </Label>
              </View>
            ))}
          {sheet?.type === "source" && (
            <>
              <Label style={{ fontWeight: "700", marginBottom: 12 }}>
                {sheet.item.sourceName}
              </Label>
              <Label>{sheet.item.originalPostText}</Label>
              {sheet.item.sources?.slice(1).map(source=><View key={source.postId} style={{marginTop:16}}><Label>{source.name}</Label><Label>{source.text}</Label></View>)}
            </>
          )}
          {sheet?.type === "contact" && (
            <>
              <Label style={{ fontWeight: "600" }}>
                {sheet.item.title || sheet.item.name}
              </Label>
              <Label style={[ui.secondary, { marginVertical: 12 }]}>
                Local-only preview. No message will be sent to anyone.
              </Label>
              <TextInput
                accessibilityLabel="Message draft"
                multiline
                value={message}
                onChangeText={setMessage}
                style={[ui.input, { minHeight: 140, textAlignVertical: "top" }]}
              />
              <Button
                style={{ marginTop: 16 }}
                onPress={() => {
                  setSheet(null);
                  notify("Preview closed. Nothing was sent.");
                }}
              >
                Done
              </Button>
            </>
          )}
          {sheet?.type === "event" && <EventDetails event={sheet.item} goal={goal} saved={store.saved.events.includes(sheet.item.id)} onSave={()=>save('events',sheet.item.id)} onSource={source}/>}
          {sheet?.type === "interests" && (
            <>
              {setup.interests.map((interest) => (
                <Pressable
                  key={interest}
                  accessibilityRole="checkbox"
                  accessibilityLabel={interest}
                  aria-checked={interestDraft.includes(interest)}
                  accessibilityState={{
                    checked: interestDraft.includes(interest),
                  }}
                  onPress={() =>
                    setInterestDraft((d) =>
                      d.includes(interest)
                        ? d.filter((x) => x !== interest)
                        : [...d, interest],
                    )
                  }
                  style={[
                    ui.row,
                    { minHeight: 48, justifyContent: "space-between" },
                  ]}
                >
                  <Label>{interest}</Label>
                  <Icon
                    name={
                      interestDraft.includes(interest)
                        ? "checkbox"
                        : "square-outline"
                    }
                    color={colors.blue}
                  />
                </Pressable>
              ))}
              <Button
                style={{ marginTop: 16 }}
                onPress={async () => {
                  await update({ interests: interestDraft });
                  setSheet(null);
                }}
              >
                Save
              </Button>
            </>
          )}
          {sheet?.type === "area" &&
            setup.areas.map((a) => (
              <Pressable
                key={a}
                accessibilityRole="button"
                onPress={async () => {
                  await update({ communityArea: a });
                  setSheet(null);
                }}
                style={[
                  ui.row,
                  { minHeight: 52, justifyContent: "space-between" },
                ]}
              >
                <Label>{a}</Label>
                {area === a && <Icon name="checkmark" color={colors.blue} />}
              </Pressable>
            ))}
          {sheet?.type === "saved" && (
            <>
              {!savedItems.length && <Label>No saved items yet.</Label>}
              {savedItems.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  onPress={() => {
                    setSheet(
                      item.kind === "event" ? { type: "event", item } : null,
                    );
                    if (item.kind === "home") openHome(item);
                    else if (item.kind !== "event")
                      setRoute({
                        type: item.kind,
                        item:
                          item.kind === "person"
                            ? roommates.find((p) => p.id === item.id) || item
                            : item,
                      });
                  }}
                  style={[
                    ui.row,
                    {
                      minHeight: 60,
                      borderBottomWidth: 1,
                      borderColor: colors.divider,
                    },
                  ]}
                >
                  <Label style={{ flex: 1 }}>{item.label}</Label>
                  <Icon name="chevron-forward" />
                </Pressable>
              ))}
            </>
          )}
          {sheet?.type === "home" && (
            <>
              <View style={{ alignItems: "center", marginBottom: 16 }}>
                <Mascot size={100} mood="happy" />
              </View>
              <Label>
                Use {sheet.neighborhood} for your community recommendations?
                This does not reserve or rent the listing.
              </Label>
              <Button
                style={{ marginTop: 20 }}
                onPress={async () => {
                  setStore(
                    await nestService.setHomeContext(sheet.neighborhood),
                  );
                  setSheet(null);
                  setRoute(null);
                  setTab("Community");
                  notify(
                    `Welcome to ${sheet.neighborhood}. Explore your neighborhood.`,
                  );
                }}
              >
                Confirm home area
              </Button>
            </>
          )}
          {sheet?.type === "demo" &&
            [
              "New user",
              "Current results",
              "Initial search loading",
              "Refresh with existing results",
              "No results",
              "Source error",
            ].map((name) => (
              <Link key={name} onPress={() => demo(name)}>
                {name}
              </Link>
            ))}
        </Sheet>
      </View>
    </SquishyContext.Provider>
  );
}
