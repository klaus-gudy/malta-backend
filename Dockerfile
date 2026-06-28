# ---- Build stage: compile TypeScript to dist/ ----
FROM node:22-alpine AS builder
WORKDIR /app

# Install all deps (incl. dev) for the build.
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Production stage: lean runtime image ----
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Only production dependencies.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Compiled output from the build stage.
COPY --from=builder /app/dist ./dist

# Run as the built-in non-root user.
USER node

EXPOSE 3030
CMD ["node", "dist/main"]
