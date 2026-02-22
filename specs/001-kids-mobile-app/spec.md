# Feature Specification: Kids Mobile App

**Feature Branch**: `001-kids-mobile-app`
**Created**: 2026-02-21
**Status**: Draft
**Input**: User description: "Build a mobile application for children
to search, browse, and print images from the existing backend."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and Search Images (Priority: P1)

A child opens the app on their tablet and sees a search bar at the
top of the screen with a grid of image thumbnails below. The child
can scroll through images and the app automatically loads more as
they scroll down. The child can also type a word (or tap a
suggested tag) to filter images by topic.

**Why this priority**: This is the core experience. Without browsing
and searching, the app has no value. Everything else depends on the
child being able to find images.

**Independent Test**: Can be fully tested by opening the app,
scrolling through images, and typing a search term. Delivers value
as a standalone image browser even without printing.

**Acceptance Scenarios**:

1. **Given** the app is opened for the first time and a valid server
   endpoint is configured, **When** the home screen loads, **Then**
   the child sees a search input at the top and a grid of image
   thumbnails (3-4 columns) below.
2. **Given** the home screen is displayed with images, **When** the
   child scrolls to the bottom of the current list, **Then** the
   app automatically fetches and appends the next page of images.
3. **Given** the home screen is displayed, **When** the child types
   "craft" in the search bar, **Then** after a short debounce
   (300-500ms) only images matching the "craft" tag are shown in the
   grid (search-as-you-type, no submit button needed).
4. **Given** search results are displayed, **When** the child clears
   the search input, **Then** the full unfiltered image list is
   restored.
5. **Given** any image grid, **When** a thumbnail is displayed,
   **Then** the full image is visible (aspect-ratio preserved, not
   cropped), displayed as a thumbnail (not full resolution).

---

### User Story 2 - View Image Details and Print (Priority: P2)

A child taps on an individual image (not a collection) and is taken
to a detail page. The detail page shows the image larger, its tags
in a "Detail" section, and related images (same tags) in a
"Related" section. The child can tap a "Print" button to send the
image to the printer. The print button becomes disabled while the
request is in progress and shows feedback on success or failure.

**Why this priority**: Printing is the primary action the child
wants to take. This story covers the end-to-end flow for single
images, which is the simpler and more common case.

**Independent Test**: Can be tested by tapping any individual image,
viewing its detail/related sections, and tapping print. Delivers
the core print-an-image value.

**Acceptance Scenarios**:

1. **Given** the home screen grid, **When** a child taps on an
   individual (non-collection) image, **Then** the app navigates
   to the image detail page showing the image, a "Detail" section
   with its tags, and a "Related" section with images sharing the
   same tags.
2. **Given** the image detail page, **When** the child taps the
   "Print" button, **Then** the button becomes disabled and shows
   a loading state while the print request is being processed.
3. **Given** a print request is in progress, **When** the backend
   responds with success, **Then** the child sees a clear visual
   success confirmation and the print button re-enables.
4. **Given** a print request is in progress, **When** the backend
   responds with an error, **Then** the child sees a simple,
   child-friendly error message and the print button re-enables
   to allow retry.
5. **Given** the "Related" section on the detail page, **When** the
   child taps a related image, **Then** the app navigates to that
   image's detail page.

---

### User Story 3 - Browse Collections (Priority: P3)

A child taps on a collection item from the home screen grid. The
app navigates to a collection page that shows all images belonging
to the collection in a "Detail" section, and images related by
shared tags in a separate "Related" section. The two sections are
visually distinct. The child can tap any individual image from
either section to go to the individual image detail page (User
Story 2) where they can print.

**Why this priority**: Collections add browsing depth and
discoverability. This builds on the individual image flow (US2)
but requires an additional intermediate screen.

**Independent Test**: Can be tested by tapping a collection item,
verifying the collection images and related images appear in
separate sections, and navigating from a collection image to
the individual detail page.

**Acceptance Scenarios**:

1. **Given** the home screen grid, **When** a child sees a
   collection item, **Then** it is visually distinguished from
   individual prints (e.g., a ribbon or badge label) so the child
   knows it leads to a collection page rather than a detail page.
2. **Given** the home screen grid, **When** a child taps on a
   collection item, **Then** the app navigates to the collection
   page showing a "Detail" section with all images in the
   collection and a "Related" section with tag-matched images
   (different items from those in the Detail section).
3. **Given** the collection page, **When** the child looks at the
   screen, **Then** the "Detail" (collection images) and "Related"
   sections are visually differentiated (e.g., separate headings,
   dividers, or background colors).
4. **Given** the collection page, **When** the child taps an
   individual image from either section, **Then** the app navigates
   to the individual image detail page (US2 flow).

---

### User Story 4 - Configure Server Endpoint (Priority: P4)

A parent or child taps the gear icon at the top of the home screen
to access the settings page. The settings page allows configuring
the backend server endpoint by entering an IP address and an
optional port. The app uses this endpoint for all subsequent
requests.

**Why this priority**: Configuration is essential for the app to
work on the local network, but it's a one-time setup that doesn't
need to be done before every session. The app ships with a default
endpoint defined at build time (via Expo environment variable), so
the child goes straight to the home screen on first launch. The
settings page is available for overriding the endpoint if needed.

**Independent Test**: Can be tested by opening settings, entering
an IP address and port, saving, and verifying subsequent requests
go to the new endpoint.

**Acceptance Scenarios**:

1. **Given** the home screen, **When** the child or parent taps the
   gear icon in the top area, **Then** the settings page opens.
2. **Given** the settings page, **When** the user enters an IP
   address (e.g., "192.168.68.254") and optionally a port (e.g.,
   "8080"), **Then** the app saves these values and uses them as
   the root endpoint for all backend requests.
3. **Given** the settings page with only an IP address filled in
   (no port), **When** the user saves, **Then** the app uses the
   IP address with a default port (80).
4. **Given** saved settings, **When** the app is closed and
   reopened, **Then** the previously saved endpoint configuration
   persists.
5. **Given** the settings page, **When** the user enters an invalid
   IP address format, **Then** the app shows a validation message
   and does not save.

---

### Edge Cases

- What happens when the backend server is unreachable? The app MUST
  show a clear, child-friendly "cannot connect" message rather than
  a blank screen or crash.
- What happens when search returns zero results? The app MUST show
  an empty-state message (e.g., "No images found") instead of a
  blank grid.
- What happens when the user scrolls very fast past many pages? The
  app MUST not duplicate images or skip pages during auto-fetch
  pagination.
- What happens when a collection has zero prints? The "Detail"
  section MUST show an empty-state message rather than nothing.
- What happens when an image has no related items? The "Related"
  section MUST show an empty-state message.
- What happens when the print request takes a long time? The print
  button MUST remain disabled with a loading indicator until the
  response arrives; there is no client-side timeout that silently
  fails.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: App MUST display a search input at the top of the home
  screen and an image grid below it.
- **FR-002**: Image grid MUST use 3-4 columns per row, with each
  thumbnail showing the full image (aspect-ratio preserved, not
  cropped, not full resolution).
- **FR-003**: App MUST auto-fetch the next page of images when the
  user scrolls near the bottom of the current list (infinite scroll).
- **FR-004**: App MUST support searching images by keyword using
  search-as-you-type with a 300-500ms debounce, filtering the grid
  to matching results live as the child types.
- **FR-005**: Tapping an individual image MUST navigate to a detail
  page with "Detail" (image + tags) and "Related" (tag-matched
  images) sections.
- **FR-005a**: Collection items on the home grid MUST be visually
  distinguished from individual prints (e.g., a ribbon or badge)
  so the child can tell that tapping leads to a collection page.
- **FR-006**: Tapping a collection MUST navigate to a collection page
  with "Detail" (collection images) and "Related" (tag-matched
  images) sections, visually differentiated. The "Related" section
  MUST show different items from the "Detail" section (items
  sharing the same tags, not the collection's own prints).
- **FR-007**: From a collection page, tapping any individual image
  MUST navigate to the individual image detail page.
- **FR-008**: The detail page MUST include a "Print" button that
  sends the image to the printer via the backend.
- **FR-009**: The print button MUST be disabled with a loading
  indicator while the print request is in progress, and re-enable
  after the response (success or failure).
- **FR-010**: App MUST show clear, child-friendly feedback for print
  success and print failure.
- **FR-011**: A gear icon MUST be visible at the top of the home
  screen, leading to a settings page.
- **FR-012**: Settings page MUST allow configuring the backend server
  IP address and an optional port number.
- **FR-013**: Endpoint configuration MUST persist across app
  restarts.
- **FR-014**: App MUST validate the IP address format before saving.
- **FR-015**: App MUST show a connection error state when the backend
  is unreachable.
- **FR-016**: App MUST show an empty-state message when search
  results or sections have no content.
- **FR-017**: Detail and collection pages MUST display a visible
  back arrow at the top of the screen. Both the on-screen back arrow
  and the Android system back gesture/button MUST navigate to the
  previous screen.

### Key Entities

- **Item**: A browsable entry on the home screen. Can be either a
  "collection" or an individual "print". Has a thumbnail URL, a
  detail URL, and a list of search tags.
- **Collection**: An item of type "collection" that contains multiple
  individual prints. Has its own tags and a list of child print
  items.
- **Print (Individual Image)**: An item of type "print" representing
  a single printable image. Has a thumbnail, a print URL, and tags.
- **Tag**: A keyword associated with items (e.g., "craft-coloring",
  "fine-motor"). Used for search and for finding related items.
- **Server Configuration**: The saved backend endpoint consisting of
  an IP address and optional port. Persisted locally on the device.

### Assumptions

- The existing backend endpoints (`/api/items`, `/api/search`,
  `/api/related/{item_index}`, `/api/tags`, `/api/print-image`)
  remain stable and unchanged.
- The app runs on a tablet connected to the same local network as
  the backend server and the printer.
- No authentication is required; the app operates in a trusted
  home network environment.
- The backend handles image conversion and printer communication;
  the mobile app only triggers the print via the existing endpoint.
- Default port when none is specified is 80.
- The default backend endpoint is defined at build time via an Expo
  environment variable. The app launches directly to the home screen
  without requiring first-run configuration.
- The app targets Android tablets (7-12 inch screens) as the primary
  form factor. iOS is out of scope for the initial release.
- The mobile app is built with React Native using the Expo managed
  workflow (TypeScript, Expo Router for navigation, Expo SecureStore
  or AsyncStorage for persistence).

## Clarifications

### Session 2026-02-21

- Q: What mobile framework should the app use? → A: React Native with Expo (managed workflow)
- Q: Which platform should the app target? → A: Android only (iOS can be added later)
- Q: First-launch behavior: default endpoint or setup prompt? → A: Default endpoint defined at build time (Expo env var); app goes straight to home screen
- Q: How does search trigger — live as-you-type or explicit submit? → A: Search-as-you-type with debounce (300-500ms)
- Q: How does the child navigate back from detail/collection pages? → A: On-screen back arrow on sub-pages + Android system back both work

### Session 2026-02-22

- Q: How should collection items be differentiated from prints on the home grid? → A: Add a visual ribbon/badge (e.g., "Collection" label) on collection thumbnails so the child knows it leads to a collection page, not a detail page
- Q: Should the collection page "Related" section show the same items as the "Detail" section? → A: No — the "Related" section must show different content. Use tag-based search to find other items sharing the same tags, not the collection's own prints (which are already in the Detail section)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A child can find and print an image in under 60
  seconds from opening the app.
- **SC-002**: Image grid loads and displays the first page of
  thumbnails within 3 seconds of opening the app (on local network).
- **SC-003**: Scrolling through the image grid is smooth and
  pagination loads seamlessly without the child noticing loading
  gaps.
- **SC-004**: 100% of print attempts result in clear feedback
  (success or failure message) to the child.
- **SC-005**: The app remains usable by a child without adult
  assistance after initial server configuration.
- **SC-006**: Server endpoint configuration persists across app
  restarts with zero data loss.
