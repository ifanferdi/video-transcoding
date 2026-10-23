# syntax=docker/dockerfile:1

# ============================================================
# Stage 1 — builder
# Install deps, generate Prisma client, compile TypeScript
# ============================================================
FROM oven/bun:1 AS builder

WORKDIR /app

# Manifest dulu → layer cache optimal saat source berubah
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Prisma schema + config diperlukan untuk `prisma generate`
COPY prisma.config.ts tsconfig.json ./
COPY src/config ./src/config
COPY src/infrastructure/database/prisma/schemas ./src/infrastructure/database/prisma/schemas
RUN bunx prisma generate

# Source lengkap + compile
COPY . .
RUN bun run build


# ============================================================
# Stage 2 — runner
# Hanya artifact runtime: dist, node_modules, prisma generated
# ============================================================
FROM oven/bun:1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV APP_ENV=production

# FFmpeg untuk transcoding.
# @ffmpeg-installer/ffmpeg menyediakan binary bundel, tapi kita tetap
# install ffmpeg sistem sebagai fallback agar path pasti tersedia.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd -r app && useradd -r -g app -m -d /home/app app

# Runtime artifacts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/config ./src/config
COPY --from=builder /app/src/infrastructure/database/prisma/schemas ./src/infrastructure/database/prisma/schemas
COPY --from=builder /app/src/infrastructure/database/prisma/generated ./src/infrastructure/database/prisma/generated
COPY --from=builder /app/src/infrastructure/database/migrations ./src/infrastructure/database/migrations

# Tmp dir untuk proses transcoding (dipakai os.tmpdir()/transcode-jobs)
RUN mkdir -p /tmp/transcode-jobs && chown -R app:app /app /tmp/transcode-jobs

USER app

EXPOSE 8100

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD bun -e "fetch('http://127.0.0.1:8100/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "dist/app.js"]
