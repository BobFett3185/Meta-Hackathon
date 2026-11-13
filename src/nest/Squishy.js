import React, { createContext, useContext, useEffect, useRef } from "react";
import { Animated, Image, Platform, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { defaultAppearance } from "./profileData";

export const SquishyContext = createContext(defaultAppearance);
export const squishyColors = [
  { id: "periwinkle", name: "Periwinkle", swatch: "#AAA8ED", tint: null },
  { id: "rose", name: "Rose", swatch: "#CFABCB", tint: "#ECA7BD" },
  { id: "seafoam", name: "Seafoam", swatch: "#96BCC3", tint: "#7BD5B3" },
];
// Native keeps the user's approved asset; web uses the clean alpha cutout.
const source =
  Platform.OS === "web"
    ? require("./assets/squishy-web-cutout.png")
    : require("./assets/squishy-smile.png");

export default function Squishy({
  size = 48,
  appearance,
  mood = "resting",
  interactive,
  onPress,
  label = "Give Nest a squish",
  reduced = false,
}) {
  const inherited = useContext(SquishyContext);
  const look = appearance || inherited;
  const color =
    squishyColors.find((c) => c.id === look?.color) || squishyColors[0];
  const motion = useRef(new Animated.Value(0)).current;
  const press = (value) => {
    if (reduced) return;
    Animated.spring(motion, {
      toValue: value,
      stiffness: 300,
      damping: 16,
      mass: 0.5,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  };
  useEffect(() => {
    if (mood !== "happy" || reduced) return;
    Animated.sequence([
      Animated.timing(motion, {
        toValue: 1,
        duration: 110,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.spring(motion, {
        toValue: 0,
        stiffness: 260,
        damping: 12,
        mass: 0.5,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]).start();
    return () => motion.stopAnimation();
  }, [mood, reduced]);
  const graphic = (
    <Animated.View
      style={{
        width: size * 1.16,
        height: size,
        transform: [
          {
            scaleX: motion.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.12],
            }),
          },
          {
            scaleY: motion.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0.84],
            }),
          },
          {
            rotate:
              mood === "curious"
                ? "-7deg"
                : mood === "thinking"
                  ? "7deg"
                  : "0deg",
          },
        ],
      }}
    >
      <Image
        source={source}
        resizeMode="stretch"
        style={{
          position: "absolute",
          width: size * 1.65,
          height: size * 1.15,
          left: -size * 0.25,
          top: -size * 0.06,
        }}
      />
      {color.tint && (
        <Image
          source={source}
          resizeMode="stretch"
          style={{
            position: "absolute",
            width: size * 1.65,
            height: size * 1.15,
            left: -size * 0.25,
            top: -size * 0.06,
            tintColor: color.tint,
            opacity: 0.25,
          }}
        />
      )}
      {look?.accessory !== "none" && look?.accessory && (
        <View
          style={{
            position: "absolute",
            right: size * 0.08,
            top: size * 0.13,
            transform: [{ rotate: "18deg" }],
          }}
        >
          <Ionicons
            name={
              { headphones: "headset", leaf: "leaf", coffee: "cafe" }[
                look.accessory
              ] || "leaf"
            }
            size={size * 0.28}
            color="#303565"
          />
        </View>
      )}
      {mood === "thinking" && (
        <View
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            flexDirection: "row",
            gap: 3,
          }}
        >
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                width: Math.max(3, size * 0.04),
                height: Math.max(3, size * 0.04),
                borderRadius: 10,
                backgroundColor: "#555A8A",
                opacity: 1 - i * 0.2,
              }}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
  return interactive || onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => press(1)}
      onPressOut={() => press(0)}
      style={{ width: size * 1.16, height: size, minHeight: 44, minWidth: 44 }}
    >
      {graphic}
    </Pressable>
  ) : (
    <View accessible={false} style={{ width: size * 1.16, height: size }}>
      {graphic}
    </View>
  );
}
