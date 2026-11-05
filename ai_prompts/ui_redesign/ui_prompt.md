MASTER PROMPT: ONEstopPlacement – Premium 3-Theme UI Redesign

You are a senior frontend architect, product designer, and UI/UX engineer. Your task is to transform my existing project, ONEstopPlacement, into a polished, premium, production-quality placement preparation platform.

This is an existing functional project. You are NOT building a new application from scratch. You must first understand the existing codebase and then upgrade its visual design while preserving all existing functionality.

1. PRIMARY OBJECTIVE

Implement exactly THREE complete visual themes across the entire application:

1. Classic Light – clean, elegant, professional light theme.
2. Emerald Forest – premium dark green theme with subtle mint and emerald lighting.
3. Golden Horizon – premium warm dark theme with amber, gold, and sunset-inspired accents.

The Emerald Forest and Golden Horizon themes must closely follow the two supplied visual references:

- Green reference: top-right design.
- Yellow/Amber reference: bottom-left design.

Do not create a blue/purple neon AI-looking interface. Avoid excessive gradients, excessive glow, generic AI-generated dashboard aesthetics, and unnecessary decorative elements.

The final result should look like a carefully designed SaaS product made by an experienced human product design team.

2. FIRST: UNDERSTAND THE EXISTING PROJECT

Before changing anything:

1. Inspect the entire project structure.
2. Identify the frontend framework, build system, styling approach, routing system, component architecture, and backend integration.
3. Identify every existing page, reusable component, API integration, database interaction, and user workflow.
4. Understand the current authentication and profile-related functionality, if present.
5. Identify all existing CSS files, global styles, theme-related variables, and design dependencies.
6. Identify incomplete or broken modules separately from working modules.

Do not blindly replace existing files.

Do not assume the project uses React, Tailwind, Next.js, or any particular library. Discover the actual stack first.

Create an internal implementation plan before editing.

3. THREE-THEME ARCHITECTURE

Implement a proper centralized theme system.

Theme 1: Classic Light

Visual direction:

- Premium off-white background.
- White cards and surfaces.
- Soft warm-grey borders.
- Dark charcoal typography.
- Restrained emerald or green primary accent.
- Subtle shadows.
- Clean spacing and excellent readability.

Suggested design direction:

- Background: #F6F7F3
- Surface: #FFFFFF
- Primary text: #202820
- Secondary text: #70786F
- Accent: #248B68
- Border: #E5E9E2

This theme should feel like a modern professional productivity platform.

Theme 2: Emerald Forest

This is the green top-right reference.

Visual direction:

- Deep forest-green background.
- Dark charcoal-green surfaces.
- Muted emerald highlights.
- Mint-green accents.
- Subtle green lighting.
- Sophisticated gradients, not excessive neon.
- Premium translucent panels where appropriate.

Suggested palette:

- Background: #071C18
- Sidebar: #0B211C
- Surface: #102923
- Elevated surface: #16362D
- Primary accent: #37C99A
- Secondary accent: #8AE5BD
- Main text: #F2F7F2
- Muted text: #A4B8AC
- Borders: rgba(148, 190, 164, 0.15)

Hero areas may use a subtle forest landscape-inspired gradient or soft ambient lighting.

Use green strategically for:

- Active navigation.
- Progress indicators.
- Primary buttons.
- Positive achievements.
- Charts and graph highlights.

Avoid making every element green.

Theme 3: Golden Horizon

This is the yellow/amber bottom-left reference.

Visual direction:

- Deep warm charcoal background.
- Brown-black surfaces.
- Warm amber and golden highlights.
- Soft orange lighting.
- Muted bronze borders.
- Subtle sunset-inspired gradients.
- Premium warm appearance.

Suggested palette:

- Background: #19120D
- Sidebar: #21170F
- Surface: #2A1D14
- Elevated surface: #352419
- Primary accent: #F4A62A
- Secondary accent: #FFD078
- Main text: #FFF7EA
- Muted text: #C3AD91
- Borders: rgba(221, 167, 91, 0.17)

Use golden and amber accents for:

- Active navigation.
- Important buttons.
- Progress indicators.
- Achievement cards.
- Highlights and charts.

The theme should feel warm, elegant, and premium rather than bright yellow or cartoonish.

4. THEME SWITCHER

Add a polished theme selector in the application's global header.

It must offer three options:

- Classic Light
- Emerald Forest
- Golden Horizon

Requirements:

1. Show a suitable preview colour or icon for each theme.
2. Clearly indicate the currently selected theme.
3. Switching themes must happen instantly without refreshing the page.
4. All application routes must use the selected theme.
5. Persist the selected theme using localStorage or the project's existing persistence mechanism.
6. Restore the selected theme on page reload.
7. Ensure the theme does not reset when navigating between pages.
8. Handle first-time users gracefully with Classic Light as the default.

If the existing application already has a theme selector, improve and integrate it rather than creating a duplicate.

Implement themes through centralized CSS variables/design tokens or the project's existing equivalent. Do not scatter hardcoded theme colours across components.

5. GLOBAL DESIGN SYSTEM

Create a consistent design language across every module.

Typography

- Use a professional modern sans-serif font.
- Prefer Inter or an already installed suitable font.
- Use strong but restrained heading hierarchy.
- Maintain excellent text contrast.
- Avoid excessive decorative serif headings.

Cards

- Consistent border radius.
- Subtle borders.
- Appropriate surface contrast.
- Soft, realistic shadows.
- Consistent padding and spacing.
- Avoid excessive glassmorphism.

Buttons

- Consistent primary, secondary, and tertiary variants.
- Clear hover and focus states.
- Smooth transitions.
- Appropriate disabled and loading states.

Navigation

- Persistent sidebar on desktop.
- Clear active-route indicator.
- Proper icons.
- Responsive mobile navigation.
- Consistent navigation behaviour across every page.

Effects and animations

Use subtle, purposeful effects:

- Smooth theme transitions.
- Gentle card hover elevation.
- Subtle background ambient lighting.
- Progress-bar animations.
- Small interactive button transitions.
- Elegant dropdown animations.

Avoid:

- Excessive floating objects.
- Continuous animations.
- Random glowing particles.
- Huge gradients everywhere.
- Unnecessary 3D illustrations.
- Heavy animations that affect performance.

Respect prefers-reduced-motion.

6. REDESIGN EVERY EXISTING APPLICATION MODULE

IMPORTANT: All three themes must work on ALL these modules.

A. Home Dashboard

Create a premium personalized dashboard.

Include:

- Greeting such as "Good morning, Mohit!"
- Profile completion percentage.
- Completed tasks.
- Study streak.
- Placement preparation goal.
- Quick actions.
- Overall progress.
- Next milestone.
- Recently accessed modules.

Use a visually strong hero section without making it unnecessarily large.

B. Coding Dashboard

Redesign the coding analytics experience.

Preserve the existing platform integrations and data.

Include:

- GitHub repository information.
- GitHub contribution activity, if available.
- LeetCode problem-solving statistics.
- LeetCode rating and peak rating.
- Contest information.
- CodeChef statistics.
- HackerRank statistics.
- Platform connection status.
- Coding strengths and quick links.
- Performance charts wherever real data exists.

Important:

- Never invent missing statistics.
- Display unavailable data as "Not connected" or "Unavailable".
- Clearly distinguish manually entered information from synchronized data.
- Maintain proper loading and error states.

C. Resume Studio

Create a sophisticated resume-building interface.

Include:

- Existing resume import.
- Job description input.
- Resume draft creation.
- Resume versions.
- ATS-friendly presentation.
- Suggested improvements.
- Review and approval workflow.
- PDF download/export.

Preserve the existing resume generation logic.

Do not fabricate user achievements, skills, education, or work experience.

Clearly distinguish suggestions from approved profile facts.

D. Interview Prep

Create a modern interview preparation dashboard.

Include:

- Company input.
- Target role.
- Experience/skill level.
- Job description selection.
- Preparation duration.
- Daily preparation plan.
- Curated question bank.
- Progress tracking.
- Mock interview functionality, if already implemented.
- Feedback and performance information.

Preserve deterministic planning logic and existing question-bank integrations.

E. Portfolio Builder

Create a premium portfolio-building experience.

Include:

- Portfolio name.
- Theme selection for the portfolio, if supported.
- About section.
- Education.
- Skills.
- Projects.
- Achievements.
- Contact section.
- Live preview.
- Draft creation.
- Public/private state.
- Export or publishing workflow.

Maintain the existing privacy and approval mechanisms.

7. RESPONSIVE DESIGN

The application must work properly on:

- Desktop.
- Laptop.
- Tablet.
- Mobile.

Desktop:

- Proper sidebar.
- Balanced content width.
- Consistent grid layouts.

Tablet:

- Adaptable sidebar.
- Appropriate card sizing.
- No horizontal overflow.

Mobile:

- Compact header.
- Mobile navigation or drawer.
- Single-column cards where appropriate.
- Properly sized charts and forms.
- Touch-friendly controls.

Do not simply shrink the desktop layout.

8. TECHNICAL IMPLEMENTATION RULES

1. Preserve all existing business logic.
2. Preserve existing API endpoints and request/response formats.
3. Do not modify database schemas unnecessarily.
4. Do not remove existing features to simplify the redesign.
5. Reuse existing components wherever sensible.
6. Build reusable theme-aware components.
7. Avoid duplicated CSS and unnecessary dependencies.
8. Keep code modular and maintainable.
9. Avoid introducing console errors.
10. Avoid hydration issues if the application uses server-side rendering.
11. Ensure all existing routes continue to work.
12. Keep loading, empty, success, and error states functional.
13. Never replace real backend functionality with hardcoded demo data.
14. Never expose API keys, secrets, or environment variables.
15. Do not introduce a new UI framework unless absolutely necessary.

Use the project's existing design and component ecosystem.

9. QUALITY ASSURANCE

After implementation:

1. Run the existing development/build commands.
2. Fix compilation and TypeScript errors.
3. Check every existing route.
4. Test all three themes.
5. Test theme persistence after refresh.
6. Test navigation between modules.
7. Test responsive layouts.
8. Test buttons, forms, dropdowns, and interactive elements.
9. Check console errors.
10. Verify that existing API functionality remains intact.

Do not claim a feature is working unless you have actually tested it.

If an existing backend feature is broken, document the issue rather than hiding it with a visual placeholder.

10. VISUAL QUALITY EXPECTATIONS

The final UI must satisfy these standards:

- Premium SaaS appearance.
- Clear visual hierarchy.
- Excellent spacing and alignment.
- Consistent component styling.
- Professional typography.
- Beautiful but restrained colours.
- Purposeful visual effects.
- High-quality dashboard layouts.
- No generic AI-generated dashboard appearance.
- No unnecessary decorative clutter.

The Emerald Forest and Golden Horizon themes should be visually distinct, not merely different background colours.

All three themes must feel like intentional, professionally designed products.

11. IMPLEMENTATION WORKFLOW

Work in this order:

Phase 1: Inspect the existing repository and understand its architecture.

Phase 2: Identify all pages, shared components, and existing functionality.

Phase 3: Create the centralized theme architecture and design tokens.

Phase 4: Implement the global navigation, theme switcher, typography, buttons, cards, and shared components.

Phase 5: Redesign Home Dashboard.

Phase 6: Redesign Coding Dashboard.

Phase 7: Redesign Resume Studio.

Phase 8: Redesign Interview Prep.

Phase 9: Redesign Portfolio Builder.

Phase 10: Implement responsive layouts and animations.

Phase 11: Test functionality, theme persistence, and all routes.

Phase 12: Run the final build and fix errors.

Do not stop after creating a visual prototype. Implement the actual application.

Do not create a separate static HTML mockup instead of modifying the existing application.

Do not overwrite the project with a new starter template.

Make changes incrementally and keep the application runnable.

12. FINAL REPORT

When finished, provide:

1. Summary of the implemented design.
2. Files created and modified.
3. Description of all three themes.
4. How the theme switcher works.
5. Features and modules redesigned.
6. Existing functionality preserved.
7. Tests and build commands executed.
8. Any remaining bugs or incomplete functionality.

FINAL INSTRUCTION:

Prioritize excellent design AND functional correctness equally.

I want ONEstopPlacement to look like a premium, carefully crafted developer-placement platform, not a generic AI-generated dashboard.

Take the time to understand the existing codebase before making changes. Do not sacrifice existing functionality for visual appearance.