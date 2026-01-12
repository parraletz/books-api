# GitHub Actions Workflows

Este directorio contiene los workflows de CI/CD para la Books API.

## Workflows disponibles

### 1. CI - Test and Build ([ci.yml](ci.yml))

**Se ejecuta en:**
- Push a `main` o `develop`
- Pull requests a `main` o `develop`

**Funciones:**
- Ejecuta tests con Bun
- Ejecuta linter (si está configurado)
- Prueba la construcción de la imagen Docker
- Verifica que la aplicación se inicie correctamente

### 2. Build and Push Docker Image ([docker-build.yml](docker-build.yml))

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

### 3. Release ([release.yml](release.yml))

**Se ejecuta en:**
- Push de tags con formato `v*.*.*`

**Funciones:**
- Crea un release en GitHub con changelog automático
- Construye y publica imagen Docker con tags de versión
- Etiqueta la imagen como `latest`

## Configuración inicial

### 1. Habilitar GitHub Container Registry

Las imágenes se publican automáticamente en `ghcr.io`. No necesitas configuración adicional, pero asegúrate de que:

1. El repositorio tenga permisos de escritura para packages
2. Las GitHub Actions tengan permisos para escribir en GHCR (ya configurado en los workflows)

### 2. Hacer el paquete público (opcional)

Por defecto, las imágenes son privadas. Para hacerlas públicas:

1. Ve a tu perfil/organización en GitHub
2. Click en "Packages"
3. Selecciona el paquete `books-api`
4. Ve a "Package settings"
5. Scroll hasta "Danger Zone"
6. Click en "Change visibility" → "Public"

## Uso

### Desarrollo normal

Cada push a `main` o `develop` ejecutará:
1. ✅ Tests y linting
2. ✅ Build de Docker
3. 🚀 Push de imagen a GHCR con tag de la rama

### Crear un release

```bash
# 1. Asegúrate de estar en main
git checkout main
git pull

# 2. Crea un tag de versión
git tag v1.0.0

# 3. Push del tag
git push origin v1.0.0
```

Esto activará automáticamente:
1. ✅ Creación del release en GitHub
2. ✅ Generación del changelog
3. 🚀 Build y push de imagen con tags:
   - `ghcr.io/OWNER/books-api:1.0.0`
   - `ghcr.io/OWNER/books-api:1.0`
   - `ghcr.io/OWNER/books-api:1`
   - `ghcr.io/OWNER/books-api:latest`

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

### Error: "Permission denied to write to packages"

Solución: Verifica que el workflow tenga permisos:
```yaml
permissions:
  contents: read
  packages: write
```

### Error: "Image not found"

Verifica que:
1. El workflow se haya ejecutado exitosamente
2. El nombre de la imagen sea correcto (incluye el owner)
3. Tengas permisos para acceder a imágenes privadas

### Ver logs de los workflows

1. Ve a la pestaña "Actions"
2. Click en el workflow específico
3. Click en el job para ver logs detallados

## Recursos adicionales

- [GitHub Container Registry Docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
