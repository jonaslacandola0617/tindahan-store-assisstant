# ADR 0005: Balance plus immutable inventory ledger

Status: Accepted — July 31, 2026

`InventoryBalance` is the current authoritative quantity and `InventoryMovement` is the immutable audit trail. Each quantity change creates one movement and updates the balance in the same database transaction. Conditional/versioned writes prevent negative stock and stale updates. Movements and confirmed sales are never edited or deleted; corrections append compensating movements.
