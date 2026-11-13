import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Image,
  Animated,
  PanResponder,
  Pressable,
  useWindowDimensions,
  AccessibilityInfo,
  Platform,
} from "react-native";
import {
  Label,
  IconAction,
  Bookmark,
  ui,
  money,
  useReducedMotion,
} from "./components";
import { imageSource } from "./assets";
import { lightHaptic } from "./feedback";
import HomePhoto from "./HomePhoto";

export default function CircularGallery({
  matches,
  selectedId,
  onSelect,
  onOpen,
  saved,
  onSave,
}) {
  const [width, setWidth] = useState(390);
  const [front, setFront] = useState(0);
  const reduced = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const motion = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);
  const dragged = useRef(false);
  const generation = useRef(0);
  const drag = useRef({ origin: 0, dx: 0, ready: true, release: null });
  const suppressPressUntil = useRef(0);
  const frontRef = useRef(0);
  const images = useRef({});
  const latest = useRef({});
  const index = Math.max(
    0,
    matches.findIndex((m) => m.listingId === selectedId),
  );
  const cardWidth = Math.min(250, width * 0.64);
  const spacing = cardWidth * 0.64;
  const native = Platform.OS !== "web";
  const slots = useMemo(
    () =>
      Object.fromEntries(
        [-2, -1, 0, 1, 2].map((r) => {
          const interpolate = (outputRange) =>
            motion.interpolate({
              inputRange: [-2 - r, -1 - r, -r, 1 - r, 2 - r],
              outputRange,
              extrapolate: "clamp",
            });
          return [
            r,
            {
              copyOpacity: interpolate([0, 0, 1, 0, 0]),
              style: {
                opacity: interpolate([0, 1, 1, 1, 0]),
                transform: [
                  { perspective: 1000 },
                  {
                    translateX: Animated.multiply(
                      Animated.add(motion, r),
                      spacing,
                    ),
                  },
                  { translateY: interpolate([24, 16, -3, 16, 24]) },
                  { scale: interpolate([0.76, 0.87, 1, 0.87, 0.76]) },
                  {
                    rotateY: interpolate([
                      "12deg",
                      "6deg",
                      "0deg",
                      "-6deg",
                      "-12deg",
                    ]),
                  },
                  {
                    rotateZ: interpolate([
                      "-3deg",
                      "-1.5deg",
                      "0deg",
                      "1.5deg",
                      "3deg",
                    ]),
                  },
                ],
              },
            },
          ];
        }),
      ),
    [motion, spacing],
  );
  useLayoutEffect(() => {
    generation.current += 1;
    motion.stopAnimation();
    motion.setValue(0);
    busy.current = false;
    setFront(0);
  }, [selectedId, matches.length, width]);
  const settle = (direction, velocity = 0) => {
    if (busy.current || matches.length < 2) return;
    busy.current = true;
    const version = ++generation.current;
    const commit = () => {
      if (version !== generation.current) return;
      if (direction) {
        const next =
          matches[(index + direction + matches.length) % matches.length];
        onSelect(next.listingId);
        lightHaptic(reduced);
        AccessibilityInfo.announceForAccessibility(
          `Home ${((index + direction + matches.length) % matches.length) + 1} of ${matches.length}, ${money(next.listing.monthlyRent)} per month`,
        );
      } else {
        busy.current = false;
        setFront(0);
      }
    };
    if (reduced) {
      motion.setValue(0);
      commit();
      return;
    }
    Animated.spring(motion, {
      toValue: -direction,
      velocity: Math.max(-3, Math.min(3, velocity)),
      stiffness: 270,
      damping: 27,
      mass: 0.65,
      overshootClamping: true,
      restDisplacementThreshold: 0.005,
      restSpeedThreshold: 0.01,
      useNativeDriver: native,
    }).start(({ finished }) => {
      if (finished) commit();
      else if (version === generation.current) busy.current = false;
    });
  };
  latest.current = { settle, spacing, reduced, count: matches.length };
  useEffect(() => {
    const id = motion.addListener(({ value }) => {
      const next =
        latest.current.count === 2
          ? Math.abs(value) < 0.001
            ? 0
            : value < 0
              ? 1
              : -1
          : value < -0.5
            ? 1
            : value > 0.5
              ? -1
              : 0;
      if (next !== frontRef.current) {
        frontRef.current = next;
        setFront(next);
      }
    });
    return () => {
      generation.current += 1;
      motion.removeListener(id);
      motion.stopAnimation();
    };
  }, [motion]);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          latest.current.count > 1 &&
          Math.abs(g.dx) > 8 &&
          Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onPanResponderGrant: (_, g) => {
          dragged.current = true;
          const version = ++generation.current;
          busy.current = false;
          const initialDx = g.dx;
          drag.current = { origin: 0, dx: g.dx, ready: false, release: null };
          // Continue from the visible spring position, not from the old card center.
          motion.stopAnimation((value) => {
            if (version !== generation.current) return;
            const state = drag.current;
            state.origin = value - initialDx / latest.current.spacing;
            state.ready = true;
            if (!latest.current.reduced)
              motion.setValue(
                Math.max(
                  -1,
                  Math.min(1, state.origin + state.dx / latest.current.spacing),
                ),
              );
            state.release?.();
          });
        },
        onPanResponderMove: (_, g) => {
          drag.current.dx = g.dx;
          if (!drag.current.ready) return;
          const value = Math.max(
            -1,
            Math.min(1, drag.current.origin + g.dx / latest.current.spacing),
          );
          if (!latest.current.reduced) motion.setValue(value);
        },
        onPanResponderRelease: (_, g) => {
          const { dx, vx } = g;
          const release = () => {
            const travel =
              drag.current.origin * latest.current.spacing + dx + vx * 80;
            latest.current.settle(
              Math.abs(travel) > latest.current.spacing * 0.25
                ? travel < 0
                  ? 1
                  : -1
                : 0,
              (vx * 1000) / latest.current.spacing,
            );
          };
          if (drag.current.ready) release();
          else drag.current.release = release;
          dragged.current = false;
          suppressPressUntil.current = Date.now() + 180;
        },
        onPanResponderTerminate: () => {
          if (drag.current.ready) latest.current.settle(0);
          else drag.current.release = () => latest.current.settle(0);
          dragged.current = false;
          suppressPressUntil.current = Date.now() + 180;
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [motion],
  );
  const relative = (i) => {
    if (matches.length === 2) return i === index ? 0 : front || 1;
    let r = i - index;
    if (matches.length >= 3) {
      if (r > matches.length / 2) r -= matches.length;
      if (r < -matches.length / 2) r += matches.length;
    }
    return r;
  };
  return (
    <View>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[ui.gallery, { height: 278 + Math.max(0, fontScale - 1) * 180 }]}
        {...pan.panHandlers}
      >
        {matches.map((match, i) => {
          const r = relative(i);
          if (Math.abs(r) > 2) return null;
          const h = match.listing;
          return (
            <Animated.View
              key={h.id}
              pointerEvents={Math.abs(r) > 1 ? "none" : "auto"}
              style={[
                ui.galleryCard,
                slots[r].style,
                {
                  left: width / 2 - cardWidth / 2,
                  top: 12,
                  width: cardWidth,
                  zIndex: r === front ? 4 : r === 0 ? 3 : 2,
                },
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Home ${i + 1} of ${matches.length}, ${money(h.monthlyRent)} per month`}
                onPress={() => {
                  if (
                    busy.current ||
                    dragged.current ||
                    Date.now() < suppressPressUntil.current
                  )
                    return;
                  if (r) settle(r > 0 ? 1 : -1);
                  else if (images.current[h.id])
                    images.current[h.id].measureInWindow(
                      (x, y, width, height) =>
                        onOpen(h, { x, y, width, height }),
                    );
                  else onOpen(h);
                }}
              >
                <HomePhoto
                  ref={(node) => {
                    images.current[h.id] = node;
                  }}
                  uri={h.photoUrls[0]}
                  style={ui.galleryPhoto}
                />
                <View style={ui.galleryCopy}>
                  <Label
                    style={{
                      fontSize: 21,
                      lineHeight: 25,
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  >
                    {money(h.monthlyRent)}
                    {r === 0 && " / month"}
                  </Label>
                  <Animated.View style={{ opacity: slots[r].copyOpacity }}>
                    <Label
                      style={{
                        fontSize: 14,
                        lineHeight: 19,
                        textAlign: "center",
                      }}
                    >
                      {h.neighborhood}
                    </Label>
                    <Label
                      style={{
                        fontSize: 13,
                        lineHeight: 18,
                        textAlign: "center",
                      }}
                    >
                      {match.isDemoSample
                        ? "Sample listing"
                        : "Budget + dates match"}
                    </Label>
                  </Animated.View>
                </View>
              </Pressable>
              {r === 0 && (
                <View
                  style={{
                    position: "absolute",
                    right: 6,
                    top: 6,
                    backgroundColor: "rgba(255,255,255,.92)",
                    borderRadius: 12,
                  }}
                >
                  <Bookmark
                    saved={saved?.includes(h.id)}
                    onPress={() => onSave(h.id)}
                  />
                </View>
              )}
            </Animated.View>
          );
        })}
      </View>
      <Label style={ui.sourceCenter}>
        {matches[index]?.listing.sourceName}
      </Label>
      {matches.length > 1 && (
        <View style={[ui.row, { justifyContent: "center", gap: 12 }]}>
          <IconAction
            name="chevron-back"
            label="Previous home"
            onPress={() => settle(-1)}
          />
          <Label style={{ fontSize: 14 }}>
            {index + 1} of {matches.length}
          </Label>
          <IconAction
            name="chevron-forward"
            label="Next home"
            onPress={() => settle(1)}
          />
        </View>
      )}
    </View>
  );
}
