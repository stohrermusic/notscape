// styles.js  (runs in the RENDERER)
// Builds the global "make it 1996" stylesheet from the Mods config, plus a
// registry of per-site skins. The resulting string is pushed into the <webview>
// via webview.insertCSS(), which bypasses the page's Content-Security-Policy.

(function () {
  // A tiny tiled starfield, inlined so we ship no binary assets.
  const STARFIELD =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E" +
    "%3Crect width='64' height='64' fill='%23000018'/%3E" +
    "%3Ccircle cx='8' cy='12' r='1' fill='white'/%3E" +
    "%3Ccircle cx='40' cy='6' r='1' fill='%23aaccff'/%3E" +
    "%3Ccircle cx='54' cy='30' r='1.2' fill='white'/%3E" +
    "%3Ccircle cx='20' cy='44' r='1' fill='%23ffffaa'/%3E" +
    "%3Ccircle cx='32' cy='54' r='1' fill='white'/%3E" +
    "%3Ccircle cx='58' cy='52' r='1' fill='white'/%3E%3C/svg%3E";

  // A LIGHT tiled "wallpaper" (pale-blue clouds) — keeps dark site text readable,
  // unlike a dark starfield which hides behind opaque content panels.
  const TILE_LIGHT =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E" +
    "%3Crect width='60' height='60' fill='%23b8d0ef'/%3E" +
    "%3Ccircle cx='12' cy='14' r='3.5' fill='%237ba0d6'/%3E" +
    "%3Ccircle cx='42' cy='9' r='2.5' fill='white'/%3E" +
    "%3Ccircle cx='51' cy='34' r='3.5' fill='%237ba0d6'/%3E" +
    "%3Ccircle cx='23' cy='45' r='2.5' fill='white'/%3E" +
    "%3Ccircle cx='34' cy='55' r='3' fill='%237ba0d6'/%3E" +
    "%3Ccircle cx='5' cy='40' r='2' fill='white'/%3E" +
    "%3Ccircle cx='57' cy='55' r='2' fill='%237ba0d6'/%3E%3C/svg%3E";

  const COLOR_DEPTHS = [16, 256, 4096, 16777216];

  function clamp01(n) { return Math.max(0, Math.min(1, n)); }

  function globalCSS(c) {
    const css = [];

    // Always-available helpers (cheap, harmless when unused)
    css.push('.ns-blink{animation:ns-blink 1.1s steps(1,end) infinite!important}');
    css.push('@keyframes ns-blink{50%{visibility:hidden}}');
    css.push('[data-ns-unstick]{position:static!important;top:auto!important;bottom:auto!important}');

    // VINTAGE slider — a continuous "aging" filter on the whole document.
    const age = (c.age || 0) / 100;
    if (age > 0.01) {
      const sepia = (age * 0.4).toFixed(3);
      const contrast = (1 + age * 0.15).toFixed(3);
      const sat = (1 - age * 0.28).toFixed(3);
      css.push(`html{filter:sepia(${sepia}) contrast(${contrast}) saturate(${sat})!important}`);
    }

    if (c.oldFonts) {
      css.push("body,body *{font-family:'Times New Roman',Times,Georgia,serif!important;-webkit-font-smoothing:none!important;text-rendering:optimizeSpeed!important}");
      css.push("code,pre,kbd,tt,samp,xmp{font-family:'Courier New',Courier,monospace!important}");
    }
    if (c.comicSans) {
      css.push("body,body *{font-family:'Comic Sans MS','Comic Sans',cursive!important}");
    }
    if (c.flatten) {
      css.push('*{border-radius:0!important;box-shadow:none!important;text-shadow:none!important}');
    }
    if (c.retroLinks) {
      css.push('a,a:link{color:#0000ee!important;text-decoration:underline!important}');
      css.push('a:visited{color:#551a8b!important}');
      css.push('a:active{color:#ff0000!important}');
    }
    if (c.grayBg) {
      css.push('html,body{background:#c0c0c0!important;background-image:none!important;color:#000!important}');
    }
    if (c.tiledBg) {
      // Light wallpaper only on the page backdrop — do NOT force a text color,
      // so each element keeps its own (usually dark, readable) contrast.
      css.push(`html,body{background-image:url("${TILE_LIGHT}")!important;background-color:#b8d0ef!important;background-attachment:fixed!important}`);
    }
    if (c.beveled) {
      css.push("button,input[type=button],input[type=submit],input[type=reset],select{border:2px outset #c0c0c0!important;border-radius:0!important;background:#c0c0c0!important;color:#000!important;box-shadow:none!important;padding:2px 8px!important;text-shadow:none!important}");
      css.push("input[type=text],input[type=search],input[type=email],input[type=url],input[type=password],textarea{border:2px inset #c0c0c0!important;border-radius:0!important;background:#fff!important;box-shadow:none!important}");
      css.push('table{border-collapse:collapse!important}td,th{border:1px solid #808080!important}');
    }
    if (c.dither) {
      const px = c.pixelation || 0;
      css.push('img{image-rendering:pixelated!important}');
      if (px > 0) {
        const ct = (1 + px * 0.04).toFixed(2);
        css.push(`img{filter:contrast(${ct}) saturate(0.85)!important}`);
      }
    }
    if (c.retroMedia) {
      // RealPlayer / old-QuickTime style frame + gray control panel
      css.push('video,audio{border:3px outset #c0c0c0!important;background:#000!important;border-radius:0!important;box-shadow:none!important;padding:3px!important;box-sizing:border-box!important}');
      css.push('video::-webkit-media-controls-panel,audio::-webkit-media-controls-panel{background:linear-gradient(#d4d0c8,#9a9a9a)!important}');
      css.push('video::-webkit-media-controls-enclosure,audio::-webkit-media-controls-enclosure{border-radius:0!important;background:#c0c0c0!important}');
    }

    return css.join('\n');
  }

  // -------------------------------------------------------------------------
  // PER-SITE SKINS — applied after the global pass so they win on conflicts.
  // Each skin: { name, test(host), css() }
  // -------------------------------------------------------------------------
  // Winamp / MusicMatch Jukebox look for streaming music apps (best-effort recolor)
  function winampCSS(label) {
    return `
      html,body{background:#0a0a0a!important;color:#00ff66!important;background-image:none!important}
      html body,html body *{font-family:'Lucida Console','Courier New',monospace!important}
      *{color:#00ff66!important;background-color:transparent!important;border-radius:0!important;
        box-shadow:none!important;text-shadow:none!important}
      [data-ns-unstick]{position:revert!important;top:revert!important;bottom:revert!important}
      a,a:link{color:#66ffcc!important;text-decoration:none!important}
      img{border:1px solid #2a2a2a!important;filter:contrast(1.1) saturate(1.15)!important}
      button,[role=button]{background:linear-gradient(#3a3a3a,#222)!important;color:#00ff66!important;
        border:2px outset #555!important;border-radius:0!important}
      input[type=range],[role=slider]{accent-color:#00ff66!important}
      h1,h2,h3{color:#aaff00!important}
      body::before{
        content:"\\25B6  N O T S C A P E   A M P     ${label}.MP3  [stereo]  128kbps  44khz     |<  <  ||  >  >|";
        display:block!important;white-space:pre!important;pointer-events:none!important;
        background:linear-gradient(#3a3a3a,#161616)!important;color:#00ff66!important;
        font-family:'Lucida Console',monospace!important;font-size:12px!important;letter-spacing:1px!important;
        padding:6px 10px!important;border-bottom:2px solid #00ff66!important}
    `;
  }

  const SKINS = [
    {
      name: 'Reddit BBS',
      test: (h) => /(^|\.)reddit\.com$/.test(h),
      css: () => `
        html,body{background:#000!important;color:#33ff33!important;background-image:none!important}
        html body,html body *{font-family:'Courier New','Lucida Console',monospace!important}
        *{color:#33ff33!important;background-color:transparent!important;border-radius:0!important;
          box-shadow:none!important;text-shadow:none!important}
        a,a:link{color:#55ddff!important;text-decoration:underline!important}
        a:visited{color:#cc88ff!important}
        img,svg,video,picture,[role=img],[aria-label*="avatar" i]{display:none!important}
        shreddit-post,article,.thing,[data-testid="post-container"]{
          border:1px solid #1f7a1f!important;padding:6px!important;margin:6px 8px!important;background:#020!important}
        h1,h2,h3{color:#aaff00!important;text-transform:uppercase!important}
        button,[role=button]{border:1px solid #33ff33!important;padding:1px 6px!important}
        body::before{
          content:"+========================================================+\\A| NOTSCAPE B.B.S.  v2.4    --- The Front Page ---  [LIVE] |\\A| (r)ead  (p)ost  (m)ail  (g)oodbye      300/1200/2400 baud|\\A+========================================================+";
          white-space:pre!important;display:block!important;color:#33ff33!important;
          font-family:'Courier New',monospace!important;font-size:12px!important;line-height:1.25!important;
          padding:10px!important;border-bottom:2px solid #33ff33!important;background:#000!important;
          pointer-events:none!important}
      `
    },
    {
      name: 'NYT 1995 Broadsheet',
      test: (h) => /(^|\.)nytimes\.com$/.test(h),
      css: () => `
        html,body{background:#fdfcf6!important;color:#111!important;background-image:none!important}
        *{font-family:'Times New Roman',Times,Georgia,serif!important;box-shadow:none!important;
          border-radius:0!important;text-shadow:none!important}
        a,a:link{color:#00339a!important;text-decoration:underline!important}
        a:visited{color:#551a8b!important}
        img{filter:grayscale(1) contrast(1.15)!important;border:1px solid #000!important}
        h1,h2,h3{font-weight:bold!important;color:#000!important}
        article,section{border-top:1px solid #999!important;padding-top:8px!important}
        body::before{
          content:"The New York Times";
          display:block!important;text-align:center!important;font-size:46px!important;
          font-family:'Old English Text MT','Times New Roman',serif!important;font-weight:bold!important;
          letter-spacing:1px!important;border-bottom:4px double #000!important;padding:12px 0 4px!important;
          color:#000!important;background:#fdfcf6!important;pointer-events:none!important}
      `
    },
    {
      name: 'Notscape Mail (terminal)',
      test: (h) => /(^|\.)mail\.google\.com$/.test(h) || /(^|\.)gmail\.com$/.test(h),
      css: () => `
        html,body{background:#001400!important;color:#33ff33!important;background-image:none!important}
        html body,html body *{font-family:'Courier New','Lucida Console',monospace!important}
        *{color:#33ff33!important;background-color:transparent!important;border-radius:0!important;
          box-shadow:none!important;text-shadow:none!important;border-color:#1f7a1f!important}
        a,a:link{color:#66ffff!important;text-decoration:underline!important}
        img,svg{opacity:.35!important;filter:grayscale(1)!important}
        tr:hover,[role=row]:hover{background:#003300!important}
        body::before{
          content:"NOTSCAPE MAIL 1.0  --  PINE-style reader   ? Help   m Compose   q Quit";
          display:block!important;white-space:pre!important;background:#003300!important;color:#aaffaa!important;
          font-family:'Courier New',monospace!important;padding:6px 10px!important;
          border-bottom:1px solid #33ff33!important;pointer-events:none!important}
      `
    },
    {
      // YouTube circa 2005-2006: white, Verdana, blue links, "Broadcast Yourself"
      name: 'YouTube 2006',
      test: (h) => /(^|\.)youtube\.com$/.test(h) && !/(^|\.)music\.youtube\.com$/.test(h),
      css: () => `
        html,body{background:#ffffff!important;color:#000!important;background-image:none!important}
        html body,html body *{font-family:Verdana,Arial,Helvetica,sans-serif!important}
        *{text-shadow:none!important}
        a,a:link{color:#0000cc!important;text-decoration:underline!important}
        a:visited{color:#551a8b!important}
        h1,h2,h3{color:#000!important;font-weight:bold!important}
        img{border:1px solid #b0b0b0!important;image-rendering:auto!important;filter:none!important}
        button,[role=button],input[type=button],input[type=submit]{
          background:#eef3fb!important;border:1px solid #9bc3e8!important;color:#0033aa!important;border-radius:0!important}
        ytd-app,#content,#page-manager{background:#fff!important}
        /* keep YouTube's own (un)sticky layout so the search box + menus stay clickable */
        [data-ns-unstick]{position:revert!important;top:revert!important;bottom:revert!important}
        /* leave the video player + its controls alone (our bevel/frame mangles them) */
        video{border:0!important;padding:0!important;background:transparent!important}
        .html5-video-player .ytp-button,.ytp-chrome-bottom .ytp-button,button.ytp-button{
          border:0!important;background:transparent!important;box-shadow:none!important;border-radius:0!important;
          width:auto!important;height:auto!important;padding:0!important}
        .ytp-chrome-bottom,.ytp-chrome-controls,.ytp-progress-bar-container,.ytp-gradient-bottom{
          border:0!important;background:none!important;box-shadow:none!important}
        body::before{
          content:""!important;display:block!important;height:60px!important;pointer-events:none!important;
          background:#ffffff url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='300'%20height='64'%3E%3Ctext%20x='2'%20y='46'%20font-family='Arial,Helvetica,sans-serif'%20font-size='42'%20font-weight='bold'%20fill='%23000000'%3EYou%3C/text%3E%3Crect%20x='86'%20y='10'%20rx='9'%20ry='9'%20width='118'%20height='44'%20fill='%23cc181e'/%3E%3Ctext%20x='96'%20y='46'%20font-family='Arial,Helvetica,sans-serif'%20font-size='42'%20font-weight='bold'%20fill='%23ffffff'%3ETube%3C/text%3E%3Ctext%20x='212'%20y='28'%20font-family='Arial'%20font-size='11'%20fill='%23999999'%3EBroadcast%3C/text%3E%3Ctext%20x='212'%20y='42'%20font-family='Arial'%20font-size='11'%20fill='%23999999'%3EYourself%E2%84%A2%3C/text%3E%3C/svg%3E") no-repeat 14px center!important;
          background-size:auto 40px!important;border-bottom:3px solid #9bc3e8!important}
      `
    },
    {
      // Facebook reborn as MySpace (~2006): white/blue, Verdana, "a place for friends"
      name: 'Facebook as MySpace',
      test: (h) => /(^|\.)facebook\.com$/.test(h) || /(^|\.)fb\.com$/.test(h),
      css: () => `
        html,body{background:#fff!important;color:#000!important;background-image:none!important;font-size:12px!important}
        html body,html body *{font-family:Verdana,Tahoma,Arial,sans-serif!important}
        *{text-shadow:none!important;border-radius:0!important;box-shadow:none!important}
        [data-ns-unstick]{position:revert!important;top:revert!important;bottom:revert!important}
        a,a:link{color:#003399!important;text-decoration:underline!important}
        a:visited{color:#551a8b!important}
        h1,h2,h3,[role=heading]{background:#6699cc!important;color:#fff!important;padding:2px 8px!important;
          font-weight:bold!important;font-size:13px!important;border:1px solid #336699!important}
        img{border:1px solid #99a!important}
        button,[role=button]{background:#6699cc!important;color:#fff!important;border:1px solid #336699!important}
        body::before{
          content:"myspace.com   \\00B7   a place for friends"!important;
          display:block!important;pointer-events:none!important;
          background:linear-gradient(#5a7bbf,#2b4d8e)!important;color:#fff!important;
          font-family:Arial,Helvetica,sans-serif!important;font-size:24px!important;font-weight:bold!important;
          letter-spacing:.5px!important;padding:10px 14px!important;border-bottom:3px solid #ff9900!important}
        body::after{
          content:"\\2665 Tom is your #1 friend \\2665   \\2014   a place for friends"!important;
          display:block!important;pointer-events:none!important;background:#003399!important;color:#fff!important;
          text-align:center!important;padding:8px!important;font-family:Verdana,sans-serif!important;font-size:12px!important}
      `
    },
    {
      name: 'Winamp (Spotify)',
      test: (h) => /(^|\.)spotify\.com$/.test(h),
      css: () => winampCSS('SPOTIFY')
    },
    {
      name: 'Winamp (YouTube Music)',
      test: (h) => /(^|\.)music\.youtube\.com$/.test(h),
      css: () => winampCSS('YTMUSIC')
    },
    {
      // Google search circa 1998 — white, plain, colorful wordmark
      name: 'Google 1998',
      test: (h) => /(^|\.)google\.com$/.test(h) &&
        !/(^|\.)(mail|docs|drive|meet|photos|news|maps|play|cloud)\.google\.com$/.test(h),
      css: () => `
        html,body{background:#fff!important;color:#000!important;background-image:none!important}
        html body,html body *{font-family:Arial,Helvetica,sans-serif!important}
        *{text-shadow:none!important;box-shadow:none!important;border-radius:0!important}
        a,a:link{color:#0000cc!important;text-decoration:underline!important}
        a:visited{color:#551a8b!important}
        img{filter:none!important;image-rendering:auto!important}
        input[type=text],input[type=search],textarea{border:1px solid #7e9bce!important;border-radius:0!important;background:#fff!important}
        body::before{
          content:""!important;display:block!important;height:58px!important;pointer-events:none!important;
          background:#fff url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='240'%20height='60'%3E%3Ctext%20font-family='Arial,Helvetica,sans-serif'%20font-size='44'%20font-weight='bold'%20y='45'%3E%3Ctspan%20x='8'%20fill='%233366cc'%3EG%3C/tspan%3E%3Ctspan%20fill='%23dd0000'%3Eo%3C/tspan%3E%3Ctspan%20fill='%23ffcc00'%3Eo%3C/tspan%3E%3Ctspan%20fill='%233366cc'%3Eg%3C/tspan%3E%3Ctspan%20fill='%23109618'%3El%3C/tspan%3E%3Ctspan%20fill='%23dd0000'%3Ee%3C/tspan%3E%3C/text%3E%3C/svg%3E") no-repeat center 10px!important;
          background-size:auto 34px!important;border-bottom:1px solid #e5e5e5!important}
      `
    },
    {
      name: 'Wikipedia as Encarta',
      test: (h) => /(^|\.)wikipedia\.org$/.test(h),
      css: () => `
        html,body{background:#e8eef7!important;color:#000!important;background-image:none!important}
        html body,html body *{font-family:'Times New Roman',Georgia,serif!important}
        a,a:link{color:#0033aa!important;text-decoration:underline!important}
        a:visited{color:#551a8b!important}
        #content,.mw-body,main,#mw-content-text{background:#fff!important;border:2px solid #99a!important}
        h1,h2,h3{font-family:Georgia,'Times New Roman',serif!important;color:#002080!important;border-bottom:1px solid #99a!important}
        img{border:1px solid #88a!important}
        body::before{
          content:"📚 Notscape Encarta  ·  Multimedia Encyclopedia '96"!important;display:block!important;pointer-events:none!important;
          background:linear-gradient(#3a5fa0,#1a2f60)!important;color:#fff!important;font-family:Georgia,serif!important;
          font-size:22px!important;font-weight:bold!important;padding:10px 14px!important;border-bottom:3px solid #ffcc00!important}
      `
    },
    {
      name: 'X as Guestbook',
      test: (h) => /(^|\.)twitter\.com$/.test(h) || /(^|\.)x\.com$/.test(h),
      css: () => `
        html,body{background:#ffffe8!important;color:#000!important;background-image:none!important}
        html body,html body *{font-family:'Comic Sans MS','Trebuchet MS',cursive!important}
        [data-ns-unstick]{position:revert!important;top:revert!important;bottom:revert!important}
        a,a:link{color:#cc0066!important;text-decoration:underline!important}
        article,[data-testid=tweet]{border:2px ridge #f9c!important;background:#fff0f8!important;margin:6px!important;padding:6px!important}
        img{border:2px solid #f9c!important}
        body::before{content:"✿ Welcome to my Guestbook! ✿  Please sign below! ✿"!important;display:block!important;pointer-events:none!important;
          background:#ff66aa!important;color:#fff!important;font-weight:bold!important;text-align:center!important;
          font-family:"Comic Sans MS",cursive!important;padding:10px!important;border-bottom:3px dotted #fff!important}
      `
    }
  ];

  function skinFor(host) {
    if (!host) return null;
    return SKINS.find((s) => { try { return s.test(host); } catch (_) { return false; } }) || null;
  }

  function buildNotscapeCSS(config, host) {
    if (!config || !config.enabled) return '';
    let css = globalCSS(config);
    if (config.siteSkins) {
      const skin = skinFor(host);
      if (skin) css += '\n/* skin: ' + skin.name + ' */\n' + skin.css(config);
    }
    return css;
  }

  window.NotscapeStyles = {
    build: buildNotscapeCSS,
    skinFor,
    skins: SKINS,
    colorDepths: COLOR_DEPTHS
  };
})();
