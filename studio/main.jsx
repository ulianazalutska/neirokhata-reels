import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Player } from '@remotion/player';

import { Reel, SCENE_IDS, POSE } from '../src/Reel.jsx';
import { DEFAULT_C, DEFAULT_SET } from '../src/kit.jsx';
import { TOTAL, FPS, S } from '../src/timeline.js';
import META from '../src/meta.json';

window.__NH_BASE__ = import.meta.env.BASE_URL;

const KEY = 'nh_reel_settings';
const REPO = 'ulianazalutska/neirokhata-reels';
const API = 'https://api.github.com/repos/' + REPO;
const token = () => { try { return localStorage.getItem('nh_token') || ''; } catch { return ''; } };
async function gh(path, opts = {}) {
  const r = await fetch(API + path, { ...opts, headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token(), ...(opts.body ? { 'Content-Type': 'application/json' } : {}) } });
  if (!r.ok) throw new Error(r.status === 403 || r.status === 404 ? 'no-access' : 'HTTP ' + r.status);
  return r.status === 204 ? null : r.json();
}
const when = (s) => new Date(s).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
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

function Render({ st }) {
  const [state, setState] = useState({ phase: 'idle' });
  const [list, setList] = useState([]);
  const timer = useRef(null);

  const loadList = async () => {
    if (!token()) return;
    try {
      const rel = await gh('/releases?per_page=6');
      setList(rel.filter((r) => r.tag_name.startsWith('render-')).map((r) => ({ name: r.name, at: r.created_at, url: r.assets[0]?.browser_download_url })).filter((x) => x.url));
    } catch {}
  };
  useEffect(() => { loadList(); return () => clearTimeout(timer.current); }, []);

  const poll = async (since) => {
    try {
      const d = await gh('/actions/workflows/render.yml/runs?per_page=5&event=workflow_dispatch');
      const run = d.workflow_runs.find((x) => new Date(x.created_at) >= since);
      if (!run) { setState({ phase: 'queued' }); }
      else if (run.status !== 'completed') { setState({ phase: 'running', run }); }
      else if (run.conclusion === 'success') {
        const rel = await gh('/releases/tags/render-' + run.run_number).catch(() => null);
        const url = rel?.assets[0]?.browser_download_url;
        setState({ phase: 'done', url, run });
        if (url) { const f = document.createElement('iframe'); f.style.display = 'none'; f.src = url; document.body.appendChild(f); }
        loadList();
        return;
      } else { setState({ phase: 'failed', run }); return; }
    } catch (e) { setState({ phase: 'error', msg: e.message }); return; }
    timer.current = setTimeout(() => poll(since), 10000);
  };

  const start = async () => {
    if (!token()) { setState({ phase: 'error', msg: 'no-token' }); return; }
    const since = new Date(Date.now() - 5000);
    setState({ phase: 'queued' });
    try {
      await gh('/actions/workflows/render.yml/dispatches', { method: 'POST', body: JSON.stringify({ ref: 'main', inputs: { settings: JSON.stringify(st) } }) });
      timer.current = setTimeout(() => poll(since), 8000);
    } catch (e) { setState({ phase: 'error', msg: e.message }); }
  };

  const busy = state.phase === 'queued' || state.phase === 'running';
  const msg = {
    idle: 'Монтаж іде на серверах GitHub з поточними налаштуваннями, приблизно 3–6 хвилин. Сторінку можна не закривати.',
    queued: 'Запускаю монтаж…',
    running: 'Монтую відео… Це займе кілька хвилин.',
    done: 'Готово! Відео завантажується в папку «Завантаження». Якщо не почалося, натисни «Завантажити mp4».',
    failed: 'Монтаж не вдався. Подивись журнал запуску на GitHub.',
    error: state.msg === 'no-token' ? 'Немає токена GitHub. Додай його в дашборді: вкладка «Налаштування».'
      : state.msg === 'no-access' ? 'Токен не має доступу до репозиторію neirokhata-reels. Додай цей репозиторій у налаштуваннях токена на GitHub (Actions: Read and write, Contents: Read).'
      : 'Помилка: ' + state.msg,
  }[state.phase];

  return (
    <div className="card">
      <h2>Монтаж у mp4</h2>
      <div className="row2">
        <button className="btn pri" onClick={start} disabled={busy}>{busy ? 'Монтую…' : 'Змонтувати mp4'}</button>
        {state.phase === 'done' && state.url && <a className="btn" href={state.url} download>Завантажити mp4</a>}
        {(state.phase === 'failed' || state.phase === 'running') && state.run && <a className="btn" href={state.run.html_url} target="_blank" rel="noopener">Журнал на GitHub</a>}
      </div>
      <div className={'note' + (busy ? ' pulse' : '')}>{msg}</div>
      {list.length > 0 && (
        <>
          <div className="sub" style={{ marginTop: 12 }}>Останні відео</div>
          <ul className="renders">{list.map((x) => <li key={x.url}><span>{x.name}</span><span className="sub">{when(x.at)}</span><a href={x.url} download>mp4</a></li>)}</ul>
        </>
      )}
    </div>
  );
}

const CAP_KEY = 'nh_reel_caption';
function Caption() {
  const def = META.caption + '\n\n' + META.hashtags;
  const [text, setText] = useState(() => { try { return localStorage.getItem(CAP_KEY) || def; } catch { return def; } });
  const [copied, setCopied] = useState(false);
  const change = (v) => { setText(v); setCopied(false); try { localStorage.setItem(CAP_KEY, v); } catch {} };
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
    setCopied(true);
  };
  return (
    <div className="card">
      <h2>Опис для Instagram</h2>
      <textarea className="cap" value={text} onChange={(e) => change(e.target.value)} rows={12} />
      <div className="row2" style={{ marginTop: 8 }}>
        <button className="btn pri" onClick={copy}>{copied ? 'Скопійовано' : 'Копіювати опис'}</button>
        <button className="btn" onClick={() => change(def)}>Повернути початковий</button>
        <span className="sub">{text.length} / 2200 символів</span>
      </div>
    </div>
  );
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
          <div className="note">Рілс про MotionClone. Зміни видно одразу. Щоб отримати відео, натисни «Змонтувати mp4».</div>
        </div>

        <div>
          <Render st={st} />
          <Caption />
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
