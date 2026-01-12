# Guía de Despliegue - Books API

Esta guía te ayudará a desplegar tu Books API usando las imágenes de Docker construidas automáticamente.

## Opciones de Despliegue

- [Railway](#railway)
- [Render](#render)
- [Fly.io](#flyio)
- [DigitalOcean App Platform](#digitalocean-app-platform)
- [AWS ECS](#aws-ecs)
- [Google Cloud Run](#google-cloud-run)
- [Azure Container Instances](#azure-container-instances)
- [VPS con Docker Compose](#vps-con-docker-compose)

---

## Railway

Railway soporta GitHub Container Registry nativamente.

### Pasos:

1. Conecta tu repositorio de GitHub a Railway
2. Railway detectará automáticamente el Dockerfile
3. Configura las variables de entorno:
   ```
   DATABASE_URL=postgresql://...
   REDIS_URL=redis://...
   PORT=3000
   ```
4. Railway desplegará automáticamente en cada push

**Alternativamente, usa GHCR:**

```bash
# En el dashboard de Railway, configura:
Image: ghcr.io/OWNER/books-api:latest
```

## Render

### Opción 1: Desde GitHub (Automático)

1. Crea un nuevo "Web Service" en Render
2. Conecta tu repositorio
3. Render detectará el Dockerfile automáticamente
4. Configura las variables de entorno
5. Deploy

### Opción 2: Desde GHCR

1. Crea un nuevo "Web Service"
2. Selecciona "Deploy an existing image from a registry"
3. Imagen: `ghcr.io/OWNER/books-api:latest`
4. Configura variables de entorno
5. Deploy

**Variables de entorno necesarias:**
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
PORT=3000
```

## Fly.io

### Configuración inicial:

1. Instala Fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Autentícate:
```bash
fly auth login
```

3. Crea un `fly.toml`:
```toml
app = "books-api"
primary_region = "mia"

[build]
  image = "ghcr.io/OWNER/books-api:latest"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256
```

4. Deploy:
```bash
fly deploy
```

5. Configura variables:
```bash
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set REDIS_URL="redis://..."
```

## DigitalOcean App Platform

1. Ve a App Platform en DigitalOcean
2. Crea una nueva App
3. Selecciona "Docker Hub or a container registry"
4. Registry: `GitHub Container Registry`
5. Imagen: `ghcr.io/OWNER/books-api`
6. Tag: `latest`
7. Configura variables de entorno
8. Deploy

**Token de acceso para GHCR:**
- Crea un GitHub Personal Access Token con scope `read:packages`
- Úsalo como password en App Platform

## AWS ECS

### 1. Autenticación con GHCR:

```bash
# Crear secreto en AWS Secrets Manager para el token de GitHub
aws secretsmanager create-secret \
  --name github-token \
  --secret-string '{"username":"GITHUB_USER","password":"GITHUB_TOKEN"}'
```

### 2. Task Definition (`task-definition.json`):

```json
{
  "family": "books-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "books-api",
      "image": "ghcr.io/OWNER/books-api:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "repositoryCredentials": {
        "credentialsParameter": "arn:aws:secretsmanager:region:account:secret:github-token"
      },
      "environment": [
        {
          "name": "DATABASE_URL",
          "value": "postgresql://..."
        },
        {
          "name": "REDIS_URL",
          "value": "redis://..."
        }
      ]
    }
  ]
}
```

### 3. Deploy:

```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
aws ecs create-service --cluster default --service-name books-api --task-definition books-api --desired-count 1
```

## Google Cloud Run

### 1. Autenticación:

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 2. Deploy directo desde GHCR:

```bash
gcloud run deploy books-api \
  --image ghcr.io/OWNER/books-api:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="postgresql://...",REDIS_URL="redis://..."
```

### 3. Configurar autenticación para GHCR (si es privado):

```bash
# Crear secreto
echo -n GITHUB_TOKEN | gcloud secrets create github-token --data-file=-

# Deploy con credenciales
gcloud run deploy books-api \
  --image ghcr.io/OWNER/books-api:latest \
  --platform managed \
  --region us-central1
```

## Azure Container Instances

### 1. Login en Azure:

```bash
az login
```

### 2. Crear registro de credenciales para GHCR:

```bash
az container create \
  --resource-group myResourceGroup \
  --name books-api \
  --image ghcr.io/OWNER/books-api:latest \
  --registry-login-server ghcr.io \
  --registry-username GITHUB_USER \
  --registry-password GITHUB_TOKEN \
  --dns-name-label books-api-unique \
  --ports 3000 \
  --environment-variables \
    DATABASE_URL="postgresql://..." \
    REDIS_URL="redis://..."
```

## VPS con Docker Compose

Para un VPS (DigitalOcean Droplet, Linode, AWS EC2, etc.):

### 1. Crea `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  api:
    image: ghcr.io/OWNER/books-api:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data

  # Nginx reverse proxy (opcional pero recomendado)
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:
```

### 2. Crea `.env` en el servidor:

```bash
DATABASE_URL=postgresql://postgres:password@postgres:5432/booksdb
REDIS_URL=redis://redis:6379
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=booksdb
```

### 3. Autenticación con GHCR:

```bash
# En el servidor VPS
echo GITHUB_TOKEN | docker login ghcr.io -u GITHUB_USER --password-stdin
```

### 4. Deploy:

```bash
# Pull de la imagen
docker-compose -f docker-compose.prod.yml pull

# Iniciar servicios
docker-compose -f docker-compose.prod.yml up -d

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f api
```

### 5. Configuración de Nginx (opcional):

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:3000;
    }

    server {
        listen 80;
        server_name yourdomain.com;

        location / {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

## Actualización Continua

### Webhook para auto-deploy (VPS):

Crea un script `update.sh`:

```bash
#!/bin/bash
cd /path/to/app
docker login ghcr.io -u GITHUB_USER -p GITHUB_TOKEN
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
docker image prune -f
```

Configura un webhook en GitHub que ejecute este script en cada push a main.

## Monitoreo y Logging

### Health checks:

Todos los servicios deberían exponer endpoints de health:

```bash
curl http://your-domain.com/health
```

### Logs centralizados:

- **Fly.io**: `fly logs`
- **Railway**: Dashboard web
- **Render**: Dashboard web
- **Cloud Run**: Google Cloud Console
- **VPS**: `docker-compose logs -f`

## Variables de Entorno Requeridas

Mínimo necesario:

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/dbname
REDIS_URL=redis://host:6379
```

Opcionales:

```bash
JWT_SECRET=your-secret-key
API_KEY=your-api-key
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=info
```

## Troubleshooting

### Imagen no se puede descargar

1. Verifica que la imagen esté pública o tengas las credenciales correctas
2. Verifica el nombre de la imagen: `ghcr.io/OWNER/books-api:latest`
3. Verifica el token de GitHub tenga permisos `read:packages`

### Errores de conexión a base de datos

1. Verifica que `DATABASE_URL` esté correctamente configurada
2. Asegúrate de que la base de datos sea accesible desde el contenedor
3. Verifica que las credenciales sean correctas

### El contenedor se reinicia constantemente

```bash
# Ver logs para identificar el error
docker logs CONTAINER_ID

# Verificar health check
docker inspect CONTAINER_ID | grep -A 10 Health
```

## Recursos Adicionales

- [Docker Hub vs GHCR](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [GitHub Actions Workflows](.github/workflows/README.md)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
