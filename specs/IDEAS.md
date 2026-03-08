# Feature Ideas & Backlog

Dumping ground for ideas. Not specced yet. Ordered roughly by impact.

## From Usage Analysis (2026-03-06)

Based on 3 days of data: 3 kids, 414 events, 53 prints, 17 unique images printed out of 2,730.

### High Impact

- **My Favorites / Print Again** — Kids reprint same image 30-90x (Mimi: gift box 90x, LuLu: butterfly roll 63x). Add a "My Favorites" section showing their most-printed images for quick reprint. One tap instead of re-searching.

- **Content Gaps: Add more food/vehicle/roll crafts** — Mimi exhausted all pizza (1), cocktail (1), chef (1) images. LuLu almost exhausted toilet paper roll crafts (8 total). Isa only has a few car images. Source more content in these categories from krokotak or other sites.

- **Discovery is broken** — Only 0.6% of catalog ever printed. 2,713 images never seen. Personalized feed (007 spec) will help, but also consider: random "surprise me" button, daily picks, or featured crafts rotation.

### Medium Impact

- **Hide dead categories** — Tags with 50+ images and 0 prints: girl (276), halloween (151), dinosaur (104), dancing (81), fashion (78), flower (116). Options: hide from search, deprioritize in feed, or seasonal visibility (show halloween in October only).

- **Seasonal content surfacing** — Easter is coming (March). LuLu browsed Easter content. Auto-surface seasonal tags near their dates.

- **"New crafts this week"** — LuLu used app day 1 only, never came back. Some kind of freshness signal: badge on app icon, "5 new crafts!" on home screen, or weekly rotation of featured content.

- **Image #92 mystery** — Baba Marta bird craft viewed 42x by both LuLu AND Mimi, never printed. Investigate: is it a collection page without clear print action? Broken print? Or just fun to look at?

### Lower Priority

- **Session tracking** — Track session duration to understand engagement depth. Currently only individual events, no session concept.

- **Age-appropriate difficulty** — Mimi browses scissors/fine-motor crafts but doesn't print them. Maybe too complex? Tag images by difficulty level and match to kid's age/skill.

- **Dinosaur opportunity** — 104 dinosaur images, 0 prints. Isa might love these (she likes cars/vehicles). Only 3 days of data though — might just need discovery.

- **Push notifications** — "LuLu, new butterfly crafts added!" to bring kids back. Requires expo-notifications setup.

- **Print queue** — Instead of one-at-a-time printing, let kids pick multiple images and print batch.

### Out of Scope (from 008-scrape-coloring-sites)

- **Server-generated instruction sheets for non-printable crafts** — Some craft sites have step-by-step tutorials (video/photo) that aren't printable. Idea: auto-generate a printable "instruction card" (PDF/image) server-side from the craft steps, so kids can follow along on paper. This would expand the printable catalog beyond what sources natively offer as PDFs/images. Could use Jinja2 templates or server-side rendering.

## Feature Pipeline Status

| # | Feature | Status |
|---|---------|--------|
| 006 | In-app self-update | Implemented, pending review/merge |
| 007 | Usage insights + personalized feed | Specced, needs clarify → plan → tasks → implement |
| --- | My Favorites / Print Again | Idea only |
| --- | Content gap sourcing | Idea only (manual work) |
| --- | Dead category cleanup | Idea only |
| --- | Seasonal surfacing | Idea only |
