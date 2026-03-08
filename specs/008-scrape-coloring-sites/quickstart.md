# Quickstart: Multi-Site Printable Activities Scraper

## Prerequisites

```bash
cd fastapi-image-search
uv pip install playwright    # Only needed for JS-rendered sites
playwright install chromium  # Downloads browser binary
```

## Scrape a single site

```bash
# httpx+BS4 site (fast, no browser needed)
uv run python -m scraper mondaymandala

# Playwright site (opens browser, may pause for captcha)
uv run python -m scraper craftingjeannie

# List all available sites
uv run python -m scraper --list
```

Output: `scraper/output/scraped_mondaymandala.json`

## Seed scraped data into database

```bash
uv run python seed.py --data scraper/output/scraped_mondaymandala.json --source mondaymandala
```

## Scrape all sites

```bash
# All httpx sites (no browser)
uv run python -m scraper --all --skip-playwright

# All sites including Playwright (will open browser)
uv run python -m scraper --all

# Resume after crash/captcha (uses checkpoint files)
uv run python -m scraper mondaymandala --resume
```

## Seed all scraped data

```bash
for f in scraper/output/scraped_*.json; do
  source=$(basename "$f" | sed 's/scraped_//;s/\.json//')
  uv run python seed.py --data "$f" --source "$source"
done
```

## Print workflow

No changes needed for the admin. The backend automatically detects the print strategy from the URL:
- `.pdf` URLs → PDF handler (ImageMagick convert)
- `.jpg/.png/.webp` URLs → direct image handler
- `krokotak.com` URLs → existing krokotak handler
- Other URLs → detail page scraper → extract image → print

## Testing

```bash
uv run python -m unittest discover -v
```
