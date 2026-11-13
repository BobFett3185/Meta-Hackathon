import React, { useRef, useState } from "react";
import { View, TextInput, Pressable, Switch, Keyboard } from "react-native";
import {
  Sheet,
  Tabs,
  Label,
  Button,
  IconAction,
  Icon,
  ui,
  colors,
  money,
  dateRange,
} from "./components";
import { nestService } from "./service";
import IntentSetup, { intentCopy } from "./IntentSetup";

export default function Intake({
  draft,
  onDraft,
  onClose,
  onConfirm,
  initialReview = false,
  initialOptions = false,
}) {
  const [review, setReview] = useState(initialReview);
  const [options, setOptions] = useState(initialOptions);
  const [editor, setEditor] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const setupEdits = useRef({});
  const update = (patch) => onDraft({ ...draft, ...patch });
  const setup = nestService.getSetup();
  const act = async () => {
    Keyboard.dismiss();
    setError("");
    setPending(true);
    try {
      if (!review) {
        const result = await nestService.interpretGoal(draft.rawPrompt, draft);
        onDraft({ ...result.goal, ...setupEdits.current });
        if (result.missing) setError(result.missing);
        else setReview(true);
      } else if (
        draft.intent !== "Home" &&
        (draft.roommateCount == null ||
          (draft.intent === "Roommate" && draft.alreadyHasHome == null))
      )
        setError("Answer the household question before finding matches.");
      else if (
        !draft.city ||
        draft.budgetAmount <= 0 ||
        draft.maxResults < 1 ||
        draft.maxResults > 20 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(draft.startDate) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(draft.endDate) ||
        draft.startDate > draft.endDate
      )
        setError(
          "Check your city, dates, positive budget, and result limit (1–20).",
        );
      else await onConfirm(draft);
    } catch (e) {
      setError(e?.message || "Could not save your search. Please try again.");
    } finally {
      setPending(false);
    }
  };
  const row = (text, name) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${name}`}
      onPress={() => setEditor(editor === name ? null : name)}
      style={[
        ui.row,
        {
          minHeight: 44,
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderColor: colors.divider,
        },
      ]}
    >
      <Label style={{ flex: 1, fontSize: 14 }}>{text}</Label>
      <Icon name="pencil-outline" size={19} />
    </Pressable>
  );
  const field = (label, value, change, numeric = false) => (
    <View style={{ marginTop: 8 }}>
      <Label style={ui.secondary}>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        style={ui.input}
        value={String(value ?? "")}
        onChangeText={change}
        keyboardType={numeric ? "numeric" : "default"}
      />
    </View>
  );
  return (
    <Sheet
      visible
      onClose={onClose}
      title="What are you looking for?"
      footer={
        <Button disabled={pending} onPress={act}>
          {pending
            ? "Saving…"
            : review
              ? intentCopy[draft.intent].action
              : "Review preferences"}
        </Button>
      }
    >
      <Tabs
        choices={["Home", "Roommate", "Both"]}
        value={draft.intent}
        onChange={(intent) => {
          update({ intent });
          setError("");
          setEditor(null);
        }}
      />
      <IntentSetup
        draft={draft}
        onChange={(patch) => {
          setupEdits.current = { ...setupEdits.current, ...patch };
          update(patch);
        }}
      />
      {draft.intent !== "Home" && (
        <View
          style={{
            backgroundColor: colors.pale,
            borderRadius: 12,
            padding: 12,
            marginTop: 8,
          }}
        >
          <Label style={{ fontWeight: "700", marginBottom: 4 }}>
            Introduce yourself and your ideal roommate
          </Label>
          <Label style={ui.secondary}>
            Share a little about yourself, your daily routine, and what you're
            looking for in a roommate. Think sleep schedules, cleanliness, pets,
            and how social you like your home to be. Include your city, dates,
            and budget too.
          </Label>
        </View>
      )}
      <TextInput
        accessibilityLabel="Your moving goal"
        multiline
        textAlignVertical="top"
        placeholder="Tell Nest where you’re moving, when, your budget, and what matters to you."
        placeholderTextColor={colors.secondary}
        style={[ui.input, { minHeight: 144, marginTop: 8 }]}
        value={draft.rawPrompt}
        onChangeText={(rawPrompt) => {
          update({ rawPrompt });
          setReview(false);
        }}
      />
      {error ? (
        <Label
          accessibilityRole="alert"
          style={{ color: colors.unknown, marginTop: 12 }}
        >
          {error}
        </Label>
      ) : null}
      {review && (
        <View style={{ marginTop: 12 }}>
          <Label style={{ fontWeight: "700" }}>Must-haves</Label>
          {row(
            `${draft.city} · ${dateRange(draft.startDate, draft.endDate)}`,
            "location and dates",
          )}
          {editor === "location and dates" && (
            <View>
              {field("City", draft.city, (city) => update({ city }))}
              {field(
                "Neighborhood",
                draft.preferredNeighborhoods.join(", "),
                (v) =>
                  update({
                    preferredNeighborhoods: v
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  }),
              )}
              {field(
                "Move-in date (YYYY-MM-DD)",
                draft.startDate,
                (startDate) => update({ startDate }),
              )}
              {field("Move-out date (YYYY-MM-DD)", draft.endDate, (endDate) =>
                update({ endDate }),
              )}
            </View>
          )}
          {row(
            `${money(draft.budgetAmount)} ${draft.budgetBasis === "person" ? "per person" : "total home"}${draft.intent !== 'Roommate' && draft.furnishedRequirement ? " · Furnished" : ""}`,
            "budget and furnishing",
          )}
          {editor === "budget and furnishing" && (
            <View>
              {field(
                "Monthly budget",
                draft.budgetAmount,
                (v) =>
                  update({ budgetAmount: Number(v.replace(/[^\d]/g, "")) }),
                true,
              )}
              <Tabs
                choices={["Per person", "Total home"]}
                value={
                  draft.budgetBasis === "person" ? "Per person" : "Total home"
                }
                onChange={(v) =>
                  update({
                    budgetBasis: v === "Per person" ? "person" : "home",
                  })
                }
              />
              {draft.intent !== 'Roommate' && <View style={[ui.row, { justifyContent: "space-between" }]}>
                <Label>Furnished</Label>
                <Switch
                  accessibilityLabel="Furnished required"
                  value={draft.furnishedRequirement}
                  onValueChange={(v) => update({ furnishedRequirement: v })}
                />
              </View>}
            </View>
          )}
          <Label style={{ fontWeight: "700", marginTop: 8 }}>Preferences</Label>
          {row(
            draft.preferences.join(" · ") || "Add preferences",
            "preferences",
          )}
          {editor === "preferences" &&
            field(
              "Preferences (separate with commas)",
              draft.preferences.join(", "),
              (v) =>
                update({
                  preferences: v
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean),
                }),
            )}
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: options }}
        onPress={() => setOptions(!options)}
        style={[ui.row, { minHeight: 48, justifyContent: "space-between" }]}
      >
        <Label style={{ fontWeight: "700" }}>Options</Label>
        <Icon name={options ? "chevron-down" : "chevron-forward"} size={20} />
      </Pressable>
      {options && (
        <View style={{ gap: 12 }}>
          {setup.sources.map((source) => (
            <View
              key={source.id}
              style={[ui.row, { justifyContent: "space-between" }]}
            >
              <Label style={{ flex: 1 }}>{source.name}</Label>
              <Switch
                accessibilityLabel={source.name}
                value={draft.sourceIds.includes(source.id)}
                onValueChange={(v) =>
                  update({
                    sourceIds: v
                      ? [...draft.sourceIds, source.id]
                      : draft.sourceIds.filter((x) => x !== source.id),
                  })
                }
              />
            </View>
          ))}
          {field(
            "Maximum results",
            draft.maxResults,
            (v) => update({ maxResults: Number(v) }),
            true,
          )}
          <Label>Search cadence</Label>
          <Tabs
            choices={["Manual", "Daily", "Weekly"]}
            value={draft.cadence}
            onChange={(cadence) => update({ cadence })}
          />
          <View style={[ui.row, { justifyContent: "space-between" }]}>
            <Label>Notifications</Label>
            <Switch
              accessibilityLabel="Search notifications"
              value={draft.notificationsEnabled}
              onValueChange={(notificationsEnabled) =>
                update({ notificationsEnabled })
              }
            />
          </View>
        </View>
      )}
    </Sheet>
  );
}
