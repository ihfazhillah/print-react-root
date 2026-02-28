import httpx

from printer.base import PrinterError, PrinterService, PrintResult


class RemoteHttpPrinter(PrinterService):
    """Sends image bytes to a remote HTTP print server."""

    def __init__(self, server_url: str, password: str | None = None) -> None:
        self.server_url = server_url
        self.password = password

    async def print_image(self, image_bytes: bytes) -> PrintResult:
        if not self.password:
            raise PrinterError("PRINT_PASSWORD environment variable not set")

        try:
            files = {"file": ("print.png", image_bytes, "image/png")}
            headers = {"x-pass": self.password}
            async with httpx.AsyncClient(verify=False) as client:
                response = await client.post(
                    self.server_url, files=files, headers=headers
                )
                response.raise_for_status()
        except PrinterError:
            raise
        except Exception as e:
            raise PrinterError(str(e), cause=e) from e

        return PrintResult(
            status="sent_to_printer", message="Image sent to printer"
        )
