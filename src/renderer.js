// renderer.js — drives the Notscape browser chrome.

const view = document.getElementById('view');
const urlbar = document.getElementById('urlbar');
const statusText = document.getElementById('status-text');
const throbber = document.getElementById('throbber');
const winTitle = document.getElementById('win-title');
const meterFill = document.getElementById('status-bar-fill');
const bookmarksBar = document.getElementById('bookmarksbar');

const HOME = 'home'; // sentinel — the start page is an overlay, not a loaded URL
const SEARCH = 'https://lite.duckduckgo.com/lite/?q=';
const NETSCAPE_UA = 'Mozilla/4.0 (compatible; MSIE 4.0; Windows 95)';
// Present as plain desktop Chrome (matches our Chromium engine) so logins like
// Gmail don't reject us as an "insecure" embedded browser.
const CLEAN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

// Sign-in hosts where Notscape stays completely hands-off (no styling injected)
function isAuthHost(host) {
  if (!host) return false;
  if (/^(accounts|login|signin|auth|sso|secure|id|myaccount)\./.test(host)) return true;
  return ['accounts.google.com', 'login.microsoftonline.com', 'login.live.com', 'appleid.apple.com']
    .some((d) => host === d || host.endsWith('.' + d));
}

// ---------------------------------------------------------------------------
// Config (the Mods). Transform is ON by default -> you land in the old web.
// ---------------------------------------------------------------------------
const DEFAULT_CONFIG = {
  enabled: true,
  siteSkins: true,
  // sliders
  geoCities: 0,  // macro "how far to GeoCities-ify" dial (0 = clean reskin)
  age: 70,
  pixelation: 0,
  colorDepth: 1, // index into [16,256,4096,16M]
  // style
  oldFonts: true,
  flatten: true,
  beveled: true,
  retroLinks: true,
  grayBg: true,
  tiledBg: false,
  comicSans: false,
  // behavior
  killSticky: true,
  marquee: false,
  blink: false,
  // garnish
  construction: false,
  hitCounter: false,
  webring: false,
  dither: false,
  // sounds
  soundWelcome: true,
  soundMail: true,
  // network / privacy
  blockAds: true,
  safeMode: false,
  spoofUA: false
};

let config = Object.assign({}, DEFAULT_CONFIG);
let bookmarks = [];
let cssKey = null;          // handle for the currently inserted stylesheet
let engineInjected = false; // per-page: has the engine source been installed?
let currentURL = HOME;
let uaApplied = false;      // have we set our clean Chrome UA yet?

const ENGINE_SOURCE = '(' + window.notscapeEngine.toString() + ')()';

// ---------------------------------------------------------------------------
// URL handling
// ---------------------------------------------------------------------------
function isProbablyUrl(s) {
  if (/^[a-z]+:\/\//i.test(s)) return true;
  if (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/|$)/i.test(s)) return true;
  return /^[\w-]+(\.[\w-]+)+(:\d+)?(\/|$|\?|#)/.test(s) && !/\s/.test(s);
}
function toLocation(input) {
  const s = (input || '').trim();
  if (!s) return HOME;
  if (s === 'home' || s === 'notscape:home' || s === 'about:home') return HOME;
  if (isProbablyUrl(s)) return /^[a-z]+:\/\//i.test(s) ? s : 'https://' + s;
  return SEARCH + encodeURIComponent(s);
}
function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch (_) { return ''; }
}
function isHome(url) {
  return !url || url === HOME || url.indexOf('home.html') !== -1;
}
function prettyUrl(url) {
  return isHome(url) ? 'Notscape Home' : url;
}

function showHome() {
  currentURL = HOME;
  hideCover();
  const hs = document.getElementById('home-screen');
  if (hs) hs.hidden = false;
  urlbar.value = '';
  winTitle.textContent = 'Notscape';
  if (window.NotscapeHome) window.NotscapeHome.onShow();
  updateNavButtons();
}
function hideHome() {
  const hs = document.getElementById('home-screen');
  if (hs) hs.hidden = true;
}

function navigate(input) {
  const loc = toLocation(input);
  if (loc === HOME) { showHome(); return; }
  currentURL = loc;
  hideHome();
  view.loadURL(loc);
}
// let the start page open links/searches in the webview
window.notscapeOpen = navigate;

// ---------------------------------------------------------------------------
// Apply the retro transform to the current page
// ---------------------------------------------------------------------------
async function applyTransform() {
  // never re-skin our own home page
  if (isHome(currentURL)) { await clearCSS(); return; }

  // never touch a sign-in page — keep it pristine & as safe as a normal browser
  if (isAuthHost(hostOf(currentURL))) {
    await clearCSS();
    try { await view.executeJavaScript('window.__NOTSCAPE__&&window.__NOTSCAPE__.reset()'); } catch (_) {}
    statusText.textContent = '🔒 Secure sign-in page — Notscape is hands-off here.';
    return;
  }

  // 1) CSS layer (CSP-proof via insertCSS)
  await clearCSS();
  if (config.enabled) {
    const css = window.NotscapeStyles.build(config, hostOf(currentURL));
    if (css) {
      try { cssKey = await view.insertCSS(css); } catch (_) {}
    }
  }

  // 2) DOM-effects engine
  try {
    if (!engineInjected) {
      await view.executeJavaScript(ENGINE_SOURCE);
      engineInjected = true;
    }
    if (config.enabled) {
      await view.executeJavaScript(
        'window.__NOTSCAPE__&&window.__NOTSCAPE__.apply(' + JSON.stringify(config) + ')'
      );
    } else {
      await view.executeJavaScript('window.__NOTSCAPE__&&window.__NOTSCAPE__.reset()');
    }
  } catch (_) {}
}

async function clearCSS() {
  if (cssKey) {
    try { await view.removeInsertedCSS(cssKey); } catch (_) {}
    cssKey = null;
  }
}

// ---------------------------------------------------------------------------
// Throbber / status / loading state
// ---------------------------------------------------------------------------
let loadProgress = 0;
function setLoading(on) {
  throbber.classList.toggle('loading', on);
  document.getElementById('stop').disabled = !on;
  if (on) {
    loadProgress = 8;
    meterFill.style.width = '8%';
    statusText.textContent = 'Connecting to ' + (hostOf(currentURL) || 'the old web') + '...';
  } else {
    meterFill.style.width = '100%';
    setTimeout(() => { meterFill.style.width = '0%'; }, 400);
    statusText.textContent = 'Done';
  }
}
function bumpProgress() {
  loadProgress = Math.min(90, loadProgress + 12);
  meterFill.style.width = loadProgress + '%';
}

function updateNavButtons() {
  document.getElementById('back').disabled = !view.canGoBack();
  document.getElementById('forward').disabled = !view.canGoForward();
}

// Loading cover — keep the live (modern) page hidden until the retro styling lands
let coverTimer = null;
function showCover(url) {
  const c = document.getElementById('load-cover');
  if (!c) return;
  c.querySelector('.lc-text').textContent = 'Contacting ' + (hostOf(url) || 'host') + '…';
  c.hidden = false;
  clearTimeout(coverTimer);
  coverTimer = setTimeout(hideCover, 12000); // never get stuck
}
function hideCover() {
  clearTimeout(coverTimer);
  const c = document.getElementById('load-cover');
  if (c) c.hidden = true;
}

// Spot the cookie-cutter site builders and nudge the user toward GeoCities-ify
async function detectBuilder() {
  if (!config.enabled || isHome(currentURL)) return;
  try {
    const builder = await view.executeJavaScript(`(function(){
      try {
        var g=((document.querySelector('meta[name=generator]')||{}).content||'');
        var scripts=Array.prototype.map.call(document.scripts,function(s){return s.src||'';}).join(' ');
        var cls=(document.documentElement.className||'')+' '+((document.body&&document.body.className)||'');
        var hay=(g+' '+scripts+' '+cls).toLowerCase();
        if(hay.indexOf('squarespace')>-1) return 'Squarespace';
        if(hay.indexOf('wixstatic')>-1||hay.indexOf('wix.com')>-1) return 'Wix';
        if(hay.indexOf('webflow')>-1) return 'Webflow';
        if(hay.indexOf('framerusercontent')>-1||/(^|[^a-z])framer([^a-z]|$)/.test(hay)) return 'Framer';
        if(hay.indexOf('cdn.shopify')>-1||hay.indexOf('shopify')>-1) return 'Shopify';
        if(g.toLowerCase().indexOf('wordpress')>-1) return 'WordPress';
        return '';
      } catch(e){ return ''; }
    })()`);
    if (builder && config.geoCities < 50) {
      statusText.textContent = '⚡ ' + builder + ' site detected — drag GeoCities-ify in ★ Settings to punish it.';
    }
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// Webview events
// ---------------------------------------------------------------------------
view.addEventListener('did-start-loading', () => setLoading(true));
view.addEventListener('did-stop-loading', () => { setLoading(false); updateNavButtons(); hideCover(); });
view.addEventListener('did-start-navigation', (e) => {
  if (!e.isMainFrame) return;
  engineInjected = false;
  if (config.enabled && !isHome(e.url) && !/^data:/.test(e.url)) showCover(e.url);
  else hideCover();
});

view.addEventListener('did-navigate', (e) => {
  if (e.url === 'about:blank') return; // initial blank webview behind the start page
  currentURL = e.url;
  urlbar.value = isHome(e.url) ? '' : e.url;
  bumpProgress();
});
view.addEventListener('did-navigate-in-page', (e) => {
  if (e.isMainFrame) { currentURL = e.url; urlbar.value = isHome(e.url) ? '' : e.url; }
});
view.addEventListener('page-title-updated', (e) => {
  winTitle.textContent = (e.title ? e.title + ' — ' : '') + 'Notscape';
});
view.addEventListener('did-stop-loading', () => {
  if (!isHome(currentURL)) {
    window.notscape.addHistory({ url: currentURL, title: winTitle.textContent, at: Date.now() });
  }
});

// set our user-agent once the webview is live
view.addEventListener('dom-ready', () => {
  if (!uaApplied) { uaApplied = true; applyUserAgent(); }
});

// inject as early as the DOM allows, then re-affirm when fully loaded
view.addEventListener('dom-ready', async () => {
  await applyTransform();
  // reveal only after the injected CSS has had a frame to paint
  requestAnimationFrame(() => requestAnimationFrame(hideCover));
});
view.addEventListener('did-finish-load', async () => {
  await applyTransform();
  hideCover();
  detectBuilder();
});

view.addEventListener('did-fail-load', (e) => {
  if (e.errorCode === -3 || !e.isMainFrame) return; // -3 = aborted
  setLoading(false);
  hideCover();
  const html = errorPage(e.validatedURL || currentURL, e.errorDescription);
  view.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
});

view.addEventListener('update-target-url', (e) => {
  if (e.url) statusText.textContent = e.url;
  else if (!throbber.classList.contains('loading')) statusText.textContent = 'Done';
});

// popups (target=_blank / window.open) routed here from main
window.notscape.onOpenUrl((url) => navigate(url));

function errorPage(url, desc) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Not Found</title></head>
  <body style="background:#c0c0c0;font-family:'Times New Roman',serif;color:#000;padding:40px;text-align:center">
  <h1 style="font-size:40px">404 :-(</h1>
  <p>The page you requested has wandered off into cyberspace.</p>
  <p style="font-family:'Courier New',monospace;background:#fff;border:2px inset #c0c0c0;display:inline-block;padding:8px 14px">${(url||'').replace(/</g,'&lt;')}</p>
  <p><i>${(desc||'').replace(/</g,'&lt;')}</i></p>
  <hr><p>🚧 This corner of the Old Internet is under construction. 🚧</p>
  </body></html>`;
}

// ---------------------------------------------------------------------------
// Toolbar / location bar wiring
// ---------------------------------------------------------------------------
document.getElementById('back').addEventListener('click', () => { if (view.canGoBack()) { hideHome(); view.goBack(); } });
document.getElementById('forward').addEventListener('click', () => { if (view.canGoForward()) { hideHome(); view.goForward(); } });
document.getElementById('reload').addEventListener('click', () => {
  if (currentURL === HOME) { if (window.NotscapeHome) window.NotscapeHome.reload(); }
  else view.reload();
});
document.getElementById('stop').addEventListener('click', () => view.stop());
document.getElementById('home').addEventListener('click', () => navigate('home'));
document.getElementById('go').addEventListener('click', () => navigate(urlbar.value));

urlbar.addEventListener('keydown', (e) => { if (e.key === 'Enter') navigate(urlbar.value); });
urlbar.addEventListener('focus', () => urlbar.select());

// window controls
document.getElementById('min').addEventListener('click', () => window.notscape.windowControl('minimize'));
document.getElementById('max').addEventListener('click', () => window.notscape.windowControl('maximize'));
document.getElementById('close').addEventListener('click', () => window.notscape.windowControl('close'));

// home page (and any page) can ask us to navigate via postMessage
window.addEventListener('message', (e) => {
  if (e.data && e.data.ns === 'navigate' && typeof e.data.url === 'string') navigate(e.data.url);
});
// the home page is local; intercept its link clicks through the title bar search instead
view.addEventListener('ipc-message', (e) => {
  if (e.channel === 'navigate' && e.args[0]) navigate(e.args[0]);
});

// ---------------------------------------------------------------------------
// Master ON/OFF toggle (injected into the toolbar)
// ---------------------------------------------------------------------------
function buildMasterToggle() {
  const t = document.createElement('div');
  t.id = 'master-toggle';
  t.title = 'Toggle the Old Internet';
  t.innerHTML = '<span class="lamp"></span> Old Internet: <b>ON</b>';
  t.addEventListener('click', () => {
    config.enabled = !config.enabled;
    syncMasterToggle();
    saveConfig();
    applyTransform();
    syncModsPanel();
  });
  const toolbar = document.getElementById('toolbar');
  toolbar.insertBefore(t, document.getElementById('throbber'));
}
function syncMasterToggle() {
  const t = document.getElementById('master-toggle');
  t.classList.toggle('off', !config.enabled);
  t.querySelector('b').textContent = config.enabled ? 'ON' : 'OFF';
}

// ---------------------------------------------------------------------------
// Bookmarks
// ---------------------------------------------------------------------------
function renderBookmarks() {
  bookmarksBar.innerHTML = '';
  const add = document.createElement('span');
  add.className = 'bm bm-add';
  add.textContent = '➕ Add';
  add.title = 'Bookmark this page';
  add.addEventListener('click', addCurrentBookmark);
  bookmarksBar.appendChild(add);

  bookmarks.forEach((bm, i) => {
    const el = document.createElement('span');
    el.className = 'bm';
    el.innerHTML = '<span class="fav">N</span>' + escapeHtml(bm.title);
    el.title = bm.url;
    el.addEventListener('click', () => navigate(bm.url));
    el.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      bookmarks.splice(i, 1);
      window.notscape.setBookmarks(bookmarks);
      renderBookmarks();
    });
    bookmarksBar.appendChild(el);
  });
}
function addCurrentBookmark() {
  const url = isHome(currentURL) ? 'home' : currentURL;
  const title = (winTitle.textContent || url).replace(/ — Notscape$/, '').slice(0, 40) || url;
  if (bookmarks.some((b) => b.url === url)) return;
  bookmarks.push({ title, url });
  window.notscape.setBookmarks(bookmarks);
  renderBookmarks();
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

document.getElementById('bookmarks-menu').addEventListener('click', () => navigate('home'));

// ---------------------------------------------------------------------------
// Mods panel
// ---------------------------------------------------------------------------
const overlay = document.getElementById('mods-overlay');
const CHECKS = ['siteSkins', 'oldFonts', 'flatten', 'beveled', 'retroLinks', 'grayBg', 'tiledBg',
  'comicSans', 'killSticky', 'marquee', 'blink', 'construction', 'hitCounter', 'webring', 'dither',
  'soundWelcome', 'soundMail', 'blockAds', 'safeMode', 'spoofUA'];
const SLIDERS = ['age', 'pixelation', 'colorDepth'];

function openMods() { syncModsPanel(); overlay.hidden = false; }
function closeMods() { overlay.hidden = true; }
document.getElementById('mods').addEventListener('click', openMods);
document.getElementById('mods-menu-btn').addEventListener('click', openMods);
document.getElementById('mods-close').addEventListener('click', closeMods);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeMods(); });
// safety net + handy browser shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !overlay.hidden) closeMods();
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i')) {
    e.preventDefault();
    try { view.isDevToolsOpened() ? view.closeDevTools() : view.openDevTools(); } catch (_) {}
  }
  if (e.key === 'F5' || (e.ctrlKey && e.key.toLowerCase() === 'r')) { e.preventDefault(); view.reload(); }
  if (e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); urlbar.focus(); urlbar.select(); }
});

function syncModsPanel() {
  CHECKS.forEach((k) => { const el = document.getElementById(k); if (el) el.checked = !!config[k]; });
  SLIDERS.forEach((k) => {
    const el = document.getElementById(k);
    if (el) { el.value = config[k]; updateSliderLabel(k); }
  });
  const gs = document.getElementById('geoCities');
  if (gs) {
    gs.value = config.geoCities || 0;
    const lab = document.getElementById('v-geoCities');
    if (lab) lab.textContent = config.geoCities || 0;
  }
}
function updateSliderLabel(k) {
  const out = document.getElementById('v-' + k);
  if (!out) return;
  if (k === 'colorDepth') out.textContent = window.NotscapeStyles.colorDepths[config.colorDepth] || 256;
  else out.textContent = config[k];
}

CHECKS.forEach((k) => {
  const el = document.getElementById(k);
  if (!el) return;
  el.addEventListener('change', () => {
    config[k] = el.checked;
    saveConfig();
    if (k === 'spoofUA') { applyUserAgent(); view.reload(); }
    else if (k === 'blockAds') { window.notscape.setBlockAds(el.checked); view.reload(); }
    else if (k === 'safeMode') { window.notscape.setSafeMode(el.checked); view.reload(); }
    else applyTransform();
  });
});

// GeoCities-ify macro slider — one dial that stages chaos onto any cookie-cutter site
function applyGeoLevel(n) {
  config.geoCities = n;
  if (n > 0) config.enabled = true;
  const on = (t) => n >= t;
  Object.assign(config, {
    oldFonts: true, retroLinks: true, flatten: true, killSticky: true,
    beveled: on(15),
    grayBg: !on(40),       // gray document until the starfield takes over
    tiledBg: on(40),
    marquee: on(50),
    construction: on(55),
    hitCounter: on(60),
    blink: on(65),
    webring: on(70),
    comicSans: on(80),
    dither: on(85)
  });
  config.pixelation = on(85) ? 3 : 0;
  config.age = Math.min(100, 50 + Math.round(n * 0.5));
  syncModsPanel();
  syncMasterToggle();
  saveConfig();
  applyTransform();
}
const geoSlider = document.getElementById('geoCities');
if (geoSlider) {
  geoSlider.addEventListener('input', () => {
    document.getElementById('v-geoCities').textContent = geoSlider.value;
    applyGeoLevel(parseInt(geoSlider.value, 10));
  });
}
SLIDERS.forEach((k) => {
  const el = document.getElementById(k);
  if (!el) return;
  el.addEventListener('input', () => {
    config[k] = parseInt(el.value, 10);
    updateSliderLabel(k);
    applyTransform();
  });
  el.addEventListener('change', saveConfig);
});

// presets
const PRESETS = {
  modern: { enabled: false },
  reskin: {
    enabled: true, siteSkins: true, age: 70, pixelation: 0, colorDepth: 1,
    oldFonts: true, flatten: true, beveled: true, retroLinks: true, grayBg: true,
    tiledBg: false, comicSans: false, killSticky: true, marquee: false, blink: false,
    construction: false, hitCounter: false, webring: false, dither: false, spoofUA: false
  },
  geocities: {
    enabled: true, siteSkins: true, age: 85, pixelation: 3, colorDepth: 1,
    oldFonts: true, flatten: true, beveled: true, retroLinks: true, grayBg: false,
    tiledBg: true, comicSans: true, killSticky: true, marquee: true, blink: true,
    construction: true, hitCounter: true, webring: true, dither: true, spoofUA: false
  },
  mosaic: {
    enabled: true, siteSkins: false, age: 100, pixelation: 0, colorDepth: 0,
    oldFonts: true, flatten: true, beveled: false, retroLinks: true, grayBg: true,
    tiledBg: false, comicSans: false, killSticky: true, marquee: false, blink: false,
    construction: false, hitCounter: false, webring: false, dither: false, spoofUA: true
  }
};
document.querySelectorAll('.presets button[data-preset]').forEach((b) => {
  b.addEventListener('click', () => {
    const wasSpoof = config.spoofUA;
    // presets keep the user's network/privacy/sound prefs
    const keep = {
      blockAds: config.blockAds, safeMode: config.safeMode,
      soundWelcome: config.soundWelcome, soundMail: config.soundMail
    };
    config = Object.assign({}, DEFAULT_CONFIG, PRESETS[b.dataset.preset], keep);
    syncModsPanel();
    syncMasterToggle();
    saveConfig();
    if (config.spoofUA !== wasSpoof) { applyUserAgent(); view.reload(); }
    else applyTransform();
  });
});

// Clear browsing data
const clearBtn = document.getElementById('clearData');
if (clearBtn) {
  clearBtn.addEventListener('click', async () => {
    clearBtn.disabled = true;
    const ok = await window.notscape.clearData();
    statusText.textContent = ok ? 'Cleared cookies, cache & history.' : 'Could not clear data.';
    clearBtn.disabled = false;
  });
}

function applyUserAgent() {
  try { view.setUserAgent(config.spoofUA ? NETSCAPE_UA : CLEAN_UA); } catch (_) {}
}

// ---------------------------------------------------------------------------
// AOL-style sounds. Plays assets/<file> if present; otherwise the system
// text-to-speech voice says the line (no copyrighted audio shipped).
// ---------------------------------------------------------------------------
function speak(text) {
  try {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95; u.pitch = 1.0; u.volume = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch (_) {}
}
// Look for sound files in a writable folder first (so installed users can add
// their own), then the app's bundled assets, then fall back to text-to-speech.
let assetDirs = [new URL('../assets/', location.href).href];
function playSound(file, fallbackText) {
  const urls = assetDirs.map((d) => d + file);
  let i = 0;
  const tryNext = () => {
    if (i >= urls.length) { speak(fallbackText); return; }
    const audio = new Audio(urls[i++]);
    audio.addEventListener('error', tryNext, { once: true });
    const p = audio.play();
    if (p && p.catch) p.catch(tryNext);
  };
  tryNext();
}

// "You've got mail!" when arriving at Gmail
let wasMailHost = false;
view.addEventListener('did-navigate', (e) => {
  const h = hostOf(e.url);
  const isMail = /(^|\.)mail\.google\.com$/.test(h) || /(^|\.)gmail\.com$/.test(h);
  if (isMail && !wasMailHost && config.soundMail) {
    playSound('youve-got-mail.wav', "You've got mail!");
  }
  wasMailHost = isMail;
});

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
let saveTimer = null;
function saveConfig() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => window.notscape.setConfig(config), 250);
}

async function init() {
  const saved = await window.notscape.getConfig();
  if (saved) config = Object.assign({}, DEFAULT_CONFIG, saved);
  // a writable assets dir (userData/assets) takes priority for custom sounds
  try {
    const p = await window.notscape.getPaths();
    if (p && p.userData) {
      const base = encodeURI('file:///' + p.userData.replace(/\\/g, '/')) + '/assets/';
      assetDirs = [base].concat(assetDirs);
    }
  } catch (_) {}
  // keep the main process's network flags in sync with saved prefs
  window.notscape.setBlockAds(config.blockAds);
  window.notscape.setSafeMode(config.safeMode);
  bookmarks = await window.notscape.getBookmarks();
  buildMasterToggle();
  syncMasterToggle();
  renderBookmarks();
  syncModsPanel();
  showHome(); // land on the RSS start page
  updateNavButtons();

  // we just "connected" — greet the user
  if (config.soundWelcome) setTimeout(() => playSound('welcome.wav', 'Welcome!'), 500);
}

window.notscape.onWindowState(() => {});
init();
