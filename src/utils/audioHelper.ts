/**
 * Native Audio and Speech Synthesis Helpers
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

// Play a synthesized beep of a specific frequency, type, and duration
export function playBeep(frequency: number, type: OscillatorType, duration: number, volume: number = 0.1) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    // Smooth fade out
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.error('Failed to play beep sound:', e);
  }
}

// Play feedback sounds
export function playSuccessBeep(volume: number = 0.15) {
  playBeep(600, 'sine', 0.12, volume);
}

export function playNextStepBeep(volume: number = 0.1) {
  playBeep(880, 'sine', 0.08, volume);
}

export function playSaveBeep(volume: number = 0.15) {
  // Double beep
  playBeep(523.25, 'sine', 0.1, volume);
  setTimeout(() => {
    playBeep(659.25, 'sine', 0.15, volume);
  }, 120);
}

export function playErrorBeep(volume: number = 0.15) {
  // Low buzz sound
  playBeep(180, 'triangle', 0.3, volume);
}

// Speech Synthesis
export function speakText(text: string, enabled: boolean = true, volume: number = 0.8) {
  if (!enabled || typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    // Cancel any ongoing speaking
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volume;
    utterance.rate = 1.05; // Slightly faster for responsiveness
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error('Failed to speak text:', e);
  }
}
