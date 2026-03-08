# Feature Specification: Multi-Site Printable Activities Scraper

**Feature Branch**: `008-scrape-coloring-sites`
**Created**: 2026-03-08
**Status**: Draft
**Input**: User description: "Scrape free printable websites for kids — coloring pages, craft templates, origami patterns, and paper cutting activities. Collect image URLs (hotlinked, not downloaded), categorize by site categories, store with source differentiation, and display in the kids app."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scrape and Import Printable Activities from Multiple Sites (Priority: P1)

An administrator runs a scraper script that visits multiple free printable websites across four content types (coloring pages, craft templates, origami, paper cutting), extracts image URLs (thumbnails and full-size/PDF links), collects category/tag information from each site, and outputs structured JSON files per source. These JSON files are then seeded into the existing database using the existing seed script, with each source identified separately.

**Why this priority**: This is the core functionality — without scraped data, nothing else works.

**Independent Test**: Can be tested by running the scraper against a single category of a single site and verifying the output JSON contains valid image URLs, tags, and correct source identifiers.

**Acceptance Scenarios**:

1. **Given** the scraper is configured with target sites, **When** the scraper runs for a specific site, **Then** it produces a JSON file for that source containing entries with `url`, `thumbnail`, `searches` (tags), `type`, and metadata.
2. **Given** a scraped JSON file exists, **When** the seed script is run with `--source <site_name>`, **Then** pages are imported into the database with the correct source identifier.
3. **Given** a site has categories (e.g., "animals", "masks", "easy origami"), **When** that site is scraped, **Then** each page entry includes tags derived from the site's own category structure.
4. **Given** the scraper is run for a craft/origami/cutting site, **When** entries are produced, **Then** they include a content-type tag (e.g., "craft", "origami", "cutting-practice") in addition to the site's own category tags.

---

### User Story 2 - Browse Printable Activities by Source in the App (Priority: P2)

A child or parent opens the kids app and sees printable activities from multiple sources intermixed. They can see which source each item comes from. The app's existing tag/category system is used — if a tag from a scraped site already exists (e.g., "animals"), the existing tag is reused; otherwise a new tag is created.

**Why this priority**: Displaying the scraped content to users is the direct value delivery.

**Independent Test**: Can be tested by seeding scraped data into the database and verifying pages appear in the app's item list with correct thumbnails, tags, and source labels.

**Acceptance Scenarios**:

1. **Given** pages from multiple sources exist in the database, **When** a user browses the app, **Then** pages from all sources appear in the listing.
2. **Given** a page has the source "craftingjeannie", **When** that page is displayed, **Then** the source is identifiable (stored in database, available via API).
3. **Given** a scraped site uses the category "animals" and that tag already exists, **When** the page is imported, **Then** it is linked to the existing "animals" tag (no duplicate created).

---

### User Story 3 - Print/View Activities from New Sources (Priority: P2)

A user selects a printable activity from a non-krokotak source and wants to print or view the full image. The system handles different source formats: some provide direct PDF links, some provide JPG/PNG images, some require visiting a detail page.

**Why this priority**: Printing is the primary use case of the app — pages that can't be printed have limited value.

**Independent Test**: Can be tested by selecting a page from each source and verifying the full image or PDF is accessible and printable.

**Acceptance Scenarios**:

1. **Given** a page with a direct PDF link, **When** the user prints it, **Then** the PDF is fetched and sent to the printer.
2. **Given** a page with a JPG/PNG image URL, **When** the user prints it, **Then** the image is fetched, converted if needed, and printed.
3. **Given** a page where the URL points to a detail/download page (not a direct image), **When** the user prints it, **Then** the system fetches the detail page and extracts the printable image from it.

---

### Edge Cases

- What happens when a scraped site is temporarily down or returns errors? The scraper logs failures and continues with remaining pages/sites.
- What happens when an image URL becomes invalid after scraping (hotlink broken)? The app shows a placeholder or error state; the proxy endpoint handles the failure gracefully.
- What happens when a site changes its HTML structure? The scraper fails for that site and logs a clear error indicating which parser broke.
- What happens when duplicate URLs exist across different sites? Each entry's `url` field is unique in the database; duplicates are skipped during import.
- What happens when a category page has pagination? The scraper follows pagination to collect all pages within a category.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a scraper script with per-site parsers that extract printable activity data from the target sites listed in the Target Sites section.
- **FR-002**: For each scraped page, the system MUST capture: a page/detail URL, a thumbnail image URL, category tags from the source site, and the entry type (print).
- **FR-003**: Image URLs MUST be hotlinked (pointing to the original source), not downloaded and stored locally.
- **FR-004**: Each scraped source MUST produce a separate JSON file following the existing `data.json` format: `{"url", "thumbnail", "searches": [{"text": "tag"}], "type": "print"}`.
- **FR-005**: The seed script MUST accept a `--source` parameter to identify which site the data came from (e.g., `mondaymandala`, `craftingjeannie`, `origamifun`).
- **FR-006**: Tags from scraped sites MUST be matched case-insensitively against existing tags to avoid duplicates.
- **FR-007**: The scraper MUST implement rate limiting (maximum 2 requests per second per site) to avoid being blocked.
- **FR-008**: The scraper MUST handle pagination within category pages to collect all available pages.
- **FR-009**: The scraper MUST log progress (categories processed, pages found, errors encountered) to stdout.
- **FR-010**: The backend MUST serve pages from all sources through the existing `/api/items` and `/api/search` endpoints without modification to the API contract.
- **FR-011**: The print/view workflow MUST adapt to the source's image format — direct PDF links, direct image URLs, or detail page scraping as appropriate per source.
- **FR-012**: Each scraped entry MUST include a content-type tag (e.g., "coloring", "craft", "origami", "cutting-practice", "maze", "dot-to-dot", "word-search", "spot-the-difference", "paper-doll", "tracing") so users can filter by activity type.
- **FR-013**: The scraper MUST be runnable per-site (not all-or-nothing) so individual sites can be re-scraped independently.

### Key Entities

- **Scraped Page**: A printable activity entry with a source-specific URL, thumbnail hotlink, list of category tags, and source identifier. Stored in the existing `printable_pages` table with the `source` column differentiating origins.
- **Source**: An identifier string (e.g., "mondaymandala", "crayola", "origamifun") stored per page to track provenance and enable source-specific print/view handling.
- **Content Type Tag**: A tag like "coloring", "craft", "origami", "cutting-practice", "maze", "dot-to-dot", "word-search", "spot-the-difference", "paper-doll", or "tracing" applied to every entry to distinguish the activity type across sources.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The scraper successfully extracts data from at least 15 of the target sites in individual runs.
- **SC-002**: At least 5,000 unique printable activities are imported across all sources combined.
- **SC-003**: Every imported page has at least one category tag derived from the source site's categorization plus a content-type tag.
- **SC-004**: All imported pages display correctly in the kids app with working thumbnail images.
- **SC-005**: Pages from each source can be printed or viewed using the appropriate format (PDF or image).
- **SC-006**: All seven content types (coloring, craft, origami, cutting, maze/dot-to-dot, puzzles, paper dolls) are represented in the imported data.

## Assumptions

- The target websites permit hotlinking of their images (no hotlink protection that blocks external referrers).
- The HTML structure of target sites is stable enough for scraping at the time of implementation.
- The existing proxy endpoint (`/api/proxy-image`) can be used to fetch images from new sources, handling any referrer or CORS issues.
- No user authentication is required to access the printable pages on any target site.
- The scraper is run manually by an administrator, not as an automated recurring job.

## Target Sites

### Coloring Pages

| Site                    | Source ID             | Categories          | Image Format                        | Notes                                    |
| ----------------------- | --------------------- | ------------------- | ----------------------------------- | ---------------------------------------- |
| Monday Mandala          | mondaymandala         | ~180 topic-based    | JPG thumbnails + PDF download links | Largest collection, ~10k pages           |
| Printable Free Coloring | printablefreecoloring | 31 broad categories | JPG thumbnails + full JPG images    | Nested: category -> subcategory -> pages |
| Crayola                 | crayola               | ~25 categories      | PNG/JPG images                      | Well-structured HTML grid layout         |
| Cute Coloring Pages     | cutecoloringpages     | ~30 themes          | JPG + PDF in WordPress posts        | WordPress blog structure                 |
| Coloring Bunny          | coloringbunny         | 100s                | Online + PDF download               | Online coloring + printable              |
| Yay! Coloring Pages     | yaycoloringpages      | 100s                | PDF                                 | Hand-drawn, no AI art                    |
| Online-Coloring.com     | onlinecoloring        | 100s                | Interactive + printable             | 1700+ pages                              |

### Craft Templates

| Site             | Source ID        | Categories       | Image Format      | Notes                                |
| ---------------- | ---------------- | ---------------- | ----------------- | ------------------------------------ |
| Crafting Jeannie | craftingjeannie  | Seasonal/holiday | PDF templates     | 100+ craft printables                |
| PJs and Paint    | pjsandpaint      | Animals/vehicles | PDF               | 121+ "build your own" paper crafts   |
| Paper Toys       | papertoys        | 3D models        | PDF               | 3D papercraft models                 |
| FirstPalette     | firstpalette     | Masks/puppets    | PDF + images      | Masks, crowns, puppets, paper toys   |
| The Craft Train  | thecrafttrain    | Mixed            | PDF               | 40+ free kids printable crafts       |

### Origami

| Site             | Source ID       | Categories     | Image Format   | Notes                       |
| ---------------- | --------------- | -------------- | -------------- | --------------------------- |
| Origami-Fun      | origamifun      | By difficulty  | PDF diagrams   | Printable diagrams + paper  |
| Happy Folding    | happyfolding    | By model       | PDF diagrams   | 162 diagrams                |
| Kiddo Worksheets | kiddoworksheets | By type        | PDF worksheets | Origami worksheets for kids |

### Paper Cutting / Scissors Practice

| Site              | Source ID         | Categories      | Image Format   | Notes                          |
| ----------------- | ----------------- | --------------- | -------------- | ------------------------------ |
| Suncatcher Studio | suncatcherstudio  | By skill level  | PDF worksheets | Cutting practice worksheets    |
| Fun Sensory Play  | funsensoryplay    | By skill level  | PDF worksheets | Scissors skills practice       |
| Kidsnex           | kidsnex           | By activity     | PDF            | Free printable cutting sheets  |

### Maze & Dot-to-Dot

| Site               | Source ID          | Categories       | Image Format   | Notes                              |
| ------------------ | ------------------ | ---------------- | -------------- | ---------------------------------- |
| All Kids Network   | allkidsnetwork     | By theme         | PDF/images     | Mazes + dot-to-dot                 |
| Animal Dot to Dots | animaldottodots    | By animal        | PDF worksheets | 100+ animal dot-to-dot worksheets  |
| Monkey Pen         | monkeypen          | By theme         | PDF            | Dot-to-dot printables              |
| Superstar Worksheets | superstarworksheets | By skill level | PDF worksheets | Dot-to-dot + mazes                 |

### Puzzles (Word Search & Spot the Difference)

| Site              | Source ID         | Categories       | Image Format   | Notes                            |
| ----------------- | ----------------- | ---------------- | -------------- | -------------------------------- |
| Puzzles to Print  | puzzlestoprint    | By theme         | PDF            | Word search puzzles with answers |
| Tree Valley Academy | treevalleyacademy | By theme/level | PDF            | 66+ word searches for kids       |
| Just Family Fun   | justfamilyfun     | By difficulty    | PDF            | 50+ word search + 60+ spot the difference |
| Print it Free     | printitfree       | By theme         | PDF/images     | Spot the difference puzzles      |

### Paper Dolls

| Site                | Source ID          | Categories        | Image Format | Notes                              |
| ------------------- | ------------------ | ----------------- | ------------ | ---------------------------------- |
| Paper Thin Personas | paperthinpersonas  | By doll series    | PDF          | Kid-friendly, large tabs for cutting |
| Design Eat Repeat   | designeatrepeat    | Mixed             | PDF          | 6 dolls + outfits freebie          |
| Adventure in a Box  | adventureinabox    | Dress-up themes   | PDF          | Printable dress-up paper dolls     |

### Tracing & Handwriting

| Site                | Source ID           | Categories        | Image Format   | Notes                           |
| ------------------- | ------------------- | ----------------- | -------------- | ------------------------------- |
| Worksheet Fun       | worksheetfun        | Letters/numbers   | PDF worksheets | Tracing worksheets              |
| Superstar Worksheets | superstarworksheets | By skill level   | PDF worksheets | Tracing + handwriting practice  |
