# Production deployment checklist

## Hosting

- Node.js 22.x and pnpm 11.18.0 are pinned in the build environment.
- Server secrets are configured only in encrypted deployment settings and never use `NEXT_PUBLIC_`.
- `NEXTAUTH_URL` is the exact HTTPS production origin and `NEXTAUTH_SECRET` is unique and at least 32 characters.
- The application runs behind a trusted ingress that overwrites `X-Forwarded-For`; database-backed rate limiting is enabled.
- `/api/health` is used for liveness and `/api/ready` for readiness.

## Database

- `DATABASE_URL` is pooled and `DIRECT_URL` is unpooled.
- Automated backups and point-in-time recovery are enabled and a restore test has succeeded.
- The pre-deploy snapshot identifier is recorded.
- Deploy migrations and `pnpm release:verify` both succeed.

## Receipts

- The configured AWS S3 bucket is private, Block Public Access is enabled, ACLs are disabled, and only the approved IAM identity/role has bucket-scoped access.
- S3 CORS lists only exact application origins and required methods/headers.
- Azure Document Intelligence uses the approved endpoint, key, API version, and prebuilt receipt model.
- Lambda and the web application use the same database schema and receipt bucket.
- The retention command is scheduled with dry-run monitoring and restricted credentials.

## Release verification

- CI quality workflow passes from a clean checkout.
- Security headers are present on HTML and API responses.
- No source maps, secrets, `.env`, fixtures containing private data, or debug logs are publicly served.
- Desktop and mobile keyboard/screen-reader smoke checks pass in English and Filipino.
- Sign-in, tenant isolation, inventory concurrency, sale idempotency, receipt idempotency, export, and read-only-plan tests pass.
- Monitoring alerts and an on-call contact are configured before traffic is enabled.
