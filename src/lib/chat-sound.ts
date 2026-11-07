// Small sounds for the chat assistant, made with the Web Audio API (no audio files to download).
//
// Browsers only allow sound after the visitor has clicked, tapped or pressed a key on the page.
// If the greeting appears before that, the chime waits for the visitor's first tap (if the
// greeting is still on screen) instead of being lost.

const MUTE_KEY = "pcbd-chat-sound";
let ctx: AudioContext | null = null;

export function soundEnabled() {
  try {
    return localStorage.getItem(MUTE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, on ? "on" : "off");
  } catch {
    /* private mode: setting just isn't remembered */
  }
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  return ctx;
}

// One soft note: quick fade-in, gentle fade-out.
function note(ac: AudioContext, freq: number, start: number, length: number, volume: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + length + 0.05);
}

const SOUNDS = {
  // "ding-dong": rising two-note chime for the greeting
  greet: (ac: AudioContext, t: number) => { note(ac, 659.25, t, 0.45, 0.12); note(ac, 987.77, t + 0.16, 0.7, 0.1); },
  // short soft pop when an answer arrives
  reply: (ac: AudioContext, t: number) => { note(ac, 880, t, 0.18, 0.06); note(ac, 1318.5, t + 0.06, 0.22, 0.04); },
};
export type ChatSound = keyof typeof SOUNDS;

function canPlayNow() {
  // Sticky user activation: the visitor has already interacted with this page.
  const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  return ua ? ua.hasBeenActive : false;
}

async function playNow(kind: ChatSound) {
  const ac = audio();
  if (!ac) return;
  if (ac.state === "suspended") await ac.resume().catch(() => {});
  if (ac.state !== "running") return;
  SOUNDS[kind](ac, ac.currentTime + 0.02);
}

/**
 * Plays a chat sound if the visitor hasn't muted it.
 * For the greeting: if the browser doesn't allow sound yet, it plays on the visitor's first
 * tap/click/key press, as long as `stillWanted()` is true. Returns a cleanup function.
 */
export function playChatSound(kind: ChatSound, stillWanted: () => boolean = () => true): () => void {
  if (typeof window === "undefined" || !soundEnabled()) return () => {};
  if (canPlayNow() || kind !== "greet") {
    playNow(kind);
    return () => {};
  }
  const events = ["pointerdown", "keydown", "touchend"] as const;
  const onFirst = () => {
    cleanup();
    // Unlock audio inside the tap itself (browsers require that), then decide after the tap has
    // been handled – so tapping the greeting's × closes it silently.
    const ac = audio();
    ac?.resume().catch(() => {});
    setTimeout(() => { if (stillWanted() && soundEnabled()) playNow(kind); }, 50);
  };
  const cleanup = () => events.forEach((e) => window.removeEventListener(e, onFirst, true));
  events.forEach((e) => window.addEventListener(e, onFirst, { capture: true, once: true }));
  return cleanup;
}
