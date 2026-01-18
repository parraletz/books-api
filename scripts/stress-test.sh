#!/bin/bash

# Script para generar carga de CPU y probar el autoescalado de Kubernetes
# Uso: ./scripts/stress-test.sh [URL] [DURATION] [INTENSITY] [CONCURRENT_REQUESTS]

set -e

# Array para almacenar PIDs de los workers
WORKER_PIDS=()

# Función para limpiar procesos al salir
cleanup() {
    echo ""
    echo -e "${YELLOW}Deteniendo workers...${NC}"
    for pid in "${WORKER_PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
    done
    echo -e "${GREEN}✓ Test detenido${NC}"
    exit 0
}

# Capturar señales de interrupción
trap cleanup SIGINT SIGTERM EXIT

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parámetros
URL="${1:-http://localhost:3000/stress}"
DURATION="${2:-10000}"
INTENSITY="${3:-high}"
CONCURRENT="${4:-10}"

echo -e "${BLUE}=== Kubernetes CPU Stress Test ===${NC}"
echo -e "${YELLOW}Configuración:${NC}"
echo -e "  URL: ${GREEN}$URL${NC}"
echo -e "  Duración por request: ${GREEN}${DURATION}ms${NC}"
echo -e "  Intensidad: ${GREEN}$INTENSITY${NC}"
echo -e "  Requests concurrentes: ${GREEN}$CONCURRENT${NC}"
echo ""

# Verificar que el servidor está corriendo
echo -e "${BLUE}Verificando servidor...${NC}"
if curl -s -f "$URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Servidor disponible${NC}"
else
    echo -e "${RED}✗ Error: Servidor no disponible en $URL${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Iniciando test de carga...${NC}"
echo -e "${YELLOW}Presiona Ctrl+C para detener${NC}"
echo ""

# Función para hacer requests
make_request() {
    local id=$1
    local count=0
    while true; do
        count=$((count + 1))
        response=$(curl -s "$URL/stress?duration=$DURATION&intensity=$INTENSITY")
        ops=$(echo "$response" | grep -o '"operationsPerformed":[0-9]*' | grep -o '[0-9]*')
        echo -e "${GREEN}[Worker $id]${NC} Request #$count - Operaciones: ${BLUE}$ops${NC}"
        sleep 1
    done
}

# Iniciar workers concurrentes
for i in $(seq 1 $CONCURRENT); do
    make_request $i &
    WORKER_PIDS+=($!)
done

# Información útil
echo ""
echo -e "${YELLOW}Comandos útiles para monitorear:${NC}"
echo -e "  ${BLUE}kubectl top pods${NC}                          # Ver uso de CPU/memoria"
echo -e "  ${BLUE}kubectl get hpa${NC}                           # Ver estado del HPA"
echo -e "  ${BLUE}kubectl get pods -w${NC}                       # Ver pods en tiempo real"
echo -e "  ${BLUE}kubectl describe hpa books-api${NC}            # Detalles del HPA"
echo ""

# Esperar a que el usuario cancele
wait
