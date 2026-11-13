import React from "react";
import { View } from "react-native";
import { Label, Icon, Mascot, Link, ui, colors, money } from "./components";
const dateLabel = value => new Date(value + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export default function HomeFit({ match, listing, goal, onCriteria }) {
  const criteria = match?.criteria || [];
  const names = {
    budget: "Monthly budget",
    dates: "Availability",
    area: "Neighborhood",
    furnished: "Furnishing",
  };
  const rows = criteria.filter((c) => names[c.criterionId]);
  const unknown = criteria.filter((c) => c.status === "unknown");
  const additional = goal
    ? [
        {
          criterionId: "home-type",
          label: "Home type",
          status:
            !["room", "entire-home"].includes(goal.housingType) ||
            (goal.housingType === "room"
              ? /room/i.test(listing.leaseType)
              : !/room/i.test(listing.leaseType))
              ? "matched"
              : "not-matched",
          evidence: listing.leaseType,
        },
        {
          criterionId: "source",
          label: "Selected source",
          status: goal.sourceIds.includes(listing.sourceId)
            ? "matched"
            : "not-matched",
          evidence: listing.sourceName,
        },
      ]
    : [];
  // Additional constraints explain why an otherwise similar home is only a sample.
  const shown = [...rows, ...additional.filter((c) => c.status !== "matched")];
  return (
    <View style={{ marginTop: 24, marginBottom: 8 }}>
      <View style={[ui.row, { gap: 10, marginBottom: 16 }]}>
        <Mascot size={36} />
        <View style={{ flex: 1 }}>
          <Label style={ui.section}>How this home fits</Label>
          {match?.isDemoSample && (
            <Label
              style={{
                fontSize: 12,
                lineHeight: 18,
                color: colors.secondary,
                marginTop: 2,
              }}
            >
              Sample listing · not an exact match
            </Label>
          )}
        </View>
      </View>
      {shown.map((c) => (
        <View
          key={c.criterionId}
          style={{ flexDirection: "row", gap: 12, paddingVertical: 10 }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: c.status === "matched" ? "#E5F3ED" : "#FFF0DA",
            }}
          >
            <Icon
              name={
                c.status === "matched"
                  ? "checkmark"
                  : c.status === "unknown"
                    ? "help"
                    : "remove"
              }
              size={18}
              color={c.status === "matched" ? "#267258" : "#8F5A0D"}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Label style={{ fontSize: 15, fontWeight: "600" }}>
              {names[c.criterionId] || c.label}
              {c.status === "not-matched" ? " · doesn't match" : ""}
            </Label>
            <Label style={[ui.secondary, { marginTop: 2 }]}>
              {c.criterionId === "budget"
                ? `${money(listing.monthlyRent)} / month · ${listing.rentBasis === "person" ? "per person" : "whole home"}`
                : c.criterionId === "dates"
                  ? `${dateLabel(listing.availableFrom)} – ${dateLabel(listing.availableTo)}`
                  : c.evidence || "Not specified in the source"}
            </Label>
            {c.criterionId === "budget" && goal && (
              <Label style={ui.secondary}>
                Your limit: {money(goal.budgetAmount)}{" "}
                {goal.budgetBasis === "person"
                  ? "per person"
                  : "for the whole home"}
              </Label>
            )}
          </View>
        </View>
      ))}
      {!!unknown.length && (
        <View
          style={{
            marginTop: 12,
            paddingTop: 16,
            borderTopWidth: 1,
            borderColor: colors.divider,
          }}
        >
          <View style={ui.row}>
            <Icon name="help-circle-outline" size={19} color="#8F5A0D" />
            <Label style={{ fontSize: 15, fontWeight: "600" }}>
              Still to confirm
            </Label>
          </View>
          <Label style={[ui.secondary, { marginTop: 6 }]}>
            {unknown.map((c) => c.label).join(" · ")}
          </Label>
          <Label style={[ui.secondary, { marginTop: 3 }]}>
            These details aren't confirmed in the original post.
          </Label>
        </View>
      )}
      <Link
        style={{ marginTop: 8 }}
        onPress={() => onCriteria([...criteria, ...additional])}
      >
        See all criteria
      </Link>
    </View>
  );
}
