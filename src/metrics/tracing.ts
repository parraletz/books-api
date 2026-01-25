import type { Context, Next, MiddlewareHandler } from 'hono'
import { getTracer } from './otel'
import { SpanKind, SpanStatusCode } from '@opentelemetry/api'

const EXCLUDED_PATHS = ['/metrics', '/health']

export const tracingMiddleware: MiddlewareHandler = async (
  c: Context,
  next: Next,
) => {
  const path = c.req.path

  if (EXCLUDED_PATHS.includes(path)) {
    return next()
  }

  const tracer = getTracer()
  const method = c.req.method
  const spanName = `${method} ${path}`

  return tracer.startActiveSpan(
    spanName,
    {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': method,
        'http.url': c.req.url,
        'http.route': path,
        'http.user_agent': c.req.header('user-agent') || 'unknown',
      },
    },
    async (span) => {
      try {
        await next()

        const statusCode = c.res.status
        span.setAttribute('http.status_code', statusCode)

        if (statusCode >= 400) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `HTTP ${statusCode}`,
          })
        } else {
          span.setStatus({ code: SpanStatusCode.OK })
        }
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        })
        span.recordException(error as Error)
        throw error
      } finally {
        span.end()
      }
    },
  )
}
