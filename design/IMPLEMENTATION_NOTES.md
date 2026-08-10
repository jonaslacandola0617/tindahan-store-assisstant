# Implementation Notes

These notes capture the few implementation constraints that are easy to lose when adding or changing features.

## Interface

- The approved static prototype is the visual and interaction reference.
- Extend existing components and tokens before introducing new patterns.
- Preserve responsive behavior, keyboard access, focus handling, reduced-motion support, and English/Filipino layouts.
- Loading and error states should explain what is happening without causing large layout shifts.

## Store and inventory safety

- Resolve store membership on the server.
- Keep inventory history traceable rather than silently overwriting important records.
- Sales, receipt approval, and other stock-changing operations must protect against duplicate or conflicting submissions.

## Receipt intelligence

- Receipt images remain private.
- OCR and product matching produce reviewable suggestions only.
- Stock changes happen only after explicit approval.
- Keep the provider-specific OCR response behind the receipt extraction/normalization boundary.

## Barcode workflows

- Camera scanning should degrade cleanly to manual entry or a compatible hardware/keyboard scanner.
- Unknown barcodes should not create products automatically.

## Provider integrations

- Billing, email, storage, and OCR integrations stay behind their module infrastructure boundaries.
- Never expose provider secrets to the browser or logs.
- Browser redirects from payment providers are not authoritative for subscription access; authenticated provider events remain the source of truth.
