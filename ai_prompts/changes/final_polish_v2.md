# CRITICAL FINAL POLISH SPECIFICATION (V3)

## PRE-REQUISITE: SAVE STATE (NON-NEGOTIABLE)
1. Execute a `git add .` and `git commit -m "chore: save stable state before final polish of prep, resume modules, and hynts integration"`. Do not proceed with ANY code changes until this is committed.
2. The project is 95% complete. DO NOT modify, refactor, or break any existing working internal wiring, API routes, or the core UI logic. Keep changes strictly additive and isolated.

## PHASE 1: INTERVIEW PREP MODULE & HYNTS INTEGRATION
1. **Primary Data Source for Empty Days (Day 5+):** The prep plan currently leaves Day 5 onwards empty with "0/0" questions. You must fix this by integrating the `Hynts Company Wise DSA Sheet` (URL: https://hynts.in/preparation/company-wise-dsa-sheet/). Dynamically map the user's selected company to the Hynts platform. For these empty days, automatically populate the UI with direct actionable links to the Hynts company-wise practice sheets.
2. **Fallback Strategy:** ONLY if the specific company is not available on Hynts or the link fails, fallback to filling the remaining days by uniformly mixing questions from the curated fallback list of 100 DSA questions (provided at the end of this document). Each day should have 4-5 mixed questions with their exact provided links.
3. **Curated Resources Section:** Scroll to the bottom of the Interview Prep page where resources like Neetcode 150 or A2Z sheets are typically listed. You MUST add a prominent new resource card/link for "Hynts Company Wise DSA Sheet (2026-27)" pointing to `https://hynts.in/preparation/company-wise-dsa-sheet/`.
4. **UI Toast/Popup:** Add a subtle, non-intrusive toast message or a floating side-note on the Interview Prep screen that says: "Scroll down to find curated resources for better preparation."
5. **Footer Motivation:** At the very bottom of the resources section, add a visually appealing footer block with the text "ALL THE BEST!" and a dynamic, motivating tech/coding quote.
6. **Image Integration Query:** In your CLI response after execution, suggest 1 or 2 technical ways we could dynamically inject company logos or motivation images into the Prep UI without cluttering the current Neon/Dark aesthetic.

## PHASE 2: RESUME STUDIO REFINEMENT
1. **Strict 1-Page Limit:** Ensure all generated ATS-friendly templates (Overleaf style, Intern, Startup) are strictly constrained to generate a 1-page resume. Adjust CSS/PDF generation scaling to prevent overflow. 
2. **Parser Fixes (Critical):** Improve the resume text extraction and matching logic. Currently, it fails to detect basic skills like "C++" even if present in the uploaded PDF. Use a more robust regex or LLM prompt instruction to ensure accurate skill detection without false negatives.
3. **AI Summary Generation:** Automatically generate an AI-tailored professional summary (2-3 lines) based on the uploaded resume and the target JD.
4. **Max Editability:** Make sure the generated JD-tailored resume is highly editable. The user should be able to click and modify text fields, bullet points, and the generated AI summary directly in the preview before final export.

## PHASE 3: PORTFOLIO WEBSITE DEPLOYMENT READINESS
1. Ensure that the generated live link for the Portfolio Website uses dynamic environment variables (e.g., `NEXT_PUBLIC_BASE_URL`) rather than hardcoded `localhost`. This ensures that when the main app is deployed to Vercel/Netlify, the portfolio links become instantly public and shareable.

---
## FALLBACK 100 DSA QUESTIONS & LINKS (FOR PHASE 1 FALLBACK ONLY)
Please use this exact list ONLY if Hynts data is unavailable for the target company:

Two Sum - https://leetcode.com/problems/two-sum/
Best Time to Buy and Sell Stock - https://leetcode.com/problems/best-time-to-buy-and-sell-stock/
Contains Duplicate - https://leetcode.com/problems/contains-duplicate/
Product of Array Except Self - https://leetcode.com/problems/product-of-array-except-self/
Search in Rotated Sorted Array - https://leetcode.com/problems/search-in-rotated-sorted-array/
Find Minimum in Rotated Sorted Array - https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/
3Sum - https://leetcode.com/problems/3sum/
Container With Most Water - https://leetcode.com/problems/container-with-most-water/
Climbing Stairs - https://leetcode.com/problems/climbing-stairs/
Coin Change - https://leetcode.com/problems/coin-change/
Longest Increasing Subsequence - https://leetcode.com/problems/longest-increasing-subsequence/
Word Break - https://leetcode.com/problems/word-break/
Combination Sum - https://leetcode.com/problems/combination-sum/
House Robber - https://leetcode.com/problems/house-robber/
House Robber II - https://leetcode.com/problems/house-robber-ii/
Decode Ways - https://leetcode.com/problems/decode-ways/
Unique Paths - https://leetcode.com/problems/unique-paths/
Jump Game - https://leetcode.com/problems/jump-game/
Clone Graph - https://leetcode.com/problems/clone-graph/
Course Schedule - https://leetcode.com/problems/course-schedule/
Pacific Atlantic Water Flow - https://leetcode.com/problems/pacific-atlantic-water-flow/
Number of Islands - https://leetcode.com/problems/number-of-islands/
Longest Consecutive Sequence - https://leetcode.com/problems/longest-consecutive-sequence/
Insert Interval - https://leetcode.com/problems/insert-interval/
Merge Intervals - https://leetcode.com/problems/merge-intervals/
Non-overlapping Intervals - https://leetcode.com/problems/non-overlapping-intervals/
Reverse a Linked List - https://leetcode.com/problems/reverse-linked-list/
Detect Cycle in a Linked List - https://leetcode.com/problems/linked-list-cycle/
Merge Two Sorted Lists - https://leetcode.com/problems/merge-two-sorted-lists/
Remove Nth Node From End Of List - https://leetcode.com/problems/remove-nth-node-from-end-of-list/
Reorder List - https://leetcode.com/problems/reorder-list/
Set Matrix Zeroes - https://leetcode.com/problems/set-matrix-zeroes/
Spiral Matrix - https://leetcode.com/problems/spiral-matrix/
Rotate Image - https://leetcode.com/problems/rotate-image/
Word Search - https://leetcode.com/problems/word-search/
Longest Substring Without Repeating Char - https://leetcode.com/problems/longest-substring-without-repeating-characters/
Longest Repeating Character Replacement - https://leetcode.com/problems/longest-repeating-character-replacement/
Minimum Window Substring - https://leetcode.com/problems/minimum-window-substring/
Valid Anagram - https://leetcode.com/problems/valid-anagram/
Group Anagrams - https://leetcode.com/problems/group-anagrams/
Valid Palindrome - https://leetcode.com/problems/valid-palindrome/
Longest Palindromic Substring - https://leetcode.com/problems/longest-palindromic-substring/
Maximum Depth of Binary Tree - https://leetcode.com/problems/maximum-depth-of-binary-tree/
Same Tree - https://leetcode.com/problems/same-tree/
Invert Binary Tree - https://leetcode.com/problems/invert-binary-tree/
Binary Tree Maximum Path Sum - https://leetcode.com/problems/binary-tree-maximum-path-sum/
Binary Tree Level Order Traversal - https://leetcode.com/problems/binary-tree-level-order-traversal/
Serialize and Deserialize Binary Tree - https://leetcode.com/problems/serialize-and-deserialize-binary-tree/
Validate Binary Search Tree - https://leetcode.com/problems/validate-binary-search-tree/
Kth Smallest Element in a BST - https://leetcode.com/problems/kth-smallest-element-in-a-bst/
Implement Trie (Prefix Tree) - https://leetcode.com/problems/implement-trie-prefix-tree/
Top K Frequent Elements - https://leetcode.com/problems/top-k-frequent-elements/
LRU Cache - https://leetcode.com/problems/lru-cache/
Min Stack - https://leetcode.com/problems/min-stack/
Daily Temperatures - https://leetcode.com/problems/daily-temperatures/
Largest Rectangle in Histogram - https://leetcode.com/problems/largest-rectangle-in-histogram/
Binary Search - https://leetcode.com/problems/binary-search/
Search a 2D Matrix - https://leetcode.com/problems/search-a-2d-matrix/
Median of Two Sorted Arrays - https://leetcode.com/problems/median-of-two-sorted-arrays/
Task Scheduler - https://leetcode.com/problems/task-scheduler/
Kadane's Algorithm - https://www.geeksforgeeks.org/problems/kadanes-algorithm-1587115620/1
Subarray with given sum - https://www.geeksforgeeks.org/problems/subarray-with-given-sum-1587115621/1
Sort an array of 0s 1s and 2s - https://www.geeksforgeeks.org/problems/sort-an-array-of-0s-1s-and-2s4231/1
Missing number in array - https://www.geeksforgeeks.org/problems/missing-number-in-array1416/1
Minimum Platforms - https://www.geeksforgeeks.org/problems/minimum-platforms-1587115620/1
Detect cycle in an undirected graph - https://www.geeksforgeeks.org/problems/detect-cycle-in-an-undirected-graph/1
Topological sort - https://www.geeksforgeeks.org/problems/topological-sort/1
DFS of Graph - https://www.geeksforgeeks.org/problems/depth-first-traversal-for-a-graph/1
BFS of Graph - https://www.geeksforgeeks.org/problems/bfs-traversal-of-graph/1
Fractional Knapsack - https://www.geeksforgeeks.org/problems/fractional-knapsack-1587115620/1
Job Sequencing Problem - https://www.geeksforgeeks.org/problems/job-sequencing-problem-1587115620/1
Intersection Point in Y Linked Lists - https://www.geeksforgeeks.org/problems/intersection-point-in-y-shapped-linked-lists/1
Flattening a Linked List - https://www.geeksforgeeks.org/problems/flattening-a-linked-list/1
Parenthesis Checker - https://www.geeksforgeeks.org/problems/parenthesis-checker2744/1
Next Greater Element - https://www.geeksforgeeks.org/problems/next-larger-element-1587115620/1
Trapping Rain Water - https://www.geeksforgeeks.org/problems/trapping-rain-water-1587115621/1
Check for BST - https://www.geeksforgeeks.org/problems/check-for-bst/1
Boundary Traversal of binary tree - https://www.geeksforgeeks.org/problems/boundary-traversal-of-binary-tree/1
Lowest Common Ancestor in a BST - https://www.geeksforgeeks.org/problems/lowest-common-ancestor-in-a-bst/1
Minimum Cost of ropes - https://www.geeksforgeeks.org/problems/minimum-cost-of-ropes-1587115620/1
Alien Dictionary - https://www.geeksforgeeks.org/problems/alien-dictionary/1
Majority Element - https://www.geeksforgeeks.org/problems/majority-element-1587115620/1
Find duplicates in an array - https://www.geeksforgeeks.org/problems/find-duplicates-in-an-array/1
Equilibrium Point - https://www.geeksforgeeks.org/problems/equilibrium-point-1587115620/1
Leaders in an array - https://www.geeksforgeeks.org/problems/leaders-in-an-array-1587115620/1
Allocate Books - https://www.naukri.com/code360/problems/allocate-books_1090540
Aggressive Cows - https://www.naukri.com/code360/problems/aggressive-cows_1082559
Find Nth Root Of M - https://www.naukri.com/code360/problems/nth-root-of-m_1062679
0 1 Knapsack - https://www.naukri.com/code360/problems/0-1-knapsack_920542
Matrix Chain Multiplication - https://www.naukri.com/code360/problems/matrix-chain-multiplication_975344
Subset Sum - https://www.naukri.com/code360/problems/subset-sum_3843086
Rat In A Maze - https://www.naukri.com/code360/problems/rat-in-a-maze_1215030
N Queens - https://www.naukri.com/code360/problems/n-queens_759332
Tree Traversals - https://www.naukri.com/code360/problems/tree-traversals_981269
K-th Element of 2 Sorted Arrays - https://www.naukri.com/code360/problems/k-th-element-of-2-sorted-array_1164159
Bottom View Of Binary Tree - https://www.naukri.com/code360/problems/bottom-view-of-binary-tree_893110
Top View Of Binary Tree - https://www.naukri.com/code360/problems/top-view-of-binary-tree_799401
Reverse A String - https://www.naukri.com/code360/problems/reverse-a-string_799927
Check Palindrome - https://www.naukri.com/code360/problems/palindrome-string_624635
Middle Of Linked List - https://www.naukri.com/code360/problems/middle-of-linked-list_973250