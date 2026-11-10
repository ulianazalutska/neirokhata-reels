// The timeline follows the voiceover: each scene lasts as long as its voice line plus a short breath.
// Timings come from a timings.json ([{id, text, durationMs, words:[{text,start,end}]}]).
// setTimings() swaps the active timeline (each reel has its own); the exports below are live bindings.
import defaultTimings from '../public/voice/timings.json';

export const FPS = 30;
export const GAP = 8;   // frames of silence after each line
export const TAIL = 50; // extra frames to hold the last scene (the call to action)

export function buildScenes(timings) {
  let at = 0;
  return timings.map((t, i) => {
    const dur = Math.ceil((t.durationMs / 1000) * FPS) + GAP + (i === timings.length - 1 ? TAIL : 0);
    const s = { ...t, from: at, dur };
    at += dur;
    return s;
  });
}
export const totalOf = (timings) => {
  const sc = buildScenes(timings);
  return sc.length ? sc[sc.length - 1].from + sc[sc.length - 1].dur : FPS;
};

export let SCENES = [];
export let TOTAL = 1;
export let S = {};
let current = null;
export function setTimings(timings) {
  if (timings === current) return;
  current = timings;
  SCENES = buildScenes(timings);
  TOTAL = SCENES.length ? SCENES[SCENES.length - 1].from + SCENES[SCENES.length - 1].dur : FPS;
  S = Object.fromEntries(SCENES.map((s) => [s.id, s]));
}
setTimings(defaultTimings);
export const DEFAULT_TIMINGS = defaultTimings;

// frame at which `t` milliseconds into scene `sid` happen
export const ms = (sid, t) => S[sid].from + Math.round((t / 1000) * FPS);
// frame at which a word (lower-case, without punctuation) is spoken in scene `sid`
export const wordAt = (sid, text) => {
  const n = (x) => x.text.toLowerCase().replace(/[^\p{L}\d]/gu, '');
  const w = S[sid].words.find((x) => n(x) === text) || S[sid].words.find((x) => n(x).startsWith(text));
  return w ? ms(sid, w.start) : S[sid].from;
};
export const sceneAt = (frame) => SCENES.find((x) => frame >= x.from && frame < x.from + x.dur);
