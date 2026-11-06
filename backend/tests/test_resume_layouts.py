"""Resume layouts seen in real student PDFs, as plain text (no PDF needed), plus the PDF spacing repair.

Each case is a layout the rule-based parser used to get wrong. The rule-based parser is what students get
whenever the LLM is unavailable, so it must cope on its own.
"""
from app.modules.site_builder.parser import heuristic_parse, repair_spacing, sanitize


def parse(text: str) -> dict:
    return sanitize(heuristic_parse(text, []))


def titles(text: str) -> list[str]:
    return [p["title"] for p in parse(text)["projects"]]


# ---- PDF spacing repair ---------------------------------------------------------------------------------

def test_kerning_splits_are_joined_using_layout_text_as_evidence():
    plain = "Mohit Kumar Y adav\nDeveloper T ools: Git\nW eb T echnologies\nCodeF orge AI\nCGP A: 8.95"
    layout = "   Mohit Kumar Yadav\n Developer Tools: Git\n  Web Technologies\n CodeForge AI\n CGPA: 8.95"
    assert repair_spacing(plain, layout) == "Mohit Kumar Yadav\nDeveloper Tools: Git\nWeb Technologies\nCodeForge AI\nCGPA: 8.95"


def test_dropped_spaces_are_restored_only_when_layout_shows_both_words():
    assert repair_spacing("Solved 700 problemsacross platforms", "Solved 700 problems across platforms") \
        == "Solved 700 problems across platforms"
    # a wrong space AND a missing one in the same spot
    assert repair_spacing("by AFSB V aranasifor the", "by AFSB Varanasi for the") == "by AFSB Varanasi for the"


def test_real_word_pairs_are_never_joined_and_no_layout_means_no_change():
    # "A" and "I" are words; "a team" stays two words even though "ateam" might appear elsewhere.
    assert repair_spacing("I built a team tool", "I built a team tool ateam") == "I built a team tool"
    assert repair_spacing("Y adav", "") == "Y adav"


# ---- project layouts ------------------------------------------------------------------------------------

def test_title_on_the_bullet_with_tagline_and_colon():
    text = """Projects
• CodeForge AI – AI-Powered Cloud IDE: Built an AI-powered cloud IDE featuring Monaco
Editor, WebContainers, OAuth authentication. Integrated AI code suggestions.
Technologies: Next.js, TypeScript, MongoDB.
• VeloxRide – Real-Time Ride Booking Platform: Developed a full-stack ride-booking platform.
Technologies: React.js, Node.js, Socket.io.
"""
    out = parse(text)["projects"]
    assert [p["title"] for p in out] == ["CodeForge AI", "VeloxRide"]
    assert out[0]["tagline"] == "AI-Powered Cloud IDE"
    assert out[0]["techStack"] == ["Next.js", "TypeScript", "MongoDB"]
    assert "Monaco Editor" in out[0]["description"]


def test_technologies_as_a_bullet_that_wraps_onto_the_next_line():
    text = """Projects
CodeForge AI | AI-Powered Cloud Development Environment
• Built an AI-powered cloud IDE.
• Technologies: Next.js, TypeScript, React.js, MongoDB,
Tailwind CSS, Ollama
VeloxRide | Real-Time Ride Booking Platform
• Developed a ride-booking platform.
"""
    out = parse(text)["projects"]
    assert [p["title"] for p in out] == ["CodeForge AI", "VeloxRide"]
    assert out[0]["techStack"] == ["Next.js", "TypeScript", "React.js", "MongoDB", "Tailwind CSS", "Ollama"]
    assert "Technologies" not in out[0]["description"]


def test_middot_separated_stack_and_trailing_year_are_not_a_tagline():
    text = """Projects
Job Application Co-Pilot | FastAPI · Groq (LLaMA-3.3-70B) · SQLite 2026
● Architected a multi-agent AI pipeline.
"""
    p = parse(text)["projects"][0]
    assert p["title"] == "Job Application Co-Pilot" and p["tagline"] == ""
    assert p["techStack"] == ["FastAPI", "Groq (LLaMA-3.3-70B)", "SQLite"]


def test_title_bullet_followed_by_a_tech_line_and_a_note_in_brackets():
    text = """Projects
–LAYTIME CALCULATOR (Hackathon Winner – Integrated Maritime Exchange) 2025
Tech: Python, Tesseract OCR, PostgreSQL.
– Engineered an AI solution that automated the parsing of Statement
of Facts documents.
– Secured First Place at the hackathon.
–AI-Powered Expense Tracker 2025
Tech: Java, JavaFX, Firebase
– Engineered a smart expense application.
"""
    out = parse(text)["projects"]
    assert [p["title"] for p in out] == ["LAYTIME CALCULATOR", "AI-Powered Expense Tracker"]
    assert out[0]["tagline"] == "Hackathon Winner – Integrated Maritime Exchange"
    assert out[0]["techStack"] == ["Python", "Tesseract OCR", "PostgreSQL"]
    assert "Secured First Place" in out[0]["description"]  # a short bullet is not a new project


def test_title_cased_bullet_heads_with_inline_technologies_and_hyphenation():
    text = """Projects
• Real-Time Flight Ticket Price Tracker: Developed a Python app to monitor flight prices. Technologies:
Python, REST APIs, JSON .
• Cryptocurrency and Currency Exchange Tracker: Built a tracker for fiat cur-
rencies and cryptocurrencies. Technologies: Python, Public APIs .
"""
    out = parse(text)["projects"]
    assert [p["title"] for p in out] == ["Real-Time Flight Ticket Price Tracker", "Cryptocurrency and Currency Exchange Tracker"]
    assert out[0]["techStack"] == ["Python", "REST APIs", "JSON"]
    assert "currencies" in out[1]["description"] and "Technologies" not in out[1]["description"]


def test_a_sentence_bullet_with_a_colon_is_not_a_project():
    text = """Projects
Placement Tracker | Python, React
• Implemented authentication: JWT tokens with refresh rotation.
• Added caching: Redis for hot paths.
"""
    assert titles(text) == ["Placement Tracker"]


# ---- other sections -------------------------------------------------------------------------------------

def test_school_line_then_degree_line_without_bullets():
    text = """Education
Graphic Era Deemed to be University, Dehradun
Bachelor of Technology in Computer Science & Engineering July 2024 – 2028 | CGPA: 8.95/10
Army Public School, Dehradun
Class XII (CBSE) 2022 – 2023 | 92%
"""
    edu = parse(text)["education"]
    assert [(e["degree"], e["institution"], e["startYear"], e["endYear"]) for e in edu] == [
        ("Bachelor of Technology in Computer Science & Engineering", "Graphic Era Deemed to be University", "2024", "2028"),
        ("Class XII (CBSE)", "Army Public School", "2022", "2023"),
    ]
    assert edu[0]["score"] == "CGPA: 8.95/10" and edu[1]["score"] == "92%"


def test_education_that_opens_with_a_bullet_and_skips_coursework():
    text = """Education
•B.Tech in CSE (AI & ML), Graphic Era Hill University, Dehradun2023–2027
Relevant Coursework:Data Structures, Machine Learning, Deep
Learning, Computer Organization.
"""
    (e,) = parse(text)["education"]
    assert e["degree"] == "B.Tech in CSE (AI & ML)" and e["institution"] == "Graphic Era Hill University"
    assert (e["startYear"], e["endYear"]) == ("2023", "2027")


def test_be_degree_is_still_recognised():
    (e,) = parse("Education\nB.E. in Computer Science | Army Institute of Technology | 2024 - 2028\n")["education"]
    assert e["degree"] == "B.E. in Computer Science"


def test_control_character_bullets_and_a_bulletless_last_line_in_achievements():
    text = """Achievements
\x88 Achieved a 3-star rating on CodeChef.
\x88 Secured All India Rank 269 in UPSC NDA-153 and was recommended by AFSB for the
IAF Flying Branch after clearing the SSB interview.
Amazon Web Services (AWS) Trained: Well-Architected, Networking Core.
"""
    got = [a["title"] for a in parse(text)["achievements"]]
    assert len(got) == 3
    assert got[1].endswith("clearing the SSB interview.")  # the wrapped line joined its bullet
    assert got[2].startswith("Amazon Web Services")
