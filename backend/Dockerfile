# Development
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

# Test
FROM development AS test
CMD ["npm", "test"]

# Production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
# Install only production deps
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY src ./src
# Run as non-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 && chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 3001
CMD ["node", "src/server.js"]
