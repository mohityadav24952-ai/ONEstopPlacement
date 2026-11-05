import type { PlaceyMode } from "@/components/placey/accessories";

/**
 * Placey's voice. Every line opens with Placey introducing itself, then says something that fits
 * the mode. Short, warm, a little silly. Nothing here claims to know anything about the user's
 * progress: lines are encouragement, never statistics.
 */
const HI = {
  a: "HI HI HI, I am Placey! ✨ ",
  b: "Hey hey! Placey here! 💜 ",
  c: "Hiiii! I'm Placey! ",
  d: "Hellooo! Placey here: ",
} as const;

export const QUOTES: Record<PlaceyMode, string[]> = {
  classic: [
    HI.a + "Ready to make some progress today?",
    HI.b + "I've been waiting for you!",
    HI.c + "Let's make today count! ✨",
    HI.d + "your dreams aren't going to achieve themselves, hehe!",
    HI.a + "Your future self is going to thank you.",
    HI.b + "One tiny step now is a giant leap later!",
    HI.c + "You're doing great. Seriously!",
  ],
  study: [
    HI.a + "One concept at a time, you've got this! 📚",
    HI.b + "Study smart, superstar! 💡",
    HI.c + "Knowledge loading... brain growing!",
    HI.d + "let's crack that interview together!",
    HI.a + "Small steps, big dreams. Ready to read?",
    HI.b + "A tiny break after each topic helps it stick!",
    HI.c + "Revisit the tricky ones, that's where the magic is!",
  ],
  tech: [
    HI.a + "Let's build something awesome! 💻",
    HI.b + "Another coding adventure? I'm in!",
    HI.c + "Curiosity is your superpower!",
    HI.d + "debugging time! 🔍 Let's hunt that bug!",
    HI.a + "Code. Explore. Create. Repeat!",
    HI.b + "Every repo is a little story of you!",
    HI.c + "Stuck? Breathe, then read the error slowly.",
  ],
  motivated: [
    HI.a + "YOU'RE ON FIRE! 🔥",
    HI.b + "LOOK AT YOU GO!",
    HI.c + "Keep that momentum, superstar!",
    HI.d + "you're getting stronger every single day!",
    HI.a + "One more? I BELIEVE IN YOU! 💪",
    HI.b + "Consistency looks SO good on you!",
    HI.c + "That was awesome! Tiny hands clapping! 👏",
  ],
  hacker: [
    HI.a + "Focus mode: ACTIVATED. 😎",
    HI.b + "Hack smarter, dream bigger!",
    HI.c + "We don't fear bugs. Bugs fear us!",
    HI.d + "just one more challenge...",
    HI.a + "Silent mode. Maximum productivity.",
    HI.b + "Debugging is my cardio! 💻",
    HI.c + "Shades on, bugs beware!",
  ],
  chill: [
    HI.a + "Take a little break, buddy. ☁️",
    HI.b + "Rest, recharge, return stronger. 💜",
    HI.c + "Even legends need rest!",
    HI.d + "don't forget water and a stretch!",
    HI.a + "You've been working so hard. Proud of you!",
    HI.b + "Breathe in... breathe out... better already!",
    HI.c + "The code will still be here after a snack.",
  ],
  victory: [
    HI.a + "YOU DID ITTT! 🎉",
    HI.b + "Another milestone unlocked!",
    HI.c + "SOOO proud of you! 👑",
    HI.d + "that deserves a celebration!",
    HI.a + "Look how far you've come! ✨",
    HI.b + "Confetti time! A tiny trophy for you! 🏆",
    HI.c + "You worked for this. Enjoy it!",
  ],
  resume: [
    HI.a + "Let's make that resume shine! ✨",
    HI.b + "Your experience deserves a great presentation.",
    HI.c + "Only real facts go in, promise!",
    HI.d + "one clear bullet beats three vague ones!",
    HI.a + "Read it out loud. Typos hate that!",
    HI.b + "Approved means it's truly yours. Proud! 💜",
  ],
  portfolio: [
    HI.a + "Let's build something beautiful! 🎨",
    HI.b + "Your portfolio is your story!",
    HI.c + "Pick a look you love. It's all you!",
    HI.d + "show your best projects first!",
    HI.a + "Check what's public before you share. Safety first!",
    HI.b + "Small, clear, honest. That's a great portfolio!",
  ],
};

/** When the user pokes Placey. */
export const CLICK_QUOTES = [
  HI.a + "That tickled! 💜",
  HI.b + "You're doing great!",
  HI.c + "Don't worry, we got this!",
  HI.d + "okayyy, one more challenge?",
  HI.a + "You're literally building your future right now!",
  HI.b + "Boop! Back to being awesome?",
  HI.c + "WAITTT... did you just poke me? Hehe!",
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

export const modeLine = (mode: PlaceyMode) => pickLine(mode, QUOTES[mode]);
export const clickLine = () => pickLine("click", CLICK_QUOTES);

/** Reading time: a floor plus a little per character. */
export const readMs = (text: string) => 4000 + text.length * 45;

export function resetQuoteHistory(): void {
  history.clear();
}
