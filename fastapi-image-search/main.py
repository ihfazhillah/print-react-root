import base64
import logging
import os
import subprocess
import tempfile
from collections import OrderedDict
from contextlib import asynccontextmanager
from typing import Optional

import aiosqlite
import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from db import (
    create_page,
    delete_page,
    get_db,
    get_interactions,
    get_items,
    get_page,
    get_related,
    get_tags,
    init_db,
    record_interaction,
    search_by_tag,
    update_page,
)
from printer import get_printer_service

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    await init_db()
    yield


app = FastAPI(lifespan=lifespan)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="templates")

# Initialize printer service from environment config
printer_service = get_printer_service()


# ---------------------------------------------------------------------------
# Pydantic models for request validation
# ---------------------------------------------------------------------------


class PageCreate(BaseModel):
    url: str
    thumbnail: str
    type: str = "print"
    source: str = "manual"
    tags: list[str] = []
    parent_id: int | None = None


class PageUpdate(BaseModel):
    url: str | None = None
    thumbnail: str | None = None
    type: str | None = None
    source: str | None = None
    tags: list[str] | None = None
    parent_id: int | None = None


class InteractionCreate(BaseModel):
    page_id: int
    interaction_type: str
    session_id: str | None = None


# ---------------------------------------------------------------------------
# Existing endpoints (migrated from in-memory data to DB)
# ---------------------------------------------------------------------------


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/api/items")
async def api_get_items(skip: int = 0, limit: int = 20):
    """Get collections and prints with pagination"""
    try:
        async with get_db() as db:
            return await get_items(db, skip, limit)
    except (aiosqlite.Error, OSError):
        raise HTTPException(status_code=503, detail="Database unavailable")


@app.get("/api/search")
async def api_search_items(q: str = "", skip: int = 0, limit: int = 20):
    """Search items by tag/text with pagination"""
    try:
        async with get_db() as db:
            if not q:
                return await get_items(db, skip, limit)
            return await search_by_tag(db, q, skip, limit)
    except (aiosqlite.Error, OSError):
        raise HTTPException(status_code=503, detail="Database unavailable")


@app.get("/api/related/{item_id}")
async def api_get_related(
    item_id: int,
    session_id: Optional[str] = None,
):
    """Get related items based on searches/tags. Optionally records a view interaction."""
    try:
        async with get_db() as db:
            # Record view interaction if session_id is provided (US3)
            if session_id is not None:
                try:
                    await record_interaction(
                        db,
                        {
                            "page_id": item_id,
                            "interaction_type": "view",
                            "session_id": session_id,
                        },
                    )
                except Exception:
                    pass  # Don't fail the request if tracking fails

            return await get_related(db, item_id)
    except (aiosqlite.Error, OSError):
        raise HTTPException(status_code=503, detail="Database unavailable")


@app.get("/api/tags")
async def api_get_tags(limit: int = 10):
    """Get unique tags with limit"""
    try:
        async with get_db() as db:
            return await get_tags(db, limit)
    except (aiosqlite.Error, OSError):
        raise HTTPException(status_code=503, detail="Database unavailable")


# ---------------------------------------------------------------------------
# CRUD endpoints (US2)
# ---------------------------------------------------------------------------


@app.post("/api/pages", status_code=201)
async def api_create_page(body: PageCreate):
    """Create a new printable page entry."""
    if body.type not in ("print", "collection"):
        raise HTTPException(status_code=400, detail="type must be 'print' or 'collection'")
    try:
        async with get_db() as db:
            try:
                return await create_page(db, body.model_dump())
            except aiosqlite.IntegrityError:
                raise HTTPException(status_code=409, detail="URL already exists")
    except HTTPException:
        raise
    except (aiosqlite.Error, OSError):
        raise HTTPException(status_code=503, detail="Database unavailable")


@app.put("/api/pages/{page_id}")
async def api_update_page(page_id: int, body: PageUpdate):
    """Update an existing printable page entry."""
    if body.type is not None and body.type not in ("print", "collection"):
        raise HTTPException(status_code=400, detail="type must be 'print' or 'collection'")
    try:
        async with get_db() as db:
            data = {k: v for k, v in body.model_dump().items() if v is not None}
            if not data:
                raise HTTPException(status_code=400, detail="No fields to update")
            try:
                result = await update_page(db, page_id, data)
            except aiosqlite.IntegrityError:
                raise HTTPException(status_code=409, detail="URL already exists")
            if result is None:
                raise HTTPException(status_code=404, detail="Page not found")
            return result
    except HTTPException:
        raise
    except (aiosqlite.Error, OSError):
        raise HTTPException(status_code=503, detail="Database unavailable")


@app.delete("/api/pages/{page_id}", status_code=204)
async def api_delete_page(page_id: int):
    """Remove a printable page entry."""
    try:
        async with get_db() as db:
            deleted = await delete_page(db, page_id)
            if not deleted:
                raise HTTPException(status_code=404, detail="Page not found")
    except HTTPException:
        raise
    except (aiosqlite.Error, OSError):
        raise HTTPException(status_code=503, detail="Database unavailable")


# ---------------------------------------------------------------------------
# Interaction endpoints (US3)
# ---------------------------------------------------------------------------


@app.post("/api/interactions", status_code=201)
async def api_create_interaction(body: InteractionCreate):
    """Record a child's interaction with a printable page."""
    if body.interaction_type not in ("select", "print"):
        raise HTTPException(
            status_code=400,
            detail="interaction_type must be 'select' or 'print'",
        )
    try:
        async with get_db() as db:
            # Verify page exists
            page = await get_page(db, body.page_id)
            if page is None:
                raise HTTPException(status_code=400, detail="page_id does not exist")
            return await record_interaction(db, body.model_dump())
    except HTTPException:
        raise
    except (aiosqlite.Error, OSError):
        raise HTTPException(status_code=503, detail="Database unavailable")


@app.get("/api/interactions")
async def api_get_interactions(
    session_id: Optional[str] = None,
    page_id: Optional[int] = None,
    interaction_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
):
    """Query interaction history."""
    try:
        async with get_db() as db:
            return await get_interactions(
                db,
                session_id=session_id,
                page_id=page_id,
                interaction_type=interaction_type,
                skip=skip,
                limit=limit,
            )
    except (aiosqlite.Error, OSError):
        raise HTTPException(status_code=503, detail="Database unavailable")


# ---------------------------------------------------------------------------
# Image proxy & printing (unchanged)
# ---------------------------------------------------------------------------


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
    with tempfile.NamedTemporaryFile(suffix=".webp", delete=False) as temp_file:
        temp_file.write(image_bytes)
        temp_path = temp_file.name

    png_path = temp_path.replace(".webp", ".png")
    subprocess.run(["convert", temp_path, png_path], check=True)

    with open(png_path, "rb") as f:
        png_bytes = f.read()

    os.unlink(temp_path)
    os.unlink(png_path)

    return png_bytes


_image_cache: OrderedDict[str, tuple] = OrderedDict()
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
        img_src = await fetch_krokotak_page(url)

        header, base64_data = img_src.split(",", 1)
        image_bytes = base64.b64decode(base64_data)

        png_bytes = convert_to_png(image_bytes)

        result = await printer_service.print_image(png_bytes)

        return {"status": result.status, "message": result.message}

    except Exception as e:
        print(f"Error fetching print image: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8080)
