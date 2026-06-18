// Notscape — main process
// Wires up the AOL-style sign-on splash, the frameless retro browser window,
// CSP/X-Frame stripping (so "every website" actually loads + can be re-skinned),
// and the small bits of persistence (bookmarks / history / mods config).

const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Let the modem screech + any page audio play without a user gesture.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// --- debug log (so we can watch a browsing session and catch errors) ---
const LOG_PATH = path.join(__dirname, 'notscape-debug.log');
function appendLog(line) {
  try { fs.appendFileSync(LOG_PATH, '[' + new Date().toISOString().slice(11, 23) + '] ' + line + '\n'); } catch (_) {}
}

let splashWindow = null;
let mainWindow = null;

// Network behavior flags (synced from the renderer's saved config at startup)
let stripHeaders = true; // false when Safe Mode keeps sites' CSP / X-Frame headers
let blockAds = true;     // ad & tracker blocking

// A compact ad/tracker host blocklist (suffix-matched). Not exhaustive, but
// kills the worst offenders in the spirit of the lean old web.
const AD_HOSTS = [
  'doubleclick.net', 'g.doubleclick.net', 'ad.doubleclick.net', 'googlesyndication.com',
  'googleadservices.com', 'google-analytics.com', 'googletagmanager.com', 'googletagservices.com',
  'adservice.google.com', 'amazon-adsystem.com', 'ads-twitter.com', 'analytics.twitter.com',
  'scorecardresearch.com', 'quantserve.com', 'quantcount.com', 'criteo.com', 'criteo.net',
  'taboola.com', 'outbrain.com', 'adnxs.com', 'rubiconproject.com', 'pubmatic.com', 'openx.net',
  'casalemedia.com', 'moatads.com', 'adsrvr.org', '3lift.com', 'sharethrough.com', 'teads.tv',
  'smartadserver.com', 'yieldmo.com', 'indexww.com', 'adform.net', 'connect.facebook.net',
  'analytics.tiktok.com', 'hotjar.com', 'mixpanel.com', 'fullstory.com', 'mouseflow.com',
  'clarity.ms', 'demdex.net', 'omtrdc.net', '2o7.net', 'everesttech.net', 'bluekai.com',
  'rlcdn.com', 'adroll.com', 'crazyegg.com', 'segment.io', 'branch.io',
  // strengthened: more ad exchanges / SSPs / DSPs
  'advertising.com', 'adtechus.com', 'contextweb.com', 'gumgum.com', 'districtm.io',
  'sonobi.com', 'spotxchange.com', 'spotx.tv', 'tremorhub.com', 'serving-sys.com',
  'flashtalking.com', 'mathtag.com', 'mediamath.com', 'tapad.com', 'liveramp.com',
  'crwdcntrl.net', 'exelator.com', 'eyeota.net', 'zemanta.com', 'revcontent.com',
  'mgid.com', 'adblade.com', 'dianomi.com', 'plista.com', 'ligatus.com', 'undertone.com',
  'popads.net', 'popcash.net', 'propellerads.com', 'adcash.com', 'exoclick.com',
  'juicyads.com', 'infolinks.com', 'chitika.com', 'media.net', 'viglink.com',
  'skimresources.com', 'zergnet.com', 'bidr.io', 'gravity.com', 'yieldlab.net',
  // more trackers / analytics / tag managers
  'chartbeat.com', 'parsely.com', 'permutive.com', 'cxense.com', 'sail-horizon.com',
  'krxd.net', 'tealiumiq.com', 'amplitude.com', 'heap.io', 'pendo.io', 'marketo.net',
  'pardot.com', 'addthis.com', 'sharethis.com', 'nr-data.net', 'newrelic.com',
  'sentry-cdn.com', 'bugsnag.com', 'optimizely.com', 'bizible.com', 'demandbase.com',
  'doubleverify.com', 'adsafeprotected.com', 'agkn.com', 'rfihub.com', 'simpli.fi',
  'stickyadstv.com', 'smartadserver.net', 'pixel.facebook.com', 'an.facebook.com'
];

function isAdHost(url) {
  let host;
  try { host = new URL(url).hostname.toLowerCase(); } catch (_) { return false; }
  return AD_HOSTS.some((d) => host === d || host.endsWith('.' + d));
}

// Silently strip tracking parameters from URLs (default on)
let stripParams = true;
const TRACK_PARAMS = [
  'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid', 'mc_eid', 'mc_cid', 'igshid', 'twclid',
  'yclid', 'wickedid', 'oly_anon_id', 'oly_enc_id', 'vero_id', '_hsenc', '_hsmi',
  'ref_src', 'ref_url', 'spm', 's_cid', 'cmpid', 'icid'
];
function cleanTrackingUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    let changed = false;
    for (const key of [...u.searchParams.keys()]) {
      if (TRACK_PARAMS.includes(key) || /^utm_/i.test(key)) { u.searchParams.delete(key); changed = true; }
    }
    return changed ? u.toString() : null;
  } catch (_) { return null; }
}

// "No social media" — block navigation to these (default on)
let blockSocial = true;
const SOCIAL_HOSTS = [
  'facebook.com', 'fb.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com',
  'threads.net', 'snapchat.com', 'linkedin.com', 'pinterest.com', 'tumblr.com'
];
function isSocialHost(url) {
  let host;
  try { host = new URL(url).hostname.toLowerCase(); } catch (_) { return false; }
  return SOCIAL_HOSTS.some((d) => host === d || host.endsWith('.' + d));
}
function socialBlockPage(host) {
  const safe = String(host).replace(/[<>&]/g, '');
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>404 Not Found</title></head>' +
    '<body style="background:#fff;color:#000;font-family:\'Times New Roman\',Times,serif;padding:28px 34px">' +
    '<h1 style="font-size:30px;margin:0 0 10px">Not Found</h1>' +
    '<p style="font-size:15px">The requested URL was not found on this server.</p>' +
    '<hr style="border:0;border-top:1px solid #000;margin:14px 0">' +
    '<p style="font-size:13px">Notscape Server at <b>' + safe + '</b> Port 80</p>' +
    '<br><br><br>' +
    '<p style="color:#808080;font-size:12px;font-style:italic">This site hasn\'t been invented yet. ' +
    'Check back in a few years &mdash; or switch off &ldquo;No social media&rdquo; in Edit &rarr; Preferences.</p>' +
    '</body></html>';
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
}

// Auth / sign-in hosts treated as hands-off: we never strip their security
// headers (and the renderer never injects into them), so entering a password
// stays as safe as in a normal browser. The inbox itself (mail.google.com) is
// NOT in here, so it still gets the old-school skin.
const SECURE_HOSTS = [
  'accounts.google.com', 'accounts.youtube.com', 'myaccount.google.com',
  'login.microsoftonline.com', 'login.live.com', 'login.microsoft.com',
  'appleid.apple.com', 'signin.aws.amazon.com'
];
function isSecureAuthHost(url) {
  let host;
  try { host = new URL(url).hostname.toLowerCase(); } catch (_) { return false; }
  if (/^(accounts|login|signin|auth|sso|secure|id|myaccount)\./.test(host)) return true;
  return SECURE_HOSTS.some((d) => host === d || host.endsWith('.' + d));
}

// ---------------------------------------------------------------------------
// Tiny JSON persistence in the app's userData dir
// ---------------------------------------------------------------------------
const dataPath = (name) => path.join(app.getPath('userData'), name);

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(dataPath(file), 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function writeJson(file, data) {
  try {
    fs.writeFileSync(dataPath(file), JSON.stringify(data, null, 2));
    return true;
  } catch (_) {
    return false;
  }
}

const DEFAULT_BOOKMARKS = [
  { title: 'Notscape Home', url: 'home' },
  { title: 'Wikipedia', url: 'https://en.wikipedia.org/' },
  { title: 'Hacker News', url: 'https://news.ycombinator.com/' },
  { title: 'Project Gutenberg', url: 'https://www.gutenberg.org/' },
  { title: 'The Internet Archive', url: 'https://archive.org/' },
  { title: 'Space Jam (1996)', url: 'https://www.spacejam.com/1996/' },
  { title: 'CSS Zen... nah', url: 'https://motherfuckingwebsite.com/' }
];

// ---------------------------------------------------------------------------
// Windows
// ---------------------------------------------------------------------------
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 340,
    frame: false,
    resizable: false,
    center: true,
    backgroundColor: '#c0c0c0',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  splashWindow.loadFile(path.join(__dirname, 'src', 'splash.html'));
  splashWindow.on('closed', () => { splashWindow = null; });
}

function createMain() {
  const win = new BrowserWindow({
    width: 1040,
    height: 740,
    minWidth: 700,
    minHeight: 500,
    frame: false,
    show: false,
    backgroundColor: '#c0c0c0',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: false
    }
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.on('maximize', () => win.webContents.send('window-state', { maximized: true }));
  win.on('unmaximize', () => win.webContents.send('window-state', { maximized: false }));
  win.on('closed', () => { if (mainWindow === win) mainWindow = null; });
  mainWindow = win; // most-recent window is the default target
  return win;
}

// Block ad/tracker requests, and (unless Safe Mode is on) strip headers that
// would otherwise stop a site from loading in our <webview> or block our
// injected retro styling. This is a toy browser — by default we trade some
// security hardening for the ability to re-skin anything.
function setupNetwork() {
  const ses = session.defaultSession;

  ses.webRequest.onBeforeRequest((details, callback) => {
    if (blockAds && isAdHost(details.url)) { callback({ cancel: true }); return; }
    if (stripParams && (details.resourceType === 'mainFrame' || details.resourceType === 'subFrame')) {
      const cleaned = cleanTrackingUrl(details.url);
      if (cleaned) { callback({ redirectURL: cleaned }); return; }
    }
    callback({});
  });

  ses.webRequest.onHeadersReceived((details, callback) => {
    // never weaken a sign-in page, regardless of Safe Mode
    if (!stripHeaders || isSecureAuthHost(details.url)) { callback({}); return; }
    const headers = details.responseHeaders || {};
    for (const key of Object.keys(headers)) {
      const k = key.toLowerCase();
      if (
        k === 'content-security-policy' ||
        k === 'content-security-policy-report-only' ||
        k === 'x-frame-options' ||
        k === 'cross-origin-embedder-policy' ||
        k === 'cross-origin-opener-policy'
      ) {
        delete headers[key];
      }
    }
    callback({ responseHeaders: headers });
  });
}

// Keep target=_blank / window.open navigations inside our one webview.
app.on('web-contents-created', (event, contents) => {
  if (contents.getType() === 'webview') {
    contents.setWindowOpenHandler(({ url }) => {
      if (blockSocial && isSocialHost(url)) {
        let h = ''; try { h = new URL(url).hostname; } catch (_) {}
        contents.loadURL(socialBlockPage(h));
        return { action: 'deny' };
      }
      const host = contents.hostWebContents; // the window that owns this webview
      if (host && !host.isDestroyed()) host.send('open-url', url);
      else if (mainWindow) mainWindow.webContents.send('open-url', url);
      return { action: 'deny' };
    });
    // No-social-media: redirect any navigation to a social host to a block page
    contents.on('will-navigate', (e, url) => {
      if (blockSocial && isSocialHost(url)) {
        e.preventDefault();
        let h = ''; try { h = new URL(url).hostname; } catch (_) {}
        contents.loadURL(socialBlockPage(h));
      }
    });
    // debug log: surface page-level failures
    contents.on('did-fail-load', (e, code, desc, url) => { if (code !== -3) appendLog('FAIL ' + code + ' ' + desc + ' :: ' + url); });
    contents.on('render-process-gone', (e, d) => appendLog('RENDER GONE ' + JSON.stringify(d)));
    contents.on('preload-error', (e, file, err) => appendLog('PRELOAD ERR ' + ((err && err.message) || err)));
    contents.on('unresponsive', () => appendLog('PAGE UNRESPONSIVE'));
  }
});

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------
ipcMain.on('window-control', (event, action) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  if (action === 'minimize') win.minimize();
  else if (action === 'maximize') win.isMaximized() ? win.unmaximize() : win.maximize();
  else if (action === 'close') win.close();
});

ipcMain.on('splash-connected', () => {
  createMain();
  if (splashWindow) splashWindow.close();
});

ipcMain.on('window:new', () => createMain());
ipcMain.on('log:write', (_e, line) => appendLog(String(line).slice(0, 4000)));

ipcMain.handle('bookmarks:get', () => readJson('bookmarks.json', DEFAULT_BOOKMARKS));
ipcMain.handle('bookmarks:set', (_e, data) => writeJson('bookmarks.json', data));
ipcMain.handle('config:get', () => readJson('config.json', null));
ipcMain.handle('config:set', (_e, data) => writeJson('config.json', data));
ipcMain.handle('history:get', () => readJson('history.json', []));
ipcMain.handle('history:add', (_e, entry) => {
  const hist = readJson('history.json', []);
  // de-dupe consecutive identical urls
  if (!hist.length || hist[0].url !== entry.url) hist.unshift(entry);
  return writeJson('history.json', hist.slice(0, 500));
});
ipcMain.handle('history:clear', () => writeJson('history.json', []));
ipcMain.handle('account:get', () => readJson('account.json', { screenName: 'saxman103' }));
ipcMain.handle('account:set', (_e, data) => writeJson('account.json', data));
ipcMain.handle('paths:get', () => ({ userData: app.getPath('userData') }));

// --- RSS start page ---
const DEFAULT_FEEDS = [
  { title: 'Engadget', url: 'https://www.engadget.com/rss.xml' },
  { title: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { title: 'CleanTechnica', url: 'https://cleantechnica.com/feed/' },
  { title: 'All3DP', url: 'https://all3dp.com/feed/' },
  { title: '3DPrint.com', url: 'https://3dprint.com/feed/' },
  { title: 'Gizmodo', url: 'https://gizmodo.com/rss' },
  { title: 'Hackaday', url: 'https://hackaday.com/blog/feed/' },
  // recommended companions
  { title: 'Adafruit Blog', url: 'https://blog.adafruit.com/feed/' },
  { title: 'Electrek', url: 'https://electrek.co/feed/' },
  { title: 'Hacker News', url: 'https://hnrss.org/frontpage' }
];
ipcMain.handle('feeds:get', () => readJson('feeds.json', DEFAULT_FEEDS));
ipcMain.handle('feeds:set', (_e, data) => writeJson('feeds.json', data));

// per-site flourishes: { "host": ["starfield","snow",...] }
ipcMain.handle('flourishes:get', () => readJson('flourishes.json', {}));
ipcMain.handle('flourishes:set', (_e, data) => writeJson('flourishes.json', data));

// Fetch a feed from the main process so we sidestep the webview's CORS rules.
ipcMain.handle('rss:fetch', async (_e, url) => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
      }
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, error: 'HTTP ' + res.status };
    const text = await res.text();
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
});

ipcMain.on('net:safe-mode', (_e, on) => { stripHeaders = !on; });
ipcMain.on('net:block-ads', (_e, on) => { blockAds = !!on; });
ipcMain.on('net:block-social', (_e, on) => { blockSocial = !!on; });
ipcMain.on('net:strip-params', (_e, on) => { stripParams = !!on; });
ipcMain.handle('privacy:clear', async () => {
  try {
    await session.defaultSession.clearStorageData();
    await session.defaultSession.clearCache();
    writeJson('history.json', []);
    return true;
  } catch (_) {
    return false;
  }
});

// ---------------------------------------------------------------------------
app.whenReady().then(async () => {
  appendLog('========== session start ==========');
  // sync network flags from the renderer's last-saved config
  const cfg = readJson('config.json', null);
  if (cfg) {
    if (cfg.safeMode) stripHeaders = false;
    if (cfg.blockAds === false) blockAds = false;
    if (cfg.blockSocial === false) blockSocial = false;
    if (cfg.stripParams === false) stripParams = false;
    // ephemeral session: wipe last session's cookies/cache on launch
    if (cfg.clearOnExit) {
      try { await session.defaultSession.clearStorageData(); await session.defaultSession.clearCache(); } catch (_) {}
    }
  }
  setupNetwork();
  createSplash();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createSplash();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
