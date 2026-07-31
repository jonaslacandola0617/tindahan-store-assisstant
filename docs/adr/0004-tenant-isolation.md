# ADR 0004: Membership-derived tenant isolation

Status: Accepted — July 31, 2026

Every store-owned operation receives a `StoreContext` created on the server from the authenticated user and an active `StoreMembership`. Client store IDs are treated as untrusted selectors and verified against membership before use. Repository methods require store scope, Owner-only policies are explicit, and cross-store denial is tested. V1 exposes one active store but preserves account/store/membership separation.
