# Git Hooks (Husky)

Esta carpeta contiene los Git hooks configurados con Husky para validar commits automáticamente.

## Hooks Configurados

### commit-msg

Valida que los mensajes de commit sigan el formato de Conventional Commits.

**Qué valida:**
- ✅ El tipo es válido (`feat`, `fix`, `docs`, etc.)
- ✅ El tipo está en minúsculas
- ✅ El subject no está vacío
- ✅ El header no excede 100 caracteres
- ✅ Hay líneas en blanco entre secciones

**Ejemplo de error:**
```bash
$ git commit -m "Added feature"
⧗   input: Added feature
✖   type may not be empty [type-empty]
✖   subject may not be empty [subject-empty]

✖   found 2 problems, 0 warnings
```

**Solución:**
```bash
$ git commit -m "feat: add new feature"
```

### pre-commit

Ejecuta validaciones antes de crear el commit.

**Actualmente:**
- Solo muestra un mensaje de confirmación

**Puedes agregar:**
- Linting: `bun run lint`
- Tests: `bun test`
- Formateo: `bun run format`

## Desactivar temporalmente

Si necesitas saltarte la validación (no recomendado):

```bash
git commit -m "mensaje" --no-verify
```

⚠️ **Advertencia:** Esto puede romper el sistema de releases automáticos.

## Reinstalar hooks

Si los hooks no funcionan:

```bash
bunx husky install
```

## Más información

- [Husky Documentation](https://typicode.github.io/husky/)
- [Commitlint](https://commitlint.js.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
