// Tiny WebAudio synth for SIZZLE RUSH — no audio files, everything is an oscillator.

export function createAudio() {
  let ctx = null;
  let muted = false;
  try {
    const AC = window.AudioContext ?? window.webkitAudioContext;
    if (AC) ctx = new AC();
  } catch {
    ctx = null;
  }

  function tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = null) {
    if (!ctx || muted) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  const sounds = {
    pickup() { tone(520, 0.08, 'sine', 0.1); },
    place() { tone(340, 0.08, 'triangle', 0.1); },
    chop() { tone(180, 0.06, 'square', 0.08); tone(140, 0.06, 'square', 0.08, 0.07); },
    sizzle() { tone(900, 0.25, 'sawtooth', 0.04, 0, 300); },
    ding() { tone(880, 0.18, 'sine', 0.12); tone(1320, 0.22, 'sine', 0.08, 0.08); },
    serve() { tone(523, 0.12, 'sine', 0.12); tone(659, 0.12, 'sine', 0.12, 0.1); tone(784, 0.2, 'sine', 0.12, 0.2); },
    error() { tone(160, 0.16, 'square', 0.08, 0, 110); },
    expire() { tone(400, 0.3, 'sawtooth', 0.08, 0, 120); },
    tick() { tone(1000, 0.05, 'sine', 0.07); },
    burn() { tone(220, 0.2, 'sawtooth', 0.07, 0, 90); },
    trash() { tone(300, 0.1, 'triangle', 0.08, 0, 150); },
    over() { tone(392, 0.2, 'sine', 0.1); tone(311, 0.2, 'sine', 0.1, 0.18); tone(262, 0.4, 'sine', 0.1, 0.36); },
  };

  return {
    play(name) {
      if (sounds[name]) sounds[name]();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
