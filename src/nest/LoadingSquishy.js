import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, Text, View } from "react-native";
import Squishy from "./Squishy";

export default function LoadingSquishy({ label = "Loading…", size = 64, light = false, style }) {
  const [reduced, setReduced] = useState(true);
  const hop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { mounted = false; listener.remove(); };
  }, []);
  useEffect(() => {
    if (reduced) { hop.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(hop, { toValue: 1, duration: 360, easing: Easing.out(Easing.quad), useNativeDriver: Platform.OS !== "web" }),
      Animated.timing(hop, { toValue: 0, duration: 360, easing: Easing.in(Easing.quad), useNativeDriver: Platform.OS !== "web" }),
      Animated.delay(200),
    ]));
    animation.start();
    return () => { animation.stop(); hop.setValue(0); };
  }, [hop, reduced]);
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={[{ alignItems: "center", justifyContent: "center", paddingVertical: 20 }, style]}>
    <Animated.View style={{ marginTop: 16, transform: [{ translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }) }] }}>
      <Squishy size={size} reduced={reduced} />
    </Animated.View>
    <Text style={{ marginTop: 16, color: light ? "#FFFFFF" : "#656B73", fontSize: 14, fontWeight: "600", textAlign: "center" }}>{label}</Text>
  </View>;
}
