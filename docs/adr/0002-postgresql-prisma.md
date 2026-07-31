# ADR 0002: PostgreSQL and Prisma 7

Status: Accepted — July 31, 2026

Use PostgreSQL with Prisma 7, versioned SQL migrations, and the PostgreSQL driver adapter. Prisma Next is not selected because it remains early access; the vendor identifies Prisma 7 as the production line. Infrastructure repositories own Prisma access. Presentation components never import Prisma, and public contracts never expose generated models.
