# Contract: Scraper CLI

## Command Interface

```
python -m scraper <site_id>          # Scrape single site
python -m scraper --all              # Scrape all sites
python -m scraper --all --skip-playwright  # Skip JS-rendered sites
python -m scraper <site_id> --resume # Resume from checkpoint
python -m scraper --list             # List available site IDs
```

## Output Format

File: `scraper/output/scraped_<site_id>.json`

```json
[
  {
    "url": "string (print target: PDF, image, or detail page URL)",
    "thumbnail": "string (hotlinked thumbnail URL for display)",
    "searches": [
      {"text": "string (category tag from site)"},
      {"text": "string (content type tag: coloring|craft|origami|...)"}
    ],
    "type": "print"
  }
]
```

## Exit Codes

- `0` — success
- `1` — site not found or argument error
- `2` — partial failure (some categories failed, results saved)

## Stdout Logging

```
[mondaymandala] Starting scrape...
[mondaymandala] Category: cat-coloring-pages (1/180)
[mondaymandala]   Found 25 pages
[mondaymandala] Category: dog-coloring-pages (2/180)
[mondaymandala]   Found 30 pages
[mondaymandala] ⚠ CAPTCHA detected on https://...
[mondaymandala]   → Desktop notification sent
[mondaymandala]   → Solve in browser, then press Enter to continue
[mondaymandala] Resuming...
[mondaymandala] Complete: 4500 pages, 180 categories, 3 errors
```
