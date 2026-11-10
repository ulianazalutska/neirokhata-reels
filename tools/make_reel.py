"""Create a reel from a Telegram post, or re-voice an edited reel.

  python tools/make_reel.py create <tg_post_id>
  python tools/make_reel.py voice  <reel_id>   (script JSON from env SCRIPT_JSON)

Writes reels/<id>/script.json, reels/<id>/timings.json, reels/<id>/voice/<scene>.mp3 and updates reels/index.json.
Needs OPENAI_API_KEY in the environment.
"""
import datetime, json, os, pathlib, re, sys
from openai import OpenAI

ROOT = pathlib.Path(__file__).resolve().parent.parent
REELS = ROOT / "reels"
client = OpenAI()

VOICE = os.environ.get("TTS_VOICE", "ballad")
TTS_MODEL = "gpt-4o-mini-tts"
INSTRUCTIONS = (
    "Ти — ведучий українських новин про технології. Говори чистою українською без акценту, "
    "впевнено, жваво і дружньо, з природними паузами та інтонацією, як живий диктор. Не поспішай."
)
CTA_VOICE = "Більше про нейромережі в моєму Telegram-каналі. Посилання в шапці профілю."
CTA = {
    "id": "cta",
    "voice": CTA_VOICE,
    "caption": [["більше", "про", "*нейромережі"], ["в", "Telegram"]],
    "pose": "wink",
    "visual": {"type": "cta"},
}
POSES = ["shock", "sigh", "proud", "point", "thumbs", "wink", "wave"]

PROMPT = """Ти сценарист коротких вертикальних відео (Reels, 25–35 секунд) для Telegram-каналу «Нейрохата» про нейромережі.
Ведучий — мультяшний робот Нейрик (чоловічий рід, говорить на «ти» до глядача, як друг).

Зроби сценарій на 5 сцен за цим постом каналу:
1. hook — зачепити за 1–3 секунди: конкретна цифра, несподіваний факт або знайома проблема.
2. pain — чому це важливо / що дратує без цього (одне речення).
3. solution — що з'явилось (назва продукту латиницею, як у пості).
4. show — як це працює або що вміє (найцікавіше).
5. bonus — ще один плюс або чесне застереження (ціна, де доступно, обмеження).

Правила тексту голосу (voice):
- одне коротке речення на сцену, 6–14 слів, жива розмовна українська, без канцеляриту і без емодзі;
- числа пиши СЛОВАМИ («п'ятнадцять секунд», «чотири K»), бо їх читає синтезатор мови;
- англійські назви продуктів пиши латиницею, як у пості;
- тільки факти з поста, нічого не вигадуй.

Підпис на екрані (caption): 1–2 рядки, кожен ≤ 18 символів, разом 2–6 слів. Слова беруться ДОСЛІВНО з voice цієї ж сцени
(в тій самій формі), бо підпис синхронізується з голосом. Рівно одне ключове слово познач зірочкою на початку: "*слово".

Візуал (visual) — вибери один тип для сцени:
- big: {"type":"big","value":"15 с","label":"до 15 секунд відео"} — велика цифра або коротке слово (value ≤ 8 символів);
- plaques: {"type":"plaques","items":[{"title":"...","sub":"..."}]} — 2–3 плашки (title ≤ 16 символів, sub ≤ 28);
- app: {"type":"app","title":"Назва продукту","label":"підпис поля","text":"що робимо","lines":["пункт","пункт"],"button":"дія","result":"результат"} — вікно програми, курсор натискає кнопку (text ≤ 28, button ≤ 14, result ≤ 24, lines ≤ 2 по ≤ 30);
- toggles: {"type":"toggles","items":[{"title":"...","sub":"..."}]} — 1–2 плашки з перемикачем (плюси/умови);
- list: {"type":"list","title":"...","items":["...","..."]} — список 2–4 пункти по ≤ 26 символів.
Різні сцени — різні типи. Для hook найкраще big, для solution — app.

Поза Нейрика (pose) — одна з: shock (шок), sigh (втома), proud (гордий), point (показує вгору), thumbs (клас), wink (підморгує), wave (махає).
Зазвичай: hook shock, pain sigh, solution point, show proud, bonus thumbs.

Також напиши:
- title: коротка назва рілса (≤ 40 символів);
- description: опис для Instagram українською, 3–6 коротких абзаців, можна 2–4 емодзі, у кінці «Більше про нейромережі — у Telegram-каналі «Нейрохата», посилання в шапці профілю 👆»;
- hashtags: 8–12 хештегів одним рядком (українські й англійські, включно з #нейрохата).

Пост:
---
{post}
---"""

SCHEMA = {
    "name": "reel",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["title", "scenes", "description", "hashtags"],
        "properties": {
            "title": {"type": "string"},
            "description": {"type": "string"},
            "hashtags": {"type": "string"},
            "scenes": {
                "type": "array",
                "minItems": 5,
                "maxItems": 5,
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["id", "voice", "caption", "pose", "visual"],
                    "properties": {
                        "id": {"type": "string", "enum": ["hook", "pain", "solution", "show", "bonus"]},
                        "voice": {"type": "string"},
                        "caption": {"type": "array", "items": {"type": "array", "items": {"type": "string"}}},
                        "pose": {"type": "string", "enum": POSES},
                        "visual": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["type", "value", "label", "title", "text", "lines", "button", "result", "items"],
                            "properties": {
                                "type": {"type": "string", "enum": ["big", "plaques", "app", "toggles", "list"]},
                                "value": {"type": "string"},
                                "label": {"type": "string"},
                                "title": {"type": "string"},
                                "text": {"type": "string"},
                                "lines": {"type": "array", "items": {"type": "string"}},
                                "button": {"type": "string"},
                                "result": {"type": "string"},
                                "items": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "additionalProperties": False,
                                        "required": ["title", "sub"],
                                        "properties": {"title": {"type": "string"}, "sub": {"type": "string"}},
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
}


def clean_visual(v):
    t = v.get("type")
    if t == "big":
        return {"type": t, "value": v.get("value", "")[:10], "label": v.get("label", "")}
    if t in ("plaques", "toggles"):
        items = [i for i in v.get("items", []) if i.get("title")][: (3 if t == "plaques" else 2)]
        return {"type": t, "items": items}
    if t == "list":
        items = [i.get("title") for i in v.get("items", []) if i.get("title")] or v.get("lines", [])
        return {"type": t, "title": v.get("title", ""), "items": items[:4]}
    if t == "app":
        return {k: v.get(k) for k in ("type", "title", "label", "text", "lines", "button", "result")}
    return {"type": "big", "value": "?", "label": ""}


def write_script(post):
    r = client.chat.completions.create(
        model="gpt-4o",
        temperature=0.7,
        response_format={"type": "json_schema", "json_schema": SCHEMA},
        messages=[{"role": "user", "content": PROMPT.replace("{post}", post["text"][:3500])}],
    )
    d = json.loads(r.choices[0].message.content)
    order = ["hook", "pain", "solution", "show", "bonus"]
    scenes = sorted(d["scenes"], key=lambda s: order.index(s["id"]))
    for s in scenes:
        s["visual"] = clean_visual(s["visual"])
        s["caption"] = [line for line in s["caption"] if line][:2]
    return {
        "title": d["title"],
        "tg": post["id"],
        "tgUrl": post["url"],
        "scenes": scenes + [CTA],
        "description": d["description"].strip(),
        "hashtags": d["hashtags"].strip(),
    }


def tts(text, path):
    with client.audio.speech.with_streaming_response.create(
        model=TTS_MODEL, voice=VOICE, input=text, instructions=INSTRUCTIONS, response_format="mp3"
    ) as r:
        r.stream_to_file(path)


def timings_for(sid, text, path):
    with open(path, "rb") as f:
        tr = client.audio.transcriptions.create(
            model="whisper-1", file=f, language="uk", response_format="verbose_json", timestamp_granularities=["word"]
        )
    dur = float(tr.duration)
    heard = [(w.word, float(w.start), float(w.end)) for w in (tr.words or [])]
    words = text.split()
    if heard:
        tot = sum(len(w) for w, _, _ in heard) or 1
        marks, acc = [], 0
        for w, s, e in heard:
            marks.append((acc / tot, s)); acc += len(w)
        marks.append((1.0, heard[-1][2]))

        def at(frac):
            for (f0, s0), (f1, s1) in zip(marks, marks[1:]):
                if frac <= f1:
                    k = 0 if f1 == f0 else (frac - f0) / (f1 - f0)
                    return s0 + (s1 - s0) * k
            return marks[-1][1]
    else:
        at = lambda frac: frac * dur
    tot = sum(len(w) for w in words) or 1
    out, acc = [], 0
    for w in words:
        s = at(acc / tot); acc += len(w); e = at(acc / tot)
        out.append({"text": w, "start": round(s * 1000), "end": round(max(e, s + 0.12) * 1000)})
    return {"id": sid, "text": text, "durationMs": round(dur * 1000), "words": out}


def voice_all(rid, script):
    d = REELS / rid / "voice"
    d.mkdir(parents=True, exist_ok=True)
    tp = REELS / rid / "timings.json"
    prev = {t["id"]: t for t in json.loads(tp.read_text(encoding="utf-8"))} if tp.exists() else {}
    timings = []
    for s in script["scenes"]:
        p = d / f"{s['id']}.mp3"
        old = prev.get(s["id"])
        if old and old["text"] == s["voice"] and p.exists():
            timings.append(old)
            print(s["id"], "unchanged")
            continue
        tts(s["voice"], p)
        timings.append(timings_for(s["id"], s["voice"], p))
        print(s["id"], timings[-1]["durationMs"], "ms")
    keep = {f"{s['id']}.mp3" for s in script["scenes"]}
    for f in d.glob("*.mp3"):
        if f.name not in keep:
            f.unlink()
    (REELS / rid / "timings.json").write_text(json.dumps(timings, ensure_ascii=False, indent=1), encoding="utf-8")


def save(rid, script, status):
    script["id"] = rid
    (REELS / rid).mkdir(parents=True, exist_ok=True)
    (REELS / rid / "script.json").write_text(json.dumps(script, ensure_ascii=False, indent=1), encoding="utf-8")
    idx_p = REELS / "index.json"
    idx = json.loads(idx_p.read_text(encoding="utf-8")) if idx_p.exists() else []
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    entry = next((x for x in idx if x["id"] == rid), None)
    if not entry:
        entry = {"id": rid, "created": now}
        idx.insert(0, entry)
    entry.update({"title": script["title"], "tg": script.get("tg"), "updated": now, "status": status})
    idx_p.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")


def main():
    mode, arg = sys.argv[1], sys.argv[2]
    if mode == "create":
        tg = int(arg)
        posts = json.loads((ROOT / "posts.json").read_text(encoding="utf-8"))
        post = next((p for p in posts if p["id"] == tg), None)
        if not post:
            sys.exit(f"Пост №{tg} не знайдено в posts.json")
        rid = f"tg{tg}"
        n = 2
        while (REELS / rid).exists():
            rid = f"tg{tg}-{n}"; n += 1
        script = write_script(post)
        print(json.dumps(script, ensure_ascii=False, indent=1))
        voice_all(rid, script)
        save(rid, script, "ready")
    elif mode == "voice":
        rid = re.sub(r"[^\w-]", "", arg)
        script = json.loads(os.environ["SCRIPT_JSON"])
        if not script["scenes"] or script["scenes"][-1]["id"] != "cta":
            script["scenes"] = [s for s in script["scenes"] if s["id"] != "cta"] + [CTA]
        voice_all(rid, script)
        save(rid, script, "ready")
    print("REEL_ID=" + rid)


main()
