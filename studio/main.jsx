import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Player } from '@remotion/player';

import { Reel, SCENE_IDS, POSE } from '../src/Reel.jsx';
import { AutoReel } from '../src/AutoReel.jsx';
import { DEFAULT_C, DEFAULT_SET } from '../src/kit.jsx';
import { FPS, totalOf, buildScenes, DEFAULT_TIMINGS } from '../src/timeline.js';
import META from '../src/meta.json';

window.__NH_BASE__ = import.meta.env.BASE_URL;

const OWNER = 'ulianazalutska', REPO = 'neirokhata-reels';
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
const KEY = 'nh_reel_settings';
const token = () => { try { return localStorage.getItem('nh_token') || ''; } catch { return ''; } };
async function gh(path, opts = {}) {
  const h = { Accept: opts.raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json' };
  if (token()) h.Authorization = 'Bearer ' + token();
  if (opts.body) h['Content-Type'] = 'application/json';
  const r = await fetch(API + path, { method: opts.method || 'GET', body: opts.body, headers: h, cache: 'no-store' });
  if (!r.ok) throw new Error(r.status === 403 || r.status === 404 ? (opts.soft404 && r.status === 404 ? 'missing' : 'no-access') : 'HTTP ' + r.status);
  if (r.status === 204) return null;
  return opts.raw ? JSON.parse(await r.text()) : r.json();
}
const when = (s) => (s ? new Date(s).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');
const errText = (m) => m === 'no-token' ? 'Немає токена GitHub. Додай його в дашборді: вкладка «Налаштування».'
  : m === 'no-access' ? 'Токен не має доступу до репозиторію neirokhata-reels (потрібно Actions: Read and write).'
  : 'Помилка: ' + m;

const SCENE_NAMES = { hook: 'Хук', pain: 'Біль', solution: 'Рішення', show: 'Показ', bonus: 'Бонус', cta: 'Заклик' };
const POSES = [['shock', 'шок'], ['sigh', 'втома'], ['proud', 'гордий'], ['point', 'показує вгору'], ['thumbs', 'клас'], ['wink', 'підморгує'], ['wave', 'махає']];
const VIS = { big: 'велика цифра', plaques: 'плашки', app: 'вікно програми', toggles: 'перемикачі', list: 'список', cta: 'картка каналу' };
const COLORS = [['rose', 'Акцент'], ['roseDeep', 'Плашки й кнопки'], ['lilac', 'Помаранчевий'], ['bg', 'Фон'], ['ink', 'Текст'], ['border', 'Рамка карток'], ['block', 'Плями / плашки'], ['line', 'Сітка']];
const EMPTY = { colors: {}, poses: {} };
const BUILTIN = { id: 'motionclone', title: 'MotionClone (перший рілс)', builtin: true };

function load() { try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return EMPTY; } }

// caption <-> text: words separated by spaces, "/" = new line, "*" before the key word
const capToText = (c) => (c || []).map((l) => l.join(' ')).join(' / ');
const textToCap = (t) => t.split('/').map((l) => l.trim().split(/\s+/).filter(Boolean)).filter((l) => l.length).slice(0, 2);

// --- runs a workflow and polls it ------------------------------------------------
function useWorkflow(file, onDone) {
  const [st, setSt] = useState({ phase: 'idle' });
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const poll = async (since) => {
    try {
      const d = await gh(`/actions/workflows/${file}/runs?per_page=5&event=workflow_dispatch`);
      const run = d.workflow_runs.find((x) => new Date(x.created_at) >= since);
      if (!run || run.status !== 'completed') setSt({ phase: 'running', run });
      else if (run.conclusion === 'success') { setSt({ phase: 'done', run }); onDone && onDone(run); return; }
      else { setSt({ phase: 'failed', run }); return; }
    } catch (e) { setSt({ phase: 'error', msg: e.message }); return; }
    timer.current = setTimeout(() => poll(since), 8000);
  };
  const start = async (inputs) => {
    if (!token()) { setSt({ phase: 'error', msg: 'no-token' }); return; }
    const since = new Date(Date.now() - 5000);
    setSt({ phase: 'running' });
    try {
      await gh(`/actions/workflows/${file}/dispatches`, { method: 'POST', body: JSON.stringify({ ref: 'main', inputs }) });
      timer.current = setTimeout(() => poll(since), 7000);
    } catch (e) { setSt({ phase: 'error', msg: e.message }); }
  };
  return [st, start];
}

function Status({ st, running, done, failed }) {
  if (st.phase === 'idle') return null;
  const text = st.phase === 'running' ? running : st.phase === 'done' ? done : st.phase === 'failed' ? failed : errText(st.msg);
  return (
    <div className={'note' + (st.phase === 'running' ? ' pulse' : '') + (st.phase === 'failed' || st.phase === 'error' ? ' bad' : '')}>
      {text}{' '}
      {st.run && (st.phase === 'running' || st.phase === 'failed') && <a href={st.run.html_url} target="_blank" rel="noopener">журнал</a>}
    </div>
  );
}

// --- posts -> new reel ------------------------------------------------------------
function Posts({ reels, onCreated, onClose }) {
  const [posts, setPosts] = useState(null);
  const [err, setErr] = useState('');
  const [busyTg, setBusyTg] = useState(null);
  const loadPosts = () => gh('/contents/posts.json', { raw: true, soft404: true }).then(setPosts).catch((e) => { setPosts([]); setErr(e.message); });
  useEffect(() => { loadPosts(); }, []);
  const [pst, refresh] = useWorkflow('posts.yml', () => loadPosts());
  const [cst, create] = useWorkflow('reel.yml', () => { setBusyTg(null); onCreated(); });
  const has = new Set(reels.map((r) => r.tg));
  return (
    <div className="card">
      <div className="row2" style={{ marginBottom: 8 }}>
        <h2 style={{ margin: 0, flex: 1 }}>Новий рілс з поста Telegram</h2>
        <button className="btn" onClick={() => refresh({})} disabled={pst.phase === 'running'}>Оновити пости</button>
        <button className="btn" onClick={onClose}>Закрити</button>
      </div>
      <Status st={pst} running="Беру свіжі пости з каналу…" done="Список постів оновлено." failed="Не вдалося оновити пости." />
      <Status st={cst} running={`Пишу сценарій і озвучую пост №${busyTg}… Це 1–2 хвилини.`} done="Рілс створено! Він уже в списку відео." failed="Не вдалося створити рілс." />
      {!posts && <div className="sub">Завантажую пости…</div>}
      {posts && !posts.length && <div className="sub">{err === 'missing' || !err ? 'Списку постів ще немає. Натисни «Оновити пости».' : errText(err)}</div>}
      <ul className="posts">
        {(posts || []).slice(0, 25).map((p) => (
          <li key={p.id}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="pt">{p.title}</div>
              <div className="sub">№{p.id} · {when(p.date)} · <a href={p.url} target="_blank" rel="noopener">відкрити</a></div>
            </div>
            {has.has(p.id) ? <span className="tag">є рілс</span> : null}
            <button className="btn pri" disabled={cst.phase === 'running'} onClick={() => { setBusyTg(p.id); create({ mode: 'create', tg: String(p.id) }); }}>Зробити рілс</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- script editor -------------------------------------------------------------------
function Editor({ script, setScript, rid, onSaved, dirty }) {
  const [st, run] = useWorkflow('reel.yml', onSaved);
  const upd = (i, patch) => setScript({ ...script, scenes: script.scenes.map((s, k) => (k === i ? { ...s, ...patch } : s)) });
  return (
    <div className="card">
      <h2>Сценарій</h2>
      <div className="sub" style={{ marginBottom: 8 }}>Підпис: слова через пробіл, «/» — новий рядок, «*» перед ключовим словом. Слова підпису мають бути з тексту голосу.</div>
      {script.scenes.map((s, i) => (
        <div key={s.id} className="scene">
          <div className="sh"><b>{SCENE_NAMES[s.id] || s.id}</b><span className="sub">{VIS[s.visual?.type] || ''}</span>
            <select value={s.pose} onChange={(e) => upd(i, { pose: e.target.value })}>{POSES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
          </div>
          <label className="f">Голос
            <textarea rows={2} value={s.voice} disabled={s.id === 'cta'} onChange={(e) => upd(i, { voice: e.target.value })} />
          </label>
          <label className="f">Підпис на екрані
            <input type="text" value={capToText(s.caption)} onChange={(e) => upd(i, { caption: textToCap(e.target.value) })} />
          </label>
        </div>
      ))}
      <div className="row2" style={{ marginTop: 10 }}>
        <button className="btn pri" disabled={st.phase === 'running'} onClick={() => run({ mode: 'voice', reel: rid, script: JSON.stringify(script) })}>Зберегти й переозвучити</button>
        <span className="sub">{dirty ? 'Є незбережені зміни сценарію' : 'Сценарій збережено'}</span>
      </div>
      <Status st={st} running="Зберігаю й переозвучую змінені сцени… 1–2 хвилини." done="Збережено, озвучку оновлено." failed="Не вдалося зберегти." />
    </div>
  );
}

// --- render ---------------------------------------------------------------------
function Render({ st: settings, rid }) {
  const [list, setList] = useState([]);
  const loadList = () => token() && gh('/releases?per_page=8').then((rel) => setList(rel.filter((r) => r.tag_name.startsWith('render-')).map((r) => ({ name: r.name, at: r.created_at, url: r.assets[0]?.browser_download_url })).filter((x) => x.url))).catch(() => {});
  useEffect(() => { loadList(); }, []);
  const [url, setUrl] = useState('');
  const [rst, run] = useWorkflow('render.yml', async (r) => {
    const rel = await gh('/releases/tags/render-' + r.run_number).catch(() => null);
    const u = rel?.assets[0]?.browser_download_url;
    setUrl(u || '');
    if (u) { const f = document.createElement('iframe'); f.style.display = 'none'; f.src = u; document.body.appendChild(f); }
    loadList();
  });
  return (
    <div className="card">
      <h2>Монтаж у mp4</h2>
      <div className="row2">
        <button className="btn pri" onClick={() => { setUrl(''); run({ settings: JSON.stringify(settings), reel: rid }); }} disabled={rst.phase === 'running'}>{rst.phase === 'running' ? 'Монтую…' : 'Змонтувати mp4'}</button>
        {url && <a className="btn" href={url} download>Завантажити mp4</a>}
      </div>
      {rst.phase === 'idle' && <div className="note">Монтаж іде на серверах GitHub з поточними налаштуваннями, 2–5 хвилин.</div>}
      <Status st={rst} running="Монтую відео… Це займе кілька хвилин." done="Готово! Відео завантажується в «Завантаження». Якщо не почалося — натисни «Завантажити mp4»." failed="Монтаж не вдався." />
      {list.length > 0 && (
        <>
          <div className="sub" style={{ marginTop: 12 }}>Останні змонтовані відео</div>
          <ul className="renders">{list.map((x) => <li key={x.url}><span>{x.name}</span><span className="sub">{when(x.at)}</span><a href={x.url} download>mp4</a></li>)}</ul>
        </>
      )}
    </div>
  );
}

// --- description ---------------------------------------------------------------
function Caption({ rid, def }) {
  const key = 'nh_reel_caption_' + rid;
  const read = () => { try { return localStorage.getItem(key) || def; } catch { return def; } };
  const [text, setText] = useState(read);
  useEffect(() => { setText(read()); }, [rid, def]);
  const [copied, setCopied] = useState(false);
  const change = (v) => { setText(v); setCopied(false); try { localStorage.setItem(key, v); } catch {} };
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
    setCopied(true);
  };
  return (
    <div className="card">
      <h2>Опис для Instagram</h2>
      <textarea className="cap" value={text} onChange={(e) => change(e.target.value)} rows={11} />
      <div className="row2" style={{ marginTop: 8 }}>
        <button className="btn pri" onClick={copy}>{copied ? 'Скопійовано' : 'Копіювати опис'}</button>
        <button className="btn" onClick={() => change(def)}>Повернути початковий</button>
        <span className="sub">{text.length} / 2200</span>
      </div>
    </div>
  );
}

// --- app -------------------------------------------------------------------------
function App() {
  const [st, setSt] = useState(load);
  const [saved, setSaved] = useState(true);
  const [reels, setReels] = useState([]);
  const [rid, setRid] = useState(() => { try { return localStorage.getItem('nh_reel_current') || 'motionclone'; } catch { return 'motionclone'; } });
  const [reel, setReel] = useState(null); // { script, timings, base, original }
  const [script, setScript] = useState(null);
  const [showPosts, setShowPosts] = useState(false);
  const [loadErr, setLoadErr] = useState('');
  const player = useRef(null);
  const base = import.meta.env.BASE_URL;

  const loadIndex = () => gh('/contents/reels/index.json', { raw: true, soft404: true }).then(setReels).catch((e) => (e.message === 'missing' ? setReels([]) : setLoadErr(e.message)));
  const loadReel = async (id) => {
    if (id === 'motionclone') { setReel(null); setScript(null); return; }
    try {
      const head = await gh('/commits/main');
      const sha = head.sha;
      const [s, t] = await Promise.all([gh(`/contents/reels/${id}/script.json?ref=${sha}`, { raw: true }), gh(`/contents/reels/${id}/timings.json?ref=${sha}`, { raw: true })]);
      const b = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${sha}/reels/${id}/voice/`;
      setReel({ timings: t, base: b, original: JSON.stringify(s) });
      setScript(s);
      setLoadErr('');
    } catch (e) { setLoadErr(e.message); }
  };
  useEffect(() => { loadIndex(); }, []);
  useEffect(() => { try { localStorage.setItem('nh_reel_current', rid); } catch {} loadReel(rid); }, [rid]);

  const set = (patch) => { setSt((s) => ({ ...s, ...patch })); setSaved(false); };
  const color = (k, v) => set({ colors: { ...st.colors, [k]: v } });
  const pose = (k, v) => set({ poses: { ...st.poses, [k]: v } });
  const val = (k) => (st[k] ?? DEFAULT_SET[k]);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} setSaved(true); };

  const auto = rid !== 'motionclone' && reel && script;
  // keep preview timings in sync with edited scenes (text edits keep old voice until re-voiced)
  const inputProps = useMemo(() => (auto ? { script, timings: reel.timings, voiceBase: reel.base, settings: st } : { settings: st }), [auto, script, reel, st]);
  const duration = auto ? totalOf(reel.timings) : totalOf(DEFAULT_TIMINGS);
  const scenes = auto ? buildScenes(reel.timings) : buildScenes(DEFAULT_TIMINGS);
  const seek = (i) => { player.current?.seekTo(scenes[i].from + 2); player.current?.play(); };
  const capDef = auto ? `${script.description || ''}\n\n${script.hashtags || ''}`.trim() : META.caption + '\n\n' + META.hashtags;
  const all = [BUILTIN, ...reels];

  return (
    <div className="wrap">
      <div className="top">
        <h1>Студія рілсів</h1>
        <span className="sub">{saved ? 'Налаштування збережено' : 'Є незбережені налаштування'}</span>
        <span className="sp" />
        <button className="btn" onClick={() => { setSt(EMPTY); setSaved(false); }}>Скинути стиль</button>
        <button className="btn pri" onClick={save}>Зберегти стиль</button>
      </div>

      <div className="card">
        <div className="row2" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0, flex: 1 }}>Відео</h2>
          <button className="btn pri" onClick={() => setShowPosts((v) => !v)}>+ Новий рілс з поста</button>
        </div>
        <ul className="reels">
          {all.map((r) => (
            <li key={r.id} className={r.id === rid ? 'on' : ''} onClick={() => setRid(r.id)}>
              <span className="pt">{r.title}</span>
              <span className="sub">{r.builtin ? 'вбудований' : `пост №${r.tg} · ${when(r.updated || r.created)}`}</span>
            </li>
          ))}
        </ul>
        {loadErr && <div className="note bad">{errText(loadErr)}</div>}
      </div>
      {showPosts && <Posts reels={reels} onClose={() => setShowPosts(false)} onCreated={async () => { await loadIndex(); }} />}

      <div className="layout">
        <div className="player">
          <div className="frame">
            {rid !== 'motionclone' && !auto ? <div className="loading">Завантажую рілс…</div> : (
              <Player
                key={rid}
                ref={player}
                component={auto ? AutoReel : Reel}
                inputProps={inputProps}
                durationInFrames={duration}
                fps={FPS}
                compositionWidth={1080}
                compositionHeight={1920}
                style={{ width: '100%', aspectRatio: '9 / 16' }}
                controls
                loop
                acknowledgeRemotionLicense
              />
            )}
          </div>
          <div className="scenes">
            {scenes.map((s, i) => <button key={s.id} className="btn" onClick={() => seek(i)}>{SCENE_NAMES[s.id] || s.id}</button>)}
          </div>
          {auto && <div className="note">Зміни тексту голосу почуєш після «Зберегти й переозвучити». Пози й підписи видно одразу.</div>}
        </div>

        <div>
          <Render st={st} rid={rid} />
          <Caption rid={rid} def={capDef} />
          {auto && <Editor script={script} setScript={setScript} rid={rid} dirty={JSON.stringify(script) !== reel.original} onSaved={() => loadReel(rid)} />}

          <div className="card">
            <h2>Кольори (для всіх відео)</h2>
            <div className="grid">
              {COLORS.map(([k, name]) => {
                const v = st.colors[k] || DEFAULT_C[k];
                return <label key={k} className="f">{name}<span className="color"><input type="color" value={v} onChange={(e) => color(k, e.target.value)} /><code>{v}</code></span></label>;
              })}
            </div>
          </div>

          <div className="card">
            <h2>Фон, підписи, звук</h2>
            <div className="grid">
              <label className="f">Плями на фоні: {Math.round(val('blobs') * 100)}%<input type="range" min="0" max="1.5" step="0.05" value={val('blobs')} onChange={(e) => set({ blobs: +e.target.value })} /></label>
              <label className="f">Розмір підписів: {Math.round(val('captionScale') * 100)}%<input type="range" min="0.8" max="1.2" step="0.02" value={val('captionScale')} onChange={(e) => set({ captionScale: +e.target.value })} /></label>
              <label className="f">Гучність голосу: {Math.round(val('voiceVol') * 100)}%<input type="range" min="0" max="1" step="0.05" value={val('voiceVol')} onChange={(e) => set({ voiceVol: +e.target.value })} /></label>
              <label className="f">Гучність ефектів: {Math.round(val('sfxVol') * 100)}%<input type="range" min="0" max="2" step="0.05" value={val('sfxVol')} onChange={(e) => set({ sfxVol: +e.target.value })} disabled={!val('sfx')} /></label>
              <label className="row"><input type="checkbox" checked={val('sfx')} onChange={(e) => set({ sfx: e.target.checked })} /> Звукові ефекти</label>
            </div>
          </div>

          {!auto && (
            <div className="card">
              <h2>Нейрик по сценах</h2>
              <div className="poses">
                {SCENE_IDS.map((id) => {
                  const p = st.poses[id] || POSE[id];
                  return (
                    <div key={id} className="pose">
                      <img src={`${base}avatar/${p}.png`} alt="" />
                      <div style={{ flex: 1 }}><b>{SCENE_NAMES[id]}</b>
                        <select value={p} onChange={(e) => pose(id, e.target.value)}>{POSES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
