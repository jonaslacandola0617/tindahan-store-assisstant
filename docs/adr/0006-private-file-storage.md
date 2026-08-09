# ADR 0006: S3-compatible private receipt storage

Status: Accepted — July 31, 2026

Store receipt images through an application port. The selected production adapter is an existing private AWS S3 general-purpose bucket using AWS SDK v3, bucket-owner-enforced ownership, disabled ACLs, blocked public access, SSE-S3, virtual-hosted regional endpoints, and short-lived signed PUT/GET requests. Database records hold generated object keys and metadata, never file blobs, credentials, or signed/public URLs. Local storage remains an explicit development/test adapter; production does not fall back to it.
