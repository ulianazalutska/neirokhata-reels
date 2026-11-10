// Reel 1: MotionClone — hook → pain → solution → show → bonus → subscribe call to action.
// To make a new reel: change the lines in voice.py (and re-run it), then rewrite CAPTIONS, POSE, SFX and the scenes.
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { S, wordAt } from './timeline';
import {
  C, HEAD, BODY, ODD, sp, ease, clamp01, lerp, pressAt, r,
  Background, Caption, w, Avatar, Cursor, Plaque, AppWindow, Button, Toggle, Petals,
  Voice, Sounds, applySettings,
} from './kit';

// ---------------------------------------------------------------------------
// Words on screen (synced to the voice) and the mascot's pose per scene
// ---------------------------------------------------------------------------
const CAPTIONS = {
  hook: [[[w('крутий', { key: true }), w('рілс')], [w('як'), w('вони'), w('це'), w('зробили?')]]],
  pain: [[[w('вручну', { key: true })], [w('довго,'), w('кадр'), w('за'), w('кадром')]]],
  solution: [
    [[w('MotionClone', { key: true, at: 'моушн' })]],
    [[w('копіює', { key: true }), w('анімацію')]],
  ],
  show: [
    [[w('отримуєш'), w('проєкт', { key: true })]],
    [[w('текст'), w('кольори')], [w('картинки', { key: true })]],
  ],
  bonus: [
    [[w('локально', { key: true }), w('на'), w('Windows')]],
    [[w('3D', { key: true, at: 'тривимірна' })], [w('не ідеально', { at: 'неточною' })]],
  ],
  cta: [
    [[w('більше'), w('про'), w('нейромережі', { key: true })], [w('в'), w('Telegram', { at: 'telegram' })]],
    [[w('посилання', { key: true }), w('в'), w('шапці')], [w('профілю')]],
  ],
};
export const SCENE_IDS = ['hook', 'pain', 'solution', 'show', 'bonus', 'cta'];
export const POSE = { hook: 'shock', pain: 'sigh', solution: 'point', show: 'proud', bonus: 'thumbs', cta: 'wink' };

const CLICK = wordAt('solution', 'копіює');
const T_TEXT = wordAt('show', 'текст');
const T_COLOR = wordAt('show', 'кольори');
const T_PIC = wordAt('show', 'картинки');
const T_3D = wordAt('bonus', 'тривимірна');
const SUB = wordAt('cta', 'telegram');

const SFX = [
  { at: S.hook.from + 4, src: 'shimmer', v: 0.22 },
  { at: S.hook.from + 18, src: 'pop', v: 0.25 },
  { at: S.pain.from + 8, src: 'pop', v: 0.2 },
  { at: S.pain.from + 20, src: 'pop', v: 0.2 },
  { at: S.pain.from + 32, src: 'pop', v: 0.2 },
  { at: S.solution.from - 8, src: 'whoosh', v: 0.35 },
  { at: CLICK - 1, src: 'tap', v: 0.4 },
  { at: CLICK + 40, src: 'chime', v: 0.3 },
  { at: S.show.from - 8, src: 'whoosh', v: 0.3 },
  { at: T_TEXT, src: 'click', v: 0.25 },
  { at: T_COLOR, src: 'click', v: 0.25 },
  { at: T_PIC, src: 'click', v: 0.25 },
  { at: S.bonus.from + 6, src: 'pop', v: 0.22 },
  { at: T_3D, src: 'pop', v: 0.22 },
  { at: S.cta.from - 6, src: 'whoosh', v: 0.3 },
  { at: SUB - 1, src: 'tap', v: 0.4 },
  { at: SUB + 6, src: 'chime', v: 0.3 },
];

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------
const out = (frame, sid) => clamp01((frame - (S[sid].from + S[sid].dur)) / 8);

// 1. Hook — a video card and a big question mark
const Hook = ({ frame }) => {
  const a = S.hook.from;
  if (frame > S.pain.from + 8) return null;
  const p = sp(frame, a + 4, { damping: 12, stiffness: 120 });
  const q = sp(frame, a + 18, { damping: 8, stiffness: 160, mass: 0.7 });
  const o = out(frame, 'hook');
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - o, transform: `translateY(${o * -120}px)` }}>
      <div style={{ position: 'absolute', left: 250, top: 440, width: 580, height: 660, background: C.card, border: `2px solid ${C.border}`, borderRadius: 34, overflow: 'hidden', boxShadow: '0 40px 90px -40px rgba(239,27,3,.25)', transform: `scale(${0.7 + 0.3 * p}) rotate(${(1 - p) * -6}deg)`, opacity: clamp01(p * 2) }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ position: 'absolute', left: 60 + i * 120 + Math.sin(frame / 14 + i) * 18, top: 150 + (i % 2) * 120 + Math.cos(frame / 11 + i) * 24, width: 90, height: 90, borderRadius: i % 2 ? 20 : '50%', background: [C.rose, C.lilac, C.roseDeep, C.block][i] }} />
        ))}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 110, background: C.block, display: 'flex', alignItems: 'center', padding: '0 36px', gap: 24 }}>
          <svg width="40" height="44" viewBox="0 0 40 44"><path d="M6 4 L36 22 L6 40 Z" fill={C.roseDeep} /></svg>
          <div style={{ flex: 1, height: 10, borderRadius: 5, background: C.line }}>
            <div style={{ width: `${20 + 55 * ease(frame, a, a + 90)}%`, height: '100%', borderRadius: 5, background: C.rose }} />
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 640, top: 380, width: 190, height: 190, borderRadius: '50%', background: C.rose, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `800 150px ${HEAD}`, transform: `scale(${q}) rotate(${(1 - q) * 25 + 8}deg)`, opacity: clamp01(q * 2), boxShadow: '0 20px 50px -20px rgba(239,27,3,.6)' }}>?</div>
    </div>
  );
};

// 2. Pain — three manual steps
const Pain = ({ frame }) => {
  const a = S.pain.from;
  if (frame < a || frame > S.solution.from + 8) return null;
  const o = out(frame, 'pain');
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - o }}>
      {[['шрифт', 'підбирати вручну'], ['рухи', 'повторювати вручну'], ['таймінги', 'виставляти вручну']].map(([t, sub], i) => (
        <Plaque key={t} frame={frame} at={a + 8 + i * 12} y={430 + i * 190} title={t} sub={sub} />
      ))}
    </div>
  );
};

// 3. Solution — app window: paste a link, press the button
const LINK = 'youtube.com/watch?v=reel';
const Solution = ({ frame }) => {
  const a = S.solution.from;
  if (frame < a - 2 || frame > S.show.from + 8) return null;
  const o = out(frame, 'solution');
  const typeA = wordAt('solution', 'посилання');
  const typed = Math.round(LINK.length * ease(frame, typeA, typeA + 24));
  const btn = { x: 280, y: 330, w: 340, h: 84 };
  const go = ease(frame, typeA + 26, CLICK - 3);
  const prog = ease(frame, CLICK + 4, CLICK + 36);
  const done = sp(frame, CLICK + 38, { damping: 11, stiffness: 150 });
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - o, transform: `translateY(${-o * 300}px)` }}>
      <AppWindow frame={frame} at={a} title="MotionClone" y={430} height={640}>
        <div style={{ position: 'absolute', left: 40, top: 36, font: `500 28px ${BODY}`, color: C.muted }}>посилання на відео</div>
        <div style={{ position: 'absolute', left: 40, right: 40, top: 84, height: 84, borderRadius: ODD, background: C.block, border: `2px solid ${C.line}`, display: 'flex', alignItems: 'center', padding: '0 26px', font: `500 32px ${BODY}`, color: C.ink }}>
          {LINK.slice(0, typed)}
          <span style={{ width: 3, height: 40, background: C.rose, marginLeft: 3, opacity: typed < LINK.length && Math.floor(frame / 8) % 2 ? 0 : 1 }} />
        </div>
        <div style={{ position: 'absolute', left: 40, right: 40, top: 216, height: 14, borderRadius: 7, background: C.line }}>
          <div style={{ width: `${prog * 100}%`, height: '100%', borderRadius: 7, background: C.rose }} />
        </div>
        <div style={{ position: 'absolute', left: 40, right: 40, top: 262, height: 66, display: 'flex', alignItems: 'center', gap: 16, opacity: clamp01(done), transform: `scale(${0.85 + 0.15 * done})`, transformOrigin: '0 50%' }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: C.rose, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg>
          </div>
          <div style={{ font: `600 38px ${HEAD}`, color: C.roseDeep }}>анімацію скопійовано</div>
        </div>
        <Button {...btn} y={btn.y + 100} label="Клонувати" press={pressAt(frame, CLICK)} glow={clamp01(1 - Math.abs(frame - CLICK) / 20)} />
      </AppWindow>
      <Cursor x={lerp(980, 60 + btn.x + btn.w * 0.6, go)} y={lerp(1500, 430 + 52 + btn.y + 100 + btn.h * 0.45, go)} press={pressAt(frame, CLICK)} opacity={clamp01((frame - typeA) / 6) * (1 - ease(frame, CLICK + 10, CLICK + 30))} />
    </div>
  );
};

// 4. Show — the editable project: text, colour, picture change one by one
const Swap = ({ frame, at, from, to }) => {
  const t = sp(frame, at, { damping: 12, stiffness: 170, mass: 0.6 });
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{ opacity: 1 - clamp01(t * 2), transform: `translateY(${-t * 20}px)` }}>{from}</div>
      <div style={{ position: 'absolute', left: 0, top: 0, opacity: clamp01((t - 0.3) * 2), transform: `translateY(${(1 - t) * 24}px)` }}>{to}</div>
    </div>
  );
};

const Show = ({ frame }) => {
  const a = S.show.from;
  if (frame < a - 2 || frame > S.bonus.from + 8) return null;
  const o = out(frame, 'show');
  const col = ease(frame, T_COLOR, T_COLOR + 8);
  const pic = ease(frame, T_PIC, T_PIC + 8);
  const label = (t, i) => <div style={{ position: 'absolute', left: 40, top: 40 + i * 190, font: `500 26px ${BODY}`, color: C.muted }}>{t}</div>;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - o, transform: `translateY(${-o * 300}px)` }}>
      <AppWindow frame={frame} at={a} title="Проєкт" y={430} height={700}>
        {label('текст', 0)}
        <div style={{ position: 'absolute', left: 40, top: 84, font: `700 64px ${HEAD}`, color: C.ink }}>
          <Swap frame={frame} at={T_TEXT} from="Привіт" to="Нейрохата" />
        </div>
        {label('колір', 1)}
        <div style={{ position: 'absolute', left: 40, right: 40, top: 270, height: 96, borderRadius: ODD, background: `rgb(${lerp(239, 251, col)},${lerp(27, 118, col)},${lerp(3, 45, col)})` }} />
        {label('картинка', 2)}
        <div style={{ position: 'absolute', left: 40, top: 460, width: 160, height: 160, borderRadius: lerp(80, 28, pic), background: pic < 0.5 ? C.block : C.block2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: lerp(60, 90, pic), height: lerp(60, 50, pic), borderRadius: pic < 0.5 ? '50%' : 12, background: pic < 0.5 ? C.rose : C.roseDeep }} />
        </div>
      </AppWindow>
    </div>
  );
};

// 5. Bonus — two honest notes
const Bonus = ({ frame }) => {
  const a = S.bonus.from;
  if (frame < a || frame > S.cta.from + 8) return null;
  const o = out(frame, 'bonus');
  const on = ease(frame, a + 16, a + 26);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - o }}>
      <Plaque frame={frame} at={a + 6} y={470} title="Локально" sub="працює на Windows"><Toggle on={on} /></Plaque>
      <Plaque frame={frame} at={T_3D} y={700} title="Складне 3D" sub="може відновитись неточно" />
    </div>
  );
};

// 6. Call to action — channel card with a subscribe button
const Channel = ({ frame }) => {
  const a = S.cta.from;
  if (frame < a - 8) return null;
  const p = sp(frame, a - 4, { damping: 14, stiffness: 120 });
  const go = ease(frame, a + 4, SUB - 3);
  const done = clamp01((frame - SUB) / 6);
  const btn = { x: 255, y: 360, w: 360, h: 88 };
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', left: 90, top: 440, width: 900, height: 500, background: C.card, border: `2px solid ${C.border}`, borderRadius: '6px 34px 6px 34px', boxShadow: '0 40px 90px -40px rgba(239,27,3,.25)', zIndex: 460, transform: `translateY(${(1 - p) * 700}px)`, opacity: clamp01(p * 2) }}>
        <div style={{ position: 'absolute', left: 50, top: 50, width: 130, height: 130, borderRadius: '50%', background: C.rose, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `800 64px ${HEAD}` }}>Н</div>
        <div style={{ position: 'absolute', left: 210, top: 62, font: `700 52px ${HEAD}`, color: C.ink }}>Нейрохата</div>
        <div style={{ position: 'absolute', left: 210, top: 130, font: `500 28px ${BODY}`, color: C.muted }}>Telegram-канал про ШІ</div>
        <div style={{ position: 'absolute', left: 50, right: 50, top: 230, font: `500 32px/1.4 ${BODY}`, color: C.ink }}>Новини, інструменти й промпти простою українською</div>
        <Button {...btn} label={done > 0.5 ? 'Підписано' : 'Підписатися'} press={pressAt(frame, SUB)} glow={clamp01(1 - Math.abs(frame - SUB) / 20)} />
      </div>
      <Cursor x={lerp(980, 90 + btn.x + btn.w * 0.6, go)} y={lerp(1500, 440 + btn.y + btn.h * 0.45, go)} press={pressAt(frame, SUB)} opacity={clamp01((frame - a) / 6) * (1 - ease(frame, SUB + 12, SUB + 32))} />
      <Petals frame={frame} at={SUB + 6} x={540} y={780} />
    </div>
  );
};

// ---------------------------------------------------------------------------
export const Reel = ({ settings = {} }) => {
  applySettings(settings);
  const frame = useCurrentFrame();
  const pose = { ...POSE, ...(settings.poses || {}) };
  return (
    <AbsoluteFill style={{ fontFamily: BODY, overflow: 'hidden' }}>
      <Background frame={frame} />
      <Hook frame={frame} />
      <Pain frame={frame} />
      <Solution frame={frame} />
      <Show frame={frame} />
      <Bonus frame={frame} />
      <Channel frame={frame} />
      <Caption frame={frame} captions={CAPTIONS} pulse={['cta']} />
      <Avatar frame={frame} pose={pose} />
      <Voice />
      <Sounds sfx={SFX} />
    </AbsoluteFill>
  );
};
