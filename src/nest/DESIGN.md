---
name: Facebook Nest
description: Find your people. Find your place.
colors:
  background: "#FAF9F6"
  surface: "#FFFFFF"
  primary: "#0866FF"
  primary-pressed: "#0757D9"
  text: "#16181C"
  secondary: "#656B73"
  divider: "#E6E8EB"
  input: "#F0F1F3"
  selected: "#EAF2FF"
  unknown: "#996000"
  backdrop: "rgba(0,0,0,0.32)"
typography:
  wordmark: { fontSize: "24px", lineHeight: "29px", fontWeight: 700 }
  display: { fontSize: "30px", lineHeight: "36px", fontWeight: 700 }
  headline: { fontSize: "24px", lineHeight: "30px", fontWeight: 700 }
  title: { fontSize: "20px", lineHeight: "25px", fontWeight: 700 }
  price: { fontSize: "26px", lineHeight: "31px", fontWeight: 700 }
  body: { fontSize: "16px", lineHeight: "22px" }
  metadata: { fontSize: "14px", lineHeight: "20px" }
  source: { fontSize: "13px", lineHeight: "18px" }
rounded:
  control: "16px"
  photo: "22px"
  sheet: "28px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  content: "20px"
  section: "24px"
  spacious: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
  input:
    backgroundColor: "{colors.input}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "16px"
---

# Design System: Facebook Nest

## Overview

This contract applies only to `src/nest`, preserving the incumbent Facebook shell. The user-approved boards and exact tokens in `frontendDevInstruction.md` govern the feature: warm, minimal, welcoming, with Facebook blue actions and a cream squishy mascot. Tokens above are normative; `px` represents React Native logical points here.

Keep the centered circular housing gallery, visible neighbors, and compact map as the signature composition. The interface is built from real controls. Generated local assets approximate the references; fidelity is not claimed to be pixel exact.

## Colors

Primary blue identifies actions, selected tabs, and the selected map pin; the darker primary is press feedback. Warm background and white surfaces establish a quiet hierarchy. Secondary text carries metadata; gray inputs distinguish editable areas without outlining every section. Pale blue marks selection. Amber labels unknown information, paired with explicit status text/icons rather than color alone. The translucent backdrop belongs to modal sheets.

## Typography

Use native system sans-serif: SF Pro on iOS and Roboto on Android; React Native Web uses its system fallback. The frontmatter preserves the user-pinned hierarchy. Body/button copy is readable and direct; buttons use weight 600. Intake text uses 16/24 with top alignment. Never shrink essential information below 13 points.

The gallery is a compact exception in the current implementation: centered price is 21/25 and neighboring price is 17/25, while home-detail price uses the pinned price role. Text scaling support is intended, but native large-text verification remains outstanding.

## Layout

Use 20-point horizontal content padding, 24-point major section separation, and the declared spacing scale. The welcome screen currently uses 24-point inset and generous top space. Minimum interactive targets are 44×44; primary buttons are at least 48 high. Main tabs divide a 48-point row equally, using plain text with a centered 56×3 active underline. Detail pages use back navigation instead of the tabs.

The housing gallery is centered with card width `min(250, containerWidth × .64)`. Neighbor cards use scale .84, horizontal offset of .64 card widths, gentle ±10° Y rotation and ±1.5° Z rotation. The five-fixture default shows both neighbors; one or two results reduce the visible card set. Arrow controls supplement swiping. Gallery and map share a listing ID. Compact map height is 150; expanded map is 420. Collapsing retains a map-return affordance on the same dashboard.

One shared intake sheet handles writing and review for all intents. It scrolls, caps at 94% height, uses keyboard avoidance, and keeps its footer separate. Tab trees remain mounted to preserve scroll position when navigating away. Browser captures target 375- and 390-point widths; actual native keyboard and safe-area behavior require device verification.

## Elevation & Depth

Keep ordinary sections flat. Gallery shadow is black, opacity .10, radius 10, offset (0,4), Android elevation 3. Sheets use black, opacity .12, radius 15, offset (0,-3), elevation 6. Map pins have a small functional shadow. Do not add an oval platform beneath the gallery or wrap each section in a bordered card. Dividers are 1 point and used only for meaningful separation.

## Shapes

Controls and inputs use the control radius, photos/gallery cards use the photo radius, and sheet top corners use the sheet radius. The map currently uses radius 20. The mascot is a cream pebble with two tiny eyes and a soft shadow, without a mouth or elaborate limbs; the local generated PNG is reusable at welcome and header scales. Do not use a presentation board as an image-backed interface.

## Components

**Header and tabs:** Facebook back action, Facebook icon, Nest wordmark, and small mascot/saved action. Main destinations are Homes, Roommates, Community. Active text is weight 700, inactive 500; no pill backgrounds. Demo controls remain behind a development-only wordmark long press.

**Buttons and fields:** Real Pressables provide labels and press feedback. Primary actions use blue with white text; disabled actions dim. Inputs use soft gray fill and comfortable internal padding. Intake uses editable text rows for must-haves and preferences, with explicit budget basis. Review remains editable before confirmation.

**Gallery and details:** The center card is dominant; neighboring cards are navigational previews. Source attribution remains visible. Detail pages separate known facts, evidence-backed reasons, and unknowns. Bookmark fill communicates saved state, with an undo notice. Saving and choosing a home area are distinct actions.

**Sheets and motion:** The specification targets approximately 250ms sheets, 150ms tab fades, and 220ms map collapse. Current sheets use native `slide` (no explicit duration); tab fades use 150ms, map layout animation uses 220ms, and gallery selection fades for 280ms. Reduced-motion queries disable these animations. No perpetual mascot animation or autoplay. Native timing and layout-animation behavior still need device validation.

## Do's and Don'ts

- Do preserve the approved composition and user-pinned tokens when extending Nest.
- Do keep one shared intake and explicit editable confirmation.
- Do show unknown evidence honestly and label icon-only actions.
- Do keep the illustrative map and local-message limitations clear in integration notes.
- Don't redesign the surrounding Facebook app or migrate its framework.
- Don't replace the circular gallery with a flat left-aligned list.
- Don't reproduce board titles, blue presentation canvases, phone frames, or sample-data footers inside the app.
- Don't claim exact board fidelity, native accessibility validation, or completed motion targets without evidence.
