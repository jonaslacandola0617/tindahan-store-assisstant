# ADR 0001: Next.js modular monolith

Status: Accepted — July 31, 2026

Use Next.js 16 App Router, React 19, and strict TypeScript in one deployable modular monolith. Server Components are the default; Client Components require genuine interaction. This matches the approved stack and supports server authorization near presentation boundaries without introducing microservices. `design/static-prototype/` remains the visual regression reference and production UI contract.
