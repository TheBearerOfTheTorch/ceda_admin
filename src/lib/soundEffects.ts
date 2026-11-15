// Synthesized Web Audio API notification chimes (zero external audio file dependencies)

let sharedAudioCtx: AudioContext | null = null;
let audioUnlockAttached = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    try {
      sharedAudioCtx = new AudioCtx();
    } catch {
      return null;
    }
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function initAudioUnlock(): void {
  if (typeof window === 'undefined' || audioUnlockAttached) return;
  audioUnlockAttached = true;

  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  };

  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock, { passive: true });
}

function playToneSequence(
  notes: { freq: number; startOffset: number; duration: number; peakGain: number; type?: OscillatorType }[]
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const playNow = () => {
    const baseTime = ctx.currentTime + 0.015;
    notes.forEach(({ freq, startOffset, duration, peakGain, type = 'sine' }) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, baseTime + startOffset);

        gain.gain.setValueAtTime(0.0001, baseTime + startOffset);
        gain.gain.exponentialRampToValueAtTime(peakGain, baseTime + startOffset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, baseTime + startOffset + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(baseTime + startOffset);
        osc.stop(baseTime + startOffset + duration + 0.02);
      } catch {
        // Ignore audio scheduling errors in restricted browser contexts
      }
    });
  };

  if (ctx.state === 'suspended') {
    ctx.resume().then(playNow).catch(() => {});
  } else {
    playNow();
  }
}

/**
 * Bright 2-note chime played on the Administrator view when a new idea is submitted.
 */
export function playNewSubmissionSound(): void {
  playToneSequence([
    { freq: 523.25, startOffset: 0, duration: 0.18, peakGain: 0.14, type: 'triangle' }, // C5
    { freq: 783.99, startOffset: 0.11, duration: 0.34, peakGain: 0.16, type: 'sine' }, // G5
  ]);
}

/**
 * Warm 3-note chime played on the Evaluator view when ideas are assigned to them.
 */
export function playEvaluatorAssignmentSound(): void {
  playToneSequence([
    { freq: 659.25, startOffset: 0, duration: 0.16, peakGain: 0.13, type: 'sine' }, // E5
    { freq: 830.61, startOffset: 0.1, duration: 0.18, peakGain: 0.14, type: 'sine' }, // G#5
    { freq: 987.77, startOffset: 0.21, duration: 0.36, peakGain: 0.16, type: 'triangle' }, // B5
  ]);
}
