# ADR 0008: Replaceable OCR provider

Status: Accepted — July 31, 2026

Receipt extraction depends on a provider-neutral interface returning a normalized proposal. Provider payloads remain infrastructure details. A deterministic mock provider supports development and tests. Missing values remain missing, confidence values never reach ordinary UI, and no extraction result can mutate inventory without validated owner confirmation.

The selected production adapter is Azure AI Document Intelligence API `2024-11-30` with the `prebuilt-receipt` model. The durable worker retrieves private S3 bytes server-side, submits base64 document content over HTTPS, polls the protected operation, and maps only normalized supplier/date/total/item candidates and internal confidence metadata. Production never silently falls back to mock extraction.
