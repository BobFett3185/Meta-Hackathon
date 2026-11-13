import React, { useEffect, useRef, useState } from "react";
import { Animated, View, Pressable, StyleSheet } from "react-native";
import {
  Label,
  Icon,
  IconAction,
  Mascot,
  Sheet,
  Button,
  colors,
  money,
  useReducedMotion,
} from "./components";
import { lightHaptic } from "./feedback";

// An explicitly illustrated demo neighborhood, not an address or routing provider.
const positions = [
  { x: 48, y: 58 },
  { x: 79, y: 83 },
  { x: 80, y: 47 },
  { x: 24, y: 86 },
  { x: 19, y: 43 },
];
const blocks = [
  [4, 32, 22, 22, "#F5B7A1"],
  [32, 35, 24, 14, "#B5A9EF"],
  [64, 34, 29, 20, "#F4CF73"],
  [6, 64, 25, 29, "#C9B9EC"],
  [36, 67, 25, 26, "#F3B894"],
  [68, 65, 27, 29, "#F2D289"],
];
function Pin({ match, position, selected, onSelect, onGuide }) {
  const lift = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      lift.setValue(selected ? 1 : 0);
      return;
    }
    Animated.spring(lift, {
      toValue: selected ? 1 : 0,
      stiffness: 260,
      damping: 22,
      useNativeDriver: true,
    }).start();
  }, [selected, reduced]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: position.x + "%",
        top: position.y + "%",
        zIndex: selected ? 8 : 3,
        transform: [
          { translateX: -33 },
          {
            translateY: lift.interpolate({
              inputRange: [0, 1],
              outputRange: [-22, -27],
            }),
          },
        ],
      }}
    >
      {selected && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Squishy neighborhood guide"
          onPress={onGuide}
          style={{
            position: "absolute",
            right: -23,
            top: -28,
            width: 48,
            height: 48,
            zIndex: 3,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Mascot key={match.listingId} size={34} mood="happy" />
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={"Map pin " + money(match.listing.monthlyRent)}
        accessibilityState={{ selected }}
        aria-pressed={selected}
        onPress={() => {
          if (!selected) lightHaptic(reduced);
          onSelect(match.listingId);
        }}
        style={{
          minWidth: 66,
          minHeight: 48,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={[styles.pin, selected && { backgroundColor: colors.blue }]}
        >
          <Label
            style={{
              fontSize: 12,
              lineHeight: 18,
              fontWeight: "700",
              color: selected ? "#FFF" : "#273D48",
            }}
          >
            {money(match.listing.monthlyRent)}
          </Label>
        </View>
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            marginTop: 3,
            backgroundColor: selected ? colors.blue : "#4E6970",
            borderWidth: 1.5,
            borderColor: "#FFF",
          }}
        />
      </Pressable>
    </Animated.View>
  );
}
export default function NeighborhoodMap({
  matches,
  selectedId,
  onSelect,
  expanded,
  onExpand,
  onOpen,
}) {
  const [guide, setGuide] = useState(false);
  const selected =
    matches.find((m) => m.listingId === selectedId) || matches[0];
  const height = expanded ? 380 : 204;
  return (
    <View>
      <View style={styles.caption}>
        <View style={styles.legendDot} />
        <Label style={styles.captionText}>
          Illustrated neighborhood · sample locations
        </Label>
      </View>
      <View
        accessibilityLabel="Illustrated South Lake Union neighborhood"
        style={[styles.map, { height }]}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: "30%",
              backgroundColor: "#55CCE0",
            }}
          />
          <View
            style={{
              position: "absolute",
              left: "-5%",
              right: "-8%",
              top: "18%",
              height: "18%",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 70,
              backgroundColor: "#8ECF7D",
              transform: [{ rotate: "-4deg" }],
            }}
          />
          <View
            style={{
              position: "absolute",
              left: "-8%",
              right: "-8%",
              top: "27%",
              height: "15%",
              backgroundColor: "#FFF5D9",
              borderTopLeftRadius: 40,
              transform: [{ rotate: "-4deg" }],
            }}
          />
          {[
            [12, 12, 35],
            [43, 6, 24],
            [70, 15, 40],
          ].map(([x, y, w], i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: x + "%",
                top: y + "%",
                width: w,
                height: 2,
                borderRadius: 2,
                backgroundColor: "#B3F1F4",
              }}
            />
          ))}
          {blocks.map(([x, y, w, h, color], i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: x + "%",
                top: y + "%",
                width: w + "%",
                height: h + "%",
                borderRadius: 9,
                backgroundColor: color,
                transform: [{ rotate: "-4deg" }],
              }}
            >
              <View
                style={{
                  position: "absolute",
                  left: 5,
                  right: 5,
                  top: 5,
                  height: "30%",
                  borderRadius: 4,
                  backgroundColor: "#FFFFFF36",
                }}
              />
            </View>
          ))}
          <View
            style={{
              position: "absolute",
              left: "28%",
              top: "28%",
              width: 10,
              height: "80%",
              backgroundColor: "#FFF",
              transform: [{ rotate: "-4deg" }],
            }}
          />
          <View
            style={{
              position: "absolute",
              left: "62%",
              top: "27%",
              width: 11,
              height: "80%",
              backgroundColor: "#FFF",
              transform: [{ rotate: "-4deg" }],
            }}
          />
          <View
            style={{
              position: "absolute",
              left: -10,
              right: -10,
              top: "58%",
              height: 12,
              backgroundColor: "#FFF",
              transform: [{ rotate: "-4deg" }],
            }}
          />
          <View
            style={{
              position: "absolute",
              left: "4%",
              top: "55%",
              width: "20%",
              height: "17%",
              borderRadius: 12,
              backgroundColor: "#74BE78",
              transform: [{ rotate: "-4deg" }],
            }}
          />
          <Label
            style={{
              position: "absolute",
              left: 14,
              top: 10,
              fontSize: 12,
              lineHeight: 17,
              fontWeight: "700",
              color: "#174D61",
            }}
          >
            Lake Union
          </Label>
          <View
            style={{
              position: "absolute",
              left: "48%",
              top: "14%",
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Icon name="leaf" size={13} color="#285F3B" />
            <Label style={{ fontSize: 10, lineHeight: 14, color: "#285F3B" }}>
              Waterfront
            </Label>
          </View>
          {expanded && (
            <>
              <Label
                style={{
                  position: "absolute",
                  left: "36%",
                  top: "61%",
                  fontSize: 10,
                  color: "#666052",
                  transform: [{ rotate: "-4deg" }],
                }}
              >
                Neighborhood streets
              </Label>
              <View style={{ position: "absolute", left: "9%", top: "59%" }}>
                <Icon name="leaf" size={23} color="#285F3B" />
              </View>
            </>
          )}
        </View>
        {matches.map((match, i) => (
          <Pin
            key={match.listingId}
            match={match}
            position={positions[i % positions.length]}
            selected={selected?.listingId === match.listingId}
            onSelect={onSelect}
            onGuide={() => setGuide(true)}
          />
        ))}
        {onExpand && (
          <IconAction
            name="expand-outline"
            label="Expand map"
            onPress={onExpand}
            style={styles.expand}
          />
        )}
        {expanded && (
          <View pointerEvents="none" style={styles.compass}>
            <Icon name="navigate" size={17} color="#215465" />
            <Label style={{ fontSize: 10, color: "#215465" }}>N</Label>
          </View>
        )}
      </View>
      <Sheet
        visible={guide}
        onClose={() => setGuide(false)}
        title="A little look around"
        footer={
          selected && (
            <Button
              onPress={() => {
                setGuide(false);
                if (onOpen) onOpen(selected.listing);
                else onExpand?.();
              }}
            >
              {onOpen ? "View this home" : "Explore the map"}
            </Button>
          )
        }
      >
        <View style={{ alignItems: "center", paddingVertical: 12 }}>
          <Mascot size={94} mood="curious" />
        </View>
        <Label style={{ fontSize: 20, lineHeight: 26, fontWeight: "700" }}>
          {selected?.listing.neighborhood}
        </Label>
        <Label style={{ marginTop: 8 }}>{selected?.listing.title}</Label>
        <Label style={{ marginTop: 4, fontWeight: "700", color: colors.blue }}>
          {selected && money(selected.listing.monthlyRent)} / month
        </Label>
        <Label
          style={{
            marginTop: 16,
            color: colors.secondary,
            fontSize: 14,
            lineHeight: 21,
          }}
        >
          Explore the selected home's neighborhood. This illustrated preview
          uses sample locations; the exact address and walking distances need
          confirmation from the source.
        </Label>
      </Sheet>
    </View>
  );
}
const styles = StyleSheet.create({
  caption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  captionText: { fontSize: 11, lineHeight: 16, color: "#53666B" },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#28A9BC",
  },
  map: { borderRadius: 22, overflow: "hidden", backgroundColor: "#FFF5D9" },
  pin: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: "#FFF",
    shadowColor: "#234453",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  expand: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 48,
    height: 48,
    backgroundColor: "#FFFFFFF0",
    borderRadius: 14,
    zIndex: 10,
  },
  compass: {
    position: "absolute",
    right: 10,
    top: 10,
    alignItems: "center",
    padding: 8,
    backgroundColor: "#FFFFFFE8",
    borderRadius: 12,
  },
});
