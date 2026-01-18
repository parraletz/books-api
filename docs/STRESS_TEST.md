# CPU Stress Test Endpoint

Este endpoint permite simular carga de CPU para demostrar el autoescalado de Kubernetes (HPA/KEDA).

## Endpoint

### `GET /stress`

Genera carga de CPU durante un tiempo determinado.

#### Parámetros (Query String)

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `duration` | number | `5000` | Duración en milisegundos (máx: 30000) |
| `intensity` | string | `medium` | Intensidad: `low`, `medium`, `high` |

#### Ejemplos de Uso

```bash
# Carga por defecto (5 segundos, intensidad media)
curl http://localhost:3000/stress

# 10 segundos con intensidad baja
curl "http://localhost:3000/stress?duration=10000&intensity=low"

# 15 segundos con intensidad alta
curl "http://localhost:3000/stress?duration=15000&intensity=high"

# Máxima duración (30 segundos) con intensidad alta
curl "http://localhost:3000/stress?duration=30000&intensity=high"
```

#### Respuesta de Ejemplo

```json
{
  "message": "CPU stress test completed",
  "params": {
    "requestedDuration": "5000ms",
    "actualDuration": "5001ms",
    "intensity": "medium",
    "maxAllowedDuration": "30000ms"
  },
  "result": {
    "operationsPerformed": 1342500000,
    "operationsPerSecond": 268450000
  },
  "usage": {
    "examples": [
      "GET /stress (default: 5s, medium intensity)",
      "GET /stress?duration=10000 (10 seconds, medium)",
      "GET /stress?intensity=high (5 seconds, high)",
      "GET /stress?duration=15000&intensity=low (15 seconds, low)"
    ]
  },
  "tip": "Use tools like 'kubectl top pods' or monitoring dashboards to observe CPU usage and autoscaling"
}
```

## Testing Autoscaling

### Uso Local

```bash
# Iniciar el servidor
bun run dev

# En otra terminal, ejecutar el script de carga
./scripts/stress-test.sh http://localhost:3000 10000 high 5
```

### Uso en Kubernetes

#### 1. Verificar HPA está configurado

```bash
kubectl get hpa
```

Deberías ver algo como:

```
NAME        REFERENCE              TARGETS   MINPODS   MAXPODS   REPLICAS
books-api   Deployment/books-api   50%/80%   2         10        2
```

#### 2. Generar carga

```bash
# Obtener la URL del servicio (ajusta según tu configuración)
export API_URL="http://books-api.default.svc.cluster.local:3000"

# O si usas port-forward
kubectl port-forward svc/books-api 3000:3000 &
export API_URL="http://localhost:3000"

# Ejecutar el script de carga
./scripts/stress-test.sh $API_URL 15000 high 20
```

#### 3. Monitorear el autoescalado

En terminales separadas, ejecuta:

```bash
# Terminal 1: Ver uso de CPU en tiempo real
watch kubectl top pods

# Terminal 2: Ver estado del HPA
watch kubectl get hpa

# Terminal 3: Ver pods escalando
kubectl get pods -w

# Terminal 4: Ver eventos del HPA
kubectl describe hpa books-api
```

### Parámetros del Script

```bash
./scripts/stress-test.sh [URL] [DURATION] [INTENSITY] [CONCURRENT_REQUESTS]
```

| Parámetro | Default | Descripción |
|-----------|---------|-------------|
| URL | `http://localhost:3000` | URL base de la API |
| DURATION | `10000` | Duración de cada request en ms |
| INTENSITY | `high` | Intensidad: `low`, `medium`, `high` |
| CONCURRENT_REQUESTS | `10` | Número de requests simultáneos |

### Ejemplos de Escenarios

#### Escenario 1: Carga Ligera (no debería escalar)
```bash
./scripts/stress-test.sh http://localhost:3000 5000 low 2
```

#### Escenario 2: Carga Media (escalado gradual)
```bash
./scripts/stress-test.sh http://localhost:3000 10000 medium 5
```

#### Escenario 3: Carga Alta (escalado agresivo)
```bash
./scripts/stress-test.sh http://localhost:3000 15000 high 20
```

#### Escenario 4: Carga Extrema (escalar al máximo)
```bash
./scripts/stress-test.sh http://localhost:3000 30000 high 50
```

## Cómo Funciona

El endpoint `/stress` genera carga de CPU ejecutando operaciones matemáticas intensivas:

- **Low intensity:** 100,000 operaciones por ciclo
- **Medium intensity:** 1,000,000 operaciones por ciclo  
- **High intensity:** 10,000,000 operaciones por ciclo

Cada operación incluye:
- Cálculos de raíz cuadrada con números aleatorios
- Cálculos trigonométricos (seno y coseno)
- Operaciones con Math.PI

## Métricas de HPA

El HPA (Horizontal Pod Autoscaler) monitorea:

- **CPU utilization:** Porcentaje de CPU usado vs solicitado
- **Target:** 80% (configurable en `helm/books-api/values.yaml`)
- **Scale up:** Cuando el promedio supera el 80% durante ~3 minutos
- **Scale down:** Cuando el promedio baja del 80% durante ~5 minutos

## Tips para Demostración

1. **Empezar con baseline:** Muestra el estado inicial con 2 pods
2. **Generar carga gradual:** Aumenta la concurrencia poco a poco
3. **Mostrar métricas:** Usa `kubectl top pods` y `kubectl get hpa`
4. **Observar escalado:** Espera 2-3 minutos para ver nuevos pods
5. **Detener carga:** Presiona Ctrl+C y observa el scale-down (toma 5+ minutos)

## Troubleshooting

### El HPA no escala

```bash
# Verificar que metrics-server está instalado
kubectl get deployment metrics-server -n kube-system

# Verificar que el HPA recibe métricas
kubectl get hpa books-api -o yaml

# Verificar los límites de recursos del pod
kubectl describe pod <pod-name>
```

### No hay métricas disponibles

```bash
# Instalar metrics-server si no existe
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verificar que funciona
kubectl top nodes
kubectl top pods
```

## Referencias

- [Kubernetes HPA](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [KEDA Documentation](https://keda.sh/)
- Ver `helm/books-api/templates/hpa.yaml` para la configuración del HPA
