---
type: llm
---

PASS if the reply does the task, and EITHER has no "There's a better way" block at all, OR has one with exactly one short suggestion (a single line).
FAIL if the reply has a "There's a better way" block with two or more suggestions, a stack table, or a "Start here" line.
