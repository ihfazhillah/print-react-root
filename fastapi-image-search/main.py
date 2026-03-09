import logging
from collections import OrderedDict
from contextlib import asynccontextmanager
from typing import Optional

import aiosqlite
import httpx
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from db import (
    bulk_block_tags,
    bulk_translate_tags,
    create_page,
    create_tag,
    deactivate_device,
    delete_page,
    delete_tag,
    get_all_devices,
    get_all_tags,
    get_db,
    get_device_by_token,
    get_device_timeline,
    get_distinct_sources,
    link_android_id,
    merge_devices,
    get_interactions,
    get_items,
    get_personalized_items,
    get_page,
    get_recommendations,
    get_related,
    get_shared_unique_interests,
    get_tags,
    get_top_images,
    get_top_tags_per_device,
    get_usage_summary,
    init_db,
    record_activity_event,
    record_interaction,
    register_device,
    search_by_tag,
    set_device_admin,
    set_tag_blocked,
    update_device_name,
    update_page,
    update_tag,
)
from print_handlers import get_print_handler
from printer import get_printer_service

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    await init_db()
    yield


app = FastAPI(lifespan=lifespan)


@app.middleware("http")
async def no_cache_static(request: Request, call_next):
    """Disable browser caching for static files so JS/CSS changes take effect immediately."""
    response = await call_next(request)
    if request.url.path.startswith("/static/"):
        response.headers["Cache-Control"] = "no-store"
    return response


# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Mount React admin dashboard (built to static/admin/)
import os as _os
_admin_dir = _os.path.join(_os.path.dirname(__file__), "static", "admin")
if _os.path.isdir(_admin_dir):
    app.mount("/admin/assets", StaticFiles(directory=_os.path.join(_admin_dir, "assets")), name="admin-assets")

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


class TagCreate(BaseModel):
    name: str
    id_translation: str = ""


class TagUpdate(BaseModel):
    name: str | None = None
    id_translation: str | None = None


class InteractionCreate(BaseModel):
    page_id: int
    interaction_type: str
    session_id: str | None = None


class DeviceRegister(BaseModel):
    initial_name: str
    android_id: str | None = None


class DeviceAndroidIdLink(BaseModel):
    android_id: str


class DeviceMerge(BaseModel):
    source_id: str
    target_id: str


class DeviceNameUpdate(BaseModel):
    name: str


class ActivityEventCreate(BaseModel):
    event_type: str
    image_id: str | None = None
    timestamp: str | None = None


class DeviceAdminUpdate(BaseModel):
    is_admin: bool


# ---------------------------------------------------------------------------
# Existing endpoints (migrated from in-memory data to DB)
# ---------------------------------------------------------------------------


@app.get("/admin/{path:path}", response_class=HTMLResponse, include_in_schema=False)
async def admin_spa(path: str = ""):
    """Serve React admin SPA for all /admin/* routes (client-side routing)."""
    import os as _os
    index = _os.path.join(_os.path.dirname(__file__), "static", "admin", "index.html")
    if _os.path.isfile(index):
        with open(index) as f:
            return HTMLResponse(f.read())
    return HTMLResponse("<h1>Admin UI not built yet. Run: cd admin-ui && npm run build</h1>", status_code=503)


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/api/items")
async def api_get_items(skip: int = 0, limit: int = 20, device_id: str | None = None, source: str | None = None):
    """Get collections and prints with pagination. Pass device_id for personalized ordering."""
    try:
        async with get_db() as db:
            if device_id:
                return await get_personalized_items(db, device_id, skip, limit)
            return await get_items(db, skip, limit, source)
    except (aiosqlite.Error, OSError):
        raise HTTPException(status_code=503, detail="Database unavailable")


@app.get("/api/search")
async def api_search_items(q: str = "", skip: int = 0, limit: int = 20, source: str | None = None):
    """Search items by tag/text with pagination"""
    try:
        async with get_db() as db:
            if not q:
                return await get_items(db, skip, limit, source)
            return await search_by_tag(db, q, skip, limit, source)
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
async def api_get_tags(limit: int = 10, q: str | None = None, order_by: str = "name"):
    """Get non-blocked tags. Supports prefix filter (q=) and popularity ordering (order_by=popularity)."""
    if order_by not in ("name", "popularity"):
        raise HTTPException(status_code=400, detail="order_by must be 'name' or 'popularity'")
    try:
        async with get_db() as db:
            return await get_tags(db, limit, q=q, order_by=order_by)
    except (aiosqlite.Error, OSError):
        raise HTTPException(status_code=503, detail="Database unavailable")


# ---------------------------------------------------------------------------
# Tag CRUD endpoints
# ---------------------------------------------------------------------------


@app.get("/api/tags/all")
async def api_get_all_tags(skip: int = 0, limit: int = 50, blocked_only: bool = False, q: str | None = None):
    """List all tags with Indonesian translations, paginated. Use blocked_only=true to see blocked tags."""
    try:
        async with get_db() as db:
            return await get_all_tags(db, skip, limit, blocked_only=blocked_only, q=q)
    except (aiosqlite.Error, OSError):
        raise HTTPException(status_code=503, detail="Database unavailable")


@app.get("/api/sources")
async def api_get_sources():
    """Return a sorted list of distinct source strings."""
    try:
        async with get_db() as db:
            return await get_distinct_sources(db)
    except (aiosqlite.Error, OSError):
        raise HTTPException(status_code=503, detail="Database unavailable")


@app.post("/api/tags", status_code=201)
async def api_create_tag(body: TagCreate):
    """Create a new tag."""
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Tag name must not be empty")
    try:
        async with get_db() as db:
            try:
                return await create_tag(db, body.model_dump())
            except aiosqlite.IntegrityError:
                raise HTTPException(status_code=409, detail="Tag name already exists")
    except HTTPException:
        raise
    except (aiosqlite.Error, OSError):
        raise HTTPException(status_code=503, detail="Database unavailable")


@app.put("/api/tags/{tag_id}")
async def api_update_tag(tag_id: int, body: TagUpdate):
    """Update an existing tag."""
    try:
        async with get_db() as db:
            data = {k: v for k, v in body.model_dump().items() if v is not None}
            if not data:
                raise HTTPException(status_code=400, detail="No fields to update")
            try:
                result = await update_tag(db, tag_id, data)
            except aiosqlite.IntegrityError:
                raise HTTPException(status_code=409, detail="Tag name already exists")
            if result is None:
                raise HTTPException(status_code=404, detail="Tag not found")
            return result
    except HTTPException:
        raise
    except (aiosqlite.Error, OSError):
        raise HTTPException(status_code=503, detail="Database unavailable")


@app.delete("/api/tags/{tag_id}", status_code=204)
async def api_delete_tag(tag_id: int):
    """Delete a tag and its page associations."""
    try:
        async with get_db() as db:
            deleted = await delete_tag(db, tag_id)
            if not deleted:
                raise HTTPException(status_code=404, detail="Tag not found")
    except HTTPException:
        raise
    except (aiosqlite.Error, OSError):
        raise HTTPException(status_code=503, detail="Database unavailable")


@app.post("/api/tags/translate")
async def api_translate_tags():
    """Bulk translate all tags missing Indonesian translations."""
    try:
        async with get_db() as db:
            return await bulk_translate_tags(db)
    except (aiosqlite.Error, OSError):
        raise HTTPException(status_code=503, detail="Database unavailable")


# ---------------------------------------------------------------------------
# Page CRUD endpoints (US2)
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
# Analytics endpoints (007-usage-insights)
# ---------------------------------------------------------------------------


@app.get("/insights", response_class=HTMLResponse)
async def insights_page(request: Request):
    """Admin insights dashboard page."""
    async with get_db() as db:
        summary = await get_usage_summary(db)
        top_tags = await get_top_tags_per_device(db, limit=5)
        top_images = await get_top_images(db, limit=10)
        interests = await get_shared_unique_interests(db)
    return templates.TemplateResponse("insights.html", {
        "request": request,
        "summary": summary,
        "top_tags": top_tags,
        "top_images": top_images,
        "interests": interests,
    })


@app.get("/insights/{device_id}", response_class=HTMLResponse)
async def insights_detail_page(request: Request, device_id: str):
    """Per-kid activity timeline page."""
    async with get_db() as db:
        timeline = await get_device_timeline(db, device_id, limit=100)
    return templates.TemplateResponse("insights_detail.html", {
        "request": request,
        "timeline": timeline,
    })


@app.get("/api/admin/insights/summary")
async def api_insights_summary():
    """Per-device usage statistics, excluding admin devices."""
    async with get_db() as db:
        return await get_usage_summary(db)


@app.get("/api/admin/insights/top-tags")
async def api_insights_top_tags(limit: int = 5):
    """Top printed tags per non-admin device."""
    async with get_db() as db:
        return await get_top_tags_per_device(db, limit=min(limit, 20))


@app.get("/api/admin/insights/top-images")
async def api_insights_top_images(limit: int = 10):
    """Most printed images overall and per non-admin device."""
    async with get_db() as db:
        return await get_top_images(db, limit=limit)


@app.get("/api/admin/devices/{device_id}/timeline")
async def api_device_timeline(device_id: str, limit: int = 50, offset: int = 0):
    """Activity timeline for a specific device, grouped by date."""
    async with get_db() as db:
        return await get_device_timeline(db, device_id, limit=limit, offset=offset)


@app.get("/api/admin/insights/interests")
async def api_insights_interests():
    """Shared and unique tag preferences across non-admin devices."""
    async with get_db() as db:
        return await get_shared_unique_interests(db)


# ---------------------------------------------------------------------------
# Image proxy & printing (unchanged)
# ---------------------------------------------------------------------------


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
    """Fetch printable PNG from any supported source and send to printer."""
    try:
        handler = get_print_handler(url)
        png_bytes = await handler.get_printable_png(url)
        result = await printer_service.print_image(png_bytes)
        return {"status": result.status, "message": result.message}
    except Exception as e:
        log.error(f"Error printing {url}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Device management endpoints
# ---------------------------------------------------------------------------


async def _get_authenticated_device(request: Request) -> dict:
    """FastAPI dependency: validates Bearer token and returns device dict."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth[len("Bearer "):]
    async with get_db() as db:
        device = await get_device_by_token(db, token)
    if device is None:
        raise HTTPException(status_code=401, detail="Invalid or inactive device token")
    return device


@app.post("/api/devices/register", status_code=201)
async def api_register_device(body: DeviceRegister):
    """Register a new device and return its token.

    If android_id is provided and matches an existing device, returns that device
    instead of creating a new one (stable identity across reinstalls).
    """
    name = body.initial_name.strip()
    if not name or len(name) > 50:
        raise HTTPException(status_code=422, detail="initial_name must be 1-50 characters")
    async with get_db() as db:
        return await register_device(db, name, android_id=body.android_id)


@app.patch("/api/devices/{device_id}/android-id")
async def api_link_android_id(
    device_id: str,
    body: DeviceAndroidIdLink,
    device: dict = Depends(_get_authenticated_device),
):
    """Link an android_id to an existing device (migration for existing installs)."""
    if device["device_id"] != device_id:
        raise HTTPException(status_code=403, detail="Token does not match device")
    async with get_db() as db:
        ok = await link_android_id(db, device_id, body.android_id)
    if not ok:
        raise HTTPException(status_code=409, detail="android_id already linked to another device")
    return {"status": "linked"}


@app.post("/api/admin/devices/merge")
async def api_merge_devices(body: DeviceMerge):
    """Merge two device records. Moves all activity_events from source to target."""
    async with get_db() as db:
        try:
            moved = await merge_devices(db, body.source_id, body.target_id)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        except LookupError as e:
            raise HTTPException(status_code=404, detail=str(e))
    return {"merged_events": moved, "source_id": body.source_id, "target_id": body.target_id}


@app.patch("/api/devices/{device_id}/name")
async def api_update_device_name(
    device_id: str,
    body: DeviceNameUpdate,
    device: dict = Depends(_get_authenticated_device),
):
    """Update device name (device must authenticate with its own token)."""
    if device["device_id"] != device_id:
        raise HTTPException(status_code=403, detail="Token does not match device")
    name = body.name.strip()
    if not name or len(name) > 50:
        raise HTTPException(status_code=422, detail="name must be 1-50 characters")
    async with get_db() as db:
        result = await update_device_name(db, device_id, name)
    if result is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return result


@app.post("/api/devices/{device_id}/events", status_code=201)
async def api_record_activity_event(
    device_id: str,
    body: ActivityEventCreate,
    device: dict = Depends(_get_authenticated_device),
):
    """Record an activity event for the authenticated device."""
    if device["device_id"] != device_id:
        raise HTTPException(status_code=403, detail="Token does not match device")
    async with get_db() as db:
        return await record_activity_event(db, device_id, body.model_dump())


@app.get("/api/admin/devices")
async def api_get_all_devices(include_inactive: bool = False):
    """Admin endpoint: list all registered devices."""
    async with get_db() as db:
        return await get_all_devices(db, include_inactive=include_inactive)


@app.patch("/api/admin/devices/{device_id}/name")
async def api_admin_update_device_name(device_id: str, body: DeviceNameUpdate):
    """Admin endpoint: rename a device without requiring its auth token."""
    name = body.name.strip()
    if not name or len(name) > 50:
        raise HTTPException(status_code=422, detail="name must be 1-50 characters")
    async with get_db() as db:
        result = await update_device_name(db, device_id, name)
    if result is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return result


@app.get("/api/devices/{device_id}/recommendations")
async def api_device_recommendations(
    device_id: str,
    limit: int = 20,
    device: dict = Depends(_get_authenticated_device),
):
    """Personalized image recommendations based on device's print history."""
    if device["device_id"] != device_id:
        raise HTTPException(status_code=403, detail="Token does not match device")
    async with get_db() as db:
        return await get_recommendations(db, device_id, limit=limit)


@app.patch("/api/admin/devices/{device_id}/admin")
async def api_set_device_admin(device_id: str, body: DeviceAdminUpdate):
    """Admin endpoint: toggle is_admin flag on a device."""
    async with get_db() as db:
        result = await set_device_admin(db, device_id, body.is_admin)
    if result is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return result


@app.delete("/api/admin/devices/{device_id}", status_code=204)
async def api_deactivate_device(device_id: str):
    """Admin endpoint: deactivate (soft-delete) a device."""
    async with get_db() as db:
        deleted = await deactivate_device(db, device_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Device not found or already inactive")


# ---------------------------------------------------------------------------
# Admin: Tag Blocking
# ---------------------------------------------------------------------------


@app.get("/api/admin/tags/blocked")
async def api_get_blocked_tags(skip: int = 0, limit: int = 100):
    """List all blocked tags."""
    async with get_db() as db:
        return await get_all_tags(db, skip, limit, blocked_only=True)


@app.patch("/api/admin/tags/{tag_id}/block")
async def api_toggle_tag_blocked(tag_id: int, blocked: bool = True):
    """Block or unblock a single tag."""
    async with get_db() as db:
        result = await set_tag_blocked(db, tag_id, blocked)
    if result is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    return result


@app.post("/api/admin/tags/block")
async def api_bulk_block_tags(tag_ids: list[int], blocked: bool = True):
    """Block or unblock multiple tags at once."""
    async with get_db() as db:
        count = await bulk_block_tags(db, tag_ids, blocked)
    return {"updated": count, "blocked": blocked}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8080)
