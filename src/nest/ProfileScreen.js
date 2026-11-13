import React, { useState, useRef, useEffect } from "react";
import {
  View,
  ScrollView,
  TextInput,
  Image,
  Pressable,
  Switch,
  StyleSheet,
} from "react-native";
import {
  Header,
  Label,
  Button,
  Link,
  Icon,
  Mascot,
  Sheet,
  ui,
  colors,
} from "./components";
import { emptyProfile } from "./profileData";
import { squishyColors } from "./Squishy";

export function ProfileCard({ profile, identity, preview = false }) {
  const housing = profile.housing;
  return (
    <View>
      <View style={styles.hero}>
        <View style={styles.orbit} />
        <Mascot size={142} appearance={profile.appearance} interactive />
        {identity?.avatar_url && (
          <Image
            source={{ uri: identity.avatar_url }}
            accessibilityLabel={`${identity.name}'s profile photo`}
            style={styles.avatar}
          />
        )}
      </View>
      <Label style={[ui.heading, { textAlign: "center" }]}>
        {identity?.name || "Your Nest profile"}
      </Label>
      <Label
        style={[
          ui.secondary,
          { textAlign: "center", marginTop: 4, marginBottom: 24 },
        ]}
      >
        {housing?.city
          ? `Finding my people in ${housing.city}`
          : "A little about you. A place to belong."}
      </Label>
      <Label style={{ fontSize: 17, lineHeight: 25 }}>
        {profile.introduction ||
          "Your introduction belongs here. Tell future roommates a little about yourself."}
      </Label>
      {housing && (
        <View style={styles.facts}>
          <View style={ui.row}>
            <Icon name="location-outline" size={18} color="#555A8A" />
            <Label style={ui.secondary}>
              {housing.neighborhoods.join(", ")}
            </Label>
          </View>
          <View style={ui.row}>
            <Icon name="calendar-outline" size={18} color="#555A8A" />
            <Label style={[ui.secondary, { flex: 1 }]}>
              {housing.startDate} to {housing.endDate}
            </Label>
          </View>
          <Label style={ui.secondary}>
            ${housing.budgetAmount?.toLocaleString()} / month ·{" "}
            {housing.budgetBasis === "person" ? "per person" : "whole home"}
          </Label>
          <Label style={ui.secondary}>
            {housing.alreadyHasHome ? "Have a place" : "Looking for a place"} ·{" "}
            {housing.roommateCount || 1} roommate
            {housing.roommateCount > 1 ? "s" : ""}
          </Label>
        </View>
      )}
      <Label style={styles.section}>About me</Label>
      <Label style={!profile.aboutMe && ui.secondary}>
        {profile.aboutMe || "Living habits and interests not added yet."}
      </Label>
      <Label style={styles.section}>Looking for</Label>
      <Label style={!profile.lookingFor && ui.secondary}>
        {profile.lookingFor || "Roommate preferences not added yet."}
      </Label>
      {!!profile.desiredPreferences?.length && (
        <View style={styles.tags}>
          {profile.desiredPreferences.map((p) => (
            <View key={p} style={styles.tag}>
              <Label style={{ fontSize: 13, color: "#454A77" }}>{p}</Label>
            </View>
          ))}
        </View>
      )}
      <View style={[ui.row, { marginTop: 24, alignItems: "flex-start" }]}>
        <Icon name="shield-checkmark-outline" size={18} color="#555A8A" />
        <Label style={[ui.secondary, { flex: 1 }]}>
          {profile.visibility === "roommates"
            ? "Roommate visibility selected. This demo saves your choice on this device; it does not publish your profile."
            : "Private profile. Only saved on this device."}
          {preview ? " Review before saving." : ""}
        </Label>
      </View>
    </View>
  );
}

export default function Profile({
  profile,
  identity,
  onBack,
  onSave,
  onDraft,
  onEditSearch,
  onSaved,
  findingMatches = false,
}) {
  const [editing, setEditing] = useState(findingMatches || !profile?.updatedAt);
  const [draft, setDraft] = useState({ ...emptyProfile, ...profile });
  const [preview, setPreview] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [appearance, setAppearance] = useState(draft.appearance);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const scroll = useRef(null);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [preview, editing]);
  const change = (patch) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    onDraft?.(next);
    setSaved(false);
  };
  const save = async () => {
    setPending(true);
    setError("");
    try {
      const result = await onSave(draft);
      setDraft(result);
      setEditing(false);
      setPreview(false);
      setSaved(true);
    } catch (e) {
      setError(e.message || "Could not save your profile. Please try again.");
    } finally {
      setPending(false);
    }
  };
  const input = (title, key, hint) => (
    <View style={{ marginTop: 20 }}>
      <Label style={{ fontWeight: "700", marginBottom: 6 }}>{title}</Label>
      <Label style={[ui.secondary, { marginBottom: 8 }]}>{hint}</Label>
      <TextInput
        accessibilityLabel={title}
        multiline
        textAlignVertical="top"
        maxLength={2000}
        value={draft[key]}
        onChangeText={(value) => change({ [key]: value })}
        style={[ui.input, { minHeight: 104 }]}
      />
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title={preview ? "Preview your profile" : "Your Nest profile"}
        onBack={onBack}
      />
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
      >
        {editing && !preview ? (
          <>
            <View style={{ alignItems: "center", paddingVertical: 8 }}>
              <Mascot size={110} appearance={draft.appearance} interactive />
              <Link
                onPress={() => {
                  setAppearance(draft.appearance);
                  setCustomizing(true);
                }}
              >
                Customize Squishy
              </Link>
            </View>
            <Label style={ui.heading}>Make yourself at home.</Label>
            <Label style={[ui.secondary, { marginTop: 6 }]}>
              A little personality helps people picture living with you.
            </Label>
            {input(
              "Your introduction",
              "introduction",
              "Who are you, and what brings you here?",
            )}
            {input(
              "About me",
              "aboutMe",
              "Your routine, sleep schedule, cleanliness, pets, and interests.",
            )}
            {input(
              "What I'm looking for",
              "lookingFor",
              "Describe the roommate and home atmosphere you'd enjoy.",
            )}
            {!!draft.originalText && (
              <View style={{ marginTop: 20 }}>
                <Label style={{ fontWeight: "700", marginBottom: 6 }}>
                  Your original moving goal
                </Label>
                <Label style={ui.secondary}>{draft.originalText}</Label>
              </View>
            )}
            <Label style={styles.section}>Who can see your profile?</Label>
            <View style={styles.tags}>
              {[
                ["private", "Only me"],
                ["roommates", "Potential roommates"],
              ].map(([value, title]) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={title}
                  accessibilityState={{ checked: draft.visibility === value }}
                  aria-checked={draft.visibility === value}
                  onPress={() =>
                    change({
                      visibility: value,
                      discoveryOptIn:
                        value === "private" ? false : draft.discoveryOptIn,
                    })
                  }
                  style={[
                    styles.choice,
                    draft.visibility === value && styles.selected,
                  ]}
                >
                  <Label style={{ fontSize: 14 }}>{title}</Label>
                </Pressable>
              ))}
            </View>
            {draft.visibility === "roommates" && (
              <View style={[ui.row, { marginTop: 16 }]}>
                <Label style={{ flex: 1 }}>
                  Include me in roommate discovery
                </Label>
                <Switch
                  accessibilityLabel="Include me in roommate discovery"
                  value={draft.discoveryOptIn}
                  onValueChange={(discoveryOptIn) => change({ discoveryOptIn })}
                />
              </View>
            )}
            <Label style={[ui.secondary, { marginTop: 12 }]}>
              Visibility is saved as a preference. Profiles stay on this device
              until backend publishing is connected.
            </Label>
          </>
        ) : (
          <ProfileCard profile={draft} identity={identity} preview={preview} />
        )}
        {saved && (
          <View style={[ui.row, { marginTop: 20 }]}>
            <Mascot size={38} mood="happy" />
            <Label
              accessibilityLiveRegion="polite"
              style={{ color: "#454A77", flex: 1 }}
            >
              Profile saved on this device.
            </Label>
          </View>
        )}
        {!!error && (
          <Label
            accessibilityRole="alert"
            style={{ color: colors.unknown, marginTop: 16 }}
          >
            {error}
          </Label>
        )}
        {!editing && (
          <>
            <Link
              onPress={() => {
                setEditing(true);
                setSaved(false);
              }}
            >
              Edit profile & Squishy
            </Link>
            <Link onPress={onEditSearch}>
              Edit housing and search preferences
            </Link>
            <Link onPress={onSaved}>Saved homes, people & events</Link>
          </>
        )}
      </ScrollView>
      {editing && (
        <View style={ui.footer}>
          {preview && (
            <Link onPress={() => setPreview(false)}>Back to editing</Link>
          )}
          <Button
            disabled={pending}
            onPress={
              preview
                ? save
                : () => {
                    if (!draft.introduction.trim())
                      setError(
                        "Add a short introduction to preview your profile.",
                      );
                    else {
                      setError("");
                      setPreview(true);
                    }
                  }
            }
          >
            {pending
              ? "Saving…"
              : preview
                ? findingMatches
                  ? "Update profile and find roommates"
                  : "Save profile on this device"
                : "Preview my profile"}
          </Button>
        </View>
      )}
      <Sheet
        visible={customizing}
        onClose={() => setCustomizing(false)}
        title="Make Squishy yours"
        footer={
          <Button
            onPress={() => {
              change({ appearance });
              setCustomizing(false);
            }}
          >
            Use this look
          </Button>
        }
      >
        <View style={{ alignItems: "center", paddingVertical: 20 }}>
          <Mascot size={160} appearance={appearance} interactive />
        </View>
        <Label style={ui.section}>A color that feels like you</Label>
        <View style={styles.tags}>
          {squishyColors.map((color) => (
            <Pressable
              key={color.id}
              accessibilityRole="radio"
              accessibilityLabel={color.name}
              accessibilityState={{ checked: appearance.color === color.id }}
              aria-checked={appearance.color === color.id}
              onPress={() => setAppearance((a) => ({ ...a, color: color.id }))}
              style={[
                styles.choice,
                appearance.color === color.id && styles.selected,
              ]}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: color.swatch,
                }}
              />
              <Label style={{ fontSize: 14 }}>{color.name}</Label>
            </Pressable>
          ))}
        </View>
        <Label style={styles.section}>One little extra</Label>
        <View style={styles.tags}>
          {[
            ["none", "None", "remove"],
            ["headphones", "Headphones", "headset"],
            ["leaf", "Leaf", "leaf"],
            ["coffee", "Coffee", "cafe"],
          ].map(([value, title, icon]) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={title}
              accessibilityState={{ checked: appearance.accessory === value }}
              aria-checked={appearance.accessory === value}
              onPress={() => setAppearance((a) => ({ ...a, accessory: value }))}
              style={[
                styles.choice,
                appearance.accessory === value && styles.selected,
              ]}
            >
              <Icon name={icon} size={18} color="#303565" />
              <Label style={{ fontSize: 14 }}>{title}</Label>
            </Pressable>
          ))}
        </View>
        <Label style={[ui.secondary, { marginTop: 16 }]}>
          Just for expression. Your look never affects your matches.
        </Label>
      </Sheet>
    </View>
  );
}
const styles = StyleSheet.create({
  hero: {
    height: 190,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  orbit: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#EFEDF9",
  },
  avatar: {
    position: "absolute",
    bottom: 6,
    right: "20%",
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 3,
    borderColor: colors.bg,
  },
  section: { fontSize: 18, fontWeight: "700", marginTop: 24, marginBottom: 8 },
  facts: {
    marginTop: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.divider,
    gap: 6,
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  tag: {
    backgroundColor: "#EFEDF9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  choice: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.input,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selected: {
    backgroundColor: "#DEDCF5",
    borderWidth: 1,
    borderColor: "#7775B4",
  },
});
