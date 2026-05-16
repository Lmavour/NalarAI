const audioCache: Record<string, HTMLAudioElement> = {};

const SOUNDS = {
  success: 'https://www.soundjay.com/buttons/sounds/button-3.mp3',
  error: 'https://www.soundjay.com/buttons/sounds/button-10.mp3',
  pop: 'https://www.soundjay.com/buttons/sounds/button-21.mp3',
};

export function preloadSounds() {
  if (typeof window === 'undefined') return;
  
  Object.entries(SOUNDS).forEach(([key, url]) => {
    if (!audioCache[key]) {
      const audio = new Audio(url);
      audio.volume = 0.3;
      audio.preload = 'auto';
      audioCache[key] = audio;
    }
  });
}

export function playSound(type: 'success' | 'error' | 'pop', volume = 0.3) {
  if (typeof window === 'undefined') return;

  const audio = audioCache[type];
  if (audio) {
    audio.volume = volume;
    // Reset for rapid play
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Browser might block auto-play without interaction
    });
  } else {
    // Fallback if not preloaded
    const audioFallback = new Audio(SOUNDS[type]);
    audioFallback.volume = volume;
    audioFallback.play().catch(() => {});
  }
}
