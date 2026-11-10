// Reusable pieces of the blog's reels: palette, fonts, background, voice-synced captions, the character,
// cursor, plaques, app window, comments call-to-action, petals and soft sound effects.
// A new video only writes its own scenes in Reel.jsx and reuses everything here.
import { AbsoluteFill, Audio, Img, Sequence, interpolate, Easing, random, spring, staticFile } from 'remotion';
import { loadFont as loadOnest } from '@remotion/google-fonts/Onest';
import { loadFont as loadGolos } from '@remotion/google-fonts/GolosText';
import { FPS, SCENES, S, ms, sceneAt } from './timeline';

export const { fontFamily: HEAD } = loadOnest('normal', { weights: ['600', '700', '800'], subsets: ['cyrillic', 'latin'] });
export const { fontFamily: BODY } = loadGolos('normal', { weights: ['400', '500', '600', '700'], subsets: ['cyrillic', 'latin'] });

// Neirokhata palette (see style.md)
export const C = {
  bg: '#FEFFFA', block: '#FCE9E4', block2: '#FFEEDF', ink: '#150403', muted: '#6E4F4A',
  rose: '#EF1B03', roseDeep: '#A50302', lilac: '#FB762D', line: '#F2D5CD',
  card: '#FFFFFF', // cards and windows
  border: '#F43D0E', // thin border of cards and windows
};
export const ODD = '6px 30px 6px 30px';

// ---------------------------------------------------------------------------
// Settings from the dashboard studio (inputProps.settings). Defaults = the Нейрохата style.
// ---------------------------------------------------------------------------
export const DEFAULT_C = { ...C };
export const SET = { blobs: 1, sfx: true, sfxVol: 1, voiceVol: 1, captionScale: 1, voiceBase: '' };
export const DEFAULT_SET = { ...SET };
export function applySettings(st = {}) {
  Object.assign(C, DEFAULT_C, st.colors || {});
  Object.assign(SET, DEFAULT_SET, st);
}
// asset path: staticFile in Remotion, BASE_URL in the web studio
const asset = (p) => (typeof window !== 'undefined' && window.__NH_BASE__ ? window.__NH_BASE__ + p : staticFile(p)); // the signature asymmetric corners

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export const sp = (frame, start, config = { damping: 15, stiffness: 120, mass: 0.8 }) =>
  spring({ frame: frame - start, fps: FPS, config });
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const r = (i, k) => random(`${k}-${i}`);
export const ease = (frame, a, b) => interpolate(frame, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
export const fmt = (n) => Math.round(n).toLocaleString('uk-UA').replace(/ /g, ' ');
export const pressAt = (frame, at) => clamp01(1 - Math.abs(frame - at) / 4);

// ---------------------------------------------------------------------------
// Background: cream paper, faint grid, slow soft blobs
// ---------------------------------------------------------------------------
export const Background = ({ frame }) => (
  <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
    {[
      { c: C.block, x: 180, y: 380, s: 760, k: 0 },
      { c: C.block2, x: 900, y: 1100, s: 820, k: 2 },
      { c: C.block, x: 300, y: 1650, s: 700, k: 4 },
    ].map((b, i) => (
      <div key={i} style={{
        position: 'absolute', width: b.s, height: b.s, borderRadius: '50%', background: b.c, filter: 'blur(90px)', opacity: 0.9 * SET.blobs,
        left: b.x - b.s / 2 + Math.sin(frame / 70 + b.k) * 60, top: b.y - b.s / 2 + Math.cos(frame / 80 + b.k) * 50,
      }} />
    ))}
    <AbsoluteFill style={{
      backgroundImage: `linear-gradient(${C.line}88 1.5px, transparent 1.5px), linear-gradient(90deg, ${C.line}88 1.5px, transparent 1.5px)`,
      backgroundSize: '72px 72px', backgroundPosition: '-1px -1px',
    }} />
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------
// Captions
// captions = { [sceneId]: [group, group, …] }, group = [line, line], line = [w('слово'), w('ключ', { key: true })]
// Every word appears when it is spoken. A later group replaces the previous one when its first word is spoken.
// `at` lets an on-screen word sync to a different spoken word (e.g. '2 347' → at: 'дві').
// ---------------------------------------------------------------------------
export const w = (t, extra) => ({ t, ...extra });
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\d]/gu, '');

function captionTimes(sid, groups) {
  const words = S[sid].words;
  let idx = 0, last = S[sid].from;
  return groups.map((group, gi) => {
    const lines = group.map((line) => line.map((tok) => {
      const target = norm(tok.at || tok.t);
      let found = -1;
      for (let j = idx; j < words.length; j++) {
        const wn = norm(words[j].text);
        if (wn === target || (target.length >= 3 && wn.startsWith(target))) { found = j; break; }
      }
      if (found >= 0) { idx = found + 1; last = ms(sid, words[found].start) - 2; }
      else last += 4;
      return { ...tok, at: Math.max(S[sid].from, last) };
    }));
    const longest = Math.max(...group.map((line) => line.map((x) => x.t).join(' ').length));
    return { lines, start: gi === 0 ? S[sid].from : lines[0][0].at, size: Math.min(74, Math.round(940 / (longest * 0.85))) };
  });
}
const timesCache = new Map();
const timesFor = (captions) => {
  if (!timesCache.has(captions)) timesCache.set(captions, Object.fromEntries(Object.entries(captions).map(([k, g]) => [k, captionTimes(k, g)])));
  return timesCache.get(captions);
};

const Handles = ({ p }) => (
  <>
    {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([hx, hy], i) => (
      <div key={i} style={{
        position: 'absolute', width: 16, height: 16, background: C.card, border: `3px solid ${C.lilac}`, borderRadius: 3,
        left: hx ? undefined : -10, right: hx ? -10 : undefined, top: hy ? undefined : -10, bottom: hy ? -10 : undefined,
        transform: `scale(${p})`,
      }} />
    ))}
    <div style={{ position: 'absolute', inset: -2, border: `2.5px solid ${C.lilac}`, borderRadius: ODD, opacity: p }} />
  </>
);

const Word = ({ tok, frame, pulse }) => {
  const p = sp(frame, tok.at, { damping: 13, stiffness: 170, mass: 0.6 });
  const o = clamp01((frame - tok.at) / 5);
  const base = {
    display: 'inline-block', margin: '0 12px', opacity: o, position: 'relative',
    transform: `translateY(${(1 - p) * 40}px) scale(${0.85 + 0.15 * p})`, filter: `blur(${(1 - o) * 8}px)`,
  };
  if (!tok.key) return <span style={base}>{tok.t}</span>;
  const h = sp(frame, tok.at + 8, { damping: 12, stiffness: 160 });
  const beat = pulse ? 1 + Math.max(0, Math.sin((frame - tok.at) / 4)) * 0.04 : 1;
  return (
    <span style={{ ...base, transform: `${base.transform} scale(${beat})` }}>
      <span style={{ position: 'relative', display: 'inline-block', background: C.roseDeep, color: '#fff', padding: '4px 22px 10px', borderRadius: ODD }}>
        {tok.t}
        <Handles p={h} />
      </span>
    </span>
  );
};

// `pulse`: scene ids whose key word keeps gently pulsing (the call to action)
export const Caption = ({ frame, captions, pulse = [], top = 110 }) => {
  const s = sceneAt(frame);
  if (!s || !captions[s.id]) return null;
  const groups = timesFor(captions)[s.id];
  const gi = groups.reduce((acc, g, i) => (frame >= g.start ? i : acc), 0);
  const last = s === SCENES[SCENES.length - 1];
  const block = (g, out) => (
    <div style={{
      position: 'absolute', top, left: 40, right: 40, textAlign: 'center',
      font: `600 ${Math.round(g.size * SET.captionScale)}px/1.28 ${HEAD}`, color: C.ink, letterSpacing: '-0.01em',
      opacity: 1 - out, transform: `translateY(${-out * 30}px)`, filter: `blur(${out * 10}px)`,
    }}>
      {g.lines.map((line, li) => (
        <div key={li}>{line.map((tok, ti) => <Word key={ti} tok={tok} frame={frame} pulse={pulse.includes(s.id)} />)}</div>
      ))}
    </div>
  );
  const sceneOut = last ? 0 : clamp01((frame - (s.from + s.dur - 7)) / 7);
  const prevOut = gi > 0 ? clamp01((frame - groups[gi].start) / 6) : 1;
  return (
    <>
      {prevOut < 1 && block(groups[gi - 1], prevOut)}
      {block(groups[gi], sceneOut)}
    </>
  );
};

// ---------------------------------------------------------------------------
// The character (see character.md): one pose per scene, pops in, breathes, sways, bounces on each word
// pose = { [sceneId]: 'shock' | 'sigh' | 'proud' | 'point' | 'thumbs' | 'wink' }
// ---------------------------------------------------------------------------
function talk(s, frame) {
  const t = ((frame - s.from) / FPS) * 1000;
  const x = s.words.find((w2) => t >= w2.start && t <= w2.end);
  return x ? Math.sin(((t - x.start) / Math.max(1, x.end - x.start)) * Math.PI) : 0;
}

export const Avatar = ({ frame, pose }) => {
  const k = Math.max(0, SCENES.findIndex((x) => frame >= x.from && frame < x.from + x.dur));
  const s = SCENES[k];
  const prev = SCENES[k - 1];
  const first = k === 0;
  const pop = sp(frame, s.from, first ? { damping: 13, stiffness: 90 } : { damping: 9, stiffness: 190, mass: 0.6 });
  const fadePrev = 1 - clamp01((frame - s.from) / 4);
  const breathe = Math.sin((frame / FPS) * Math.PI * 0.9) * 0.012;
  const sway = Math.sin(frame / 38) * 1.4;
  const v = talk(s, frame);
  const body = (img) => (
    <Img src={asset(`avatar/${img}.png`)} style={{
      position: 'absolute', bottom: 0, left: 0, width: '100%',
      transform: `translateY(${-v * 10}px) rotate(${sway}deg) scale(${1 - breathe + v * 0.012}, ${1 + breathe + v * 0.022})`,
      transformOrigin: '50% 100%',
    }} />
  );
  const enter = first ? `translateY(${(1 - pop) * 760}px)` : `translateY(${(1 - pop) * 50}px) scale(${0.88 + 0.12 * pop})`;
  return (
    <div style={{ position: 'absolute', left: 160, bottom: -30, width: 760, height: 760 }}>
      {prev && fadePrev > 0 && pose[prev.id] !== pose[s.id] && <div style={{ position: 'absolute', inset: 0, opacity: fadePrev }}>{body(pose[prev.id])}</div>}
      <div style={{ position: 'absolute', inset: 0, transform: enter, transformOrigin: '50% 100%', opacity: first ? 1 : clamp01(pop * 3) }}>{body(pose[s.id])}</div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Pointer cursor (press: 0..1, use pressAt(frame, clickFrame))
// ---------------------------------------------------------------------------
export const Cursor = ({ x, y, press = 0, opacity = 1 }) => (
  <svg width="64" height="64" viewBox="0 0 40 44" style={{ position: 'absolute', left: x - 6, top: y - 4, opacity, zIndex: 500, transform: `scale(${1 - press * 0.18})`, transformOrigin: '6px 4px', filter: 'drop-shadow(0 6px 10px rgba(21,4,3,.3))' }}>
    <path d="M5 3 L5 33 L13 25.5 L19 39 L25.5 36 L19.5 23 L30 23 Z" fill={C.ink} stroke="#fff" strokeWidth="2.6" strokeLinejoin="round" />
  </svg>
);

// ---------------------------------------------------------------------------
// Plaque: powder block with asymmetric corners, slides in from the right
// ---------------------------------------------------------------------------
export const Plaque = ({ frame, at, y, title, sub, children, x = 110, width = 860 }) => {
  const p = sp(frame, at, { damping: 14, stiffness: 120 });
  return (
    <div style={{ position: 'absolute', left: x, top: y, width, background: C.block, borderRadius: ODD, padding: '30px 36px', transform: `translateX(${(1 - p) * 900}px)`, opacity: clamp01(p * 2), display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={{ flex: 1 }}>
        <div style={{ font: `600 46px/1.2 ${HEAD}`, color: C.ink }}>{title}</div>
        {sub && <div style={{ font: `500 28px/1.4 ${BODY}`, color: C.muted, marginTop: 6 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
};

// Toggle switch (on: 0..1)
export const Toggle = ({ on }) => (
  <div style={{ width: 150, height: 82, borderRadius: 41, background: on > 0.5 ? C.rose : C.line, position: 'relative', flex: 'none' }}>
    <div style={{ position: 'absolute', top: 8, left: lerp(8, 76, on), width: 66, height: 66, borderRadius: '50%', background: '#fff', boxShadow: '0 4px 10px rgba(21,4,3,.2)' }} />
  </div>
);

// Primary button
export const Button = ({ x, y, w: bw = 220, h = 64, label, press = 0, glow = 0 }) => (
  <div style={{
    position: 'absolute', left: x, top: y, width: bw, height: h, borderRadius: '6px 22px 6px 22px',
    background: C.roseDeep, color: '#fff', font: `600 26px ${BODY}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
    transform: `scale(${1 - press * 0.1 + glow * 0.03})`, boxShadow: `0 0 0 ${glow * 10}px ${C.rose}33`,
  }}>{label}</div>
);

// ---------------------------------------------------------------------------
// App window: mac-like card that slides up at `at`. Children are positioned inside it.
// ---------------------------------------------------------------------------
export const AppWindow = ({ frame, at, title, x = 60, y = 350, width = 960, height = 840, children }) => {
  const p = sp(frame, at, { damping: 16, stiffness: 110 });
  if (p <= 0.001) return null;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width, height, background: C.card, borderRadius: 34, border: `2px solid ${C.border}`, boxShadow: '0 40px 90px -40px rgba(239,27,3,.2)', overflow: 'hidden', transform: `translateY(${(1 - p) * 1100}px)`, opacity: clamp01(p * 2) }}>
      <div style={{ height: 52, background: C.bg, borderBottom: `2px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 24, display: 'flex', gap: 12 }}>
          {[C.rose, C.line, C.lilac].map((c, i) => <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ font: `600 22px ${HEAD}`, color: C.ink }}>{title}</div>
      </div>
      <div style={{ position: 'absolute', inset: '52px 0 0 0' }}>{children}</div>
    </div>
  );
};

// Number that counts up from 0 between frames a and b
export const CountUp = ({ frame, a, b, to, style }) => <span style={{ fontVariantNumeric: 'tabular-nums', ...style }}>{fmt(to * ease(frame, a, b))}</span>;

// ---------------------------------------------------------------------------
// Flower logo and a burst of petals
// ---------------------------------------------------------------------------
export const Flower = ({ size }) => (
  <svg width={size} height={size} viewBox="-50 -50 100 100">
    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
      <ellipse key={a} rx="11" ry="21" cy="-22" transform={`rotate(${a})`} fill={C.rose} fillOpacity={0.55 + (a % 90 ? 0 : 0.2)} stroke="#fff" strokeWidth="1.5" />
    ))}
    <circle r="9" fill={C.lilac} />
    <circle r="5" fill={C.lilac} />
  </svg>
);

export const Petals = ({ frame, at, x, y, count = 30, dur = 75 }) => {
  if (frame < at || frame > at + dur) return null;
  const cols = [C.rose, C.roseDeep, C.lilac, C.line, C.block2];
  return Array.from({ length: count }, (_, i) => {
    const t = (frame - at) / dur;
    const ang = r(i, 'pa2') * Math.PI * 2, d = 260 + r(i, 'pd2') * 420;
    const px = x + Math.cos(ang) * d * Math.min(1, t * 1.8);
    const py = y + Math.sin(ang) * d * Math.min(1, t * 1.8) - 80 * Math.sin(t * Math.PI) + t * t * 380;
    return <div key={i} style={{ position: 'absolute', left: px, top: py, width: 30, height: 30, borderRadius: '70% 0 70% 0', background: cols[i % cols.length], transform: `rotate(${t * 720 + i * 40}deg)`, opacity: 1 - clamp01((t - 0.7) / 0.3), zIndex: 450 }} />;
  });
};

// ---------------------------------------------------------------------------
// Call to action: comments card where someone types the keyword and the author replies.
// typeAt: frame when the keyword starts being typed (usually wordAt(lastScene, keyword)).
// ---------------------------------------------------------------------------
const Bubble = ({ frame, at, who, text, author, tint }) => {
  const p = sp(frame, at, { damping: 13, stiffness: 150 });
  if (p <= 0.001) return null;
  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', marginBottom: 26, opacity: clamp01(p * 2), transform: `translateY(${(1 - p) * 40}px) scale(${0.94 + 0.06 * p})`, transformOrigin: '0 50%' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: tint, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `600 26px ${HEAD}`, color: '#fff' }}>{who[0].toUpperCase()}</div>
      <div>
        <div style={{ font: `600 26px ${BODY}`, color: C.ink }}>
          {who}{author && <span style={{ marginLeft: 12, background: C.block2, color: C.lilac, borderRadius: 8, padding: '2px 10px', font: `600 20px ${BODY}` }}>адмін</span>}
        </div>
        <div style={{ font: `500 32px/1.35 ${BODY}`, color: C.ink, marginTop: 4 }}>{text}</div>
      </div>
    </div>
  );
};

export const ctaTimes = (typeAt, keyword) => {
  const send = typeAt + keyword.length * 3 + 4;
  return { send, reply: send + 28 };
};

export const CommentsCTA = ({ frame, at, typeAt, keyword, question, reply, author = 'Нейрохата' }) => {
  if (frame < at) return null;
  const { send, reply: replyAt } = ctaTimes(typeAt, keyword);
  const p = sp(frame, at + 2, { damping: 15, stiffness: 110 });
  const typed = keyword.slice(0, Math.max(0, Math.floor((frame - typeAt) / 3) + 1));
  const sent = frame >= send + 2;
  return (
    <div style={{ position: 'absolute', left: 90, top: 520, width: 900, height: 640, background: C.card, border: `2px solid ${C.border}`, borderRadius: '6px 34px 6px 34px', padding: '30px 36px', transform: `translateY(${(1 - p) * 700}px)`, boxShadow: '0 40px 90px -40px rgba(239,27,3,.2)' }}>
      <div style={{ font: `600 30px ${HEAD}`, color: C.ink, paddingBottom: 20, borderBottom: `2px solid ${C.border}`, marginBottom: 28 }}>Коментарі</div>
      {question && <Bubble frame={frame} at={at + 10} who="олена" text={question} tint={C.lilac} />}
      <Bubble frame={frame} at={send + 2} who="ти" text={keyword} tint={C.rose} />
      <Bubble frame={frame} at={replyAt} who={author} text={reply} author tint={C.roseDeep} />
      <div style={{ position: 'absolute', left: 36, right: 36, bottom: 30, height: 86, borderRadius: 43, border: `2px solid ${C.border}`, background: C.bg, display: 'flex', alignItems: 'center', padding: '0 14px 0 30px' }}>
        <div style={{ flex: 1, font: `500 32px ${BODY}`, color: !sent && frame >= typeAt ? C.ink : C.muted }}>
          {!sent && frame >= typeAt ? typed : 'Додай коментар…'}
          {!sent && frame >= typeAt - 10 && Math.floor(frame / 8) % 2 === 0 && <span style={{ color: C.rose }}>|</span>}
        </div>
        <div style={{ width: 62, height: 62, borderRadius: '50%', background: C.roseDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 - pressAt(frame, send) * 0.2})` }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        </div>
      </div>
    </div>
  );
};

// sound cues for CommentsCTA
export const ctaSfx = (at, typeAt, keyword) => {
  const { send, reply } = ctaTimes(typeAt, keyword);
  return [
    { at: at - 6, src: 'whoosh', v: 0.22 },
    { at: at + 10, src: 'pop', v: 0.25 },
    ...[...keyword].map((_, k) => ({ at: typeAt + k * 3, src: 'click', v: 0.1 })),
    { at: send, src: 'tap', v: 0.3 },
    { at: send + 2, src: 'pop', v: 0.28 },
    { at: reply, src: 'pop', v: 0.28 },
  ];
};

// ---------------------------------------------------------------------------
// Audio: voice lines per scene + soft effects, which duck a little while the voice talks
// sfx = [{ at: frame, src: 'whoosh' | 'shimmer' | 'tap' | 'drop0'..'drop5' | 'chime' | 'click' | 'pop', v: volume }]
// ---------------------------------------------------------------------------
function voiceActive(frame) {
  const s = sceneAt(frame);
  if (!s) return false;
  const t = ((frame - s.from) / FPS) * 1000;
  return s.words.some((x) => t >= x.start - 100 && t <= x.end + 150);
}
const duck = (frame) => (voiceActive(frame) ? 0.65 : 1);

// voiceBase: '' = public/voice; 'static:reelvoice/' = staticFile folder (render); 'https://…/' = remote folder (studio)
const voiceSrc = (id) => {
  const b = SET.voiceBase;
  if (!b) return asset(`voice/${id}.mp3`);
  if (b.startsWith('static:')) return staticFile(b.slice(7) + id + '.mp3');
  return b + id + '.mp3';
};
export const Voice = () => SCENES.map((s) => (
  <Sequence key={s.id} from={s.from} durationInFrames={s.dur}>
    <Audio src={voiceSrc(s.id)} volume={SET.voiceVol} />
  </Sequence>
));

export const Sounds = ({ sfx }) => (!SET.sfx ? null : sfx.map((e, i) => (
  <Sequence key={i} from={Math.max(0, e.at)} durationInFrames={90}>
    <Audio src={asset(`sfx/${e.src}.wav`)} volume={(f) => Math.min(1, e.v * SET.sfxVol * duck(Math.max(0, e.at) + f))} />
  </Sequence>
)));
