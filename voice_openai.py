# Voiceover with OpenAI (gpt-4o-mini-tts) + word timings via Whisper.
# Usage:  python voice_openai.py            -> public/voice/<id>.mp3 + timings.json (same format as voice.py)
#         python voice_openai.py --test     -> voice_samples/<voice>.mp3, one sample per voice to compare
# The scene lines are taken from voice.py (SCENES), so you edit the text in one place only.
import json, os, pathlib, re, sys
from openai import OpenAI

VOICE = 'ballad'  # chosen by Uliana
INSTRUCTIONS = (
    'Ти — ведучий українських новин про технології. Говори чистою українською без акценту, '
    'впевнено, жваво і дружньо, з природними паузами та інтонацією, як живий диктор. Не поспішай.'
)
TEST_VOICES = ['onyx', 'ash', 'echo', 'ballad', 'verse', 'cedar', 'sage', 'alloy']
TEST_TEXT = 'Бачиш крутий рілс і думаєш: як вони це зробили? Є Моушн Клон — вставляєш посилання, і він копіює анімацію.'

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / 'public' / 'voice'
KEYFILE = ROOT.parent / '.openai_key'


def api_key():
    k = os.environ.get('OPENAI_API_KEY', '').strip()
    if k:
        return k
    k = KEYFILE.read_text(encoding='utf-8', errors='ignore').strip() if KEYFILE.exists() else ''
    if not k:
        KEYFILE.write_text('', encoding='utf-8')
        print('Відкриваю Блокнот: встав туди ключ OpenAI (Ctrl+V), збережи (Ctrl+S) і закрий Блокнот.')
        if os.name == 'nt':
            os.system(f'notepad "{KEYFILE}"')
        k = KEYFILE.read_text(encoding='utf-8-sig', errors='ignore').strip()
    if not k.startswith('sk-'):
        sys.exit('Ключ порожній або неправильний (має починатися з sk-). Запусти ще раз.')
    return k


client = OpenAI(api_key=api_key())


def tts(text, voice, path):
    with client.audio.speech.with_streaming_response.create(
        model='gpt-4o-mini-tts', voice=voice, input=text, instructions=INSTRUCTIONS, response_format='mp3',
    ) as r:
        r.stream_to_file(path)


def scenes():
    src = (ROOT / 'voice.py').read_text(encoding='utf-8')
    ns = {}
    exec(re.search(r'SCENES = \[.*?\n\]\n', src, re.S).group(0), ns)
    return ns['SCENES']


def timings(sid, text, path):
    with open(path, 'rb') as f:
        tr = client.audio.transcriptions.create(
            model='whisper-1', file=f, language='uk', response_format='verbose_json', timestamp_granularities=['word'],
        )
    dur = float(tr.duration)
    heard = [(w.word, float(w.start), float(w.end)) for w in (tr.words or [])]
    words = text.split()
    # Map the original words onto the heard timeline by character position (robust to spelling differences).
    if heard:
        tot = sum(len(w) for w, _, _ in heard) or 1
        marks, acc = [], 0
        for w, s, e in heard:
            marks.append((acc / tot, s, e)); acc += len(w)
        marks.append((1.0, heard[-1][2], heard[-1][2]))
        def at(frac):
            for (f0, s0, _), (f1, s1, _) in zip(marks, marks[1:]):
                if frac <= f1:
                    k = 0 if f1 == f0 else (frac - f0) / (f1 - f0)
                    return s0 + (s1 - s0) * k
            return marks[-1][1]
        span_start, span_end = heard[0][1], heard[-1][2]
    else:
        at = lambda frac: frac * dur
        span_start, span_end = 0, dur
    tot = sum(len(w) for w in words) or 1
    out, acc = [], 0
    for i, w in enumerate(words):
        s = at(acc / tot); acc += len(w); e = at(acc / tot)
        out.append({'text': w, 'start': round(s * 1000), 'end': round(max(e, s + 0.12) * 1000)})
    return {'id': sid, 'text': text, 'durationMs': round(dur * 1000), 'words': out}


def main():
    if '--test' in sys.argv:
        d = ROOT / 'voice_samples'; d.mkdir(exist_ok=True)
        for v in TEST_VOICES:
            try:
                tts(TEST_TEXT, v, d / f'{v}.mp3'); print('ok', v)
            except Exception as e:
                print('skip', v, '-', str(e)[:80])
        print('Слухай файли в', d)
        os.startfile(d) if os.name == 'nt' else None
        return
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('*.mp3'):
        old.unlink()
    data = []
    for sid, text in scenes():
        p = OUT / f'{sid}.mp3'
        tts(text, VOICE, p)
        data.append(timings(sid, text, p))
        print(sid, data[-1]['durationMs'], 'ms')
    (OUT / 'timings.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')


main()
