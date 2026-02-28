# Feature Specification: Tag CRUD & Indonesian Translation

**Feature Branch**: `004-tag-crud-translation`
**Created**: 2026-03-01
**Status**: Draft
**Input**: User description: "Create CRUD page for tags with Indonesian translation column (id_translation) and bulk translation support for child searching in Indonesian"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Manages Tags via Dedicated CRUD Page (Priority: P1)

As an admin, I want a dedicated tag management page (separate tab or section in the admin UI) where I can view, create, edit, and delete tags so that I can maintain the tag catalog independently from pages.

**Why this priority**: Tags are a core organizational concept in the system. A dedicated management interface enables all subsequent features (translation, search) to work correctly.

**Independent Test**: Can be fully tested by navigating to the tag admin view, creating a new tag, editing it, and deleting it — each operation persists correctly.

**Acceptance Scenarios**:

1. **Given** the admin is on the admin panel, **When** they navigate to the tags section, **Then** they see a table listing all tags with columns: name, Indonesian translation, and actions (edit/delete).
2. **Given** the admin clicks "Add Tag", **When** they fill in the tag name and optionally an Indonesian translation, **Then** a new tag is created and appears in the table.
3. **Given** the admin clicks "Edit" on a tag row, **When** they modify the name or Indonesian translation and save, **Then** the tag is updated and the table reflects the change.
4. **Given** the admin clicks "Delete" on a tag row, **When** they confirm the deletion, **Then** the tag is removed from the system (and any page-tag associations are cleaned up).

---

### User Story 2 - Bulk Translation of Tags to Indonesian (Priority: P2)

As an admin, I want to translate all untranslated tags to Indonesian in one action so that my child can search for content using Indonesian words.

**Why this priority**: The Indonesian translation is the primary motivation for this feature — enabling a child to search in their native language. Bulk translation avoids the tedious process of translating hundreds of tags one by one.

**Independent Test**: Can be tested by having multiple tags without Indonesian translations, triggering bulk translate, and verifying translations appear.

**Acceptance Scenarios**:

1. **Given** there are tags without Indonesian translations, **When** the admin triggers "Translate All", **Then** the system translates all untranslated tag names from English to Indonesian and saves the results.
2. **Given** some tags already have Indonesian translations, **When** the admin triggers "Translate All", **Then** only tags missing translations are processed (existing translations are preserved).
3. **Given** bulk translation completes, **When** the admin views the tag table, **Then** each translated tag shows its Indonesian translation in the id_translation column.
4. **Given** a translation fails for a specific tag, **When** the bulk process encounters the error, **Then** it continues translating remaining tags and reports which tags failed.

---

### User Story 3 - Child Searches Using Indonesian Words (Priority: P3)

As a child user, I want to search for content using Indonesian words so that I can find activities and printables in my own language.

**Why this priority**: This is the end-user payoff of the translation work — the child can now discover content naturally in Indonesian.

**Independent Test**: Can be tested by searching with an Indonesian word that matches a tag's Indonesian translation and verifying matching pages are returned.

**Acceptance Scenarios**:

1. **Given** tags have Indonesian translations, **When** the child searches using an Indonesian word, **Then** pages associated with matching tags are returned.
2. **Given** a search term matches both English tag names and Indonesian translations, **When** the child searches, **Then** results from both matches are returned (deduplicated).
3. **Given** a search term partially matches an Indonesian translation, **When** the child searches, **Then** partial matches are included in results (same fuzzy matching as English search).

---

### Edge Cases

- What happens when a tag name is already in Indonesian or is a universal word (e.g., "origami")? The translation is still stored even if identical to the original.
- What happens when the admin deletes a tag that is associated with pages? The page-tag associations are cleaned up, but pages themselves are not deleted.
- What happens if the translation service is unavailable during bulk translate? The operation fails gracefully and reports the error to the admin.
- What happens when two tags translate to the same Indonesian word? Both retain their translations; search returns results for all matching tags.
- What happens with very long tag names or special characters? The translation handles them gracefully or skips with an error message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated tag management view within the admin interface, displaying all tags in a table with name, Indonesian translation, and action columns.
- **FR-002**: System MUST allow admins to create new tags with a name and an optional Indonesian translation.
- **FR-003**: System MUST allow admins to edit existing tag names and their Indonesian translations.
- **FR-004**: System MUST allow admins to delete tags, cleaning up any page-tag associations.
- **FR-005**: System MUST store an Indonesian translation field for each tag, defaulting to empty when not provided.
- **FR-006**: System MUST provide a "Translate All" bulk action that translates all tags without an Indonesian translation from English to Indonesian.
- **FR-007**: System MUST make Indonesian translations searchable, so that searching by an Indonesian word returns pages tagged with matching translations.
- **FR-008**: System MUST index Indonesian translations for efficient search performance.
- **FR-009**: Bulk translation MUST skip tags that already have an Indonesian translation, preserving manual corrections.
- **FR-010**: Bulk translation MUST continue processing remaining tags if individual translations fail, reporting failures to the admin.
- **FR-011**: Search MUST match against both English tag names and Indonesian translations, returning deduplicated results.

### Key Entities

- **Tag**: Represents a category label for printable pages. Has a unique name (English) and an optional Indonesian translation (id_translation). Tags are shared across pages via a many-to-many relationship.
- **Page-Tag Association**: Links a tag to a printable page, optionally including a source link. Deleting a tag removes its associations but not the pages.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admin can create, view, edit, and delete tags in under 5 seconds per operation.
- **SC-002**: Bulk translation processes all untranslated tags in a single action, completing within 2 seconds per tag on average.
- **SC-003**: Child searching in Indonesian returns relevant results with the same speed as English searches (under 1 second).
- **SC-004**: 100% of tags have Indonesian translations available after running bulk translate (excluding any that fail translation).
- **SC-005**: Search results for Indonesian terms match the same pages that would be found by the equivalent English tag name.

## Assumptions

- The admin UI already has a tab-based navigation pattern (Search/Admin) that can accommodate an additional "Tags" section or tab.
- Tags are currently English-only; the Indonesian translation is a new addition.
- An offline/local translation approach is preferred over cloud-based translation services, to avoid API costs and rate limits. The `deep-translator` library is the better choice — it's lighter-weight, supports multiple free backends (including MyMemory), and is simpler to integrate than argos-translate (which requires downloading large language models).
- The child user accesses the system through the existing search interface (mobile app or web); no separate Indonesian-language UI is needed.
- Pagination in the tag admin table follows the same pattern as the existing pages admin table.
