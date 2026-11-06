# STRICT DIRECTIVE: RESUME STUDIO OVERHAUL

## 0. PRE-REQUISITE: VERSION CONTROL
Before making ANY changes, execute:
`git add .`
`git commit -m "chore: save stable state before Resume Studio overhaul"`

## 1. SCOPE & PRESERVATION (CRITICAL)
- STRICTLY restrict modifications to the `Resume Studio` module. Do not touch other modules.
- PRESERVE the existing 4-step workflow (Import -> Target Role -> Drafts -> Review).
- PRESERVE the existing 4 Template Selection options in the UI (Classic, Tech Intern, Modern Developer, Custom). Do not delete them. Your job is to upgrade their internal rendering logic so they are strictly 1-page, professional, and have zero text-overlap.

## 2. PARSER & DATA EXTRACTION IMPROVEMENTS
Fix the parsing engine to adhere to these rules:
- **No Duplication:** Ensure Education, Experience, and Projects are strictly deduplicated (currently rendering 2-3 times).
- **Skill Sub-categorization:** Do not dump skills in one paragraph. The AI must categorize them (e.g., Languages, Frameworks, Developer Tools, Core CS Concepts).
- **Hyperlink Preservation:** Add an OPTIONAL field for users to upload their `.tex` (LaTeX) file alongside the PDF. If provided, parse it for `\href{url}{text}` tags and ask the user for permission to inject these hyperlinks into the generated resume.

## 3. JD-MATCHING & USER APPROVAL WORKFLOW
- **Mandatory JD Inclusion:** Any skill or keyword explicitly mentioned in the target Job Description (JD) that matches the profile MUST be hard-included in the draft.
- **User Approval Gate:** For all other extracted points and AI-generated text, present them in a clean UI checklist where the user must explicitly click "Approve" or "Reject" before it renders on the final resume.

## 4. TEMPLATE ENGINEERING (Neat, Clean, 1-Page)
Upgrade the 4 existing templates based on these layout rules:
- **Mohit-Style Variation:** No Summary section. Order: Education -> Skills (Sub-categorized) -> Projects (Title + Tech Stack + Bullets) -> Coding Profiles -> Leadership.
- **Shrey/Aditya-Style Variation:** Includes a Professional Summary. Order: Summary -> Education -> Projects -> Experience -> Skills (Sub-categorized) -> Certifications.
- **General Rule:** Clean fonts, distinct headers, right-aligned dates, and proper bullet point splitting (do not break a single sentence into random new lines).

## 5. AI REWRITING ENGINE (The "Shrey" Wording Standard)
Update the AI prompt inside the backend adapter for generating bullet points.
- Force the AI to start every bullet with strong action verbs (e.g., "Architected", "Engineered", "Orchestrated").
- Highlight the "how" and "why" (impact and metrics) without hallucinating fake data. Elevate the vocabulary to match a top-tier SWE intern resume.

Execute all these changes autonomously. Output a summary of the exact files changed once done.