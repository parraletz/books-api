# GitOps Flow Documentation

Este documento describe el flujo de GitOps implementado para Books API.

## Arquitectura GitOps

```
┌─────────────────────────────────────────────────────────────────┐
│                      Developer Workflow                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1. git push
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    parraletz/books-api                          │
│                    (Application Repo)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 2. Tag v*.*.* triggers release
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflow                       │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│  │   Create     │   │  Build &     │   │   Update     │       │
│  │   Release    │──▶│  Push Image  │──▶│   GitOps     │       │
│  └──────────────┘   └──────────────┘   └──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 3. Updates values.yaml
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   parraletz/gitops-cf                           │
│                   (GitOps Repo)                                 │
│                   books/api/values.yaml                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 4. ArgoCD/Flux syncs
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Kubernetes Cluster                            │
│                   (Staging/Production)                          │
└─────────────────────────────────────────────────────────────────┘
```

## Flujo de Despliegue

### 1. Desarrollo y Commit

```bash
# Desarrollar funcionalidad
git checkout -b feature/new-feature
# ... hacer cambios ...
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

### 2. Release (Release Please o Manual)

#### Usando Release Please (Automático)
```bash
# Los commits convencionales crean automáticamente PRs de release
# Al hacer merge del PR de release, se crea el tag
```

#### Manual con Tag
```bash
# Crear tag semántico
git tag v1.2.0
git push origin v1.2.0
```

### 3. GitHub Actions se Ejecuta Automáticamente

El workflow [.github/workflows/release.yml](.github/workflows/release.yml) realiza:

1. **create-release**: Crea un GitHub Release
2. **build-and-push-release**:
   - Construye la imagen Docker
   - La publica a `ghcr.io/parraletz/books-api:VERSION`
   - También publica con tag `:latest`
3. **update-gitops**:
   - Hace checkout del repo `parraletz/gitops-cf`
   - Actualiza `books/api/values.yaml` con el nuevo tag
   - Hace commit y push de los cambios

### 4. ArgoCD/Flux Sincroniza

ArgoCD o Flux detecta el cambio en el repositorio GitOps y:
- Compara el estado deseado (GitOps repo) con el actual (cluster)
- Aplica los cambios al cluster
- Despliega la nueva versión de la aplicación

## Configuración Requerida

### 1. GitHub Personal Access Token (PAT)

Necesitas crear un PAT con permisos para escribir en el repo GitOps:

1. Ve a GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Crea un nuevo token con:
   - Repository access: Solo `parraletz/gitops-cf`
   - Permissions:
     - Contents: Read and write
     - Metadata: Read-only
3. Copia el token

### 2. Agregar Secret al Repositorio

1. Ve a `parraletz/books-api` → Settings → Secrets and variables → Actions
2. Crea un nuevo secret:
   - Name: `GITOPS_PAT`
   - Value: `<tu-personal-access-token>`

### 3. Estructura del Repositorio GitOps

El repositorio `parraletz/gitops-cf` debe tener la siguiente estructura:

```
gitops-cf/
├── books/
│   └── api/
│       ├── values.yaml          # Valores que serán actualizados
│       ├── Chart.yaml          # (opcional) Si usas Helm
│       └── kustomization.yaml  # (opcional) Si usas Kustomize
└── ...
```

**Ejemplo de `books/api/values-staging.yaml`:**

```yaml
image:
  repository: ghcr.io/parraletz/books-api
  pullPolicy: IfNotPresent
  tag: "1.0.0"  # Este valor será actualizado automáticamente

replicaCount: 2

service:
  type: ClusterIP
  port: 80
  targetPort: 3000

ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: books-api.example.com
      paths:
        - path: /
          pathType: Prefix
```

## Archivos de Ejemplo

He creado dos archivos de ejemplo en el directorio [gitops/](gitops/):

- [gitops/values-staging.yaml](gitops/values-staging.yaml) - Configuración para staging
- [gitops/values-production.yaml](gitops/values-production.yaml) - Configuración para producción

Estos archivos son referencias que puedes copiar a tu repositorio GitOps.

## Configuración de ArgoCD

### Application Manifest

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: books-api
  namespace: argocd
spec:
  project: default

  source:
    repoURL: https://github.com/parraletz/gitops-cf
    targetRevision: main
    path: books/api
    helm:
      valueFiles:
        - values.yaml

  destination:
    server: https://kubernetes.default.svc
    namespace: books-api

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

### Aplicar con ArgoCD CLI

```bash
# Crear la aplicación
argocd app create books-api \
  --repo https://github.com/parraletz/gitops-cf \
  --path books/api \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace books-api \
  --sync-policy automated \
  --auto-prune \
  --self-heal

# Ver status
argocd app get books-api

# Sincronizar manualmente (si no está en auto)
argocd app sync books-api
```

## Configuración de Flux

### GitRepository

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: gitops-cf
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/parraletz/gitops-cf
  ref:
    branch: main
```

### HelmRelease

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: books-api
  namespace: books-api
spec:
  interval: 5m
  chart:
    spec:
      chart: ./books/api
      sourceRef:
        kind: GitRepository
        name: gitops-cf
        namespace: flux-system
  values:
    # Los valores se toman de books/api/values.yaml
```

## Verificación del Flujo

### 1. Verificar que el Release fue Exitoso

```bash
# Ver el último release
gh release view --repo parraletz/books-api

# Ver las imágenes publicadas
gh api /user/packages/container/books-api/versions | jq '.[].metadata.container.tags'
```

### 2. Verificar la Actualización en GitOps

```bash
# Clone el repo GitOps
git clone https://github.com/parraletz/gitops-cf
cd gitops-cf

# Ver el último commit
git log -1 books/api/values.yaml

# Ver el contenido
cat books/api/values.yaml | grep "tag:"
```

### 3. Verificar el Despliegue en Kubernetes

```bash
# Con ArgoCD
argocd app get books-api
argocd app history books-api

# Con kubectl
kubectl get deployment books-api -n books-api -o yaml | grep "image:"
kubectl rollout status deployment/books-api -n books-api

# Ver los pods
kubectl get pods -n books-api -l app.kubernetes.io/name=books-api
```

## Troubleshooting

### Error: "Permission denied" en GitOps Update

**Problema**: El workflow no puede escribir en el repo GitOps.

**Solución**:
```bash
# Verificar que el secret GITOPS_PAT existe
gh secret list --repo parraletz/books-api

# Verificar que el PAT tiene los permisos correctos
# Re-crear el PAT con permisos de escritura en Contents
```

### Error: "values.yaml not found"

**Problema**: La estructura del repo GitOps no coincide.

**Solución**:
```bash
# Verificar la estructura
cd gitops-cf
ls -la books/api/values.yaml

# Si no existe, crear el directorio y archivo
mkdir -p books/api
cp /path/to/books-api/gitops/values-staging.yaml books/api/values.yaml
```

### El Tag no se Actualiza en values.yaml

**Problema**: El sed/yq no encuentra el patrón correcto.

**Solución**: Verificar el formato del values.yaml:
```yaml
# Debe tener exactamente esta estructura
image:
  tag: "1.0.0"
```

### ArgoCD no Sincroniza Automáticamente

**Problema**: ArgoCD no detecta los cambios.

**Solución**:
```bash
# Verificar sync policy
argocd app get books-api -o yaml | grep -A 5 syncPolicy

# Habilitar auto-sync
argocd app set books-api --sync-policy automated
```

## Mejores Prácticas

1. **Ambientes Separados**: Usa diferentes values.yaml para staging/production
   ```
   books/
   ├── api-staging/
   │   └── values.yaml
   └── api-production/
       └── values.yaml
   ```

2. **Protección de Branches**: Protege la rama `main` del repo GitOps
   - Require pull request reviews
   - Require status checks

3. **Notifications**: Configura notificaciones de ArgoCD/Flux
   - Slack
   - Discord
   - Email

4. **Rollback**: Mantén historial de valores anteriores
   ```bash
   # Ver historial de cambios
   git log --follow books/api/values.yaml

   # Revertir a versión anterior
   git revert <commit-hash>
   ```

5. **Testing**: Prueba en staging antes de production
   - Usa diferentes tags: `v1.0.0-staging`, `v1.0.0`
   - O diferentes workflows para cada ambiente

## Workflow Completo de Ejemplo

```bash
# 1. Desarrollar feature
git checkout -b feature/new-endpoint
# ... hacer cambios ...
git add .
git commit -m "feat: add new books endpoint"
git push origin feature/new-endpoint

# 2. Crear PR y merge a main
gh pr create --title "feat: add new books endpoint" --body "Description"
gh pr merge --squash

# 3. Crear release (automático con release-please o manual)
git checkout main
git pull
git tag v1.1.0
git push origin v1.1.0

# 4. GitHub Actions automáticamente:
#    - Crea release
#    - Build imagen → ghcr.io/parraletz/books-api:1.1.0
#    - Actualiza gitops-cf/books/api/values.yaml tag: "1.1.0"

# 5. ArgoCD/Flux automáticamente:
#    - Detecta cambio en GitOps repo
#    - Aplica cambios al cluster
#    - Despliega nueva versión

# 6. Verificar
kubectl get pods -n books-api
kubectl rollout status deployment/books-api -n books-api
curl https://books-api.example.com/books
```

## Referencias

- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Flux Documentation](https://fluxcd.io/docs/)
- [GitOps Principles](https://opengitops.dev/)
- [GitHub Actions - Checkout](https://github.com/actions/checkout)
