# Books API - Guía de Docker

## Entorno de Desarrollo

### Servicios incluidos

- **API**: Aplicación Hono con Bun y hot-reload
- **PostgreSQL**: Base de datos (puerto 5432)
- **Redis**: Caché y sesiones (puerto 6379)
- **Adminer**: Administrador web de base de datos (puerto 8080)
- **Redis Commander**: UI para Redis (puerto 8081)

### Comandos rápidos

```bash
# Iniciar todos los servicios en desarrollo
bun run docker:dev

# Iniciar y reconstruir las imágenes
bun run docker:dev:build

# Ver logs de la API
bun run docker:logs

# Detener todos los servicios
bun run docker:down

# Detener y eliminar volúmenes (datos)
bun run docker:down:volumes
```

### Acceso a los servicios

- **API**: http://localhost:3000
- **Adminer**: http://localhost:8080
  - Sistema: PostgreSQL
  - Servidor: postgres
  - Usuario: postgres
  - Contraseña: postgres
  - Base de datos: booksdb
- **Redis Commander**: http://localhost:8081

### Configuración

1. Copia el archivo de ejemplo de variables de entorno:
```bash
cp .env.example .env
```

2. Modifica las variables según tus necesidades.

### Estructura de la base de datos

El script [init-db/01-init.sql](init-db/01-init.sql) crea automáticamente:
- Tabla `books` con datos de ejemplo
- Tabla `categories`
- Tabla de relación `book_categories`
- Índices optimizados
- Triggers para actualización automática de timestamps

## Producción

### Opción 1: GitHub Container Registry (Recomendado)

Las imágenes se construyen automáticamente con GitHub Actions y se publican en GHCR.

```bash
# Pull de la última versión
docker pull ghcr.io/OWNER/books-api:latest

# Pull de una versión específica
docker pull ghcr.io/OWNER/books-api:1.0.0

# Ejecutar desde GHCR
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e REDIS_URL=redis://host:6379 \
  ghcr.io/OWNER/books-api:latest
```

**Nota:** Reemplaza `OWNER` con tu nombre de usuario de GitHub.

Ver [.github/workflows/README.md](.github/workflows/README.md) para más detalles sobre CI/CD.

### Opción 2: Build local

```bash
# Construir imagen de producción
bun run docker:prod:build

# O usando docker directamente
docker build -t books-api:latest .

# Ejecutar contenedor de producción
bun run docker:prod:run

# Con variables de entorno personalizadas
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e REDIS_URL=redis://host:6379 \
  books-api:latest
```

### Características de producción

- ✅ Multi-stage build (imagen optimizada)
- ✅ Usuario no-root para seguridad
- ✅ Health check configurado
- ✅ Solo dependencias de producción
- ✅ Imagen base Alpine (ligera)
- ✅ CI/CD con GitHub Actions
- ✅ Multi-plataforma (amd64, arm64)

## Comandos útiles de Docker

```bash
# Ver contenedores en ejecución
docker ps

# Ver logs de un servicio específico
docker-compose logs -f postgres

# Acceder a la shell de un contenedor
docker-compose exec api sh
docker-compose exec postgres psql -U postgres -d booksdb

# Reconstruir un servicio específico
docker-compose up -d --build api

# Ver uso de recursos
docker stats

# Limpiar recursos no utilizados
docker system prune -a
```

## Troubleshooting

### El puerto ya está en uso
```bash
# Cambiar el puerto en docker-compose.yml
ports:
  - "3001:3000"  # Usar 3001 en lugar de 3000
```

### Problemas con volúmenes de node_modules
```bash
# Reconstruir sin caché
docker-compose build --no-cache

# Eliminar volúmenes y reconstruir
docker-compose down -v
docker-compose up --build
```

### La base de datos no inicializa
```bash
# Eliminar el volumen de postgres
docker-compose down -v
docker volume rm books-api_postgres_data
docker-compose up
```

## Conexión desde el host

Para conectarte a los servicios desde tu máquina local:

```typescript
// PostgreSQL
const DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/booksdb'

// Redis
const REDIS_URL = 'redis://localhost:6379'
```

## Docker Compose Override

Para configuraciones locales sin modificar el archivo principal, crea un `docker-compose.override.yml`:

```yaml
version: '3.8'

services:
  api:
    environment:
      - DEBUG=true
    ports:
      - "3001:3000"
```
