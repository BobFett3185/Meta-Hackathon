import React, { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { imageSource } from "./assets";

export default function PhotoFlight({ flight, origin, onDone }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!flight.to) return;
    Animated.timing(progress, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) onDone();
    });
    return () => progress.stopAnimation();
  }, [flight.to]);
  const to = flight.to || flight.from;
  const lerp = (a, b) =>
    progress.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", inset: 0, zIndex: 20 }}
    >
      <Animated.Image
        source={imageSource(flight.photo)}
        style={{
          position: "absolute",
          left: lerp(flight.from.x - origin.x, to.x - origin.x),
          top: lerp(flight.from.y - origin.y, to.y - origin.y),
          width: lerp(flight.from.width, to.width),
          height: lerp(flight.from.height, to.height),
          borderRadius: 22,
        }}
      />
    </View>
  );
}
