# Feature Specification: Personalized Feed

**Feature Branch**: `009-personalized-feed`
**Created**: 2026-03-08
**Status**: Draft
**Input**: User description: "Backend + mobile. The app currently shows the same static list. We need to show a list based on recommendations. Two sections: 'Kamu Mungkin Suka' (You Might Like) and the regular browsing list. The regular list should also differ per child based on their view/print history so they don't keep seeing the same items at the top. Mobile app must send device ID when fetching the browsing list."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Personalized Browsing List (Priority: P1)

Each child sees a different ordering of the main browsing list based on their interaction history (views, prints). Items they have already seen or printed are deprioritized, and items similar to their interests are surfaced higher. Children who have no history get a default ordering with some randomness applied.

**Why this priority**: This is the core problem — children currently see the same static list every time they open the app, leading to repetitive browsing and reduced engagement.

**Independent Test**: Can be tested by requesting the browsing list with a device ID that has history vs. one without, and confirming different orderings.

**Acceptance Scenarios**:

1. **Given** a child has viewed/printed 20 items, **When** they open the browsing list, **Then** those 20 items appear lower in the list, and items matching their interests (same tags) appear higher.
2. **Given** a new child with no history, **When** they open the browsing list, **Then** they see a default ordering with some randomness (not the same fixed ordering as every other new child).
3. **Given** two children on different devices, **When** each opens the browsing list, **Then** each sees a different ordering based on their own history.
4. **Given** a child has interacted with items tagged "animals" and "coloring", **When** they browse, **Then** unseen items with those tags appear before unrelated items.

---

### User Story 2 - Mobile App Sends Device Identity for Personalization (Priority: P2)

The mobile app must include the child's device ID when requesting the browsing list, so the backend can personalize the results. Currently the app calls the list endpoint without any device context. The app must also display the "Kamu Mungkin Suka" section above the regular browsing list.

**Why this priority**: Without this change, the backend has no way to know which child is browsing — personalization is impossible regardless of backend readiness.

**Independent Test**: Can be tested by verifying network requests from the app include a device ID parameter, and that the "Kamu Mungkin Suka" section renders above the main list.

**Acceptance Scenarios**:

1. **Given** a registered device, **When** the app fetches the browsing list, **Then** the request includes the device ID.
2. **Given** a device that is not yet registered, **When** the app fetches the browsing list, **Then** the request omits the device ID and the backend returns the default unpersonalized list.
3. **Given** a registered device with interaction history, **When** the home screen loads, **Then** a "Kamu Mungkin Suka" section appears above the main browsing list with recommended items.
4. **Given** a device with no interaction history, **When** the home screen loads, **Then** the "Kamu Mungkin Suka" section shows popular items or is hidden.

---

### User Story 3 - "Kamu Mungkin Suka" Recommendations (Priority: P3)

The system provides a dedicated recommendation section ("Kamu Mungkin Suka" / "You Might Like") that returns a curated short list of items the child is likely to enjoy, based on their print and view history. This is separate from the main browsing feed.

**Why this priority**: Adds explicit discovery of new content beyond just reordering. Builds on the personalization engine from US1.

**Independent Test**: Can be tested by requesting recommendations for a device with history and verifying returned items are relevant (share tags with previously interacted items) and have not been recently viewed/printed.

**Acceptance Scenarios**:

1. **Given** a child has printed items tagged "dinosaurs", **When** the recommendations are requested, **Then** the result contains unseen items tagged "dinosaurs" or related tags.
2. **Given** a child has no interaction history, **When** recommendations are requested, **Then** the system returns popular or trending items as a fallback.
3. **Given** a child has seen all items matching their interests, **When** recommendations are requested, **Then** the system broadens to related tags or returns popular items.

---

### Edge Cases

- What happens when a device has no history at all? → Default/random ordering for browsing, popular items for recommendations.
- What happens when a child has interacted with nearly all items? → Cycle back to least-recently-seen items.
- What happens when all of a child's preferred tags are blocked? → Fall back to popular unblocked items.
- What happens when the device is not registered/authenticated? → Return the standard unpersonalized list (no error).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST return a personalized browsing list per device, deprioritizing items the child has already viewed or printed.
- **FR-002**: System MUST boost items sharing tags with the child's most-interacted content.
- **FR-003**: System MUST introduce randomness for new devices (no history) so different children don't all see the same initial list.
- **FR-004**: System MUST provide a separate recommendation endpoint returning a short curated list (default 20 items) of items the child might like.
- **FR-005**: Recommendations MUST exclude items the child has recently viewed or printed.
- **FR-006**: Recommendations MUST fall back to popular/trending items when the child has insufficient history.
- **FR-007**: Personalized lists MUST respect tag blocking — items with blocked tags are never shown.
- **FR-008**: System MUST support pagination for the personalized browsing list.
- **FR-009**: Unauthenticated requests MUST still return a valid browsing list (unpersonalized fallback).
- **FR-010**: Mobile app MUST send the device ID when fetching the browsing list (if registered).
- **FR-011**: Mobile app MUST display a "Kamu Mungkin Suka" section above the main browsing list, populated from the recommendation endpoint.

### Key Entities

- **Device History**: A child's interaction record (views, prints) used to build preference profile.
- **Tag Affinity**: Derived interest scores per tag, calculated from a child's interaction frequency with items carrying that tag.
- **Recommendation Set**: A curated list of items scored by relevance to a child's tag affinity, excluding recently seen items.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Two children with different interaction histories see at least 50% different items in their top 20 browsing results.
- **SC-002**: Recommendations return results within 1 second for any device.
- **SC-003**: Items a child has already printed do not appear in the top 20 of their browsing list (unless fewer than 20 unseen items remain).
- **SC-004**: A new device with zero history receives a valid browsing list on first request.
- **SC-005**: Recommendation relevance — at least 70% of recommended items share at least one tag with the child's top 5 most-interacted tags.

## Assumptions

- The existing `activity_events` table (view, detail, print events per device) provides sufficient signal for personalization.
- Tag-based affinity is a good-enough proxy for a child's interests (no need for collaborative filtering at this stage).
- "Popular" items for fallback are determined by total interaction count across all devices.
- The existing recommendation endpoint will be enhanced (not replaced).
- Mobile app changes are minimal: add device ID to list requests and add a recommendations UI section.

## Scope Boundaries

**In scope**:
- Backend personalization logic and endpoints
- Per-device tag affinity calculation
- Personalized ordering of the main browsing list
- Separate recommendation list
- Mobile app: send device ID on list requests
- Mobile app: "Kamu Mungkin Suka" section on home screen

**Out of scope**:
- Collaborative filtering (user-to-user similarity)
- Machine learning models
- Admin UI for tuning recommendation weights
