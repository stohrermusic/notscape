# Notscape 🌐

> A browser that re-skins the modern web to look — and *feel* — like 1996.

Notscape is an Electron browser that loads real, modern websites and transforms
them into the web of ~1996: gray backgrounds, Times New Roman, blue underlined
links, marquees, tiled wallpapers, and random "flourishes." The browser itself
looks old too — frameless Netscape chrome and an AOL-style dial-up sign-on (with
a synthesized modem screech) on every launch.

The nostalgia is the hook. The point is a **healthier web**: calmer, less
addictive, less surveilled, tilted back toward the human/indie web instead of
algorithmic slop.

## Install (Windows)

Grab **`Notscape-Setup-0.7.0.exe`** from the
[latest release](https://github.com/stohrermusic/notscape/releases), run it, and
launch from the Start menu.

## Run from source

```sh
npm install
npm start
```

Then click **Sign On**, wait for the modem to connect, and start surfing.

## Features

- **The old web, on by default** — land in 1996; a toolbar lamp flips it off
  instantly. The **★ Mods** panel has presets, sliders (brightness, contrast,
  GeoCities-ify, aging, pixelation), and toggles galore.
- **Random flourishes** — each site gets its own persisted set of 90s touches;
  pick a **theme** (All / Subdued / Dark) and **intensity** (Light / Moderate / Heavy).
- **Per-site skins** — Reddit→BBS, NYT→1995 broadsheet, Gmail→PINE terminal,
  YouTube→2006, Facebook→MySpace, Spotify→Winamp, Google→1998, Wikipedia→Encarta.
- **Calmer web** — sentence-cases screaming headlines, reader mode, grayscale,
  enforced readability (WCAG contrast), moderate dark mode.
- **Privacy, quietly** — blocks ads/trackers/social, strips tracking params,
  dismisses cookie banners, clears storage each session. No "trackers blocked!"
  counter — it just does it.
- **Anti-slop** — small-web search (Marginalia) and a curated webring/directory.
  Social media is a period-accurate **404** (it didn't exist yet).
- **Toys** — Wayback time-travel, an After-Dark screensaver, AOL sounds, plus the
  usual nav / bookmarks / find / history.

## How it works

`main.js` strips `Content-Security-Policy` / `X-Frame-Options` (and blocks
ad/tracker requests) so any site loads and can be restyled. `src/inject/styles.js`
builds the "make it 1996" CSS and injects it via `webview.insertCSS()` (bypasses
CSP); `src/inject/engine.js` runs inside the page for DOM-level effects and
re-applies them on change via a `MutationObserver`.

## Build the installer

```sh
npm run installer     # icon + electron-builder --dir + Inno Setup → dist/Notscape-Setup-0.7.0.exe
```

Requires [Inno Setup 6](https://jrsoftware.org/isdl.php). The genuine AOL sound
clips are copyrighted and **not** bundled (TTS fallback); drop `welcome.wav` /
`youve-got-mail.wav` into `%APPDATA%\Notscape\assets\` to use the real audio.

See [`CLAUDE.md`](CLAUDE.md) for architecture, the project's aims, and the full
release workflow.

Notscape © 1996–2026 · Made with `<3` and too many `<table>` tags.
