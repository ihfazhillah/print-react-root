# Contract: Print Dispatch

## Existing Endpoint (unchanged API)

```
GET /api/print-image?url=<url>
```

Response: `{"status": "success"|"error", "message": "string"}`

## Internal Dispatch Logic (new)

The endpoint now dispatches to the correct handler based on URL pattern:

```python
def get_print_handler(url: str) -> PrintHandler:
    if "krokotak.com" in url:
        return KrokotakHandler()        # existing logic
    elif url.lower().endswith(".pdf"):
        return DirectPdfHandler()        # new
    elif url.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        return DirectImageHandler()      # new
    else:
        return DetailPageHandler()       # new: fetch HTML, extract image
```

## Handler Interface

```python
class PrintHandler:
    async def get_printable_png(self, url: str) -> bytes:
        """Fetch and convert the URL content to PNG bytes for printing."""
        ...
```

## Conversion Pipeline per Handler

| Handler | Steps |
|---------|-------|
| KrokotakHandler | URL → `/_print` → parse HTML → base64 decode → webp→PNG |
| DirectPdfHandler | URL → fetch PDF bytes → `convert pdf[0] png` → PNG |
| DirectImageHandler | URL → fetch image bytes → `convert <format> png` → PNG |
| DetailPageHandler | URL → fetch HTML → find `<img>` or `<a href=*.pdf>` → delegate to DirectImage or DirectPdf |
