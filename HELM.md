# Helm Chart Documentation

Este documento describe el Helm chart para Books API y cómo publicarlo y usarlo con OCI (GitHub Container Registry).

## Estructura del Chart

```
helm/books-api/
├── Chart.yaml              # Metadata del chart
├── values.yaml             # Valores por defecto
├── .helmignore            # Archivos a ignorar
├── README.md              # Documentación del chart
└── templates/
    ├── _helpers.tpl       # Helpers de template
    ├── deployment.yaml    # Deployment de Kubernetes
    ├── service.yaml       # Service de Kubernetes
    ├── ingress.yaml       # Ingress (opcional)
    ├── serviceaccount.yaml # ServiceAccount
    ├── hpa.yaml           # HorizontalPodAutoscaler
    └── configmap.yaml     # ConfigMap
```

## Características del Chart

- ✅ **Multi-replica**: Soporta múltiples réplicas para alta disponibilidad
- ✅ **Autoscaling**: HPA configurado para escalar basado en CPU/memoria
- ✅ **Security**: Pod Security Context, non-root user, read-only filesystem
- ✅ **Health Checks**: Liveness y readiness probes configurados
- ✅ **Ingress**: Soporte para exponer la aplicación externamente
- ✅ **Resource Management**: Limits y requests de CPU/memoria
- ✅ **ConfigMap**: Para variables de configuración
- ✅ **Service Account**: Con RBAC automountServiceAccountToken

## Publicación en GitHub Container Registry (OCI)

### Workflow Automático - Sincronización de Versiones

El chart se publica automáticamente a GHCR como parte del workflow de release de la aplicación:

**Cuando se hace un release de la aplicación** (via Release Please):
1. El workflow `auto-release.yml` actualiza automáticamente `Chart.yaml` con la nueva versión
2. La versión del chart se sincroniza con la versión de la aplicación (ej: app v2.0.0 → chart v2.0.0)
3. Empaqueta el chart con la nueva versión
4. Lo publica a `oci://ghcr.io/parraletz/charts/books-api:VERSION`

**✅ Ventaja principal**: La versión del chart siempre coincide con la versión de la imagen de la aplicación, facilitando el seguimiento y despliegue.

**Workflow legacy** (`.github/workflows/helm-release.yml`):
- Se mantiene para publicación manual del chart independientemente
- Se activa con cambios en `helm/**` o manualmente
- Útil si necesitas publicar una nueva versión del chart sin hacer release de la app

### Publicación Manual

```bash
# 1. Empaquetar el chart
helm package helm/books-api -d .helm-charts

# 2. Login a GitHub Container Registry
echo $GITHUB_TOKEN | helm registry login ghcr.io -u USERNAME --password-stdin

# 3. Push a OCI registry
helm push .helm-charts/books-api-1.0.0.tgz oci://ghcr.io/parraletz/charts
```

## Instalación

### Desde OCI Registry (Recomendado)

```bash
# Instalar directamente
helm install my-books-api oci://ghcr.io/parraletz/charts/books-api --version 1.0.0

# O descargar primero
helm pull oci://ghcr.io/parraletz/charts/books-api --version 1.0.0
helm install my-books-api books-api-1.0.0.tgz
```

### Desde el código fuente

```bash
helm install my-books-api ./helm/books-api
```

### Con valores personalizados

```bash
helm install my-books-api oci://ghcr.io/parraletz/charts/books-api \
  --version 1.0.0 \
  --set replicaCount=3 \
  --set image.tag=1.0.0 \
  --set ingress.enabled=true
```

O con un archivo de valores:

```bash
helm install my-books-api oci://ghcr.io/parraletz/charts/books-api \
  --version 1.0.0 \
  -f custom-values.yaml
```

## Configuración de Valores

### Valores Básicos

```yaml
# Número de réplicas
replicaCount: 2

# Configuración de imagen
image:
  repository: ghcr.io/parraletz/books-api
  pullPolicy: IfNotPresent
  tag: "1.0.0"

# Servicio
service:
  type: ClusterIP
  port: 80
  targetPort: 3000
```

### Habilitar Ingress

```yaml
ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
  hosts:
    - host: books-api.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: books-api-tls
      hosts:
        - books-api.example.com
```

### Habilitar Autoscaling

```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
  targetMemoryUtilizationPercentage: 80
```

### Recursos

```yaml
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi
```

## Comandos Útiles

### Ver información del chart

```bash
# Ver metadata
helm show chart oci://ghcr.io/parraletz/charts/books-api --version 1.0.0

# Ver valores por defecto
helm show values oci://ghcr.io/parraletz/charts/books-api --version 1.0.0

# Ver todo
helm show all oci://ghcr.io/parraletz/charts/books-api --version 1.0.0
```

### Gestión de releases

```bash
# Listar releases
helm list

# Ver status
helm status my-books-api

# Ver historial
helm history my-books-api

# Upgrade
helm upgrade my-books-api oci://ghcr.io/parraletz/charts/books-api \
  --version 1.0.1

# Rollback
helm rollback my-books-api 1

# Desinstalar
helm uninstall my-books-api
```

### Testing y Debugging

```bash
# Dry run (ver los manifiestos sin instalar)
helm install my-books-api oci://ghcr.io/parraletz/charts/books-api \
  --version 1.0.0 \
  --dry-run --debug

# Template (generar manifiestos)
helm template my-books-api oci://ghcr.io/parraletz/charts/books-api \
  --version 1.0.0

# Lint (validar el chart)
helm lint helm/books-api
```

## Versionado del Chart

El chart sigue [Semantic Versioning](https://semver.org/):

- **MAJOR**: Cambios incompatibles con versiones anteriores
- **MINOR**: Nueva funcionalidad compatible con versiones anteriores
- **PATCH**: Correcciones de bugs compatibles

Para publicar una nueva versión:

1. Actualizar `version` en `helm/books-api/Chart.yaml`
2. Actualizar `appVersion` si la versión de la app cambió
3. Commit y push a `main`
4. El workflow automáticamente publicará la nueva versión

## Verificación del Deployment

```bash
# Port forward para acceder localmente
kubectl port-forward svc/my-books-api 8080:80

# Probar la API
curl http://localhost:8080
curl http://localhost:8080/books

# Ver logs
kubectl logs -l app.kubernetes.io/name=books-api -f

# Ver pods
kubectl get pods -l app.kubernetes.io/name=books-api

# Describir deployment
kubectl describe deployment my-books-api
```

## Troubleshooting

### El chart no se encuentra en OCI registry

```bash
# Verificar que el workflow se ejecutó correctamente
# Ir a: https://github.com/parraletz/books-api/actions

# Verificar permisos del token
# El GITHUB_TOKEN debe tener permisos de packages:write
```

### Errores de autenticación

```bash
# Re-login
echo $GITHUB_TOKEN | helm registry login ghcr.io -u USERNAME --password-stdin

# Verificar que el token tenga los permisos correctos
```

### Pods no inician

```bash
# Ver eventos
kubectl describe pod <pod-name>

# Ver logs
kubectl logs <pod-name>

# Verificar imagen
kubectl get pod <pod-name> -o jsonpath='{.spec.containers[0].image}'
```

## Mejores Prácticas

1. **Versionado**: Siempre especificar versión en producción
2. **Valores**: Usar archivos de valores separados por ambiente
3. **Secrets**: Nunca poner secretos en values.yaml, usar Kubernetes Secrets
4. **Resources**: Siempre definir limits y requests
5. **Health Checks**: Configurar liveness y readiness probes
6. **Security**: Usar non-root user, read-only filesystem
7. **Monitoring**: Integrar con Prometheus/Grafana si es posible

## Referencias

- [Helm Documentation](https://helm.sh/docs/)
- [Helm OCI Support](https://helm.sh/docs/topics/registries/)
- [GitHub Packages](https://docs.github.com/en/packages)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
