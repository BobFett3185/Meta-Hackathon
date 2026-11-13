import React, { forwardRef, useEffect, useState } from "react";
import { Image, View, Text, StyleSheet } from "react-native";
import { imageSource } from "./assets";

// Keep demo cards useful offline without silently presenting a substitute as a source photo.
export default forwardRef(function HomePhoto({ uri, style }, ref) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [uri]);
  useEffect(() => {
    if (loaded || failed) return;
    const timer = setTimeout(() => setFailed(true), 5000);
    return () => clearTimeout(timer);
  }, [uri, loaded, failed]);
  return (
    <View
      ref={ref}
      style={[style, { overflow: "hidden", backgroundColor: "#EAE7E1" }]}
    >
      <Image
        source={imageSource(failed ? "nest:bedroom" : uri)}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
      />
      {!loaded && !failed && (
        <Text
          style={{
            position: "absolute",
            bottom: 8,
            left: 10,
            fontSize: 12,
            color: "#656B73",
          }}
        >
          Loading photo…
        </Text>
      )}
      {failed && (
        <Text
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            backgroundColor: "#FFFFFFE8",
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 5,
            fontSize: 11,
            color: "#454A50",
          }}
        >
          Sample photo
        </Text>
      )}
    </View>
  );
});
