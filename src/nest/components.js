import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  Animated,
  AccessibilityInfo,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { imageSource } from "./assets";
export const colors = {
  bg: "#FAF9F6",
  surface: "#FFFFFF",
  blue: "#0866FF",
  text: "#16181C",
  secondary: "#656B73",
  divider: "#E6E8EB",
  input: "#F0F1F3",
  pale: "#EAF2FF",
  unknown: "#996000",
};
export const money = (value) => `$${value.toLocaleString("en-US")}`;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const ym = (d) =>
  /^\d{4}-\d{2}-\d{2}$/.test(d || "") ? { y: +d.slice(0, 4), m: +d.slice(5, 7) - 1 } : null;
/** "Jun–Aug 2027", "Dec 2026 – Jan 2027", "From Jun 2027", or "Dates not stated". */
export const dateRange = (start, end) => {
  const a = ym(start), b = ym(end);
  if (!a && !b) return "Dates not stated";
  if (a && !b) return `From ${MONTHS[a.m]} ${a.y}`;
  if (!a) return `Until ${MONTHS[b.m]} ${b.y}`;
  if (a.y !== b.y) return `${MONTHS[a.m]} ${a.y} – ${MONTHS[b.m]} ${b.y}`;
  return a.m === b.m ? `${MONTHS[a.m]} ${a.y}` : `${MONTHS[a.m]}–${MONTHS[b.m]} ${a.y}`;
};
export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => listener.remove();
  }, []);
  return reduced;
}
export function Label({ children, style, ...props }) {
  return (
    <Text {...props} style={[ui.body, style]}>
      {children}
    </Text>
  );
}
export function Icon({ name, size = 22, color = colors.text }) {
  return <Ionicons name={name} size={size} color={color} />;
}
export function IconAction({ name, label, onPress, color, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        ui.iconAction,
        style,
        pressed && { opacity: 0.55 },
      ]}
    >
      <Icon name={name} color={color} />
    </Pressable>
  );
}
export function Button({ children, onPress, disabled, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        ui.button,
        style,
        pressed && { backgroundColor: "#0757D9" },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Label style={ui.buttonText}>{children}</Label>
    </Pressable>
  );
}
export function Link({ children, onPress, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[{ minHeight: 44, justifyContent: "center" }, style]}
    >
      <Label style={{ color: colors.blue, fontWeight: "600" }}>
        {children}
      </Label>
    </Pressable>
  );
}
export function Mascot({ size = 42, interactive = false }) {
  const squish = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  const press = (value) => {
    if (reduced) return;
    Animated.spring(squish, {
      toValue: value,
      stiffness: value ? 450 : 240,
      damping: value ? 30 : 16,
      mass: 0.5,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };
  const graphic = (
    <Animated.View
      style={{
        transform: [
          {
            scaleX: squish.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.12],
            }),
          },
          {
            scaleY: squish.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.86],
            }),
          },
          {
            translateY: squish.interpolate({
              inputRange: [0, 1],
              outputRange: [0, size * 0.06],
            }),
          },
        ],
      }}
    >
      <Image
        source={require("./assets/mascot.png")}
        resizeMode="stretch"
        style={{
          width: size * 1.65,
          height: size * 1.15,
          position: "absolute",
          left: -size * 0.25,
          top: -size * 0.06,
        }}
      />
    </Animated.View>
  );
  if (interactive)
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Give Nest a squish"
        onPressIn={() => press(1)}
        onPressOut={() => press(0)}
        style={{ width: size * 1.16, height: size }}
      >
        {graphic}
      </Pressable>
    );
  return (
    <View
      accessible={false}
      style={{ width: size * 1.16, height: size, overflow: "visible" }}
    >
      {graphic}
    </View>
  );
}
export function Header({ onBack, title, onSaved, onDemo, children }) {
  return (
    <View style={ui.header}>
      <IconAction
        name="chevron-back"
        label={title ? "Back to your matches" : "Back to Facebook"}
        onPress={onBack}
      />
      <View style={[ui.row, { flexShrink: 1 }]}>
        {!title && <Icon name="logo-facebook" size={29} color={colors.blue} />}
        <Pressable
          style={{ flexShrink: 1 }}
          onLongPress={onDemo}
          delayLongPress={700}
        >
          <Label style={ui.wordmark}>{title || "Nest"}</Label>
        </Pressable>
      </View>
      <View style={{ flex: 1 }} />
      {children ||
        (onSaved && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Saved items"
            onPress={onSaved}
            style={ui.iconAction}
          >
            <Mascot size={48} />
          </Pressable>
        ))}
    </View>
  );
}
export function Tabs({
  value,
  onChange,
  choices = ["Homes", "Roommates", "Community"],
}) {
  return (
    <View style={ui.tabs}>
      {choices.map((t) => (
        <Pressable
          key={t}
          accessibilityRole="tab"
          accessibilityState={{ selected: t === value }}
          aria-selected={t === value}
          onPress={() => onChange(t)}
          style={ui.tab}
        >
          <Label
            style={{ fontSize: 14, fontWeight: value === t ? "700" : "500" }}
          >
            {t}
          </Label>
          {t === value && <View style={ui.underline} />}
        </Pressable>
      ))}
    </View>
  );
}
export function Sheet({ visible, onClose, title, children, footer }) {
  const reduced = useReducedMotion();
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduced ? "none" : "slide"}
      onRequestClose={() =>
        Keyboard.isVisible() ? Keyboard.dismiss() : onClose()
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={ui.overlay}
      >
        <Pressable
          accessibilityLabel="Close sheet"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={ui.sheet}>
          <View style={ui.handle} />
          <View style={ui.sheetHead}>
            <Label style={[ui.section, { flex: 1, flexShrink: 1 }]}>
              {title}
            </Label>
            <IconAction name="close" label="Close sheet" onPress={onClose} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer && <View style={ui.sheetFooter}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function Bookmark({ saved, onPress }) {
  return (
    <IconAction
      name={saved ? "bookmark" : "bookmark-outline"}
      label={saved ? "Unsave item" : "Save item"}
      onPress={onPress}
      color={saved ? colors.blue : colors.text}
    />
  );
}
export function Reasons({ criteria }) {
  return (
    <View style={{ gap: 4 }}>
      {criteria
        .filter((c) => c.status === "matched")
        .slice(0, 3)
        .map((c) => (
          <View
            key={c.criterionId}
            style={[ui.row, { gap: 8, alignItems: "flex-start" }]}
          >
            <Icon name="checkmark" size={21} />
            <Label style={{ flex: 1 }}>{c.label}</Label>
          </View>
        ))}
    </View>
  );
}
// Real, pannable map drawn from raster tiles, so it works in Expo Go and on web without a native map SDK.
// Pins sit at the coordinates Muse extracted, which are neighborhood-level, so the map says "approximate".
const TILE = 256;
const MIN_ZOOM = 9;
const MAX_ZOOM = 17;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const project = (lat, lng, zoom) => {
  const n = TILE * 2 ** zoom;
  const s = Math.sin((clamp(lat, -85, 85) * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * n,
    y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n,
  };
};
const unproject = (x, y, zoom) => {
  const n = TILE * 2 ** zoom;
  return {
    lng: (x / n) * 360 - 180,
    lat: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI,
  };
};
const located = (m) => !!(m.listing.latitude && m.listing.longitude);
/** The view that shows every located home with room for the pins and controls. */
function fitView(matches, width, height) {
  const pts = matches.filter(located).map((m) => project(m.listing.latitude, m.listing.longitude, 0));
  if (!pts.length) return null;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const room = Math.min(
    (width - 130) / Math.max(x1 - x0, 1e-9),
    (height - 110) / Math.max(y1 - y0, 1e-9),
  );
  // A single home, or several at one spot, gets a neighborhood-level view instead of maximum zoom.
  const zoom = clamp(Math.log2(Math.max(room, 1)), MIN_ZOOM, 15);
  // Price labels sit above their point, so centre slightly high to keep the top label inside the map.
  return { ...unproject((x0 + x1) / 2, (y0 + y1) / 2 - 12 / 2 ** zoom, 0), zoom };
}
export function MapAdapter({
  matches,
  selectedId,
  onSelect,
  expanded,
  onExpand,
}) {
  const [size, setSize] = useState(null);
  const [view, setViewState] = useState(null);
  const viewRef = useRef(null);
  const gesture = useRef(null);
  const frame = useRef(null);
  const setView = (next) => {
    viewRef.current = next;
    setViewState(next);
  };
  const animateTo = (target) => {
    cancelAnimationFrame(frame.current);
    const from = viewRef.current;
    if (!from) return setView(target);
    const started = Date.now();
    const step = () => {
      const p = Math.min(1, (Date.now() - started) / 220);
      const e = 1 - (1 - p) ** 3;
      setView({
        lat: from.lat + (target.lat - from.lat) * e,
        lng: from.lng + (target.lng - from.lng) * e,
        zoom: from.zoom + (target.zoom - from.zoom) * e,
      });
      if (p < 1) frame.current = requestAnimationFrame(step);
    };
    step();
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  // Frame all results whenever the result set (or the map size) changes.
  const ids = matches.map((m) => m.listingId).join("|");
  useEffect(() => {
    if (size) setView(fitView(matches, size.width, size.height));
  }, [ids, size?.width, size?.height]);
  // Bring a newly selected home into view if it is off-screen or under the controls.
  useEffect(() => {
    const v = viewRef.current;
    const m = matches.find((x) => x.listingId === selectedId);
    if (!v || !size || !m || !located(m)) return;
    const c = project(v.lat, v.lng, v.zoom);
    const p = project(m.listing.latitude, m.listing.longitude, v.zoom);
    const x = p.x - c.x + size.width / 2;
    const y = p.y - c.y + size.height / 2;
    if (x < 40 || x > size.width - 60 || y < 30 || y > size.height - 30)
      animateTo({ lat: m.listing.latitude, lng: m.listing.longitude, zoom: v.zoom });
  }, [selectedId]);
  const zoomBy = (delta) => {
    const v = viewRef.current;
    if (v) animateTo({ ...v, zoom: clamp(Math.round(v.zoom + delta), MIN_ZOOM, MAX_ZOOM) });
  };
  const recenter = () => {
    const target = size && fitView(matches, size.width, size.height);
    if (target) animateTo(target);
  };
  // One finger drags the map, two fingers pinch to zoom. Taps still reach the pins and buttons.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (e, g) =>
        (e.nativeEvent.touches?.length || 1) > 1 || Math.abs(g.dx) + Math.abs(g.dy) > 6,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        cancelAnimationFrame(frame.current);
        gesture.current = null;
      },
      onPanResponderMove: (e, g) => {
        const current = viewRef.current;
        if (!current) return;
        const touches = e.nativeEvent.touches || [];
        const fingers = touches.length > 1 ? 2 : 1;
        const spread =
          fingers === 2
            ? Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY)
            : 0;
        let start = gesture.current;
        // Re-anchor whenever a finger is added or lifted so the map never jumps.
        if (!start || start.fingers !== fingers)
          start = gesture.current = { fingers, dx: g.dx, dy: g.dy, spread, view: current };
        const zoom =
          fingers === 2 && start.spread
            ? clamp(start.view.zoom + Math.log2(spread / start.spread), MIN_ZOOM, MAX_ZOOM)
            : start.view.zoom;
        const c = project(start.view.lat, start.view.lng, zoom);
        setView({ ...unproject(c.x - (g.dx - start.dx), c.y - (g.dy - start.dy), zoom), zoom });
      },
      onPanResponderRelease: () => (gesture.current = null),
      onPanResponderTerminate: () => (gesture.current = null),
    }),
  ).current;

  const ready = size && view;
  const tiles = [];
  const pins = [];
  if (ready) {
    const { width, height } = size;
    const z = clamp(Math.round(view.zoom), MIN_ZOOM, MAX_ZOOM);
    const scale = 2 ** (view.zoom - z);
    const c = project(view.lat, view.lng, z);
    const count = 2 ** z;
    for (let x = Math.floor((c.x - width / 2 / scale) / TILE); x <= Math.floor((c.x + width / 2 / scale) / TILE); x++)
      for (let y = Math.floor((c.y - height / 2 / scale) / TILE); y <= Math.floor((c.y + height / 2 / scale) / TILE); y++) {
        if (y < 0 || y >= count) continue;
        const wrapped = ((x % count) + count) % count;
        tiles.push({
          key: `${z}/${x}/${y}`,
          uri: `https://tile.openstreetmap.org/${z}/${wrapped}/${y}.png`,
          left: width / 2 + (x * TILE - c.x) * scale,
          top: height / 2 + (y * TILE - c.y) * scale,
          size: TILE * scale + 0.5, // hairline overlap hides seams between tiles
        });
      }
    const centre = project(view.lat, view.lng, view.zoom);
    for (const m of matches.filter(located)) {
      const p = project(m.listing.latitude, m.listing.longitude, view.zoom);
      let x = p.x - centre.x + width / 2;
      let y = p.y - centre.y + height / 2;
      // Homes in one neighborhood share nearly the same point: spiral outwards until the price label is clear
      // of the ones already placed, so each stays readable and tappable. Zooming in pulls them apart for real.
      const ax = x;
      const ay = y;
      for (let k = 1; k < 40 && pins.some((o) => Math.abs(o.x - x) < 54 && Math.abs(o.y - y) < 26); k++) {
        x = ax + Math.cos(k * 2.4) * 16 * Math.sqrt(k);
        y = ay + Math.sin(k * 2.4) * 12 * Math.sqrt(k);
      }
      pins.push({ m, x, y });
    }
  }
  const unlocated = matches.length - matches.filter(located).length;
  const place = matches[0]?.listing.city && matches[0].listing.city !== "Unknown" ? matches[0].listing.city : "your area";
  return (
    <View
      accessibilityLabel={`Map of homes in ${place}. Drag to move, pinch or use the buttons to zoom.`}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (!size || size.width !== width || size.height !== height) setSize({ width, height });
      }}
      style={[ui.map, expanded && { height: 420 }]}
      {...pan.panHandlers}
    >
      {tiles.map((t) => (
        <Image
          key={t.key}
          source={{ uri: t.uri }}
          fadeDuration={0}
          style={{ position: "absolute", left: t.left, top: t.top, width: t.size, height: t.size }}
        />
      ))}
      {pins.map(({ m, x, y }) => {
        const active = selectedId === m.listingId;
        return (
          <Pressable
            key={m.listingId}
            accessibilityRole="button"
            accessibilityLabel={`Map pin ${money(m.listing.monthlyRent)}, ${m.listing.neighborhood}`}
            accessibilityState={{ selected: active }}
            aria-pressed={active}
            onPress={() => onSelect(m.listingId)}
            style={{
              position: "absolute",
              left: x,
              top: y,
              zIndex: active ? 2 : 1,
              transform: [{ translateX: -24 }, { translateY: -26 }],
              minHeight: 44,
              minWidth: 48,
              alignItems: "center",
            }}
          >
            <View style={[ui.pin, active && { backgroundColor: colors.blue }]}>
              <Label
                style={{
                  fontSize: 13,
                  lineHeight: 18,
                  fontWeight: "700",
                  color: active ? "#FFF" : colors.text,
                }}
              >
                {money(m.listing.monthlyRent)}
              </Label>
            </View>
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: active ? colors.blue : colors.text,
                marginTop: 2,
              }}
            />
          </Pressable>
        );
      })}
      <Label style={ui.mapCredit}>
        {ready && !pins.length
          ? "These posts don't say where the home is · "
          : `Approximate locations${unlocated ? ` · ${unlocated} without a location` : ""} · `}
        © OpenStreetMap contributors
      </Label>
      <View style={ui.mapControls}>
        {onExpand && (
          <MapButton name="expand-outline" label="Expand map" onPress={onExpand} style={{ marginBottom: 8 }} />
        )}
        <MapButton name="add" label="Zoom in" onPress={() => zoomBy(1)} disabled={!view || view.zoom >= MAX_ZOOM} style={ui.mapButtonTop} />
        <MapButton name="remove" label="Zoom out" onPress={() => zoomBy(-1)} disabled={!view || view.zoom <= MIN_ZOOM} style={ui.mapButtonBottom} />
        <MapButton name="locate-outline" label="Show all homes" onPress={recenter} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}
function MapButton({ name, label, onPress, disabled, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [ui.mapButton, style, pressed && { backgroundColor: colors.input }]}
    >
      <Icon name={name} size={20} color={disabled ? "#B4B9C0" : colors.text} />
    </Pressable>
  );
}
export const ui = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 22, color: colors.text },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  section: { fontSize: 20, lineHeight: 25, fontWeight: "700" },
  heading: { fontSize: 24, lineHeight: 30, fontWeight: "700" },
  secondary: { fontSize: 14, lineHeight: 20, color: colors.secondary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 58,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 0,
  },
  wordmark: { fontSize: 24, lineHeight: 29, fontWeight: "700" },
  iconAction: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: { height: 48, flexDirection: "row", marginHorizontal: 20 },
  tab: { flex: 1, alignItems: "center", justifyContent: "center" },
  underline: {
    height: 3,
    width: 56,
    borderRadius: 2,
    backgroundColor: colors.blue,
    position: "absolute",
    bottom: 2,
  },
  button: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.blue,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 16,
    lineHeight: 22,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,.32)",
  },
  sheet: {
    maxHeight: "94%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 20 : 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: -3 },
    elevation: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBCCD0",
    alignSelf: "center",
    marginBottom: 4,
  },
  sheetHead: {
    paddingLeft: 20,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
  },
  sheetFooter: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  gallery: { height: 278, overflow: "hidden", marginHorizontal: -20 },
  galleryCard: {
    position: "absolute",
    minHeight: 250,
    backgroundColor: "#FFF",
    borderRadius: 22,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  galleryPhoto: {
    height: 155,
    width: "100%",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  galleryCopy: { paddingHorizontal: 4, paddingVertical: 10, minHeight: 95 },
  sourceCenter: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    color: colors.secondary,
  },
  map: {
    height: 220,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#EEF0E7",
  },
  mapControls: { position: "absolute", right: 8, top: 8, zIndex: 3 },
  mapButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  mapButtonTop: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  mapButtonBottom: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  mapCredit: {
    position: "absolute",
    left: 6,
    bottom: 3,
    zIndex: 3,
    fontSize: 10,
    lineHeight: 14,
    color: colors.secondary,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 6,
    paddingHorizontal: 5,
  },
  pin: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  input: {
    padding: 16,
    backgroundColor: colors.input,
    borderRadius: 16,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 16 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: colors.bg,
  },
});
