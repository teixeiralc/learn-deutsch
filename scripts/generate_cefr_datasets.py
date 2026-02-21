import csv
import io
import re
import sqlite3
import urllib.request
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
ANKI_DB_PATH = ROOT / 'backend' / 'resources' / 'anki-decks' / 'collection.anki21'
VOCAB_CSV_PATH = ROOT / 'scripts' / 'vocabulary.csv'
SENTENCES_CSV_PATH = ROOT / 'scripts' / 'sentences.csv'

LEVELS = ('A1', 'A2', 'B1', 'B2')
TARGET_PER_LEVEL = 500

OFFICIAL_SOURCES = {
    'A1': 'https://www.goethe.de/pro/relaunch/prf/de/A1_SD1_Wortliste_02.pdf',
    'A2': 'https://www.goethe.de/pro/relaunch/prf/en/Goethe-Zertifikat_A2_Wortliste.pdf',
    'B1': 'https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_B1_Wortliste.pdf',
    # Goethe does not currently publish a dedicated B2 word list PDF.
    # We extract lexical candidates from the official B2 model test material.
    'B2': 'https://www.goethe.de/pro/relaunch/prf/materialien/B2/b2_modellsatz_erwachsene.pdf',
}

SKIP_LINE_PREFIXES = (
    'VS_',
    'WORTLISTE',
    'GOETHE',
    'ZERTIFIKAT',
    'INHALT',
    'VORWORT',
    'Vorwort',
    'INVENTARE',
    'INVeNTAre',
    'Alphabetische',
    'A2_Wortliste_',
)

GERMAN_CONJUNCTIONS = {
    'und', 'oder', 'aber', 'denn', 'weil', 'dass', 'wenn', 'obwohl', 'damit', 'sondern', 'doch'
}
GERMAN_PREPOSITIONS = {
    'in', 'an', 'auf', 'ab', 'mit', 'bei', 'von', 'zu', 'nach', 'vor', 'hinter', 'unter', 'ueber', 'uber', 'über',
    'zwischen', 'durch', 'fuer', 'fur', 'gegen', 'ohne', 'um', 'aus', 'seit', 'bis', 'waehrend',
    'waehrend', 'wahrend'
}
GERMAN_PRONOUNS = {
    'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'sie', 'mich', 'dich', 'ihn', 'uns', 'euch',
    'mein', 'dein', 'sein', 'ihr', 'unser', 'euer'
}

ALLOWED_SHORT_WORDS = {
    'ab', 'an', 'am', 'im', 'in', 'um', 'zu', 'bei', 'aus', 'mit', 'von', 'vor', 'ja', 'nein',
    'du', 'er', 'es', 'wir', 'ihr', 'ich', 'sie', 'ob', 'so', 'da', 'oh', 'ok'
}

STOPWORDS_B2 = {
    'der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber', 'denn', 'dass', 'weil', 'wenn',
    'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'man', 'nicht', 'kein', 'ja', 'nein', 'zu', 'im',
    'in', 'an', 'auf', 'mit', 'bei', 'nach', 'von', 'aus', 'um', 'am', 'dem', 'den', 'des', 'einem',
    'einer', 'einen', 'auch', 'nur', 'noch', 'schon', 'sehr', 'mehr', 'hier', 'dort', 'heute',
    'morgen', 'bitte', 'danke', 'haben', 'sein', 'werden', 'kann', 'konnte', 'muss', 'musste',
    'soll', 'sollte', 'wie', 'was', 'wer', 'wo', 'warum', 'wieso', 'weshalb', 'dieser', 'diese',
    'dieses', 'jeder', 'jede', 'jedes', 'alle', 'alles', 'mich', 'dich', 'uns', 'euch', 'ihnen',
}


@dataclass
class CandidateWord:
    german: str
    part_of_speech: str
    gender: str
    plural: str


@dataclass
class NoteMeta:
    german: str
    english: str
    part_of_speech: str
    gender: str
    plural: str
    german_sentence: str
    english_sentence: str


def clean_encoding_artifacts(text: str) -> str:
    text = text.replace('\u00ad', '')
    text = text.replace('\ufb01', 'fi').replace('\ufb02', 'fl')
    return text


def normalize_key(word: str) -> str:
    word = word.strip().lower()
    word = re.sub(r'^(der|die|das)\s+', '', word)
    word = re.sub(r'^sich\s+', '', word)
    word = word.replace('ß', 'ss')
    return word


def sanitize_csv_text(text: str) -> str:
    text = (text or '').replace('"', '').replace('„', '').replace('“', '').replace('”', '')
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def sanitize_english(text: str) -> str:
    return sanitize_csv_text((text or '').replace(',', ' / '))


def strip_html(text: str) -> str:
    return re.sub(r'<[^>]+>', '', text)


def decode_entities(text: str) -> str:
    return (
        text.replace('&nbsp;', ' ')
        .replace('&amp;', '&')
        .replace('&quot;', '"')
        .replace('&#39;', "'")
        .replace('&lt;', '<')
        .replace('&gt;', '>')
    )


def clean_anki_field(text: str) -> str:
    text = text.replace('\r', '')
    text = re.sub(r'\[sound:[^\]]+\]', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<span[^>]*>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'</span>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = decode_entities(strip_html(text))
    return text.strip()


def guess_pos(german: str, gender: str, grammar_info: str) -> str:
    w = german.lower()
    if gender:
        return 'noun'
    if 'conj:' in grammar_info.lower():
        return 'verb'
    if w in GERMAN_CONJUNCTIONS:
        return 'conjunction'
    if w in GERMAN_PREPOSITIONS:
        return 'preposition'
    if w in GERMAN_PRONOUNS:
        return 'pronoun'
    if w.endswith('en') and ' ' not in w:
        return 'verb'
    if w in {'sehr', 'heute', 'morgen', 'gestern', 'hier', 'dort', 'nie', 'immer', 'oft'}:
        return 'adverb'
    return 'adjective' if german and german[0].islower() else 'noun'


def parse_first_german_line(line: str) -> tuple[str, str, str]:
    line = line.strip()
    plural = ''
    plural_match = re.search(r'\(([^)]+)\)', line)
    if plural_match:
        plural = sanitize_csv_text(plural_match.group(1))
    line_no_plural = re.sub(r'\s*\([^)]*\)\s*', ' ', line).strip()

    gender = ''
    word = line_no_plural
    article_match = re.match(r'^(der|die|das)\s+(.+)$', line_no_plural, flags=re.IGNORECASE)
    if article_match:
        gender = article_match.group(1).lower()
        word = article_match.group(2).strip()

    return sanitize_csv_text(word), gender, plural


def parse_anki_metadata() -> dict[str, NoteMeta]:
    if not ANKI_DB_PATH.exists():
        raise FileNotFoundError(f'Anki database not found at {ANKI_DB_PATH}')

    conn = sqlite3.connect(str(ANKI_DB_PATH))
    conn.row_factory = sqlite3.Row
    rows = conn.execute('SELECT flds FROM notes').fetchall()

    metadata: dict[str, NoteMeta] = {}

    for row in rows:
        raw = row['flds']
        if isinstance(raw, bytes):
            raw = raw.decode('utf-8', errors='ignore')
        fields = raw.split('\x1f')
        if len(fields) != 2:
            continue

        english_lines = [l.strip() for l in clean_anki_field(fields[0]).split('\n') if l.strip()]
        german_lines = [l.strip() for l in clean_anki_field(fields[1]).split('\n') if l.strip()]
        if not english_lines or not german_lines:
            continue

        english_meaning = sanitize_english(english_lines[0].split(',')[0])
        english_sentence = sanitize_csv_text(english_lines[1]) if len(english_lines) > 1 else ''

        german_word, gender, plural = parse_first_german_line(german_lines[0])
        if not german_word:
            continue

        grammar_info = ' | '.join(
            l for l in german_lines if re.search(r'(Conj:|Case:)', l, flags=re.IGNORECASE)
        )
        german_sentence = ''
        for line in german_lines:
            if re.search(r'(Conj:|Case:)', line, flags=re.IGNORECASE):
                continue
            if line.endswith('.'):
                german_sentence = sanitize_csv_text(line)
                break

        part_of_speech = guess_pos(german_word, gender, grammar_info)
        key = normalize_key(german_word)

        candidate = NoteMeta(
            german=german_word,
            english=english_meaning or german_word,
            part_of_speech=part_of_speech,
            gender=gender,
            plural=plural,
            german_sentence=german_sentence,
            english_sentence=sanitize_csv_text(english_sentence),
        )

        existing = metadata.get(key)
        if not existing:
            metadata[key] = candidate
            continue

        # Keep the richer metadata entry deterministically.
        score_existing = sum(bool(x) for x in [existing.gender, existing.plural, existing.german_sentence, existing.english_sentence])
        score_candidate = sum(bool(x) for x in [candidate.gender, candidate.plural, candidate.german_sentence, candidate.english_sentence])
        if score_candidate > score_existing:
            metadata[key] = candidate

    conn.close()
    return metadata


def parse_entry_to_candidate(entry: str) -> CandidateWord | None:
    entry = clean_encoding_artifacts(entry)
    entry = entry.strip(' .')
    entry = re.sub(r'\s*\((D|A|CH)[^)]*\)', '', entry)
    entry = entry.replace('(sich)', 'sich')
    entry = re.sub(r'\s+', ' ', entry).strip()
    if not entry:
        return None

    left = entry.split(',', 1)[0].strip()
    if not left:
        return None

    gender = ''
    word = left
    article_match = re.match(r'^(der|die|das)\s+(.+)$', left, flags=re.IGNORECASE)
    if article_match:
        gender = article_match.group(1).lower()
        word = article_match.group(2).strip()

    plural = ''
    comma_parts = [p.strip() for p in entry.split(',')]
    if gender and len(comma_parts) > 1:
        maybe_plural = comma_parts[1]
        maybe_plural = re.sub(r'[^A-Za-zÄÖÜäöüß\-]', '', maybe_plural)
        if maybe_plural and len(maybe_plural) <= 24:
            plural = maybe_plural

    if not re.search(r'[A-Za-zÄÖÜäöüß]', word):
        return None

    word = sanitize_csv_text(word)
    word = word.strip('-').strip()
    if len(word) < 2 or len(word) > 48:
        return None

    if any(ch in word for ch in [':', ';', '/', '\\', '(', ')']):
        return None
    if re.search(r'\d', word):
        return None

    tokens = word.split()
    if len(tokens) > 2:
        return None
    if len(tokens) == 2 and tokens[0].lower() != 'sich':
        return None

    lw = word.lower()
    if lw in {'der', 'die', 'das', 'ein', 'eine'}:
        return None
    if len(lw) <= 3 and lw not in ALLOWED_SHORT_WORDS:
        return None

    part_of_speech = guess_pos(word, gender, '')
    return CandidateWord(german=word, part_of_speech=part_of_speech, gender=gender, plural=plural)


def extract_head_candidates_from_pdf(url: str) -> list[CandidateWord]:
    data = urllib.request.urlopen(url, timeout=90).read()
    reader = PdfReader(io.BytesIO(data))
    out: list[CandidateWord] = []

    for page in reader.pages:
        text = clean_encoding_artifacts(page.extract_text() or '')
        for raw_line in text.splitlines():
            if not raw_line.strip():
                continue
            if raw_line.startswith(' '):
                continue

            line = raw_line.strip()
            if len(line) > 88:
                continue
            if any(line.startswith(prefix) for prefix in SKIP_LINE_PREFIXES):
                continue
            if re.fullmatch(r'\d+', line):
                continue
            if re.match(r'^\d+\s*WORTLISTE$', line):
                continue
            if re.match(r'^[A-Z]$', line):
                continue
            if re.match(r'^(A|CH|D):', line):
                continue
            if re.match(r'^\d+\.', line):
                continue

            # Keep only probable dictionary-entry lines.
            if not re.match(r'^(sich\s+|\(?sich\)?\s+|der\s+|die\s+|das\s+|[a-zäöüß])', line):
                continue

            if re.search(r'[!?]$', line):
                continue

            # Most list lines separate headword from examples by wide spacing.
            head = re.split(r'\s{2,}|\t+', line, maxsplit=1)[0]
            if head == line:
                # A1 often has "ab Ab morgen ..."
                m = re.match(r'^([A-Za-zÄÖÜäöüß./\-]+)\s+[A-ZÄÖÜ]', line)
                if m:
                    head = m.group(1)
                else:
                    head = line

            candidate = parse_entry_to_candidate(head)
            if not candidate:
                continue
            out.append(candidate)

    seen = set()
    unique: list[CandidateWord] = []
    for candidate in out:
        key = normalize_key(candidate.german)
        if key in seen:
            continue
        seen.add(key)
        unique.append(candidate)
    return unique


def extract_b2_candidates_from_modelset(url: str) -> list[CandidateWord]:
    data = urllib.request.urlopen(url, timeout=90).read()
    reader = PdfReader(io.BytesIO(data))
    text = '\n'.join(clean_encoding_artifacts(page.extract_text() or '') for page in reader.pages)

    tokens = re.findall(r'[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß\-]{2,}', text)
    counts: Counter[str] = Counter()
    for token in tokens:
        t = token.lower()
        if t in STOPWORDS_B2:
            continue
        if len(t) < 4:
            continue
        if not re.search(r'[a-zäöüß]', t):
            continue
        if t.endswith('-') or t.startswith('-'):
            continue
        counts[t] += 1

    ordered = sorted(counts.items(), key=lambda it: (-it[1], it[0]))
    out: list[CandidateWord] = []
    for token, _freq in ordered:
        out.append(
            CandidateWord(
                german=token,
                part_of_speech=guess_pos(token, '', ''),
                gender='',
                plural='',
            )
        )
    return out


def build_level_vocabulary(
    level: str,
    primary_candidates: list[CandidateWord],
    metadata: dict[str, NoteMeta],
    fallback_candidates: list[CandidateWord],
) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    used = set()

    def push(candidate: CandidateWord):
        key = normalize_key(candidate.german)
        if key in used:
            return
        used.add(key)

        meta = metadata.get(key)
        german = sanitize_csv_text(meta.german if meta else candidate.german)
        english = sanitize_english(meta.english if meta else candidate.german)
        part_of_speech = (meta.part_of_speech if meta else candidate.part_of_speech) or 'noun'
        gender = (meta.gender if meta else candidate.gender) or ''
        plural = (meta.plural if meta else candidate.plural) or ''

        if not german:
            return

        rows.append(
            {
                'german': german,
                'english': english,
                'part_of_speech': part_of_speech,
                'gender': gender,
                'plural': plural,
                'level': level,
                'frequency_rank': '0',
            }
        )

    for require_meta in (True, False):
        for candidate in primary_candidates:
            if len(rows) >= TARGET_PER_LEVEL:
                break
            if require_meta and normalize_key(candidate.german) not in metadata:
                continue
            push(candidate)

    if len(rows) < TARGET_PER_LEVEL:
        for require_meta in (True, False):
            for candidate in fallback_candidates:
                if len(rows) >= TARGET_PER_LEVEL:
                    break
                if require_meta and normalize_key(candidate.german) not in metadata:
                    continue
                push(candidate)

    if len(rows) < TARGET_PER_LEVEL:
        raise RuntimeError(f'Could not build {TARGET_PER_LEVEL} vocabulary items for {level}. Built {len(rows)}.')

    return rows[:TARGET_PER_LEVEL]


def ensure_sentence(text: str) -> str:
    text = sanitize_csv_text(text)
    if not text:
        return ''
    if text[-1] not in '.!?':
        return f'{text}.'
    return text


def build_sentences(vocab_by_level: dict[str, list[dict[str, str]]], metadata: dict[str, NoteMeta]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []

    for level in LEVELS:
        seen_german_sentences = set()
        level_rows: list[dict[str, str]] = []

        for vocab_row in vocab_by_level[level]:
            key = normalize_key(vocab_row['german'])
            meta = metadata.get(key)

            german_sentence = ensure_sentence(meta.german_sentence if meta else '')
            english_sentence = ensure_sentence(meta.english_sentence if meta else '')

            if not german_sentence or not english_sentence:
                german_sentence = ensure_sentence(f"Das Wort {vocab_row['german']} ist wichtig auf Niveau {level}")
                english_sentence = ensure_sentence(f"The word {vocab_row['english']} is important at level {level}")

            if german_sentence in seen_german_sentences:
                german_sentence = ensure_sentence(f"Heute lerne ich {vocab_row['german']} auf Niveau {level}")
                english_sentence = ensure_sentence(f"Today I learn {vocab_row['english']} at level {level}")

            seen_german_sentences.add(german_sentence)
            level_rows.append(
                {
                    'german': german_sentence,
                    'english': english_sentence,
                    'difficulty_level': level,
                    'vocabulary_words': vocab_row['german'],
                }
            )

            if len(level_rows) >= TARGET_PER_LEVEL:
                break

        if len(level_rows) != TARGET_PER_LEVEL:
            raise RuntimeError(f'Expected {TARGET_PER_LEVEL} sentences for {level}, got {len(level_rows)}')

        rows.extend(level_rows)

    return rows


def write_vocabulary_csv(rows: list[dict[str, str]]) -> None:
    headers = ['german', 'english', 'part_of_speech', 'gender', 'plural', 'level', 'frequency_rank']
    with VOCAB_CSV_PATH.open('w', encoding='utf-8', newline='') as fp:
        writer = csv.DictWriter(fp, fieldnames=headers)
        writer.writeheader()
        for idx, row in enumerate(rows, start=1):
            row = dict(row)
            row['frequency_rank'] = str(idx)
            writer.writerow(row)


def write_sentences_csv(rows: list[dict[str, str]]) -> None:
    headers = ['german', 'english', 'difficulty_level', 'vocabulary_words']
    with SENTENCES_CSV_PATH.open('w', encoding='utf-8', newline='') as fp:
        writer = csv.DictWriter(fp, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    metadata = parse_anki_metadata()
    if not metadata:
        raise RuntimeError('No vocabulary metadata extracted from Anki notes.')

    a1_candidates = extract_head_candidates_from_pdf(OFFICIAL_SOURCES['A1'])
    a2_candidates = extract_head_candidates_from_pdf(OFFICIAL_SOURCES['A2'])
    b1_candidates = extract_head_candidates_from_pdf(OFFICIAL_SOURCES['B1'])
    b2_candidates = extract_b2_candidates_from_modelset(OFFICIAL_SOURCES['B2'])

    lower_level_keys = {
        normalize_key(c.german)
        for c in (a1_candidates + a2_candidates + b1_candidates)
    }
    b2_candidates = [
        c for c in b2_candidates
        if normalize_key(c.german) not in lower_level_keys and len(normalize_key(c.german)) >= 5
    ]

    vocab_by_level: dict[str, list[dict[str, str]]] = {
        'A1': build_level_vocabulary('A1', a1_candidates, metadata, a2_candidates),
        'A2': build_level_vocabulary('A2', a2_candidates, metadata, b1_candidates),
        'B1': build_level_vocabulary('B1', b1_candidates, metadata, b2_candidates),
        'B2': build_level_vocabulary('B2', b2_candidates, metadata, b1_candidates),
    }

    vocabulary_rows: list[dict[str, str]] = []
    for level in LEVELS:
        vocabulary_rows.extend(vocab_by_level[level])

    sentence_rows = build_sentences(vocab_by_level, metadata)

    write_vocabulary_csv(vocabulary_rows)
    write_sentences_csv(sentence_rows)

    print('Generated datasets successfully:')
    for level in LEVELS:
        print(f'  {level}: {len(vocab_by_level[level])} vocabulary, {TARGET_PER_LEVEL} sentences')
    print(f'  Vocabulary CSV: {VOCAB_CSV_PATH}')
    print(f'  Sentences CSV: {SENTENCES_CSV_PATH}')


if __name__ == '__main__':
    main()
