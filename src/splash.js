// Splash: the dial-up sign-on ceremony + a procedurally synthesized modem screech.

const signon = document.getElementById('signon');
const connecting = document.getElementById('connecting');
const statusEl = document.getElementById('status');
const bar = document.getElementById('bar');
const steps = Array.from(document.querySelectorAll('#steps li'));

const screenNameInput = document.getElementById('screenName');

const closeWin = () => window.notscape.windowControl('close');
document.getElementById('signonBtn').addEventListener('click', startDialing);
document.getElementById('signonCancelBtn').addEventListener('click', closeWin);
document.getElementById('cancelBtn').addEventListener('click', closeWin);
document.querySelector('.titlebar .x').addEventListener('click', closeWin);

// remember the last screen name (defaults to saxman103 on first run)
window.notscape.getAccount().then((a) => {
  screenNameInput.value = (a && a.screenName) || 'saxman103';
});
// Enter in the screen-name field signs on
screenNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') startDialing(); });

// ---------------------------------------------------------------------------
// Modem handshake — no audio files, just Web Audio. Dial tone, touch-tone
// "dialing", then the classic carrier screech (mixed tones + filtered noise).
// ---------------------------------------------------------------------------
function playModem() {
  let ctx;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
  catch (_) { return; }

  const t0 = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);

  const tone = (freq, start, dur, type = 'sine', vol = 1) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t0 + start);
    g.gain.linearRampToValueAtTime(vol, t0 + start + 0.02);
    g.gain.setValueAtTime(vol, t0 + start + dur - 0.03);
    g.gain.linearRampToValueAtTime(0, t0 + start + dur);
    o.connect(g); g.connect(master);
    o.start(t0 + start);
    o.stop(t0 + start + dur + 0.02);
  };

  // dial tone (350 + 440 Hz)
  tone(350, 0.0, 0.9, 'sine', 0.5);
  tone(440, 0.0, 0.9, 'sine', 0.5);

  // touch-tone "dialing" — a few DTMF-ish pairs
  const dtmf = [[697, 1209], [770, 1336], [852, 1477], [941, 1209], [697, 1477]];
  dtmf.forEach((pair, i) => {
    const s = 1.1 + i * 0.18;
    tone(pair[0], s, 0.12, 'sine', 0.5);
    tone(pair[1], s, 0.12, 'sine', 0.5);
  });

  // carrier handshake screech: warbling tones + filtered noise burst
  const hsStart = 2.2;
  tone(1200, hsStart, 1.6, 'square', 0.12);
  tone(2250, hsStart + 0.3, 1.4, 'sawtooth', 0.10);
  tone(1800, hsStart + 0.6, 1.2, 'square', 0.10);

  // white-noise burst (the "shhhhh")
  const noiseLen = 2.4;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * noiseLen, ctx.sampleRate);
  const ch = buffer.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * 0.5;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const nf = ctx.createBiquadFilter();
  nf.type = 'bandpass';
  nf.frequency.value = 1800;
  nf.Q.value = 0.7;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0, t0 + hsStart);
  ng.gain.linearRampToValueAtTime(0.25, t0 + hsStart + 0.4);
  ng.gain.setValueAtTime(0.25, t0 + hsStart + noiseLen - 0.6);
  ng.gain.linearRampToValueAtTime(0, t0 + hsStart + noiseLen);
  noise.connect(nf); nf.connect(ng); ng.connect(master);
  noise.start(t0 + hsStart);
  noise.stop(t0 + hsStart + noiseLen);

  setTimeout(() => { try { ctx.close(); } catch (_) {} }, 6000);
}

// ---------------------------------------------------------------------------
function startDialing() {
  const name = (screenNameInput.value || 'saxman103').trim() || 'saxman103';
  window.notscape.setAccount({ screenName: name });

  signon.hidden = true;
  connecting.hidden = false;
  playModem();

  const messages = [
    'Dialing 1-800-OLD-WEB...',
    'Initializing modem...',
    'Verifying screen name "' + name + '"...',
    'Negotiating carrier (56,600 bps)...',
    'Loading the World Wide Web...'
  ];

  let i = 0;
  const total = steps.length;
  const tick = () => {
    if (i > 0) {
      steps[i - 1].classList.remove('active');
      steps[i - 1].classList.add('done');
    }
    if (i < total) {
      steps[i].classList.add('active');
      statusEl.textContent = messages[i];
      bar.style.width = Math.round(((i + 1) / total) * 100) + '%';
      i++;
      setTimeout(tick, 950);
    } else {
      statusEl.textContent = 'Connected! Welcome back, ' + name + '.';
      setTimeout(() => window.notscape.splashConnected(), 700);
    }
  };
  tick();
}
