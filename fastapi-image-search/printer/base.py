from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class PrintResult:
    status: str
    message: str


class PrinterError(Exception):
    """Raised when a print operation fails."""

    def __init__(self, message: str, cause: Exception | None = None):
        super().__init__(message)
        self.cause = cause


class PrinterService(ABC):
    """Abstract base class for printer implementations."""

    @abstractmethod
    async def print_image(self, image_bytes: bytes) -> PrintResult:
        """Submit image bytes for printing.

        Args:
            image_bytes: PNG image data to print.

        Returns:
            PrintResult with status and message.

        Raises:
            PrinterError: If the print operation fails.
        """
        ...
