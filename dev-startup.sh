#!/bin/bash

# ENOSX AI Assistant - Local Development Startup Script
# This script starts both the API server and frontend service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ENOSX AI Assistant - Development Startup Script          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm is not installed. Please install it first:${NC}"
    echo "   npm install -g pnpm"
    exit 1
fi

# Check if GROQ_API_KEY is set
if [ -z "$GROQ_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  GROQ_API_KEY environment variable is not set${NC}"
    echo "   Please set it before starting the services:"
    echo "   export GROQ_API_KEY=your_groq_api_key_here"
    echo ""
    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create a temporary directory for logs
LOGS_DIR="/tmp/enosx-dev-logs"
mkdir -p "$LOGS_DIR"

echo -e "${GREEN}📁 Log directory: $LOGS_DIR${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo -e "${YELLOW}🛑 Stopping services...${NC}"
    kill $API_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    wait $API_PID 2>/dev/null || true
    wait $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}✅ Services stopped${NC}"
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

# Start API Server
echo -e "${GREEN}🚀 Starting API Server...${NC}"
echo "   Port: 8080"
echo "   Log: $LOGS_DIR/api-server.log"

(
    cd artifacts/api-server
    export PORT=8080
    export NODE_ENV=development
    pnpm run dev > "$LOGS_DIR/api-server.log" 2>&1
) &
API_PID=$!

# Wait for API server to start
echo -e "${YELLOW}⏳ Waiting for API server to start...${NC}"
sleep 3

# Check if API server is running
if ! kill -0 $API_PID 2>/dev/null; then
    echo -e "${RED}❌ API server failed to start${NC}"
    echo "   Check logs: tail -f $LOGS_DIR/api-server.log"
    exit 1
fi

# Test API server health
if ! curl -s http://localhost:8080/api/healthz > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  API server is running but health check failed${NC}"
    echo "   This might be a startup timing issue. Continuing..."
fi

echo -e "${GREEN}✅ API Server started (PID: $API_PID)${NC}"
echo ""

# Start Frontend Service
echo -e "${GREEN}🚀 Starting Frontend Service...${NC}"
echo "   Port: 3000"
echo "   API Port: 8080"
echo "   Log: $LOGS_DIR/frontend.log"

(
    cd artifacts/enosx-assistant
    export PORT=3000
    export BASE_PATH=/
    export API_PORT=8080
    export NODE_ENV=development
    pnpm run dev > "$LOGS_DIR/frontend.log" 2>&1
) &
FRONTEND_PID=$!

# Wait for frontend server to start
echo -e "${YELLOW}⏳ Waiting for frontend service to start...${NC}"
sleep 5

# Check if frontend server is running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Frontend service failed to start${NC}"
    echo "   Check logs: tail -f $LOGS_DIR/frontend.log"
    exit 1
fi

echo -e "${GREEN}✅ Frontend Service started (PID: $FRONTEND_PID)${NC}"
echo ""

# Display startup summary
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ All services started successfully!                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}📍 Access the application:${NC}"
echo "   Frontend: ${YELLOW}http://localhost:3000${NC}"
echo "   API Health: ${YELLOW}http://localhost:8080/api/healthz${NC}"
echo ""
echo -e "${GREEN}📊 Monitor services:${NC}"
echo "   API logs:      tail -f $LOGS_DIR/api-server.log"
echo "   Frontend logs: tail -f $LOGS_DIR/frontend.log"
echo ""
echo -e "${GREEN}🛑 To stop services:${NC}"
echo "   Press Ctrl+C"
echo ""

# Wait for both processes
wait $API_PID $FRONTEND_PID
