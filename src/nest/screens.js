import React, { useState } from "react";
import { imageSource } from "./assets";
import {
  View,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  Label,
  Icon,
  IconAction,
  Button,
  Link,
  Mascot,
  Bookmark,
  Reasons,
  MapAdapter,
  Header,
  ui,
  colors,
  money,
  dateRange,
} from "./components";
import CircularGallery from "./Gallery";
import RoommateDeck from "./RoommateDeck";

export function Welcome({ onAdd, onExample }) {
  return (
    <ScrollView contentContainerStyle={styles.welcome}>
      <View style={{ alignItems: "center", marginBottom: 24 }}>
        <Mascot size={156} interactive />
      </View>
      <Label style={styles.welcomeTitle}>Tell us about your{"\n"}move.</Label>
      <Label
        style={{ color: colors.secondary, textAlign: "center", marginTop: 8 }}
      >
        A home, a roommate, or both.
      </Label>
      <Button style={{ marginTop: 28, marginBottom: 24 }} onPress={onAdd}>
        Add a goal
      </Button>
      {["A furnished room for the summer", "A roommate for my internship"].map(
        (text, i) => (
          <Pressable
            accessibilityRole="button"
            key={text}
            onPress={() => onExample(i)}
            style={[ui.row, { minHeight: 52, justifyContent: "space-between" }]}
          >
            <Label style={{ fontSize: 14 }}>{text}</Label>
            <Icon name="chevron-forward" size={20} />
          </Pressable>
        ),
      )}
    </ScrollView>
  );
}
export function GoalSummary({ goal, onEdit, onSettings, roommate }) {
  return (
    <View style={{ marginTop: 10, marginBottom: 16 }}>
      <View style={[ui.row, { justifyContent: "space-between" }]}>
        <View style={{ flex: 1 }}>
          <Label style={ui.heading}>{goal.city} this summer</Label>
          <Label>
            {roommate
              ? money(goal.budgetAmount)
              : `Up to ${money(goal.budgetAmount)}`}
            {roommate
              ? goal.budgetBasis === "person"
                ? " each"
                : " total"
              : goal.budgetBasis === "home"
                ? " total"
                : ""}{" "}
            ·{" "}
            {dateRange(goal.startDate, goal.endDate)}
          </Label>
        </View>
        <IconAction
          name="pencil-outline"
          label="Edit search"
          onPress={onEdit}
        />
      </View>
      <View style={[ui.row, { justifyContent: "space-between" }]}>
        <Label style={ui.secondary}>
          Current results ·{" "}
          {goal.cadence === "Manual"
            ? "Check manually"
            : `Check ${goal.cadence.toLowerCase()}`}
        </Label>
        {!roommate && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search settings"
            onPress={onSettings}
            hitSlop={12}
          >
            <Icon name="settings-outline" size={18} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
export function Homes({
  goal,
  matches,
  selectedId,
  onSelect,
  minimized,
  onMinimize,
  onExpand,
  onOpen,
  onEdit,
  onSettings,
  status,
  onRetry,
  updatedAt,
  saved,
  onSave,
}) {
  const current = matches.find((m) => m.listingId === selectedId) || matches[0];
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <GoalSummary goal={goal} onEdit={onEdit} onSettings={onSettings} />
        <Label style={ui.section}>{current?.isDemoSample ? "Sample homes" : "Your housing matches"}</Label>
        {current?.isDemoSample && (
          <Label style={ui.secondary}>
            No exact matches in this demo. Explore these sample homes; your search preferences are unchanged.
          </Label>
        )}
        {(status === "loading" || status === "refresh") && (
          <View style={[ui.row, { marginVertical: 16 }]}>
            <ActivityIndicator color={colors.blue} />
            <Label>
              {status === "refresh"
                ? "Refreshing results…"
                : "Finding your matches…"}
            </Label>
          </View>
        )}
        {status === "refresh" && updatedAt && (
          <Label style={ui.secondary}>
            Last updated{" "}
            {new Date(updatedAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </Label>
        )}
        {status === "error" && (
          <View style={{ marginTop: 16 }}>
            <Label style={{ color: colors.unknown }}>
              Housing results could not be loaded. Your previous results are
              still available.
            </Label>
            <View style={ui.row}>
              <Link onPress={onRetry}>Retry</Link>
              <Link onPress={onEdit}>Edit search</Link>
            </View>
          </View>
        )}
        {!current && status !== "loading" && status !== "error" && (
          <View style={{ paddingVertical: 32 }}>
            <Label>
              {goal.intent === "Roommate"
                ? "Your search is focused on roommates. Choose Both to look for a home too."
                : "No listings meet all your must-haves."}
            </Label>
            <Link onPress={onEdit}>Edit search</Link>
            <Link onPress={onRetry}>Retry</Link>
          </View>
        )}
        {current && (
          <>
            <CircularGallery
              saved={saved}
              onSave={onSave}
              matches={matches}
              selectedId={current.listingId}
              onSelect={onSelect}
              onOpen={onOpen}
            />
            {minimized ? (
              <Pressable
                accessibilityRole="button"
                onPress={onMinimize}
                style={[ui.row, { minHeight: 48, marginTop: 8 }]}
              >
                <Icon name="map-outline" />
                <Label style={{ flex: 1, fontSize: 14 }}>
                  Show map · {matches.length} locations
                </Label>
                <Icon name="chevron-down" size={18} />
              </Pressable>
            ) : (
              <View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Collapse map"
                  onPress={onMinimize}
                  style={[
                    ui.row,
                    { minHeight: 44, justifyContent: "space-between" },
                  ]}
                >
                  <Label style={{ fontWeight: "600", fontSize: 14 }}>
                    Around {current.listing.neighborhood}
                  </Label>
                  <Icon name="chevron-up" size={18} />
                </Pressable>
                <MapAdapter
                  matches={matches}
                  selectedId={current.listingId}
                  onSelect={onSelect}
                  onExpand={onExpand}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
      {current && (
        <View style={ui.footer}>
          <Button onPress={() => onOpen(current.listing)}>View home</Button>
        </View>
      )}
    </View>
  );
}
export function Roommates({
  goal,
  people,
  saved,
  onSave,
  onOpen,
  onCriteria,
  onEdit,
}) {
  // Swipe deck: see RoommateDeck.js. The compact goal summary stays on top, as on the other tabs.
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <GoalSummary goal={goal} roommate onEdit={onEdit} />
      </View>
      <RoommateDeck
        goal={goal}
        people={people}
        saved={saved}
        onSave={onSave}
        onOpen={onOpen}
        onCriteria={onCriteria}
        onEdit={onEdit}
      />
    </View>
  );
}
export function Community({
  area,
  community,
  onArea,
  onInterests,
  saved,
  onSave,
  onEvent,
  onPerson,
}) {
  const event = community.events[0];
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          ui.row,
          { justifyContent: "space-between", marginBottom: 16, marginTop: 4 },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose neighborhood"
          onPress={onArea}
          style={[ui.row, { minHeight: 44, gap: 0 }]}
        >
          <Label style={{ fontWeight: "600" }}>{area}</Label>
          <Icon name="chevron-down" size={17} />
        </Pressable>
        <Link onPress={onInterests}>Edit interests</Link>
      </View>
      <Label style={[ui.heading, { marginBottom: 12 }]}>
        Around your neighborhood
      </Label>
      {event ? (
        <>
          <Image
            source={imageSource(event.imageUrl)}
            style={styles.eventPhoto}
          />
          <View style={[ui.row, { alignItems: "flex-start", marginTop: 8 }]}>
            <View style={{ flex: 1 }}>
              <Label style={ui.section}>{event.title}</Label>
              <Label>Saturday · 10 AM</Label>
            </View>
            <Bookmark
              saved={saved.events.includes(event.id)}
              onPress={() => onSave("events", event.id)}
            />
          </View>
          <Button style={{ marginTop: 12 }} onPress={() => onEvent(event)}>
            View event
          </Button>
        </>
      ) : (
        <Label style={ui.secondary}>No events in this neighborhood yet.</Label>
      )}
      <Label style={[ui.heading, { marginTop: 24, marginBottom: 12 }]}>
        People open to meeting up
      </Label>
      {community.people.map((p) => (
        <Pressable
          key={p.id}
          accessibilityRole="button"
          accessibilityLabel={`Meet ${p.name}`}
          onPress={() => onPerson(p)}
          style={[
            ui.row,
            {
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderColor: colors.divider,
              gap: 14,
            },
          ]}
        >
          <Image source={imageSource(p.avatarUrl)} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Label style={{ fontWeight: "700", fontSize: 18 }}>{p.name}</Label>
            <Label style={{ fontSize: 14 }}>{p.introduction}</Label>
            <Label style={[ui.secondary, { fontSize: 13 }]}>
              {p.sourceName}
            </Label>
          </View>
          <Icon name="chevron-forward" />
        </Pressable>
      ))}
      {!community.people.length && (
        <Label style={ui.secondary}>
          No introductions match this area and your interests yet.
        </Label>
      )}
    </ScrollView>
  );
}
export function HomeDetail({
  listing,
  match,
  event,
  saved,
  onSave,
  onBack,
  onCriteria,
  onSource,
  onEvent,
  onContact,
  onHome,
}) {
  const [photo, setPhoto] = useState(0);
  const [width, setWidth] = useState(350);
  return (
    <View style={{ flex: 1 }}>
      <Header title="Your matches" onBack={onBack}>
        {<Bookmark saved={saved} onPress={onSave} />}
      </Header>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{ borderRadius: 22, overflow: "hidden" }}
        >
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setPhoto(Math.round(e.nativeEvent.contentOffset.x / width))
            }
          >
            {listing.photoUrls.map((uri, i) => (
              <Image
                key={i}
                source={imageSource(uri)}
                style={{ width, height: 220 }}
              />
            ))}
          </ScrollView>
          <View style={styles.photoCount}>
            <Label style={{ color: "#FFF", fontWeight: "700" }}>
              {photo + 1}/{listing.photoUrls.length}
            </Label>
          </View>
        </View>
        <Label
          style={{
            fontSize: 26,
            lineHeight: 31,
            fontWeight: "700",
            marginTop: 8,
          }}
        >
          {money(listing.monthlyRent)} / month
        </Label>
        <Label style={ui.section}>{listing.title}</Label>
        <Label style={[ui.secondary, { fontSize: 16, marginTop: 2 }]}>
          {listing.leaseType} · {dateRange(listing.availableFrom, listing.availableTo)}
        </Label>
        <View
          style={[ui.row, { alignItems: "flex-start", marginTop: 20, gap: 16 }]}
        >
          <Mascot size={48} />
          <View style={{ flex: 1 }}>
            <Label style={[ui.section, { marginBottom: 8 }]}>{match?.isDemoSample ? "Sample home · check your criteria" : "Why it fits"}</Label>
            <Reasons criteria={match?.criteria || []} />
            <Link onPress={() => onCriteria(match?.criteria || [])}>
              See all criteria
            </Link>
          </View>
        </View>
        <Label style={{ color: colors.unknown, fontSize: 14, marginTop: 4 }}>
          Utilities and deposit need confirmation
        </Label>
        <View
          style={[
            ui.row,
            {
              borderTopWidth: 1,
              borderColor: colors.divider,
              marginTop: 8,
              justifyContent: "space-between",
            },
          ]}
        >
          <Label style={{ fontSize: 13, color: colors.secondary }}>
            {listing.sourceName}
          </Label>
          <Link onPress={() => onSource(listing)}>
            <Label
              style={{ fontSize: 13, color: colors.blue, fontWeight: "600" }}
            >
              View original post
            </Label>
          </Link>
        </View>
        <Label style={[ui.section, { marginTop: 8, marginBottom: 8 }]}>
          Nearby
        </Label>
        {event && (
          <Pressable
            accessibilityRole="button"
            onPress={() => onEvent(event)}
            style={[ui.row, { gap: 12 }]}
          >
            <Image
              source={imageSource(event.imageUrl)}
              style={{ width: 88, height: 58, borderRadius: 14 }}
            />
            <View style={{ flex: 1 }}>
              <Label style={{ fontWeight: "600", fontSize: 14 }}>
                {event.title}
              </Label>
              <Label style={ui.secondary}>Saturday morning</Label>
            </View>
          </Pressable>
        )}
        <Link
          style={{ marginTop: 12 }}
          onPress={() => onHome(listing.neighborhood)}
        >
          I’ve found my place
        </Link>
      </ScrollView>
      <View style={ui.footer}>
        <Button onPress={() => onContact(listing)}>Contact</Button>
      </View>
    </View>
  );
}
export function PersonDetail({
  person,
  saved,
  onSave,
  onBack,
  onCriteria,
  onSource,
  onContact,
}) {
  return (
    <View style={{ flex: 1 }}>
      <Header title="Your matches" onBack={onBack}>
        <Bookmark saved={saved} onPress={onSave} />
      </Header>
      <ScrollView contentContainerStyle={styles.content}>
        <Image
          source={imageSource(person.photoUrl || person.avatarUrl)}
          style={{ width: "100%", height: 260, borderRadius: 22 }}
        />
        <Label style={[ui.heading, { marginTop: 16 }]}>{person.name}</Label>
        <Label style={{ marginTop: 8 }}>
          {person.originalPostText || person.introduction}
        </Label>
        {person.budgetPerPerson && (
          <>
            <Label style={{ marginTop: 16 }}>
              {money(person.budgetPerPerson)} per person · {dateRange(person.dates[0], person.dates[1])}
            </Label>
            <Label style={ui.secondary}>
              {person.preferredAreas.join(", ")}
            </Label>
            <Label style={{ marginTop: 8 }}>
              {person.explicitLivingPreferences.join(" · ")}
            </Label>
            <Label style={[ui.section, { marginTop: 24, marginBottom: 12 }]}>
              Why it fits
            </Label>
            <Reasons criteria={person.criteria || []} />
            <Link onPress={() => onCriteria(person.criteria || [])}>
              See all criteria
            </Link>
            <Label style={{ color: colors.unknown }}>
              Sleep schedule and pets need confirmation
            </Label>
            <Link onPress={() => onSource(person)}>View original post</Link>
          </>
        )}
        <Label style={[ui.secondary, { marginTop: 16 }]}>
          {person.sourceName}
        </Label>
      </ScrollView>
      <View style={ui.footer}>
        <Button onPress={() => onContact(person)}>Contact</Button>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  welcome: { paddingHorizontal: 24, paddingTop: 68, paddingBottom: 32 },
  welcomeTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.6,
  },
  roommatePhoto: { width: 120, height: 164, borderRadius: 22 },
  eventPhoto: { width: "100%", height: 170, borderRadius: 22 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  photoCount: {
    position: "absolute",
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(0,0,0,.4)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
