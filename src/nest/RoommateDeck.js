import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Image,
  Pressable,
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import {
  Label,
  Icon,
  Link,
  Mascot,
  colors,
  ui,
  money,
  dateRange,
  useReducedMotion,
} from "./components";
import { imageSource } from "./assets";

// Swipe deck for roommate matches. Right = save, left = pass. Every gesture also has a real button,
// and nothing is sent to anyone: saving only bookmarks the person (connection requests are not built yet).

const SWIPE_DISTANCE = 110; // px dragged before a release counts as a decision
const SWIPE_VELOCITY = 0.6;
const MIN_FLICK = 55; // px a flick must travel before it counts
const FLY_MS = 220;
const web = Platform.OS === "web";

// Avatars come from a placeholder service as 150px thumbnails; ask for a larger one so a full-width photo stays sharp.
const hiRes = (url) => (typeof url === "string" ? url.replace(/(pravatar\.cc\/)\d+/, "$1600") : url);
const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

function situation(person) {
  if (person.seeking === "has_room") return { icon: "home-outline", text: "Has a room to fill" };
  if (person.seeking === "needs_room") return { icon: "people-outline", text: "Also looking for a place" };
  return { icon: "people-outline", text: "Looking for roommates" };
}

function Chip({ icon, text, tone = "plain", style }) {
  const palette =
    tone === "match"
      ? { bg: colors.pale, fg: colors.blue }
      : tone === "warn"
        ? { bg: "#FFF4E0", fg: colors.unknown }
        : { bg: colors.input, fg: colors.text };
  return (
    <View style={[styles.chip, { backgroundColor: palette.bg }, style]}>
      {icon ? <Icon name={icon} size={15} color={palette.fg} /> : null}
      <Label style={[styles.chipText, { color: palette.fg }]} numberOfLines={1}>
        {text}
      </Label>
    </View>
  );
}

function Photo({ person, height }) {
  const [failed, setFailed] = useState(false);
  const uri = person.photoUrl;
  if (!uri || failed)
    return (
      <View style={[styles.photo, styles.initialsBox, { height }]}>
        <Label style={styles.initials}>{initials(person.name)}</Label>
      </View>
    );
  return (
    <Image
      source={imageSource(hiRes(uri))}
      style={[styles.photo, { height }]}
      resizeMode="cover"
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  );
}

/** Soft dark fade behind text on a photo, built from stacked translucent slices (no gradient library needed). */
function Scrim({ height }) {
  const steps = 14;
  return (
    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height }} pointerEvents="none">
      {Array.from({ length: steps }, (_, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: `rgba(10,12,16,${(0.62 * (i + 1) / steps).toFixed(3)})` }} />
      ))}
    </View>
  );
}

/** One match card. Pure presentation: gestures and state live in the deck. */
function Card({ person, width, height, savedAlready }) {
  const photoHeight = Math.round(height * 0.5);
  const sit = situation(person);
  const unknown = person.criteria.filter((c) => c.status === "unknown");
  const matched = person.criteria.filter((c) => c.status === "matched");
  const clash = person.criteria.filter((c) => c.status === "not-matched");
  const area = person.preferredAreas?.[0];
  const subtitle = person.occupation || person.introduction;
  const traits = (person.traits || []).slice(0, 2);
  return (
    <View style={[styles.card, { width, height }]}>
      <View style={{ height: photoHeight }}>
        <Photo person={person} height={photoHeight} />
        <Scrim height={Math.round(photoHeight * 0.5)} />
        <View style={styles.photoTop} pointerEvents="none">
          <View style={styles.situation}>
            <Icon name={sit.icon} size={16} color={colors.blue} />
            <Label style={styles.situationText} numberOfLines={1}>
              {sit.text}
            </Label>
          </View>
          {savedAlready ? (
            <View style={styles.savedBadge}>
              <Icon name="bookmark" size={15} color="#FFF" />
            </View>
          ) : null}
        </View>
        <View style={styles.nameBlock} pointerEvents="none">
          <Label style={styles.name} numberOfLines={1}>
            {person.name}
          </Label>
          {subtitle ? (
            <Label style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Label>
          ) : null}
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.facts}>
          {person.budgetPerPerson ? <Chip icon="cash-outline" text={`${money(person.budgetPerPerson)} each`} /> : null}
          {person.dates?.[0] ? <Chip icon="calendar-outline" text={dateRange(person.dates[0], person.dates[1])} /> : null}
        </View>
        <View style={styles.facts}>
          {area ? <Chip icon="location-outline" text={area} /> : null}
          {clash.slice(0, 1).map((c) => (
            <Chip key={c.criterionId} icon="alert-circle" text={c.label} tone="warn" />
          ))}
          {unknown.length ? <Chip icon="help-circle-outline" text={`${unknown.length} not stated`} tone="warn" /> : null}
        </View>
        {traits.length ? (
          <View style={styles.facts}>
            {traits.map((t) => (
              <Chip key={t} text={t} style={{ maxWidth: "48%" }} />
            ))}
          </View>
        ) : null}
        <View style={styles.reasons}>
          {matched.slice(0, 3).map((c) => (
            <View key={c.criterionId} style={[ui.row, { gap: 6 }]}>
              <Icon name="checkmark-circle" size={18} color={colors.blue} />
              <Label style={styles.reasonText} numberOfLines={1}>
                {c.label}
              </Label>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function RoundButton({ icon, label, onPress, color = colors.text, size = 56, filled, disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.round,
        { width: size, height: size, borderRadius: size / 2 },
        filled && { backgroundColor: colors.blue },
        disabled && { opacity: 0.35 },
        pressed && { transform: [{ scale: 0.94 }], opacity: 0.8 },
      ]}
    >
      <Icon name={icon} size={size > 52 ? 26 : 22} color={filled ? "#FFF" : color} />
    </Pressable>
  );
}

export default function RoommateDeck({ people, saved, onSave, onOpen, onCriteria, onEdit, goal }) {
  const { width: windowWidth } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [decided, setDecided] = useState({}); // id -> "save" | "pass"
  const [history, setHistory] = useState([]); // [{ id, action, newlySaved }]
  const pan = useRef(new Animated.ValueXY()).current;
  const busy = useRef(false);
  const dragging = useRef(false); // true during a drag and for a moment after: the click that follows a drag must not open the profile

  // A new search brings a new set of people: start the deck over.
  const key = people.map((p) => p.id).join("|");
  useEffect(() => {
    setDecided({});
    setHistory([]);
    pan.setValue({ x: 0, y: 0 });
    busy.current = false;
  }, [key, pan]);

  const remaining = useMemo(() => people.filter((p) => !decided[p.id]), [people, decided]);
  const top = remaining[0];
  const cardW = Math.min(windowWidth - 40, 380);
  const cardH = Math.max(340, Math.min(540, area.h - 64));

  const decide = useCallback(
    (action) => {
      const person = remaining[0];
      if (!person) return;
      const already = saved.includes(person.id);
      // onSave toggles, so only call it when a right swipe would actually add the bookmark.
      const newlySaved = action === "save" && !already;
      if (newlySaved) onSave(person.id);
      setDecided((d) => ({ ...d, [person.id]: action }));
      setHistory((h) => [...h, { id: person.id, action, newlySaved }]);
      pan.setValue({ x: 0, y: 0 });
      busy.current = false;
    },
    [remaining, saved, onSave, pan],
  );

  const fly = useCallback(
    (action, velocity = 0) => {
      if (busy.current || !remaining[0]) return;
      busy.current = true;
      const toX = (action === "save" ? 1 : -1) * windowWidth * 1.2;
      if (reduced) return decide(action);
      Animated.timing(pan.x, {
        toValue: toX,
        duration: Math.max(120, FLY_MS - Math.abs(velocity) * 40),
        useNativeDriver: false,
      }).start(() => decide(action));
    },
    [remaining, windowWidth, reduced, pan, decide],
  );

  const undo = useCallback(() => {
    if (busy.current) return;
    const last = history[history.length - 1];
    if (!last) return;
    if (last.newlySaved) onSave(last.id); // toggle back off
    setHistory((h) => h.slice(0, -1));
    setDecided((d) => {
      const next = { ...d };
      delete next[last.id];
      return next;
    });
  }, [history, onSave]);

  // The responder is created once; it reads the newest handlers through a ref.
  const latest = useRef({});
  latest.current = { fly, top, dragging };
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // Only claim clearly horizontal drags so the page can still scroll vertically and taps still open the profile.
      onMoveShouldSetPanResponder: (_, g) => {
        const claim = !!latest.current.top && Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4;
        if (claim) latest.current.dragging.current = true;
        return claim;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => pan.setValue({ x: g.dx, y: g.dy * 0.25 }),
      onPanResponderRelease: (_, g) => {
        setTimeout(() => (latest.current.dragging.current = false), 120);
        // a decision is a long drag, or a quick flick that still travelled a meaningful distance
        if (g.dx > SWIPE_DISTANCE || (g.dx > MIN_FLICK && g.vx > SWIPE_VELOCITY)) latest.current.fly("save", g.vx);
        else if (g.dx < -SWIPE_DISTANCE || (g.dx < -MIN_FLICK && g.vx < -SWIPE_VELOCITY)) latest.current.fly("pass", g.vx);
        else Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 7, useNativeDriver: false }).start();
      },
      onPanResponderTerminate: () => {
        setTimeout(() => (latest.current.dragging.current = false), 120);
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 7, useNativeDriver: false }).start();
      },
    }),
  ).current;

  const rotate = pan.x.interpolate({ inputRange: [-windowWidth, 0, windowWidth], outputRange: ["-14deg", "0deg", "14deg"] });
  const saveOpacity = pan.x.interpolate({ inputRange: [20, SWIPE_DISTANCE], outputRange: [0, 1], extrapolate: "clamp" });
  const passOpacity = pan.x.interpolate({ inputRange: [-SWIPE_DISTANCE, -20], outputRange: [1, 0], extrapolate: "clamp" });
  const nextScale = pan.x.interpolate({ inputRange: [-SWIPE_DISTANCE, 0, SWIPE_DISTANCE], outputRange: [1, 0.94, 1], extrapolate: "clamp" });

  // ---- empty states -------------------------------------------------------------------------------
  if (!people.length)
    return (
      <View style={styles.centerBox}>
        <Label>
          {goal.intent === "Home"
            ? "Your search is focused on homes. Choose Both to find roommates too."
            : "No roommates meet your shared preferences."}
        </Label>
        <Link onPress={onEdit}>Edit search</Link>
      </View>
    );

  if (!top) {
    const savedCount = people.filter((p) => saved.includes(p.id)).length;
    return (
      <View style={styles.centerBox}>
        <Mascot size={72} />
        <Label style={[ui.heading, { marginTop: 16, textAlign: "center" }]}>That’s everyone for now</Label>
        <Label style={[ui.secondary, { marginTop: 6, textAlign: "center" }]}>
          You saved {savedCount} of {people.length}. New posts appear here as they’re found.
        </Label>
        <View style={{ height: 20 }} />
        <Link onPress={undo}>Undo last</Link>
        <Link
          onPress={() => {
            setDecided({});
            setHistory([]);
          }}
        >
          Review everyone again
        </Link>
        <Link onPress={onEdit}>Edit search</Link>
      </View>
    );
  }

  // ---- deck ----------------------------------------------------------------------------------------
  const behind = remaining.slice(1, 3);
  return (
    <View style={{ flex: 1 }}>
      <View
        style={styles.stage}
        onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        <Label style={[ui.secondary, styles.counter]}>
          Match {people.length - remaining.length + 1} of {people.length} · swipe right to save, left to pass
        </Label>
        <View style={{ width: cardW, height: cardH }}>
          {behind
            .slice()
            .reverse()
            .map((p) => {
              const depth = remaining.indexOf(p); // 1 or 2
              return (
                <Animated.View
                  key={p.id}
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    { transform: [{ translateY: depth * 12 }, { scale: depth === 1 ? nextScale : 0.88 }] },
                  ]}
                >
                  <Card person={p} width={cardW} height={cardH} savedAlready={saved.includes(p.id)} />
                </Animated.View>
              );
            })}
          <Animated.View
            key={top.id}
            {...responder.panHandlers}
            style={[StyleSheet.absoluteFill, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }, web && styles.grab]}
            accessible
            accessibilityLabel={`${top.name}. ${top.introduction}`}
            accessibilityActions={[
              { name: "activate", label: "View profile" },
              { name: "magicTap", label: "Save" },
              { name: "escape", label: "Pass" },
            ]}
            onAccessibilityAction={(e) => {
              const a = e.nativeEvent.actionName;
              if (a === "magicTap") fly("save");
              else if (a === "escape") fly("pass");
              else onOpen(top);
            }}
          >
            <Pressable style={{ flex: 1 }} onPress={() => !dragging.current && onOpen(top)} accessibilityRole="button" accessibilityLabel={`View ${top.name}'s profile`}>
              <Card person={top} width={cardW} height={cardH} savedAlready={saved.includes(top.id)} />
            </Pressable>
            <Animated.View style={[styles.stamp, styles.stampSave, { opacity: saveOpacity }]} pointerEvents="none">
              <Label style={[styles.stampText, { color: colors.blue }]}>SAVE</Label>
            </Animated.View>
            <Animated.View style={[styles.stamp, styles.stampPass, { opacity: passOpacity }]} pointerEvents="none">
              <Label style={[styles.stampText, { color: colors.secondary }]}>PASS</Label>
            </Animated.View>
          </Animated.View>
        </View>
      </View>
      <View style={styles.actions}>
        <RoundButton icon="close" label="Pass" onPress={() => fly("pass")} color={colors.secondary} />
        <RoundButton icon="arrow-undo" label="Undo last swipe" onPress={undo} size={44} disabled={!history.length} />
        <RoundButton icon="list" label={`See all criteria for ${top.name}`} onPress={() => onCriteria(top.criteria)} size={44} />
        <RoundButton icon="bookmark" label={`Save ${top.name}`} onPress={() => fly("save")} filled />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 4 },
  counter: { marginBottom: 10, textAlign: "center" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  photo: { width: "100%", backgroundColor: colors.input },
  initialsBox: { alignItems: "center", justifyContent: "center", backgroundColor: colors.pale },
  initials: { fontSize: 56, lineHeight: 64, fontWeight: "700", color: colors.blue },
  photoTop: { position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between" },
  situation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,.94)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: "80%",
  },
  situationText: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: colors.text },
  savedBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" },
  nameBlock: { position: "absolute", left: 16, right: 16, bottom: 12 },
  name: { fontSize: 28, lineHeight: 34, fontWeight: "700", color: "#FFF", textShadowColor: "rgba(0,0,0,.35)", textShadowRadius: 6 },
  subtitle: { fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,.92)" },
  body: { flex: 1, padding: 14, paddingTop: 12, gap: 8, overflow: "hidden" },
  facts: { flexDirection: "row", flexWrap: "wrap", gap: 8, flexShrink: 0 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, maxWidth: "100%" },
  chipText: { fontSize: 13, lineHeight: 18, fontWeight: "500", flexShrink: 1 },
  reasons: { gap: 5, flexShrink: 1, overflow: "hidden" },
  reasonText: { fontSize: 14, lineHeight: 20, flexShrink: 1 },
  stamp: { position: "absolute", top: 72, borderWidth: 3, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: "rgba(255,255,255,.9)" },
  stampSave: { left: 20, borderColor: colors.blue, transform: [{ rotate: "-12deg" }] },
  stampPass: { right: 20, borderColor: colors.secondary, transform: [{ rotate: "12deg" }] },
  stampText: { fontSize: 24, lineHeight: 30, fontWeight: "800", letterSpacing: 1 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18, paddingVertical: 14 },
  round: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 8 },
  grab: { cursor: "grab", userSelect: "none" },
});
