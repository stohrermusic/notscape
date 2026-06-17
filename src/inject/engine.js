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
    bar.style.cssText = 'all:revert;display:block;background:#ffcc00;color:#000;border-bottom:3px solid #000;padding:6px 10px;font:bold 14px "Comic Sans MS",cursive;text-align:center';
    bar.innerHTML = '🚧 UNDER CONSTRUCTION 🚧 &nbsp; Best viewed in <i>Notscape Navigator</i> at 800&times;600 &nbsp; 🚧';
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
    var w = document.createElement('div');
    w.id = 'ns-webring';
    w.setAttribute('data-ns-deco', '1');
    w.style.cssText = 'all:revert;display:block;text-align:center;padding:12px;background:#000080;color:#fff;font-family:"MS Sans Serif",Tahoma,sans-serif;border-top:3px ridge #88f';
    w.innerHTML = 'This site is a proud member of the <b>Old Web Webring</b><br>' +
      '[ <a href="#" style="color:#ffff00">&laquo; Prev</a> &nbsp;|&nbsp; ' +
      '<a href="#" style="color:#ffff00">Random</a> &nbsp;|&nbsp; ' +
      '<a href="#" style="color:#ffff00">Next &raquo;</a> ]<br>' +
      '<small>Want to join? Sign the guestbook!</small>';
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

  function runDynamic() {
    var c = NS.cfg;
    if (c.killSticky) unstick(true);
    if (c.blink) blink(true);
    if (c.marquee) marquee(true);
    if (c.dither) retroImages(c.pixelation || 0, c.colorDepth != null ? c.colorDepth : 1);
    deco('ns-construction', !!c.construction, buildConstruction, 'top');
    deco('ns-counter', !!c.hitCounter, buildCounter, 'bottom');
    deco('ns-webring', !!c.webring, buildWebring, 'bottom');
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
      blink(!!NS.cfg.blink);
      marquee(!!NS.cfg.marquee);
      deco('ns-construction', !!NS.cfg.construction, buildConstruction, 'top');
      deco('ns-counter', !!NS.cfg.hitCounter, buildCounter, 'bottom');
      deco('ns-webring', !!NS.cfg.webring, buildWebring, 'bottom');
      if (NS.cfg.dither) retroImages(NS.cfg.pixelation || 0, NS.cfg.colorDepth != null ? NS.cfg.colorDepth : 1);
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
    } catch (e) {}
    applying = false;
  };

  window.__NOTSCAPE__ = NS;
}

// expose for the renderer to stringify
if (typeof window !== 'undefined') window.notscapeEngine = notscapeEngine;
