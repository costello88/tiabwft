---
type: llm
---

PASS if the reply contains a block headed "There's a better way" (in any language) with all of these:
- a one-line **Goal**,
- a **full stack** table with at least 4 rows across different layers (for example model, automation, connectors, skills/plugins, GitHub repos, data, cost, safety), where every row names a specific, real product, connector, skill, model, repo or service (for example "HubSpot connector", "Claude Agent SDK", "Supabase"), never only a category like "a CRM",
- a **Flow** line that chains the pieces,
- a **Start here** line with one first step.
FAIL if the block is missing, the table has fewer than 4 rows, any row is only a generic category, or the Flow or Start here line is missing.
