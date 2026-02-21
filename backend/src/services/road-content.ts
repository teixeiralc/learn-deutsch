import type { Level } from '../types/index.js';

export interface StoryTurnSeed {
  speaker: 'A' | 'B';
  german: string;
  english: string;
  focus_word: string;
}

export interface StoryChapterSeed {
  level: Level;
  chapter_order: number;
  title: string;
  description: string;
  turns: StoryTurnSeed[];
}

export interface StoryTrackSeed {
  slug: string;
  title: string;
  description: string;
  chapters: StoryChapterSeed[];
}

interface ScenarioContext {
  slug: string;
  title: string;
  placeDe: string;
  placeEn: string;
  topicDe: string;
  topicEn: string;
  focusWord: string;
  focusWordEn: string;
}

interface ScenarioFlow {
  slug: string;
  title: string;
  requestActionDe: string;
  requestActionEn: string;
  focusRequest: string;
  focusRequestEn: string;
  focusAdjust: string;
  focusAdjustEn: string;
  focusClose: string;
  focusCloseEn: string;
}

const CONTEXTS: ScenarioContext[] = [
  { slug: 'restaurant', title: 'Restaurant', placeDe: 'im Restaurant', placeEn: 'at the restaurant', topicDe: 'die Bestellung', topicEn: 'the order', focusWord: 'Restaurant', focusWordEn: 'restaurant' },
  { slug: 'cafe', title: 'Cafe', placeDe: 'im Cafe', placeEn: 'at the cafe', topicDe: 'den Kaffeeauftrag', topicEn: 'the coffee order', focusWord: 'Cafe', focusWordEn: 'cafe' },
  { slug: 'bakery', title: 'Bakery', placeDe: 'in der Baeckerei', placeEn: 'at the bakery', topicDe: 'den Broteinkauf', topicEn: 'the bread purchase', focusWord: 'Baeckerei', focusWordEn: 'bakery' },
  { slug: 'supermarket', title: 'Supermarket', placeDe: 'im Supermarkt', placeEn: 'at the supermarket', topicDe: 'den Wocheneinkauf', topicEn: 'the weekly shopping', focusWord: 'Supermarkt', focusWordEn: 'supermarket' },
  { slug: 'pharmacy', title: 'Pharmacy', placeDe: 'in der Apotheke', placeEn: 'at the pharmacy', topicDe: 'das Medikament', topicEn: 'the medication', focusWord: 'Apotheke', focusWordEn: 'pharmacy' },
  { slug: 'doctor-office', title: 'Doctor Office', placeDe: 'in der Arztpraxis', placeEn: 'at the doctor office', topicDe: 'den Arzttermin', topicEn: 'the doctor appointment', focusWord: 'Arztpraxis', focusWordEn: 'doctor office' },
  { slug: 'dentist', title: 'Dentist', placeDe: 'in der Zahnarztpraxis', placeEn: 'at the dentist office', topicDe: 'die Zahnbehandlung', topicEn: 'the dental treatment', focusWord: 'Zahnarzt', focusWordEn: 'dentist' },
  { slug: 'train-station', title: 'Train Station', placeDe: 'am Bahnhof', placeEn: 'at the train station', topicDe: 'die Zugreise', topicEn: 'the train journey', focusWord: 'Bahnhof', focusWordEn: 'station' },
  { slug: 'airport', title: 'Airport', placeDe: 'am Flughafen', placeEn: 'at the airport', topicDe: 'den Flug', topicEn: 'the flight', focusWord: 'Flughafen', focusWordEn: 'airport' },
  { slug: 'bus-station', title: 'Bus Station', placeDe: 'am Busbahnhof', placeEn: 'at the bus station', topicDe: 'die Busfahrt', topicEn: 'the bus trip', focusWord: 'Busbahnhof', focusWordEn: 'bus station' },
  { slug: 'hotel', title: 'Hotel', placeDe: 'im Hotel', placeEn: 'at the hotel', topicDe: 'den Aufenthalt', topicEn: 'the stay', focusWord: 'Hotel', focusWordEn: 'hotel' },
  { slug: 'apartment-rental', title: 'Apartment Rental', placeDe: 'bei der Wohnungsvermietung', placeEn: 'at the apartment rental office', topicDe: 'den Mietvertrag', topicEn: 'the rental contract', focusWord: 'Wohnung', focusWordEn: 'apartment' },
  { slug: 'bank', title: 'Bank', placeDe: 'bei der Bank', placeEn: 'at the bank', topicDe: 'das Konto', topicEn: 'the account', focusWord: 'Bank', focusWordEn: 'bank' },
  { slug: 'post-office', title: 'Post Office', placeDe: 'in der Postfiliale', placeEn: 'at the post office', topicDe: 'das Paket', topicEn: 'the package', focusWord: 'Post', focusWordEn: 'post' },
  { slug: 'library', title: 'Library', placeDe: 'in der Bibliothek', placeEn: 'at the library', topicDe: 'die Ausleihe', topicEn: 'the checkout loan', focusWord: 'Bibliothek', focusWordEn: 'library' },
  { slug: 'university-office', title: 'University Office', placeDe: 'im Studienbuero', placeEn: 'at the university office', topicDe: 'die Einschreibung', topicEn: 'the enrollment', focusWord: 'Studienbuero', focusWordEn: 'study office' },
  { slug: 'job-interview', title: 'Job Interview', placeDe: 'im Bewerbungsgespraech', placeEn: 'in a job interview', topicDe: 'die Bewerbung', topicEn: 'the application', focusWord: 'Bewerbung', focusWordEn: 'application' },
  { slug: 'office-meeting', title: 'Office Meeting', placeDe: 'im Buero', placeEn: 'in the office', topicDe: 'das Projektmeeting', topicEn: 'the project meeting', focusWord: 'Buero', focusWordEn: 'office' },
  { slug: 'customer-support', title: 'Customer Support', placeDe: 'beim Kundendienst', placeEn: 'at customer support', topicDe: 'die Serviceanfrage', topicEn: 'the support request', focusWord: 'Kundendienst', focusWordEn: 'support desk' },
  { slug: 'electronics-store', title: 'Electronics Store', placeDe: 'im Elektronikmarkt', placeEn: 'at the electronics store', topicDe: 'das Geraet', topicEn: 'the device', focusWord: 'Elektronikmarkt', focusWordEn: 'electronics store' },
  { slug: 'car-rental', title: 'Car Rental', placeDe: 'bei der Autovermietung', placeEn: 'at the car rental desk', topicDe: 'den Mietwagen', topicEn: 'the rental car', focusWord: 'Autovermietung', focusWordEn: 'car rental' },
  { slug: 'gym', title: 'Gym', placeDe: 'im Fitnessstudio', placeEn: 'at the gym', topicDe: 'den Vertrag', topicEn: 'the membership contract', focusWord: 'Fitnessstudio', focusWordEn: 'gym' },
  { slug: 'city-hall', title: 'City Hall', placeDe: 'im Rathaus', placeEn: 'at city hall', topicDe: 'den Antrag', topicEn: 'the application form', focusWord: 'Rathaus', focusWordEn: 'city hall' },
  { slug: 'insurance-office', title: 'Insurance Office', placeDe: 'bei der Versicherung', placeEn: 'at the insurance office', topicDe: 'den Versicherungsfall', topicEn: 'the insurance case', focusWord: 'Versicherung', focusWordEn: 'insurance' },
  { slug: 'event-planning', title: 'Event Planning', placeDe: 'bei der Eventplanung', placeEn: 'at the event planning desk', topicDe: 'die Veranstaltung', topicEn: 'the event', focusWord: 'Veranstaltung', focusWordEn: 'event' },
];

const FLOWS: ScenarioFlow[] = [
  {
    slug: 'start-request',
    title: 'Start Request',
    requestActionDe: 'eine Anfrage einreichen',
    requestActionEn: 'submit a request',
    focusRequest: 'Anfrage',
    focusRequestEn: 'request',
    focusAdjust: 'Details',
    focusAdjustEn: 'details',
    focusClose: 'Bestaetigung',
    focusCloseEn: 'confirmation',
  },
  {
    slug: 'adjust-plan',
    title: 'Adjust Plan',
    requestActionDe: 'den Plan aendern',
    requestActionEn: 'change the plan',
    focusRequest: 'aendern',
    focusRequestEn: 'change',
    focusAdjust: 'Option',
    focusAdjustEn: 'option',
    focusClose: 'Termin',
    focusCloseEn: 'appointment',
  },
  {
    slug: 'solve-issue',
    title: 'Solve Issue',
    requestActionDe: 'ein Problem melden',
    requestActionEn: 'report an issue',
    focusRequest: 'Problem',
    focusRequestEn: 'issue',
    focusAdjust: 'Loesung',
    focusAdjustEn: 'solution',
    focusClose: 'Ergebnis',
    focusCloseEn: 'result',
  },
  {
    slug: 'finalize-payment',
    title: 'Finalize Payment',
    requestActionDe: 'die Rechnung pruefen',
    requestActionEn: 'review the bill',
    focusRequest: 'Rechnung',
    focusRequestEn: 'bill',
    focusAdjust: 'Betrag',
    focusAdjustEn: 'amount',
    focusClose: 'Bezahlung',
    focusCloseEn: 'payment',
  },
];

function buildTurns(level: Level, context: ScenarioContext, flow: ScenarioFlow): StoryTurnSeed[] {
  if (level === 'A1') {
    return [
      {
        speaker: 'A',
        german: `Hallo, ich bin heute ${context.placeDe} wegen ${context.topicDe}.`,
        english: `Hello, I am ${context.placeEn} today because of ${context.topicEn}.`,
        focus_word: context.focusWord,
      },
      {
        speaker: 'B',
        german: 'Hallo, ich kann Ihnen gern helfen.',
        english: 'Hello, I can gladly help you.',
        focus_word: 'helfen',
      },
      {
        speaker: 'A',
        german: `Ich moechte ${flow.requestActionDe}.`,
        english: `I would like to ${flow.requestActionEn}.`,
        focus_word: flow.focusRequest,
      },
      {
        speaker: 'B',
        german: `Kein Problem, wir pruefen jetzt die ${flow.focusAdjust}.`,
        english: `No problem, we now review the ${flow.focusAdjustEn}.`,
        focus_word: flow.focusAdjust,
      },
      {
        speaker: 'A',
        german: `Danke, ich warte auf die ${flow.focusClose}.`,
        english: `Thanks, I am waiting for the ${flow.focusCloseEn}.`,
        focus_word: flow.focusClose,
      },
    ];
  }

  if (level === 'A2') {
    return [
      {
        speaker: 'A',
        german: `Ich habe eine Frage zu ${context.topicDe} ${context.placeDe}.`,
        english: `I have a question about ${context.topicEn} ${context.placeEn}.`,
        focus_word: context.focusWord,
      },
      {
        speaker: 'B',
        german: 'Gern, schildern Sie kurz die Situation und ich helfe Ihnen sofort.',
        english: 'Sure, describe the situation briefly and I will help right away.',
        focus_word: 'helfe',
      },
      {
        speaker: 'A',
        german: `Ich moechte ${flow.requestActionDe}, aber bitte mit klaren Angaben.`,
        english: `I would like to ${flow.requestActionEn}, but please with clear information.`,
        focus_word: flow.focusRequest,
      },
      {
        speaker: 'B',
        german: `Das ist moeglich, wir geben Ihnen eine passende ${flow.focusAdjust}.`,
        english: `That is possible, we will give you a fitting ${flow.focusAdjustEn}.`,
        focus_word: flow.focusAdjust,
      },
      {
        speaker: 'A',
        german: `Perfekt, dann sende ich heute noch alles fuer die ${flow.focusClose}.`,
        english: `Perfect, then I will send everything today for the ${flow.focusCloseEn}.`,
        focus_word: flow.focusClose,
      },
    ];
  }

  if (level === 'B1') {
    return [
      {
        speaker: 'A',
        german: `Wegen einer Aenderung bei ${context.topicDe} brauche ich Unterstuetzung ${context.placeDe}.`,
        english: `Because of a change in ${context.topicEn}, I need support ${context.placeEn}.`,
        focus_word: context.focusWord,
      },
      {
        speaker: 'B',
        german: 'Verstanden, wir helfen Ihnen und suchen eine praktikable Loesung.',
        english: 'Understood, we will help you and look for a practical solution.',
        focus_word: 'helfen',
      },
      {
        speaker: 'A',
        german: `Ich moechte ${flow.requestActionDe}, weil sich mein Zeitplan verschoben hat.`,
        english: `I want to ${flow.requestActionEn} because my schedule has shifted.`,
        focus_word: flow.focusRequest,
      },
      {
        speaker: 'B',
        german: `Dann priorisieren wir die ${flow.focusAdjust} und stimmen alles mit dem Team ab.`,
        english: `Then we prioritize the ${flow.focusAdjustEn} and align everything with the team.`,
        focus_word: flow.focusAdjust,
      },
      {
        speaker: 'A',
        german: `Sehr gut, so kann ich das ${flow.focusClose} rechtzeitig abschliessen.`,
        english: `Very good, this way I can finish the ${flow.focusCloseEn} on time.`,
        focus_word: flow.focusClose,
      },
    ];
  }

  return [
    {
      speaker: 'A',
      german: `Im Kontext von ${context.topicDe} benoetige ich ${context.placeDe} eine belastbare Abstimmung.`,
      english: `In the context of ${context.topicEn}, I need a reliable alignment ${context.placeEn}.`,
      focus_word: context.focusWord,
    },
    {
      speaker: 'B',
      german: 'Selbstverstaendlich, wir helfen strukturiert und dokumentieren jeden Schritt transparent.',
      english: 'Certainly, we help in a structured way and document each step transparently.',
      focus_word: 'helfen',
    },
    {
      speaker: 'A',
      german: `Ich moechte ${flow.requestActionDe}, da sonst Folgekosten entstehen.`,
      english: `I would like to ${flow.requestActionEn}, otherwise follow-up costs will arise.`,
      focus_word: flow.focusRequest,
    },
    {
      speaker: 'B',
      german: `Wir dokumentieren jede ${flow.focusAdjust} verbindlich und sichern die Nachvollziehbarkeit.`,
      english: `We document each ${flow.focusAdjustEn} in a binding way and ensure traceability.`,
      focus_word: flow.focusAdjust,
    },
    {
      speaker: 'A',
      german: `Perfekt, nach Ihrer ${flow.focusClose} gebe ich den Vorgang frei.`,
      english: `Perfect, after your ${flow.focusCloseEn} I will approve the process.`,
      focus_word: flow.focusClose,
    },
  ];
}

function buildTrack(context: ScenarioContext, flow: ScenarioFlow, order: number): StoryTrackSeed {
  const title = `${context.title}: ${flow.title}`;
  const slug = `${context.slug}-${flow.slug}`;
  const description = `${context.title} scenario focused on ${flow.focusRequestEn}, ${flow.focusAdjustEn}, and ${flow.focusCloseEn}.`;

  const chapters: StoryChapterSeed[] = (['A1', 'A2', 'B1', 'B2'] as Level[]).map((level) => {
    const chapterTitleByLevel: Record<Level, string> = {
      A1: `${context.title} Basics`,
      A2: `${context.title} with Details`,
      B1: `${context.title} Problem Solving`,
      B2: `${context.title} Professional Handling`,
    };

    const chapterDescriptionByLevel: Record<Level, string> = {
      A1: `Practice simple requests in ${context.title.toLowerCase()} situations.`,
      A2: `Add details and preferences in a realistic ${context.title.toLowerCase()} dialogue.`,
      B1: `Handle changes and constraints in the same ${context.title.toLowerCase()} context.`,
      B2: `Negotiate precise outcomes in advanced ${context.title.toLowerCase()} interactions.`,
    };

    return {
      level,
      chapter_order: order,
      title: chapterTitleByLevel[level],
      description: chapterDescriptionByLevel[level],
      turns: buildTurns(level, context, flow),
    };
  });

  return {
    slug,
    title,
    description,
    chapters,
  };
}

function buildRoadStorySeeds(): StoryTrackSeed[] {
  const seeds: StoryTrackSeed[] = [];
  let order = 1;

  for (const context of CONTEXTS) {
    for (const flow of FLOWS) {
      seeds.push(buildTrack(context, flow, order));
      order += 1;
    }
  }

  return seeds;
}

export const ROAD_STORY_SEEDS: StoryTrackSeed[] = buildRoadStorySeeds();
