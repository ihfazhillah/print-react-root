"""Source-aware print dispatch for multi-site printable pages."""

import base64
import os
import subprocess
import tempfile

import httpx
from bs4 import BeautifulSoup


class PrintHandler:
    """Base class for print handlers."""

    async def get_printable_png(self, url: str) -> bytes:
        """Fetch and convert the URL content to PNG bytes for printing."""
        raise NotImplementedError


def _convert_to_png(input_bytes: bytes, input_suffix: str) -> bytes:
    """Convert image/PDF bytes to PNG using ImageMagick."""
    with tempfile.NamedTemporaryFile(suffix=input_suffix, delete=False) as tmp:
        tmp.write(input_bytes)
        tmp_path = tmp.name

    png_path = tmp_path.rsplit(".", 1)[0] + ".png"

    try:
        # For PDFs, extract first page only: pdf[0]
        src = f"{tmp_path}[0]" if input_suffix == ".pdf" else tmp_path
        subprocess.run(["convert", src, png_path], check=True)

        with open(png_path, "rb") as f:
            return f.read()
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        if os.path.exists(png_path):
            os.unlink(png_path)


class KrokotakHandler(PrintHandler):
    """Existing krokotak print logic: URL → /_print → base64 → webp → PNG."""

    async def get_printable_png(self, url: str) -> bytes:
        print_url = url.replace("/print?", "/_print?")

        async with httpx.AsyncClient(verify=False) as client:
            response = await client.get(print_url)
            response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        img_tag = soup.find("img")
        if not img_tag or not img_tag.get("src"):
            raise ValueError("No image found in krokotak page")

        img_src = img_tag["src"]
        if not img_src.startswith("data:image"):
            raise ValueError("Invalid image data format")

        _, base64_data = img_src.split(",", 1)
        image_bytes = base64.b64decode(base64_data)
        return _convert_to_png(image_bytes, ".webp")


class DirectImageHandler(PrintHandler):
    """Fetch image URL directly → convert to PNG."""

    async def get_printable_png(self, url: str) -> bytes:
        async with httpx.AsyncClient(verify=False, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()

        content_type = response.headers.get("content-type", "")
        if "png" in content_type:
            return response.content

        # Determine input format from URL or content-type
        if "webp" in content_type or url.lower().endswith(".webp"):
            suffix = ".webp"
        elif "jpeg" in content_type or "jpg" in content_type or url.lower().endswith((".jpg", ".jpeg")):
            suffix = ".jpg"
        else:
            suffix = ".jpg"  # default

        return _convert_to_png(response.content, suffix)


class DirectPdfHandler(PrintHandler):
    """Fetch PDF → convert first page to PNG."""

    async def get_printable_png(self, url: str) -> bytes:
        async with httpx.AsyncClient(verify=False, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()

        return _convert_to_png(response.content, ".pdf")


class DetailPageHandler(PrintHandler):
    """Fetch HTML detail page → extract image/PDF → delegate."""

    async def get_printable_png(self, url: str) -> bytes:
        async with httpx.AsyncClient(verify=False, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")

        # Try to find a PDF link first
        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            if href.lower().endswith(".pdf"):
                return await DirectPdfHandler().get_printable_png(href)

        # Try to find a large image
        for img in soup.find_all("img", src=True):
            src = img["src"]
            # Skip tiny icons, ads, logos
            if any(skip in src.lower() for skip in ["logo", "icon", "avatar", "ad-", "banner"]):
                continue
            if src.startswith("data:"):
                continue
            # Make absolute
            if src.startswith("/"):
                from urllib.parse import urlparse
                parsed = urlparse(url)
                src = f"{parsed.scheme}://{parsed.netloc}{src}"
            return await DirectImageHandler().get_printable_png(src)

        raise ValueError(f"No printable image or PDF found on {url}")


def get_print_handler(url: str) -> PrintHandler:
    """Select the appropriate print handler based on URL pattern."""
    url_lower = url.lower()

    if "krokotak.com" in url_lower:
        return KrokotakHandler()
    elif url_lower.endswith(".pdf"):
        return DirectPdfHandler()
    elif url_lower.endswith((".jpg", ".jpeg", ".png", ".webp")):
        return DirectImageHandler()
    else:
        return DetailPageHandler()
