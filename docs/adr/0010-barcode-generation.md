# ADR 0010: Store-scoped internal barcode generation

Status: Accepted — July 31, 2026

Generate owner-opaque, collision-resistant internal values in the Barcodes application service, then enforce active store-scoped uniqueness in PostgreSQL. Assignment history is preserved, replacement retires rather than reuses the old value, and label rendering is a presentation concern. Manufacturer and internal codes resolve through one normalized lookup port.
