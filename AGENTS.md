# Agent Guidelines for Books API

This document provides essential information for AI coding agents working in this repository.

## Project Overview

- **Runtime:** Bun (JavaScript runtime)
- **Language:** TypeScript (strict mode enabled)
- **Framework:** Hono (lightweight web framework)
- **Database:** PostgreSQL (schema exists, not integrated yet)
- **Cache:** Redis (configured, not integrated yet)
- **Container:** Docker + Kubernetes with ArgoCD GitOps
- **Autoscaling:** KEDA HTTP Add-on (v0.11.1)

## Build, Lint & Test Commands

### Development
```bash
bun run dev                    # Start dev server with hot reload
bun install                    # Install dependencies
bun run --bun src/index.ts     # Run without hot reload
```

### Docker
```bash
bun run docker:dev             # Start full stack (API, PostgreSQL, Redis, Adminer)
bun run docker:dev:build       # Build and start
bun run docker:down            # Stop containers
bun run docker:down:volumes    # Stop and remove volumes
bun run docker:logs            # Follow API logs
```

### Testing
```bash
bun test                              # Run all tests (none configured yet)
bun test path/to/test.test.ts         # Run specific test file
bun test --grep "test name pattern"   # Run tests matching pattern
```

### Linting & Formatting
```bash
# Prettier configured (.prettierrc) but no format script yet
# No linter configured - consider adding @biomejs/biome
```

## Code Style Guidelines

**CRITICAL:** This project uses Prettier with specific formatting rules. Always follow these patterns:

### Formatting Rules (Enforced by Prettier)
- **Quotes:** Single quotes for strings (`'hello'` not `"hello"`)
- **Semicolons:** No semicolons (enforced by Prettier)
- **Indentation:** 2 spaces
- **Trailing commas:** Use in multiline objects/arrays

### Import & Module Style
```typescript
// ✅ Named imports, single quotes, no semicolons
import { Hono } from 'hono'
import { prettyJSON } from 'hono/pretty-json'
import * as k8s from '@kubernetes/client-node'

// ✅ Group imports: external packages first, then local modules
import { metricsMiddleware } from './metrics/middleware'
```

### TypeScript Patterns
```typescript
// ✅ Explicit array types with inline objects
const books: Array<{ title: string; author: string; isbn: string }> = []

// ✅ Extract to type when reused or complex
type Book = { title: string; author: string; isbn: string }

// ✅ Use inference where obvious
const app = new Hono()  // Type inferred

// ✅ Strict mode enforced - no implicit any
```

### Naming Conventions
```typescript
// Variables & functions: camelCase
const bookList = []

// Types & interfaces: PascalCase
type Book = { title: string }

// Constants: camelCase or UPPER_SNAKE_CASE
const apiVersion = '1.0.0'
const MAX_RETRIES = 3
```

### Error Handling & Hono Patterns
```typescript
// ✅ Set status, handle errors gracefully
app.post('/books', async (c) => {
  try {
    c.status(201)
    return c.json({ message: 'Created' })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    c.status(500)
    return c.json({ error: 'Internal server error', message: errorMessage })
  }
})

// ✅ Use c.json() and set status before returning
app.get('/books', (c) => c.json(books))
app.delete('/books/:id', (c) => {
  c.status(204)
  return c.json({ success: true })
})

// ✅ Query params with defaults, middleware for cross-cutting concerns
const page = parseInt(c.req.query('page') || '1')
app.use(prettyJSON())
app.use('*', tracingMiddleware)

// Status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Error
```

## Git Commit Convention

**CRITICAL:** This project uses [Conventional Commits](https://www.conventionalcommits.org/) with automated validation via Husky hooks.

### Format: `<type>(<scope>): <subject>`

**Types that trigger releases:**
- `feat`: New feature → MINOR version bump
- `fix`: Bug fix → PATCH version bump
- `perf`: Performance improvement → PATCH version bump
- Add `!` after type for breaking changes (MAJOR bump): `feat!: redesign API`

**Types that DON'T trigger releases:**
- `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `build`, `revert`

### Examples
```bash
# ✅ Correct
git commit -m "feat: add user authentication"
git commit -m "fix: resolve memory leak in Docker container"
git commit -m "docs: update API documentation"
git commit -m "feat!: redesign authentication API"  # Breaking change

# ❌ Incorrect (will be rejected by Husky)
git commit -m "Added new feature"
git commit -m "fixed bug"
```

### Rules (Enforced by commitlint)
- Type must be lowercase and from allowed list
- Subject cannot be empty or end with period
- Header max 100 characters

## Environment Variables

See `.env.example`: `NODE_ENV`, `PORT` (default: 3000), `DATABASE_URL`, `REDIS_URL`

## Important Notes for Agents

1. **Commit validation is enforced:** Use proper conventional commit format or commits will be rejected
2. **No test framework yet:** When adding tests, consider vitest or bun:test
3. **No linter configured:** Code style is enforced manually
4. **Bun-specific:** Use Bun APIs where available (faster than Node.js equivalents)
5. **Database not integrated:** PostgreSQL schema exists in `init-db/` but app uses in-memory array
6. **Production-ready DevOps:** Full CI/CD, GitOps, and Kubernetes deployment configured

## References

- [Hono Documentation](https://hono.dev/)
- [Bun Documentation](https://bun.sh/docs)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- See `CONTRIBUTING.md` for detailed contribution guidelines
- See `DEPLOYMENT.md` for deployment instructions
- See `GITOPS.md` for GitOps workflow details


