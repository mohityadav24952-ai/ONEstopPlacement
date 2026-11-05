"""The master list of core-subject interview questions (OS, DBMS, CN, OOP).

Hardcoded on purpose: these are NOT fetched from the web. The raw lines below are kept exactly as
supplied (including their odd spacing and side notes) so the source list stays auditable; `tidy()`
cleans each one when it is seeded. Per plan, the order is shuffled and each question is lightly
re-worded (see paraphrase.py), so a new plan feels fresh while meaning never changes.
"""
import re

# topic -> raw lines
RAW: dict[str, list[str]] = {
    "OS": [
        "What is the main purpose of an operating system? Discuss different types? ",
        "What is a socket, kernel and monolithic kernel ? ",
        "Difference between process and program and thread? Different types of process. ",
        "Define virtual memory, thrashing, threads.  ",
        "What is RAID ? Different types. ",
        "What is a deadlock ? Different conditions to achieve a deadlock. ",
        "What is fragmentation? Types of fragmentation. ",
        "What is spooling ? ",
        "What is semaphore and mutex (Differences might be asked)? Define Binary semaphore. ",
        "Belady’s Anomaly",
        "Starving and Aging in OS",
        "Why does trashing occur? ",
        "What is paging and why do we need it? ",
        "Demand Paging, Segmentation ",
        "Real Time Operating System, types of RTOS. ",
        "Difference between main memory and secondary memory. ",
        "Dynamic Binding ",
        "FCFS Scheduling ",
        "SJF Scheduling ",
        "SRTF Scheduling ",
        "LRTF Scheduling ",
        "Priority Scheduling ",
        "Round Robin Scheduling ",
        "Producer Consumer Problem ",
        "Banker’s Algorithm ",
        "Explain Cache",
        "Diff between direct mapping and associative mapping ",
        "Diff between multitasking and multiprocessing ",
    ],
    "DBMS": [
        "What is DBMS ? Mention advantages.. ",
        "What is Database? ",
        "What is a database system? ",
        "What is RDBMS ? Properties.. ",
        "Types of database languages ",
        "ACID properties (VVVVV IMP) ",
        "Difference between vertical and horizontal scaling ",
        "What is sharding ",
        "Keys in DBMS ",
        "Types of relationship ",
        "Data abstraction in DBMS, three levels of it ",
        "Indexing in DBMS ",
        "What is DDL (Data Definition Language) ",
        "What is DML (Data Manipulation Language)",
        "What is normalization ? Types of them .. ",
        "What is denormalization ? ",
        "What is functional dependency ? ",
        "E-R Model ? ",
        "Conflict Serializability in DBMS .. ",
        "Explain Normal forms in DBMS ",
        "What is CCP ? (Concurrency Control Protocols) ",
        "Entity, Entity Type, Entity Set, Weak Entity Set.. ",
        "What are SQL commands ? Types of them.. ",
        "Nested Queries in SQL ? ",
        "What is JOIN .. Explain types of JOINs ",
        "Inner and Outer Join ",
        "Practice sql queries from leetcode",
        "Diff between 2 tier and 3 tier architecture ",
        "Diff between TRUNCATE and DELETE command .. ",
        "Difference between Intension and Extension in a DataBase",
        "Difference between share lock and exclusive lock, definition of lock ",
    ],
    "CN": [
        "Define network ",
        "What do you mean by network topology, and explain types of them ",
        "Define bandwidth, node and link ? ",
        "Explain TCP model .. ",
        "Layers of OSI model ",
        "Significance of Data Link Layer",
        "Define gateway, difference between gateway and router .. ",
        "What does ping command do ? ",
        "What is DNS, DNS forwarder, NIC, ? ",
        "What is MAC address ? ",
        "What is IP address, private IP address, public IP address, APIPA ? ",
        "Difference between IPv4 and IPv6",
        "What is subnet ? ",
        "Firewalls ",
        "Different type of delays ",
        "3 way handshaking ",
        "Server-side load balancer",
        "RSA Algorithm ",
        "What is HTTP and HTTPS protocol ? ",
        "What is SMTP protocol ? ",
        "TCP and UDP protocol, prepare differences",
        "What happens when you enter “google.com” (very very famous question) ",
        "Hub vs Switch ",
        "VPN, advantages and disadvantages of it ",
        "LAN ",
    ],
    "OOP": [
        "What is Object-Oriented Programming (OOP)?",
        "What is the difference between Procedural Programming and OOP?",
        "What is a Class?",
        "What is an Object?",
        "Is it always necessary to create objects from a class?",
        "What is the difference between a Class and a Structure?",
        "How much memory does a class occupy?",
        "What is Encapsulation?",
        "What is the difference between Encapsulation and Abstraction?",
        "What is Abstraction and how is it achieved?",
        "What is Inheritance and what is its purpose?",
        "What are the different types of Inheritance?",
        "What is Polymorphism?",
        "What is the difference between Compile-time (Static) and Run-time (Dynamic) Polymorphism?",
        "What is Method Overloading vs. Method Overriding?",
        "What is a Constructor?",
        "What are the different types of constructors?",
        "What is a Destructor?",
        "What is the purpose of the this (or self) keyword?",
        "What is a Static Method vs. an Instance Method?",
        "What are Access Specifiers (Modifiers) and why do we use them?",
        "What is the difference between an Abstract Class and an Interface?",
        "What is Association, Aggregation, and Composition?",
        "What is a Virtual Function and Pure Virtual Function?",
        "What are the main advantages and disadvantages of OOP?",
    ],
}

CORE_TOPICS = tuple(RAW)
MASTER_TAG = "core-master"

# Questions that go deeper than a definition.
HARD = {"Banker’s Algorithm", "Conflict Serializability in DBMS", "What is CCP", "RSA Algorithm"}

_SIDE_NOTES = re.compile(r"\s*\((?:VVVVV IMP|very very famous question|Differences might be asked)\)", re.I)
_STARTS_LIKE_A_QUESTION = re.compile(
    r"^(what|why|how|when|which|is|are|can|define|explain|difference|diff|discuss|describe|practice|mention|list)\b", re.I
)

def tidy(raw: str) -> str:
    """Clean one raw line: drop side notes, fix spacing and punctuation, make it a full sentence."""
    t = _SIDE_NOTES.sub("", raw).strip()
    t = re.sub(r"\bvs\.", "vs", t)                   # "vs." is an abbreviation, not a sentence end
    t = re.sub(r"\s+([?,.])", r"\1", t)              # "RAID ?"   -> "RAID?"
    t = re.sub(r",\?$", "?", t)                      # "NIC,?"    -> "NIC?"
    t = re.sub(r"\.{2,}", ".", t)                    # "advantages.." -> "advantages."
    t = re.sub(r"\bDiff\b", "Difference", t)
    t = re.sub(r"(?i)\btrashing\b", "thrashing", t)  # the source list misspells it
    t = re.sub(r"(?i)\bsql\b", "SQL", t)
    t = re.sub(r"(?i)\bleetcode\b", "LeetCode", t)
    # "What is CCP? (Concurrency Control Protocols)"  ->  "What is CCP (Concurrency Control Protocols)?"
    t = re.sub(r"^(What (?:is|are) [^?.()]+)\? (\([^)]*\))\??$", r"\1 \2?", t)
    # "What is X vs Y?"  ->  a proper difference question
    t = re.sub(r"^What is (.+?) vs (.+?)\?$", r"What is the difference between \1 and \2?", t)
    vs = re.match(r"^(.+?) vs (.+?)\s*$", t, re.I)
    if vs and not _STARTS_LIKE_A_QUESTION.match(t):
        t = f"What is the difference between {vs.group(1)} and {vs.group(2)}?"
    elif not _STARTS_LIKE_A_QUESTION.match(t):
        t = "Explain " + re.sub(r"\?\s*$", "", t)  # a bare topic becomes "Explain <topic>."
    # a question that is followed by more text keeps its question mark ("What is JOIN. Explain..." -> "What is JOIN? Explain...")
    t = re.sub(r"^((?:What|Why|How|When|Which|Is|Are|Can)\b[^.?]*?)\.(\s+[A-Z])", r"\1?\2", t)
    if not re.search(r"[.?]$", t):
        last = re.split(r"(?<=[.?])\s+", t)[-1]  # judge the final sentence on its own
        t += "?" if re.match(r"^(what|why|how|when|which|is|are|can)\b", last, re.I) else "."
    return re.sub(r"\s{2,}", " ", t)


def master_questions() -> list[tuple[str, str, str]]:
    """(topic, difficulty, tidy text), in source order."""
    out: list[tuple[str, str, str]] = []
    for topic, lines in RAW.items():
        for raw in lines:
            text = tidy(raw)
            plain = re.sub(r"[?.\s]+$", "", _SIDE_NOTES.sub("", raw).strip())
            if any(plain.startswith(h) for h in HARD):
                difficulty = "HARD"
            elif len(text.split()) <= 8:
                difficulty = "EASY"
            else:
                difficulty = "MEDIUM"
            out.append((topic, difficulty, text))
    return out
