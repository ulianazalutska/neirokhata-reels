// The timeline follows the voiceover: each scene lasts as long as its voice line (public/voice/timings.json,
// produced by voice.py) plus a short breath. Change the words in voice.py, re-run it, and everything re-times itself.
import timings from '../public/voice/timings.json';

export const FPS = 30;
export const GAP = 8;   // frames of silence after each line
export const TAIL = 50; // extra frames to hold the last scene (the call to action)

export const SCENES = (() => {
  let at = 0;
  return timings.map((t, i) => {
    const dur = Math.ceil((t.durationMs / 1000) * FPS) + GAP + (i === timings.length - 1 ? TAIL : 0);
    const s = { ...t, from: at, dur };
    at += dur;
    return s;
  });
})();
export const TOTAL = SCENES[SCENES.length - 1].from + SCENES[SCENES.length - 1].dur;
export const S = Object.fromEntries(SCENES.map((s) => [s.id, s]));

// frame at which `t` milliseconds into scene `sid` happen
export const ms = (sid, t) => S[sid].from + Math.round((t / 1000) * FPS);
// frame at which a word (lower-case, without punctuation) is spoken in scene `sid`
export const wordAt = (sid, text) => {
  const n = (x) => x.text.toLowerCase().replace(/[^\p{L}\d]/gu, '');
  const w = S[sid].words.find((x) => n(x) === text) || S[sid].words.find((x) => n(x).startsWith(text));
  return w ? ms(sid, w.start) : S[sid].from;
};
export const sceneAt = (frame) => SCENES.find((x) => frame >= x.from && frame < x.from + x.dur);
