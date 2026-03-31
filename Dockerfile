# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy manifests first
COPY frontend/package*.json ./
RUN npm ci

# Copy source and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Serve via Node.js backend
FROM node:20-alpine
WORKDIR /app/backend

# libc6-compat is often needed for native modules (sqlite3) on Alpine
RUN apk add --no-cache libc6-compat python3 make g++ 

# Backend setup
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Clean up build tools (but keep libc6-compat for runtime)
RUN apk del python3 make g++

# Copy backend source
COPY backend/ ./

# Copy built frontend from Stage 1
# server.js searches in ../frontend/dist
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# ─── Environment & Volumes ────────────────────────────────────────
ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3000
ENV ADMIN_PASSWORD=admin123

VOLUME ["/data"]
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# Start
CMD ["node", "server.js"]
