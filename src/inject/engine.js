// engine.js
// `notscapeEngine` is never called in the renderer — renderer.js stringifies it
// with Function.prototype.toString() and injects it into the <webview> via
// executeJavaScript(). So it MUST be fully self-contained (no closures, no outer
// references). Inside the page it installs window.__NOTSCAPE__ = { apply, reset }.

function notscapeEngine() {
  if (window.__NOTSCAPE__) return;

  var NS = { cfg: {} };
  var observer = null;
  var applying = false;
  var debounce = null;

  function each(sel, fn) {
    try { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); } catch (e) {}
  }
  function place(el, pos) {
    if (!document.body) return;
    if (pos === 'top' && document.body.firstChild) document.body.insertBefore(el, document.body.firstChild);
    else document.body.appendChild(el);
  }
  function deco(id, on, builder, pos) {
    var ex = document.getElementById(id);
    if (on) { if (!ex) { var el = builder(); if (el) place(el, pos); } }
    else if (ex) { ex.remove(); }
  }

  // ---- un-stick fixed/sticky chrome ----
  function unstick(on) {
    if (on) {
      var all = document.body ? document.body.getElementsByTagName('*') : [];
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (el.hasAttribute && el.hasAttribute('data-ns-unstick')) continue;
        var pos;
        try { pos = getComputedStyle(el).position; } catch (e) { continue; }
        if (pos === 'fixed' || pos === 'sticky') el.setAttribute('data-ns-unstick', '1');
      }
    } else {
      each('[data-ns-unstick]', function (el) { el.removeAttribute('data-ns-unstick'); });
    }
  }

  // ---- unlock scroll (defeat leftover scroll-locks from modals/consent walls) ----
  function unlockScroll() {
    var els = [document.documentElement, document.body];
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!el) continue;
      var cs;
      try { cs = getComputedStyle(el); } catch (e) { continue; }
      if (cs.overflow === 'hidden' || cs.overflowY === 'hidden') el.style.setProperty('overflow-y', 'auto', 'important');
      if (cs.position === 'fixed') el.style.setProperty('position', 'static', 'important');
    }
  }

  // ---- blink emphasis ----
  function blink(on) {
    if (on) each('strong,b,em,mark', function (el) { el.classList.add('ns-blink'); });
    else each('.ns-blink', function (el) { el.classList.remove('ns-blink'); });
  }

  // ---- marquee headings (reversible) ----
  function marquee(on) {
    if (on) {
      each('h1,h2', function (h) {
        if (h.getAttribute('data-ns-marquee')) return;
        if (!h.textContent || !h.textContent.trim()) return;
        h.setAttribute('data-ns-marquee', '1');
        var m = document.createElement('marquee');
        m.setAttribute('scrollamount', '5');
        m.setAttribute('behavior', 'scroll');
        while (h.firstChild) m.appendChild(h.firstChild);
        h.appendChild(m);
      });
    } else {
      each('h1[data-ns-marquee],h2[data-ns-marquee]', function (h) {
        var m = h.querySelector('marquee');
        if (m) { while (m.firstChild) h.insertBefore(m.firstChild, m); m.remove(); }
        h.removeAttribute('data-ns-marquee');
      });
    }
  }

  // ---- GeoCities garnish ----
  function buildConstruction() {
    var bar = document.createElement('div');
    bar.id = 'ns-construction';
    bar.setAttribute('data-ns-deco', '1');
    var variants = [
      { css: 'all:revert;display:block;background:#ffcc00;color:#000;border-bottom:3px solid #000;padding:6px 10px;font:bold 14px "Comic Sans MS",cursive;text-align:center',
        html: '🚧 UNDER CONSTRUCTION 🚧 &nbsp; Best viewed in <i>Notscape Navigator</i> at 800&times;600 &nbsp; 🚧' },
      { css: 'all:revert;display:block;background:repeating-linear-gradient(45deg,#ffcc00 0 18px,#111 18px 36px);color:#fff;padding:9px 10px;font:bold 15px Arial,sans-serif;text-align:center;border-top:2px solid #000;border-bottom:2px solid #000',
        html: '<span style="background:#111;padding:3px 12px">👷 THIS PAGE IS UNDER CONSTRUCTION 👷 &nbsp; Pardon our dust!</span>' },
      { css: 'all:revert;display:block;background:#000;color:#00ff00;padding:9px 10px;font:bold 13px "Courier New",monospace;text-align:center;border-bottom:2px solid #00ff00',
        html: '🏗️ * * * CONSTRUCTION ZONE * * * 🏗️<br>This page is still being built &mdash; check back soon!' }
    ];
    var v = variants[Math.floor(Math.random() * variants.length)];
    bar.style.cssText = v.css;
    bar.innerHTML = v.html;
    return bar;
  }
  function buildCounter() {
    var wrap = document.createElement('div');
    wrap.id = 'ns-counter';
    wrap.setAttribute('data-ns-deco', '1');
    wrap.style.cssText = 'all:revert;display:block;text-align:center;padding:14px;background:#000;color:#33ff33;font-family:"Courier New",monospace;border-top:2px solid #33ff33';
    var count = 24600 + Math.floor(Math.random() * 1500);
    var digits = String(count).split('').map(function (d) {
      return '<span style="display:inline-block;background:#111;color:#33ff33;border:1px solid #0a0;padding:2px 5px;margin:0 1px;font-weight:bold">' + d + '</span>';
    }).join('');
    wrap.innerHTML = 'You are visitor number<br><br>' + digits + '<br><br><small>since June 17, 1996</small>';
    return wrap;
  }
  function buildWebring() {
    var d = (NS.cfg && NS.cfg.webringData) || {};
    var prev = d.prev || '#', rnd = d.random || '#', next = d.next || '#';
    var pos = (d.pos != null) ? (' &middot; site ' + d.pos + ' of ' + d.total) : '';
    var w = document.createElement('div');
    w.id = 'ns-webring';
    w.setAttribute('data-ns-deco', '1');
    w.style.cssText = 'all:revert;display:block;text-align:center;padding:12px;background:#000080;color:#fff;font-family:"MS Sans Serif",Tahoma,sans-serif;border-top:3px ridge #88f';
    w.innerHTML = 'Member of the <b>Notscape Webring</b>' + pos + ' &mdash; the best of the indie web<br>' +
      '[ <a href="' + prev + '" style="color:#ffff00">&laquo; Prev</a> &nbsp;|&nbsp; ' +
      '<a href="' + rnd + '" style="color:#ffff00">Random</a> &nbsp;|&nbsp; ' +
      '<a href="' + next + '" style="color:#ffff00">Next &raquo;</a> ]<br>' +
      '<small>A hand-picked ring of personal, non-corporate sites.</small>';
    return w;
  }

  // ---- retro images (pixelate + quantize via canvas; best-effort) ----
  function quantize(data, colors) {
    var levels = colors <= 16 ? 2 : (colors <= 256 ? 4 : 6);
    var step = 255 / (levels - 1);
    for (var i = 0; i < data.length; i += 4) {
      data[i] = Math.round(data[i] / step) * step;
      data[i + 1] = Math.round(data[i + 1] / step) * step;
      data[i + 2] = Math.round(data[i + 2] / step) * step;
    }
  }
  function retroImages(pixelation, depthIdx) {
    var depths = [16, 256, 4096, 16777216];
    var colors = depths[Math.max(0, Math.min(3, depthIdx))] || 256;
    each('img', function (img) {
      if (img.getAttribute('data-ns-img')) return;
      img.setAttribute('data-ns-img', '1');
      var go = function () {
        try {
          var w = img.naturalWidth, h = img.naturalHeight;
          if (!w || !h) return;
          var factor = pixelation > 0 ? Math.max(1, pixelation * 4) : 1;
          var cw = Math.max(1, Math.round(w / factor));
          var chh = Math.max(1, Math.round(h / factor));
          var cv = document.createElement('canvas');
          cv.width = cw; cv.height = chh;
          var cx = cv.getContext('2d');
          cx.imageSmoothingEnabled = false;
          cx.drawImage(img, 0, 0, cw, chh);
          if (colors < 4096) {
            var id = cx.getImageData(0, 0, cw, chh);
            quantize(id.data, colors);
            cx.putImageData(id, 0, 0);
          }
          img.removeAttribute('srcset');
          img.src = cv.toDataURL('image/png'); // throws if cross-origin tainted
          img.style.imageRendering = 'pixelated';
        } catch (e) { /* tainted canvas -> CSS pixelation fallback handles it */ }
      };
      if (img.complete && img.naturalWidth) go();
      else img.addEventListener('load', go, { once: true });
    });
  }

  // ---- per-site flourishes (overlays + sparkle cursor) ----
  function overlay(key, on) {
    var id = 'ns-fx-ovl-' + key;
    var ex = document.getElementById(id);
    if (on) {
      if (!ex && document.body) {
        var d = document.createElement('div');
        d.id = id; d.className = 'ns-fx-' + key; d.setAttribute('data-ns-deco', '1');
        document.body.appendChild(d);
      }
    } else if (ex) { ex.remove(); }
  }
  var cursorHandler = null;
  var cursorKind = null;
  var lastTrail = 0;
  function setCursorTrail(kind) {
    if (kind === cursorKind) return;
    if (cursorHandler) { document.removeEventListener('mousemove', cursorHandler); cursorHandler = null; }
    cursorKind = kind;
    if (!kind) return;
    cursorHandler = function (e) {
      var now = Date.now();
      if (now - lastTrail < 45) return;
      lastTrail = now;
      var el;
      if (kind === 'hearts') { el = document.createElement('span'); el.className = 'ns-fx-heart'; el.textContent = '❤'; }
      else { el = document.createElement('div'); el.className = 'ns-fx-sparkle'; }
      el.setAttribute('data-ns-deco', '1');
      el.style.left = e.clientX + 'px'; el.style.top = e.clientY + 'px';
      (document.body || document.documentElement).appendChild(el);
      setTimeout(function () { el.remove(); }, 900);
    };
    document.addEventListener('mousemove', cursorHandler, { passive: true });
  }
  // waving title text — wrap each heading letter in an animated span
  function wave(on) {
    if (!on) return;
    each('h1,h2,h3', function (h) {
      if (h.getAttribute('data-ns-wave') || h.getAttribute('data-ns-marquee')) return;
      var text = h.textContent;
      if (!text || !text.trim()) return;
      h.setAttribute('data-ns-wave', '1');
      h.textContent = '';
      for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        var s = document.createElement('span');
        s.textContent = ch;
        s.style.display = 'inline-block';
        if (ch === ' ') s.style.width = '0.3em';
        s.style.animation = 'ns-wave 1.3s ease-in-out infinite';
        s.style.animationDelay = (i * 0.07).toFixed(2) + 's';
        h.appendChild(s);
      }
    });
  }

  // Calm headlines — de-shout ALL-CAPS headings (CSS lowercases; ::first-letter re-caps)
  function calmHeadlines(on) {
    if (!on) return;
    each('h1,h2,h3,h4', function (h) {
      if (h.getAttribute('data-ns-calm')) return;
      var t = (h.textContent || '').trim();
      var letters = t.replace(/[^A-Za-z]/g, '');
      if (letters.length < 6) return;
      var upper = t.replace(/[^A-Z]/g, '').length;
      if (upper / letters.length > 0.7) h.setAttribute('data-ns-calm', '1');
    });
  }

  // Scroll breather — a gentle "take a breath" after a long continuous scroll
  var breatherOn = false, scrollAccum = 0, lastY = 0;
  function onBreatherScroll() {
    var y = window.scrollY || window.pageYOffset || 0;
    scrollAccum += Math.abs(y - lastY); lastY = y;
    if (scrollAccum > 9000 && !document.getElementById('ns-breather')) showBreather();
  }
  function showBreather() {
    scrollAccum = 0;
    if (!document.body) return;
    var b = document.createElement('div');
    b.id = 'ns-breather'; b.setAttribute('data-ns-deco', '1');
    b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483600;background:#0a3d2e;color:#d6f5e6;text-align:center;padding:14px;font-family:Georgia,serif;font-size:16px;box-shadow:0 -2px 12px rgba(0,0,0,.45)';
    b.appendChild(document.createTextNode('🌿  You’ve been scrolling a while — take a breath.  '));
    var btn = document.createElement('button');
    btn.textContent = 'Keep going';
    btn.style.cssText = 'margin-left:8px;padding:3px 12px;font-family:inherit;cursor:pointer';
    btn.addEventListener('click', function () { b.remove(); });
    b.appendChild(btn);
    document.body.appendChild(b);
  }
  function setBreather(on) {
    if (on && !breatherOn) { breatherOn = true; lastY = window.scrollY || 0; window.addEventListener('scroll', onBreatherScroll, { passive: true }); }
    else if (!on && breatherOn) { breatherOn = false; window.removeEventListener('scroll', onBreatherScroll); }
  }

  // Click-to-load large images (slow-connection style) — small graphics are spared
  function lazyImages(on) {
    if (!on) return;
    each('img', function (img) {
      if (img.getAttribute('data-ns-lazy') || img.getAttribute('data-ns-img')) return;
      var src = img.getAttribute('src') || '';
      if (!src || /^data:/.test(src)) return;
      var w = parseInt(img.getAttribute('width') || '0', 10) || img.naturalWidth || 0;
      var h = parseInt(img.getAttribute('height') || '0', 10) || img.naturalHeight || 0;
      if (w && h && w < 150 && h < 150) return; // small icon/graphic — leave alone
      img.setAttribute('data-ns-lazy', '1');
      var ph = document.createElement('span');
      ph.setAttribute('data-ns-deco', '1');
      var ww = w ? Math.min(w, 480) + 'px' : 'auto';
      var hh = h ? Math.min(h, 360) + 'px' : 'auto';
      ph.style.cssText = 'display:inline-flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;' +
        'width:' + ww + ';height:' + hh + ';min-width:120px;min-height:54px;padding:8px;box-sizing:border-box;' +
        'border:2px inset #c0c0c0;background:#e8e8e8;color:#333;font:12px "MS Sans Serif",Tahoma,sans-serif;cursor:pointer;vertical-align:middle';
      var alt = (img.getAttribute('alt') || '').slice(0, 90).replace(/[<>&]/g, '');
      ph.innerHTML = '🖼 <u>Load image</u>' + (alt ? '<br><span style="color:#666">' + alt + '</span>' : '');
      img.removeAttribute('srcset');
      img.setAttribute('data-ns-src', src);
      img.removeAttribute('src'); // cancel the download until requested
      img.style.display = 'none';
      if (img.parentNode) img.parentNode.insertBefore(ph, img);
      ph.addEventListener('click', function () {
        img.setAttribute('src', img.getAttribute('data-ns-src') || '');
        img.style.display = '';
        ph.remove();
      });
    });
  }

  // Cookie/consent walls — click "reject / necessary only" where we recognize it
  function killCookieBanners(on) {
    if (!on) return;
    var rejectSels = [
      '#onetrust-reject-all-handler', '.ot-pc-refuse-all-handler',
      '#CybotCookiebotDialogBodyButtonDecline', '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll',
      '#didomi-notice-disagree-button', '.didomi-continue-without-agreeing',
      '[data-testid="uc-deny-all-button"]', '[data-testid="reject-all-button"]',
      'button[aria-label="Reject all" i]', 'button[aria-label="Decline" i]',
      '.qc-cmp2-summary-buttons button[mode="secondary"]'
    ];
    for (var i = 0; i < rejectSels.length; i++) {
      var b = null; try { b = document.querySelector(rejectSels[i]); } catch (e) {}
      if (b) { try { b.click(); } catch (e) {} break; }
    }
  }

  // Enforce readability — fix text whose contrast with its background is too low
  function parseColor(str) {
    if (!str) return null;
    var m = str.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var p = m[1].split(',');
    return { r: parseFloat(p[0]), g: parseFloat(p[1]), b: parseFloat(p[2]), a: p.length > 3 ? parseFloat(p[3]) : 1 };
  }
  function lum(c) {
    var a = [c.r, c.g, c.b].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function contrastRatio(c1, c2) {
    var l1 = lum(c1), l2 = lum(c2), hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }
  function effBg(el) {
    var node = el;
    while (node && node.nodeType === 1) {
      var c = null; try { c = parseColor(getComputedStyle(node).backgroundColor); } catch (e) {}
      if (c && c.a > 0.1) return c;
      node = node.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  }
  function forceReadable(on) {
    if (!on) return;
    var els;
    try { els = document.querySelectorAll('p,li,a,span,h1,h2,h3,h4,h5,h6,td,th,dd,dt,label,blockquote,strong,em,b,i,small,figcaption,button'); }
    catch (e) { return; }
    var n = Math.min(els.length, 3000);
    for (var i = 0; i < n; i++) {
      var el = els[i];
      if (el.getAttribute('data-ns-read')) continue;
      el.setAttribute('data-ns-read', '1');
      if (!el.textContent || !el.textContent.trim()) continue;
      var cs; try { cs = getComputedStyle(el); } catch (e) { continue; }
      var color = parseColor(cs.color);
      if (!color || color.a < 0.1) continue;
      var bg = effBg(el);
      if (contrastRatio(color, bg) < 3.5) {
        el.style.setProperty('color', lum(bg) > 0.4 ? '#111' : '#f0f0f0', 'important');
      }
    }
  }

  function applyFlourishes(list) {
    list = list || [];
    var has = function (k) { return list.indexOf(k) > -1; };
    overlay('starfield', has('starfield'));
    overlay('snow', has('snow'));
    overlay('scanlines', has('scanlines'));
    overlay('bubbles', has('bubbles'));
    overlay('vignette', has('vignette'));
    overlay('lasergrid', has('lasergrid'));
    overlay('plasma', has('plasma'));
    overlay('fog', has('fog'));
    overlay('confetti', has('confetti'));
    overlay('fireflies', has('fireflies'));
    overlay('coderain', has('coderain'));
    setCursorTrail(has('hearts') ? 'hearts' : (has('heartcursor') ? 'hearts' : (has('sparkles') ? 'sparkles' : null)));
    wave(has('wave'));
  }

  function buildGuestbook() {
    var w = document.createElement('div');
    w.id = 'ns-guestbook'; w.setAttribute('data-ns-deco', '1');
    w.style.cssText = 'all:revert;display:block;text-align:center;padding:12px;background:#330033;color:#ff99ff;font-family:"Comic Sans MS",cursive;border-top:3px ridge #f9f';
    w.innerHTML = '📖 <b>Please sign my guestbook!</b> 📖<br>' +
      '<a href="#" style="color:#ffff66">[ View Guestbook ]</a> &nbsp; <a href="#" style="color:#ffff66">[ Sign Guestbook ]</a>';
    return w;
  }
  function buildBestViewed() {
    var w = document.createElement('div');
    w.id = 'ns-bestviewed'; w.setAttribute('data-ns-deco', '1');
    w.style.cssText = 'all:revert;display:block;text-align:center;padding:12px;background:#000;color:#0f0;font-family:"Courier New",monospace;border-top:2px solid #0f0';
    var btn = 'display:inline-block;width:88px;height:31px;line-height:10px;font-size:9px;margin:3px;padding:3px;border:1px outset #888;background:#222;color:#0f0;font-family:Arial,sans-serif;text-align:center;vertical-align:middle';
    w.innerHTML =
      '<span style="' + btn + '">Best viewed in<br><b>NOTSCAPE</b><br>800x600</span>' +
      '<span style="' + btn + ';background:#001a44;color:#9cf">Get<br><b>NOTSCAPE</b><br>Now!</span>' +
      '<span style="' + btn + ';background:#330000;color:#fc9">Made with a<br><b>TEXT</b><br>EDITOR</span>';
    return w;
  }
  function buildAwards() {
    var w = document.createElement('div');
    w.id = 'ns-awards'; w.setAttribute('data-ns-deco', '1');
    w.style.cssText = 'all:revert;display:block;text-align:center;padding:12px;background:#202060;color:#fff;font-family:"MS Sans Serif",Tahoma,sans-serif;border-top:3px ridge #88f';
    var badge = 'display:inline-block;margin:3px;padding:6px 10px;border:2px outset #ccc;font-weight:bold;font-size:11px;vertical-align:middle';
    w.innerHTML = '<b>This site has won:</b><br>' +
      '<span style="' + badge + ';background:#ffd700;color:#603">★ COOL SITE<br>OF THE DAY ★</span>' +
      '<span style="' + badge + ';background:#c0c0c0;color:#006">🏅 TOP 100<br>WEB SITES</span>' +
      '<span style="' + badge + ';background:#ffb6c1;color:#600">💎 EDITOR\'S<br>PICK AWARD</span>';
    return w;
  }
  function buildEmailMe() {
    var w = document.createElement('div');
    w.id = 'ns-emailme'; w.setAttribute('data-ns-deco', '1');
    w.style.cssText = 'all:revert;display:block;text-align:center;padding:12px;background:#ffffcc;color:#000;font-family:"Comic Sans MS",cursive;border-top:2px dashed #c90';
    w.innerHTML = '<span class="ns-blink">✉</span> <b>Questions? Comments?</b> ' +
      '<a href="mailto:webmaster@notscape.example" style="color:#0000ee">Email the Webmaster!</a> ' +
      '<span class="ns-blink">✉</span>';
    return w;
  }
  function buildMidi() {
    var w = document.createElement('div');
    w.id = 'ns-midi'; w.setAttribute('data-ns-deco', '1');
    w.style.cssText = 'all:revert;display:block;text-align:center;padding:6px 10px;background:#000;color:#0ff;font-family:"Courier New",monospace;font-size:12px;border-bottom:1px solid #0ff';
    w.innerHTML = '♪♫ MIDI music now playing &mdash; please adjust your speakers ♫♪';
    return w;
  }

  function runDynamic() {
    var c = NS.cfg;
    if (c.killSticky) unstick(true);
    unlockScroll();
    if (c.killCookieBanners) killCookieBanners(true);
    if (c.lazyImages) lazyImages(true);
    if (c.forceReadable) forceReadable(true);
    if (c.blink) blink(true);
    if (c.calmMode) calmHeadlines(true);
    if (c.marquee) marquee(true);
    if (c.dither) retroImages(c.pixelation || 0, c.colorDepth != null ? c.colorDepth : 1);
    deco('ns-construction', !!c.construction, buildConstruction, 'top');
    deco('ns-counter', !!c.hitCounter, buildCounter, 'bottom');
    deco('ns-webring', !!c.webring, buildWebring, 'bottom');
    deco('ns-guestbook', !!c.guestbook, buildGuestbook, 'bottom');
    deco('ns-bestviewed', !!c.bestviewed, buildBestViewed, 'bottom');
    deco('ns-awards', !!c.awards, buildAwards, 'bottom');
    deco('ns-emailme', !!c.emailme, buildEmailMe, 'bottom');
    deco('ns-midi', !!c.midi, buildMidi, 'top');
    applyFlourishes(c.flourishes);
  }

  function ensureObserver() {
    if (observer) return;
    observer = new MutationObserver(function () {
      if (applying || debounce) return;
      debounce = setTimeout(function () {
        debounce = null;
        applying = true;
        try { runDynamic(); } catch (e) {}
        applying = false;
      }, 400);
    });
    try {
      observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
    } catch (e) {}
  }

  NS.apply = function (config) {
    NS.cfg = config || {};
    applying = true;
    try {
      // honor toggles that can be turned OFF without a reload
      unstick(!!NS.cfg.killSticky);
      unlockScroll();
      blink(!!NS.cfg.blink);
      marquee(!!NS.cfg.marquee);
      deco('ns-construction', !!NS.cfg.construction, buildConstruction, 'top');
      deco('ns-counter', !!NS.cfg.hitCounter, buildCounter, 'bottom');
      deco('ns-webring', !!NS.cfg.webring, buildWebring, 'bottom');
      deco('ns-guestbook', !!NS.cfg.guestbook, buildGuestbook, 'bottom');
      deco('ns-bestviewed', !!NS.cfg.bestviewed, buildBestViewed, 'bottom');
      deco('ns-awards', !!NS.cfg.awards, buildAwards, 'bottom');
      deco('ns-emailme', !!NS.cfg.emailme, buildEmailMe, 'bottom');
      deco('ns-midi', !!NS.cfg.midi, buildMidi, 'top');
      if (NS.cfg.dither) retroImages(NS.cfg.pixelation || 0, NS.cfg.colorDepth != null ? NS.cfg.colorDepth : 1);
      calmHeadlines(!!NS.cfg.calmMode);
      setBreather(!!NS.cfg.scrollBreather);
      killCookieBanners(!!NS.cfg.killCookieBanners);
      lazyImages(!!NS.cfg.lazyImages);
      forceReadable(!!NS.cfg.forceReadable);
      applyFlourishes(NS.cfg.flourishes);
    } catch (e) {}
    applying = false;
    ensureObserver();
  };

  NS.reset = function () {
    applying = true;
    try {
      each('[data-ns-deco]', function (el) { el.remove(); });
      unstick(false);
      blink(false);
      marquee(false);
      setCursorTrail(null);
      setBreather(false);
    } catch (e) {}
    applying = false;
  };

  window.__NOTSCAPE__ = NS;
}

// expose for the renderer to stringify
if (typeof window !== 'undefined') window.notscapeEngine = notscapeEngine;
