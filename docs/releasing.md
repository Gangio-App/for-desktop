---
description: How to release Gangio Desktop to GitHub (so auto-updates work)
---

# Releasing Gangio Desktop (GitHub Releases + Auto Updates)

Gangio Desktop uses `update-electron-app` with `ElectronPublicUpdateService` pointing to a GitHub repo (`gangio/for-desktop`).

That means **auto-updates only work when GitHub Releases exist** and contain the expected build artifacts.

This repo already contains GitHub Actions workflows that can publish releases:

- `.github/workflows/auto-publish.yml` (runs on `git tag v*`)
- `.github/workflows/release-please.yml` (automated release PR + publish)

## Important: you must have push permission

If you see:

- `remote: Permission ... denied ... 403`

then your GitHub account/token does **not** have write access to that repo.

You have 3 choices:

- **Option A (recommended):** Ask an org admin to grant you **Write** access to the repo.
- **Option B:** Push to a **fork** and open PRs; a maintainer with permission does the final tag/release.
- **Option C:** Use the correct GitHub identity/token (PAT) that has write access.

## Recommended release method (simple): tag -> CI publishes

When you push a tag like `v1.0.4`, `auto-publish.yml` will run and execute `pnpm run publish`, which uses Electron Forge’s GitHub publisher.

### Prerequisites

- You can push to the repo (or a maintainer can).
- GitHub Actions is enabled.
- The workflow has permission to write releases (`permissions: contents: write`) (already present).

## One-time setup: GitHub authentication for git push

### Using GitHub CLI (easy)

```bash
gh auth login
```

Then `git push` will use your authenticated session (depending on your environment).

### Using a Personal Access Token (PAT)

Create a PAT with at least:

- `repo` scope (classic PAT)

Then set your remote to use HTTPS and enter the PAT as the password when prompted.

## Release script (bash)

Create a script locally (example `scripts/release.sh`) and run it when you want to publish.

```bash
#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "Usage: $0 <version>  (example: $0 1.0.4)"
  exit 1
fi

# Ensure clean working tree
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree not clean. Commit or stash first."
  exit 1
fi

# Update package.json version (Node is already required by repo)
node -e "
const fs=require('fs');
const p='package.json';
const j=JSON.parse(fs.readFileSync(p,'utf8'));
j.version='${VERSION}';
fs.writeFileSync(p, JSON.stringify(j,null,2)+'\n');
"

git add package.json

git commit -m "chore: release v${VERSION}"

git tag "v${VERSION}"

echo "Pushing commit + tag…"
# push commit

git push
# push tags

git push --tags

echo "Done. GitHub Actions should now build & publish the release for v${VERSION}."
```

### How it works

- The tag `v${VERSION}` triggers `.github/workflows/auto-publish.yml`
- The workflow builds and runs `pnpm run publish`
- Electron Forge publisher creates/updates a GitHub Release and uploads artifacts
- `update-electron-app` detects the new release and updates clients

## Alternative release method: Release Please (more automated)

If you prefer automated changelogs + versioning:

- Merge changes into `main`
- `release-please.yml` opens/updates a release PR
- When that PR merges, it creates a GitHub Release and triggers the publish job

This method is ideal if you want semantic versioning driven by commit messages.

## Troubleshooting

### 1) Tag pushed but no release was published

- Check GitHub Actions run logs
- Ensure workflow has `contents: write`
- Ensure `pnpm run publish` succeeds

### 2) macOS icon generation failing

There is a known issue if the iconset is incomplete.

- `macos-build.yml` was updated to generate a valid iconset using `sips`.
- If `auto-publish.yml` still uses the old icon copy approach, update it similarly.

### 3) I can’t push (403)

- You do not have permission to that repo.
- Ask an org admin for access, or have a maintainer run the release/tag.

