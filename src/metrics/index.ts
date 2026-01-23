import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from "prom-client"

export const register = new Registry()

register.setDefaultLabels({
  app: "books-api",
})

collectDefaultMetrics({ register })

// HTTP Metrics
export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "path", "status_code"],
  registers: [register],
})

export const httpRequestDurationSeconds = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "path", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
})

export const httpRequestsInFlight = new Gauge({
  name: "http_requests_in_flight",
  help: "Number of HTTP requests currently being processed",
  registers: [register],
})

// Business Metrics
export const booksCreatedTotal = new Counter({
  name: "books_created_total",
  help: "Total number of books created",
  registers: [register],
})

export const booksListRequestsTotal = new Counter({
  name: "books_list_requests_total",
  help: "Total number of requests to list books",
  registers: [register],
})

// Runtime Metrics
export const memoryUsageBytes = new Gauge({
  name: "process_memory_usage_bytes",
  help: "Process memory usage in bytes",
  labelNames: ["type"],
  registers: [register],
})
