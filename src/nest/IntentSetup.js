import React from "react";
import { View, Pressable, Switch } from "react-native";
import { Label, Mascot, Icon, colors, ui } from "./components";

export const intentCopy = {
  Home: {
    title: "Let’s find your place.",
    description:
      "Choose the space you need. We’ll focus on homes that fit your move.",
    action: "Find homes",
  },
  Roommate: {
    title: "Let’s find your people.",
    description:
      "Tell us about your living setup and who you’d like to share it with.",
    action: "Update profile and find roommates",
  },
  Both: {
    title: "Your people. Your place.",
    description:
      "One shared search for a home and compatible people to live with.",
    action: "Find homes & roommates",
  },
};

function Choices({ label, value, options, onChange }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Label style={{ fontWeight: "600", marginBottom: 6 }}>{label}</Label>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map(([id, text]) => (
          <Pressable
            key={String(id)}
            accessibilityRole="radio"
            accessibilityLabel={typeof id === 'number' ? `${id} ${id === 1 ? 'roommate' : 'roommates'}` : text}
            accessibilityState={{ checked: value === id }}
            aria-checked={value === id}
            onPress={() => onChange(id)}
            style={({ pressed }) => ({
              minHeight: 44,
              flexGrow: 1,
              flexBasis: typeof id === 'number' ? 0 : undefined,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: value === id ? colors.pale : colors.input,
              opacity: pressed ? 0.65 : 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            })}
          >
            {value === id && (
              <Icon name="checkmark" size={16} color={colors.blue} />
            )}
            <Label
              style={{
                fontSize: 14,
                color: value === id ? colors.blue : colors.text,
              }}
            >
              {text}
            </Label>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function IntentSetup({ draft, onChange }) {
  const hasPeople = draft.intent !== "Home";
  const hasHomes = draft.intent !== "Roommate";
  const copy = intentCopy[draft.intent];
  return (
    <View style={{ paddingVertical: 12 }}>
      <View style={[ui.row, { gap: 16, marginBottom: 4 }]}>
        <Mascot size={64} />
        <View style={{ flex: 1 }}>
          <Label style={{ fontWeight: "700", fontSize: 18 }}>
            {copy.title}
          </Label>
          <Label style={[ui.secondary, { marginTop: 4 }]}>
            {copy.description}
          </Label>
        </View>
      </View>
      {hasHomes && (
        <>
          <Choices
            label="What kind of home?"
            value={draft.housingType}
            options={[
              ["room", "A room"],
              ["entire-home", "An entire home"],
              ["either", "Either"],
            ]}
            onChange={(housingType) => onChange({ housingType })}
          />
          <View
            style={[ui.row, { minHeight: 48, justifyContent: "space-between" }]}
          >
            <Label style={{ fontSize: 14 }}>Furnished home</Label>
            <Switch
              accessibilityLabel="Furnished home"
              value={draft.furnishedRequirement}
              onValueChange={(furnishedRequirement) =>
                onChange({ furnishedRequirement })
              }
            />
          </View>
        </>
      )}
      {draft.intent === "Roommate" && (
        <Choices
          label="Your housing situation"
          value={draft.alreadyHasHome}
          options={[
            [true, "I have a place"],
            [false, "Still looking"],
          ]}
          onChange={(alreadyHasHome) => onChange({ alreadyHasHome })}
        />
      )}
      {hasPeople && (
        <>
          <Choices
            label={
              draft.intent === "Roommate" && draft.alreadyHasHome
                ? "How many people can move in?"
                : "How many roommates?"
            }
            value={draft.roommateCount}
            options={[
              [1, "1"],
              [2, "2"],
              [3, "3"],
            ]}
            onChange={(roommateCount) => onChange({ roommateCount })}
          />
          <View
            style={[ui.row, { minHeight: 48, justifyContent: "space-between" }]}
          >
            <Label style={{ fontSize: 14, flex: 1 }}>Prefer a quiet home</Label>
            <Switch
              accessibilityLabel="Prefer a quiet home"
              value={draft.preferences.includes("Quiet home")}
              onValueChange={(v) =>
                onChange({
                  preferences: v
                    ? [
                        ...draft.preferences.filter((p) => p !== "Quiet home"),
                        "Quiet home",
                      ]
                    : draft.preferences.filter((p) => p !== "Quiet home"),
                })
              }
            />
          </View>
          <Label style={ui.secondary}>
            {draft.intent === "Both"
              ? "Homes and people share your dates, neighborhood, and budget. Suggestions aren’t a confirmed household."
              : draft.alreadyHasHome
                ? "Find people interested in sharing your existing place. Your exact address stays private."
                : "Find people to look for a place with. This search returns roommate profiles."}
          </Label>
        </>
      )}
    </View>
  );
}
