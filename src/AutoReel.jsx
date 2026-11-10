// A reel built from data (reels/<id>/script.json + timings.json): every scene picks one ready visual preset.
// script = { title, scenes: [{ id, voice, caption: [["слово", "*ключ"], ["другий", "рядок"]], pose, visual: { type, ... } }] }
// Visual presets: big · plaques · app · toggles · list · cta. All keep the Нейрохата look from kit.jsx.
import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { S, setTimings } from './timeline';
import {
  C, HEAD, BODY, ODD, sp, ease, clamp01, lerp, pressAt,
  Background, Caption, w, Avatar, Cursor, Plaque, AppWindow, Button, Toggle, Petals,
  Voice, Sounds, applySettings,
} from './kit';

const norm = (s) => String(s).toLowerCase().replace(/[^\p{L}\d]/gu, '');

// frame when a word (or its prefix) is spoken in scene sid; falls back to a fraction of the scene
function wordFrame(sid, text, frac = 0.5) {
  const s = S[sid];
  if (!s) return 0;
  const t = norm(text);
  const hit = t && (s.words.find((x) => norm(x.text) === t) || s.words.find((x) => norm(x.text).startsWith(t.slice(0, Math.max(3, t.length - 2)))));
  return hit ? s.from + Math.round((hit.start / 1000) * 30) : s.from + Math.round(s.dur * frac);
}

function buildCaptions(script) {
  const out = {};
  for (const sc of script.scenes) {
    const lines = (sc.caption || []).filter((l) => l && l.length).slice(0, 2).map((line) => line.map((raw) => {
      const key = String(raw).startsWith('*');
      const t = key ? String(raw).slice(1) : String(raw);
      return w(t, key ? { key: true } : undefined);
    }));
    if (lines.length) out[sc.id] = [lines];
  }
  return out;
}

const out = (frame, sid) => (S[sid] ? clamp01((frame - (S[sid].from + S[sid].dur)) / 8) : 0);
const visible = (frame, sid, pre = 2) => S[sid] && frame >= S[sid].from - pre && frame <= S[sid].from + S[sid].dur + 8;
const keyWord = (sc) => {
  for (const l of sc.caption || []) for (const x of l) if (String(x).startsWith('*')) return String(x).slice(1);
  return '';
};

// --- presets ----------------------------------------------------------------
const Big = ({ frame, sc }) => {
  const a = S[sc.id].from;
  const v = sc.visual || {};
  const p = sp(frame, a + 4, { damping: 12, stiffness: 120 });
  const o = out(frame, sc.id);
  const value = String(v.value ?? '?');
  const size = value.length <= 3 ? 190 : value.length <= 6 ? 130 : 84;
  return (
    <div style={{ position: 'absolute', left: 120, top: 470, width: 840, padding: '56px 40px', background: C.card, border: `2px solid ${C.border}`, borderRadius: ODD, textAlign: 'center', boxShadow: '0 40px 90px -40px rgba(239,27,3,.3)', transform: `scale(${0.7 + 0.3 * p}) translateY(${o * -120}px)`, opacity: clamp01(p * 2) * (1 - o) }}>
      <div style={{ font: `800 ${size}px/1 ${HEAD}`, color: C.roseDeep }}>{value}</div>
      {v.label && <div style={{ font: `500 40px/1.3 ${BODY}`, color: C.muted, marginTop: 18 }}>{v.label}</div>}
    </div>
  );
};

const Plaques = ({ frame, sc }) => {
  const a = S[sc.id].from;
  const items = (sc.visual?.items || []).slice(0, 3);
  const o = out(frame, sc.id);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - o }}>
      {items.map((it, i) => <Plaque key={i} frame={frame} at={a + 8 + i * 12} y={440 + i * 190} title={it.title} sub={it.sub} />)}
    </div>
  );
};

const App = ({ frame, sc }) => {
  const a = S[sc.id].from;
  const v = sc.visual || {};
  const o = out(frame, sc.id);
  const click = wordFrame(sc.id, keyWord(sc), 0.55);
  const btn = { x: 300, y: 300, w: 360, h: 84 };
  const go = ease(frame, a + 6, click - 3);
  const done = sp(frame, click + 6, { damping: 11, stiffness: 150 });
  const lines = (v.lines || []).slice(0, 3);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - o, transform: `translateY(${-o * 300}px)` }}>
      <AppWindow frame={frame} at={a} title={v.title || ''} y={430} height={640}>
        <div style={{ position: 'absolute', left: 40, top: 34, font: `500 28px ${BODY}`, color: C.muted }}>{v.label || ''}</div>
        <div style={{ position: 'absolute', left: 40, right: 40, top: 76, font: `700 46px/1.15 ${HEAD}`, color: C.ink }}>{v.text || ''}</div>
        {lines.map((t, i) => (
          <div key={i} style={{ position: 'absolute', left: 40, right: 40, top: 160 + i * 44, font: `500 28px ${BODY}`, color: C.muted, opacity: clamp01((frame - a - 10 - i * 6) / 8) }}>• {t}</div>
        ))}
        <Button {...btn} label={v.button || 'Почати'} press={pressAt(frame, click)} glow={clamp01(1 - Math.abs(frame - click) / 20)} />
        <div style={{ position: 'absolute', left: 40, right: 40, top: 420, display: 'flex', alignItems: 'center', gap: 16, opacity: clamp01(done), transform: `scale(${0.85 + 0.15 * done})`, transformOrigin: '0 50%' }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: C.rose, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg>
          </div>
          <div style={{ font: `600 36px/1.2 ${HEAD}`, color: C.roseDeep }}>{v.result || 'готово'}</div>
        </div>
      </AppWindow>
      <Cursor x={lerp(980, 60 + btn.x + btn.w * 0.6, go)} y={lerp(1500, 430 + 52 + btn.y + btn.h * 0.45, go)} press={pressAt(frame, click)} opacity={clamp01((frame - a) / 6) * (1 - ease(frame, click + 10, click + 30))} />
    </div>
  );
};

const Toggles = ({ frame, sc }) => {
  const a = S[sc.id].from;
  const items = (sc.visual?.items || []).slice(0, 3);
  const o = out(frame, sc.id);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: 1 - o }}>
      {items.map((it, i) => (
        <Plaque key={i} frame={frame} at={a + 6 + i * 14} y={460 + i * 200} title={it.title} sub={it.sub}>
          <Toggle on={ease(frame, a + 18 + i * 14, a + 28 + i * 14)} />
        </Plaque>
      ))}
    </div>
  );
};

const List = ({ frame, sc }) => {
  const a = S[sc.id].from;
  const v = sc.visual || {};
  const items = (v.items || []).slice(0, 4);
  const p = sp(frame, a, { damping: 15, stiffness: 120 });
  const o = out(frame, sc.id);
  return (
    <div style={{ position: 'absolute', left: 90, top: 430, width: 900, background: C.card, border: `2px solid ${C.border}`, borderRadius: '6px 34px 6px 34px', padding: '36px 40px', boxShadow: '0 40px 90px -40px rgba(239,27,3,.25)', transform: `translateY(${(1 - p) * 700 - o * 200}px)`, opacity: clamp01(p * 2) * (1 - o) }}>
      {v.title && <div style={{ font: `700 44px/1.2 ${HEAD}`, color: C.ink, marginBottom: 24 }}>{v.title}</div>}
      {items.map((t, i) => {
        const q = sp(frame, a + 14 + i * 12, { damping: 12, stiffness: 160 });
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '14px 0', borderTop: i ? `2px solid ${C.line}` : 'none', opacity: clamp01(q * 2), transform: `translateX(${(1 - q) * 60}px)` }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: C.rose, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${q})` }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5 5L20 6.5" /></svg>
            </div>
            <div style={{ font: `500 36px/1.25 ${BODY}`, color: C.ink }}>{t}</div>
          </div>
        );
      })}
    </div>
  );
};

const Cta = ({ frame, sc }) => {
  const a = S[sc.id].from;
  const sub = wordFrame(sc.id, 'telegram', 0.45);
  const p = sp(frame, a - 4, { damping: 14, stiffness: 120 });
  const go = ease(frame, a + 4, sub - 3);
  const done = clamp01((frame - sub) / 6);
  const btn = { x: 255, y: 360, w: 360, h: 88 };
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', left: 90, top: 440, width: 900, height: 500, background: C.card, border: `2px solid ${C.border}`, borderRadius: '6px 34px 6px 34px', boxShadow: '0 40px 90px -40px rgba(239,27,3,.25)', zIndex: 460, transform: `translateY(${(1 - p) * 700}px)`, opacity: clamp01(p * 2) }}>
        <div style={{ position: 'absolute', left: 50, top: 50, width: 130, height: 130, borderRadius: '50%', background: C.rose, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `800 64px ${HEAD}` }}>Н</div>
        <div style={{ position: 'absolute', left: 210, top: 62, font: `700 52px ${HEAD}`, color: C.ink }}>Нейрохата</div>
        <div style={{ position: 'absolute', left: 210, top: 130, font: `500 28px ${BODY}`, color: C.muted }}>Telegram-канал про ШІ</div>
        <div style={{ position: 'absolute', left: 50, right: 50, top: 230, font: `500 32px/1.4 ${BODY}`, color: C.ink }}>Новини, інструменти й промпти простою українською</div>
        <Button {...btn} label={done > 0.5 ? 'Підписано' : 'Підписатися'} press={pressAt(frame, sub)} glow={clamp01(1 - Math.abs(frame - sub) / 20)} />
      </div>
      <Cursor x={lerp(980, 90 + btn.x + btn.w * 0.6, go)} y={lerp(1500, 440 + btn.y + btn.h * 0.45, go)} press={pressAt(frame, sub)} opacity={clamp01((frame - a) / 6) * (1 - ease(frame, sub + 12, sub + 32))} />
      <Petals frame={frame} at={sub + 6} x={540} y={780} />
    </div>
  );
};

const PRESETS = { big: Big, plaques: Plaques, app: App, toggles: Toggles, list: List, cta: Cta };

function buildSfx(script) {
  const fx = [];
  script.scenes.forEach((sc, i) => {
    const s = S[sc.id];
    if (!s) return;
    const t = sc.visual?.type;
    if (i === 0) fx.push({ at: s.from + 2, src: 'shimmer', v: 0.22 });
    if (t === 'app' || t === 'list' || t === 'cta') fx.push({ at: s.from - 6, src: 'whoosh', v: 0.32 });
    if (t === 'big') fx.push({ at: s.from + 6, src: 'pop', v: 0.25 });
    if (t === 'plaques' || t === 'toggles') (sc.visual.items || []).slice(0, 3).forEach((_, k) => fx.push({ at: s.from + 8 + k * 12, src: 'pop', v: 0.2 }));
    if (t === 'toggles') (sc.visual.items || []).slice(0, 3).forEach((_, k) => fx.push({ at: s.from + 20 + k * 14, src: 'click', v: 0.25 }));
    if (t === 'list') (sc.visual.items || []).slice(0, 4).forEach((_, k) => fx.push({ at: s.from + 14 + k * 12, src: 'drop' + (k % 6), v: 0.22 }));
    if (t === 'app') { const c = wordFrame(sc.id, keyWord(sc), 0.55); fx.push({ at: c - 1, src: 'tap', v: 0.4 }, { at: c + 8, src: 'chime', v: 0.3 }); }
    if (t === 'cta') { const c = wordFrame(sc.id, 'telegram', 0.45); fx.push({ at: c - 1, src: 'tap', v: 0.4 }, { at: c + 6, src: 'chime', v: 0.3 }); }
  });
  return fx;
}

export const AutoReel = ({ script, timings, voiceBase = '', settings = {} }) => {
  setTimings(timings);
  applySettings({ ...settings, voiceBase });
  const frame = useCurrentFrame();
  const captions = useMemo(() => buildCaptions(script), [script, timings]);
  const sfx = useMemo(() => buildSfx(script), [script, timings]);
  const pose = { ...Object.fromEntries(script.scenes.map((sc) => [sc.id, sc.pose || 'point'])), ...(settings.posesAuto?.[script.id] || {}) };
  return (
    <AbsoluteFill style={{ fontFamily: BODY, overflow: 'hidden' }}>
      <Background frame={frame} />
      {script.scenes.map((sc) => {
        const P = PRESETS[sc.visual?.type];
        return P && visible(frame, sc.id) ? <P key={sc.id} frame={frame} sc={sc} /> : null;
      })}
      <Caption frame={frame} captions={captions} pulse={['cta']} />
      <Avatar frame={frame} pose={pose} />
      <Voice />
      <Sounds sfx={sfx} />
    </AbsoluteFill>
  );
};
