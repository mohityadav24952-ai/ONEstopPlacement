import type { PlaceyMode } from "@/components/placey/accessories";

/**
 * Placey's voice: one character, seven moods. 20 lines per mood, each written to sound like the
 * same little buddy (warm, playful, on your side), just feeling different:
 *   classic  sweet and dreamy        study    smart and supportive      techExplorer curious and inventive
 *   motivated loud and dramatic      hacker   witty and geeky           chill        soft and comforting
 *   victory  ridiculously proud
 * Nothing here claims to know anything about the user's progress: lines are encouragement,
 * never statistics.
 */
export const placeyQuotes = {
  classic: [
    "Psst... your dreams called. They said keep going! 💜",
    "Heyyy, my favourite human is here!",
    "A little progress is still magic. ✨",
    "Today feels like a good day to become unstoppable!",
    "Guess what? You're doing better than you think.",
    "I saved you a little sparkle today!",
    "Dream big. I'll handle the cheering!",
    "The world is waiting for your little magic.",
    "Oh look! My favourite notification — YOU!",
    "Let's turn this ordinary day into something extraordinary.",
    "Your journey is my favourite story.",
    "Even the tiniest steps lead to beautiful places.",
    "Don't mind me, just floating around your dreams!",
    "You bring the ambition, I'll bring the sparkles!",
    "Something wonderful might happen today. Why not?",
    "Hey sunshine! Ready for another adventure?",
    "Your potential called. It wants more screen time!",
    "A little chaos, a lot of dreams, and us!",
    "I believe in your plot twist!",
    "Stay curious, stay magical, stay YOU! 🌸",
  ],
  study: [
    "One page today. One step closer tomorrow.",
    "Your future interview self is thanking you already!",
    "Learning looks ridiculously good on you. 🤓",
    "Confused? Perfect. That's where learning begins!",
    "Let's turn those question marks into exclamation marks!",
    "Read it. Understand it. Own it.",
    "Your brain called. It's ready for an upgrade!",
    "A little revision now saves a lot of panic later.",
    "Don't memorise everything. Understand the magic!",
    "Every concept you master is another door unlocked.",
    "That difficult topic won't defeat us today!",
    "Tiny study sessions. Massive future energy.",
    "Think like a learner. Answer like a pro.",
    "Your dream company isn't ready for this preparation!",
    "Curiosity is the cutest form of intelligence.",
    "One more concept? Pretty please? 🥺",
    "Mistakes are just lessons wearing disguises.",
    "Interviewers ask questions. You bring the answers!",
    "Keep learning. Your confidence is loading...",
    "Today's effort is tomorrow's 'I got selected!'",
  ],
  techExplorer: [
    "Hello, fellow problem solver! What's cooking?",
    "Every great idea starts with a little curiosity.",
    "Let's make the compiler proud today!",
    "New problem detected. Adventure accepted!",
    "Code is just creativity with logic.",
    "Your next breakthrough might be one bug away!",
    "Think outside the box. Then optimise the box.",
    "Curious minds make incredible developers.",
    "The keyboard is your canvas. Go create!",
    "Let's turn caffeine-free curiosity into clean code!",
    "A new algorithm? My favourite kind of adventure!",
    "Build something that makes someone say WOW.",
    "Your imagination has no syntax errors!",
    "Explore more. Experiment more. Grow more.",
    "Today's little experiment could become tomorrow's big idea.",
    "Code doesn't have to be perfect. It has to evolve.",
    "Let's make something ridiculously cool!",
    "Your IDE is calling. It misses you!",
    "Ideas are cheap. Building them is magical.",
    "Ready, set, compile! 🚀",
  ],
  motivated: [
    "BROOOOO! LOOK AT YOU GO!!! 🔥",
    "WHO GAVE YOU PERMISSION TO BE THIS GOOD?!",
    "THAT'S MY HUMANNNN!",
    "Not stopping now. We're on a ROLLLLL!",
    "YOU DID THAT. YES, YOU!",
    "Your consistency is becoming SCARY GOOD!",
    "EXCUSE ME?! THAT WAS IMPRESSIVE!",
    "Another win? I'm running out of confetti!",
    "Main character energy detected!",
    "You're not just showing up. You're SHOWING OFF!",
    "THE MOMENTUM IS MOMENTUMING!",
    "I need a moment... I'M SO PROUD OF YOU!",
    "Who needs luck when you've got this discipline?",
    "Small steps? Nah. GIANT ENERGY!",
    "Your competition should be taking notes!",
    "Keep cooking, chef! 👨‍🍳",
    "That progress deserves its own soundtrack!",
    "I'M BOUNCING BECAUSE YOU'RE WINNING!",
    "You said you'd do it. AND YOU DID!",
    "One more victory and I'll need a bigger crown!",
  ],
  hacker: [
    "404: Fear Not Found.",
    "Bug? I prefer unexpected plot twist.",
    "Shhh... genius at work.",
    "Sleep? We have unresolved dependencies.",
    "Keep calm and commit often.",
    "sudo make_my_future_awesome",
    "Your logic is cleaner than my hoodie.",
    "Breaking problems, not production. Hopefully.",
    "It's not a bug. It's a character-building exercise.",
    "while(alive) { code(); }",
    "Error messages are just computers being dramatic.",
    "Your code has potential. So does my coffee addiction.",
    "Less scrolling. More compiling.",
    "One terminal. Infinite possibilities.",
    "Debug first. Panic never.",
    "I'm not lazy. I'm in low-power mode.",
    "Git commit: another step towards greatness.",
    "The matrix called. It wants your problem-solving skills.",
    "Code silently. Let the results make noise.",
    "Stay sharp. Stay curious. Stay dangerous... to bugs. 😎",
  ],
  chill: [
    "Pssst... even stars need a little darkness.",
    "You don't have to win every minute.",
    "Breathe in. Breathe out. You're doing fine.",
    "Rest is productive too, silly!",
    "Your worth isn't measured in completed tasks.",
    "Let's give that brilliant brain a hug.",
    "Slow days are still part of the journey.",
    "No rush, little human. We're getting there.",
    "The world can wait five minutes. Promise.",
    "A tired mind deserves a soft landing.",
    "You can pause without losing your progress.",
    "Hydration check! Your tiny buddy insists. 💧",
    "Close your eyes. The dreams can keep running.",
    "Rest now. Return with fresh sparkle.",
    "You have permission to take it easy.",
    "Not every moment needs to be productive.",
    "Sending you one tiny cloud-sized hug!",
    "It's okay to recharge before the next adventure.",
    "Even superheroes have nap schedules.",
    "Be gentle with yourself. You're growing.",
  ],
  victory: [
    "STOP EVERYTHING. WE HAVE A CHAMPION!",
    "THAT'S ANOTHER MILESTONE UNLOCKED! 🏆",
    "I KNEW YOU HAD IT IN YOU!",
    "Someone call the celebration committee!",
    "Achievement unlocked: ABSOLUTE LEGEND.",
    "I'M NOT CRYING. MY EYES ARE JUST SPARKLING!",
    "Your hard work just became a beautiful result.",
    "THE CROWN LOOKS GOOD ON YOU!",
    "And that's how legends are made!",
    "One dream. One milestone. Countless possibilities.",
    "You didn't get lucky. You got BETTER.",
    "I would throw a party, but I'm a blob.",
    "This is your reminder: YOU CAN DO HARD THINGS!",
    "Confetti budget: COMPLETELY EXHAUSTED!",
    "Your future just got a little brighter!",
    "Proud buddy moment. Please hold while I happy-bounce!",
    "Another reason to believe in yourself!",
    "You turned effort into achievement. THAT'S HUGE!",
    "Screenshot this feeling. Remember it forever!",
    "THE WORLD BETTER MAKE ROOM FOR YOU! 👑",
  ],
} as const;

export type QuoteMood = keyof typeof placeyQuotes;

/** Resume and Portfolio are outfits of Classic Dreamy, so they speak in Classic's voice. */
const MOOD_FOR_MODE: Record<PlaceyMode, QuoteMood> = {
  classic: "classic",
  study: "study",
  tech: "techExplorer",
  motivated: "motivated",
  hacker: "hacker",
  chill: "chill",
  victory: "victory",
  resume: "classic",
  portfolio: "classic",
};

export const moodFor = (mode: PlaceyMode): QuoteMood => MOOD_FOR_MODE[mode];

/** Quotes by Placey mode id (same arrays as `placeyQuotes`, keyed the way the app names modes). */
export const QUOTES: Record<PlaceyMode, readonly string[]> = {
  classic: placeyQuotes.classic,
  study: placeyQuotes.study,
  tech: placeyQuotes.techExplorer,
  motivated: placeyQuotes.motivated,
  hacker: placeyQuotes.hacker,
  chill: placeyQuotes.chill,
  victory: placeyQuotes.victory,
  resume: placeyQuotes.classic,
  portfolio: placeyQuotes.classic,
};

/**
 * One-off lines for specific situations. They are NOT part of the mood pools: each is tied to
 * something that really happened, and the app decides when (see reactions.ts).
 */
export const SPECIAL = {
  returned: "THERE YOU ARE! I MISSED YOUR VIBE! 💜",
  refreshed: "Oopsie! Did we just time-travel?",
  newModule: "Oooooh! What's this adventure?",
  firstQuestion: "FIRST ONE DOWN! LET'S GOOOO!",
  mistake: "Oops! Even geniuses have plot twists.",
  streak: "A STREAK?! You're building a habit!",
  resumeDone: "That resume is looking SHARP!",
  prepDone: "Future interviewer: nervous already!",
  portfolioCreated: "Someone's building their digital empire!",
  summoned: "Hehe! You summoned me!",
  hidden: "Okayyy, I'll be right here when you need me!",
  shown: "I'M BACKKK! Did you miss me?",
} as const;

export type SpecialKey = keyof typeof SPECIAL;

export const SPEECH_CONFIG = {
  /** Idle chatter fires at a random moment inside this window (and only while the user is active). */
  ambientMinMs: 4 * 60_000,
  ambientMaxMs: 8 * 60_000,
  /** The last N lines of a mood are never repeated. */
  noRepeat: 5,
} as const;

const history = new Map<string, string[]>();

/** Pick a random line that was not used in the last `noRepeat` picks from the same pool. */
export function pickLine(poolKey: string, pool: readonly string[], rand: () => number = Math.random): string {
  const recent = history.get(poolKey) ?? [];
  const avoid = Math.min(SPEECH_CONFIG.noRepeat, pool.length - 1);
  const fresh = pool.filter((q) => !recent.slice(-avoid).includes(q));
  const choices = fresh.length ? fresh : pool;
  const line = choices[Math.floor(rand() * choices.length)];
  history.set(poolKey, [...recent, line].slice(-(SPEECH_CONFIG.noRepeat + 3)));
  return line;
}

/** A line in the voice of `mode`, drawn only from that mood's own pool. */
export function modeLine(mode: PlaceyMode, rand?: () => number): string {
  const mood = moodFor(mode);
  return pickLine(mood, placeyQuotes[mood], rand);
}

/** Shouty or celebratory lines make Placey jump for joy. */
export function isHype(text: string): boolean {
  return /[A-Z]{4,}/.test(text) || /[🔥🎉👏💪🏆👑]/u.test(text);
}

export function resetQuoteHistory(): void {
  history.clear();
}
