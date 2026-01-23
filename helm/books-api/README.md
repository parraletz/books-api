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
| `prometheus.enabled` | Enable Prometheus scrape annotations | `true` |
| `prometheus.path` | Metrics endpoint path | `/metrics` |
| `prometheus.port` | Metrics port | `3000` |
| `opentelemetry.enabled` | Enable OpenTelemetry tracing | `false` |
| `opentelemetry.endpoint` | OTLP collector endpoint | `http://otel-collector:4318` |
| `opentelemetry.serviceName` | Service name for traces | `books-api` |
| `opentelemetry.debug` | Enable OTEL debug logging | `false` |
| `grafana.dashboards.enabled` | Deploy Grafana dashboard ConfigMap | `false` |
| `grafana.dashboards.labels` | Labels for dashboard sidecar discovery | `{grafana_dashboard: "1"}` |

## Observability

Books API includes comprehensive observability support with Prometheus metrics, OpenTelemetry tracing, and pre-built Grafana dashboards.

### Prometheus Metrics

Prometheus metrics are enabled by default and exposed at `/metrics`. The chart automatically adds scrape annotations to the pod.

**Metrics exposed:**

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests by method, path, status_code |
| `http_request_duration_seconds` | Histogram | Request latency distribution |
| `http_requests_in_flight` | Gauge | Current active requests |
| `books_created_total` | Counter | Total books created |
| `books_list_requests_total` | Counter | Total book list requests |
| `process_memory_usage_bytes` | Gauge | Memory usage (rss, heap, external) |

**Disable Prometheus annotations:**

```bash
helm install books-api ./helm/books-api --set prometheus.enabled=false
```

### OpenTelemetry Tracing

Enable distributed tracing with OpenTelemetry to send traces and metrics to an OTLP-compatible backend (Jaeger, Tempo, Datadog, etc.).

**Enable OpenTelemetry:**

```bash
helm install books-api ./helm/books-api \
  --set opentelemetry.enabled=true \
  --set opentelemetry.endpoint="http://otel-collector:4318"
```

**Configuration options:**

```yaml
opentelemetry:
  enabled: true
  endpoint: "http://otel-collector:4318"  # OTLP HTTP endpoint
  serviceName: "books-api"                 # Service name in traces
  debug: false                             # Enable debug logging
```

**Environment variables injected when enabled:**

| Variable | Description |
|----------|-------------|
| `OTEL_ENABLED` | Set to "true" |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Collector endpoint |
| `OTEL_SERVICE_NAME` | Service name |
| `OTEL_SERVICE_VERSION` | Chart appVersion |
| `OTEL_DEBUG` | Debug mode (if enabled) |

**Example with Jaeger:**

```yaml
opentelemetry:
  enabled: true
  endpoint: "http://jaeger-collector:4318"
  serviceName: "books-api"
```

### Grafana Dashboards

The chart includes a pre-built Grafana dashboard that can be automatically provisioned using the Grafana sidecar.

**Enable dashboard provisioning:**

```bash
helm install books-api ./helm/books-api \
  --set grafana.dashboards.enabled=true
```

This creates a ConfigMap with the label `grafana_dashboard: "1"` that the Grafana sidecar automatically discovers and loads.

**Dashboard panels included:**

- Request Rate (req/s)
- P95 Latency
- Error Rate (5xx)
- Requests In Flight
- Request Rate by Endpoint
- Latency by Endpoint (p50, p95, p99)
- Request Rate by Status Code
- Memory Usage (Heap, RSS)
- Business Metrics (Books Created, List Requests)

**Custom sidecar label:**

If your Grafana uses a different sidecar label:

```yaml
grafana:
  dashboards:
    enabled: true
    labels:
      my_custom_label: "true"
```

**Manual import:**

The dashboard JSON is also available at `grafana/dashboards/books-api-overview.json` in the repository for manual import.

### Full Observability Stack Example

Deploy with all observability features enabled:

```yaml
# values-observability.yaml
prometheus:
  enabled: true
  path: /metrics
  port: "3000"

opentelemetry:
  enabled: true
  endpoint: "http://otel-collector.monitoring:4318"
  serviceName: "books-api"
  debug: false

grafana:
  dashboards:
    enabled: true
    labels:
      grafana_dashboard: "1"
```

```bash
helm install books-api ./helm/books-api -f values-observability.yaml
```

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
