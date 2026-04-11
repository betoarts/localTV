# syntax=docker/dockerfile:1

# Stage 1: build the React frontend
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: production runtime
# Debian slim is more predictable than Alpine for native Node modules in PaaS
FROM node:20-bookworm-slim
WORKDIR /app/backend

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=3000

# Build tools are needed to install native dependencies such as sqlite3.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./
RUN npm ci --omit=dev

# Remove compilers after dependency install to keep the runtime smaller.
RUN apt-get update \
  && apt-get purge -y --auto-remove python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY backend/ ./

# server.js serves ../frontend/dist in production mode
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

VOLUME ["/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const port=process.env.PORT||3000;require('http').get('http://127.0.0.1:'+port+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
