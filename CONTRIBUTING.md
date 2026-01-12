# Guía de Contribución

## Conventional Commits

Este proyecto usa [Conventional Commits](https://www.conventionalcommits.org/) para generar releases y changelogs automáticamente.

### Formato de Commits

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Tipos de Commits

#### Commits que generan releases:

| Tipo | Descripción | Versión | Ejemplo |
|------|-------------|---------|---------|
| `feat` | Nueva funcionalidad | MINOR (0.x.0) | `feat: add user authentication` |
| `fix` | Corrección de bug | PATCH (0.0.x) | `fix: resolve login error` |
| `perf` | Mejora de rendimiento | PATCH (0.0.x) | `perf: optimize database queries` |

#### Commits que NO generan releases:

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `docs` | Documentación | `docs: update README` |
| `style` | Formato de código | `style: fix indentation` |
| `refactor` | Refactorización | `refactor: simplify auth logic` |
| `test` | Tests | `test: add unit tests for API` |
| `chore` | Mantenimiento | `chore: update dependencies` |
| `ci` | CI/CD | `ci: update workflow` |
| `build` | Build system | `build: update Dockerfile` |

### Breaking Changes

Para indicar un cambio incompatible (MAJOR version), usa `!` o añade `BREAKING CHANGE:` en el footer:

```bash
# Opción 1: Usar !
feat!: change API response format

# Opción 2: Usar footer
feat: change API response format

BREAKING CHANGE: API now returns JSON instead of XML
```

Esto incrementará la versión MAJOR (x.0.0)

### Scopes (Opcional)

Puedes especificar el área afectada:

```bash
feat(auth): add JWT authentication
fix(api): resolve CORS error
docs(readme): add installation guide
```

### Ejemplos Completos

#### Nueva funcionalidad (incrementa MINOR):
```bash
git commit -m "feat: add password reset functionality"
```

#### Corrección de bug (incrementa PATCH):
```bash
git commit -m "fix: resolve memory leak in Docker container"
```

#### Breaking change (incrementa MAJOR):
```bash
git commit -m "feat!: redesign authentication API

BREAKING CHANGE: Auth endpoints now require JWT tokens instead of session cookies"
```

#### Con scope y cuerpo:
```bash
git commit -m "feat(api): add book search endpoint

Add new /api/books/search endpoint that supports:
- Full-text search
- Filtering by author, category
- Pagination

Closes #123"
```

#### Documentación (no genera release):
```bash
git commit -m "docs: add API documentation"
```

## Proceso de Release Automático

### Cómo funciona:

1. **Haces commits** usando Conventional Commits en la rama `main`
2. **Release Please** analiza los commits desde el último release
3. **Crea/actualiza un PR** con:
   - Nueva versión calculada automáticamente
   - CHANGELOG.md actualizado
   - package.json actualizado (versión)
4. **Cuando merges el PR**, se crea automáticamente:
   - GitHub Release con notas
   - Tag de versión
   - Imágenes Docker publicadas en GHCR

### Ejemplo de flujo:

```bash
# 1. Hacer commits con conventional commits
git commit -m "feat: add user profile endpoint"
git commit -m "fix: resolve authentication bug"
git commit -m "docs: update API documentation"
git push origin main

# 2. Release Please abre/actualiza automáticamente un PR
# Título: "chore(main): release 1.1.0"

# 3. Revisa el PR y los cambios en CHANGELOG.md

# 4. Merge el PR

# 5. Automáticamente se crea:
# - Release v1.1.0 en GitHub
# - Tag v1.1.0
# - Imagen ghcr.io/owner/books-api:1.1.0
# - Imagen ghcr.io/owner/books-api:latest (actualizada)
```

## Versionado Semántico

Seguimos [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH
  │     │     │
  │     │     └─── Correcciones de bugs (fix, perf)
  │     └─────── Nuevas funcionalidades (feat)
  └───────────── Cambios incompatibles (BREAKING CHANGE)
```

### Ejemplos:

| Commits | Versión anterior | Nueva versión | Razón |
|---------|------------------|---------------|-------|
| `fix: bug` | 1.2.3 | 1.2.4 | PATCH: solo fix |
| `feat: feature` | 1.2.3 | 1.3.0 | MINOR: nuevo feat |
| `feat!: breaking` | 1.2.3 | 2.0.0 | MAJOR: breaking change |
| `docs: update` | 1.2.3 | 1.2.3 | Sin cambio: solo docs |
| `feat: a`<br>`fix: b` | 1.2.3 | 1.3.0 | MINOR: feat prevalece |

## Buenas Prácticas

### ✅ Hacer:

```bash
# Commits descriptivos y específicos
feat(auth): add OAuth2 support for Google login
fix(api): resolve race condition in book creation
perf(db): add indexes to improve query performance

# Usar breaking changes cuando sea necesario
feat!: migrate from REST to GraphQL API

# Incluir contexto en el cuerpo del commit
feat: add real-time notifications

Implement WebSocket server for real-time updates.
Includes support for:
- New book notifications
- Price changes
- Inventory updates
```

### ❌ Evitar:

```bash
# Mensajes vagos
git commit -m "fix stuff"
git commit -m "update"
git commit -m "changes"

# Mezclar tipos
git commit -m "feat: add feature and fix bug and update docs"

# No seguir el formato
git commit -m "Added new feature"  # Debería ser: feat: add new feature
```

## Herramientas Útiles

### Git Hooks con Husky (Ya configurado ✅)

Este proyecto **ya tiene Husky configurado** para validar commits automáticamente.

**Qué hace:**
- ✅ Valida el formato de commits antes de aceptarlos
- ✅ Rechaza commits que no sigan Conventional Commits
- ✅ Proporciona mensajes de error claros

**Instalación automática:**
```bash
# Los hooks se instalan automáticamente al hacer:
bun install

# Si necesitas reinstalarlos manualmente:
bunx husky install
```

**Ejemplo de validación:**
```bash
# ✅ Esto funcionará:
git commit -m "feat: add user authentication"

# ❌ Esto será rechazado:
git commit -m "added new feature"
# Error: subject may not be empty [subject-empty]
# Error: type may not be empty [type-empty]

# ❌ Esto también será rechazado:
git commit -m "Added: new feature"
# Error: type must be lower-case [type-case]
```

### Commitizen (Opcional)

Si prefieres ayuda interactiva para escribir commits:

```bash
# Instalar globalmente
npm install -g commitizen cz-conventional-changelog

# Usar en lugar de git commit
git cz
```

## Configuración del Proyecto

El proyecto usa [Release Please](https://github.com/googleapis/release-please) para automatización.

Archivos de configuración:
- `.release-please-manifest.json` - Versión actual
- `release-please-config.json` - Configuración de changelog
- `.github/workflows/auto-release.yml` - Workflow de GitHub Actions

## Recursos

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Release Please](https://github.com/googleapis/release-please)
- [Commitizen](https://github.com/commitizen/cz-cli)

## Preguntas Frecuentes

### ¿Qué pasa si Husky rechaza mi commit?

Husky validará tu commit antes de aceptarlo. Si el formato es incorrecto, verás un error:

```bash
$ git commit -m "added feature"
⧗   input: added feature
✖   subject may not be empty [subject-empty]
✖   type may not be empty [type-empty]

✖   found 2 problems, 0 warnings
ⓘ   Get help: https://github.com/conventional-changelog/commitlint/#what-is-commitlint

husky - commit-msg hook exited with code 1 (error)
```

**Solución:** Corrige el formato y vuelve a intentar:
```bash
git commit -m "feat: add new feature"
```

### ¿Puedo saltarme la validación de Husky?

**No se recomienda**, pero si absolutamente necesitas hacerlo:

```bash
git commit -m "mensaje" --no-verify
```

⚠️ **Advertencia:** Esto puede romper el sistema de releases automáticos.

### ¿Qué pasa si olvido usar conventional commits?

El commit no generará un release automático. Husky te ayudará a evitar esto rechazando commits con formato incorrecto.

### ¿Puedo hacer múltiples features en un solo commit?

Es mejor hacer commits separados para cada feature, pero si son muy relacionados, está bien combinarlos:

```bash
feat(api): add CRUD endpoints for books

- Add GET /books
- Add POST /books
- Add PUT /books/:id
- Add DELETE /books/:id
```

### ¿Cuándo debo usar BREAKING CHANGE?

Usa `BREAKING CHANGE` cuando:
- Cambias la firma de una API pública
- Eliminas funcionalidad existente
- Cambias el comportamiento esperado
- Requieres migración del usuario

### ¿Puedo saltarme el Release Please PR?

No se recomienda. El PR te permite revisar el CHANGELOG y la versión antes del release. Si necesitas un release inmediato, puedes aprobar y mergear el PR rápidamente.

### ¿Cómo hago un hotfix?

```bash
# 1. Hacer commit de fix
git commit -m "fix: critical security vulnerability"
git push origin main

# 2. Esperar el PR de Release Please
# 3. Mergear inmediatamente
# 4. El release se crea automáticamente
```
