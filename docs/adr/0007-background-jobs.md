# ADR 0007: Durable job adapter with Inngest preference

Status: Accepted — July 31, 2026

Long-running receipt work uses a durable job port. Inngest is the preferred first provider, but domain/application code depends only on job commands and idempotent handlers. Jobs expose retry-safe states and correlation identifiers; exhausted work remains inspectable and user-visible as a recoverable failure.
