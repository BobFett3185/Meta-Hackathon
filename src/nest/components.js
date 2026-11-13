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
import Squishy from "./Squishy";
import { lightHaptic } from "./feedback";
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
export function Mascot(props) {
  const reduced = useReducedMotion();
  return <Squishy {...props} reduced={reduced} />;
}
export function Header({
  onBack,
  title,
  onSaved,
  onProfile,
  onDemo,
  children,
}) {
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
        ((onSaved || onProfile) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={onProfile ? "Your Nest profile" : "Saved items"}
            onPress={onProfile || onSaved}
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
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <IconAction
        name={saved ? "bookmark" : "bookmark-outline"}
        label={saved ? "Unsave item" : "Save item"}
        onPress={() => {
          lightHaptic(reduced);
          if (!reduced)
            Animated.sequence([
              Animated.timing(scale, {
                toValue: 0.8,
                duration: 80,
                useNativeDriver: true,
              }),
              Animated.spring(scale, {
                toValue: 1,
                stiffness: 320,
                damping: 14,
                useNativeDriver: true,
              }),
            ]).start();
          onPress();
        }}
        color={saved ? colors.blue : colors.text}
      />
    </Animated.View>
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
export { default as MapAdapter } from "./NeighborhoodMap";
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
