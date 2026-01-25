import { initOpenTelemetry } from './metrics/otel'
initOpenTelemetry()

import * as k8s from '@kubernetes/client-node'
import { SpanStatusCode } from '@opentelemetry/api'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { booksCreatedTotal, booksListRequestsTotal, register } from './metrics'
import { metricsMiddleware } from './metrics/middleware'
import { getTracer } from './metrics/otel'
import { startRuntimeMetricsCollection } from './metrics/runtime'
import { tracingMiddleware } from './metrics/tracing'

const app = new Hono()
app.use(prettyJSON())
app.use(logger())
app.use('*', tracingMiddleware)
app.use('*', metricsMiddleware)

startRuntimeMetricsCollection()
const books: Array<{
  title: string
  author: string
  isbn: string
}> = [
  {
    title: 'Dune',
    author: 'Frank Herbert',
    isbn: '9780441013593',
  },
  {
    title: 'Neuromancer',
    author: 'William Gibson',
    isbn: '9780441569595',
  },
  {
    title: 'Foundation',
    author: 'Isaac Asimov',
    isbn: '9780553293357',
  },
  {
    title: 'Snow Crash',
    author: 'Neal Stephenson',
    isbn: '9780553380958',
  },
  {
    title: 'The Left Hand of Darkness',
    author: 'Ursula K. Le Guin',
    isbn: '9780441478125',
  },
  {
    title: 'Hyperion',
    author: 'Dan Simmons',
    isbn: '9780553283686',
  },
  {
    title: "Ender's Game",
    author: 'Orson Scott Card',
    isbn: '9780812550702',
  },
  {
    title: 'The Martian',
    author: 'Andy Weir',
    isbn: '9780553418026',
  },
  {
    title: 'Do Androids Dream of Electric Sheep?',
    author: 'Philip K. Dick',
    isbn: '9780345404473',
  },
  {
    title: 'The Three-Body Problem',
    author: 'Liu Cixin',
    isbn: '9780765382030',
  },
]

app.get('/', (c) => {
  return c.json({
    message: 'Books API',
    version: '1.2.2',
    endpoints: {
      books: '/books',
      health: '/health',
      pods: '/pods (GET with ?namespace=default)',
      stress: '/stress (GET with ?duration=5000&intensity=high)',
      trace: '/trace (GET with ?operation=myOperation&steps=3&delay=100)',
    },
  })
})

app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    database: 'ok',
    timestamp: new Date().toISOString(),
  })
})

app.get('/metrics', async (c) => {
  c.header('Content-Type', register.contentType)
  return c.text(await register.metrics())
})

app.get('/books/hi', (c) => {
  return c.json({ message: 'hi codigo facilito!' })
})

app.post('/books/new', (c) => {
  booksCreatedTotal.inc()
  const body = c.body
  c.status(201)
  return c.json({ body })
})

app.get('/books', (c) => {
  booksListRequestsTotal.inc()
  return c.json(books)
})

// Endpoint para generar trazas personalizadas - útil para demostrar OpenTelemetry
app.get('/trace', async (c) => {
  const tracer = getTracer('books-api-demo')
  const operation = c.req.query('operation') || 'demo-operation'
  const steps = Math.min(parseInt(c.req.query('steps') || '3'), 10)
  const delay = Math.min(parseInt(c.req.query('delay') || '100'), 1000)

  const spans: Array<{ name: string; duration: number; status: string }> = []

  // Crear span padre
  return tracer.startActiveSpan(`${operation}`, async (parentSpan) => {
    parentSpan.setAttribute('operation.name', operation)
    parentSpan.setAttribute('operation.steps', steps)
    parentSpan.setAttribute('operation.delay', delay)

    try {
      for (let i = 1; i <= steps; i++) {
        // Crear span hijo para cada paso
        await tracer.startActiveSpan(
          `${operation}-step-${i}`,
          async (childSpan) => {
            const stepStart = Date.now()

            childSpan.setAttribute('step.number', i)
            childSpan.setAttribute('step.total', steps)
            childSpan.addEvent(`Starting step ${i}`)

            // Simular trabajo con delay
            await new Promise((resolve) => setTimeout(resolve, delay))

            // Simular alguna operación
            const result = Math.random()
            childSpan.setAttribute('step.result', result)

            // Simular un error ocasional en el paso 2 si hay más de 2 pasos
            if (i === 2 && steps > 2 && result < 0.1) {
              childSpan.setStatus({
                code: SpanStatusCode.ERROR,
                message: 'Random error in step 2',
              })
              childSpan.recordException(new Error('Simulated error'))
              spans.push({
                name: `${operation}-step-${i}`,
                duration: Date.now() - stepStart,
                status: 'error',
              })
            } else {
              childSpan.setStatus({ code: SpanStatusCode.OK })
              spans.push({
                name: `${operation}-step-${i}`,
                duration: Date.now() - stepStart,
                status: 'ok',
              })
            }

            childSpan.addEvent(`Completed step ${i}`)
            childSpan.end()
          },
        )
      }

      parentSpan.setStatus({ code: SpanStatusCode.OK })
      parentSpan.addEvent('Operation completed successfully')
    } catch (error) {
      parentSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
      parentSpan.recordException(error as Error)
    } finally {
      parentSpan.end()
    }

    return c.json({
      message: 'Trace generated successfully',
      trace: {
        operation,
        totalSteps: steps,
        delayPerStep: `${delay}ms`,
        spans,
      },
      usage: {
        examples: [
          'GET /trace (default: 3 steps, 100ms delay)',
          'GET /trace?operation=checkout (custom operation name)',
          'GET /trace?steps=5 (5 nested spans)',
          'GET /trace?delay=200 (200ms per step)',
          'GET /trace?operation=payment&steps=4&delay=150',
        ],
      },
      tip: 'View traces in Jaeger, Grafana Tempo, or your OTLP-compatible backend',
    })
  })
})

// Endpoint para listar pods - útil para demostrar RBAC y Service Accounts
app.get('/pods', async (c) => {
  const namespace = c.req.query('namespace') || 'default'

  try {
    const kc = new k8s.KubeConfig()
    kc.loadFromCluster()

    const k8sApi = kc.makeApiClient(k8s.CoreV1Api)
    const response = await k8sApi.listNamespacedPod({ namespace })

    const pods = response.items.map((pod) => ({
      name: pod.metadata?.name,
      namespace: pod.metadata?.namespace,
      status: pod.status?.phase,
      podIP: pod.status?.podIP,
      nodeName: pod.spec?.nodeName,
      containers: pod.spec?.containers.map((container) => ({
        name: container.name,
        image: container.image,
      })),
      createdAt: pod.metadata?.creationTimestamp,
    }))

    return c.json({
      namespace,
      count: pods.length,
      pods,
    })
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    c.status(500)
    return c.json({
      error: 'Failed to list pods',
      message: errorMessage,
      tip: 'Ensure the Service Account has RBAC permissions to list pods in the namespace',
    })
  }
})

// Endpoint para simular carga de CPU - útil para demostrar autoescalado
app.get('/stress', (c) => {
  const duration = parseInt(c.req.query('duration') || '5000') // Duración en ms (default: 5 segundos)
  const intensity = c.req.query('intensity') || 'medium' // low, medium, high

  // Validar duración (máximo 30 segundos para evitar timeouts)
  const maxDuration = 30000
  const finalDuration = Math.min(duration, maxDuration)

  // Configurar intensidad (iteraciones por ciclo)
  const intensityMap: Record<string, number> = {
    low: 100000,
    medium: 1000000,
    high: 10000000,
  }
  const iterations = intensityMap[intensity] || intensityMap.medium

  const startTime = Date.now()
  let operationsCount = 0

  // Generar carga de CPU
  while (Date.now() - startTime < finalDuration) {
    // Operaciones matemáticas intensivas
    for (let i = 0; i < iterations; i++) {
      Math.sqrt(Math.random() * Math.PI)
      Math.sin(Math.random() * 360)
      Math.cos(Math.random() * 360)
      operationsCount++
    }
  }

  const endTime = Date.now()
  const actualDuration = endTime - startTime

  return c.json({
    message: 'CPU stress test completed',
    params: {
      requestedDuration: `${duration}ms`,
      actualDuration: `${actualDuration}ms`,
      intensity: intensity,
      maxAllowedDuration: `${maxDuration}ms`,
    },
    result: {
      operationsPerformed: operationsCount,
      operationsPerSecond: Math.round(
        operationsCount / (actualDuration / 1000),
      ),
    },
    usage: {
      examples: [
        'GET /stress (default: 5s, medium intensity)',
        'GET /stress?duration=10000 (10 seconds, medium)',
        'GET /stress?intensity=high (5 seconds, high)',
        'GET /stress?duration=15000&intensity=low (15 seconds, low)',
      ],
    },
    tip: "Use tools like 'kubectl top pods' or monitoring dashboards to observe CPU usage and autoscaling",
  })
})

export default app
