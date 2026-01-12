# Convención de Commits

## Formato Rápido

```
<tipo>(<scope>): <descripción corta>

[cuerpo opcional]

[footer opcional]
```

## Ejemplos Rápidos

```bash
# ✅ Correcto
feat: add user authentication
fix: resolve memory leak in Docker
docs: update installation guide
perf: optimize database queries
feat!: redesign API endpoints

# ❌ Incorrecto
Add feature
fixed bug
Update docs
```

## Tipos

- `feat`: Nueva funcionalidad → **MINOR** version (1.0.0 → 1.1.0)
- `fix`: Corrección de bug → **PATCH** version (1.0.0 → 1.0.1)
- `perf`: Mejora de rendimiento → **PATCH** version
- `docs`: Documentación → No release
- `style`: Formato de código → No release
- `refactor`: Refactorización → No release
- `test`: Tests → No release
- `chore`: Mantenimiento → No release
- `ci`: CI/CD → No release
- `build`: Sistema de build → No release

## Breaking Changes

Añade `!` después del tipo o `BREAKING CHANGE:` en el footer:

```bash
feat!: change API response format
# o
feat: change API response format

BREAKING CHANGE: Response format changed from XML to JSON
```

Esto incrementa la versión **MAJOR** (1.0.0 → 2.0.0)

## Scopes (Opcional)

```bash
feat(api): add new endpoint
fix(auth): resolve token expiration
docs(readme): add examples
```

## Cheat Sheet

| Quiero... | Comando |
|-----------|---------|
| Añadir nueva funcionalidad | `git commit -m "feat: descripción"` |
| Corregir un bug | `git commit -m "fix: descripción"` |
| Mejorar rendimiento | `git commit -m "perf: descripción"` |
| Actualizar documentación | `git commit -m "docs: descripción"` |
| Hacer breaking change | `git commit -m "feat!: descripción"` |
| Refactorizar código | `git commit -m "refactor: descripción"` |
| Actualizar tests | `git commit -m "test: descripción"` |
| Actualizar dependencias | `git commit -m "chore: update dependencies"` |

## Ver más

Lee [CONTRIBUTING.md](../CONTRIBUTING.md) para la guía completa.
