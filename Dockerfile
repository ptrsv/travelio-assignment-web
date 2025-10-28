# Frontend Dockerfile (for Vite projects)
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application (Vite outputs to 'dist' folder)
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files to nginx (Vite uses 'dist' not 'build')
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
