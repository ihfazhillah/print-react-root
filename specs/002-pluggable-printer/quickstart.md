# Quickstart: Pluggable Printer Service

**Feature**: 002-pluggable-printer
**Date**: 2026-02-28

## Prerequisites

- Python 3.10+
- CUPS installed (for local printing): `sudo apt install cups` (Debian/Ubuntu) or `sudo dnf install cups` (Fedora)
- Existing `fastapi-image-search` dependencies installed

## Development Setup

```bash
cd fastapi-image-search

# Install dependencies (no new packages needed)
uv sync

# Run tests
python -m pytest tests/ test_main.py -v
```

## Environment Variables

### Remote HTTP Printer (default)

```bash
export PRINTER_SERVICE=http                              # or omit (default)
export PRINT_SERVER_URL=http://192.168.68.254:1234/print # or omit (default)
export PRINT_PASSWORD=your_password
```

### Local CUPS Printer

```bash
export PRINTER_SERVICE=cups
export CUPS_PRINTER_NAME=My_Printer  # optional, uses system default if omitted
```

## Running the Server

```bash
cd fastapi-image-search
python main.py
# Server starts on http://0.0.0.0:8080
```

## Verifying CUPS Setup

```bash
# Check CUPS is running
lpstat -r

# List available printers
lpstat -p -d

# Test print (from command line)
echo "test" | lp -d My_Printer -
```

## Testing

```bash
cd fastapi-image-search

# Run all tests
python -m unittest discover -s . -p "test_*.py" -v

# Run printer-specific tests only
python -m unittest discover -s tests/ -p "test_*.py" -v

# Run endpoint integration tests only
python -m unittest test_main -v
```
