---
type: llm
---

PASS if the reply builds on Supabase (for example pgvector on the existing Supabase project) instead of adding a second database, and marks Supabase as already installed or already in use.
FAIL if it proposes a different primary database or vector store without saying why Supabase can't do it, or doesn't mark Supabase as already in use.
