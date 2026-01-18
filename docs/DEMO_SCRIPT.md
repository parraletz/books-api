# Demo: Kubernetes Autoscaling con Books API

Este es un script paso a paso para demostrar el autoescalado de Kubernetes usando el endpoint `/stress`.

## 📋 Pre-requisitos

- Cluster de Kubernetes funcionando
- `kubectl` configurado
- `metrics-server` instalado
- Books API desplegado con HPA habilitado

## 🎬 Script de Demostración

### Paso 1: Preparar el entorno

```bash
# 1. Verificar que el cluster está corriendo
kubectl cluster-info

# 2. Verificar que metrics-server funciona
kubectl top nodes
kubectl top pods

# 3. Verificar el deployment de books-api
kubectl get deployment books-api

# 4. Verificar el HPA
kubectl get hpa books-api
# Deberías ver: TARGETS con valores como "15%/80%"
```

### Paso 2: Configurar port-forward

```bash
# En una terminal dedicada, mantén este comando corriendo
kubectl port-forward svc/books-api 3000:80
```

### Paso 3: Verificar estado inicial

```bash
# En otra terminal

# Ver pods actuales (debería haber 2)
kubectl get pods -l app.kubernetes.io/name=books-api

# Ver uso actual de CPU
kubectl top pods -l app.kubernetes.io/name=books-api

# Probar que la API funciona
curl http://localhost:3000/
```

### Paso 4: Configurar monitoreo

Abre 3 terminales adicionales (puedes usar tmux o screen):

**Terminal 1 - Pods:**
```bash
watch -n 2 'kubectl get pods -l app.kubernetes.io/name=books-api'
```

**Terminal 2 - HPA:**
```bash
watch -n 2 'kubectl get hpa books-api'
```

**Terminal 3 - Métricas de CPU:**
```bash
watch -n 5 'kubectl top pods -l app.kubernetes.io/name=books-api'
```

### Paso 5: Generar carga ligera

```bash
# Carga baja que NO debería causar escalado
curl "http://localhost:3000/stress?duration=5000&intensity=low"

# Espera 30 segundos y observa las métricas
# CPU debería mantenerse bajo 80%
```

### Paso 6: Generar carga que cause escalado

```bash
# Iniciar script de carga continua
./scripts/stress-test.sh http://localhost:3000 15000 high 10
```

**Qué observar:**

1. **Primeros 30 segundos:** CPU empieza a subir en las métricas
2. **1-2 minutos:** CPU supera el 80% consistentemente
3. **2-3 minutos:** HPA detecta la alta carga y empieza a escalar
4. **3-4 minutos:** Nuevos pods aparecen en estado "ContainerCreating"
5. **4-5 minutos:** Nuevos pods pasan a "Running" y empiezan a recibir tráfico
6. **5+ minutos:** Carga se distribuye, CPU promedio baja

### Paso 7: Observar el escalado

```bash
# Ver eventos del HPA
kubectl describe hpa books-api

# Ver logs de un pod específico
kubectl logs -f <pod-name>

# Ver todos los pods y su estado
kubectl get pods -l app.kubernetes.io/name=books-api -o wide
```

### Paso 8: Detener la carga

```bash
# En la terminal donde corre stress-test.sh
Ctrl + C

# Observa cómo el CPU empieza a bajar
# El scale-down toma 5-10 minutos (configuración predeterminada)
```

### Paso 9: Observar scale-down

```bash
# Después de ~5 minutos sin carga, el HPA empieza a reducir pods
# Observa en la terminal de watch kubectl get pods

# Ver historial de escalado
kubectl describe hpa books-api | grep -A 20 "Events:"
```

## 📊 Explicación de Métricas

### Output del HPA

```
NAME        REFERENCE              TARGETS    MINPODS   MAXPODS   REPLICAS
books-api   Deployment/books-api   180%/80%   2         10        4
```

- **TARGETS:** `180%/80%` significa:
  - Uso actual: 180% (promedio de todos los pods)
  - Target: 80% (objetivo configurado)
  - Como 180% > 80%, el HPA escalará UP
  
- **REPLICAS:** Número actual de pods (aumentará hasta maxReplicas)

### Output de kubectl top pods

```
NAME                         CPU(cores)   MEMORY(bytes)
books-api-59f7b8d9b4-abcde   198m         45Mi
books-api-59f7b8d9b4-fghij   195m         44Mi
```

- **CPU(cores):** Uso en millicores (1000m = 1 core)
- Con `requests.cpu: 100m` y usando 198m = 198% de utilización

## 🎯 Escenarios de Demo

### Escenario 1: Tráfico Normal (No Escala)

```bash
# Simular 2-3 usuarios concurrentes
./scripts/stress-test.sh http://localhost:3000 5000 low 2
```

**Resultado esperado:** CPU < 80%, mantiene 2 pods

### Escenario 2: Tráfico Moderado (Escala a 3-4 pods)

```bash
# Simular 5-10 usuarios concurrentes
./scripts/stress-test.sh http://localhost:3000 10000 medium 5
```

**Resultado esperado:** CPU 80-120%, escala a 3-4 pods

### Escenario 3: Tráfico Alto (Escala al máximo)

```bash
# Simular 20+ usuarios concurrentes con operaciones pesadas
./scripts/stress-test.sh http://localhost:3000 20000 high 20
```

**Resultado esperado:** CPU > 150%, escala hasta maxReplicas (10 pods)

### Escenario 4: Spike de Tráfico

```bash
# Generar un pico súbito
for i in {1..50}; do
  curl "http://localhost:3000/stress?duration=20000&intensity=high" &
done
```

**Resultado esperado:** Escalado rápido en respuesta al pico

## 💡 Tips para la Presentación

### Antes de la demo

1. ✅ Verifica que metrics-server funciona
2. ✅ Prueba el endpoint /stress localmente
3. ✅ Configura las terminales de monitoreo
4. ✅ Ten el script stress-test.sh listo
5. ✅ Anota los comandos clave en un cheatsheet

### Durante la demo

1. 🎤 Explica el concepto de HPA primero
2. 📊 Muestra el estado inicial (2 pods, CPU baja)
3. 🚀 Ejecuta el script de carga y explica qué hace
4. 👀 Señala las métricas subiendo en las terminales
5. ⏱️ Mientras esperas el escalado, explica la configuración YAML
6. 🎉 Celebra cuando aparezcan nuevos pods
7. 📈 Muestra cómo la carga se distribuye
8. ⬇️ Detén la carga y explica el scale-down

### Puntos clave a mencionar

- **Tiempo de escalado:** 2-3 minutos (configurable)
- **Tiempo de scale-down:** 5-10 minutos (más conservador para evitar flapping)
- **Basado en métricas:** Usa el uso promedio de CPU de todos los pods
- **Límites de recursos:** Importante definir `requests` y `limits`
- **Production-ready:** Incluye health checks, security context, etc.

## 🔧 Troubleshooting Durante la Demo

### "El HPA no muestra métricas"

```bash
# Verificar metrics-server
kubectl get deployment metrics-server -n kube-system

# Reinstalar si es necesario
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### "El HPA no escala"

```bash
# Verificar que los pods tienen requests definidos
kubectl describe pod <pod-name> | grep -A 5 "Requests"

# Verificar eventos del HPA
kubectl describe hpa books-api
```

### "No puedo hacer port-forward"

```bash
# Alternativamente, usa LoadBalancer o Ingress
kubectl get svc books-api

# O crea un servicio temporal
kubectl expose deployment books-api --type=LoadBalancer --port=80 --target-port=3000 --name=books-api-lb
```

## 📝 Comandos de Referencia Rápida

```bash
# Monitoreo
kubectl get hpa -w
kubectl top pods -l app.kubernetes.io/name=books-api --sort-by=cpu
kubectl describe hpa books-api

# Escalar manualmente (para comparar)
kubectl scale deployment books-api --replicas=5

# Ver logs en tiempo real de todos los pods
kubectl logs -f -l app.kubernetes.io/name=books-api --all-containers=true

# Limpiar después de la demo
kubectl delete hpa books-api
kubectl scale deployment books-api --replicas=2
```

## 🎓 Conceptos Educativos

### ¿Cómo funciona HPA?

1. **Metrics Server** recopila métricas de CPU/memoria de cada pod
2. **HPA Controller** consulta estas métricas cada 15 segundos (configurable)
3. **Algoritmo de escalado:**
   ```
   deseado = ceil(pods_actuales * (métrica_actual / métrica_objetivo))
   ```
4. **Cooldown periods:**
   - Scale-up: ~3 minutos sin cambios
   - Scale-down: ~5 minutos sin cambios
5. **Aplica el cambio** modificando el deployment

### Configuración en values.yaml

```yaml
autoscaling:
  enabled: true                          # Habilitar HPA
  minReplicas: 2                        # Mínimo de pods
  maxReplicas: 10                       # Máximo de pods
  targetCPUUtilizationPercentage: 80   # Target: 80% de requests.cpu

resources:
  requests:
    cpu: 100m      # HPA usa este valor como base
  limits:
    cpu: 200m      # Límite máximo por pod
```

## 🔗 Referencias

- [Kubernetes HPA Docs](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Metrics Server](https://github.com/kubernetes-sigs/metrics-server)
- [HPA Algorithm](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#algorithm-details)
