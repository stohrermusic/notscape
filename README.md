# Notscape 🌐

> A browser that makes every website look like the old internet.

Notscape is an Electron browser that loads real, modern websites and re-skins
them into the web of ~1996 — gray backgrounds, Times New Roman, blue underlined
links, beveled buttons, marquees, hit counters, and tiled starfields. The
browser *itself* looks old too: a frameless Windows 95 / Netscape Navigator
chrome with a meteor-shower throbber, and an AOL-style dial-up sign-on (complete
with a synthesized modem screech) every time you launch.

## Install (Windows)

Grab **`Notscape-Setup-0.5.0.exe`** from the
[latest release](https://github.com/stohrermusic/notscape/releases), run it, and
launch Notscape from the Start menu or desktop shortcut.

## Run from source

```sh
npm install
npm start
```

Then click **Sign On**, wait for the modem to connect, and start surfing.

## Build the installer yourself

```sh
npm install
npm run installer     # generates the icon, packages the app, runs Inno Setup
```

This produces `dist/Notscape-Setup-0.5.0.exe`. Requires
[Inno Setup 6](https://jrsoftware.org/isdl.php) on `PATH` (the `iscc` command).
`npm run dist:linux` / `npm run dist:mac` build an AppImage / dmg, but those must
be run on their native OS.

### A note on the AOL sounds

The genuine AOL "Welcome" / "You've Got Mail" clips are copyrighted and are **not**
bundled. The app speaks the line with text-to-speech instead. To use the real
audio locally, drop `welcome.wav` and `youve-got-mail.wav` into the per-user
folder `%APPDATA%\Notscape\assets\` (or `assets/` when running from source).

## Features

- **Dial-up sign-on splash** — pick your screen name (defaults to `saxman103`,
  remembered between sessions), hear the modem handshake, watch it "connect."
- **Transform is ON by default** — you land in the old web. The toolbar
  **Old Internet: ON/OFF** lamp flips the whole thing off instantly.
- **The Mods panel (★ Mods)** — presets (Modern / Reskin / GeoCities!!! / Mosaic),
  sliders (Vintage aging, Image pixelation, Color depth), and a pile of toggles:
  old fonts, flatten corners, beveled boxes, retro links, gray/starfield
  backgrounds, Comic Sans everything, un-stick headers, marquee headings, blink
  text, "Under Construction", fake hit counters, a webring footer, and retro
  (pixelated/dithered) images.
- **Per-site skins** — recognized sites get a hand-tuned look:
  - **Reddit** → a green-on-black **BBS**
  - **The New York Times** → a **1995 broadsheet**
  - **Gmail** → a **terminal / PINE-style** mail reader
  - **YouTube** → **2005–2006 YouTube** ("Broadcast Yourself™")
- **AOL sounds** — "Welcome!" on connect and "You've got mail!" on Gmail
  (toggleable; drops in real `.wav`s from `assets/`, else uses text-to-speech).
- **Normal browser stuff** — back/forward/reload/stop/home, a Location bar with
  search, a bookmarks bar (➕ to add, right-click to remove), and history.

## How it works

- The site never has to cooperate: `main.js` strips `Content-Security-Policy`
  and `X-Frame-Options` so anything loads and can be restyled.
- `src/inject/styles.js` builds the "make it 1996" stylesheet from your Mods
  config (plus any matching site skin) and injects it via `webview.insertCSS()`
  — which bypasses page CSP.
- `src/inject/engine.js` handles the DOM-level effects (marquees, counters,
  image dithering, un-sticking) and re-applies them as pages change via a
  `MutationObserver`.

## Project layout

```
main.js              Electron main process (windows, header stripping, storage)
preload.js           contextBridge IPC
src/
  splash.html/.js    AOL-style dial-up sign-on + synthesized modem
  index.html         the browser chrome
  renderer.js        browser logic (nav, bookmarks, mods, sounds)
  home.html          retro start page ("Notscape NetCenter")
  styles/            chrome + splash CSS
  inject/
    styles.js        global transform CSS + per-site skins
    engine.js        injected DOM-effects engine
assets/              drop welcome.wav / youve-got-mail.wav here (optional)
```

Notscape © 1996–2026 · Made with `<3` and too many `<table>` tags.
