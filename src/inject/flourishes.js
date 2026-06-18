// flourishes.js (RENDERER) — the catalog of old-web "flourishes" you can add to a
// specific website. CSS-driven decorations go through insertCSS (CSP-proof); the
// overlay elements + sparkle cursor are created by the engine, styled by this CSS.
(function () {
  const FLOURISHES = [
    { key: 'starfield',    name: '✨ Twinkling Starfield', desc: 'A field of twinkling stars drifts over the page.' },
    { key: 'snow',         name: '❄ Falling Snow',        desc: 'Gentle snowflakes fall down the page.' },
    { key: 'scanlines',    name: '📺 CRT Scanlines',       desc: 'Old-monitor scanlines and a faint flicker.' },
    { key: 'rainbow',      name: '🌈 Rainbow Headings',    desc: 'Headings shimmer through the rainbow.' },
    { key: 'neon',         name: '💡 Neon Glow',           desc: 'Links and headings glow neon.' },
    { key: 'sparkles',     name: '🖱 Sparkle Cursor',      desc: 'Your cursor leaves a trail of sparkles.' },
    { key: 'construction', name: '🚧 Under Construction',  desc: 'A classic "under construction" banner up top.' },
    { key: 'counter',      name: '🔢 Hit Counter',         desc: 'A retro visitor counter at the bottom.' },
    { key: 'webring',      name: '💍 Webring',             desc: 'A webring footer (prev / random / next).' },
    { key: 'wordart',      name: '🅰 WordArt Headings',    desc: 'Headings rendered as glorious 90s WordArt.' },
    { key: 'glitter',      name: '🌟 Glitter Text',        desc: 'Headings shimmer with gold glitter.' },
    { key: 'rainbowhr',    name: '🌈 Rainbow Rules',       desc: 'Horizontal rules become animated rainbows.' },
    { key: 'dropshadow',   name: '🔲 Chunky Shadows',      desc: 'Big offset drop-shadows on headings.' },
    { key: 'comicsans',    name: '✏ Comic Sans',          desc: 'Everything in Comic Sans, obviously.' },
    { key: 'fonttimes',    name: '📜 Times New Roman',      desc: 'The whole page in classic Times.' },
    { key: 'fonttrebuchet',name: '🅣 Trebuchet',            desc: 'That late-90s Trebuchet MS look.' },
    { key: 'fontcourier',  name: '⌨ Courier',              desc: 'Everything in typewriter monospace.' },
    { key: 'fontimpact',   name: '🅸 Impact Headings',      desc: 'Headings in bold Impact.' },
    { key: 'fontblack',    name: '⬛ Arial Black Headings',  desc: 'Headings in heavy Arial Black.' },
    { key: 'bubbles',      name: '🫧 Rising Bubbles',      desc: 'Bubbles float up the page.' },
    { key: 'vignette',     name: '📷 CRT Vignette',        desc: 'Darkened, rounded monitor edges.' },
    { key: 'lasergrid',    name: '🌆 Synthwave Grid',      desc: 'A neon perspective grid along the bottom.' },
    { key: 'guestbook',    name: '📖 Guestbook',           desc: '"Please sign my guestbook!" footer.' },
    { key: 'bestviewed',   name: '🏷 88×31 Badges',        desc: 'Classic "best viewed in…" button badges.' },
    // --- Java-applet-style TITLE-TEXT effects ---
    { key: 'scroll',       name: '📜 Scrolling Titles',     desc: 'Headings scroll by like a marquee.' },
    { key: 'lake',         name: '🌊 Reflecting Pool',      desc: 'Headings reflect in rippling water (the "Lake" applet).' },
    { key: 'wave',         name: '〰 Waving Letters',        desc: 'Heading letters wave up and down.' },
    { key: 'flametext',    name: '🔥 Flaming Text',         desc: 'Headings flicker like fire.' },
    { key: 'fadetext',     name: '💫 Glowing Pulse',        desc: 'Headings pulse with a soft glow.' },
    { key: 'nervous',      name: '😵 Nervous Text',         desc: 'Headings jitter nervously.' },
    // --- more Java-applet-style overlays ---
    { key: 'plasma',       name: '🟣 Plasma Cloud',         desc: 'A shifting psychedelic plasma haze.' },
    { key: 'fog',          name: '🌫 Drifting Fog',         desc: 'Mist drifts slowly across the page.' },
    { key: 'confetti',     name: '🎊 Confetti',             desc: 'Colorful confetti rains down.' },
    { key: 'fireflies',    name: '🪲 Fireflies',            desc: 'Warm glowing fireflies drift about.' },
    { key: 'coderain',     name: '🟩 Code Rain',            desc: 'Green digital rain streaks down.' },
    { key: 'heartcursor',  name: '💕 Heart Cursor',         desc: 'Your cursor trails little hearts.' },
    // --- more title-text effects ---
    { key: 'chrome',       name: '🪙 Chrome Text',          desc: 'Shiny metallic chrome headings.' },
    { key: 'outline',      name: '⭕ Outlined Text',        desc: 'Hollow outlined headings.' },
    { key: 'threeD',       name: '🧊 3D Text',              desc: 'Chunky extruded 3D headings.' },
    { key: 'colorcycle',   name: '🎨 Color Cycle',          desc: 'Headings cycle through every hue.' },
    { key: 'typewriter',   name: '⌨ Typewriter',            desc: 'Headings type themselves out.' },
    // --- more decorations ---
    { key: 'awards',       name: '🏆 Award Badges',         desc: '"Cool Site of the Day" award badges.' },
    { key: 'emailme',      name: '✉ Email the Webmaster',   desc: 'A classic "email me!" badge.' },
    { key: 'midi',         name: '🎵 MIDI Disclaimer',      desc: '"MIDI music playing — adjust your speakers!"' }
  ];

  const CSS = {
    starfield: `
      .ns-fx-starfield{position:fixed;inset:0;pointer-events:none;z-index:2147483600;background-color:transparent;
        background-image:
          radial-gradient(1px 1px at 25px 35px,#fff,transparent),
          radial-gradient(1px 1px at 80px 120px,#aef,transparent),
          radial-gradient(1.5px 1.5px at 150px 60px,#fff,transparent),
          radial-gradient(1px 1px at 205px 180px,#ffd,transparent),
          radial-gradient(1px 1px at 120px 220px,#fff,transparent);
        background-repeat:repeat;background-size:250px 250px;animation:ns-twinkle 2.6s ease-in-out infinite}
      @keyframes ns-twinkle{0%,100%{opacity:.55}50%{opacity:.95}}`,
    snow: `
      .ns-fx-snow{position:fixed;inset:0;pointer-events:none;z-index:2147483601;
        background-image:
          radial-gradient(2px 2px at 30px 30px,#fff,transparent),
          radial-gradient(2px 2px at 120px 80px,#fff,transparent),
          radial-gradient(1.5px 1.5px at 205px 150px,#fff,transparent),
          radial-gradient(2px 2px at 90px 200px,#fff,transparent);
        background-repeat:repeat;background-size:220px 220px;animation:ns-snow 6s linear infinite}
      @keyframes ns-snow{from{background-position:0 0,0 0,0 0,0 0}
        to{background-position:10px 220px,-15px 220px,8px 220px,-12px 220px}}`,
    scanlines: `
      .ns-fx-scanlines{position:fixed;inset:0;pointer-events:none;z-index:2147483602;mix-blend-mode:multiply;
        background:repeating-linear-gradient(rgba(0,0,0,.18) 0 1px, transparent 1px 3px);
        animation:ns-flicker 4s steps(60) infinite}
      @keyframes ns-flicker{0%,100%{opacity:.85}50%{opacity:.68}}`,
    sparkles: `
      .ns-fx-sparkle{position:fixed;pointer-events:none;z-index:2147483603;width:10px;height:10px;
        background:radial-gradient(#fff,#ffd700 40%,transparent 70%);transform:translate(-50%,-50%);
        animation:ns-sparkle .7s ease-out forwards}
      @keyframes ns-sparkle{from{opacity:1;transform:translate(-50%,-50%) scale(1)}
        to{opacity:0;transform:translate(-50%,-50%) scale(.2)}}`,
    rainbow: `
      h1,h2,h3{background:linear-gradient(90deg,#f00,#f90,#ff0,#3c3,#39f,#93f,#f00)!important;
        background-size:200% auto!important;-webkit-background-clip:text!important;background-clip:text!important;
        -webkit-text-fill-color:transparent!important;color:transparent!important;
        animation:ns-rainbow 4s linear infinite!important}
      @keyframes ns-rainbow{to{background-position:200% center}}`,
    neon: `
      a,a:link{color:#0ff!important;text-shadow:0 0 4px #0ff,0 0 9px #0ff!important}
      h1,h2,h3{text-shadow:0 0 6px currentColor,0 0 12px currentColor!important}`,
    wordart: `
      h1,h2,h3{font-family:Impact,'Arial Black',sans-serif!important;font-style:italic!important;
        background:linear-gradient(180deg,#ffe600,#ff00d4,#00e5ff)!important;-webkit-background-clip:text!important;
        background-clip:text!important;-webkit-text-fill-color:transparent!important;color:transparent!important;
        -webkit-text-stroke:1px #002!important;transform:skewX(-6deg)!important;letter-spacing:1px!important}`,
    glitter: `
      h1,h2,h3{background:linear-gradient(90deg,#fff,#ffd700,#fff,#ffea00,#fff)!important;background-size:200% auto!important;
        -webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important;
        color:transparent!important;text-shadow:none!important;animation:ns-glitter 1.2s linear infinite!important}
      @keyframes ns-glitter{to{background-position:200% center}}`,
    rainbowhr: `
      hr{height:4px!important;border:0!important;background:linear-gradient(90deg,#f00,#f90,#ff0,#3c3,#39f,#93f,#f00)!important;
        background-size:200% auto!important;animation:ns-rainbow 3s linear infinite!important}
      @keyframes ns-rainbow{to{background-position:200% center}}`,
    dropshadow: `
      h1,h2,h3{text-shadow:3px 3px 0 #808080,6px 6px 0 rgba(0,0,0,.25)!important}`,
    comicsans: `
      html body,html body *{font-family:'Comic Sans MS','Comic Sans',cursive!important}`,
    fonttimes: `
      html body,html body *{font-family:'Times New Roman',Times,serif!important}`,
    fonttrebuchet: `
      html body,html body *{font-family:'Trebuchet MS','Lucida Grande',Tahoma,sans-serif!important}`,
    fontcourier: `
      html body,html body *{font-family:'Courier New',Courier,monospace!important}`,
    fontimpact: `
      h1,h2,h3{font-family:Impact,'Arial Black',Charcoal,sans-serif!important;letter-spacing:.5px!important;font-weight:400!important}`,
    fontblack: `
      h1,h2,h3{font-family:'Arial Black','Arial Bold',Gadget,sans-serif!important;font-weight:900!important}`,
    bubbles: `
      .ns-fx-bubbles{position:fixed;inset:0;pointer-events:none;z-index:2147483601;
        background-image:
          radial-gradient(6px 6px at 20px 80px,rgba(255,255,255,.5),transparent),
          radial-gradient(10px 10px at 120px 40px,rgba(180,220,255,.5),transparent),
          radial-gradient(8px 8px at 205px 120px,rgba(255,255,255,.4),transparent),
          radial-gradient(5px 5px at 90px 160px,rgba(200,240,255,.5),transparent);
        background-repeat:repeat;background-size:240px 240px;animation:ns-bubbles 9s linear infinite}
      @keyframes ns-bubbles{from{background-position:0 0,0 0,0 0,0 0}
        to{background-position:0 -240px,0 -240px,0 -240px,0 -240px}}`,
    vignette: `
      .ns-fx-vignette{position:fixed;inset:0;pointer-events:none;z-index:2147483602;
        background:radial-gradient(ellipse at center,transparent 55%,rgba(0,0,0,.55) 100%)}`,
    lasergrid: `
      .ns-fx-lasergrid{position:fixed;left:0;right:0;bottom:0;height:38vh;pointer-events:none;z-index:2147483600;
        background-image:
          linear-gradient(rgba(255,0,200,0),rgba(255,0,200,.18)),
          repeating-linear-gradient(90deg,rgba(0,255,255,.5) 0 1px,transparent 1px 40px),
          repeating-linear-gradient(0deg,rgba(0,255,255,.5) 0 1px,transparent 1px 40px);
        transform:perspective(300px) rotateX(60deg);transform-origin:bottom;
        animation:ns-lasergrid 1.1s linear infinite}
      @keyframes ns-lasergrid{from{background-position:0 0,0 0,0 0}to{background-position:0 0,0 0,0 40px}}`,
    lake: `
      h1,h2,h3{-webkit-box-reflect:below 1px linear-gradient(transparent 38%,rgba(120,180,255,.5))!important;
        animation:ns-lake 3.2s ease-in-out infinite!important}
      @keyframes ns-lake{0%,100%{transform:skewX(0deg)}50%{transform:skewX(2deg)}}`,
    wave: `
      @keyframes ns-wave{0%,100%{transform:translateY(0)}50%{transform:translateY(-.35em)}}`,
    flametext: `
      h1,h2,h3{background:linear-gradient(0deg,#ffe000,#ff9000 45%,#ff2000 85%)!important;
        -webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important;
        color:transparent!important;text-shadow:0 0 7px rgba(255,90,0,.8)!important;
        animation:ns-flame .12s steps(2) infinite alternate!important}
      @keyframes ns-flame{from{filter:brightness(1)}to{filter:brightness(1.2)}}`,
    fadetext: `
      h1,h2,h3{animation:ns-fadeglow 1.6s ease-in-out infinite!important}
      @keyframes ns-fadeglow{0%,100%{opacity:.6;text-shadow:0 0 4px currentColor}50%{opacity:1;text-shadow:0 0 16px currentColor}}`,
    nervous: `
      h1,h2,h3{animation:ns-nervous .13s steps(2) infinite!important}
      @keyframes ns-nervous{0%{transform:translate(0,0)}25%{transform:translate(-1px,1px)}50%{transform:translate(1px,-1px)}
        75%{transform:translate(1px,1px)}100%{transform:translate(-1px,-1px)}}`,
    plasma: `
      .ns-fx-plasma{position:fixed;inset:0;pointer-events:none;z-index:2147483599;opacity:.32;mix-blend-mode:screen;
        background:linear-gradient(45deg,#f0f,#0ff,#ff0,#0f8,#f0f);background-size:400% 400%;
        animation:ns-plasma 12s ease infinite}
      @keyframes ns-plasma{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`,
    fog: `
      .ns-fx-fog{position:fixed;inset:0;pointer-events:none;z-index:2147483602;opacity:.5;
        background:radial-gradient(closest-side,rgba(255,255,255,.55),transparent 70%),
          radial-gradient(closest-side,rgba(215,215,230,.5),transparent 70%);
        background-size:60% 60%,85% 85%;background-repeat:repeat;animation:ns-fog 22s linear infinite}
      @keyframes ns-fog{from{background-position:0 0,0 0}to{background-position:200% 0,-200% 0}}`,
    confetti: `
      .ns-fx-confetti{position:fixed;inset:0;pointer-events:none;z-index:2147483601;
        background-image:
          radial-gradient(3px 3px at 20px 30px,#f00,transparent),
          radial-gradient(3px 3px at 80px 10px,#0a0,transparent),
          radial-gradient(3px 3px at 140px 60px,#06f,transparent),
          radial-gradient(3px 3px at 60px 95px,#fc0,transparent),
          radial-gradient(3px 3px at 180px 120px,#f0c,transparent);
        background-repeat:repeat;background-size:200px 200px;animation:ns-confetti 5s linear infinite}
      @keyframes ns-confetti{from{background-position:0 0,0 0,0 0,0 0,0 0}
        to{background-position:6px 200px,-8px 200px,4px 200px,-6px 200px,8px 200px}}`,
    fireflies: `
      .ns-fx-fireflies{position:fixed;inset:0;pointer-events:none;z-index:2147483600;
        background-image:
          radial-gradient(2px 2px at 30px 40px,rgba(255,255,120,.95),transparent),
          radial-gradient(2px 2px at 120px 100px,rgba(180,255,120,.95),transparent),
          radial-gradient(2px 2px at 205px 60px,rgba(255,230,120,.95),transparent);
        background-repeat:repeat;background-size:240px 240px;animation:ns-fireflies 6s ease-in-out infinite}
      @keyframes ns-fireflies{0%,100%{opacity:.4;background-position:0 0,0 0,0 0}
        50%{opacity:1;background-position:12px -8px,-10px 6px,8px 10px}}`,
    coderain: `
      .ns-fx-coderain{position:fixed;inset:0;pointer-events:none;z-index:2147483600;opacity:.45;
        background:repeating-linear-gradient(0deg,rgba(0,255,70,.55) 0 6px,transparent 6px 22px);
        background-size:15px 220px;animation:ns-coderain 1.4s linear infinite}
      @keyframes ns-coderain{from{background-position:0 0}to{background-position:0 220px}}`,
    heartcursor: `
      .ns-fx-heart{position:fixed;pointer-events:none;z-index:2147483603;font-size:16px;transform:translate(-50%,-50%);
        animation:ns-heart .9s ease-out forwards}
      @keyframes ns-heart{from{opacity:1;transform:translate(-50%,-50%) scale(1)}
        to{opacity:0;transform:translate(-50%,-120%) scale(.6)}}`,
    chrome: `
      h1,h2,h3{background:linear-gradient(180deg,#fff 0%,#c8c8c8 45%,#7a7a7a 50%,#e8e8e8 55%,#aaa 100%)!important;
        -webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important;
        color:transparent!important;-webkit-text-stroke:.5px #444!important}`,
    outline: `
      h1,h2,h3{-webkit-text-fill-color:transparent!important;color:transparent!important;
        -webkit-text-stroke:1.5px #000080!important}`,
    threeD: `
      h1,h2,h3{color:#fff!important;
        text-shadow:1px 1px 0 #999,2px 2px 0 #888,3px 3px 0 #777,4px 4px 0 #666,5px 5px 0 #555,6px 6px 7px rgba(0,0,0,.4)!important}`,
    colorcycle: `
      h1,h2,h3{color:#ff2d2d!important;animation:ns-colorcycle 4s linear infinite!important}
      @keyframes ns-colorcycle{from{filter:hue-rotate(0deg)}to{filter:hue-rotate(360deg)}}`,
    typewriter: `
      h1,h2,h3{overflow:hidden!important;white-space:nowrap!important;border-right:3px solid currentColor!important;
        animation:ns-type 2.5s steps(40,end) 1,ns-caret .7s step-end infinite!important}
      @keyframes ns-type{from{max-width:0}to{max-width:100%}}
      @keyframes ns-caret{50%{border-color:transparent}}`
  };

  function flourishCSS(keys) {
    if (!keys || !keys.length) return '';
    const seen = {};
    let out = '';
    keys.forEach((k) => { if (CSS[k] && !seen[k]) { seen[k] = 1; out += CSS[k] + '\n'; } });
    return out;
  }

  // Categories so the random roll can pick a balanced (not clobbered) set
  const CATS = {
    overlay: ['starfield', 'snow', 'scanlines', 'bubbles', 'vignette', 'lasergrid', 'plasma', 'fog', 'confetti', 'fireflies', 'coderain'],
    cursor: ['sparkles', 'heartcursor'],
    // title-text effects fight over the same headings — pick at most one
    title: ['rainbow', 'neon', 'wordart', 'glitter', 'dropshadow', 'scroll', 'lake', 'wave', 'flametext', 'fadetext', 'nervous', 'chrome', 'outline', 'threeD', 'colorcycle', 'typewriter', 'fontimpact', 'fontblack'],
    page: ['comicsans', 'rainbowhr', 'fonttimes', 'fonttrebuchet', 'fontcourier'],
    decoration: ['counter', 'webring', 'guestbook', 'bestviewed', 'awards', 'emailme', 'midi']
    // 'construction' is added separately at ~1/3 odds
  };

  // Themes constrain which flourishes get rolled, for a calmer / darker vibe.
  // 'all' = the whole library; the others are curated include-lists per category.
  const THEMES = {
    all: null,
    subdued: {
      overlay: ['starfield', 'snow', 'scanlines', 'fog', 'vignette'],
      cursor: ['sparkles', 'heartcursor'],
      title: ['dropshadow', 'chrome', 'outline', 'threeD', 'lake', 'fadetext', 'nervous', 'scroll', 'wave', 'fontimpact', 'fontblack'],
      page: ['fonttimes', 'fonttrebuchet', 'fontcourier'],
      decoration: ['counter', 'webring', 'guestbook', 'bestviewed', 'emailme', 'midi']
    },
    dark: {
      overlay: ['starfield', 'scanlines', 'vignette', 'coderain', 'fog'],
      cursor: ['sparkles'],
      title: ['chrome', 'outline', 'threeD', 'neon', 'fadetext', 'fontcourier', 'fontimpact', 'fontblack'],
      page: ['fontcourier'],
      decoration: ['counter', 'webring', 'bestviewed']
    }
  };

  window.NotscapeFlourishes = { list: FLOURISHES, css: flourishCSS, cats: CATS, themes: THEMES };
})();
