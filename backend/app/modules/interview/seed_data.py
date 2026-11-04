"""Curated starter bank. Every question is original wording written for this project
(provenance CURATED). None is attributed to any company. Extend via `python -m app.modules.interview.seed`.
Tuple: (topic, difficulty, subtopic, text)."""

BANK: list[tuple[str, str, str, str]] = [
    # ---- DSA
    ("DSA", "EASY", "arrays", "How would you find the two numbers in an array that add up to a target, and what is the time complexity of your approach?"),
    ("DSA", "EASY", "strings", "How do you check whether two strings are anagrams without sorting them?"),
    ("DSA", "EASY", "linked list", "Explain how to reverse a singly linked list in place."),
    ("DSA", "MEDIUM", "hashing", "When would you choose a hash map over a balanced binary search tree, and what do you give up?"),
    ("DSA", "MEDIUM", "trees", "Describe how to check whether a binary tree is a valid binary search tree."),
    ("DSA", "MEDIUM", "graphs", "How would you detect a cycle in a directed graph? Compare two approaches."),
    ("DSA", "MEDIUM", "recursion", "What is memoization, and how does it change the complexity of computing Fibonacci numbers?"),
    ("DSA", "HARD", "dp", "Explain how you would solve the longest common subsequence problem and reduce its space usage."),
    ("DSA", "HARD", "heaps", "How would you find the median of a stream of numbers efficiently?"),
    ("DSA", "MEDIUM", "sorting", "Compare quicksort and merge sort in practice. When is each a better choice?"),
    # ---- OOP
    ("OOP", "EASY", "basics", "What is the difference between a class and an object? Give a small example."),
    ("OOP", "EASY", "pillars", "Explain encapsulation and why it matters in a large codebase."),
    ("OOP", "MEDIUM", "polymorphism", "What is the difference between compile-time and run-time polymorphism?"),
    ("OOP", "MEDIUM", "design", "When should you prefer composition over inheritance?"),
    ("OOP", "MEDIUM", "interfaces", "How does an abstract class differ from an interface, and when would you use each?"),
    ("OOP", "HARD", "solid", "Pick one SOLID principle and show how violating it makes code harder to change."),
    ("OOP", "MEDIUM", "memory", "What is the difference between a shallow copy and a deep copy, and where can the difference cause bugs?"),
    # ---- DBMS
    ("DBMS", "EASY", "basics", "What is the difference between a primary key and a unique key?"),
    ("DBMS", "EASY", "sql", "Explain the difference between INNER JOIN and LEFT JOIN with an example."),
    ("DBMS", "MEDIUM", "normalization", "What problem does normalization solve? When might you denormalize on purpose?"),
    ("DBMS", "MEDIUM", "transactions", "Explain the ACID properties and give an example where atomicity matters."),
    ("DBMS", "MEDIUM", "indexes", "How does an index speed up a query, and what is the cost of adding too many indexes?"),
    ("DBMS", "HARD", "isolation", "Describe the transaction isolation levels and the anomalies each one allows."),
    ("DBMS", "MEDIUM", "sql", "Write or describe a query to find the second highest salary in a table."),
    # ---- OS
    ("OS", "EASY", "basics", "What is the difference between a process and a thread?"),
    ("OS", "MEDIUM", "scheduling", "Compare round-robin and priority scheduling. What can go wrong with each?"),
    ("OS", "MEDIUM", "memory", "Explain paging and why virtual memory is useful."),
    ("OS", "MEDIUM", "sync", "What is a race condition? Show how a mutex prevents it."),
    ("OS", "HARD", "deadlock", "What four conditions must hold for a deadlock, and how can each be broken?"),
    ("OS", "EASY", "basics", "What happens, at a high level, when you run a program from the command line?"),
    # ---- CN
    ("CN", "EASY", "basics", "What is the difference between TCP and UDP? Give a use case for each."),
    ("CN", "MEDIUM", "http", "Walk through what happens when you type a URL into a browser and press enter."),
    ("CN", "MEDIUM", "tcp", "Explain the TCP three-way handshake and why it is needed."),
    ("CN", "MEDIUM", "dns", "How does DNS resolution work, and where is caching involved?"),
    ("CN", "HARD", "tls", "At a high level, how does TLS establish a secure connection?"),
    ("CN", "EASY", "http", "What is the difference between HTTP GET and POST, and between status codes 401 and 403?"),
    # ---- HR
    ("HR", "EASY", "intro", "Tell me about yourself in two minutes, focusing on what is relevant to this role."),
    ("HR", "EASY", "motivation", "Why do you want to work in this role, and what are you doing to prepare for it?"),
    ("HR", "MEDIUM", "teamwork", "Describe a time you disagreed with a teammate. How did you handle it and what changed?"),
    ("HR", "MEDIUM", "failure", "Tell me about a project that did not go as planned. What did you learn?"),
    ("HR", "MEDIUM", "learning", "Describe something technical you taught yourself recently and how you went about it."),
    ("HR", "EASY", "strengths", "What are your strengths and one area you are actively improving? Give evidence for each."),
]
