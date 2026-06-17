// Preload — the only bridge between the sandboxed renderer/splash and main.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notscape', {
  // window chrome
  windowControl: (action) => ipcRenderer.send('window-control', action),
  onWindowState: (cb) => ipcRenderer.on('window-state', (_e, s) => cb(s)),

  // splash -> main handshake
  splashConnected: () => ipcRenderer.send('splash-connected'),

  // popups routed back into our single webview
  onOpenUrl: (cb) => ipcRenderer.on('open-url', (_e, url) => cb(url)),

  // persistence
  getBookmarks: () => ipcRenderer.invoke('bookmarks:get'),
  setBookmarks: (data) => ipcRenderer.invoke('bookmarks:set', data),
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (data) => ipcRenderer.invoke('config:set', data),
  getHistory: () => ipcRenderer.invoke('history:get'),
  addHistory: (entry) => ipcRenderer.invoke('history:add', entry),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  getAccount: () => ipcRenderer.invoke('account:get'),
  setAccount: (data) => ipcRenderer.invoke('account:set', data),
  getPaths: () => ipcRenderer.invoke('paths:get'),

  // network / privacy
  setSafeMode: (on) => ipcRenderer.send('net:safe-mode', on),
  setBlockAds: (on) => ipcRenderer.send('net:block-ads', on),
  clearData: () => ipcRenderer.invoke('privacy:clear'),

  // RSS start page
  getFeeds: () => ipcRenderer.invoke('feeds:get'),
  setFeeds: (data) => ipcRenderer.invoke('feeds:set', data),
  fetchFeed: (url) => ipcRenderer.invoke('rss:fetch', url),

  // per-site flourishes
  getSiteFlourishes: () => ipcRenderer.invoke('flourishes:get'),
  setSiteFlourishes: (data) => ipcRenderer.invoke('flourishes:set', data)
});
