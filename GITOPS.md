# GitOps Flow Documentation

Este documento describe el flujo de GitOps implementado para Books API.

## Arquitectura GitOps

```
┌─────────────────────────────────────────────────────────────────┐
│                      Developer Workflow                         │
│  1. git commit -m "feat: nueva funcionalidad"                  │
│  2. git push origin main                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    parraletz/books-api                          │
│                    (Application Repo)                           │
│                                                                 │
│  Release Please → Crea PR automático → Merge PR                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Trigger: Auto Release Workflow
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              GitHub Actions: Auto Release Workflow              │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│  │   Release    │   │  Build &     │   │  Publish     │       │
│  │   Please     │──▶│  Push Image  │──▶│  Helm Chart  │       │
│  │   (v2.0.0)   │   │  (1 build)   │   │  (OCI)       │       │
│  └──────────────┘   └──────────────┘   └──────┬───────┘       │
│                                                │               │
│                                                ▼               │
│                                         ┌──────────────┐       │
│                                         │   Update     │       │
│                                         │   GitOps     │       │
│                                         │   Repo       │       │
│                                         └──────────────┘       │
│                                                                 │
│  Outputs:                                                       │
│  - GitHub Release (v2.0.0)                                     │
│  - Docker Image (ghcr.io/parraletz/books-api:2.0.0)           │
│  - Helm Chart (oci://ghcr.io/.../charts/books-api:2.0.0)      │
│  - GitOps Commit (tag: 2.0.0)                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Commit to GitOps repo
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   parraletz/gitops-cf                           │
│                   (GitOps Repo)                                 │
│                                                                 │
│  books/api/values-staging.yaml:                                │
│    image:                                                       │
│      tag: "2.0.0"  ← Actualizado automáticamente              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ ArgoCD detecta cambio (polling)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ArgoCD / Flux                              │
│                                                                 │
│  1. Detecta cambio en Git                                      │
│  2. Compara estado deseado vs actual                           │
│  3. Sincroniza automáticamente                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ kubectl apply
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Kubernetes Cluster                            │
│                   (Staging Environment)                         │
│                                                                 │
│  Deployment: books-api                                         │
│  Image: ghcr.io/parraletz/books-api:2.0.0                     │
│  Replicas: 2                                                   │
│  Status: Running ✓                                             │
└─────────────────────────────────────────────────────────────────┘

Tiempo total: ~2 minutos (desde commit hasta deploy)
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

El workflow [.github/workflows/auto-release.yml](.github/workflows/auto-release.yml) realiza:

1. **release**: Release Please crea el GitHub Release
2. **build-and-push**:
   - Construye la imagen Docker (una sola vez)
   - La publica a `ghcr.io/parraletz/books-api:VERSION`
   - También publica con tag `:latest`
   - Genera attestation de provenance
3. **update-helm-chart**:
   - Actualiza `helm/books-api/Chart.yaml` con la nueva versión
   - Package del chart con la versión sincronizada con la app
   - Publica el chart a `oci://ghcr.io/parraletz/charts/books-api:VERSION`
4. **update-gitops**:
   - Hace checkout del repo `parraletz/gitops-cf`
   - Actualiza `books/api/values-staging.yaml` con el nuevo tag
   - Hace commit y push de los cambios automáticamente

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

### Application Manifest para Staging

Este ejemplo usa el Helm chart directamente desde el repositorio GitOps:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: books-api-staging
  namespace: argocd
  # Finalizers aseguran que ArgoCD limpia recursos cuando se elimina la app
  finalizers:
    - resources-finalizer.argocd.argoproj.io
  # Labels para organización
  labels:
    environment: staging
    team: backend
    app: books-api
spec:
  # Proyecto de ArgoCD (default o crear uno específico)
  project: default

  # Fuente del código (GitOps repository)
  source:
    repoURL: https://github.com/parraletz/gitops-cf
    targetRevision: main
    path: books/api

    # Configuración para Helm chart
    helm:
      # Archivo de valores a usar
      valueFiles:
        - values-staging.yaml

      # Parámetros adicionales (opcional)
      parameters:
        - name: image.pullPolicy
          value: Always

      # Valores inline (opcional, sobrescriben valueFiles)
      # values: |
      #   replicaCount: 3
      #   ingress:
      #     enabled: true

  # Destino del deployment
  destination:
    # URL del cluster (in-cluster)
    server: https://kubernetes.default.svc
    # O usar nombre del cluster:
    # name: in-cluster

    # Namespace donde se desplegará
    namespace: books-api-staging

  # Política de sincronización
  syncPolicy:
    # Sincronización automática
    automated:
      # Eliminar recursos que ya no están en Git
      prune: true
      # Auto-reparar si alguien modifica recursos manualmente
      selfHeal: true
      # No permitir apps vacías
      allowEmpty: false

    # Opciones de sincronización
    syncOptions:
      # Crear namespace automáticamente si no existe
      - CreateNamespace=true
      # Validar recursos antes de aplicar
      - Validate=true
      # Usar server-side apply (recomendado)
      - ServerSideApply=true
      # Respetar ignore differences
      - RespectIgnoreDifferences=true

    # Política de retry
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m

  # Ignorar diferencias en ciertos campos (evita sync loops)
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas  # Ignorar si HPA controla replicas
    - group: "*"
      kind: "*"
      managedFieldsManagers:
        - kube-controller-manager  # Ignorar cambios del controller

  # Información adicional (opcional)
  info:
    - name: "URL"
      value: "https://books-api-staging.example.com"
    - name: "Repository"
      value: "https://github.com/parraletz/books-api"
```

### Application Manifest para Production

Para producción, puedes tener configuración más restrictiva:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: books-api-production
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
  labels:
    environment: production
    team: backend
    app: books-api
  annotations:
    # Notificaciones
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: prod-deployments
    notifications.argoproj.io/subscribe.on-health-degraded.slack: prod-alerts
spec:
  project: production  # Proyecto específico para producción

  source:
    repoURL: https://github.com/parraletz/gitops-cf
    targetRevision: main  # O usar tag específico para producción
    path: books/api
    helm:
      valueFiles:
        - values-production.yaml

  destination:
    server: https://kubernetes.default.svc
    namespace: books-api-production

  syncPolicy:
    # Sincronización MANUAL para producción (más control)
    # automated:
    #   prune: false
    #   selfHeal: false

    syncOptions:
      - CreateNamespace=true
      - Validate=true
      - ServerSideApply=true

    retry:
      limit: 3
      backoff:
        duration: 10s
        factor: 2
        maxDuration: 5m

  # Revisar cambios antes de aplicar (production)
  revisionHistoryLimit: 10
```

### Application usando OCI Helm Chart con Values desde Git (Enfoque Híbrido)

**Patrón recomendado**: Usar el chart desde OCI registry **pero** los values desde GitOps repo.

Esto combina lo mejor de ambos mundos:
- Chart versionado como artifact (OCI)
- Values versionados en Git (GitOps puro)

⚠️ **IMPORTANTE**: ArgoCD actualmente **NO soporta** múltiples sources (chart OCI + values desde Git) en una sola Application. Tienes dos opciones:

#### Opción A: Chart OCI con valores inline (actualización manual del manifest)

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: books-api-staging-oci
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
  labels:
    environment: staging
    app: books-api
spec:
  project: default

  source:
    # Usar esquema oci:// para Helm charts en OCI registries
    repoURL: oci://ghcr.io/parraletz/charts/books-api
    # ✅ La versión del chart está sincronizada con la versión de la app
    targetRevision: 2.0.0  # Versión del chart = versión de la app
    # IMPORTANTE: path debe ser "." para OCI Helm charts
    path: .

    helm:
      # Valores personalizados inline
      # ⚠️ NOTA: Estos valores deben actualizarse manualmente en este manifest
      # El workflow de GitOps NO puede actualizar este archivo automáticamente
      valuesObject:
        image:
          repository: ghcr.io/parraletz/books-api
          tag: "2.0.0"  # ⚠️ Requiere actualización manual
          pullPolicy: IfNotPresent

        replicaCount: 3

        resources:
          limits:
            cpu: 200m
            memory: 256Mi
          requests:
            cpu: 100m
            memory: 128Mi

        ingress:
          enabled: true
          className: nginx
          hosts:
            - host: books-api-staging.example.com
              paths:
                - path: /
                  pathType: Prefix
          tls:
            - secretName: books-api-tls
              hosts:
                - books-api-staging.example.com

  destination:
    server: https://kubernetes.default.svc
    namespace: books-api-staging

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

**Ventaja**: ✅ El chart OCI está versionado y sincronizado automáticamente con la versión de la app.

**Desventaja**: ❌ El workflow de auto-release actualiza `gitops-cf/books/api/values-staging.yaml`, pero este manifest usa `valuesObject` inline, por lo que **NO se actualizará automáticamente**. Deberías actualizar manualmente tanto `targetRevision` (versión del chart) como `image.tag` (versión de la imagen).

#### Opción B: Usar ApplicationSet con múltiples sources (ArgoCD v2.6+)

Si usas ArgoCD v2.6 o superior, puedes usar la feature de **múltiples sources**:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: books-api-staging-oci-multi
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
  labels:
    environment: staging
    app: books-api
spec:
  project: default

  # ✅ MÚLTIPLES SOURCES (ArgoCD v2.6+)
  sources:
    # Source 1: Chart OCI
    - repoURL: oci://ghcr.io/parraletz/charts/books-api
      # ✅ Versión del chart sincronizada con la app
      targetRevision: 2.0.0  # Auto-actualizada por workflow
      chart: books-api
      helm:
        valueFiles:
          # Referencia al archivo del segundo source usando $values
          - $values/books/api/values-staging.yaml

    # Source 2: Repositorio GitOps con values
    - repoURL: https://github.com/parraletz/gitops-cf
      targetRevision: main
      ref: values  # Nombre de referencia para usar en valueFiles

  destination:
    server: https://kubernetes.default.svc
    namespace: books-api-staging

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

**Ventajas**:
- ✅ Chart versionado como OCI artifact (sincronizado con versión de la app)
- ✅ Values versionados en Git
- ✅ El workflow actualiza tanto el chart OCI como `values-staging.yaml`
- ✅ ArgoCD sync automático cuando detecta nuevas versiones
- ✅ GitOps puro para configuración

**Requisito**: ArgoCD v2.6 o superior

**Nota importante**: Con este enfoque, el workflow publica un nuevo chart OCI con cada release, pero aún necesitas actualizar manualmente el `targetRevision` en el Application manifest de ArgoCD para que use la nueva versión del chart. Los values en Git se actualizan automáticamente.

#### Opción C: Chart desde Git (RECOMENDADO para este proyecto)

La forma más simple y compatible con el workflow actual:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: books-api-staging
  namespace: argocd
spec:
  project: default

  source:
    repoURL: https://github.com/parraletz/gitops-cf
    targetRevision: main
    path: books/api
    helm:
      valueFiles:
        - values-staging.yaml  # ✅ Se actualiza automáticamente por el workflow

  destination:
    server: https://kubernetes.default.svc
    namespace: books-api-staging

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

**Ventajas**:
- ✅ Compatible con todas las versiones de ArgoCD
- ✅ Funciona con el workflow actual (actualiza values-staging.yaml)
- ✅ GitOps puro
- ✅ No requiere configuración adicional

#### Autenticación para OCI Registry Privado

Si tu GHCR es privado, necesitas configurar credenciales en ArgoCD:

**Opción 1: Via ArgoCD CLI**

```bash
# Para repositorio OCI
argocd repo add oci://ghcr.io/parraletz/charts/books-api \
  --type oci \
  --name books-api-chart \
  --username <github-username> \
  --password <github-token>

# O con --enable-oci para repositorios Helm
argocd repo add ghcr.io/parraletz/charts \
  --type helm \
  --name parraletz-charts \
  --username <github-username> \
  --password <github-token> \
  --enable-oci
```

**Opción 2: Via Secret de Kubernetes**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ghcr-oci-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  name: books-api-chart
  url: oci://ghcr.io/parraletz/charts/books-api
  type: oci
  username: <github-username>
  password: <github-token>
```

Aplicar el secret:

```bash
kubectl apply -f ghcr-oci-creds.yaml
```

### Aplicar con ArgoCD CLI

#### Opción 1: Desde archivo YAML

```bash
# Aplicar el manifest
kubectl apply -f argocd/books-api-staging.yaml

# Verificar
kubectl get application -n argocd
```

#### Opción 2: Usar ArgoCD CLI

**Para chart desde Git (recomendado para GitOps):**

```bash
# Login a ArgoCD
argocd login argocd.example.com --username admin

# Crear aplicación para staging usando chart desde Git
argocd app create books-api-staging \
  --repo https://github.com/parraletz/gitops-cf \
  --path books/api \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace books-api-staging \
  --helm-set-file values-staging.yaml \
  --sync-policy automated \
  --auto-prune \
  --self-heal \
  --sync-option CreateNamespace=true \
  --label environment=staging \
  --label app=books-api

# Ver status
argocd app get books-api-staging

# Ver logs de sync
argocd app logs books-api-staging --follow

# Sincronizar manualmente
argocd app sync books-api-staging

# Ver historial de deploys
argocd app history books-api-staging

# Ver diferencias pendientes
argocd app diff books-api-staging
```

**Para chart desde OCI registry:**

```bash
# Primero, agregar credenciales del OCI registry (si es privado)
argocd repo add oci://ghcr.io/parraletz/charts/books-api \
  --type oci \
  --name books-api-chart \
  --username <github-username> \
  --password <github-token>

# Crear aplicación usando chart OCI
argocd app create books-api-staging-oci \
  --repo oci://ghcr.io/parraletz/charts/books-api \
  --revision 1.0.0 \
  --path . \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace books-api-staging \
  --helm-set image.tag=2.0.0 \
  --helm-set replicaCount=3 \
  --sync-policy automated \
  --auto-prune \
  --self-heal \
  --sync-option CreateNamespace=true
```

#### Opción 3: Usar ArgoCD Web UI

1. Login a ArgoCD UI: `https://argocd.example.com`
2. Click en "+ NEW APP"
3. Completar el formulario:
   - **Application Name**: books-api-staging
   - **Project**: default
   - **Sync Policy**: Automatic
   - **Repository URL**: https://github.com/parraletz/gitops-cf
   - **Path**: books/api
   - **Cluster**: https://kubernetes.default.svc
   - **Namespace**: books-api-staging
   - **Helm Values**: values-staging.yaml
4. Click en "CREATE"

### Comandos Útiles de ArgoCD

```bash
# Listar todas las aplicaciones
argocd app list

# Ver recursos de una aplicación
argocd app resources books-api-staging

# Ver eventos
argocd app events books-api-staging

# Hacer rollback a versión anterior
argocd app rollback books-api-staging <revision-id>

# Pausar auto-sync temporalmente
argocd app set books-api-staging --sync-policy none

# Reactivar auto-sync
argocd app set books-api-staging --sync-policy automated

# Eliminar aplicación (solo en ArgoCD, no en cluster)
argocd app delete books-api-staging --cascade=false

# Eliminar aplicación y recursos en cluster
argocd app delete books-api-staging --cascade=true

# Refrescar manualmente (detectar cambios en Git)
argocd app refresh books-api-staging

# Hard refresh (forzar)
argocd app refresh books-api-staging --hard
```

### Comparación: Git vs OCI para Helm Charts

| Aspecto | Chart desde Git | Chart desde OCI |
|---------|-----------------|-----------------|
| **URL** | `https://github.com/...` | `oci://ghcr.io/...` |
| **Path** | `books/api` | `.` (siempre) |
| **Versionado** | Git commits/branches | Chart versions |
| **Values** | `valueFiles: [values-staging.yaml]` | `valuesObject:` inline |
| **GitOps puro** | ✅ Sí | ❌ No (chart externo) |
| **Actualización** | Git commit → sync | Chart publish → manual update |
| **Rollback** | `git revert` | Change `targetRevision` |
| **Best for** | GitOps workflow | Chart reusability |

**Recomendación**: Para este proyecto, usa **chart desde Git** porque:
- ✅ El workflow actualiza automáticamente `values-staging.yaml` en Git
- ✅ GitOps puro: todo versionado en Git
- ✅ Rollback más sencillo con `git revert`
- ✅ Cambios de configuración y chart juntos

Usa **OCI** solo si:
- Necesitas compartir el mismo chart entre múltiples equipos/proyectos
- Quieres versionar el chart independientemente de la configuración
- Tienes CI/CD que requiere artifacts versionados

### Estructura Recomendada en GitOps Repo

Para múltiples ambientes, organiza así:

```
gitops-cf/
├── apps/
│   └── argocd/
│       ├── books-api-staging.yaml    # App manifest para staging
│       └── books-api-production.yaml # App manifest para production
├── books/
│   └── api/
│       ├── Chart.yaml                # Helm chart (opcional)
│       ├── values-staging.yaml       # Valores para staging
│       ├── values-production.yaml    # Valores para production
│       └── templates/                # Templates de Helm
│           ├── deployment.yaml
│           ├── service.yaml
│           └── ingress.yaml
└── README.md
```

Luego aplica las apps con:

```bash
# Aplicar staging
kubectl apply -f apps/argocd/books-api-staging.yaml

# Aplicar production
kubectl apply -f apps/argocd/books-api-production.yaml
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
