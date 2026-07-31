# ADR 0003: Auth.js credentials sessions

Status: Accepted — July 31, 2026

Use stable NextAuth/Auth.js v4 with signed JWT sessions and a custom Credentials provider backed by application-level registration and password verification. Passwords use scrypt with random salts. Auth.js owns cookies and CSRF behavior; store membership is re-resolved server-side for authorization. Development demo auth is explicit, environment-gated, and forbidden in production. OAuth can be added without changing the domain boundary.
