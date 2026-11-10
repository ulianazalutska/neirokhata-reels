import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Player } from '@remotion/player';

import { Reel, SCENE_IDS, POSE } from '../src/Reel.jsx';
import { DEFAULT_C, DEFAULT_SET } from '../src/kit.jsx';
import { TOTAL, FPS, S } from '../src/timeline.js';

window.__NH_BASE__ = import.meta.env.BASE_URL;

const KEY = 'nh_reel_settings';
const SCENE_NAMES = { hook: 'Хук', pain: 'Біль', solution: 'Рішення', show: 'Показ', bonus: 'Бонус', cta: 'Заклик' };
const POSES = [
  ['shock', 'шок'], ['sigh', 'втома'], ['proud', 'гордий'], ['point', 'показує вгору'],
  ['thumbs', 'клас'], ['wink', 'підморгує'], ['wave', 'махає'],
];
const COLORS = [
  ['rose', 'Акцент'], ['roseDeep', 'Плашки й кнопки'], ['lilac', 'Помаранчевий'],
  ['bg', 'Фон'], ['ink', 'Текст'], ['border', 'Рамка карток'], ['block', 'Плями / плашки'], ['line', 'Сітка'],
];
const EMPTY = { colors: {}, poses: {} };

function load() {
  try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return EMPTY; }
}

function App() {
  const [st, setSt] = useState(load);
  const [saved, setSaved] = useState(true);
  const player = useRef(null);
  const base = import.meta.env.BASE_URL;

  const set = (patch) => { setSt((s) => ({ ...s, ...patch })); setSaved(false); };
  const color = (k, v) => set({ colors: { ...st.colors, [k]: v } });
  const pose = (k, v) => set({ poses: { ...st.poses, [k]: v } });
  const val = (k) => (st[k] ?? DEFAULT_SET[k]);

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} setSaved(true); };
  const reset = () => { setSt(EMPTY); setSaved(false); };
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(st, null, 2)], { type: 'application/json' }));
    a.download = 'reel-settings.json'; a.click();
  };
  const seek = (id) => { player.current?.seekTo(S[id].from + 2); player.current?.play(); };

  useEffect(() => {
    const h = (e) => { if (!saved) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [saved]);

  const inputProps = useMemo(() => ({ settings: st }), [st]);

  return (
    <div className="wrap">
      <div className="top">
        <h1>Студія рілсів</h1>
        <span className="sub">{saved ? 'Збережено в цьому браузері' : 'Є незбережені зміни'}</span>
        <span className="sp" />
        <button className="btn" onClick={reset}>Скинути все</button>
        <button className="btn" onClick={download}>Завантажити налаштування</button>
        <button className="btn pri" onClick={save}>Зберегти</button>
      </div>
      <div className="layout">
        <div className="player">
          <div className="frame">
            <Player
              ref={player}
              component={Reel}
              inputProps={inputProps}
              durationInFrames={TOTAL}
              fps={FPS}
              compositionWidth={1080}
              compositionHeight={1920}
              style={{ width: '100%', aspectRatio: '9 / 16' }}
              controls
              loop
              acknowledgeRemotionLicense
            />
          </div>
          <div className="scenes">
            {SCENE_IDS.map((id) => <button key={id} className="btn" onClick={() => seek(id)}>{SCENE_NAMES[id]}</button>)}
          </div>
          <div className="note">Рілс про MotionClone. Зміни видно одразу. Монтаж у mp4 з дашборду буде на наступному етапі.</div>
        </div>

        <div>
          <div className="card">
            <h2>Кольори</h2>
            <div className="grid">
              {COLORS.map(([k, name]) => {
                const v = st.colors[k] || DEFAULT_C[k];
                return (
                  <label key={k} className="f">{name}
                    <span className="color"><input type="color" value={v} onChange={(e) => color(k, e.target.value)} /><code>{v}</code></span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h2>Фон і підписи</h2>
            <div className="grid">
              <label className="f">Плями на фоні: {Math.round(val('blobs') * 100)}%
                <input type="range" min="0" max="1.5" step="0.05" value={val('blobs')} onChange={(e) => set({ blobs: +e.target.value })} />
              </label>
              <label className="f">Розмір підписів: {Math.round(val('captionScale') * 100)}%
                <input type="range" min="0.8" max="1.2" step="0.02" value={val('captionScale')} onChange={(e) => set({ captionScale: +e.target.value })} />
              </label>
            </div>
          </div>

          <div className="card">
            <h2>Звук</h2>
            <div className="grid">
              <label className="f">Гучність голосу: {Math.round(val('voiceVol') * 100)}%
                <input type="range" min="0" max="1" step="0.05" value={val('voiceVol')} onChange={(e) => set({ voiceVol: +e.target.value })} />
              </label>
              <label className="f">Гучність ефектів: {Math.round(val('sfxVol') * 100)}%
                <input type="range" min="0" max="2" step="0.05" value={val('sfxVol')} onChange={(e) => set({ sfxVol: +e.target.value })} disabled={!val('sfx')} />
              </label>
              <label className="row"><input type="checkbox" checked={val('sfx')} onChange={(e) => set({ sfx: e.target.checked })} /> Звукові ефекти</label>
            </div>
          </div>

          <div className="card">
            <h2>Нейрик по сценах</h2>
            <div className="poses">
              {SCENE_IDS.map((id) => {
                const p = st.poses[id] || POSE[id];
                return (
                  <div key={id} className="pose">
                    <img src={`${base}avatar/${p}.png`} alt="" />
                    <div style={{ flex: 1 }}>
                      <b>{SCENE_NAMES[id]}</b>
                      <select value={p} onChange={(e) => pose(id, e.target.value)}>
                        {POSES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
