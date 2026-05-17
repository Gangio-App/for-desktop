<div align="center">
<h1>
  Gangio for Desktop
  
  [![Stars](https://img.shields.io/github/stars/Gangio-App/for-desktop?style=flat-square&logoColor=white)](https://github.com/Gangio-App/for-desktop/stargazers)
  [![Forks](https://img.shields.io/github/forks/Gangio-App/for-desktop?style=flat-square&logoColor=white)](https://github.com/Gangio-App/for-desktop/network/members)
  [![Pull Requests](https://img.shields.io/github/issues-pr/Gangio-App/for-desktop?style=flat-square&logoColor=white)](https://github.com/Gangio-App/for-desktop/pulls)
  [![Issues](https://img.shields.io/github/issues/Gangio-App/for-desktop?style=flat-square&logoColor=white)](https://github.com/Gangio-App/for-desktop/issues)
  [![Contributors](https://img.shields.io/github/contributors/Gangio-App/for-desktop?style=flat-square&logoColor=white)](https://github.com/Gangio-App/for-desktop/graphs/contributors)
  [![License](https://img.shields.io/github/license/Gangio-App/for-desktop?style=flat-square&logoColor=white)](https://github.com/Gangio-App/for-desktop/blob/main/LICENSE)
</h1>

The official desktop client for **Gangio** — chat, voice, and communities for Windows, macOS, and Linux.

<img src="https://gangio.pro/assets/desktop-screenshot-Cz38KOLx.png" alt="Gangio Desktop screenshot" width="820" />

</div>
<br/>

## Installation

- All downloads and instructions for Gangio can be found on our [Website](https://gangio.pro/download).
- Or grab the latest installer directly from [GitHub Releases](https://github.com/Gangio-App/for-desktop/releases/latest).

Supported platforms:

- **Windows** — `.exe` (Squirrel) installer
- **macOS** — `.zip` / `.dmg`
- **Linux** — `.deb` and Flatpak

## Development Guide

_Contribution guidelines for Desktop app TBA!_

<!-- Before contributing, make yourself familiar with [our contribution guidelines](https://developers.revolt.chat/contrib.html), the [code style guidelines](./GUIDELINES.md), and the [technical documentation for this project](https://revoltchat.github.io/frontend/). -->

Before getting started, you'll want to install:

- Git
- Node.js
- pnpm (run `corepack enable`)

Then proceed to setup:

```bash
# clone the repository
git clone --recursive https://github.com/Gangio-App/for-desktop gangio-for-desktop
cd gangio-for-desktop

# install all packages
pnpm i --frozen-lockfile

# start the application
pnpm start
# ... or build the bundle
pnpm package
# ... or build all distributables
pnpm make
```

Various useful commands for development testing:

```bash
# connect to the development server
pnpm start -- --force-server http://localhost:5173

# test the flatpak (after `make`)
pnpm install:flatpak
pnpm run:flatpak
# ... also connect to dev server like so:
pnpm run:flatpak --force-server http://localhost:5173

# Nix-specific instructions for testing
pnpm package
pnpm run:nix
# ... as before:
pnpm run:nix --force-server=http://localhost:5173
# a better solution would be telling
# Electron Forge where system Electron is
```

### Pulling in Gangio's assets

If you want to pull in Gangio brand assets after pulling, run the following:

```bash
# update the assets
git -c submodule."assets".update=checkout submodule update --init assets
```

Currently, this is required to build; any forks are expected to provide their own assets.

## Links

- Website: <https://gangio.pro>
- Web client: <https://github.com/Gangio-App/for-web>
- Desktop client: <https://github.com/Gangio-App/for-desktop>

## License

Licensed under the project's [LICENSE](./LICENSE).
