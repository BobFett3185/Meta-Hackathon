import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
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
  const latest = useRef({});
  const index = Math.max(
    0,
    matches.findIndex((m) => m.listingId === selectedId),
  );
  const cardWidth = Math.min(250, width * 0.64);
  const spacing = cardWidth * 0.64;
  const native = Platform.OS !== "web";
  useLayoutEffect(() => {
    motion.stopAnimation();
    motion.setValue(0);
    busy.current = false;
    setFront(0);
  }, [selectedId, matches.length, width]);
  const settle = (direction, velocity = 0) => {
    if (busy.current || matches.length < 2) return;
    if (direction && matches.length === 2) direction = index === 0 ? 1 : -1;
    busy.current = true;
    setFront(direction);
    const commit = () => {
      if (direction) {
        const next =
          matches[(index + direction + matches.length) % matches.length];
        onSelect(next.listingId);
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
      stiffness: 300,
      damping: 30,
      mass: 0.7,
      overshootClamping: true,
      restDisplacementThreshold: 0.005,
      restSpeedThreshold: 0.01,
      useNativeDriver: native,
    }).start(({ finished }) => {
      if (finished) commit();
      else busy.current = false;
    });
  };
  latest.current = { settle, spacing, reduced, count: matches.length };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          !busy.current &&
          latest.current.count > 1 &&
          Math.abs(g.dx) > 8 &&
          Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onPanResponderGrant: () => motion.stopAnimation(),
        onPanResponderMove: (_, g) => {
          const value = Math.max(
            -1,
            Math.min(1, g.dx / latest.current.spacing),
          );
          if (!latest.current.reduced) motion.setValue(value);
          setFront(value < -0.35 ? 1 : value > 0.35 ? -1 : 0);
        },
        onPanResponderRelease: (_, g) => {
          const travel = g.dx + g.vx * 80;
          latest.current.settle(
            Math.abs(travel) > latest.current.spacing * 0.25
              ? travel < 0
                ? 1
                : -1
              : 0,
            (g.vx * 1000) / latest.current.spacing,
          );
        },
        onPanResponderTerminate: () => latest.current.settle(0),
        onPanResponderTerminationRequest: () => true,
      }),
    [motion],
  );
  const relative = (i) => {
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
          const range = [-2 - r, -1 - r, -r, 1 - r, 2 - r];
          const interpolate = (outputRange) =>
            motion.interpolate({
              inputRange: range,
              outputRange,
              extrapolate: "clamp",
            });
          return (
            <Animated.View
              key={h.id}
              pointerEvents={Math.abs(r) > 1 ? "none" : "auto"}
              style={[
                ui.galleryCard,
                {
                  left: width / 2 - cardWidth / 2,
                  top: 12,
                  width: cardWidth,
                  zIndex: r === front ? 4 : r === 0 ? 3 : 2,
                  opacity: interpolate([0, 1, 1, 1, 0]),
                  transform: [
                    { perspective: 1000 },
                    {
                      translateX: Animated.multiply(
                        Animated.add(motion, r),
                        spacing,
                      ),
                    },
                    { translateY: interpolate([22, 12, 0, 12, 22]) },
                    { scale: interpolate([0.74, 0.84, 1, 0.84, 0.74]) },
                    {
                      rotateY: interpolate([
                        "20deg",
                        "10deg",
                        "0deg",
                        "-10deg",
                        "-20deg",
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
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Home ${i + 1} of ${matches.length}, ${money(h.monthlyRent)} per month`}
                onPress={() => {
                  if (!busy.current) r ? settle(r > 0 ? 1 : -1) : onOpen(h);
                }}
              >
                <Image
                  source={imageSource(h.photoUrls[0])}
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
                  <Animated.View
                    style={{ opacity: interpolate([0, 0, 1, 0, 0]) }}
                  >
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
                      {match.isDemoSample ? "Sample listing" : "Budget + dates match"}
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
