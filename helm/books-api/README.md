# Books API Helm Chart

A Helm chart for deploying Books API - Built with Hono and Bun.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.8+

## Installing the Chart

### From OCI Registry (GitHub Container Registry)

```bash
# Pull the chart
helm pull oci://ghcr.io/parraletz/charts/books-api --version 1.0.0

# Install the chart
helm install my-books-api oci://ghcr.io/parraletz/charts/books-api --version 1.0.0
```

### From Source

```bash
# Clone the repository
git clone https://github.com/parraletz/books-api.git
cd books-api

# Install the chart
helm install my-books-api ./helm/books-api
```

## Uninstalling the Chart

```bash
helm uninstall my-books-api
```

## Configuration

The following table lists the configurable parameters of the Books API chart and their default values.

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `2` |
| `image.repository` | Image repository | `ghcr.io/parraletz/books-api` |
| `image.pullPolicy` | Image pull policy | `IfNotPresent` |
| `image.tag` | Image tag | `""` (defaults to chart appVersion) |
| `service.type` | Service type | `ClusterIP` |
| `service.port` | Service port | `80` |
| `service.targetPort` | Container port | `3000` |
| `ingress.enabled` | Enable ingress | `false` |
| `ingress.className` | Ingress class name | `nginx` |
| `resources.limits.cpu` | CPU limit | `200m` |
| `resources.limits.memory` | Memory limit | `256Mi` |
| `resources.requests.cpu` | CPU request | `100m` |
| `resources.requests.memory` | Memory request | `128Mi` |
| `autoscaling.enabled` | Enable HPA | `false` |
| `autoscaling.minReplicas` | Minimum replicas | `2` |
| `autoscaling.maxReplicas` | Maximum replicas | `10` |

### Example Custom Values

Create a `values-custom.yaml` file:

```yaml
replicaCount: 3

image:
  tag: "1.0.0"

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: books-api.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: books-api-tls
      hosts:
        - books-api.example.com

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

Install with custom values:

```bash
helm install my-books-api oci://ghcr.io/parraletz/charts/books-api \
  --version 1.0.0 \
  -f values-custom.yaml
```

## Upgrading the Chart

```bash
helm upgrade my-books-api oci://ghcr.io/parraletz/charts/books-api \
  --version 1.0.1 \
  -f values-custom.yaml
```

## Testing the Deployment

```bash
# Port forward to access the service locally
kubectl port-forward svc/my-books-api 8080:80

# Test the API
curl http://localhost:8080
curl http://localhost:8080/books
```

## Support

For issues and questions, please visit: https://github.com/parraletz/books-api/issues
