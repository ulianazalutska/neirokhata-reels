# Generates the voiceover per scene (Microsoft Edge voice "Ostap") plus word timings for captions and animation.
# Usage: python voice.py   ->   public/voice/<id>.mp3 + public/voice/timings.json
# Scene ids here must match the scene ids used in src/Reel.jsx (CAPTIONS, POSE).
import asyncio, json, pathlib
import edge_tts

VOICE = 'uk-UA-OstapNeural'
RATE = '+8%'
SCENES = [
    ('hook', 'Бачиш крутий рілс і думаєш: як вони це зробили?'),
    ('pain', 'Відновлювати таку анімацію вручну — довго, кадр за кадром.'),
    ('solution', 'Є Моушн Клон. Вставляєш посилання на відео — і він копіює анімацію.'),
    ('show', 'Отримуєш проєкт, де можна змінити текст, кольори й картинки.'),
    ('bonus', 'Працює локально на Windows. Складна тривимірна графіка може вийти неточною.'),
    ('cta', 'Більше про нейромережі в моєму Telegram-каналі. Посилання в шапці профілю.'),
]

OUT = pathlib.Path(__file__).parent / 'public' / 'voice'


async def make(sid, text):
    com = edge_tts.Communicate(text, VOICE, rate=RATE, boundary='WordBoundary')
    audio = bytearray()
    words = []
    async for chunk in com.stream():
        if chunk['type'] == 'audio':
            audio += chunk['data']
        elif chunk['type'] == 'WordBoundary':
            start = chunk['offset'] / 10_000
            words.append({'text': chunk['text'], 'start': round(start), 'end': round(start + chunk['duration'] / 10_000)})
    (OUT / f'{sid}.mp3').write_bytes(audio)
    # default output is 48 kbit/s CBR mp3, so length follows from the byte count
    return {'id': sid, 'text': text, 'durationMs': round(len(audio) * 8 / 48), 'words': words}


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('*.mp3'):
        old.unlink()
    data = [await make(sid, text) for sid, text in SCENES]
    (OUT / 'timings.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    for d in data:
        print(d['id'], d['durationMs'], 'ms', len(d['words']), 'words')

asyncio.run(main())
