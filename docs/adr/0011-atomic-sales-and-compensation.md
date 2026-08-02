# ADR 0011: Atomic sales and explicit full correction

Status: Accepted — August 2, 2026

Sale drafts remain client-side because they have no business effect and the PRD does not require cross-device draft recovery. Confirmation is a store-scoped, idempotent, serializable application operation: Sale, SaleLine snapshots, conditional balance deductions, immutable movements, and audit data commit together or roll back together. The same successful idempotency key returns the original result; changed input is rejected.

Phase 3 implements the PRD's minimal historical correction as one full-sale correction. Only an Owner may perform it. The original Sale and SaleLines remain unchanged, a SaleCorrection records actor/reason/time/correlation, and new REVERSAL inventory movements restore every quantity atomically. Partial returns, refunds, exchanges, and payment processing remain out of scope.
