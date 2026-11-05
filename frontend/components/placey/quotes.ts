import type { PlaceyMode } from "@/components/placey/accessories";

/**
 * Placey's voice. Short, warm, a little silly. Nothing here claims to know anything about
 * the user's progress: lines are encouragement, never statistics.
 */
export const QUOTES: Record<PlaceyMode, string[]> = {
  classic: [
    "HEYYYY! Welcome back! 💜",
    "Ready to make some progress?",
    "I've been waiting for you!",
    "Let's make today count! ✨",
    "Your dreams aren't going to achieve themselves!",
    "hehehe, you're doing great!",
    "Your future self is going to thank you.",
  ],
  study: [
    "One concept at a time!",
    "Study smart, superstar! 📚",
    "Knowledge loading...",
    "Let's crack that interview!",
    "Small steps. Big dreams.",
    "Interview preparation activated!",
    "Let's get you interview-ready!",
  ],
  tech: [
    "Let's build something awesome!",
    "Another coding adventure?",
    "Curiosity is your superpower!",
    "Debugging time! 🔍",
    "Code. Explore. Create.",
  ],
  motivated: [
    "BROOO! YOU'RE ON FIRE! 🔥",
    "LOOK AT YOU GO!",
    "Keep that momentum!",
    "You're getting stronger!",
    "One more? I BELIEVE IN YOU!",
    "Consistency looks good on you!",
  ],
  hacker: [
    "Focus mode: ACTIVATED.",
    "Hack smarter, dream bigger!",
    "We don't fear bugs.",
    "Just one more challenge...",
    "Silent mode. Maximum productivity. 😎",
    "Debugging is my cardio.",
  ],
  chill: [
    "Take a little break, buddy. 💜",
    "Rest. Recharge. Return stronger.",
    "Even legends need rest!",
    "Don't forget to take care of yourself.",
    "You've been working hard!",
  ],
  victory: [
    "YOU DID ITTT! 🎉",
    "Another milestone unlocked!",
    "SOOO PROUD OF YOU!",
    "That deserves a celebration!",
    "Look how far you've come!",
  ],
  resume: [
    "Let's make that resume shine!",
    "Your experience deserves a great presentation.",
    "Only real facts go in. I promise. 💜",
  ],
  portfolio: [
    "Let's build something beautiful!",
    "Your portfolio is your story!",
    "Pick a look you love. ✨",
  ],
};

/** When the user pokes Placey. */
export const CLICK_QUOTES = [
  "hehehe, you're doing great!",
  "WAITTT... that tickled!",
  "Don't worry, we got this!",
  "Okayyy, one more challenge?",
  "You're literally building your future right now!",
  "Hi hi hi! 💜",
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
