import { initOpenTelemetry } from "./metrics/otel";
initOpenTelemetry();

import { Hono } from "hono";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { register, booksCreatedTotal, booksListRequestsTotal } from "./metrics";
import { metricsMiddleware } from "./metrics/middleware";
import { tracingMiddleware } from "./metrics/tracing";
import { startRuntimeMetricsCollection } from "./metrics/runtime";

const app = new Hono();
app.use(prettyJSON());
app.use(logger());
app.use("*", tracingMiddleware);
app.use("*", metricsMiddleware);

startRuntimeMetricsCollection();
const books: Array<{
  title: string;
  author: string;
  isbn: string;
}> = [
  {
    title: "Dune",
    author: "Frank Herbert",
    isbn: "9780441013593",
  },
  {
    title: "Neuromancer",
    author: "William Gibson",
    isbn: "9780441569595",
  },
  {
    title: "Foundation",
    author: "Isaac Asimov",
    isbn: "9780553293357",
  },
  {
    title: "Snow Crash",
    author: "Neal Stephenson",
    isbn: "9780553380958",
  },
  {
    title: "The Left Hand of Darkness",
    author: "Ursula K. Le Guin",
    isbn: "9780441478125",
  },
  {
    title: "Hyperion",
    author: "Dan Simmons",
    isbn: "9780553283686",
  },
  {
    title: "Ender's Game",
    author: "Orson Scott Card",
    isbn: "9780812550702",
  },
  {
    title: "The Martian",
    author: "Andy Weir",
    isbn: "9780553418026",
  },
  {
    title: "Do Androids Dream of Electric Sheep?",
    author: "Philip K. Dick",
    isbn: "9780345404473",
  },
  {
    title: "The Three-Body Problem",
    author: "Liu Cixin",
    isbn: "9780765382030",
  },
];

app.get("/", (c) => {
  return c.json({
    message: "Books API",
    version: "1.2.2",
    endpoints: {
      books: "/books",
      health: "/health",
      stress: "/stress (GET with ?duration=5000&intensity=high)",
    },
  });
});

app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    database: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.get("/metrics", async (c) => {
  c.header("Content-Type", register.contentType);
  return c.text(await register.metrics());
});

app.get("/books/hi", (c) => {
  return c.json({ message: "hi codigo facilito!" });
});

app.post("/books/new", (c) => {
  booksCreatedTotal.inc();
  const body = c.body;
  c.status(201);
  return c.json({ body });
});

app.get("/books", (c) => {
  booksListRequestsTotal.inc();
  return c.json(books);
});

// Endpoint para simular carga de CPU - útil para demostrar autoescalado
app.get("/stress", (c) => {
  const duration = parseInt(c.req.query("duration") || "5000"); // Duración en ms (default: 5 segundos)
  const intensity = c.req.query("intensity") || "medium"; // low, medium, high

  // Validar duración (máximo 30 segundos para evitar timeouts)
  const maxDuration = 30000;
  const finalDuration = Math.min(duration, maxDuration);

  // Configurar intensidad (iteraciones por ciclo)
  const intensityMap: Record<string, number> = {
    low: 100000,
    medium: 1000000,
    high: 10000000,
  };
  const iterations = intensityMap[intensity] || intensityMap.medium;

  const startTime = Date.now();
  let operationsCount = 0;

  // Generar carga de CPU
  while (Date.now() - startTime < finalDuration) {
    // Operaciones matemáticas intensivas
    for (let i = 0; i < iterations; i++) {
      Math.sqrt(Math.random() * Math.PI);
      Math.sin(Math.random() * 360);
      Math.cos(Math.random() * 360);
      operationsCount++;
    }
  }

  const endTime = Date.now();
  const actualDuration = endTime - startTime;

  return c.json({
    message: "CPU stress test completed",
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
        "GET /stress (default: 5s, medium intensity)",
        "GET /stress?duration=10000 (10 seconds, medium)",
        "GET /stress?intensity=high (5 seconds, high)",
        "GET /stress?duration=15000&intensity=low (15 seconds, low)",
      ],
    },
    tip: "Use tools like 'kubectl top pods' or monitoring dashboards to observe CPU usage and autoscaling",
  });
});

export default app;
