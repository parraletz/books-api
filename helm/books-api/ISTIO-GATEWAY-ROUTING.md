# KEDA HTTP Add-on con Dominios Externos e Istio Gateway

## Problema: Enrutamiento con Dominios Externos

Cuando las solicitudes HTTP vienen desde un **Istio Gateway externo** con un **dominio público** (ej: `https://books-api.example.com`), existe un desafío de enrutamiento:

### Flujo de la Solicitud

```
Usuario                 Istio Gateway           KEDA Interceptor        Tu Aplicación
   |                         |                         |                      |
   |  GET https://           |                         |                      |
   |  books-api.example.com  |                         |                      |
   |------------------------>|                         |                      |
   |                         |  Host: books-api.       |                      |
   |                         |  example.com            |                      |
   |                         |------------------------>|                      |
   |                         |                         |  ¿A dónde enrutar?   |
   |                         |                         |  (necesita service   |
   |                         |                         |   k8s interno)       |
   |                         |                         |                      |
```

### El Problema

1. **Header Host original**: `books-api.example.com` (dominio externo)
2. **Lo que KEDA necesita**: `books-api.default.svc.cluster.local` (servicio interno de Kubernetes)
3. **Sin configuración correcta**: El interceptor de KEDA no puede determinar a qué servicio interno debe enrutar la solicitud

## Solución Implementada

El chart de Helm **ya implementa la solución correcta** mediante el header `x-keda-http-host`:

### Configuración Automática en VirtualService

Cuando `httpScaledObject.enabled: true`, el VirtualService se configura automáticamente:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: books-api
spec:
  hosts:
    - books-api.example.com  # Dominio externo
  gateways:
    - books-api-gateway
  http:
    - match:
        - uri:
            prefix: /
      route:
        - destination:
            # Enruta al interceptor de KEDA
            host: keda-add-ons-http-interceptor-proxy.keda.svc.cluster.local
            port:
              number: 8080
          headers:
            request:
              set:
                # ⭐ CLAVE: Este header indica al interceptor el servicio interno
                x-keda-http-host: books-api.default.svc.cluster.local
```

### Cómo Funciona

1. **Usuario hace solicitud** → `https://books-api.example.com/api/books`
2. **Istio Gateway recibe** → Host: `books-api.example.com`
3. **VirtualService intercepta** → Agrega header `x-keda-http-host: books-api.default.svc.cluster.local`
4. **KEDA Interceptor lee** → El header `x-keda-http-host` le indica el servicio interno
5. **Interceptor enruta** → `books-api.default.svc.cluster.local:80`
6. **Tu aplicación recibe** → La solicitud con el Host original preservado

## Configuración Avanzada

### Opción 1: Configuración por Defecto (Recomendada)

```yaml
# values.yaml
httpScaledObject:
  enabled: true
  interceptor:
    namespace: "keda"
    service: "keda-add-ons-http-interceptor-proxy"
    port: 8080
    # targetHost vacío usa el default: <fullname>.<namespace>.svc.cluster.local
    targetHost: ""
    # Preserva el Host header original (books-api.example.com)
    preserveHostHeader: true
```

**Resultado:**
- Header `Host`: `books-api.example.com` (original, tu app lo ve)
- Header `x-keda-http-host`: `books-api.default.svc.cluster.local` (para KEDA)

**Cuándo usar:** Cuando tu aplicación necesita conocer el dominio externo original (para generar URLs absolutas, validación de dominio, etc.)

### Opción 2: Sobreescribir Target Host

```yaml
httpScaledObject:
  enabled: true
  interceptor:
    targetHost: "my-custom-service.production.svc.cluster.local"
```

**Cuándo usar:** Cuando el nombre del servicio interno es diferente al nombre del chart.

### Opción 3: No Preservar Host Header

```yaml
httpScaledObject:
  enabled: true
  interceptor:
    preserveHostHeader: false
```

**Resultado:**
- Header `Host`: Reemplazado con el servicio interno
- Header `x-forwarded-host`: `books-api.example.com` (original preservado)

**Cuándo usar:** Cuando tu aplicación no debe conocer el dominio externo.

## Casos de Uso Comunes

### Caso 1: API Pública con Múltiples Dominios

```yaml
# Múltiples dominios apuntando a la misma API
ingressGateway:
  hosts:
    - host: api.example.com
    - host: api.example.io
    - host: api-prod.internal.corp

httpScaledObject:
  enabled: true
  interceptor:
    targetHost: "books-api.production.svc.cluster.local"
    preserveHostHeader: true  # Tu app ve el dominio real usado
```

### Caso 2: Multi-tenant con Routing por Dominio

```yaml
# Diferentes apps para diferentes dominios
# VirtualService 1: books-api.example.com → books-api service
# VirtualService 2: users-api.example.com → users-api service

httpScaledObject:
  enabled: true
  interceptor:
    # Cada VirtualService configura su propio targetHost
    targetHost: "books-api.tenantA.svc.cluster.local"
```

### Caso 3: Desarrollo/Staging/Producción

```yaml
# Staging
ingressGateway:
  hosts:
    - host: staging-api.example.com

httpScaledObject:
  interceptor:
    targetHost: "books-api.staging.svc.cluster.local"
```

```yaml
# Producción
ingressGateway:
  hosts:
    - host: api.example.com

httpScaledObject:
  interceptor:
    targetHost: "books-api.production.svc.cluster.local"
```

## Verificación y Troubleshooting

### 1. Verificar Headers en el Interceptor

```bash
# Ver logs del interceptor para debug
kubectl logs -n keda -l app.kubernetes.io/name=keda-add-ons-http-interceptor -f

# Buscar el header x-keda-http-host
kubectl logs -n keda -l app.kubernetes.io/name=keda-add-ons-http-interceptor | grep "x-keda-http-host"
```

### 2. Verificar VirtualService Generado

```bash
# Ver la configuración del VirtualService
kubectl get virtualservice books-api -o yaml

# Verificar que el header x-keda-http-host está configurado
kubectl get virtualservice books-api -o yaml | grep -A 5 "x-keda-http-host"
```

### 3. Probar desde tu Aplicación

Agrega logging temporal en tu app para ver qué headers recibe:

```typescript
// En tu aplicación Hono
app.use("*", async (c, next) => {
  console.log("Host header:", c.req.header("host"))
  console.log("X-Forwarded-Host:", c.req.header("x-forwarded-host"))
  console.log("X-Keda-HTTP-Host:", c.req.header("x-keda-http-host"))
  await next()
})
```

### 4. Error: 404 Not Found desde Interceptor

**Síntoma:** El interceptor devuelve 404 después de enrutar.

**Posibles causas:**
1. El servicio interno no existe o tiene nombre diferente
2. El puerto del servicio es incorrecto
3. El namespace es incorrecto

**Solución:**
```bash
# Verificar que el servicio existe
kubectl get service books-api -n <namespace>

# Verificar el puerto
kubectl get service books-api -n <namespace> -o jsonpath='{.spec.ports[0].port}'

# Probar conectividad interna
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -v http://books-api.default.svc.cluster.local:80
```

**Corregir en values.yaml:**
```yaml
httpScaledObject:
  scaleTargetRef:
    service: "books-api"  # Verificar nombre correcto
    port: 80  # Verificar puerto correcto
  interceptor:
    targetHost: "books-api.default.svc.cluster.local"  # FQDN completo
```

### 5. Error: Case-Sensitive Hostnames (Azure Front Door)

**Síntoma:** 404 con diferentes casos (ej: `Books-API.example.com` vs `books-api.example.com`)

**Causa:** Azure Front Door y algunos CDNs son case-sensitive.

**Solución:** Asegurar consistencia exacta:

```yaml
ingressGateway:
  hosts:
    - host: books-api.example.com  # Minúsculas

httpScaledObject:
  interceptor:
    # DEBE coincidir exactamente (case-sensitive)
    targetHost: "books-api.default.svc.cluster.local"
```

### 6. Aplicación Necesita Conocer Dominio Original

Si tu aplicación genera URLs o valida dominios:

```yaml
httpScaledObject:
  interceptor:
    preserveHostHeader: true  # ✅ Tu app ve books-api.example.com
```

Si tu app no necesita el dominio externo:

```yaml
httpScaledObject:
  interceptor:
    preserveHostHeader: false  # Host reemplazado con servicio interno
    # El dominio original estará en x-forwarded-host
```

## Diagrama de Flujo Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│  Cliente Externo                                                     │
│  curl https://books-api.example.com/api/books                       │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
                  │ Host: books-api.example.com
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Istio Gateway (Ingress)                                             │
│  - Recibe tráfico externo                                           │
│  - Selecciona VirtualService por host                               │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
                  │ Match: books-api.example.com
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  VirtualService (books-api)                                          │
│  - Agrega header: x-keda-http-host: books-api.default.svc.cluster...│
│  - Route to: keda-add-ons-http-interceptor-proxy.keda.svc...       │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
                  │ Host: books-api.example.com
                  │ x-keda-http-host: books-api.default.svc.cluster.local
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  KEDA HTTP Interceptor                                               │
│  1. Lee x-keda-http-host → determina target interno                 │
│  2. Captura métricas (request rate/concurrency)                     │
│  3. Envía métricas al KEDA Operator                                 │
│  4. Enruta al servicio interno                                      │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
                  │ Forward to: books-api.default.svc.cluster.local:80
                  │ Host: books-api.example.com (preservado)
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Books API Service (ClusterIP)                                       │
│  - Recibe request con Host original                                 │
│  - Load balancing entre pods                                        │
└─────────────────┬───────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Books API Pod(s)                                                    │
│  - Procesa request                                                   │
│  - Responde                                                          │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  KEDA Operator (background)                                          │
│  - Monitorea métricas del interceptor                               │
│  - Escala Deployment basado en request rate/concurrency            │
│  - Puede escalar a 0 cuando no hay tráfico                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Resumen de la Respuesta a tu Pregunta

**¿Qué pasa si la solicitud viene desde un Gateway de Istio con dominio externo?**

✅ **Funciona correctamente** gracias al header `x-keda-http-host` que automáticamente se configura en el VirtualService.

**Puntos clave:**
1. El **VirtualService** intercepta el tráfico del Gateway externo
2. Agrega el header **`x-keda-http-host`** con el nombre del servicio interno
3. El **interceptor de KEDA** lee este header para saber a dónde enrutar
4. El header **`Host` original** se preserva (por defecto) para tu aplicación
5. Todo es **automático** cuando habilitas `httpScaledObject.enabled: true`

**No requiere configuración adicional** para el caso básico, pero tienes opciones avanzadas si necesitas customizar el comportamiento.
