# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npx prisma generate && npm run build

# ---- runner ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL="file:/data/arise.db"
RUN mkdir -p /data
COPY --from=build /app ./
EXPOSE 3000
# Applique le schema a la base (volume), seed si vide, puis demarre.
CMD sh -c "npx prisma db push --skip-generate && npx prisma db seed || true; npm run start"
