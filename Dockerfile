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

# Create the uploads directory for media persistence
RUN mkdir -p uploads

# Copy the built frontend static files from Stage 1
# Backend server.js expects it at ../frontend/dist
COPY --from=frontend-builder /workspace/frontend/dist /workspace/frontend/dist

# Define environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the API and UI internal port
EXPOSE 3000

# Run the backend Application
CMD ["node", "server.js"]
