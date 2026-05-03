# Desktop Updates (Stable)

This repo publishes desktop updates through GitHub Releases.
The app checks for updates using `update-electron-app` and `update.electronjs.org`.

Important constraints:
- Updates are only supported on `win32` and `darwin` (Windows/macOS). Linux builds can be published, but Electron’s built-in `autoUpdater` does not update on Linux.
- The in-app updater reads releases from the GitHub repo `gangio/for-desktop`.

## How updates are built and published (recommended)

This repo is already wired for automated stable releases using **Release Please**.

- Workflow: `.github/workflows/release-please.yml`
- Config: `release-please-config.json`, `.release-please-manifest.json`

### Step 1: Land changes on `main`

Merge your feature/fix PRs into `main`.

Release Please will open (or update) a **Release PR** automatically.

### Step 2: Merge the Release PR

When you are ready to ship a stable version:

- Merge the Release Please PR.

That merge causes Release Please to:
- Create a GitHub Release + git tag (for example `v1.0.3`)
- Trigger the `publish-release` job to build and upload installers/artifacts

### Step 3: Wait for artifacts to finish building

The `publish-release` job runs on:
- `ubuntu-latest`
- `windows-latest`
- `macos-latest` (also builds a second `x64` variant)

It runs:

- `pnpm install`
- `pnpm run publish`

and uploads the resulting artifacts to the GitHub Release.

### Step 4: Verify the update is available

On a packaged app build (Windows/macOS):

- Launch the existing installed version.
- The app should detect an update and download it.

## Required GitHub secrets

No extra secrets are required for releasing.

- `GITHUB_TOKEN` is provided automatically by GitHub Actions and is used for:
  - opening/updating the Release Please PR
  - creating the GitHub Release + tag
  - uploading release artifacts

Optional:

- `GANGIO_WEBHOOK_UPDATES_URL` (if you want the `release-webhook` workflow to post release URLs somewhere)

## Manual release (not recommended; use only if automation is unavailable)

This repo includes a helper script:

- `node scripts/release.js <version>`

Example:

- `node scripts/release.js 1.0.3`

This will:
- Update `package.json` version
- Commit
- Tag `v<version>`

You must then push commits and tags:

- `git push`
- `git push --tags`

After that, you still need to create a GitHub Release and run publishing to upload artifacts (either via CI or manually).

## Local build sanity-check (optional)

To ensure packaging works locally:

- `pnpm install`
- `pnpm make`

To run a local dev build:

- `pnpm start`

Note: `update-electron-app` intentionally does not run while `app.isPackaged === false`, so you will not see updater behavior in dev mode.
