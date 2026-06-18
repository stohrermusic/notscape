// webring.js (RENDERER) — the Notscape Webring: a hand-picked ring of personal,
// non-corporate, interesting corners of the web. The footer's Prev/Random/Next
// cycle through these, and the Webring directory (Go menu) lists them all.
(function () {
  window.NotscapeRing = [
    { url: 'https://archive.org/', title: 'Internet Archive', desc: 'Millions of free books, films & music — plus the Wayback Machine.' },
    { url: 'https://www.gutenberg.org/', title: 'Project Gutenberg', desc: '70,000+ free public-domain ebooks.' },
    { url: 'https://wiby.me/', title: 'Wiby', desc: 'A search engine for the old, personal, hand-made web.' },
    { url: 'https://search.marginalia.nu/', title: 'Marginalia Search', desc: 'Indie search that surfaces text-first, non-commercial pages.' },
    { url: 'https://neocities.org/', title: 'Neocities', desc: 'The spiritual successor to GeoCities — free personal sites.' },
    { url: 'https://ciechanow.ski/', title: 'Bartosz Ciechanowski', desc: 'Jaw-dropping interactive explanations of how things work.' },
    { url: 'https://xkcd.com/', title: 'xkcd', desc: 'A webcomic of romance, sarcasm, math and language.' },
    { url: 'https://publicdomainreview.org/', title: 'The Public Domain Review', desc: 'Curiosities from the public domain: art, books, film.' },
    { url: 'https://standardebooks.org/', title: 'Standard Ebooks', desc: 'Beautifully produced, free public-domain ebooks.' },
    { url: 'https://solar.lowtechmagazine.com/', title: 'Low-Tech Magazine', desc: 'A solar-powered website questioning high-tech progress.' },
    { url: 'https://100r.co/', title: 'Hundred Rabbits', desc: 'Two artists living off-grid, building tools and games.' },
    { url: 'https://lichess.org/', title: 'Lichess', desc: 'Free, ad-free, open-source chess for everyone.' },
    { url: 'https://news.ycombinator.com/', title: 'Hacker News', desc: 'Tech & startup news, famously plain.' },
    { url: 'https://www.openculture.com/', title: 'Open Culture', desc: 'Free courses, films, audiobooks & cultural media.' },
    { url: 'https://jvns.ca/', title: 'Julia Evans', desc: 'Friendly programming zines & comics that make hard things simple.' },
    { url: 'https://href.cool/', title: 'href.cool', desc: 'A hand-crafted directory of interesting corners of the web.' },
    { url: 'https://ooh.directory/', title: 'ooh.directory', desc: 'A growing directory of personal blogs.' },
    { url: 'https://nownownow.com/', title: 'now now now', desc: "People's /now pages — what they're focused on now." },
    { url: 'https://theuselessweb.com/', title: 'The Useless Web', desc: 'One button → a delightfully pointless website.' },
    { url: 'https://radio.garden/', title: 'Radio Garden', desc: 'Spin the globe and listen to live radio anywhere.' },
    { url: 'https://www.window-swap.com/', title: 'WindowSwap', desc: "Look out of someone else's window, somewhere in the world." },
    { url: 'https://kottke.org/', title: 'kottke.org', desc: "One of the web's longest-running personal blogs." },
    { url: 'https://www.metafilter.com/', title: 'MetaFilter', desc: 'A community weblog of the best of the web since 1999.' },
    { url: 'https://1mb.club/', title: '1MB Club', desc: 'Websites that weigh less than one megabyte.' }
  ];

  // A browsable, hand-curated topic directory (Yahoo!-/href.cool-style)
  window.NotscapeDirectory = [
    { cat: '🔍 Search & Discover', sites: [
      { title: 'Wiby', url: 'https://wiby.me/', desc: 'Search the old, personal, hand-made web.' },
      { title: 'Marginalia', url: 'https://search.marginalia.nu/', desc: 'Indie search for text-first, non-commercial pages.' },
      { title: 'href.cool', url: 'https://href.cool/', desc: 'A hand-crafted directory of interesting links.' },
      { title: 'ooh.directory', url: 'https://ooh.directory/', desc: 'A growing directory of personal blogs.' }
    ] },
    { cat: '📚 Read & Learn', sites: [
      { title: 'Internet Archive', url: 'https://archive.org/', desc: 'Free books, films, music & the Wayback Machine.' },
      { title: 'Project Gutenberg', url: 'https://www.gutenberg.org/', desc: '70,000+ free public-domain ebooks.' },
      { title: 'Standard Ebooks', url: 'https://standardebooks.org/', desc: 'Beautifully made free ebooks.' },
      { title: 'Public Domain Review', url: 'https://publicdomainreview.org/', desc: 'Curiosities from the public domain.' },
      { title: 'Open Culture', url: 'https://www.openculture.com/', desc: 'Free courses, films & cultural media.' }
    ] },
    { cat: '🛠 Make & Tinker', sites: [
      { title: 'Hackaday', url: 'https://hackaday.com/', desc: 'Hardware hacks and DIY electronics.' },
      { title: 'Adafruit', url: 'https://blog.adafruit.com/', desc: 'Maker projects and open hardware.' },
      { title: '3DPrint.com', url: 'https://3dprint.com/', desc: '3D-printing news and how-tos.' },
      { title: 'Hundred Rabbits', url: 'https://100r.co/', desc: 'Two artists building tools off-grid.' },
      { title: 'Low-Tech Magazine', url: 'https://solar.lowtechmagazine.com/', desc: 'A solar-powered, low-tech site.' }
    ] },
    { cat: '✍️ Personal Sites', sites: [
      { title: 'kottke.org', url: 'https://kottke.org/', desc: "One of the web's oldest personal blogs." },
      { title: 'Julia Evans', url: 'https://jvns.ca/', desc: 'Friendly programming zines & comics.' },
      { title: 'Bartosz Ciechanowski', url: 'https://ciechanow.ski/', desc: 'Interactive explanations of how things work.' },
      { title: 'MetaFilter', url: 'https://www.metafilter.com/', desc: 'Community weblog of the best of the web.' }
    ] },
    { cat: '🎮 Play & Wander', sites: [
      { title: 'The Useless Web', url: 'https://theuselessweb.com/', desc: 'One button → a pointless website.' },
      { title: 'Radio Garden', url: 'https://radio.garden/', desc: 'Spin the globe, hear live radio anywhere.' },
      { title: 'WindowSwap', url: 'https://www.window-swap.com/', desc: "Look out someone else's window." },
      { title: 'Lichess', url: 'https://lichess.org/', desc: 'Free, ad-free, open-source chess.' },
      { title: 'xkcd', url: 'https://xkcd.com/', desc: 'Romance, sarcasm, math & language.' }
    ] },
    { cat: '🌐 The Indie Web', sites: [
      { title: 'Neocities', url: 'https://neocities.org/', desc: 'Free personal websites — GeoCities reborn.' },
      { title: 'IndieWeb', url: 'https://indieweb.org/', desc: 'Own your data; the people-first web.' },
      { title: '1MB Club', url: 'https://1mb.club/', desc: 'Sites under one megabyte.' },
      { title: 'now now now', url: 'https://nownownow.com/', desc: "People's /now pages." }
    ] }
  ];
})();
