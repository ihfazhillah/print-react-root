import asyncio

from printer.base import PrinterError, PrinterService, PrintResult


class CupsPrinter(PrinterService):
    """Submits image bytes to a local CUPS printer via the lp command."""

    def __init__(self, printer_name: str | None = None) -> None:
        self.printer_name = printer_name

    async def print_image(self, image_bytes: bytes) -> PrintResult:
        cmd = ["lp"]
        if self.printer_name:
            cmd += ["-d", self.printer_name]
        cmd.append("-")  # read from stdin

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate(input=image_bytes)
        except FileNotFoundError as e:
            raise PrinterError("lp command not found — is CUPS installed?", cause=e) from e
        except Exception as e:
            raise PrinterError(str(e), cause=e) from e

        if proc.returncode != 0:
            error_msg = stderr.decode().strip() or f"lp exited with code {proc.returncode}"
            raise PrinterError(error_msg)

        return PrintResult(
            status="sent_to_printer", message="Image sent to printer"
        )
