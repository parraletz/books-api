import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { Resource } from '@opentelemetry/resources'
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'
import {
  trace,
  metrics,
  DiagConsoleLogger,
  DiagLogLevel,
  diag,
} from '@opentelemetry/api'

const OTEL_ENABLED = process.env.OTEL_ENABLED === 'true'
const OTEL_ENDPOINT =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318'
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'books-api'
const SERVICE_VERSION = process.env.OTEL_SERVICE_VERSION || '1.0.0'
const ENVIRONMENT = process.env.NODE_ENV || 'development'

let sdk: NodeSDK | null = null

export function initOpenTelemetry(): void {
  if (!OTEL_ENABLED) {
    console.log(
      '[OTEL] OpenTelemetry disabled (set OTEL_ENABLED=true to enable)',
    )
    return
  }

  if (process.env.OTEL_DEBUG === 'true') {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)
  }

  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: SERVICE_NAME,
    [SEMRESATTRS_SERVICE_VERSION]: SERVICE_VERSION,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: ENVIRONMENT,
  })

  const traceExporter = new OTLPTraceExporter({
    url: `${OTEL_ENDPOINT}/v1/traces`,
  })

  const metricExporter = new OTLPMetricExporter({
    url: `${OTEL_ENDPOINT}/v1/metrics`,
  })

  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 10000,
  })

  sdk = new NodeSDK({
    resource,
    spanProcessor: new BatchSpanProcessor(traceExporter),
    metricReader,
  })

  sdk.start()
  console.log(
    `[OTEL] OpenTelemetry initialized - exporting to ${OTEL_ENDPOINT}`,
  )

  process.on('SIGTERM', () => {
    sdk
      ?.shutdown()
      .then(() => console.log('[OTEL] Shutdown complete'))
      .catch((err) => console.error('[OTEL] Shutdown error:', err))
  })
}

export function getTracer(name: string = 'books-api') {
  return trace.getTracer(name)
}

export function getMeter(name: string = 'books-api') {
  return metrics.getMeter(name)
}

export { trace, metrics }
