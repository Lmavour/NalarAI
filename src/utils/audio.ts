/**
 * Self-hosted audio using Web Audio API — no external CDN dependency.
 * Generates synthetic tones in-browser for success, error, and pop sounds.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.15,
  rampDown = true,
) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);

    if (rampDown) {
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // AudioContext may not be available (SSR, restrictive environments)
  }
}

export function preloadSounds() {
  // Web Audio API doesn't need preloading — tone generation is instant.
  // We do warm up the AudioContext on first user interaction via playSound.
}

export function playSound(type: 'success' | 'error' | 'pop') {
  // Resume AudioContext if suspended (browser autoplay policy)
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  switch (type) {
    case 'success':
      // Ascending cheerful two-note chime
      playTone(523.25, 0.12, 'sine', 0.18);  // C5
      setTimeout(() => playTone(659.25, 0.18, 'sine', 0.18), 80); // E5
      break;

    case 'error':
      // Low buzz — two short pulses
      playTone(180, 0.15, 'square', 0.1);
      setTimeout(() => playTone(150, 0.18, 'square', 0.1), 100);
      break;

    case 'pop':
      // Quick bright click
      playTone(880, 0.05, 'sine', 0.12, false);
      break;
  }
}
