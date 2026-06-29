# ---- build ----
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
# On ne copie QUE package.json (jamais le package-lock.json) pour forcer une
# resolution propre sous Linux, quel que soit le lockfile present dans le repo.
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN rm -f package-lock.json; npx prisma generate && npm run build

# ---- runner ----
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL="file:/data/arise.db"
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /data
COPY --from=build /app ./
EXPOSE 3000
CMD sh -c "npx prisma db push --skip-generate && (npx prisma db seed || true) && npm run start"
