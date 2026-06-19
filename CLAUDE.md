# CLAUDE.md

Guidance for working in this repo. Read this first.

## What Notscape is

An Electron browser that loads **real, modern websites** and re-skins them into
the web of ~1996 — gray backgrounds, Times New Roman, blue underlined links,
beveled buttons, marquees, hit counters, tiled wallpapers, random "flourishes."
The browser *itself* looks old too: frameless Windows 95 / Netscape chrome, a
meteor-shower throbber, and an AOL-style dial-up sign-on (with a synthesized
modem screech) on every launch.

## Vibe & aims — read this before adding features

Notscape started as a nostalgia toy and has grown a **mission: a healthier web.**
The 90s skin is the hook; the real goal is a browsing experience that is calmer,
less addictive, less surveilled, and that celebrates the human/indie web over
algorithmic slop. When a feature decision is ambiguous, these are the tie-breakers:

- **Calm over engagement.** No infinite scroll juice, no notification bait, no
  attention traps. The "Calmer Web" features (calm headlines, grayscale,
  brightness/contrast dialing, reader mode, scroll breather) exist to *lower*
  arousal, not raise it.
- **Privacy by doing, not by lecturing.** We block ads/trackers/social and clear
  storage every session — **silently.** Deliberately *no* "N trackers blocked!"
  counter: seeing how badly sites want to track you is itself discomfiting. Just
  do it.
- **Anti-slop, pro-human.** Default search engines are small-web/text-first
  (Marginalia). The webring and directory favor *normal people's* sites over
  billionaires and brands. Less Paul Graham, more Julia Evans.
- **Period-accurate framing as UX.** We reframe modern annoyances through a 1996
  lens. Social media isn't "blocked" — it's a **404, because it didn't exist
  yet.** This is funnier and gentler than a scold screen.
- **Playful, not preachy.** It should feel like a toy you *want* to use. Joy and
  whimsy (modem screech, flying toasters, Comic Sans) carry the wellness message
  so it never feels like eating vegetables.
- **Aesthetics shouldn't hurt.** Readability is enforced (WCAG contrast pass);
  brightness/contrast are user-dialable; dark mode is "moderate dark," not a
  black hole. Retro must stay *usable*.

The user (saxman103 / stohrermusic) ideates, then hands off with autonomy and
trusts judgment on implementation. Default to shipping a complete, opinionated
thing over asking lots of questions.

## Run / check / build

```sh
npm start          # launch (electron .)
npm run check      # node --check on every source file — run before committing
npm run installer  # icon + electron-builder --dir + Inno Setup  (see gotcha below)
```

There are **no runtime dependencies** — only `electron` + `electron-builder`
(dev). RSS and any network fetching in main use Node's built-in `https`.

### Building the Windows installer (important gotcha)

`npm run installer` chains `electron-builder --dir && iscc ...`. On this Windows
machine electron-builder **fails extracting the `winCodeSign` cache** ("Cannot
create symbolic link: A required privilege is not held") because the archive
contains macOS dylib *symlinks* that need elevation/Developer Mode. This aborts
the npm chain before Inno Setup runs.

It is **non-fatal for our unsigned `--dir` build**: electron-builder still packs
`dist/win-unpacked/` *before* the signing step that fails. So the working flow is:

1. `npm run installer` (let electron-builder fail) — or run `electron-builder --dir` directly.
2. Verify `dist/win-unpacked/resources/app.asar` is fresh and contains the new code
   (`Select-String` the asar for a string you just added).
3. Run Inno Setup yourself — it is **not on PATH**; the binary lives at
   `%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe`:
   ```powershell
   & "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe" installer\notscape.iss
   ```
   → produces `dist/Notscape-Setup-<version>.exe`.

### Release flow (how 0.5 → 0.7 were cut)

1. Feature work is committed on **`beta`** (commit subject prefixed `beta:`).
2. Bump the version in **both** `package.json` and `installer/notscape.iss`
   (`#define MyAppVersion`); commit as `Notscape X.Y.0`.
3. `git checkout main && git merge --ff-only beta` (history stays linear).
4. `git tag vX.Y.0`; push `main`, `beta`, and the tag.
5. Build the installer (above); `gh release create vX.Y.0 dist\Notscape-Setup-X.Y.0.exe
   --title "Notscape X.Y.0" --notes-file <file>`.
   - Use `--notes-file`, **not** `--notes @'...'@` — embedded quotes in a
     here-string get mangled by Windows PowerShell when passed to `gh`.

## Architecture

```
main.js        Electron MAIN: frameless windows, header stripping, ad/social
               blocking, param stripping, JSON persistence, storage clearing
preload.js     contextBridge -> window.notscape (the ONLY renderer<->main bridge)
src/
  splash.html/.js   AOL dial-up sign-on + synthesized modem (Web Audio)
  index.html        browser chrome: toolbar, Mods panel, Preferences, overlays
  renderer.js       all browser logic (nav, mods, cosmetics, flourishes, sounds)
  home.html/.js     retro start page ("Notscape NetCenter") + RSS
  styles/           chrome.css, home.css, splash.css
  inject/           code injected INTO the viewed page (see below)
installer/notscape.iss   Inno Setup script
scripts/make-icon.js     generates build/icon.ico
```

### The page-transform pipeline (the heart of it)

The viewed site lives in a single `<webview>`. The site never has to cooperate:

- **main.js** strips `Content-Security-Policy` + `X-Frame-Options`
  (`onHeadersReceived`) so anything loads and can be restyled, and drops
  ad/social requests + tracking params (`onBeforeRequest`).
- **`webview.insertCSS()`** is how we style — it **bypasses page CSP**. Inserted
  keys are tracked (`cssKey`, `adCssKey`) so they can be removed on reset/reload.
  - `applyTransform()` builds the "make it 1996" stylesheet from `config` via
    `window.NotscapeStyles` (+ any matching per-site skin) and inserts it.
  - `applyPageCosmetics()` inserts the privacy/calm layer: ad/comment/cookie
    hiding, calm headlines, grayscale, **dark-mode invert, and the brightness/
    contrast filter chain** on `html`.
- **The DOM-effects engine** (`src/inject/engine.js`) runs *inside* the page. It
  is injected by stringifying the `notscapeEngine` function
  (`Function.prototype.toString()`) and `executeJavaScript`-ing it; it installs
  `window.__NOTSCAPE__ = { apply, reset }` and re-applies on DOM changes via a
  `MutationObserver`. It handles marquees, hit counters, image dithering,
  un-sticking headers, lazy/click-to-load images, cookie-banner dismissal,
  WCAG readability enforcement, calm headlines, scroll breather, and all the
  flourish overlays/cursors/decorations.

  **CRITICAL: the engine must be fully self-contained** — no closures, no
  references to anything outside its own body — because it is serialized and
  re-parsed inside the page. Same for anything injected by stringification.

### Inject modules (loaded as `<script>` in index.html; expose globals)

- `inject/styles.js` → `window.NotscapeStyles` — transform CSS builder,
  `TILE_LIGHT` wallpaper, `COLOR_DEPTHS`, and all per-site skins (Reddit→BBS,
  NYT→1995 broadsheet, Gmail→PINE terminal, YouTube→2006, Facebook→MySpace,
  Spotify/YT-Music→Winamp, Google→1998, Wikipedia→Encarta, X→guestbook).
- `inject/flourishes.js` → `window.NotscapeFlourishes` = `{ list, css, cats,
  themes }`. ~44 flourishes in categories (overlay/cursor/title/page/decoration).
  `themes` = `all | subdued | dark` include-lists that filter which flourishes a
  site can roll.
- `inject/webring.js` → `window.NotscapeRing` (curated indie sites) +
  `window.NotscapeDirectory`.
- `inject/engine.js` → the `notscapeEngine` source (injected, not run directly).

### Config & persistence

`DEFAULT_CONFIG` lives in `renderer.js`; merged with the user's `config.json`.
Sections: **appearance** (darkMode, brightness, contrast, screensaver),
**calmer web** (calmMode, forceReadable, grayscale, scrollBreather),
**network/privacy** (blockAds, blockSocial, hideComments, killCookieBanners,
lazyImages, allowAutoplay, stripParams, clearOnExit, searchEngine, safeMode,
spoofUA), **flourishes** (randomFlourishes, flourishLevel, flourishTheme), plus
the Mods sliders/toggles.

main.js persists JSON to `app.getPath('userData')`: `config.json`,
`bookmarks.json`, `history.json`, `account.json`, `feeds.json`,
`flourishes.json`. Storage is cleared on launch and (if `clearOnExit`) on quit.

Per-site flourishes/fonts are rolled by `randomFlourishesFor()` (theme- and
level-aware) and kept in a session `siteFlourishes` map.

## Conventions & gotchas

- **Run `npm run check`** (node --check on all files) before every commit.
- **Edit tool + special chars:** the Edit tool repeatedly fails to match lines
  containing `✓`, `…`, em-dashes, or other non-ASCII glyphs (menu labels, etc.).
  When that happens, anchor on a nearby ASCII-only line, or write a tiny Node
  patch script using a `[^\n]*`-style regex, run it, and delete it.
- **Block silently** — never surface tracker/ad counts (see vibe above).
- **New navigations:** `will-navigate` does NOT fire for `loadURL`; intercept in
  `did-start-navigation` (fires for all nav) when you need to catch typed URLs
  (that's how social→404 works).
- **Scroll-lock leftovers** from hidden modals break scrolling on some sites; the
  engine's `unlockScroll()` pass clears them.
- Auth/secure hosts are exempted from transforms (`isAuthHost` / `isSecureAuthHost`)
  so logins aren't broken.

## What's been built (changelog-ish, newest first)

- **0.7.0** — Flourish **themes** (All / Subdued[default] / Dark); live
  **Brightness & Contrast** sliders that tint pages and dim flourishes with them;
  **softer Dark Mode** (lifts black to dark-gray); more saturated dotted wallpaper.
- **0.6.0** — Dark mode (dark chrome + smart-invert pages); Wayback time-travel;
  After-Dark "flying toasters" screensaver; readability enforcement (WCAG);
  cookie-banner dismissal; click-to-load large images; 90s font flourishes;
  flourish intensity (light/moderate/heavy); privacy hardening (no autocomplete,
  no password saving, clear-on-exit); social→period-404; hide comments; sound
  extras gated by Mods toggles; working webring & directory.
- **0.5.0** — First public release: dial-up splash, the Mods panel + presets +
  sliders, per-site skins, AOL sounds, normal browser chrome.

When you ship something notable, add a line here and refresh the README version.
</content>
