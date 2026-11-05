"""Curated starter bank. Every question is original wording written for this project
(provenance CURATED). None is attributed to any company.
Tuple: (topic, difficulty, subtopic, text).

Only behavioural (HR) questions live here now:
* DSA has NO written problem statements. It is built per company as link cards (dsa_links.py).
* OS, DBMS, CN and OOP come from the master list in core_master.py."""

BANK: list[tuple[str, str, str, str]] = [
    # ---- HR (behavioural)
    ("HR", "EASY", "intro", "Tell me about yourself in two minutes, focusing on what is relevant to this role."),
    ("HR", "EASY", "motivation", "Why do you want to work in this role, and what are you doing to prepare for it?"),
    ("HR", "MEDIUM", "teamwork", "Describe a time you disagreed with a teammate. How did you handle it and what changed?"),
    ("HR", "MEDIUM", "failure", "Tell me about a project that did not go as planned. What did you learn?"),
    ("HR", "MEDIUM", "learning", "Describe something technical you taught yourself recently and how you went about it."),
    ("HR", "EASY", "strengths", "What are your strengths and one area you are actively improving? Give evidence for each."),
]
