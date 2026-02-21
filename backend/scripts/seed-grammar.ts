#!/usr/bin/env node
// Run: npx tsx backend/scripts/seed-grammar.ts (from project root)
// Or: npm run seed (from backend/)

import { runMigrations } from '../src/db/database.js';
import db from '../src/db/database.js';

runMigrations();

const grammarTopics = [
  // A1
  { name: 'Personal Pronouns', level: 'A1', explanation: 'German personal pronouns: ich (I), du (you informal), er (he), sie (she), es (it), wir (we), ihr (you plural), sie/Sie (they/you formal).', examples: JSON.stringify(['Ich bin Lucas.', 'Du bist toll.', 'Er kommt aus Deutschland.']) },
  { name: 'Definite Articles (der, die, das)', level: 'A1', explanation: 'German nouns have three genders: masculine (der), feminine (die), neuter (das). In plural, all use "die".', examples: JSON.stringify(['der Mann (the man)', 'die Frau (the woman)', 'das Kind (the child)']) },
  { name: 'Indefinite Articles (ein, eine)', level: 'A1', explanation: 'Indefinite articles: ein (masculine/neuter), eine (feminine). No plural indefinite article.', examples: JSON.stringify(['ein Mann (a man)', 'eine Frau (a woman)', 'ein Kind (a child)']) },
  { name: 'Present Tense (Präsens)', level: 'A1', explanation: 'Regular verbs: -e, -st, -t, -en, -t, -en for ich/du/er/wir/ihr/sie.', examples: JSON.stringify(['ich mache', 'du machst', 'er macht', 'wir machen']) },
  { name: 'Verb "sein" (to be)', level: 'A1', explanation: 'Irregular: ich bin, du bist, er/sie/es ist, wir sind, ihr seid, sie/Sie sind.', examples: JSON.stringify(['Ich bin Lehrer.', 'Du bist nett.', 'Wir sind Freunde.']) },
  { name: 'Verb "haben" (to have)', level: 'A1', explanation: 'Irregular: ich habe, du hast, er/sie/es hat, wir haben, ihr habt, sie/Sie haben.', examples: JSON.stringify(['Ich habe einen Hund.', 'Sie hat ein Auto.', 'Wir haben Zeit.']) },
  { name: 'Basic Word Order (SVO)', level: 'A1', explanation: 'Subject-Verb-Object. Verb must always be in second position.', examples: JSON.stringify(['Ich trinke Kaffee.', 'Sie liest ein Buch.']) },
  { name: 'Negation with "nicht" and "kein"', level: 'A1', explanation: '"Nicht" negates verbs/adjectives. "Kein" negates nouns.', examples: JSON.stringify(['Ich bin nicht müde.', 'Ich habe kein Auto.']) },
  // A2
  { name: 'Nominative and Accusative Cases', level: 'A2', explanation: 'Nominative = subject. Accusative = direct object. Der → den (masculine acc.).', examples: JSON.stringify(['Der Mann kauft den Apfel.', 'Ich sehe einen Hund.']) },
  { name: 'Dative Case', level: 'A2', explanation: 'Dative = indirect object. der/das → dem, die → der. Used after: mit, nach, seit, von, zu.', examples: JSON.stringify(['Ich helfe dem Mann.', 'Er gibt der Frau ein Buch.']) },
  { name: 'Modal Verbs', level: 'A2', explanation: 'können, müssen, wollen, sollen, dürfen, mögen. Infinitive goes to end.', examples: JSON.stringify(['Ich kann schwimmen.', 'Du musst arbeiten.']) },
  { name: 'Separable Verbs', level: 'A2', explanation: 'Prefix splits off to end: anrufen → Ich rufe an.', examples: JSON.stringify(['Ich rufe an.', 'Er macht das Fenster auf.']) },
  { name: 'Perfect Tense (Perfekt)', level: 'A2', explanation: 'haben/sein + past participle. Motion verbs use sein.', examples: JSON.stringify(['Ich habe gegessen.', 'Wir sind gefahren.']) },
  // B1
  { name: 'Genitive Case', level: 'B1', explanation: 'Shows possession. des + noun, der (fem/pl). After: trotz, wegen, während.', examples: JSON.stringify(['das Auto des Mannes', 'wegen des Wetters']) },
  { name: 'Subordinate Clauses', level: 'B1', explanation: 'weil, dass, wenn, obwohl, damit send verb to clause end.', examples: JSON.stringify(['Ich lerne Deutsch, weil es interessant ist.']) },
  { name: 'Relative Clauses', level: 'B1', explanation: 'Relative pronoun matches noun gender. Verb at end.', examples: JSON.stringify(['Das Buch, das ich lese, ist interessant.']) },
  { name: 'Konjunktiv II (Subjunctive)', level: 'B1', explanation: 'Polite requests and hypotheticals: hätte, wäre, könnte, würde.', examples: JSON.stringify(['Ich hätte gern einen Kaffee.', 'Das wäre schön.']) },
  // B2
  { name: 'Passive Voice (Passiv)', level: 'B2', explanation: 'werden + past participle. Agent with "von + dative".', examples: JSON.stringify(['Das Buch wird gelesen.', 'Das Haus wurde gebaut.']) },
  { name: 'Infinitive Clauses (zu + Infinitiv)', level: 'B2', explanation: 'Infinitive with "zu" after certain verbs. Separable: -zu- inserted.', examples: JSON.stringify(['Ich versuche, Deutsch zu lernen.']) },
  { name: 'Extended Attribute (Erweitertes Attribut)', level: 'B2', explanation: 'Stacked modifiers before noun, including participles.', examples: JSON.stringify(['das von mir geschriebene Buch']) },
];

const insertTopic = db.prepare(`INSERT OR IGNORE INTO grammar_topics (name, level, explanation, examples) VALUES (@name, @level, @explanation, @examples)`);
const insertAll = db.transaction(() => { for (const t of grammarTopics) insertTopic.run(t); });
insertAll();
console.log(`✅ Seeded ${grammarTopics.length} grammar topics`);
