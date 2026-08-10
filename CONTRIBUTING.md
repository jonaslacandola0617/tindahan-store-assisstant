# Contributing

TINDAHAN is maintained with a few rules that keep product behavior, data safety, and the approved interface consistent.

## Source of truth

When implementation details disagree, use this order:

1. Product requirements
2. Approved static prototype
3. Visual identity and design specifications
4. Existing application architecture

The prototype in `design/static-prototype/` is a reference artifact and should not be modified to make production code easier to implement.

## Development rules

- Preserve existing product behavior unless a change is intentional and documented.
- Keep authenticated store context server-side; never trust a browser-provided store ID for authorization.
- Keep UI/presentation code separate from application rules and infrastructure/provider integrations.
- Do not call database or provider SDKs directly from presentation components.
- Keep important inventory, receipt, sales, and billing transitions transactional and idempotent.
- OCR and automated matching may suggest changes, but inventory changes require explicit user approval.
- Keep secrets and provider credentials in environment variables only.
- Preserve the existing visual system instead of introducing one-off UI patterns.
- Add or update tests when behavior changes.

## Before opening a pull request

Run the checks relevant to the change:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Database-backed checks require an isolated test database configured through the documented environment variables.

For architecture, deployment, receipt processing, billing, and design details, use the maintained documents linked from the root README.
