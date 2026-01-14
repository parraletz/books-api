# GitHub Actions Workflows

Este directorio contiene los workflows de CI/CD para la Books API.

## Workflows disponibles

### 1. Auto Release ([auto-release.yml](auto-release.yml)) ⭐ PRINCIPAL

**Se ejecuta en:**
- Push a `main`

**Funciones:**
- Analiza commits usando Conventional Commits
- Calcula automáticamente la siguiente versión (semver)
- Crea/actualiza PR con CHANGELOG y nueva versión
- Cuando se mergea el PR:
  - Crea GitHub Release con notas automáticas
  - Publica imágenes Docker con tags de versión
  - Genera attestation de provenance
  - **🚀 Actualiza automáticamente GitOps** (`gitops-cf/books/api/values-staging.yaml`)

**Jobs:**
1. `release` - Release Please gestiona versionado
2. `build-and-push` - Build y push de imagen Docker (solo si hay release)
3. `update-gitops` - Actualiza repositorio GitOps con nuevo tag

**⚠️ Requiere Secret:**
- `GITOPS_PAT`: Personal Access Token con permisos de escritura en `gitops-cf`

**Importante:** Este es el método **recomendado** y **automático** para crear releases. Lee [CONTRIBUTING.md](../../CONTRIBUTING.md) para aprender sobre Conventional Commits.

### 2. CI - Test and Build ([ci.yml](ci.yml))

**Se ejecuta en:**
- Push a `main` o `develop`
- Pull requests a `main` o `develop`

**Funciones:**
- Ejecuta tests con Bun
- Ejecuta linter (si está configurado)
- Prueba la construcción de la imagen Docker
- Verifica que la aplicación se inicie correctamente

### 3. Build and Push Docker Image ([docker-build.yml](docker-build.yml))

**Se ejecuta en:**
- Push a `main` o `develop`
- Tags con formato `v*.*.*`
- Pull requests (solo build, no push)
- Manualmente con `workflow_dispatch`

**Funciones:**
- Construye la imagen Docker para producción
- Publica la imagen en GitHub Container Registry (GHCR)
- Genera tags automáticos basados en:
  - Rama (ej: `main`, `develop`)
  - Versión semántica (ej: `v1.0.0`, `1.0`, `1`)
  - SHA del commit (ej: `main-abc1234`)
  - `latest` para la rama principal
- Crea attestation de provenance
- Soporta múltiples plataformas (amd64, arm64)

### 4. Release (Manual Testing) ([release.yml](release.yml))

**⚠️ DEPRECATED**: Este workflow está deprecado. La actualización de GitOps ahora ocurre automáticamente en `auto-release.yml`.

**Se ejecuta en:**
- Solo manual (`workflow_dispatch`)

**Funciones:**
- Testing manual de builds
- Re-build de versiones específicas
- Actualización de GitOps sin crear release (con `skip_build: true`)

**Opciones:**
- `tag`: Tag a procesar (ej: v1.2.0)
- `skip_build`: Saltar Docker build, solo actualizar GitOps (default: false)

**Por qué está deprecado:**
- Auto Release ya maneja todo el flujo automáticamente
- Evita duplicación de builds (antes se hacía build 2 veces por release)
- Solo se mantiene para casos de testing/debugging manual

## Configuración inicial

### 1. Habilitar GitHub Container Registry

Las imágenes se publican **exclusivamente** en GitHub Container Registry (`ghcr.io`). No usamos Docker Hub ni otros registros.

No necesitas configuración adicional, pero asegúrate de que:

1. El repositorio tenga permisos de escritura para packages
2. Las GitHub Actions tengan permisos para escribir en GHCR (ya configurado en los workflows)

**Importante:** Todas las imágenes se almacenan en:
```
ghcr.io/OWNER/books-api:TAG
```

### 2. Hacer el paquete público (opcional)

Por defecto, las imágenes son privadas. Para hacerlas públicas:

1. Ve a tu perfil/organización en GitHub
2. Click en "Packages"
3. Selecciona el paquete `books-api`
4. Ve a "Package settings"
5. Scroll hasta "Danger Zone"
6. Click en "Change visibility" → "Public"

## Uso

### Desarrollo normal con Auto Release (Recomendado)

```bash
# 1. Hacer commits usando Conventional Commits
git commit -m "feat: add user profile endpoint"
git commit -m "fix: resolve authentication bug"
git push origin main

# 2. Release Please analiza los commits y:
# - Abre/actualiza un PR automáticamente
# - Título: "chore(main): release X.Y.Z"
# - Incluye CHANGELOG.md actualizado

# 3. Revisa el PR y verifica:
# - La versión calculada es correcta
# - El CHANGELOG está bien

# 4. Mergea el PR

# 5. Automáticamente se crea:
# ✅ GitHub Release con notas
# ✅ Tag vX.Y.Z
# 🚀 Imágenes Docker:
#    - ghcr.io/OWNER/books-api:X.Y.Z
#    - ghcr.io/OWNER/books-api:latest
```

**Lee [CONTRIBUTING.md](../../CONTRIBUTING.md) para aprender sobre Conventional Commits.**

### Formato de Commits

```bash
# Nueva funcionalidad (incrementa MINOR: 1.0.0 → 1.1.0)
git commit -m "feat: add book search endpoint"

# Corrección de bug (incrementa PATCH: 1.0.0 → 1.0.1)
git commit -m "fix: resolve CORS error"

# Breaking change (incrementa MAJOR: 1.0.0 → 2.0.0)
git commit -m "feat!: redesign authentication API"
```

### Crear un release manual (Método antiguo)

**⚠️ No recomendado.** Usa Auto Release en su lugar.

Si necesitas crear un release manual:

```bash
# 1. Asegúrate de estar en main
git checkout main
git pull

# 2. Crea un tag de versión
git tag v1.0.0

# 3. Push del tag
git push origin v1.0.0
```

Esto activará el workflow `release.yml` (deprecado)

### Ejecutar workflow manualmente

1. Ve a la pestaña "Actions" en GitHub
2. Selecciona "Build and Push Docker Image"
3. Click en "Run workflow"
4. Selecciona la rama
5. Click en "Run workflow"

## Pull de imágenes

### Desde GitHub Container Registry

```bash
# Última versión
docker pull ghcr.io/OWNER/books-api:latest

# Versión específica
docker pull ghcr.io/OWNER/books-api:1.0.0

# Desde una rama
docker pull ghcr.io/OWNER/books-api:main
```

**Nota:** Reemplaza `OWNER` con tu nombre de usuario o nombre de organización de GitHub.

### Para imágenes privadas

```bash
# 1. Crear un Personal Access Token (PAT)
# En GitHub: Settings → Developer settings → Personal access tokens → Tokens (classic)
# Permisos necesarios: read:packages

# 2. Login en GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# 3. Pull de la imagen
docker pull ghcr.io/OWNER/books-api:latest
```

## Variables de entorno en GitHub Actions

Los workflows usan las siguientes variables:

- `GITHUB_TOKEN`: Automático, no requiere configuración
- `REGISTRY`: `ghcr.io` (GitHub Container Registry)
- `IMAGE_NAME`: `${{ github.repository }}` (ej: `owner/books-api`)

### Configurar GITOPS_PAT (Requerido para GitOps)

Para que el workflow de release actualice automáticamente el repo GitOps:

```bash
# 1. Crear PAT en GitHub:
# https://github.com/settings/tokens?type=beta
# - Repository access: Only "parraletz/gitops-cf"
# - Permissions: Contents (Read and write)

# 2. Agregar como secret:
gh secret set GITOPS_PAT --repo parraletz/books-api
# Pega el token cuando te lo pida
```

## Caché de Docker

Los workflows utilizan GitHub Actions Cache para:
- Acelerar builds subsecuentes
- Reducir uso de ancho de banda
- Compartir capas entre builds

## Seguridad

- ✅ Las imágenes incluyen attestation de provenance
- ✅ Build multi-plataforma (amd64, arm64)
- ✅ Usuario no-root en producción
- ✅ Imagen base Alpine (mínima superficie de ataque)
- ✅ Solo dependencias de producción

## Troubleshooting

### El workflow de release no se ejecuta

**Problema:** Mergeaste el PR de Release Please pero no se ejecutó `release.yml`.

**Causa:** El workflow se activa cuando se **publica** un release, no cuando se hace push de tags.

**Solución:**
1. Verifica que Release Please haya creado el release:
   ```bash
   gh release list
   ```
2. Verifica que el release esté "published" (no draft):
   ```bash
   gh release view v1.2.0
   ```
3. Ver si el workflow se ejecutó:
   ```bash
   gh run list --workflow=release.yml --limit 5
   ```

### Error: "Permission denied" en update-gitops

**Problema:** El job `update-gitops` falla con error 403.

**Causa:** Falta el secret `GITOPS_PAT` o no tiene permisos correctos.

**Solución:**
```bash
# Crear nuevo PAT en: https://github.com/settings/tokens?type=beta
# Permisos: Contents (Read and write) para repo gitops-cf

# Agregarlo como secret
gh secret set GITOPS_PAT --repo parraletz/books-api
```

Verifica que el PAT tenga acceso al repo GitOps:
```bash
# Listar secrets (no muestra valores)
gh secret list --repo parraletz/books-api
```

### El tag no se actualiza en GitOps repo

**Problema:** El workflow se ejecuta pero no actualiza `values.yaml`.

**Causa:** El path o formato del values.yaml es incorrecto.

**Solución:**
```bash
# Verificar estructura en gitops-cf
cd gitops-cf
ls -la books/api/values.yaml

# Verificar formato (debe tener):
cat books/api/values.yaml
# image:
#   tag: "1.0.0"
```

### Error: "Permission denied to write to packages"

Solución: Verifica que el workflow tenga permisos:
```yaml
permissions:
  contents: write
  packages: write
```

### Error: "Image not found"

Verifica que:
1. El workflow se haya ejecutado exitosamente
2. El nombre de la imagen sea correcto (incluye el owner)
3. Tengas permisos para acceder a imágenes privadas

### Ver logs de los workflows

```bash
# Listar runs recientes
gh run list --limit 10

# Ver detalles de un run
gh run view <run-id> --log

# Ver solo el workflow de release
gh run list --workflow=release.yml --limit 5
```

## Recursos adicionales

- [GitHub Container Registry Docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
