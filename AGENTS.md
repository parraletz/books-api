# Agent Guidelines for Books API

This document provides essential information for AI coding agents working in this repository.

## Project Overview

- **Runtime:** Bun (JavaScript runtime)
- **Language:** TypeScript (strict mode)
- **Framework:** Hono (lightweight web framework)
- **Database:** PostgreSQL
- **Cache:** Redis
- **Container:** Docker

## Build, Lint & Test Commands

### Development
```bash
bun run dev                    # Start dev server with hot reload
bun install                    # Install dependencies
bun run --bun src/index.ts     # Run without hot reload
```

### Docker Development
```bash
bun run docker:dev             # Start full stack (API, PostgreSQL, Redis, Adminer)
bun run docker:dev:build       # Build and start
bun run docker:down            # Stop containers
bun run docker:down:volumes    # Stop and remove volumes
bun run docker:logs            # Follow API logs
```

### Docker Production
```bash
bun run docker:prod:build      # Build production image
bun run docker:prod:run        # Run production container
```

### Testing
```bash
bun test                       # Run all tests (currently none configured)
# No test framework configured yet - use vitest or bun:test when implementing
```

### Linting & Type Checking
```bash
# No linter configured yet - consider adding:
# bun add -d @biomejs/biome    # Fast linter/formatter
# or
# bun add -d eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### Running Single Tests
```bash
# When tests are added, use:
bun test path/to/test.test.ts          # Run specific test file
bun test --grep "test name pattern"    # Run tests matching pattern
```

## Code Style Guidelines

### TypeScript Configuration
- **Strict mode enabled:** All strict type checks are enforced
- **JSX support:** `react-jsx` with `hono/jsx` import source
- **No implicit any:** Always provide explicit types

### Import Style
```typescript
// ✅ Correct: Named imports from packages
import { Hono } from "hono"
import { prettyJSON } from "hono/pretty-json"

// ✅ Use double quotes for strings
const message = "Hello"

// ✅ Type arrays explicitly
const books: Array<{ title: string; author: string; isbn: string }> = []
```

### Formatting
- **Quotes:** Double quotes for strings
- **Semicolons:** Optional (project doesn't enforce them consistently)
- **Indentation:** 2 spaces
- **Line length:** No strict limit but keep reasonable (~100 chars)
- **Trailing commas:** Use in multiline objects/arrays

### Naming Conventions
```typescript
// Variables & functions: camelCase
const bookList = []
function getBooks() {}

// Types & interfaces: PascalCase
type Book = { title: string }
interface BookRepository {}

// Constants: camelCase or UPPER_SNAKE_CASE for true constants
const apiVersion = "1.0.0"
const MAX_RETRIES = 3
```

### Type Definitions
```typescript
// ✅ Prefer explicit inline types for simple structures
const books: Array<{ title: string; author: string }> = []

// ✅ Extract to type/interface when reused
type Book = {
  title: string
  author: string
  isbn: string
}

// ✅ Use TypeScript inference where obvious
const app = new Hono()  // Type inferred
```

### Error Handling
```typescript
// ✅ Return appropriate HTTP status codes
app.post("/books", async (c) => {
  try {
    // ... logic
    c.status(201)
    return c.json({ message: "Created" })
  } catch (error) {
    c.status(500)
    return c.json({ error: "Internal server error" })
  }
})

// ✅ Validate input and return 400 for bad requests
// ✅ Return 404 for not found resources
// ✅ Return 401/403 for authentication/authorization errors
```

### Hono Patterns
```typescript
// ✅ Use c.json() for JSON responses
app.get("/books", (c) => {
  return c.json(books)
})

// ✅ Set status before returning
app.post("/books", (c) => {
  c.status(201)
  return c.json({ success: true })
})

// ✅ Use middleware for cross-cutting concerns
app.use(prettyJSON())
```

## Git Commit Convention

**CRITICAL:** This project uses [Conventional Commits](https://www.conventionalcommits.org/) with automated validation via Husky hooks.

### Commit Format
```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Commit Types

**Generate releases:**
- `feat`: New feature → MINOR version (1.x.0)
- `fix`: Bug fix → PATCH version (1.0.x)
- `perf`: Performance improvement → PATCH version

**Do NOT generate releases:**
- `docs`: Documentation changes
- `style`: Code formatting (no logic change)
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `build`: Build system changes

### Examples
```bash
# ✅ Correct
git commit -m "feat: add user authentication"
git commit -m "fix: resolve memory leak in Docker container"
git commit -m "docs: update API documentation"
git commit -m "feat(api): add book search endpoint"

# ✅ Breaking change (MAJOR version)
git commit -m "feat!: redesign authentication API"

# ❌ Incorrect (will be rejected by Husky)
git commit -m "Added new feature"
git commit -m "fixed bug"
git commit -m "Update docs"
```

### Commit Rules (Enforced)
- Type must be lowercase
- Type cannot be empty
- Subject cannot be empty
- No period at end of subject
- Header max 100 characters
- Body must have blank line before it

### Breaking Changes
```bash
# Option 1: Use ! after type
feat!: change API response format

# Option 2: Use BREAKING CHANGE in footer
feat: change API response format

BREAKING CHANGE: API now returns JSON instead of XML
```

## Project Structure

```
books-api/
├── src/
│   └── index.ts           # Main application entry point
├── init-db/
│   └── 01-init.sql        # Database schema & seed data
├── helm/                  # Kubernetes Helm charts
├── gitops/                # ArgoCD deployment configs
├── .github/
│   └── workflows/         # CI/CD pipelines
├── .husky/                # Git hooks (commit validation)
├── docker-compose.yml     # Dev stack definition
├── Dockerfile             # Production image
└── Dockerfile.dev         # Development image
```

## Environment Variables

See `.env.example` for all available variables:
- `NODE_ENV`: development/production
- `PORT`: Server port (default: 3000)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string

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
