# Feature Specification: Search Autosuggest & Discovery

**Feature Branch**: `011-search-autosuggest`
**Created**: 2026-03-09
**Status**: Draft
**Input**: User description: "Implement autosuggest in mobile. Sekarang, ketika ketik search term, tidak ada autocomplete sama sekali. terkadang anak no idea, mau cari apa. Bagus lagi, juga ada saranan terms... mungkin ada di page lain? not sure gimana tampilannya nanti."

## Clarifications

### Session 2026-03-09

- Q: How should autocomplete suggestions appear relative to the search input on the mobile screen? → A: Suggestions take over the content area below the search bar (inline, full-width list) — standard pattern as used by Google and YouTube.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Autocomplete While Typing (Priority: P1)

A child starts typing in the search box and the content area below immediately fills with matching tag suggestions (full-width inline list, replacing the normal content view). They can tap a suggestion to instantly run that search without finishing the word. This helps children who know roughly what they want but struggle with spelling or recall.

**Why this priority**: This is the core autosuggest experience — the most direct improvement over the current blank search box. Every child who uses search benefits immediately.

**Independent Test**: Can be tested by typing 2+ characters in the search field and verifying the content area below shows a full-width list of matching tags; tapping one runs the search.

**Acceptance Scenarios**:

1. **Given** a child is on the search screen, **When** they type 2 or more characters, **Then** the content area below the search bar is replaced by a full-width inline list of matching tag suggestions (up to 8 items).
2. **Given** suggestions are showing, **When** the child taps a suggestion, **Then** the search runs for that term and the suggestion list is replaced by search results.
3. **Given** suggestions are showing, **When** the child clears the input, **Then** the suggestion list disappears and the normal view is restored.
4. **Given** the child types a term with no matching tags, **When** the suggestion list would appear, **Then** no list is shown.
5. **Given** suggestions are showing, **When** the child continues typing, **Then** the suggestions update in real-time to reflect the new input.

---

### User Story 2 - Suggested Terms Discovery (Priority: P2)

A child who has no idea what to search for focuses the search box and sees the content area fill with popular tag suggestions (same inline pattern). They can tap any suggestion to immediately run that search. This addresses the "blank page problem" — children freeze when there is nothing to guide them.

**Why this priority**: Important for children who don't know where to start. Autocomplete alone (US1) doesn't help a child who can't think of any starting word.

**Independent Test**: Can be tested by focusing the search input without typing and verifying the content area shows popular terms; tapping one confirms a search runs.

**Acceptance Scenarios**:

1. **Given** a child focuses the search input without typing, **When** the suggestions load, **Then** the content area below the search bar is replaced by a full-width inline list of popular tag suggestions.
2. **Given** discovery suggestions are displayed, **When** the child taps a term, **Then** the search runs for that term and results are shown.
3. **Given** the discovery suggestions load, **When** displayed, **Then** tags are ordered by popularity (most-printed first).
4. **Given** a discovery suggestion is tapped and returns no results, **When** results load, **Then** a friendly empty state is shown.

---

### Edge Cases

- What happens when the backend is slow to return suggestions? Show a loading indicator in the content area; don't block typing.
- What happens if suggestions fail to load? Fail silently — child can still type and search manually.
- What happens when suggestion text is very long? Truncate with ellipsis to keep the list readable.
- What happens when the keyboard is open? The suggestion list must be visible above the keyboard (scrollable if needed).
- What happens with tags marked as blocked? Blocked tags are excluded from all suggestions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The search input MUST display tag-based suggestions when the child has typed 2 or more characters.
- **FR-002**: Suggestions MUST match tags whose name starts with the typed characters (case-insensitive prefix match), ranked by popularity (most-printed first) so more relevant results appear at the top.
- **FR-003**: Suggestions MUST appear within 500ms of the child pausing typing (debounced).
- **FR-004**: Tapping a suggestion MUST immediately run a search for that term.
- **FR-005**: The suggestion list MUST show a maximum of 8 suggestions at a time.
- **FR-006**: Suggestions MUST appear as a full-width inline list in the content area below the search bar, replacing the normal content view while active (same pattern for both autocomplete and discovery).
- **FR-007**: The search screen MUST show popular suggested terms in the suggestion area when the search input is focused and empty.
- **FR-008**: Discovery suggestions MUST be ordered by popularity (most-printed tags first).
- **FR-009**: Tapping a discovery suggestion MUST run the search and show results.
- **FR-010**: Blocked tags MUST be excluded from both autocomplete and discovery suggestions.
- **FR-011**: Suggestions MUST display the Indonesian translation as the primary label. The English tag name MUST appear as a smaller subtitle below it. If no translation exists, the English name is shown as the primary label.
- **FR-012**: The backend MUST support a prefix-based tag lookup endpoint for autocomplete.
- **FR-013**: The backend MUST support a popularity-ranked tag endpoint for discovery.

### Key Entities

- **Tag**: A content label with a name and optional Indonesian translation. Forms the suggestion vocabulary.
- **Suggestion**: A tag name (with translation if available) presented as a tappable item in the inline suggestion area, from either prefix matching or popularity ranking.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Autocomplete suggestions appear within 500ms of the child pausing typing in 95%+ of cases on local network.
- **SC-002**: A child can find and run a search via autocomplete in under 5 seconds from starting to type.
- **SC-003**: The discovery suggestion area shows at least 10 suggested terms when the search input is focused and empty.
- **SC-004**: Zero crashes or UI freezes occur when suggestions load or when a suggestion is tapped.
- **SC-005**: A child can complete a successful search via discovery without typing any characters at all.

## Assumptions

- Suggestions are sourced from the existing tag vocabulary; no separate curated list is needed initially.
- Both autocomplete and discovery use the same inline content-area pattern — no floating popups or overlays.
- Indonesian translations are the primary label in suggestions (children are Indonesian speakers); English name shown as subtitle. If no translation exists, English name is used as primary.
- Prefix match is used for autocomplete (not contains); results are ranked by print popularity. Fuzzy matching is out of scope.
- The feature targets the kids mobile app only (not the admin dashboard).
- No offline or cached suggestions are required — live network fetch is acceptable on local network.
