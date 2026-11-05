import type { PlaceyMode } from "@/components/placey/accessories";

/**
 * Placey's voice. In every pool, the FIRST line is the self-introduction for that mode; it is used
 * once per browser session the first time Placey speaks in that mode. All the other lines never
 * re-introduce Placey, they just match the mood of the mode.
 * Nothing here claims to know anything about the user's progress: lines are encouragement,
 * never statistics.
 */
export const QUOTES: Record<PlaceyMode, string[]> = {
  classic: [
    "HI HI HI! I am Placey! ✨ Your tiny buddy for the whole journey.",
    "Ready to make some progress today?",
    "I've been waiting for you!",
    "Let's make today count! ✨",
    "Your dreams aren't going to achieve themselves, hehe!",
    "Your future self is going to thank you.",
    "One tiny step now is a giant leap later!",
  ],
  study: [
    "Hey hey! I am Placey! 💜 Study buddy reporting for duty, cap on!",
    "One concept at a time, you've got this! 📚",
    "Study smart, superstar! 💡",
    "Knowledge loading... brain growing!",
    "Let's crack that interview together!",
    "A tiny break after each topic helps it stick!",
    "Revisit the tricky ones, that's where the magic is!",
  ],
  tech: [
    "Hiiii! I am Placey! 💻 Headphones on, let's explore some code!",
    "Another coding adventure? I'm in!",
    "Curiosity is your superpower!",
    "Debugging time! 🔍 Let's hunt that bug!",
    "Code. Explore. Create. Repeat!",
    "Every repo is a little story of you!",
    "Stuck? Breathe, then read the error slowly.",
  ],
  motivated: [
    "HI HI HI! I am Placey! 🔥 And I am SO pumped for you right now!",
    "YOU'RE ON FIRE!",
    "LOOK AT YOU GO!",
    "Keep that momentum, superstar!",
    "You're getting stronger every single day!",
    "One more? I BELIEVE IN YOU! 💪",
    "Consistency looks SO good on you!",
  ],
  hacker: [
    "Hellooo! I am Placey! 😎 Hoodie up, shades on, let's focus.",
    "Focus mode: ACTIVATED.",
    "Hack smarter, dream bigger!",
    "We don't fear bugs. Bugs fear us!",
    "Just one more challenge...",
    "Silent mode. Maximum productivity.",
    "Debugging is my cardio! 💻",
  ],
  chill: [
    "Hey hey! I am Placey! ☁️ Come sit with me on my cloud for a bit.",
    "Take a little break, buddy.",
    "Rest, recharge, return stronger. 💜",
    "Even legends need rest!",
    "Don't forget water and a stretch!",
    "You've been working so hard. Proud of you!",
    "The code will still be here after a snack.",
  ],
  victory: [
    "HI HI HI! I am Placey! 👑 And look at what YOU just did!",
    "YOU DID ITTT! 🎉",
    "Another milestone unlocked!",
    "SOOO proud of you!",
    "That deserves a celebration!",
    "Look how far you've come! ✨",
    "Confetti time! A tiny trophy for you! 🏆",
  ],
  resume: [
    "Hiiii! I am Placey! 💜 Glasses on, let's polish your resume.",
    "Let's make that resume shine! ✨",
    "Your experience deserves a great presentation.",
    "Only real facts go in, promise!",
    "One clear bullet beats three vague ones!",
    "Read it out loud. Typos hate that!",
    "Approved means it's truly yours. Proud! 💜",
  ],
  portfolio: [
    "Hellooo! I am Placey! 🎨 Palette ready, let's make something pretty.",
    "Let's build something beautiful!",
    "Your portfolio is your story!",
    "Pick a look you love. It's all you!",
    "Show your best projects first!",
    "Check what's public before you share. Safety first!",
    "Small, clear, honest. That's a great portfolio!",
  ],
};

/** When the user pokes Placey. No introductions: Placey already knows you. */
export const CLICK_QUOTES = [
  "Hehe, that tickled! 💜",
  "You're doing great!",
  "Don't worry, we got this!",
  "Okayyy, one more challenge?",
  "You're literally building your future right now!",
  "Boop! Back to being awesome?",
  "WAITTT... did you just poke me? Hehe!",
];

export const SPEECH_CONFIG = {
  /** Minimum gap between unprompted bubbles (route entry, idle chatter, break reminders). */
  cooldownMs: 90_000,
  /** Idle chatter fires at a random time inside this window. */
  ambientMinMs: 4 * 60_000,
  ambientMaxMs: 8 * 60_000,
  /** How many recent lines per pool are skipped when choosing the next one. */
  noRepeat: 3,
} as const;

const history = new Map<string, string[]>();

/** Pick a random line that was not used in the last few picks from the same pool. */
export function pickLine(poolKey: string, pool: readonly string[], rand: () => number = Math.random): string {
  const recent = history.get(poolKey) ?? [];
  const avoid = Math.min(SPEECH_CONFIG.noRepeat, pool.length - 1);
  const fresh = pool.filter((q) => !recent.slice(-avoid).includes(q));
  const choices = fresh.length ? fresh : pool;
  const line = choices[Math.floor(rand() * choices.length)];
  history.set(poolKey, [...recent, line].slice(-6));
  return line;
}

const INTRO_KEY = "placey:introduced";
const introduced = new Set<string>();
let introLoaded = false;

function loadIntroduced(): void {
  if (introLoaded) return;
  introLoaded = true;
  try {
    const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(INTRO_KEY) : null;
    if (raw) (JSON.parse(raw) as string[]).forEach((m) => introduced.add(m));
  } catch {
    // storage blocked or unreadable: introductions simply repeat once per page load
  }
}

function saveIntroduced(): void {
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(INTRO_KEY, JSON.stringify([...introduced]));
  } catch {
    // ignore
  }
}

/**
 * The first line of every pool is the introduction for that mode. It is used the first time
 * Placey speaks in that mode during a browser session; after that only the other lines are used.
 */
export function modeLine(mode: PlaceyMode): string {
  loadIntroduced();
  const pool = QUOTES[mode];
  if (!introduced.has(mode)) {
    introduced.add(mode);
    saveIntroduced();
    return pool[0];
  }
  return pickLine(mode, pool.slice(1));
}

/** Shouty or celebratory lines make Placey jump for joy. */
export function isHype(text: string): boolean {
  return /[A-Z]{4,}/.test(text) || /[🔥🎉👏💪🏆👑]/u.test(text);
}
export const clickLine = () => pickLine("click", CLICK_QUOTES);

/** Reading time: a floor plus a little per character. */
export const readMs = (text: string) => 4000 + text.length * 45;

export function resetQuoteHistory(): void {
  history.clear();
  introduced.clear();
  introLoaded = true;
}
