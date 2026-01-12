# Dockerfile para producción - Books API
# Multi-stage build para optimizar el tamaño de la imagen

# Etapa 1: Instalación de dependencias
FROM oven/bun:1-alpine AS deps
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json bun.lockb* ./

# Instalar solo dependencias de producción
RUN bun install --production --frozen-lockfile

# Etapa 2: Build (si es necesario para transpilación)
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Copiar código fuente y configuración
COPY . .

# Etapa 3: Runner - Imagen final de producción
FROM oven/bun:1-alpine AS runner
WORKDIR /app

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 hono

# Copiar dependencias de producción
COPY --from=deps --chown=hono:nodejs /app/node_modules ./node_modules

# Copiar código fuente
COPY --chown=hono:nodejs . .

# Cambiar al usuario no-root
USER hono

# Exponer el puerto (Bun usa 3000 por defecto)
EXPOSE 3000

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD bun run -e "fetch('http://localhost:3000').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Comando para ejecutar la aplicación
CMD ["bun", "run", "src/index.ts"]
