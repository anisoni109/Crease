/**
 * Synthesised dice sounds (no audio files): a hand rattle, plastic-on-wood bounces and a soft settle.
 * The timings line up with the keyframes of .m-throw / .m-land in arena.css.
 */
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let enabled = true;

export function setDiceSound(on: boolean) {
  enabled = on;
}

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const C = window.AudioContext || (window as any).webkitAudioContext;
    if (!C) return null;
    ctx ||= new C();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Phones only allow audio after a touch: wake the audio engine on the first one. */
export function unlockAudio() {
  const wake = () => {
    const c = context();
    if (!c) return;
    try {
      const b = c.createBuffer(1, 1, 22050),
        s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
    } catch {}
    if (c.state === "running") {
      window.removeEventListener("pointerdown", wake, true);
      window.removeEventListener("touchend", wake, true);
      window.removeEventListener("keydown", wake, true);
    }
  };
  window.addEventListener("pointerdown", wake, true);
  window.addEventListener("touchend", wake, true);
  window.addEventListener("keydown", wake, true);
  return () => {
    window.removeEventListener("pointerdown", wake, true);
    window.removeEventListener("touchend", wake, true);
    window.removeEventListener("keydown", wake, true);
  };
}

function noiseBuffer(c: AudioContext) {
  if (!noise) {
    noise = c.createBuffer(1, Math.floor(c.sampleRate * 0.25), c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/** One short "tick" of filtered noise: the sound of a hard edge meeting a surface. */
function tick(c: AudioContext, at: number, gain: number, freq: number, q = 2.2, len = 0.028) {
  const src = c.createBufferSource(),
    band = c.createBiquadFilter(),
    amp = c.createGain();
  src.buffer = noiseBuffer(c);
  band.type = "bandpass";
  band.frequency.value = freq;
  band.Q.value = q;
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + 0.002);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(band);
  band.connect(amp);
  amp.connect(c.destination);
  src.start(at, Math.random() * 0.15);
  src.stop(at + len + 0.03);
}

/** The body of the impact: a short falling thump. */
function thump(c: AudioContext, at: number, gain: number, freq: number) {
  const o = c.createOscillator(),
    amp = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(freq, at);
  o.frequency.exponentialRampToValueAtTime(freq * 0.45, at + 0.08);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + 0.004);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
  o.connect(amp);
  amp.connect(c.destination);
  o.start(at);
  o.stop(at + 0.1);
}

/** A bounce: thump plus a cluster of clacks, softer each time. */
function bounce(c: AudioContext, at: number, strength: number) {
  thump(c, at, 0.22 * strength, 150 + Math.random() * 40);
  const n = strength > 0.6 ? 3 : 2;
  for (let i = 0; i < n; i++) tick(c, at + i * (0.006 + Math.random() * 0.012), (0.2 + Math.random() * 0.12) * strength, 2200 + Math.random() * 2600, 1.6);
}

/** Dice rattling in a cupped hand. */
function shake(c: AudioContext, at: number, ms: number) {
  const n = Math.round(ms / 22);
  for (let i = 0; i < n; i++) {
    const t = at + (i / n) * (ms / 1000) + Math.random() * 0.012;
    const swell = Math.sin((i / n) * Math.PI);
    tick(c, t, (0.05 + Math.random() * 0.1) * (0.5 + swell * 0.7), 2600 + Math.random() * 3200, 3, 0.02);
  }
}

/** A die thrown on to the table: shake, then three bounces and a settle. Matches the 1.2s throw. */
export function diceThrow(delayMs = 0) {
  if (!enabled) return;
  const c = context();
  if (!c) return;
  const t0 = c.currentTime + 0.02 + delayMs / 1000;
  shake(c, t0, 240);
  bounce(c, t0 + 0.66, 1);
  bounce(c, t0 + 0.89, 0.62);
  bounce(c, t0 + 1.056, 0.34);
  for (let i = 0; i < 4; i++) tick(c, t0 + 1.11 + i * 0.03 + Math.random() * 0.01, 0.05 * (1 - i * 0.2), 3000 + Math.random() * 1500, 2, 0.015);
}

/** A die dropping in after spinning: two bounces and a settle. Matches the 0.95s drop. */
export function diceDrop(delayMs = 0) {
  if (!enabled) return;
  const c = context();
  if (!c) return;
  const t0 = c.currentTime + 0.02 + delayMs / 1000;
  bounce(c, t0 + 0.43, 0.9);
  bounce(c, t0 + 0.665, 0.5);
  bounce(c, t0 + 0.835, 0.25);
}

/** Dice rattling while a roll is still on its way. */
export function diceRattle(delayMs = 0, ms = 520) {
  if (!enabled) return;
  const c = context();
  if (!c) return;
  shake(c, c.currentTime + 0.02 + delayMs / 1000, ms);
}
