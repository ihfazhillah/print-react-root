# Feature Specification: Usage Insights & Personalized Feed

**Feature Branch**: `007-usage-insights`
**Created**: 2026-03-06
**Status**: Draft
**Input**: User description: "Admin dashboard showing kids' usage analytics (most printed, per-tag stats, per-kid preferences). Mobile app should display personalized content based on each kid's interests. Exclude Babah (admin) account from analytics."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Usage Dashboard (Priority: P1)

The parent (admin) opens the web dashboard and sees a dedicated "Usage Insights" page showing how each kid uses the app. The page displays: which images are printed most, which tags/categories each kid prefers, print counts per tag, and a comparison of interests across kids. The admin's own device ("HP BABAH") is excluded from all analytics.

**Why this priority**: The parent needs visibility into usage patterns to understand what content the kids enjoy. This is the core analytics value and informs the personalized feed (US2).

**Independent Test**: Can be tested by opening the admin dashboard, navigating to the insights page, and verifying that usage data is displayed correctly with Babah's device excluded.

**Acceptance Scenarios**:

1. **Given** activity events exist for multiple devices, **When** the admin opens the Usage Insights page, **Then** a summary shows each kid's total prints, views, and detail views.
2. **Given** print events exist with associated tags, **When** the admin views the insights page, **Then** the top printed categories are listed with counts, and each kid's top 5 favorite tags are shown.
3. **Given** the admin device "HP BABAH" has activity events, **When** the insights page loads, **Then** Babah's device is excluded from all statistics.
4. **Given** multiple kids have printed from the same tag, **When** the admin views shared interests, **Then** overlapping tags are highlighted showing which kids share them.
5. **Given** a kid has tags only they print, **When** the admin views unique interests, **Then** those tags are shown as that kid's unique preferences.

---

### User Story 2 - Personalized Home Feed (Priority: P1)

When a kid opens the mobile app, the home screen prioritizes content matching their interests. The app uses the kid's print and browse history to determine preferred tags, then surfaces images from those tags higher in the feed. Kids who haven't printed anything yet see the default feed (no personalization).

**Why this priority**: This is the direct user-facing value — kids see content they're more likely to enjoy, leading to more engagement and less scrolling.

**Independent Test**: Can be tested by logging in as a device that has print history (e.g., Mimi's device), opening the home screen, and verifying that images from Mimi's top tags (craft-coloring, Valentine's Day, Mother's Day) appear prominently.

**Acceptance Scenarios**:

1. **Given** Mimi's device has printed craft-coloring and Valentine's Day images, **When** Mimi opens the app, **Then** images tagged with craft-coloring and Valentine's Day appear in a "For You" section at the top of the home screen.
2. **Given** LuLu's device has printed butterfly and insect images, **When** LuLu opens the app, **Then** LuLu's feed highlights butterfly and insect content, not Valentine's Day content.
3. **Given** a new device with no print history, **When** the user opens the app, **Then** the default feed is shown without a "For You" section.
4. **Given** a kid prints new images from a new tag over time, **When** they reopen the app later, **Then** the "For You" section updates to reflect the new interest.

---

### User Story 3 - Per-Kid Activity Timeline (Priority: P2)

The admin can view a chronological timeline of each kid's activity — what they browsed, viewed in detail, and printed — to understand usage patterns over time (e.g., which days they use the app, how long sessions are).

**Why this priority**: Adds depth to the analytics but is not essential for the core insights or personalization.

**Independent Test**: Can be tested by selecting a kid on the insights page and viewing their activity timeline with timestamps and event types.

**Acceptance Scenarios**:

1. **Given** a kid has activity events, **When** the admin selects that kid on the insights page, **Then** a chronological list shows each event (view/detail/print) with timestamp and image thumbnail.
2. **Given** events span multiple days, **When** the timeline is displayed, **Then** events are grouped by date.

---

### Edge Cases

- What happens when a kid has zero activity? The insights page should show "No activity yet" for that kid; the mobile app shows the default feed.
- What happens when a device is deactivated? Its historical data should still appear in analytics but be clearly labeled as inactive.
- What happens when all kids share the same top tags? The "unique interests" section should be empty or show "All kids share similar interests."
- What happens when a tag is deleted? Print events referencing that tag should still count but display the tag as "(deleted)".
- What happens when the "For You" section has fewer than 5 items? Show whatever is available; if fewer than 2, don't show the section at all.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an API endpoint that returns per-device usage statistics (prints, views, details) excluding the admin device.
- **FR-002**: System MUST provide an API endpoint that returns top printed tags per device, ranked by print count.
- **FR-003**: System MUST provide an API endpoint that returns the most printed images overall and per device.
- **FR-004**: System MUST provide an API endpoint that returns shared and unique tag preferences across devices.
- **FR-005**: System MUST provide an API endpoint that returns personalized content recommendations for a given device, based on that device's top printed/browsed tags.
- **FR-006**: The admin dashboard MUST display a Usage Insights page with per-kid summaries, top tags, most printed images, and interest comparisons.
- **FR-007**: The mobile app MUST display a "For You" section on the home screen showing images from the kid's preferred tags.
- **FR-008**: The "For You" section MUST only appear for devices with at least 2 print events.
- **FR-009**: The admin device (identified by device name "HP BABAH") MUST be excluded from all analytics queries.
- **FR-010**: System MUST provide a per-device activity timeline endpoint returning events in reverse chronological order, grouped by date.

### Key Entities

- **Device Usage Summary**: Aggregated counts of views, details, and prints per device.
- **Tag Preference**: A tag associated with a device, ranked by how often the device prints images with that tag.
- **Personalized Recommendation**: A list of images selected from a device's top tags, ordered by relevance.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admin can view all kids' usage summaries on a single page within 2 seconds of loading.
- **SC-002**: Each kid's top 5 tags are accurately computed from their print history.
- **SC-003**: The "For You" section on the mobile app shows at least 80% content from the kid's top 3 tags.
- **SC-004**: A new kid with no history sees the default feed with no errors or empty states.
- **SC-005**: Admin device data is never included in any analytics result.

## Assumptions

- The existing `activity_events` table has sufficient data to compute meaningful preferences (currently 414 events, 53 prints).
- Device identification via `device_name = 'HP BABAH'` is sufficient to exclude the admin. If the admin registers additional devices, a more robust exclusion mechanism may be needed later.
- "For You" recommendations are computed on-the-fly from the database — no pre-computed recommendation engine is needed at this scale (3 kids, ~50 prints).
- The personalized feed supplements (not replaces) the existing home screen content.
