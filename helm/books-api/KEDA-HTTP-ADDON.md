# KEDA HTTP Add-on Integration

Este chart ahora incluye soporte para el [KEDA HTTP Add-on](https://github.com/kedacore/http-add-on), permitiendo el escalado automático basado en métricas HTTP, incluyendo la capacidad de escalar a cero réplicas.

## Requisitos Previos

1. **KEDA instalado en el cluster:**
   ```bash
   helm repo add kedacore https://kedacore.github.io/charts
   helm repo update
   helm install keda kedacore/keda --namespace keda --create-namespace
   ```

2. **KEDA HTTP Add-on instalado:**
   ```bash
   helm install http-add-on kedacore/keda-add-ons-http --namespace keda
   ```

3. **Istio instalado** (si estás usando el VirtualService de Istio)

## Configuración

### Habilitar HTTP ScaledObject

En tu archivo `values.yaml`:

```yaml
httpScaledObject:
  enabled: true
  replicas:
    min: 0  # Escala a cero cuando no hay tráfico
    max: 10
  scalingMetric:
    type: "requestRate"  # o "concurrency"
    value: "100"  # 100 requests/segundo por réplica
  targetPendingRequests: 100
  cooldownPeriod: 300  # Espera 5 minutos antes de escalar a cero
  interceptor:
    namespace: "keda"
    service: "keda-add-ons-http-interceptor-proxy"
    port: 8080
```

### Tipos de Métricas de Escalado

#### Request Rate (Tasa de Solicitudes)
Escala basándose en el número de solicitudes por segundo:

```yaml
scalingMetric:
  type: "requestRate"
  value: "100"  # Target: 100 requests/sec por réplica
```

#### Concurrency (Concurrencia)
Escala basándose en el número de solicitudes concurrentes:

```yaml
scalingMetric:
  type: "concurrency"
  value: "50"  # Target: 50 solicitudes concurrentes por réplica
```

### Configuración Avanzada

#### Timeouts Personalizados

Si experimentas errores 502 con solicitudes POST, aumenta los timeouts:

```yaml
httpScaledObject:
  enabled: true
  # ... otras configuraciones
  timeouts:
    connect: 30s
    responseHeader: 30s
    expectContinue: 30s
```

#### Timeout de Espera de Escalado

Si ves el error "context marked done while waiting for workload reach > 0 replicas", aumenta el timeout:

```yaml
httpScaledObject:
  enabled: true
  # ... otras configuraciones
  conditionWaitTimeout: 60s  # Default: 20s
```

## Integración con Istio

Cuando `httpScaledObject.enabled: true`, el VirtualService de Istio automáticamente se configura para enrutar el tráfico a través del interceptor de KEDA HTTP Add-on:

```yaml
# Generado automáticamente cuando httpScaledObject.enabled: true
apiVersion: networking.istio.io/v1
kind: VirtualService
spec:
  http:
    - route:
        - destination:
            host: keda-add-ons-http-interceptor-proxy.keda.svc.cluster.local
            port:
              number: 8080
          headers:
            request:
              set:
                x-keda-http-host: books-api.default.svc.cluster.local
```

## Comportamiento del Escalado

1. **Sin tráfico:** La aplicación escala a `min` réplicas (puede ser 0)
2. **Tráfico entrante:** El interceptor captura las métricas y KEDA escala automáticamente
3. **Escalado hacia arriba:** Basado en `scalingMetric` y `targetPendingRequests`
4. **Escalado hacia abajo:** Después de `cooldownPeriod` segundos sin tráfico

## Ejemplo Completo

```yaml
# values.yaml
httpScaledObject:
  enabled: true
  
  scaleTargetRef:
    # Por defecto usa el nombre del chart
    name: ""  # Opcional: sobreescribe con nombre custom
    service: ""  # Opcional: sobreescribe con service custom
    port: 80
  
  replicas:
    min: 0  # Escala a cero para ahorrar recursos
    max: 20  # Máximo 20 réplicas bajo alta carga
  
  scalingMetric:
    type: "requestRate"
    value: "50"  # Escala cuando hay más de 50 req/s por réplica
  
  targetPendingRequests: 200
  cooldownPeriod: 600  # 10 minutos antes de escalar a cero
  
  interceptor:
    namespace: "keda"
    service: "keda-add-ons-http-interceptor-proxy"
    port: 8080

# Desactiva otros métodos de escalado
autoscaling:
  enabled: false

scaleObject:
  enabled: false

# Replica count solo se usa si httpScaledObject, autoscaling y scaleObject están deshabilitados
replicaCount: 2
```

## Instalación

```bash
# Con HTTP ScaledObject habilitado
helm upgrade --install books-api ./helm/books-api \
  --set httpScaledObject.enabled=true \
  --set httpScaledObject.replicas.min=0 \
  --set httpScaledObject.replicas.max=10

# Verificar que el HTTPScaledObject fue creado
kubectl get httpscaledobject

# Ver logs del interceptor
kubectl logs -n keda -l app.kubernetes.io/name=keda-add-ons-http-interceptor -f
```

## Troubleshooting

### Error: "context marked done while waiting for workload reach > 0 replicas"

**Solución:** Aumenta el timeout de espera:

```yaml
httpScaledObject:
  conditionWaitTimeout: 60s
```

### Errores 502 con solicitudes POST

**Solución:** Aumenta los timeouts del interceptor:

```yaml
httpScaledObject:
  timeouts:
    connect: 30s
    responseHeader: 30s
    expectContinue: 30s
```

### La aplicación escala a cero inmediatamente

**Comportamiento esperado:** Si `minReplica: 0`, la aplicación escala a cero después del `cooldownPeriod`.

**Workaround temporal:** Si necesitas un delay inicial, mantén `min: 1` temporalmente y cámbialo a `0` después del periodo deseado.

### Error 404 con hostnames inconsistentes (Istio)

**Solución:** Verifica que el hostname en el header `x-keda-http-host` coincida exactamente con el service name (case-sensitive):

```yaml
# Correcto
x-keda-http-host: books-api.default.svc.cluster.local

# Incorrecto (case mismatch)
x-keda-http-host: Books-API.default.svc.cluster.local
```

## Monitoreo

```bash
# Ver el estado del HTTPScaledObject
kubectl get httpscaledobject books-api -o yaml

# Ver métricas del ScaledObject (creado automáticamente por KEDA)
kubectl get scaledobject

# Ver los pods escalados
kubectl get pods -l app.kubernetes.io/name=books-api

# Logs del operador KEDA
kubectl logs -n keda -l app=keda-operator -f

# Logs del interceptor HTTP
kubectl logs -n keda -l app.kubernetes.io/name=keda-add-ons-http-interceptor -f
```

## Dominios Externos e Istio Gateway

**⚠️ IMPORTANTE:** Si tu aplicación recibe tráfico desde un dominio externo a través de Istio Gateway (ej: `https://books-api.example.com`), la configuración **ya maneja esto correctamente** mediante el header `x-keda-http-host`.

### Cómo Funciona

1. **Usuario hace solicitud** → `https://books-api.example.com/api`
2. **Istio Gateway recibe** → Host: `books-api.example.com`
3. **VirtualService agrega header** → `x-keda-http-host: books-api.default.svc.cluster.local`
4. **KEDA Interceptor lee el header** → Sabe enrutar al servicio interno
5. **Tu aplicación recibe** → Request con el Host original preservado

### Configuración (Automática)

No se requiere configuración adicional. Cuando habilitas `httpScaledObject.enabled: true`, el VirtualService automáticamente:

- Enruta al interceptor de KEDA
- Agrega el header `x-keda-http-host` con el servicio interno correcto
- Preserva el header `Host` original para tu aplicación

### Opciones Avanzadas

```yaml
httpScaledObject:
  interceptor:
    # Sobreescribir el target host (opcional)
    targetHost: "custom-service.namespace.svc.cluster.local"
    
    # Preservar Host header original (default: true)
    preserveHostHeader: true
```

📖 **Documentación completa:** Ver [ISTIO-GATEWAY-ROUTING.md](./ISTIO-GATEWAY-ROUTING.md) para detalles sobre:
- Escenarios de múltiples dominios
- Multi-tenant routing
- Troubleshooting de headers
- Diagramas de flujo completos

## Referencias

- [KEDA HTTP Add-on Documentation](https://github.com/kedacore/http-add-on)
- [KEDA HTTP Add-on Istio Integration](https://github.com/kedacore/http-add-on/blob/main/docs/integrations.md)
- [KEDA HTTP Add-on Helm Chart](https://github.com/kedacore/charts/tree/main/http-add-on)
