# STRICT DIRECTIVE: INTERVIEW PREP MODULE OVERHAUL

## 0. PRE-REQUISITE: VERSION CONTROL
Before making ANY changes, execute the following commands to save the current stable state:
`git add .`
`git commit -m "chore: save stable state before Interview Prep overhaul"`

## 1. SCOPE RESTRICTION
Restrict ALL your code modifications strictly to the `Interview Prep` module (the sprint generator, backend algorithms for question distribution, and the prep dashboard UI). Do not touch any other modules.

## 2. DSA DAY LINKS & SUGGESTIONS FIX
Currently, the DSA days show a generic placeholder. 
- Update the sprint generator logic: Replace the current description with this highly actionable directive: *"Solve at least 3 to 5 problems for this day. Make detailed notes of the logic, dry-run the code, and recognize the underlying algorithmic patterns."*

## 3. CORE SUBJECTS: 25 QUESTIONS, LOCAL CACHE & DUAL-BUTTON UI
We need to drastically reduce Gemini API calls for standard Core CS questions (DBMS, OOP, OS, CN). I already have a curated list of 25 core questions.
- **Your Task / Question to You:** Can you autonomously run a one-time script in the background using your LLM capabilities to generate high-quality, accurate answers for these 25 curated questions and save them into a local file (e.g., `data/core_answers.json`)? 
  - If YES, do it autonomously and hook it up.
  - If NO, just build the JSON structure and tell me, and I will manually provide you a file containing all the questions with their answers.
- **Frontend UI Update:** Under every curated core question, instead of just the `[Ask Placey]` button, implement a Dual-Button UI:
  1. **[View Answer]**: A lightweight button that expands an accordion/modal to show the locally saved answer instantly (Zero API call).
  2. **[Ask Placey]**: A secondary action that triggers the Gemini API if the user wants to ask a follow-up or needs a deeper explanation.

## 4. QUESTION DISTRIBUTION ALGORITHM (Fixing 0/0 Days)
The current sprint algorithm dumps questions unevenly, resulting in trailing days with "0 / 0" questions (e.g., OOP Day 22 to 32 are empty).
- **Fix:** Rewrite the distribution logic to divide the total available questions evenly across the total allocated days for that subject. 
- Ensure every day gets a consistent chunk (e.g., 2 to 5 questions per day). 
- No day should ever be rendered as "0 / 0". If a subject runs out of questions, truncate the days for that subject rather than rendering empty trailing days.

## 5. PROJECT QUESTIONS REFINEMENT (Strictly Technical)
The AI is currently generating generic/behavioral questions (e.g., "demonstrate leadership") for technical projects. This must stop.
- **Duration Cap:** Limit project preparation to a maximum of 3 days TOTAL (strictly 1 day per project based on the uploaded resume).
- **Question Density:** Ask exactly 5 to 6 questions per project.
- **Prompt Engineering (Reference Rules):** Update the AI prompt that generates project questions to STRICTLY ask hardcore technical questions. 

**HERE ARE THE 25 REFERENCE QUESTIONS TO TRAIN YOUR PROMPT:**

📋 Core Project Concept & Architecture

• Can you explain your project's architecture and the complete flow of data from the frontend UI to the database?
• Why did you choose this specific tech stack (e.g., React, Node, Python) instead of alternative languages or frameworks?
• What problem does your project solve in the real world, and who is the ideal target user?
• How did you design your database schema? Explain your primary keys, foreign keys, and table/collection relationships.
• What architectural pattern (like MVC, Monolithic, or Layered) did you use, and why did you choose it?

🛠️ Individual Contribution & Coding Details

• What was your exact individual contribution to this project compared to your other teammates?
• Which specific module or feature did you write completely by yourself? Walk me through its code logic.
• How did you handle user authentication and authorization (e.g., JWT, OAuth, Sessions) in this project?
• How does your application handle runtime errors, exceptions, or invalid data inputs from users?
• What Git branching strategy or workflow did you and your team follow to avoid breaking the main codebase?

⚡ Optimization, Security & Scaling

• If 50,000 users start using your application simultaneously right now, where will the system break first (bottleneck)?
• How would you optimize a slow database query or API endpoint in your project? Did you use indexing or caching?
• How did you secure your frontend and backend against common vulnerabilities like SQL Injection or XSS?
• How did you handle sensitive information like API keys, database credentials, and environment variables?
• If you had to scale this project to a microservices architecture, how would you split up your modules?

⚙️ Testing, DevOps & Tools

• How did you deploy and host your project (e.g., AWS, Vercel, Render), and what deployment challenges did you face?
• How did you test your code? Did you write automated unit/integration tests, or did you do purely manual testing?
• How did you manage external dependencies and package versions to avoid dependency conflicts or security issues?
• Did you implement any third-party APIs or webhooks (e.g., Payment gateways, Maps)? How did you handle their downtime?
• How did you track bugs or manage development tasks while building this project (e.g., Jira, Trello, Git Issues)?

🧠 Critical Thinking & Reflection

• What was the single most difficult technical blocker you faced during development, and exactly how did you debug and solve it?
• If you had to rebuild this entire project from scratch today, what technical decisions or design choices would you change?
• What is the biggest piece of technical debt or messy code you left behind in this project, and why did you leave it?
• If a client asks you to add a real-time feature (like instant chat or live notifications) to this project today, how would you design it?
• Imagine you are reviewing your project's code right now. Show me one function or block that you are extremely proud of and explain why.

*(Make sure your updated system prompt strictly follows the technical depth of the 25 questions provided above. Ask about tech stack choices, database schema, scaling bottlenecks, and debugging, NOT behavioral fluff).*

## 6. UX IMPROVEMENT: SCROLL DOWN TOAST/POP-UP
- Add a helpful UI Toast or Pop-up message that triggers gently when the user opens the active sprint. It should say: *"Tip: Scroll down to the bottom for curated resources and deep-links for your preparation!"*

Execute the UI and logic changes autonomously. Output a step-by-step summary of what you did once finished, and clearly answer Step 3 regarding the `core_answers.json` file.