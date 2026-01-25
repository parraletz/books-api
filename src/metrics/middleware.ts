import type { Context, Next, MiddlewareHandler } from 'hono'
import {
  httpRequestsTotal,
  httpRequestDurationSeconds,
  httpRequestsInFlight,
} from './index'

const EXCLUDED_PATHS = ['/metrics', '/health']

function normalizePath(path: string): string {
  return path
    .replace(/\/books\/[a-zA-Z0-9-]+$/, '/books/:id')
    .replace(/\/[0-9]+$/, '/:id')
}

export const metricsMiddleware: MiddlewareHandler = async (
  c: Context,
  next: Next,
) => {
  const path = normalizePath(c.req.path)

  if (EXCLUDED_PATHS.includes(path)) {
    return next()
  }

  const method = c.req.method
  const startTime = performance.now()

  httpRequestsInFlight.inc()

  try {
    await next()
  } finally {
    const durationSeconds = (performance.now() - startTime) / 1000
    const statusCode = c.res.status.toString()

    httpRequestsTotal.inc({ method, path, status_code: statusCode })
    httpRequestDurationSeconds.observe(
      { method, path, status_code: statusCode },
      durationSeconds,
    )

    httpRequestsInFlight.dec()
  }
}
