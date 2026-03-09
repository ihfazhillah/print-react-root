# Feature Specification: Search Autosuggest & Discovery

**Feature Branch**: `011-search-autosuggest`
**Created**: 2026-03-09
**Status**: Draft
**Input**: User description: "Implement autosuggest in mobile. Sekarang, ketika ketik search term, tidak ada autocomplete sama sekali. terkadang anak no idea, mau cari apa. Bagus lagi, juga ada saranan terms... mungkin ada di page lain? not sure gimana tampilannya nanti."

## Clarifications

### Session 2026-03-09

- Q: How should autocomplete suggestions appear relative to the search input on the mobile screen? → A: Suggestions take over the content area below the search bar (inline, full-width list) — standard pattern as used by Google and YouTube.
- Q: Should suggestions match from the start of the tag name (prefix) or anywhere within it (contains)? → A: Prefix match, ranked by popularity (most-printed tags appear first in results).
- Q: How should tag names be displayed in the suggestion list? → A: Indonesian translation as primary label, English name as smaller subtitle below. If no translation exists, English name is used as primary (children are Indonesian speakers).
- Q: Is search-as-you-type redundant with autocomplete suggestions? → A: Yes. Search-as-you-type is suppressed while suggestions are active. Search only fires when the child taps a suggestion or manually submits (Enter). This avoids redundant requests and prevents results from appearing before the child has chosen a term.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Autocomplete While Typing (Priority: P1)

A child starts typing in the search box and the content area below immediately fills with matching tag suggestions (full-width inline list, replacing the normal content view). Search results do NOT appear while suggestions are visible — the child must tap a suggestion or press submit to see results. This helps children who know roughly what they want but struggle with spelling or recall.

**Why this priority**: This is the core autosuggest experience — the most direct improvement over the current blank search box. Every child who uses search benefits immediately.

**Independent Test**: Can be tested by typing 2+ characters in the search field and verifying the content area shows suggestions (not search results); tapping one runs the search and shows the grid.

**Acceptance Scenarios**:

1. **Given** a child is on the search screen, **When** they type 2 or more characters, **Then** the content area is replaced by a full-width inline list of matching tag suggestions (up to 8 items) and no search results are shown yet.
2. **Given** suggestions are showing, **When** the child taps a suggestion, **Then** the search runs for that term and the suggestion list is replaced by search results.
3. **Given** suggestions are showing, **When** the child clears the input, **Then** the suggestion list disappears and the normal view is restored.
4. **Given** the child types a term with no matching tags, **When** the suggestion list would appear, **Then** no list is shown.
5. **Given** suggestions are showing, **When** the child continues typing, **Then** the suggestions update in real-time to reflect the new input (still no search results).
6. **Given** suggestions are showing, **When** the child submits manually (e.g., taps the keyboard's search/done button), **Then** the search runs for the typed term and results are shown.

---

### User Story 2 - Suggested Terms Discovery (Priority: P2)

A child who has no idea what to search for focuses the search box and sees the content area fill with popular tag suggestions (same inline pattern). They tap a suggestion to run the search. This addresses the "blank page problem" — children freeze when there is nothing to guide them.

**Why this priority**: Important for children who don't know where to start. Autocomplete alone (US1) doesn't help a child who can't think of any starting word.

**Independent Test**: Can be tested by focusing the search input without typing and verifying the content area shows popular terms; tapping one confirms a search runs and results appear.

**Acceptance Scenarios**:

1. **Given** a child focuses the search input without typing, **When** the suggestions load, **Then** the content area is replaced by a full-width inline list of popular tag suggestions.
2. **Given** discovery suggestions are displayed, **When** the child taps a term, **Then** the search runs for that term and results are shown.
3. **Given** the discovery suggestions load, **When** displayed, **Then** tags are ordered by popularity (most-printed first).
4. **Given** a discovery suggestion is tapped and returns no results, **When** results load, **Then** a friendly empty state is shown.
5. **Given** discovery suggestions are showing, **When** the child dismisses the keyboard or blurs the input, **Then** suggestions disappear and the normal view is restored.

---

### Edge Cases

- What happens when the backend is slow to return suggestions? Show a loading indicator in the content area; don't block typing.
- What happens if suggestions fail to load? Fail silently — child can still submit manually to search.
- What happens when suggestion text is very long? Truncate with ellipsis to keep the list readable.
- What happens when the keyboard is open? The suggestion list must be visible above the keyboard (scrollable if needed).
- What happens with tags marked as blocked? Blocked tags are excluded from all suggestions.
- What happens if the child types quickly and then submits before suggestions load? The manual submit takes precedence — run the search immediately for the typed term.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The search input MUST display tag-based suggestions when the child has typed 2 or more characters.
- **FR-002**: Suggestions MUST match tags whose name starts with the typed characters (case-insensitive prefix match), ranked by popularity (most-printed first).
- **FR-003**: Suggestions MUST appear within 500ms of the child pausing typing (debounced).
- **FR-004**: Tapping a suggestion MUST immediately run a search for that term and dismiss the suggestion list.
- **FR-005**: The suggestion list MUST show a maximum of 8 suggestions at a time.
- **FR-006**: Suggestions MUST appear as a full-width inline list in the content area, replacing the normal view while active (same pattern for both autocomplete and discovery).
- **FR-007**: Search-as-you-type MUST be suppressed while suggestions are active — search results MUST NOT appear until the child taps a suggestion or manually submits.
- **FR-008**: Manual submit (keyboard search button or equivalent) MUST run the search for the currently typed term and dismiss suggestions.
- **FR-009**: The search screen MUST show popular suggested terms in the content area when the search input is focused and empty.
- **FR-010**: Discovery suggestions MUST be ordered by popularity (most-printed tags first).
- **FR-011**: Blocked tags MUST be excluded from both autocomplete and discovery suggestions.
- **FR-012**: Suggestions MUST display the Indonesian translation as the primary label, with the English tag name as a smaller subtitle. If no translation exists, the English name is shown as the primary label with no subtitle.
- **FR-013**: The backend MUST support a prefix-based tag lookup endpoint with popularity ranking for autocomplete.
- **FR-014**: The backend MUST support a popularity-ranked tag endpoint for discovery.

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
- **SC-006**: No redundant search-as-you-type requests are fired while the suggestion list is visible.

## Assumptions

- Suggestions are sourced from the existing tag vocabulary; no separate curated list is needed initially.
- Both autocomplete and discovery use the same inline content-area pattern — no floating popups or overlays.
- Indonesian translations are the primary label in suggestions (children are Indonesian speakers); English name shown as subtitle. If no translation exists, English name is used as primary.
- Prefix match is used for autocomplete (not contains); results are ranked by print popularity. Fuzzy matching is out of scope.
- Search-as-you-type (the existing 400ms debounced auto-search) is disabled while suggestions are visible; it remains active when suggestions are not shown (e.g., after a search has been submitted and the child edits the term).
- The feature targets the kids mobile app only (not the admin dashboard).
- No offline or cached suggestions are required — live network fetch is acceptable on local network.
