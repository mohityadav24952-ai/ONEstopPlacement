# 🚀 MASTER PROJECT: PLACEY — THE LIVING MASCOT OF ONEstopPlacement

## Your mission

You are working directly inside my existing **ONEstopPlacement** application.

I want you to design, develop, and integrate an exceptionally cute, animated, interactive, context-aware mascot named **PLACEY**.

Placey is not a chatbot icon, a floating PNG, a generic robot, or a decorative widget.

**Placey is a little character who lives inside ONEstopPlacement.**

It should feel like a tiny friend who welcomes users, sits beside them while they work, explores the platform, changes outfits and expressions according to their activities, celebrates their achievements, motivates them, and occasionally makes them smile with adorable little quotes.

The experience should feel polished enough to belong to a premium modern startup product.

My highest priorities, in order:

1. EXTREME CUTENESS — the character must look adorable.
2. Consistent character identity across all modes.
3. Beautiful entrance and movement animations.
4. Context-aware reactions and personality.
5. Smooth integration throughout the entire application.
6. Performance, responsiveness, and accessibility.

Do not build a mediocre implementation just to finish quickly.

I am providing a reference image containing multiple variations of the Dreamy Blob character.

**THIS IMAGE IS YOUR PRIMARY VISUAL DESIGN REFERENCE.**

Study it carefully before implementation.

The character must preserve the visual identity, proportions, softness, facial features, colours, and adorable aesthetic shown in the reference.

The mascot's official name is:

# PLACEY 💜

Tagline: **Your tiny buddy. Your biggest career cheerleader.**

---

# PART 1 — UNDERSTAND THE EXISTING APPLICATION FIRST

Before writing any code, inspect the existing project.

Understand:

- Complete frontend folder structure.
- React and Vite versions.
- Existing routing implementation.
- Existing component architecture.
- Existing styling system and design tokens.
- Existing global layouts and navigation.
- Existing authentication and user preferences.
- Existing backend APIs.
- Existing database structure.
- Existing coding dashboard integrations.
- Existing activity and progress tracking.
- Existing responsive behaviour.

The application currently contains these major areas:

1. Home Dashboard
2. Coding Dashboard
3. Resume Studio
4. Interview Prep
5. Portfolio Builder
6. Profile
7. Settings

Verify the actual routes and component names instead of assuming them.

### Critical rules

- Preserve all existing functionality.
- Do not break authentication.
- Do not break API integrations.
- Do not change backend architecture unnecessarily.
- Do not replace existing pages with mockups.
- Do not create fake user activity or achievements.
- Do not unnecessarily redesign unrelated UI.
- Do not introduce duplicate global providers.
- Do not create unnecessary dependencies.
- Follow the existing coding conventions.

First understand the project, then implement the mascot in the most appropriate architectural location.

Do not stop after giving me an implementation plan. Actually build the feature.

---

# PART 2 — THE CHARACTER DESIGN: PLACEY

## 2.1 Core character identity

Placey must be ONE consistent character.

Its base appearance should match the provided reference image as closely as possible.

Visual characteristics:

- Soft, rounded, jelly-like blob body.
- Adorable tiny eyes.
- Small expressive mouth.
- Soft pink blush on cheeks.
- Pastel lavender, purple, and blue colour palette.
- Glossy, slightly translucent appearance.
- Beautiful soft highlights.
- Rounded, squishy proportions.
- Gentle gradients.
- Soft lighting and subtle glow.
- Small magical sparkles where appropriate.

Its personality:

- Extremely adorable.
- Friendly.
- Playful.
- Curious.
- Encouraging.
- Slightly mischievous.
- Intelligent.
- Emotionally expressive.
- Supportive without being annoying.

### Non-negotiable design rule

Every mode must look like the SAME PLACEY.

For example:

- Study Mode = Placey wearing a tiny graduation cap.
- Hacker Spirit = Placey wearing a cute hoodie and glasses.
- Motivated Blob = Placey wearing a headband.

Never create completely different characters for different modes.

The base face, body proportions, overall colour identity, and silhouette must remain recognizable.

The reference image should guide the actual implementation, not merely inspire a generic interpretation.

Do not replace the reference aesthetic with a basic CSS circle with two eyes.

---

# PART 3 — IMPLEMENT ALL SEVEN MODES

Implement these seven modes with different accessories, expressions, poses, and animations.

All seven modes are required.

## MODE 1: CLASSIC DREAMY

**Default personality.**

Appearance:
- Original lavender-blue Dreamy Blob.
- Cute smiling face.
- Pink cheeks.
- No major accessories.
- A few floating sparkles.

Animations:
- Gentle floating.
- Natural blinking.
- Looking left and right.
- Tiny bouncing.
- Small waving gesture.
- Occasional playful head tilt.

Example quotes:

- "HEYYYY! Welcome back! 💜"
- "Ready to make some progress?"
- "I've been waiting for you!"
- "Let's make today count! ✨"
- "Your dreams aren't going to achieve themselves!"

This is the default mode on the Home Dashboard.

## MODE 2: STUDY MODE 📚

Appearance:
- Same Placey.
- Tiny graduation cap.
- Tiny book or notebook.
- Focused but adorable eyes.
- Optional small lightbulb.

Animations:
- Reading a tiny book.
- Turning pages.
- Thinking.
- Nodding.
- Looking curious.
- Small focused movements.

Quotes:

- "One concept at a time!"
- "Study smart, superstar! 📚"
- "Knowledge loading..."
- "Let's crack that interview!"
- "Small steps. Big dreams."

Trigger:
- Entering Interview Prep.
- Starting an interview preparation plan.
- Working on interview questions.
- Completing preparation tasks.

## MODE 3: TECH EXPLORER 💻

Appearance:
- Same Placey.
- Tiny headphones.
- Tiny laptop.
- Floating code panels.
- Curious expression.

Animations:
- Typing on a laptop.
- Looking at code.
- Adjusting headphones.
- Exploring floating technical symbols.
- Excited reactions.

Quotes:

- "Let's build something awesome!"
- "Another coding adventure?"
- "Curiosity is your superpower!"
- "Debugging time! 🔍"
- "Code. Explore. Create."

Trigger:
- Entering Coding Dashboard.
- Opening coding profile sections.
- Starting technical practice.

## MODE 4: MOTIVATED BLOB 🔥

Appearance:
- Same Placey.
- Cute motivational headband.
- Energetic eyes.
- Tiny raised hands.
- Extra sparkles.

Animations:
- Excited jumping.
- Rapid cute bouncing.
- Happy clapping.
- Tiny cheering movements.
- Celebratory poses.

Quotes:

- "BROOO! YOU'RE ON FIRE! 🔥"
- "LOOK AT YOU GO!"
- "Keep that momentum!"
- "You're getting stronger!"
- "One more? I BELIEVE IN YOU!"
- "Consistency looks good on you!"

Trigger:
- Completing multiple questions.
- Achieving a meaningful practice milestone.
- Maintaining a genuine streak.
- Completing several preparation activities.

Use real activity data wherever available.

## MODE 5: HACKER SPIRIT 😎

Appearance:
- Same Placey.
- Cute oversized hoodie.
- Tiny glasses or pixel sunglasses.
- Tiny laptop.
- Subtle floating code windows.

IMPORTANT: This should look like an adorable little hacker, NOT an intimidating dark cyberpunk robot.

Animations:
- Focused typing.
- Glasses adjustment.
- Looking at code.
- Tiny confident nods.
- Playful focused expression.

Quotes:

- "Focus mode: ACTIVATED."
- "Hack smarter, dream bigger!"
- "We don't fear bugs."
- "Just one more challenge..."
- "Silent mode. Maximum productivity. 😎"
- "Debugging is my cardio."

Trigger:
- Sustained coding activity.
- Longer focused technical sessions.
- Multiple coding interactions over time.

Do not activate simply because the browser tab has remained open.

## MODE 6: CHILL MODE ☁️

Appearance:
- Same Placey.
- Tiny fluffy cloud or pillow.
- Cute headphones.
- Sleepy eyes.
- Small moon and stars.

Animations:
- Gentle floating.
- Slow blinking.
- Sleepy expression.
- Tiny breathing animation.
- Slowly closing eyes.
- Relaxed movements.

Quotes:

- "Take a little break, buddy. 💜"
- "Rest. Recharge. Return stronger."
- "Even legends need rest!"
- "Don't forget to take care of yourself."
- "You've been working hard!"

Trigger:
- Long continuous active sessions.
- Optional user-selected chill mode.
- Appropriate break reminders.

Never interrupt important tasks or guilt-trip users.

## MODE 7: VICTORY MODE 👑

Appearance:
- Same Placey.
- Tiny golden crown.
- Tiny trophy.
- Cute celebratory face.
- Confetti and stars.

Animations:
- Happy jumping.
- Confetti burst.
- Excited bouncing.
- Tiny trophy celebration.
- Happy clapping.

Quotes:

- "YOU DID ITTT! 🎉"
- "Another milestone unlocked!"
- "SOOO PROUD OF YOU!"
- "That deserves a celebration!"
- "Look how far you've come!"

Trigger:
- Completing a preparation plan.
- Reaching meaningful coding milestones.
- Publishing a portfolio.
- Completing important tasks.
- Achieving genuine progress milestones.

Do not trigger victory mode for every minor interaction.

---

# PART 4 — THE FIRST IMPRESSION: PLACEY'S GRAND ENTRANCE

THIS IS ONE OF THE MOST IMPORTANT PARTS OF THE ENTIRE FEATURE.

When the user enters ONEstopPlacement for the first time, Placey must introduce itself in a beautiful animated sequence.

I want the experience to feel magical.

### Exact entrance sequence

**STEP 1 — THE SURPRISE**

After the application has loaded and the main interface is ready:

Placey starts just below the visible viewport, near the bottom edge.

It should not suddenly appear.

**STEP 2 — POP UP**

Placey slowly emerges from the bottom.

It performs a soft, squishy bounce when it reaches the screen.

Add subtle squash-and-stretch animation to make the movement feel organic.

**STEP 3 — NOTICE THE USER**

Placey looks towards the user.

It blinks.

It performs a cute little wave.

Its face should look genuinely excited.

**STEP 4 — INTRODUCTION**

A beautiful speech bubble appears.

Display these messages one at a time:

"HEYYYY! I'M PLACEY! 💜"

After a short delay:

"Your tiny placement buddy!"

Then:

"I'll be right here while you learn, code and prepare for your dream career!"

Then:

"Let's make those dreams happen together! ✨"

**STEP 5 — HAPPY REACTION**

Placey performs a happy jump.

Tiny sparkles appear around it.

**STEP 6 — SETTLE DOWN**

Placey smoothly moves to its resting position near the bottom-right corner.

It continues its subtle idle floating animation.

The introduction ends.

### Returning users

Do not replay the full introduction every time.

Instead, use a short random greeting:

- "You're backkk! 💜"
- "Ready for another productive day?"
- "Let's get things done!"
- "Missed me? Hehe."

Persist the first-introduction completion state using the appropriate existing user preference mechanism.

Provide a skip/dismiss option.

Do not make the introduction block the application.

### Timing

Make the entrance delightful but reasonably short.

Avoid unnecessarily long onboarding animations.

Respect reduced-motion preferences.

---

# PART 5 — PLACEY SHOULD LIVE INSIDE THE WEBSITE

I do NOT want Placey to permanently sit in one corner like a dead floating icon.

I want it to feel alive.

### Movement behaviour

Placey should be able to:

1. Enter from below the screen.
2. Bounce into its position.
3. Float gently.
4. Blink.
5. Look around.
6. Wave.
7. Move a little left and right.
8. Perform tiny hops.
9. React to nearby interactions.
10. Move towards a speech bubble when appropriate.
11. Return to its resting position.
12. Change expressions smoothly.

### Important movement design

Placey can occasionally move along the bottom edge of the screen.

It can appear to run a few steps, bounce, and settle somewhere nearby.

But:

- It must not randomly obstruct important content.
- It must not cover forms or buttons.
- It must not cover charts or navigation.
- It must not constantly wander around.
- It must not distract users during focused work.
- It must always remain controllable.

Use carefully designed movement sequences.

Example:

IDLE → NOTICE USER → HAPPY REACTION → SPEECH BUBBLE → LITTLE HOP → RETURN TO IDLE.

All movements should look smooth, cute, and intentional.

---

# PART 6 — SMART MODE SWITCHING

Create a proper central state management system.

Suggested architecture:

- PlaceyProvider
- PlaceyController
- PlaceyModeManager
- PlaceyCharacter
- PlaceySpeechBubble
- PlaceyAnimations
- PlaceySettings

Adapt names to the existing architecture where necessary.

The system must track:

- Current route.
- Current page.
- Current mode.
- Recent activity.
- Relevant completed tasks.
- Coding practice activity.
- Session activity.
- Active animation.
- Current speech bubble.
- Whether Placey is visible.
- Whether the user has muted or hidden Placey.

### Suggested priority order

1. Victory Mode.
2. Motivated Blob.
3. Study Mode.
4. Hacker Spirit.
5. Tech Explorer.
6. Chill Mode.
7. Classic Dreamy.

Do not allow multiple modes to compete simultaneously.

### Mode mapping

| Application situation | Placey mode |
|---|---|
| Home Dashboard | Classic Dreamy |
| Interview Prep | Study Mode |
| Coding Dashboard | Tech Explorer |
| Multiple questions completed | Motivated Blob |
| Long focused coding session | Hacker Spirit |
| Long continuous session | Chill Mode |
| Major achievement | Victory Mode |

Make thresholds configurable.

Use actual frontend events and backend data where available.

If a particular event is not currently tracked, implement a clean event interface that can be connected later.

Do not fake statistics or claim to know things that the application does not actually know.

### Priority and expiry

Higher-priority reactions should temporarily override normal page modes.

Example:

Coding Dashboard → Tech Explorer → user completes 10 questions → Motivated Blob → short celebration → Tech Explorer.

Another example:

Interview Prep → Study Mode → plan completed → Victory Mode → celebration → Study Mode.

Use timers and animation completion events responsibly.

---

# PART 7 — QUOTES AND PERSONALITY ENGINE

The speech bubbles are essential.

Placey should have personality.

Create a quote library containing multiple short messages for every mode.

### Visual design

- Beautiful rounded speech bubble.
- Soft white or pastel background.
- Subtle shadow.
- Rounded corners.
- Small pointer towards Placey.
- Attractive typography.
- Smooth fade/scale entrance.
- Tasteful emoji.
- Good mobile positioning.

### Behaviour

- Display one message at a time.
- Avoid frequent messages.
- Implement cooldowns.
- Avoid repeating the same quote too frequently.
- Dismiss on user request.
- Do not interrupt important interactions.
- Do not display messages constantly.
- Do not show multiple bubbles simultaneously.

Quotes should sound like a friendly little character, not generated corporate marketing copy.

### Personality examples

Placey can say:

"hehehe, you're doing great!"

"WAITTT... THAT WAS IMPRESSIVE!"

"Your future self is going to thank you."

"Okayyy, one more challenge?"

"Don't worry, we got this!"

"You're literally building your future right now!"

Keep the writing natural and adorable.

---

# PART 8 — INTERACTIONS

Placey should respond when the user interacts with it.

### On hover

- Look towards the cursor.
- Perform a tiny blink.
- Slightly bounce.

### On click/tap

- Perform a happy reaction.
- Display a friendly quote.
- Optionally open a small companion panel.

### Companion controls

Include subtle controls for:

- Hide Placey.
- Show Placey.
- Mute speech bubbles.
- Enable/disable movement.
- Optional mode preference.

Avoid making the controls visually heavy.

If a user manually chooses a mode, respect that selection until they return to automatic mode or change it.

### Optional companion panel

A small panel can display:

"Hey! I'm Placey 💜"

"Your tiny buddy is here to help you stay motivated."

It may show:
- Current mode.
- Short greeting.
- Current genuine progress if available.
- Mute/hide settings.

Do not create a full AI chat system as part of this task.

Placey should never pretend to have capabilities that are not implemented.

---

# PART 9 — TECHNICAL IMPLEMENTATION AND VISUAL ASSETS

Study the reference image and choose the best architecture for implementing it.

Preferred approaches:

- React Three Fiber.
- Three.js.
- Drei.
- GLTF/GLB models.
- CSS and SVG animations for lightweight UI elements.
- Procedural animation where appropriate.

Check the existing React version and package compatibility before installing dependencies.

### Important distinction

A reference image is not a rigged 3D character.

Do not claim to have created a fully animated 3D model merely by loading a static image.

If a proper GLB model is unavailable:

1. Build a beautiful, lightweight animated character using custom SVG, layered artwork, CSS, or procedural geometry.
2. Preserve the reference design as closely as possible.
3. Keep accessories and facial expressions modular.
4. Build the architecture so that a proper GLB model can replace the character renderer later.

If you can create a suitable procedural 3D character without sacrificing quality, you may do so.

If a separate 3D asset is necessary, clearly identify the missing asset and provide precise specifications for it.

Do not silently substitute a poor-looking robot or generic blob.

### Asset organisation

Keep assets organised in a dedicated location.

For example:

public/
  assets/
    placey/
      base/
      accessories/
      effects/
      reference/

Adapt to the existing project.

Do not duplicate the reference image unnecessarily.

### Animation library

Implement the following animations where possible:

- idleFloat
- blink
- lookAround
- wave
- bounce
- happy
- thinking
- reading
- coding
- typing
- sleepy
- celebrate
- tinyRun
- transition

Animation names can be adapted.

Ensure animation transitions do not cause sudden jumps or overlapping movements.

---

# PART 10 — PERFORMANCE AND MEMORY

My laptop has 8 GB RAM, with some memory already reserved.

Performance matters.

Do not introduce a heavy rendering system without need.

Requirements:

- Lazy-load the character renderer.
- Lazy-load 3D libraries and model assets.
- Avoid multiple simultaneous WebGL canvases.
- Prefer one shared scene where practical.
- Pause unnecessary rendering when the mascot is hidden.
- Pause or reduce rendering when the browser tab is inactive.
- Use lightweight geometry and textures.
- Avoid expensive post-processing.
- Avoid unnecessary React re-renders.
- Clean up animation loops and event listeners.
- Avoid memory leaks.
- Use sensible frame-rate limits.
- Provide a fallback if WebGL is unavailable.
- Respect prefers-reduced-motion.
- Ensure the dashboard remains fast.

Do not render an expensive animation at maximum frame rate when the character is not visible.

---

# PART 11 — RESPONSIVE DESIGN

### Desktop

- Placey should be clearly visible.
- Default resting position: bottom-right.
- Speech bubble should be readable.
- It must not overlap important page content.

### Tablet

- Reduce size intelligently.
- Adjust position according to layout.
- Prevent overlap with navigation.

### Mobile

- Use a smaller character.
- Keep the speech bubble inside the viewport.
- Prevent overlap with bottom navigation and forms.
- Ensure tapping works correctly.
- Provide easy hide/show controls.

The entrance animation must work on every screen size.

---

# PART 12 — ACCESSIBILITY

Implement:

- Keyboard-accessible controls.
- Proper accessible labels.
- Reduced-motion support.
- No flashing animations.
- No forced sound.
- No mandatory interaction.
- User-controlled visibility.
- Responsive speech bubble positioning.

Placey must improve the experience without making the application difficult to use.

---

# PART 13 — INTEGRATION WITH EVERY APPLICATION PAGE

Integrate Placey globally so it works across all major routes.

It should not be independently duplicated on every page.

Use the correct global layout/provider approach after inspecting the existing application.

### Home Dashboard
Classic Dreamy.

Welcome the user and occasionally display motivational messages.

### Coding Dashboard
Tech Explorer by default.

Switch to Motivated Blob when real coding progress is recorded.

Switch to Hacker Spirit during sustained coding sessions.

### Resume Studio
Use a thoughtful, focused variation of Placey.

Possible appearance:
- Tiny glasses.
- Resume/document in hand.
- Thinking expression.

Use contextual quotes:

"Let's make that resume shine!"

"Your experience deserves a great presentation."

### Interview Prep
Study Mode.

Quotes:

"Interview preparation activated!"

"Let's get you interview-ready!"

### Portfolio Builder
Use a creative variation of Classic Dreamy or Tech Explorer.

Possible accessory:
- Tiny design palette.
- Star.
- Creative tablet.

Quotes:

"Let's build something beautiful!"

"Your portfolio is your story!"

### Profile and Settings
Classic Dreamy, with calm and minimal interactions.

Do not force a special mode on every minor settings action.

---

# PART 14 — TESTING

Test all seven modes.

Test the complete first-visit entrance.

Test returning-user behaviour.

Test:
- Route transitions.
- Mode priority.
- Mode expiry.
- Speech bubble cooldown.
- Quote repetition prevention.
- Hide/show.
- Manual mode selection.
- Mobile positioning.
- Reduced-motion.
- WebGL fallback.
- Browser tab inactivity.
- Page refresh.
- Authentication state.
- Existing dashboard functionality.
- Production build.

Ensure the character does not disappear unexpectedly after route changes.

Ensure there is no duplicate mascot after navigation.

Ensure the application remains functional when the mascot is hidden or disabled.

Do not claim a test passed unless you actually performed it.

---

# PART 15 — IMPLEMENTATION WORKFLOW

Work in this order:

### Phase 1: Project inspection
Understand the existing architecture and compatibility.

### Phase 2: Character foundation
Build the base Placey appearance using the supplied visual reference.

### Phase 3: Seven visual modes
Implement all seven appearances with consistent character identity.

### Phase 4: Animation system
Build the entrance, idle, float, blink, wave, bounce, reading, coding, sleepy, celebration, and movement animations.

### Phase 5: First-visit introduction
Implement the complete animated introduction.

### Phase 6: Global integration
Add Placey to the application's global layout.

### Phase 7: Context-aware controller
Connect actual routes, events, and progress data.

### Phase 8: Quotes and interaction
Implement the speech bubbles, quote library, controls, and reactions.

### Phase 9: Responsive and performance optimisation
Optimise for desktop, tablet, and mobile.

### Phase 10: Testing
Run the actual production build and fix errors.

Do not stop after completing only one phase.

---

# PART 16 — FINAL ACCEPTANCE CRITERIA

The feature is complete only when:

- [ ] Placey looks close to the supplied reference.
- [ ] The character is exceptionally cute.
- [ ] Its identity is consistent across all modes.
- [ ] All seven modes work.
- [ ] Accessories and facial expressions change correctly.
- [ ] The entrance animation works.
- [ ] First-time introduction works.
- [ ] Returning-user greeting works.
- [ ] Placey floats naturally.
- [ ] Placey can move short distances.
- [ ] Placey reacts to user interactions.
- [ ] Quotes are contextual and attractive.
- [ ] Quotes do not become annoying.
- [ ] Route-based mode switching works.
- [ ] Activity-based reactions work where supported.
- [ ] Major achievements trigger Victory Mode.
- [ ] Users can hide and mute Placey.
- [ ] Responsive layouts work.
- [ ] Performance is acceptable.
- [ ] Existing application functionality remains intact.
- [ ] Production build succeeds.

---

# PART 17 — FINAL REPORT

After implementation, tell me:

1. What architecture you created.
2. Which seven modes are implemented.
3. How the automatic mode switching works.
4. How the introduction works.
5. Which animations are functional.
6. Which assets you created.
7. Whether the implementation uses a real 3D model, procedural 3D, or an animated 2D fallback.
8. Whether an external GLB model is still needed.
9. How to manually test all seven modes.
10. Any remaining limitations.

If something could not be implemented properly, tell me honestly.

Do not call an incomplete placeholder a finished feature.

## THE FINAL VISION

When someone opens ONEstopPlacement, they should see a tiny adorable character pop out from the bottom of the screen, wave at them, introduce itself, and settle beside the dashboard.

When they study, Placey studies.

When they code, Placey codes.

When they achieve something, Placey celebrates.

When they work hard, Placey motivates them.

When they need rest, Placey chills with them.

It should feel like this little character genuinely belongs to the platform.

I want users to remember ONEstopPlacement partly because of PLACEY.

**ONEstopPlacement × PLACEY**

"Your tiny buddy. Your biggest career cheerleader. 💜"

NOW BUILD IT.