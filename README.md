# Books API

API de libros construida con [Hono](https://hono.dev/) y [Bun](https://bun.sh/).

## 🚀 Inicio Rápido

### Instalación

```sh
bun install
```

### Desarrollo

```sh
bun run dev
```

Abre http://localhost:3000

### Docker

```sh
# Desarrollo con servicios completos (PostgreSQL, Redis, etc.)
bun run docker:dev

# Producción
docker pull ghcr.io/parraletz/books-api:latest
docker run -p 3000:3000 ghcr.io/parraletz/books-api:latest
```

## 📦 Releases Automáticos

Este proyecto usa **Conventional Commits** para generar releases automáticamente.

**✅ Husky configurado:** Los commits se validan automáticamente antes de aceptarlos.

### Cómo contribuir

```bash
# Nueva funcionalidad
git commit -m "feat: add book search endpoint"

# Corrección de bug
git commit -m "fix: resolve authentication error"

# Breaking change
git commit -m "feat!: redesign API endpoints"
```

**Validación automática:** Si el formato es incorrecto, el commit será rechazado con un mensaje de error claro.

Al hacer push a `main`, Release Please creará automáticamente un PR con:
- Nueva versión calculada
- CHANGELOG actualizado
- Release notes

**📚 Lee más:**
- [RELEASES.md](RELEASES.md) - Sistema de releases automáticos
- [CONTRIBUTING.md](CONTRIBUTING.md) - Guía completa de contribución
- [.github/COMMIT_CONVENTION.md](.github/COMMIT_CONVENTION.md) - Referencia rápida

## 🐳 Docker & CI/CD

- **Desarrollo:** [docker-compose.yml](docker-compose.yml) con PostgreSQL, Redis, Adminer
- **Producción:** [Dockerfile](Dockerfile) multi-stage optimizado
- **CI/CD:** GitHub Actions con releases automáticos
- **Registry:** GitHub Container Registry (GHCR)

**📚 Documentación:**
- [README.Docker.md](README.Docker.md) - Guía de Docker
- [DEPLOYMENT.md](DEPLOYMENT.md) - Guía de despliegue
- [.github/workflows/README.md](.github/workflows/README.md) - Workflows CI/CD

## 🧪 Testing Kubernetes Autoscaling

Este proyecto incluye un endpoint `/stress` para demostrar el autoescalado de Kubernetes:

```bash
# Generar carga de CPU (5 segundos, intensidad media)
curl http://localhost:3000/stress

# Carga personalizada (15 segundos, alta intensidad)
curl "http://localhost:3000/stress?duration=15000&intensity=high"

# Script automatizado para testing continuo
./scripts/stress-test.sh http://localhost:3000 10000 high 10
```

**Monitorear el autoescalado:**
```bash
kubectl top pods              # Ver uso de CPU/memoria
kubectl get hpa              # Ver estado del HPA
kubectl get pods -w          # Ver pods en tiempo real
```

**📚 Documentación completa:** [docs/STRESS_TEST.md](docs/STRESS_TEST.md)

## 🛠️ Scripts Disponibles

```bash
# Desarrollo
bun run dev                    # Inicia servidor con hot-reload

# Docker - Desarrollo
bun run docker:dev             # Inicia stack completo
bun run docker:dev:build       # Rebuild e inicia
bun run docker:down            # Detiene servicios
bun run docker:logs            # Ver logs de la API

# Docker - Producción
bun run docker:prod:build      # Build imagen de producción
bun run docker:prod:run        # Ejecuta imagen de producción

# Testing
./scripts/stress-test.sh       # Test de carga para autoescalado
```

## 📂 Estructura del Proyecto

```
books-api/
├── src/
│   └── index.ts              # Punto de entrada
├── .github/
│   ├── workflows/            # GitHub Actions
│   │   ├── auto-release.yml  # Releases automáticos
│   │   ├── ci.yml            # Tests y validación
│   │   └── docker-build.yml  # Build de imágenes
│   └── COMMIT_CONVENTION.md  # Referencia rápida
├── init-db/                  # Scripts de inicialización de DB
├── Dockerfile                # Imagen de producción
├── Dockerfile.dev            # Imagen de desarrollo
├── docker-compose.yml        # Stack de desarrollo
└── release-please-config.json # Configuración de releases
```

## 📊 Observabilidad (OpenTelemetry)

Este proyecto incluye soporte completo para **OpenTelemetry** con trazas y métricas.

### Configuración

| Variable de Entorno | Descripción | Default |
|---------------------|-------------|---------|
| `OTEL_ENABLED` | Habilita OpenTelemetry | `false` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Endpoint del collector OTLP | `http://localhost:4318` |
| `OTEL_SERVICE_NAME` | Nombre del servicio | `books-api` |
| `OTEL_SERVICE_VERSION` | Versión del servicio | `1.0.0` |
| `OTEL_DEBUG` | Habilita logs de debug | `false` |

### Características

- **Trazas:** Exportación via OTLP HTTP (`/v1/traces`)
- **Métricas:** Exportación via OTLP HTTP (`/v1/metrics`) cada 10 segundos
- **Batch Processing:** Las trazas se envían en lotes para mejor rendimiento
- **Graceful Shutdown:** Limpieza automática al recibir SIGTERM

### Ejemplo de uso

```bash
# Habilitar OpenTelemetry con Jaeger/Grafana Tempo
OTEL_ENABLED=true \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
OTEL_SERVICE_NAME=books-api \
bun run dev
```

### Uso en código

```typescript
import { getTracer, getMeter } from "./metrics/otel"

// Crear un span personalizado
const tracer = getTracer()
const span = tracer.startSpan("my-operation")
// ... tu código
span.end()

// Crear métricas personalizadas
const meter = getMeter()
const counter = meter.createCounter("my_counter")
counter.add(1)
```

## 🔧 Tecnologías

- **Runtime:** Bun
- **Framework:** Hono
- **Base de datos:** PostgreSQL
- **Caché:** Redis
- **Containerización:** Docker
- **CI/CD:** GitHub Actions
- **Registry:** GitHub Container Registry
- **Observabilidad:** OpenTelemetry (OTLP)

## 📖 Documentación

| Archivo | Descripción |
|---------|-------------|
| [RELEASES.md](RELEASES.md) | Sistema de releases automáticos |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Guía de contribución completa |
| [README.Docker.md](README.Docker.md) | Guía de Docker |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Guía de despliegue |
| [docs/STRESS_TEST.md](docs/STRESS_TEST.md) | Testing de autoescalado |
| [CHANGELOG.md](CHANGELOG.md) | Historial de cambios |

## 📄 Licencia

MIT
