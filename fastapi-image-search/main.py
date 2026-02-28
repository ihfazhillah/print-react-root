import base64
import json
import os
import subprocess
import tempfile
from collections import OrderedDict
from pathlib import Path
from typing import Any, Dict, List

import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException, Request, UploadFile
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from printer import get_printer_service

app = FastAPI()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="templates")

# Load data
DATA_FILE = Path("data.json")
data: List[Dict[str, Any]] = []


def load_data():
    global data
    if DATA_FILE.exists():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        # Create sample data if file doesn't exist
        data = create_sample_data()
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)


def create_sample_data():
    return [
        {
            "thumbnail": "https://print.krokotak.com/d/p/f/9/5/f952a50a27cc8bdbcae27edab3b091d6_1.t.webp",
            "url": "https://print.krokotak.com/collection?id=f952a50a27cc8bdbcae27edab3b091d6",
            "searches": [
                {
                    "link": "https://print.krokotak.com/search?q=craft-coloring",
                    "text": "craft-coloring",
                },
                {
                    "link": "https://print.krokotak.com/search?q=fine-motor",
                    "text": "fine-motor",
                },
                {
                    "link": "https://print.krokotak.com/search?q=prewriting",
                    "text": "prewriting",
                },
            ],
            "type": "collection",
            "prints": [
                {
                    "thumbnail": "https://print.krokotak.com/d/p/f/9/5/f952a50a27cc8bdbcae27edab3b091d6_1.t.webp",
                    "url": "https://print.krokotak.com/print?id=f952a50a27cc8bdbcae27edab3b091d6_1",
                    "searches": [
                        {
                            "link": "https://print.krokotak.com/search?q=craft-coloring",
                            "text": "craft-coloring",
                        },
                        {
                            "link": "https://print.krokotak.com/search?q=fine-motor",
                            "text": "fine-motor",
                        },
                    ],
                    "type": "print",
                },
                {
                    "thumbnail": "https://print.krokotak.com/d/p/f/9/5/f952a50a27cc8bdbcae27edab3b091d6_2.t.webp",
                    "url": "https://print.krokotak.com/print?id=f952a50a27cc8bdbcae27edab3b091d6_2",
                    "searches": [
                        {
                            "link": "https://print.krokotak.com/search?q=craft-coloring",
                            "text": "craft-coloring",
                        },
                        {
                            "link": "https://print.krokotak.com/search?q=prewriting",
                            "text": "prewriting",
                        },
                    ],
                    "type": "print",
                },
            ],
        },
        {
            "thumbnail": "https://print.krokotak.com/d/p/5/3/f/53ff6109fd331e72f3eafa8238b43c18_1.t.webp",
            "url": "https://print.krokotak.com/print?id=53ff6109fd331e72f3eafa8238b43c18_1",
            "searches": [
                {
                    "link": "https://print.krokotak.com/search?q=baba-marta",
                    "text": "baba-marta",
                },
                {
                    "link": "https://print.krokotak.com/search?q=craft-coloring",
                    "text": "craft-coloring",
                },
            ],
            "type": "print",
        },
    ]


# Load data on startup
load_data()

# Initialize printer service from environment config
printer_service = get_printer_service()


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/api/items")
async def get_items(skip: int = 0, limit: int = 20):
    """Get collections and prints with pagination"""
    return data[skip : skip + limit]


@app.get("/api/search")
async def search_items(q: str = "", skip: int = 0, limit: int = 20):
    """Search items by tag/text with pagination"""
    if not q:
        return data[skip : skip + limit]

    q_lower = q.lower()
    results = []

    for item in data:
        # Check if item's searches match
        item_tags = [s["text"].lower() for s in item.get("searches", [])]
        if any(q_lower in tag for tag in item_tags):
            results.append(item)
            continue

        # For collections, also check prints
        if item.get("type") == "collection":
            for print_item in item.get("prints", []):
                print_tags = [s["text"].lower() for s in print_item.get("searches", [])]
                if any(q_lower in tag for tag in print_tags):
                    results.append(item)
                    break

    return results[skip : skip + limit]


@app.get("/api/related/{item_index}")
async def get_related(item_index: int):
    """Get related items based on searches/tags"""
    if item_index < 0 or item_index >= len(data):
        return []

    item = data[item_index]
    item_tags = set(s["text"].lower() for s in item.get("searches", []))

    # If it's a collection, return its prints
    if item.get("type") == "collection":
        return item.get("prints", [])

    # If it's a print, find related items by tags
    related = []
    for i, other_item in enumerate(data):
        if i == item_index:
            continue

        other_tags = set(s["text"].lower() for s in other_item.get("searches", []))

        # Check for common tags
        if item_tags & other_tags:  # Intersection
            related.append(other_item)

    return related


@app.get("/api/tags")
async def get_tags(limit: int = 10):
    """Get unique tags with limit"""
    tags = set()
    for item in data:
        for search in item.get("searches", []):
            tags.add(search["text"])

        if item.get("type") == "collection":
            for print_item in item.get("prints", []):
                for search in print_item.get("searches", []):
                    tags.add(search["text"])

    return sorted(list(tags))[:limit]


async def fetch_krokotak_page(url: str) -> str:
    """Fetch krokotak _print page and return base64 image string"""
    # Transform /print to /_print
    print_url = url.replace("/print?", "/_print?")

    # Fetch page
    async with httpx.AsyncClient(verify=False) as client:
        response = await client.get(print_url)
        response.raise_for_status()
        html = response.text

    # Parse HTML and find first img tag
    soup = BeautifulSoup(html, "html.parser")
    img_tag = soup.find("img")

    if not img_tag or not img_tag.get("src"):
        raise ValueError("No image found in page")

    # Extract base64 data
    img_src = img_tag["src"]
    if not img_src.startswith("data:image"):
        raise ValueError("Invalid image data format")

    return img_src



def convert_to_png(image_bytes: bytes) -> bytes:
    """Convert webp image bytes to PNG using ImageMagick"""
    # Save to temp file
    with tempfile.NamedTemporaryFile(suffix=".webp", delete=False) as temp_file:
        temp_file.write(image_bytes)
        temp_path = temp_file.name

    # Convert to PNG using ImageMagick convert
    png_path = temp_path.replace(".webp", ".png")
    subprocess.run(["convert", temp_path, png_path], check=True)

    # Read converted image
    with open(png_path, "rb") as f:
        png_bytes = f.read()

    # Clean up temp files
    os.unlink(temp_path)
    os.unlink(png_path)

    return png_bytes


_image_cache: OrderedDict[str, tuple] = OrderedDict()  # url -> (content_type, bytes)
_image_cache_bytes = 0
IMAGE_CACHE_MAX_BYTES = 20 * 1024 * 1024  # 20 MB


@app.get("/api/proxy-image")
async def proxy_image(url: str):
    """Proxy an external image to bypass untrusted SSL certificates (cached, 20 MB LRU)"""
    global _image_cache_bytes

    if url in _image_cache:
        content_type, content = _image_cache[url]
        return Response(content=content, media_type=content_type)

    try:
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.get(url)
            response.raise_for_status()
            content_type = response.headers.get("content-type", "image/webp")
            size = len(response.content)

            # Evict oldest entries until there's room
            while _image_cache and _image_cache_bytes + size > IMAGE_CACHE_MAX_BYTES:
                _, (_, evicted) = _image_cache.popitem(last=False)
                _image_cache_bytes -= len(evicted)

            _image_cache[url] = (content_type, response.content)
            _image_cache_bytes += size

            return Response(content=response.content, media_type=content_type)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/api/print-image")
async def get_print_image(url: str):
    """Get print image by scraping krokotak _print page and send to printer"""
    try:
        # Fetch krokotak page and get base64 image
        img_src = await fetch_krokotak_page(url)

        # Decode base64
        header, base64_data = img_src.split(",", 1)
        image_bytes = base64.b64decode(base64_data)

        # Convert to PNG
        png_bytes = convert_to_png(image_bytes)

        # Send to printer via configured service
        result = await printer_service.print_image(png_bytes)

        # Return success message
        return {"status": result.status, "message": result.message}

    except Exception as e:
        print(f"Error fetching print image: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8080)
