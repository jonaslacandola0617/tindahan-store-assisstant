# ADR 0009: Server-rendered English and Filipino

Status: Accepted — July 31, 2026

Use typed message dictionaries for English and Filipino. Locale is resolved from an immediate cookie for server rendering and persisted to the authenticated user record. Switching locale refreshes server-rendered copy without changing route or client form state. Missing keys fail tests and safely fall back to English in runtime. Store-entered names and receipt content are never translated.
