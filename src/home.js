// home.js — the RSS "welcome screen". Runs in the main renderer (has IPC access).
// Feeds are fetched in the main process (CORS-free) and parsed here with DOMParser.
(function () {
  const $ = (id) => document.getElementById(id);

  const PAGE_SIZE = 8;
  const RECENT_COUNT = 18;

  let feeds = [];
  let items = [];
  let loadErrors = [];
  let feedErrors = {};
  let view = 'recent';
  let page = 0;
  let loading = false;

  // ---- helpers ----
  function first(el, tag) { const n = el.getElementsByTagName(tag); return n.length ? n[0] : null; }
  function txt(el, tag) { const n = first(el, tag); return n ? n.textContent.trim() : ''; }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  function stripHtml(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.innerHTML = s;
    const t = (d.textContent || '').replace(/\s+/g, ' ').trim();
    return t.length > 180 ? t.slice(0, 180) + '…' : t;
  }
  function fmtDate(d) { if (!d) return ''; const t = new Date(d); return isNaN(t) ? '' : t.toLocaleString(); }
  function ts(d) { const t = new Date(d).getTime(); return isNaN(t) ? 0 : t; }

  // ---- parsing (RSS 2.0 + Atom) ----
  function parseFeed(xml, fallbackTitle) {
    let doc;
    try { doc = new DOMParser().parseFromString(xml, 'text/xml'); }
    catch (e) { return { title: fallbackTitle, items: [] }; }
    const root = doc.documentElement;
    if (!root) return { title: fallbackTitle, items: [] };

    const channelTitle = txt(root, 'title') || fallbackTitle;
    const out = [];

    const rss = doc.getElementsByTagName('item');
    for (let i = 0; i < rss.length; i++) {
      const it = rss[i];
      const l = first(it, 'link');
      out.push({
        title: txt(it, 'title') || '(untitled)',
        link: l ? (l.textContent.trim() || l.getAttribute('href') || '') : '',
        date: txt(it, 'pubDate') || txt(it, 'date') || '',
        desc: stripHtml(txt(it, 'description')),
        source: channelTitle
      });
    }

    const atom = doc.getElementsByTagName('entry');
    for (let i = 0; i < atom.length; i++) {
      const en = atom[i];
      const links = en.getElementsByTagName('link');
      let link = links.length ? (links[0].getAttribute('href') || '') : '';
      for (let j = 0; j < links.length; j++) {
        if (links[j].getAttribute('rel') === 'alternate' && links[j].getAttribute('href')) {
          link = links[j].getAttribute('href');
        }
      }
      out.push({
        title: txt(en, 'title') || '(untitled)',
        link: link,
        date: txt(en, 'updated') || txt(en, 'published') || '',
        desc: stripHtml(txt(en, 'summary') || txt(en, 'content')),
        source: channelTitle
      });
    }

    return { title: channelTitle, items: out };
  }

  // ---- load + render ----
  async function loadAll() {
    if (loading) return;
    loading = true;
    renderItems();

    let changed = false;
    const results = await Promise.all(feeds.map(async (f) => {
      try {
        const r = await window.notscape.fetchFeed(f.url);
        if (!r || !r.ok) return { feed: f, error: (r && r.error) || 'failed', items: [] };
        const parsed = parseFeed(r.text, f.title || f.url);
        if (!f.title && parsed.title) { f.title = parsed.title; changed = true; }
        const src = f.title || parsed.title || f.url;
        parsed.items.forEach((it) => { it.source = src; });
        return { feed: f, items: parsed.items };
      } catch (e) {
        return { feed: f, error: String(e), items: [] };
      }
    }));

    items = [];
    results.forEach((r) => { items = items.concat(r.items); });
    items.sort((a, b) => ts(b.date) - ts(a.date));
    loadErrors = results.filter((r) => r.error).map((r) => r.feed.title || r.feed.url);
    feedErrors = {};
    results.forEach((r) => { if (r.error) feedErrors[r.feed.url] = r.error; });
    loading = false;
    page = 0;
    if (changed) saveFeeds();
    renderItems();
    renderFeedList();
  }

  function renderItems() {
    const box = $('hs-items');
    const pager = $('hs-pager');
    if (!box) return;

    if (loading) { box.innerHTML = '<p class="hs-empty">Dialing your channels&hellip;</p>'; pager.hidden = true; return; }
    if (!feeds.length) { box.innerHTML = '<p class="hs-empty">No channels yet — add an RSS feed on the right &rarr;</p>'; pager.hidden = true; return; }
    if (!items.length) {
      box.innerHTML = '<p class="hs-err">Couldn\'t load any items' +
        (loadErrors.length ? ' (' + esc(loadErrors.join(', ')) + ')' : '') + '. Check the URLs &rarr;</p>';
      pager.hidden = true; return;
    }

    let list, showPager = false;
    if (view === 'recent') {
      list = items.slice(0, RECENT_COUNT);
    } else {
      const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
      page = Math.min(Math.max(0, page), pages - 1);
      list = items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
      showPager = true;
      $('hs-pageinfo').textContent = 'Page ' + (page + 1) + ' of ' + pages;
      $('hs-prev').disabled = page <= 0;
      $('hs-next').disabled = page >= pages - 1;
    }

    box.innerHTML = list.map((it) =>
      '<div class="hs-item">' +
        (it.link ? '<a class="hs-title" href="' + esc(it.link) + '">' + esc(it.title) + '</a>'
                 : '<span class="hs-title">' + esc(it.title) + '</span>') +
        '<div class="hs-meta"><span class="hs-src">' + esc(it.source) + '</span>' +
        (it.date ? ' &middot; ' + esc(fmtDate(it.date)) : '') + '</div>' +
        (it.desc ? '<div class="hs-desc">' + esc(it.desc) + '</div>' : '') +
      '</div>'
    ).join('');
    pager.hidden = !showPager;
  }

  function renderFeedList() {
    const ul = $('hs-feedlist');
    if (!ul) return;
    ul.innerHTML = feeds.map((f, i) => {
      const err = feedErrors[f.url];
      return '<li><span>' + esc(f.title || f.url) +
        (err ? ' <span class="hs-warn" title="' + esc(err) + '">⚠</span>' : '') + '</span>' +
        '<span class="hs-del" data-i="' + i + '" title="Remove">✕</span></li>';
    }).join('');
    if ($('hs-count')) $('hs-count').textContent = feeds.length;
  }

  async function saveFeeds() { try { await window.notscape.setFeeds(feeds); } catch (e) {} }

  function openUrl(u) { if (window.notscapeOpen) window.notscapeOpen(u); }

  // ---- events ----
  function wire() {
    const hs = $('home-screen');

    // Intercept every link so it opens in the webview, not the app window.
    hs.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (a) {
        e.preventDefault();
        const href = a.getAttribute('href');
        if (href && href !== '#') openUrl(href);
        return;
      }
      const del = e.target.closest('.hs-del');
      if (del) { removeFeed(parseInt(del.getAttribute('data-i'), 10)); }
    });

    $('hs-search').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = $('hs-q').value.trim();
      if (q) openUrl('https://lite.duckduckgo.com/lite/?q=' + encodeURIComponent(q));
    });

    $('hs-addform').addEventListener('submit', async (e) => {
      e.preventDefault();
      let u = $('hs-addurl').value.trim();
      if (!u) return;
      if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
      feeds.push({ title: '', url: u });
      $('hs-addurl').value = '';
      renderFeedList();
      await saveFeeds();
      loadAll();
    });

    $('hs-view').addEventListener('change', () => {
      view = $('hs-view').value;
      page = 0;
      try { localStorage.setItem('ns-home-view', view); } catch (e) {}
      renderItems();
    });

    $('hs-refresh').addEventListener('click', loadAll);
    $('hs-prev').addEventListener('click', () => { page--; renderItems(); });
    $('hs-next').addEventListener('click', () => { page++; renderItems(); });
  }

  async function removeFeed(i) {
    if (isNaN(i) || i < 0 || i >= feeds.length) return;
    feeds.splice(i, 1);
    renderFeedList();
    await saveFeeds();
    loadAll();
  }

  function startClock() {
    const upd = () => {
      const el = $('hs-clock');
      if (!el) return;
      const d = new Date();
      el.textContent = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
    };
    upd();
    setInterval(upd, 1000);
  }

  async function init() {
    try {
      const a = await window.notscape.getAccount();
      if (a && a.screenName && $('hs-name')) $('hs-name').textContent = a.screenName;
    } catch (e) {}
    try { view = localStorage.getItem('ns-home-view') || 'recent'; } catch (e) {}
    if ($('hs-view')) $('hs-view').value = view;
    try { feeds = (await window.notscape.getFeeds()) || []; } catch (e) { feeds = []; }
    renderFeedList();
    wire();
    startClock();
    loadAll();
  }

  // Exposed so the browser chrome can show/refresh the start page
  window.NotscapeHome = {
    onShow: function () { if (!items.length && !loading) loadAll(); else renderItems(); },
    reload: loadAll
  };

  init();
})();
