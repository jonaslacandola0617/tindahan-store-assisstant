# ADR 0006: S3-compatible private receipt storage

Status: Accepted — July 31, 2026

Store receipt images in private S3-compatible object storage through an application port. Browser uploads use short-lived signed requests after authorization and file-policy validation. Database records hold generated object keys and metadata, never file blobs or public URLs. Cloudflare R2 and AWS S3 are interchangeable infrastructure implementations.
