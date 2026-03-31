# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /workspace/frontend
# Copy dependency manifests
COPY frontend/package*.json ./
RUN npm install
# Copy frontend source code and build it
COPY frontend/ ./
RUN npm run build

# Stage 2: Serve via Node.js backend
FROM node:20-alpine
WORKDIR /workspace/backend

# Copy the backend code and install dependencies
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./

# Copy the built frontend static files from Stage 1
# Backend server.js expects it at ../frontend/dist
COPY --from=frontend-builder /workspace/frontend/dist /workspace/frontend/dist

# ─── Persistent data volume ───────────────────────────────────────
# Mount a host directory here so the database (data.db) and uploaded
# media (uploads/) survive container restarts and re-deploys.
# Example docker run flag: -v /your/host/path:/data
# Example docker-compose:  volumes: - localtv_data:/data
VOLUME ["/data"]

# ─── Environment variables ────────────────────────────────────────
ENV NODE_ENV=production
ENV PORT=3000
# Point the app to the persistent volume defined above
ENV DATA_DIR=/data
# Override at runtime with a real password:  -e ADMIN_PASSWORD=yourpass
ENV ADMIN_PASSWORD=admin123

# Expose the API + UI port
EXPOSE 3000

# Basic healthcheck for orchestrators
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# Run the backend application
CMD ["node", "server.js"]
