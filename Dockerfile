FROM node:20.18.0-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

# Imagen de desarrollo (usada por docker compose)
FROM base AS dev
COPY package.json pnpm-lock.yaml ./
COPY scripts/ ./scripts/
RUN pnpm install --frozen-lockfile
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev"]

# Construcción para producción
FROM base AS build
COPY package.json pnpm-lock.yaml ./
COPY scripts/ ./scripts/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Imagen de producción (solo lo necesario para correr)
FROM base AS production
ENV NODE_ENV=production
COPY package.json ./
COPY scripts/ ./scripts/
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "./dist/server.js"]
