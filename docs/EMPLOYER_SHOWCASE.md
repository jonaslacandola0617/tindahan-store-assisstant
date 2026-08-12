# Employer Showcase

This branch is a public, isolated Tindahan walkthrough for portfolio and employer review.

## Shared login

- Email: `employer@tindahan.test`
- Password: `tindahan123`
- Store: `Maria's Mini Mart`

The credentials are intentionally public demo credentials. Never reuse them for the real Tindahan application.

## Isolation rules

- Deploy this branch as a separate Vercel project.
- Use a separate PostgreSQL database or Neon branch. Never point it at the real Tindahan production database.
- Do not copy production Xendit, Resend, Azure AI, or AWS credentials into this project.
- Set `SHOWCASE_MODE=true` only on the employer showcase project.
- The showcase is intentionally `noindex` so search engines focus on the public marketing site instead of the shared demo app.
- Public receipt uploads, account registration, account deactivation, and password changes are disabled. Core store workflows such as inventory and sales remain usable for hands-on review.

## Recommended Vercel environment

```env
SHOWCASE_MODE=true
DATABASE_URL=<isolated-demo-database-pooled-url>
DIRECT_URL=<isolated-demo-database-direct-url>
NEXTAUTH_SECRET=<new-random-secret-at-least-32-characters>
NEXTAUTH_URL=https://tindahan-test.vercel.app
APP_URL=https://tindahan-test.vercel.app
RATE_LIMIT_PROVIDER=database
BILLING_PROVIDER=manual
EMAIL_PROVIDER=mock
RECEIPT_STORAGE_PROVIDER=local
RECEIPT_OCR_PROVIDER=mock
RECEIPT_JOB_PROVIDER=database
```

If the final Vercel hostname differs, use the actual hostname for `NEXTAUTH_URL` and `APP_URL`.

## Initialize a fresh showcase database

This showcase database is disposable and isolated. The repository has historical production migrations that are not safe to replay into a brand-new database in their current ordering, so the showcase branch intentionally uses Prisma `db push` to create the current schema directly.

Create a local `.env` containing the isolated showcase database URLs and the showcase environment values, then run:

```bash
pnpm install
pnpm db:generate
pnpm showcase:db:push
pnpm showcase:seed
```

Do not run the showcase database commands against the real production database.

## Seeded walkthrough

`pnpm showcase:seed` prepares:

- employer owner account and active sample staff member
- Maria's Mini Mart in Angeles City, Pampanga
- realistic sari-sari store products, categories, suppliers, costs, prices, stock thresholds, and barcodes
- sales spread across the recent weeks, including current-day sales for the dashboard
- low-stock and out-of-stock products
- a confirmed supplier receipt
- a supplier receipt ready for review
- a failed receipt state for error-handling/notification UI

The seed is designed for the isolated showcase database. Re-run it before an important interview/demo if the shared data has been changed significantly by previous visitors.

## Vercel project

Create a second Vercel project from the same GitHub repository. Name the project `tindahan-test` if that project slug is available, set its Production Branch to `showcase/employer-demo`, add only the isolated showcase environment values above, and deploy.

The real app project should continue tracking `main`.
