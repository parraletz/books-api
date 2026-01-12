# Configuración de Release Please

## Error: GitHub Actions no puede crear Pull Requests

Si ves este error:
```
release-please failed: GitHub Actions is not permitted to create or approve pull requests.
```

Necesitas habilitar permisos en tu repositorio.

## Solución 1: Habilitar permisos de GitHub Actions (Recomendado)

### Pasos:

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (Configuración)
3. En el menú lateral izquierdo, navega a:
   - **Actions** → **General**
4. Scroll hasta la sección **"Workflow permissions"**
5. Selecciona la opción:
   - ✅ **"Read and write permissions"**
6. Marca el checkbox:
   - ✅ **"Allow GitHub Actions to create and approve pull requests"**
7. Click en **Save** (Guardar)

### Screenshots de referencia:

La configuración debería verse así:

```
Workflow permissions
  ○ Read repository contents and packages permissions
  ● Read and write permissions

  ☑ Allow GitHub Actions to create and approve pull requests
```

## Solución 2: Usar un Personal Access Token (Alternativa)

Si no puedes cambiar la configuración del repositorio, puedes usar un PAT:

### Crear un Personal Access Token:

1. Ve a GitHub → Settings (tu perfil) → Developer settings
2. Click en "Personal access tokens" → "Tokens (classic)"
3. Click en "Generate new token (classic)"
4. Dale un nombre: `release-please-token`
5. Selecciona los siguientes scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
6. Click en "Generate token"
7. **Copia el token** (solo se muestra una vez)

### Agregar el token como Secret:

1. Ve a tu repositorio → Settings → Secrets and variables → Actions
2. Click en "New repository secret"
3. Name: `RELEASE_PLEASE_TOKEN`
4. Value: Pega el token que copiaste
5. Click en "Add secret"

### Actualizar el workflow:

Edita `.github/workflows/auto-release.yml` y cambia:

```yaml
- name: Create Release
  id: release
  uses: googleapis/release-please-action@v4
  with:
    release-type: node
    token: ${{ secrets.RELEASE_PLEASE_TOKEN }}  # ← Agregar esta línea
```

## Verificar que funciona

Después de aplicar cualquiera de las soluciones:

1. Haz un commit con formato correcto:
   ```bash
   git commit -m "feat: configure release please"
   git push origin main
   ```

2. Ve a la pestaña "Actions" en GitHub
3. Deberías ver el workflow "Auto Release" ejecutándose
4. Si todo está bien, creará un PR con título: "chore(main): release X.Y.Z"

## Troubleshooting

### El PR no se crea

**Posibles causas:**
1. No hay commits con formato conventional desde el último release
2. Solo hay commits de tipo `docs`, `chore`, `style` (que no generan release)
3. Los permisos aún no están configurados correctamente

**Solución:** Haz un commit de tipo `feat` o `fix`:
```bash
git commit -m "feat: initial release setup"
git push origin main
```

### Error de permisos persiste

Si el error persiste después de habilitar los permisos:

1. Verifica que guardaste los cambios en Settings
2. Espera unos minutos (puede tardar en propagarse)
3. Intenta hacer push nuevamente
4. Si sigue sin funcionar, usa la Solución 2 (PAT)

### El workflow se ejecuta pero no pasa nada

Release Please solo crea PRs cuando hay commits que generen un release:
- ✅ `feat:` → Genera release MINOR
- ✅ `fix:` → Genera release PATCH
- ✅ `feat!:` → Genera release MAJOR
- ❌ `docs:`, `chore:`, `style:` → No generan release

## Recursos

- [GitHub Actions Permissions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#configuring-the-default-github_token-permissions)
- [Release Please Documentation](https://github.com/googleapis/release-please)
- [Creating a Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)

## Próximos pasos

Una vez configurado correctamente:

1. ✅ Release Please creará PRs automáticamente
2. ✅ Los PRs contendrán el CHANGELOG actualizado
3. ✅ Al mergear el PR, se creará el release automáticamente
4. ✅ Las imágenes Docker se publicarán en GHCR

Lee [RELEASES.md](../RELEASES.md) para entender cómo funciona el sistema completo.

## Notas importantes

### Husky en producción

El proyecto está configurado para que Husky **NO** se ejecute en producción (Docker builds).

El script `prepare` en package.json:
```json
"prepare": "[ -d .git ] && husky install || true"
```

Esto significa:
- ✅ En desarrollo (con .git): Instala Husky
- ✅ En producción (sin .git): Se salta silenciosamente
- ✅ Los builds de Docker funcionan correctamente

### Primera vez configurando

Si es la primera vez que usas Release Please en este repo:

1. Haz un commit inicial con conventional commits:
   ```bash
   git commit -m "feat: initial release setup"
   ```
2. Push a main y el workflow creará un PR para la versión 1.0.0
3. Revisa y mergea el PR
4. ¡Tu primer release está listo!
