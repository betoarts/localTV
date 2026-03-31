# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /workspace/frontend

# Copy dependency manifests first to leverage layer caching
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source code and build it
COPY frontend/ ./
RUN npm run build

# Stage 2: Serve via Node.js backend
FROM node:20-alpine
WORKDIR /workspace/backend

# Add build tools for native dependencies (like sqlite3)
RUN apk add --no-cache python3 make g++ 

# Copy backend manifests and install dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Remove build tools after install to keep image slim
RUN apk del python3 make g++

# Copy backend source code
COPY backend/ ./

# Copy the built frontend static files from Stage 1
# Backend server.js expects it at ../frontend/dist
COPY --from=frontend-builder /workspace/frontend/dist /workspace/frontend/dist

# ─── Persistent data volume ───────────────────────────────────────
# Mount a host directory here so the database (data.db) and uploaded
# media (media/) survive container restarts and re-deploys.
# Example docker run flag: -v /your/host/path:/data
VOLUME ["/data"]

# ─── Environment variables ────────────────────────────────────────
ENV NODE_ENV=production
ENV PORT=3000
# DATA_DIR directs the app to use the persistent volume for DB and media
ENV DATA_DIR=/data
# Optional: LOG_REQUESTS=1 for verbose HTTP logging
ENV LOG_REQUESTS=0
# Security: Override ADMIN_PASSWORD at runtime
ENV ADMIN_PASSWORD=admin123

# Expose the API + UI port
EXPOSE 3000

# Basic healthcheck for container health monitoring
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# Start the Node.js backend application
CMD ["node", "server.js"]
