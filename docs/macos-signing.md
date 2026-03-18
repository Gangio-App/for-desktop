---
description: macOS build, signing, and notarization guide
---

# macOS Build + Signing + Notarization (Gangio Desktop)

This document describes everything required to **build**, **code sign**, and **notarize** the macOS desktop app so users can run it without Gatekeeper warnings.

This repo uses **Electron Forge** (`electron-forge`) with `packagerConfig` in `forge.config.ts`.

## Goals

- Produce a macOS `.app` packaged as a `.zip` (and optionally `.dmg` / `.pkg`).
- Code sign with **Developer ID Application**.
- Notarize with Apple.
- Staple the notarization ticket.
- Verify locally with Apple tools.

## Apple account requirements

You need access to a team enrolled in the **Apple Developer Program**.

### Required permissions

You must be able to do both of the following (or have a teammate do it):

- Create/manage **Certificates** in the Apple Developer portal.
- Create **App Store Connect API keys** (recommended for CI), or create an **app-specific password**.

If you cannot see these areas, you likely need an **Admin** (or Account Holder) role.

## Certificates you need

### Developer ID Application (required)

Used to sign the `.app` distributed outside the Mac App Store.

- Name usually looks like:
  - `Developer ID Application: Company Name (TEAMID)`

### Developer ID Installer (optional)

Only required if you ship a `.pkg` installer.

## Bundle identifier

Pick a stable bundle ID, for example:

- `pro.gangio.GangioDesktop`

Ensure this matches what you ship (Info.plist) and stays consistent between releases.

## Notarization credentials

You can notarize using either:

### Option A: App Store Connect API Key (recommended for CI)

You need:

- `APPLE_API_KEY_ID` (Key ID)
- `APPLE_API_ISSUER_ID` (Issuer ID)
- `APPLE_API_KEY_P8` (the private key contents, `.p8`)
- `APPLE_TEAM_ID` (your team id)

### Option B: Apple ID + app-specific password

You need:

- `APPLE_ID` (email)
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

## Local macOS prerequisites (developer machine)

- macOS build host
- Xcode Command Line Tools:
  - `xcode-select --install`
- Node + pnpm
- Certificate installed in Keychain (Developer ID Application)

## Repo prerequisites

### Assets submodule

This repo expects the `assets` submodule present:

```bash
git -c submodule."assets".update=checkout submodule update --init assets
```

### macOS icon (.icns)

Electron expects an `.icns` for macOS.

This repo stores:

- `assets/desktop/icon.png`
- `assets/desktop/icon@2x.png`
- `assets/desktop/icon@3x.png`

The workflow generates `assets/desktop/icon.icns`.

## Fix for previous CI error: `Gangio.iconset: Failed to generate ICNS`

The old workflow attempted to create an iconset by copying pre-sized PNGs. It did not generate the required `icon_512x512@2x.png` (1024x1024) correctly and could cause `iconutil` to fail.

The workflow now generates the iconset from `assets/desktop/icon@3x.png` using `sips`, including the **1024x1024** size.

If ICNS generation fails again, debug with:

```bash
ls -la assets/desktop/Gangio.iconset
file assets/desktop/Gangio.iconset/*.png
iconutil -c icns assets/desktop/Gangio.iconset -o /tmp/test.icns
```

## Building macOS artifacts (unsigned)

From the repo root:

```bash
pnpm install
pnpm make
```

Artifacts will appear under `out/make/...`.

## Code signing (manual)

> This section describes the standard Apple flow. The exact Forge integration can be done in CI after this is validated.

### 1) Identify signing identity

```bash
security find-identity -v -p codesigning
```

You should see `Developer ID Application: ...`.

### 2) Sign the .app

You must sign all nested frameworks/binaries and the main app.

Typical command (paths vary):

```bash
codesign --deep --force --options runtime --timestamp \
  --sign "Developer ID Application: YOUR TEAM (TEAMID)" \
  "path/to/Gangio.app"
```

### 3) Verify signature

```bash
codesign --verify --deep --strict --verbose=2 "path/to/Gangio.app"
spctl --assess --type execute --verbose=4 "path/to/Gangio.app"
```

## Notarization (manual)

### 1) Create a ZIP for upload

```bash
ditto -c -k --keepParent "path/to/Gangio.app" "Gangio-macos.zip"
```

### 2) Notarize with `notarytool`

#### Option A: API key

Create a temporary key file (example):

```bash
cat > AuthKey.p8 <<'EOF'
<PASTE YOUR .p8 CONTENTS HERE>
EOF

xcrun notarytool submit "Gangio-macos.zip" \
  --key "AuthKey.p8" \
  --key-id "${APPLE_API_KEY_ID}" \
  --issuer "${APPLE_API_ISSUER_ID}" \
  --team-id "${APPLE_TEAM_ID}" \
  --wait
```

#### Option B: Apple ID

```bash
xcrun notarytool submit "Gangio-macos.zip" \
  --apple-id "${APPLE_ID}" \
  --password "${APPLE_APP_SPECIFIC_PASSWORD}" \
  --team-id "${APPLE_TEAM_ID}" \
  --wait
```

### 3) Staple ticket

```bash
xcrun stapler staple "path/to/Gangio.app"
```

### 4) Final verification

```bash
spctl --assess --type execute --verbose=4 "path/to/Gangio.app"
```

## CI approach (recommended)

### Secrets to store

- `MACOS_CERT_P12_BASE64`
- `MACOS_CERT_PASSWORD`
- `MACOS_CODESIGN_IDENTITY`
- Either API-key notarization:
  - `APPLE_API_KEY_ID`
  - `APPLE_API_ISSUER_ID`
  - `APPLE_API_KEY_P8_BASE64`
  - `APPLE_TEAM_ID`
  - OR Apple ID notarization:
    - `APPLE_ID`
    - `APPLE_APP_SPECIFIC_PASSWORD`
    - `APPLE_TEAM_ID`

### High-level CI steps

1. Checkout + assets submodule
2. Install deps
3. Generate `icon.icns`
4. Build (`pnpm make`)
5. Sign `.app`
6. Zip `.app`
7. Notarize
8. Staple
9. Upload artifacts

## Open items in this repo

This repo currently builds macOS artifacts in `.github/workflows/macos-build.yml` but does **not** yet perform code signing + notarization.

Next implementation work:

- Decide final packaging target (ZIP only vs DMG/PKG)
- Add Forge packager signing configuration or sign as a separate CI step
- Add notarization + stapling in CI

