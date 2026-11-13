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
/** Illustrative local map, deliberately independent of a live map SDK. */
export function MapAdapter({
  matches,
  selectedId,
  onSelect,
  expanded,
  onExpand,
}) {
  const pins = [
    { x: 49, y: 48 },
    { x: 73, y: 76 },
    { x: 80, y: 42 },
    { x: 39, y: 84 },
    { x: 24, y: 22 },
  ];
  return (
    <View
      accessibilityLabel="Illustrative map of South Lake Union"
      style={[ui.map, expanded && { height: 420 }]}
    >
      <View
        style={{
          position: "absolute",
          backgroundColor: "#BFE5FA",
          width: "36%",
          height: "70%",
          left: "48%",
          top: -25,
          borderBottomLeftRadius: 40,
          transform: [{ rotate: "-13deg" }],
        }}
      />
      {[12, 30, 49, 68, 88].map((x, i) => (
        <React.Fragment key={x}>
          <View
            style={{
              position: "absolute",
              width: 5,
              height: "130%",
              left: `${x}%`,
              top: -10,
              backgroundColor: "#FFF",
              transform: [{ rotate: "12deg" }],
            }}
          />
          <View
            style={{
              position: "absolute",
              height: 5,
              width: "110%",
              top: `${x}%`,
              backgroundColor: "#FFF",
              transform: [{ rotate: "-8deg" }],
            }}
          />
          {i < 3 && (
            <View
              style={{
                position: "absolute",
                width: 19,
                height: 25,
                backgroundColor: "#D8EBBC",
                left: `${x + 4}%`,
                top: `${20 + i * 23}%`,
                transform: [{ rotate: "12deg" }],
              }}
            />
          )}
        </React.Fragment>
      ))}
      <Label
        style={{
          position: "absolute",
          left: "57%",
          top: 12,
          fontSize: 13,
          lineHeight: 15,
          color: "#4D95C4",
        }}
      >
        Lake{"\n"}Union
      </Label>
      <Label
        style={{ position: "absolute", left: 12, bottom: 4, fontSize: 13 }}
      >
        Seattle
      </Label>
      {matches.map((m, i) => (
        <Pressable
          key={m.listingId}
          accessibilityRole="button"
          accessibilityLabel={`Map pin ${money(m.listing.monthlyRent)}`}
          accessibilityState={{ selected: selectedId === m.listingId }}
          aria-pressed={selectedId === m.listingId}
          onPress={() => onSelect(m.listingId)}
          style={{
            position: "absolute",
            left: `${pins[i % 5].x}%`,
            top: `${pins[i % 5].y}%`,
            transform: [{ translateX: -24 }, { translateY: -16 }],
            minHeight: 44,
            minWidth: 48,
            alignItems: "center",
          }}
        >
          <View
            style={[
              ui.pin,
              selectedId === m.listingId && { backgroundColor: colors.blue },
            ]}
          >
            <Label
              style={{
                fontSize: 13,
                lineHeight: 18,
                fontWeight: "700",
                color: selectedId === m.listingId ? "#FFF" : colors.text,
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
              backgroundColor:
                selectedId === m.listingId ? colors.blue : colors.text,
              marginTop: 2,
            }}
          />
        </Pressable>
      ))}
      {onExpand && (
        <IconAction
          style={ui.expandMap}
          name="expand-outline"
          label="Expand map"
          onPress={onExpand}
        />
      )}
    </View>
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
    height: 150,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#EEF0E7",
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
  expandMap: {
    position: "absolute",
    right: 4,
    top: 4,
    backgroundColor: "#FFF",
    borderRadius: 12,
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
