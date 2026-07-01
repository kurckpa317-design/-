// Simple Web Audio API Synth for Retro 8-bit Medieval Sound Effects
// Works fully inside browser sandbox without external asset loading

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Helper to play a tone with custom properties
function playTone({
  frequency,
  duration,
  type = "sine",
  gainStart,
  gainEnd = 0.001,
  frequencyCurve,
}: {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  gainStart: number;
  gainEnd?: number;
  frequencyCurve?: number[];
}) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    
    if (frequencyCurve && frequencyCurve.length > 0) {
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(frequencyCurve[0], now);
      for (let i = 1; i < frequencyCurve.length; i++) {
        osc.frequency.exponentialRampToValueAtTime(
          frequencyCurve[i],
          now + (duration * i) / (frequencyCurve.length - 1)
        );
      }
    } else {
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    }

    gainNode.gain.setValueAtTime(gainStart, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(gainEnd, ctx.currentTime + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn("Audio playback failed or blocked by browser:", e);
  }
}

export const playSpawnSound = (unitType: string) => {
  switch (unitType) {
    case "sword":
      // Swish metallic swing
      playTone({
        frequency: 150,
        duration: 0.15,
        type: "sawtooth",
        gainStart: 0.08,
        frequencyCurve: [150, 450, 100],
      });
      break;
    case "archer":
      // Twang arrow shoot
      playTone({
        frequency: 400,
        duration: 0.18,
        type: "triangle",
        gainStart: 0.1,
        frequencyCurve: [400, 1200, 800],
      });
      break;
    case "tank":
      // Heavy shield drop
      playTone({
        frequency: 80,
        duration: 0.3,
        type: "square",
        gainStart: 0.12,
        frequencyCurve: [120, 80, 40],
      });
      break;
    case "mage":
      // Sparking magical windup
      playTone({
        frequency: 600,
        duration: 0.25,
        type: "sine",
        gainStart: 0.08,
        frequencyCurve: [300, 600, 1200],
      });
      break;
    case "assassin":
      // Stealthy swift slide
      playTone({
        frequency: 800,
        duration: 0.12,
        type: "sawtooth",
        gainStart: 0.07,
        frequencyCurve: [900, 300],
      });
      break;
    case "healer":
      // Sparkling holy swell
      playTone({
        frequency: 440,
        duration: 0.35,
        type: "sine",
        gainStart: 0.1,
        frequencyCurve: [440, 554, 659, 880],
      });
      break;
    default:
      playTone({ frequency: 220, duration: 0.2, gainStart: 0.05 });
  }
};

export const playHitSound = () => {
  // Short sharp thud/impact
  playTone({
    frequency: 180,
    duration: 0.08,
    type: "triangle",
    gainStart: 0.15,
    frequencyCurve: [180, 70],
  });
};

export const playCastleDamageSound = () => {
  // Low deep crumbling explosion
  playTone({
    frequency: 100,
    duration: 0.45,
    type: "sawtooth",
    gainStart: 0.22,
    frequencyCurve: [110, 50, 30],
  });
};

export const playHealSound = () => {
  // Divine sparkling chime
  playTone({
    frequency: 523, // C5
    duration: 0.22,
    type: "sine",
    gainStart: 0.12,
    frequencyCurve: [523, 659, 784, 1046],
  });
};

export const playTowerShootSound = () => {
  // Ballista or bow firing from tower
  playTone({
    frequency: 320,
    duration: 0.14,
    type: "triangle",
    gainStart: 0.08,
    frequencyCurve: [320, 700, 150],
  });
};

export const playVictorySound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 arpeggio
  notes.forEach((freq, idx) => {
    setTimeout(() => {
      playTone({
        frequency: freq,
        duration: 0.4,
        type: "triangle",
        gainStart: 0.15,
      });
    }, idx * 150);
  });
};

export const playDefeatSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [196.00, 164.81, 130.81, 98.00]; // descending melancholy
  notes.forEach((freq, idx) => {
    setTimeout(() => {
      playTone({
        frequency: freq,
        duration: 0.5,
        type: "sawtooth",
        gainStart: 0.15,
      });
    }, idx * 200);
  });
};
