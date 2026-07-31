# ADR 0008: Replaceable OCR provider

Status: Accepted — July 31, 2026

Receipt extraction depends on a provider-neutral interface returning a normalized proposal. Provider payloads remain infrastructure details. A deterministic mock provider supports development and tests. Missing values remain missing, confidence values never reach ordinary UI, and no extraction result can mutate inventory without validated owner confirmation.
