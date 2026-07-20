---
name: universal-build-tool
triggers:
  - universal build tool
tier: optional
pack: general
domain: general
---
# Universal Build Tool Skill

## Overview
Use the `build_tool.py` universal build engine to prepare cross-platform distributions for Python and Go projects. This tool supports building for Windows, Linux, and macOS with automatic project detection.

## Tool Location
```bash
$HOME/bin/build_tool.py
```

## Workflow

When asked to prepare distributions (e.g., "подготовь сборку под windows, linux, mac"), follow these steps:

### Step 1: Analyze the Project
Determine project type and entry point:
```bash
python3 $HOME/bin/build_tool.py \
  --action analyze \
  --path <PROJECT_PATH>
```

Expected output:
```json
{
  "type": "python",
  "entry_point": "main.py",
  "root": "/path/to/project",
  "platform": "linux"
}
```

### Step 2: Build for Each Target OS
Execute builds for requested platforms (windows, linux, darwin):

```bash
python3 $HOME/bin/build_tool.py \
  --action build \
  --path <PROJECT_PATH> \
  --os <windows|linux|darwin> \
  --output <OUTPUT_DIR>
```

**Example: Build for all three platforms:**
```bash
mkdir -p /tmp/dist

for TARGET_OS in windows linux darwin; do
  python3 $HOME/bin/build_tool.py \
    --action build \
    --path /path/to/project \
    --os $TARGET_OS \
    --output /tmp/dist
done
```

### Step 3: Create Archives (Optional)
Package the distributions:

```bash
python3 $HOME/bin/build_tool.py \
  --action archive \
  --path <SOURCE_DIR> \
  --output <ARCHIVE_NAME> \
  --format <zip|gztar>
```

## Supported Project Types

### Python Projects
- **Detection files:** `pyproject.toml`, `setup.py`, `requirements.txt`, `Pipfile`
- **Packager:** PyInstaller (creates single-file executables)
- **Output naming:** `app_<os>` or `app_<os>.exe`
- **Cross-compilation note:** PyInstaller builds are primarily native. Cross-compilation from Linux to Windows requires Wine or Docker.

### Go Projects
- **Detection file:** `go.mod`
- **Packager:** Native `go build`
- **Cross-compilation:** Fully supported via `GOOS`/`GOARCH` environment variables
- **Output naming:** `app_<os>` or `app_<os>.exe`

## Common Commands

### Analyze current project
```bash
python3 $HOME/bin/build_tool.py --action analyze --path .
```

### Build Windows executable
```bash
python3 $HOME/bin/build_tool.py \
  --action build --path . --os windows --output ./dist
```

### Build Linux binary
```bash
python3 $HOME/bin/build_tool.py \
  --action build --path . --os linux --output ./dist
```

### Build macOS binary
```bash
python3 $HOME/bin/build_tool.py \
  --action build --path . --os darwin --output ./dist
```

## Error Handling

### PyInstaller not found
```text
❌ ERROR: PyInstaller not found. Install with: pip install pyinstaller
```
**Solution:** Run `pip install pyinstaller` in the project's virtual environment or globally.

### Go not found
```text
❌ ERROR: Go not found. Install Go from https://go.dev/dl/ or via: sudo apt install golang-go
```
**Solution:** Install Go or ensure it's in PATH.

### Project type not detected
```text
❌ ERROR: Unable to determine project type. No known config files found...
```
**Solution:** Verify the project path contains configuration files (pyproject.toml, go.mod, package.json, etc.).

## Usage Examples

### Example 1: Full Multi-Platform Build
User asks: "Собери дистрибутивы под windows, linux и mac для проекта /home/user/myapp"

1. **Analyze:** `--action analyze --path /home/user/myapp` → Detects Python project with `main.py`
2. **Build Windows:** `--os windows` → Creates `dist/app_windows.exe`
3. **Build Linux:** `--os linux` → Creates `dist/app_linux`
4. **Build macOS:** `--os darwin` → Creates `dist/app_darwin`
5. **Report:** List all created files with sizes

### Example 2: Archive Creation
User asks: "Упакуй в архив"

1. **Create ZIP:** `--action archive --path ./dist --output myapp-v1.0 --format zip`
2. **Result:** `myapp-v1.0.zip` containing all binaries

## Dependencies

Ensure these are installed before builds:
- **Python 3.8+**
- **PyInstaller:** `pip install pyinstaller` (for Python projects)
- **Go** (optional): `sudo apt install golang-go` or download from [go.dev](https://go.dev/dl/)

## Anti-Overkill Principle

This tool isolates build logic from agent instructions:
- **Universal:** Works with any Python or Go project
- **CLI-first:** Can be used manually, in CI/CD, or via Kilo Code skill
- **No server overhead:** Just a Python script, no MCP configuration needed
- **Project-agnostic:** No hardcoded paths or project names
