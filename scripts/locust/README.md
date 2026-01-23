# Locust Load Testing para Books API

Contenedor de pruebas de carga usando [Locust](https://locust.io/) para la Books API.

## Inicio Rápido

### Opción 1: Docker (Recomendado)

```bash
# Construir la imagen
docker build -t books-api-locust:latest ./scripts/locust

# Ejecutar con Web UI (http://localhost:8089)
docker run -p 8089:8089 books-api-locust:latest \
  --host=https://books-api.staging.cloudnative.lat

# Ejecutar contra localhost (desarrollo)
docker run -p 8089:8089 --add-host=host.docker.internal:host-gateway \
  books-api-locust:latest --host=http://host.docker.internal:3000
```

### Opción 2: Docker Compose

```bash
# Modo single node contra localhost
docker compose -f scripts/locust/docker-compose.yml up

# Contra staging
LOCUST_HOST=https://books-api.staging.cloudnative.lat \
  docker compose -f scripts/locust/docker-compose.yml up

# Modo distribuido (1 master + 4 workers)
docker compose -f scripts/locust/docker-compose.yml --profile distributed up
```

### Opción 3: Python Local

```bash
# Instalar locust
pip install locust

# Ejecutar con Web UI
locust -f scripts/locust/locustfile.py --host=http://localhost:3000

# Ejecutar headless
locust -f scripts/locust/locustfile.py --host=http://localhost:3000 \
  --headless -u 100 -r 10 -t 5m
```

## Modos de Ejecución

### Web UI (Interactivo)

Abre http://localhost:8089 después de iniciar Locust:

```bash
docker run -p 8089:8089 books-api-locust:latest \
  --host=https://books-api.staging.cloudnative.lat
```

En la interfaz web puedes:
- Configurar número de usuarios y spawn rate
- Iniciar/detener pruebas
- Ver gráficos en tiempo real
- Descargar reportes CSV

### Headless (CI/CD)

Para pipelines de CI/CD o pruebas automatizadas:

```bash
docker run books-api-locust:latest \
  --host=https://books-api.staging.cloudnative.lat \
  --headless \
  -u 100 \      # 100 usuarios concurrentes
  -r 10 \       # 10 usuarios por segundo
  -t 5m         # Duración: 5 minutos
```

### Por Tags (Pruebas Específicas)

Ejecutar solo ciertos tipos de pruebas:

```bash
# Solo smoke tests
docker run -p 8089:8089 books-api-locust:latest \
  --host=https://books-api.staging.cloudnative.lat \
  --tags smoke

# Solo operaciones de lectura
docker run -p 8089:8089 books-api-locust:latest \
  --host=https://books-api.staging.cloudnative.lat \
  --tags read

# Solo pruebas de stress (para disparar alertas)
docker run -p 8089:8089 books-api-locust:latest \
  --host=https://books-api.staging.cloudnative.lat \
  --tags stress
```

## Tags Disponibles

| Tag | Descripción |
|-----|-------------|
| `smoke` | Pruebas rápidas de validación |
| `health` | Health checks |
| `books` | Todas las operaciones de libros |
| `read` | Operaciones de lectura |
| `write` | Operaciones de escritura |
| `trace` | Generación de trazas OpenTelemetry |
| `metrics` | Endpoint de métricas Prometheus |
| `observability` | trace + metrics |
| `stress` | Pruebas de estrés CPU |
| `cpu` | Alias para stress |
| `alert-trigger` | Pruebas que pueden disparar alertas |

## Usuarios Simulados

El locustfile define 4 tipos de usuarios con diferentes comportamientos:

### BooksAPIUser (Peso: Default)
Usuario típico que realiza operaciones CRUD:
- `GET /health` - Health check
- `GET /books` - Listar libros (más frecuente)
- `GET /` - Info de la API
- `GET /books/hi` - Endpoint de saludo
- `POST /books/new` - Crear libro
- `GET /metrics` - Métricas Prometheus

### TraceTestUser (Peso: Bajo)
Usuario enfocado en generar trazas:
- `GET /trace` - Traza por defecto
- `GET /trace?operation=X` - Traza con operación personalizada
- `GET /trace?steps=N` - Traza con múltiples pasos

### StressTestUser (Peso: Bajo)
Usuario para pruebas de estrés:
- `GET /stress?intensity=low` - Carga baja
- `GET /stress?intensity=medium` - Carga media
- `GET /stress?intensity=high` - Carga alta (puede disparar alertas)

### SmokeTestUser (Peso: Bajo)
Usuario para validación rápida de endpoints críticos.

## Ejemplos de Uso

### Prueba de Carga Básica

```bash
# 50 usuarios, 5 usuarios/segundo, 2 minutos
docker run books-api-locust:latest \
  --host=https://books-api.staging.cloudnative.lat \
  --headless -u 50 -r 5 -t 2m
```

### Prueba de Estrés para Alertas

```bash
# Ejecutar solo stress tests para disparar alertas de CPU
docker run books-api-locust:latest \
  --host=https://books-api.staging.cloudnative.lat \
  --headless -u 20 -r 5 -t 10m \
  --tags stress
```

### Smoke Test Rápido

```bash
# Validación rápida de todos los endpoints
docker run books-api-locust:latest \
  --host=https://books-api.staging.cloudnative.lat \
  --headless -u 5 -r 1 -t 30s \
  --tags smoke
```

### Prueba de Trazas

```bash
# Generar muchas trazas para probar OpenTelemetry
docker run books-api-locust:latest \
  --host=https://books-api.staging.cloudnative.lat \
  --headless -u 10 -r 2 -t 5m \
  --tags trace
```

## Parámetros de Línea de Comandos

| Parámetro | Descripción |
|-----------|-------------|
| `--host` | URL base del servicio a probar |
| `--headless` | Ejecutar sin Web UI |
| `-u, --users` | Número de usuarios concurrentes |
| `-r, --spawn-rate` | Usuarios creados por segundo |
| `-t, --run-time` | Duración (ej: 30s, 5m, 1h) |
| `--tags` | Ejecutar solo tests con estos tags |
| `--exclude-tags` | Excluir tests con estos tags |
| `--csv` | Prefijo para archivos CSV de resultados |
| `--html` | Archivo HTML para el reporte |

## Estructura de Archivos

```
scripts/locust/
├── Dockerfile          # Imagen del contenedor
├── docker-compose.yml  # Compose para desarrollo local
├── locustfile.py       # Definición de pruebas
├── requirements.txt    # Dependencias adicionales
└── README.md           # Esta documentación
```

## Interpretación de Resultados

### Métricas Clave

- **RPS (Requests Per Second)**: Throughput del servicio
- **Response Time (ms)**: Latencia de respuesta
  - Median: 50% de requests por debajo
  - 95%ile: 95% de requests por debajo
- **Failures**: Porcentaje de requests fallidos

### Criterios de Éxito Sugeridos

| Métrica | Objetivo |
|---------|----------|
| Error Rate | < 1% |
| P95 Latency | < 500ms |
| P99 Latency | < 1000ms |
| RPS | Según SLA |

## Troubleshooting

### Error: Connection refused

```bash
# Asegúrate de que la API está corriendo
curl http://localhost:3000/health

# Si usas Docker, necesitas host.docker.internal
docker run --add-host=host.docker.internal:host-gateway \
  books-api-locust:latest --host=http://host.docker.internal:3000
```

### Timeout en stress tests

Los stress tests pueden tardar hasta 30 segundos. Aumenta el timeout:

```bash
# El locustfile ya tiene timeouts configurados
# Si aún falla, verifica que el pod no está siendo terminado por OOM
```

### Web UI no responde

```bash
# Verifica que el puerto está mapeado
docker ps
# Asegúrate de usar -p 8089:8089
```
