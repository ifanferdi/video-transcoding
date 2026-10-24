<a id="readme-top"></a>

# Video Transcoding — Upload & Adaptive Streaming Pipeline

Upload a video and it is automatically transcoded into several HLS qualities
through a worker queue, then played back in the browser with adaptive bitrate
streaming.

<!--
Docs under apps/*/docs are mostly written in Indonesian.
-->

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Bun](https://img.shields.io/badge/Bun-1-000000?logo=bun&logoColor=white)](https://bun.sh)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-000000?logo=ffmpeg&logoColor=white)](https://ffmpeg.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose)

<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a>
      <ul><li><a href="#built-with">Built With</a></li></ul>
    </li>
    <li><a href="#architecture">Architecture</a></li>
    <li><a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#local-development">Local Development</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#configuration">Configuration</a></li>
    <li><a href="#known-limitations">Known Limitations</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#documentation">Documentation</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

## About The Project

Uploaded videos are rarely optimized for network conditions: large files stall
on slow connections, and transcoding them inside the request cycle turns the
backend into a bottleneck. This project solves both:

1. **Uploads never pass through the API.** The backend only issues a presigned
   URL; the binary goes straight to object storage, so large files never load
   the API.
2. **Transcoding is asynchronous.** Jobs enter a BullMQ queue and are processed
   by an FFmpeg worker outside the request cycle — users don't wait.
3. **Playback is adaptive.** Video is transcoded into a 144p–1080p HLS ladder
   and played with video.js: quality follows available bandwidth automatically,
   or can be picked manually.

The web app is a single page (`/`) with no login: anyone can watch, while write
actions (upload & delete) are locked behind an `UPLOAD_SECRET` cookie gate.

**Web features:**

| Feature            | Details                                                                   |
| ------------------ | ------------------------------------------------------------------------- |
| Video card grid    | Thumbnail, title, duration, status badge + transcoding progress           |
| Upload             | Drag & drop + browse, type/size validation, real-time progress bar        |
| Thumbnail picker   | Scrub the timeline to pick the poster frame before uploading              |
| Player dialog      | video.js with **Auto** quality plus manual **144p–1080p** selection       |
| Real-time progress | SSE (`preparing → processing → finishing`) with polling fallback          |
| Unlock/Lock gate   | Cookie gate for write actions (fail closed when `UPLOAD_SECRET` is empty) |
| Delete             | Removes the video and every transcoding artifact                          |

### Built With

| Layer           | Technology                                                              |
| --------------- | ----------------------------------------------------------------------- |
| Web             | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4          |
| Web — data      | TanStack Query, axios (BFF server actions), Zod                         |
| Web — player    | video.js 8 + `videojs-contrib-quality-menu`, Radix Slider, lucide-react |
| API             | Bun + TypeScript, Express 4, Zod                                        |
| API — data      | Prisma 7 (`@prisma/adapter-pg`) + PostgreSQL 17                         |
| API — jobs      | BullMQ 6 (Redis) + FFmpeg (`fluent-ffmpeg`, bundled binary)             |
| API — storage   | `@aws-sdk/client-s3` + `s3-request-presigner` (S3-compatible)           |
| API — real-time | SSE + Redis Pub/Sub (multi-replica safe, no sticky sessions)            |
| API — tooling   | Bull-Board at `/admin/queues`, morgan                                   |
| Infra           | Docker Compose, Silo (S3-compatible storage)                            |

## Architecture

All containers sit on one private `video-transcoding` network and call each
other by service name.

```
browser ──► app (:3000, Next.js) ──(http://api:8100)──► api (:8100)
   │                                                        │
   │  presigned PUT (binary direct, never through the api)  ├─► postgres:5432
   └──────────────────────────► s3 (:9001 S3 API) ◄─────────┤
                                  │                         │
                                  │  BullMQ (Redis)         ├─► redis:6379
                                  ▼                         │
                        transcode worker (FFmpeg)           │
                        in-process with the api ────────────┘
                                  │
                                  ▼
                  multi-rendition HLS + thumbnail ──► s3
```

| Service    | Image                | Host port                 | Role                                                                                 |
| ---------- | -------------------- | ------------------------- | ------------------------------------------------------------------------------------ |
| `app`      | build `apps/app`     | 3000                      | Next.js web (BFF: server actions + SSE proxy)                                        |
| `api`      | build `apps/api`     | 8100                      | Express API **plus** BullMQ workers (`transcode.jobs`, `delete.jobs`) in one process |
| `postgres` | `postgres:17-alpine` | —                         | Database (Prisma). Schema prepared by the `migrate` service                          |
| `redis`    | `redis:7-alpine`     | —                         | BullMQ backend, SSE progress Pub/Sub, upload session cache                           |
| `s3`       | `pgsty/silo`         | 9001 (S3), 9003 (console) | S3-compatible object storage                                                         |
| `s3-init`  | `pgsty/silo` (mc)    | —                         | Creates the `video-transcoding` bucket + anonymous download                          |
| `migrate`  | `api` image          | —                         | One-shot `prisma db push` before the API starts                                      |

Postgres and Redis are not published to the host; only `app`, `api`, and `s3`
are exposed because the browser needs them.

**Upload flow:**

| #   | Stage     | Endpoint                              | What happens                                                        |
| --- | --------- | ------------------------------------- | ------------------------------------------------------------------- |
| 1   | Presign   | `POST /api/v1/videos/presign`         | Video record created (`uploading`) + presigned PUT URL              |
| 2   | Upload    | `PUT presignUrl`                      | Binary goes straight to storage — `Content-Type` must match exactly |
| 3   | Complete  | `POST /api/v1/videos/:id/complete`    | Transcode job is queued (`queued`)                                  |
| 4   | Transcode | FFmpeg worker                         | Multi-rendition HLS + thumbnail, then the original video is deleted |
| 5   | Progress  | SSE `GET /api/v1/sse/videos/progress` | `queued → processing → ready` (or `failed`)                         |
| 6   | Playback  | `GET /api/v1/videos/:id`              | `playback: { masterUrl, thumbnailUrl, expiresIn }` (signed URLs)    |

**Video status:** `uploading` → `queued` → `processing` → `ready` | `failed`.
**SSE progress stages:** `preparing` → `processing` → `finishing` (or `failed`).

**Object layout in storage:**

```
videos/source/2026/<uuid>.mp4      # original upload (presigned PUT target)
videos/output/<uuid>/master.m3u8   # HLS master playlist
videos/output/<uuid>/1080p/playlist.m3u8 + segment000.ts …
videos/output/<uuid>/720p/ … 480p/ … 360p/ … 240p/ … 144p/ …
videos/output/<uuid>/thumbnail.jpg # poster from the frame the user picked
```

**Rendition ladder** (H.264 `libx264` main profile, AAC stereo, HLS VOD,
6-second `.ts` segments):

| Resolution | Dimensions | Video     | Audio    |
| ---------- | ---------- | --------- | -------- |
| 1080p      | 1920×1080  | 5000 kbps | 192 kbps |
| 720p       | 1280×720   | 2800 kbps | 128 kbps |
| 480p       | 854×480    | 1400 kbps | 128 kbps |
| 360p       | 640×360    | 800 kbps  | 96 kbps  |
| 240p       | 426×240    | 400 kbps  | 64 kbps  |
| 144p       | 256×144    | 200 kbps  | 64 kbps  |

> **No upscaling.** Renditions higher than the source resolution are dropped
> automatically — a 360p video is only transcoded to 144p/240p/360p — so the
> pipeline never fabricates quality above the original.

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose v2
- [Bun](https://bun.sh) — only needed to run the apps outside Docker

### Installation

```sh
git clone https://github.com/ifanferdi/video-transcoding.git
cd video-transcoding

cp .env.api.example .env.api
cp .env.app.example .env.app
```

Before starting, set `UPLOAD_SECRET` in `.env.app` (empty means write actions
stay locked):

```sh
openssl rand -hex 32   # put the result in UPLOAD_SECRET
```

Then run:

```sh
docker compose --env-file .env.api --env-file .env.app up -d --build
```

Both `--env-file` flags are required because the `${...}` variables in
`docker-compose.yml` are interpolated from them (`env_file:` only injects env
into containers).

Open:

| URL                                | Application                         |
| ---------------------------------- | ----------------------------------- |
| http://localhost:3000              | Web app                             |
| http://localhost:8100              | API (`GET /` → `{ name, version }`) |
| http://localhost:8100/admin/queues | Bull-Board (job dashboard)          |
| http://localhost:9003              | Storage console (MinIO-compatible)  |

**Updating a deployment:**

```sh
git pull
docker compose --env-file .env.api --env-file .env.app up -d --build
```

> `NEXT_PUBLIC_*` values are inlined at build time when the `app` image is
> built — after changing them, rebuild (the command above does that) rather
> than just restarting.

### Local Development

Run the infrastructure through compose and the apps directly on the host:

```sh
docker compose --env-file .env.api --env-file .env.app up -d postgres redis s3 s3-init migrate
```

**API** — copy `apps/api/.env.example` to `apps/api/.env` (loaded via dotenv)
and use values matching the ports published by the compose file above:

```sh
APP_PORT=8100
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/video_transcoding
REDIS_URL=redis://localhost:6379
S3_REGION=us-east-1
S3_ACCESS=minioadmin
S3_SECRET=minioadmin
S3_ENDPOINT=http://localhost:9001
S3_PUBLIC_ENDPOINT=http://localhost:9001
S3_BUCKET=video-transcoding
CORS_ORIGINS=http://localhost:3000
```

```sh
cd apps/api
bun install
bun run dev          # hot reload
```

**Web** — the default `NEXT_PUBLIC_API_URL` is already `http://localhost:8100`,
so no env file is needed to run it locally:

```sh
cd apps/app
bun install
bun run dev
```

Common commands:

| Command                        | Location                | Purpose                                                                                 |
| ------------------------------ | ----------------------- | --------------------------------------------------------------------------------------- |
| `bun run dev`                  | `apps/api` / `apps/app` | Dev server                                                                              |
| `bun run build`                | `apps/api` / `apps/app` | Production build (`apps/api`: typecheck + bundle to `dist/`)                            |
| `bun start`                    | `apps/api` / `apps/app` | Run the build output                                                                    |
| `bun run typecheck`            | `apps/api`              | `tsc --noEmit`                                                                          |
| `bun run lint`                 | `apps/app`              | ESLint                                                                                  |
| `bunx prettier --write <file>` | anywhere                | Format **specific files** — never run it without arguments, it reformats the whole repo |
| `bun run db:migrate`           | `apps/api`              | Create a Prisma migration                                                               |
| `bun run db:deploy`            | `apps/api`              | Apply migrations                                                                        |
| `bun run db:seed`              | `apps/api`              | Seed the database                                                                       |
| `bun run db:studio`            | `apps/api`              | Prisma Studio                                                                           |

## Usage

Client-side flow:

1. `POST /api/v1/videos/presign` with `filename`, `fileType: "video"`,
   `contentType`, `fileSize`, and `thumbnailTimestamp` (seconds into the video
   for the poster frame, 0–500, clamped to the video duration). The response
   contains the video record plus `upload: { key, method, presignUrl, expiresAt }`.
2. `PUT` the file to `presignUrl` with the **exact same** `Content-Type` header
   — straight to storage, never through the API.
3. `POST /api/v1/videos/:id/complete` → `202` with `status: "queued"`.
4. Watch progress over SSE `GET /api/v1/sse/videos/progress` (events
   `{ id, status, percent, updatedAt }`, distributed via Redis Pub/Sub), with a
   polling fallback on the video list.
5. Once `ready`, `GET /api/v1/videos/:id` returns `playback` with `masterUrl`
   and `thumbnailUrl` (signed, valid 1 hour) for video.js.

### API Endpoints

Base URL: `http://localhost:8100`. JSON bodies everywhere, no authentication.

| Method   | Endpoint                                                                                                          | Purpose                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `GET`    | `/`                                                                                                               | Health check → `{ name, version }`                                               |
| `GET`    | `/api/v1/videos`                                                                                                  | List + filter (`page`, `limit`, `status`, `columns`, `ids`, `search`, `orderBy`) |
| `GET`    | `/api/v1/videos/:id`                                                                                              | Detail + signed `playback` once `ready`                                          |
| `POST`   | `/api/v1/videos/presign`                                                                                          | Create record + presigned single-upload URL                                      |
| `POST`   | `/api/v1/videos/:id/complete`                                                                                     | Mark upload done, enqueue transcode → `202`                                      |
| `GET`    | `/api/v1/sse/videos/progress`                                                                                     | SSE real-time progress of all active jobs                                        |
| `DELETE` | `/api/v1/videos/:id`                                                                                              | Delete the video and every transcoding artifact                                  |
| `GET`    | `/admin/queues`                                                                                                   | Bull-Board (HTML, debugging)                                                     |
| `POST`   | `/api/v1/videos/multipart`, `/api/v1/videos/:id/multipart/parts/presign`, `/api/v1/videos/:id/multipart/complete` | Multipart upload — **not ready for use**, see Known Limitations                  |

The full request/response contract lives in `apps/api/docs/postman.collection.json`.

## Configuration

### API (`.env.api`)

| Var                                                          | Default                           | Description                                               |
| ------------------------------------------------------------ | --------------------------------- | --------------------------------------------------------- |
| `APP_NAME` / `APP_VERSION`                                   | `Video Transcoding API` / `1.0.0` | App identity                                              |
| `APP_ENV`                                                    | `development`                     | `development` \| `staging` \| `production`                |
| `APP_PORT` / `APP_URL`                                       | `8100` / `http://localhost:8100`  | API port & origin                                         |
| `DATABASE_URL`                                               | —                                 | PostgreSQL connection string                              |
| `REDIS_URL`                                                  | `redis://localhost:6381`          | Redis connection (BullMQ + Pub/Sub)                       |
| `REDIS_TTL_SECONDS`                                          | `21600`                           | TTL of the active-progress snapshot                       |
| `S3_REGION` / `S3_ACCESS` / `S3_SECRET`                      | `us-east-1` / —                   | S3 credentials                                            |
| `S3_ENDPOINT`                                                | `http://localhost:9000`           | **Internal** endpoint (used by the SDK inside containers) |
| `S3_PUBLIC_ENDPOINT`                                         | `= S3_ENDPOINT`                   | **Public** endpoint (used to sign URLs the browser opens) |
| `S3_BUCKET`                                                  | `videos`                          | Bucket name                                               |
| `UPLOAD_SINGLE_MAX_SIZE`                                     | `524288000` (500 MB)              | Single PUT upload limit                                   |
| `UPLOAD_MULTIPART_THRESHOLD` / `UPLOAD_MULTIPART_CHUNK_SIZE` | 100 MB / 10 MB                    | Multipart threshold & chunk size                          |
| `UPLOAD_PRESIGN_EXPIRES`                                     | `3600`                            | Presigned URL lifetime (seconds)                          |
| `DEFAULT_THUMBNAIL_TIMESTAMP`                                | `0`                               | Default thumbnail frame                                   |
| `CORS_ORIGINS`                                               | `http://localhost:3000`           | Allowed frontend origins (comma-separated)                |

### Web (`.env.app`)

| Var                     | Default                 | Description                                                                 |
| ----------------------- | ----------------------- | --------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`   | `http://localhost:8100` | API origin used by the browser **and**, today, by server actions            |
| `API_INTERNAL_URL`      | —                       | Reserved for container-to-container calls, **not read** by the code yet     |
| `UPLOAD_SECRET`         | `""`                    | _(server-only)_ Write-gate secret. Empty = gate always locked (fail closed) |
| `UPLOAD_KEY_TTL`        | `3600`                  | _(server-only)_ Gate cookie TTL (seconds)                                   |
| `NEXT_PUBLIC_PROFILE_*` | `""`                    | Author profile (name, email, role, location, social links)                  |

Notes:

- `NEXT_PUBLIC_*` values are inlined at build time, not read at runtime.
- The web client hardcodes a 500 MB upload cap (`UPLOAD_SINGLE_MAX_SIZE` in
  `apps/app/src/config/config.ts`) — lower than the server limit if you raise
  `UPLOAD_SINGLE_MAX_SIZE` in `.env.api`.
- Accepted video types: `video/mp4`, `video/webm`, `video/quicktime`,
  `video/x-matroska`.
- Failed jobs are retried **3× with exponential backoff** (starting at 5
  seconds), then marked `failed` with the error message on the video record.
- SSE sends a `: heartbeat` comment every 30 seconds — ignore it. Behind a
  reverse proxy, disable response buffering (Nginx: `proxy_buffering off;`).

## Known Limitations

- **Multipart upload is not ready.** The server exposes the endpoints, but
  `multipart/complete` is still broken (`uploadId does not belong to this
video`) and the client doesn't use them. Use the single PUT flow for now.
- **The API and the transcoding workers share one process** (`bun dist/app.js`).
  Fine for dev and small scale; scaling means running more API+worker
  instances, bounded by CPU capacity.
- **No user authentication.** Everyone can watch; write actions are protected
  only by the `UPLOAD_SECRET` cookie gate.
- **The bucket is created with anonymous download** so HLS segments load
  directly in the player — treat bucket contents as public.
- **Single PUT uploads are capped at 500 MB** in the client (raise the server
  limit with `UPLOAD_SINGLE_MAX_SIZE`, but multipart is the right solution for
  larger files).

## Roadmap

- [x] Presigned upload (single file) + transcode trigger endpoint
- [x] FFmpeg worker: 144p–1080p multi-rendition HLS + thumbnail + no upscaling
- [x] Adaptive video.js playback (ABR) + manual quality selector
- [x] Real-time job status & progress (SSE via Redis Pub/Sub, polling fallback)
- [x] Thumbnail picker before upload + delete with artifact cleanup
- [ ] Multipart upload for large files + `multipart/complete` fix
- [ ] Author profile dialog (spec in `apps/app/docs/about-me.md`)
- [ ] Transcoding workers as a separate process/service for horizontal scaling
- [ ] Move from `prisma db push` to migration files (`prisma migrate deploy`)

**Out of scope** (deliberately not built): DRM/content protection, live
streaming, video editing (trim, watermark, etc.), and user login.

## Documentation

Design notes and contracts live inside each app:

| File                                    | Contents                                     | Status                                     |
| --------------------------------------- | -------------------------------------------- | ------------------------------------------ |
| `apps/api/docs/postman.collection.json` | Full API contract                            | ✅ Source of truth                         |
| `apps/api/docs/api-client.md`           | Client integration guide                     | ⚠️ Partially stale (response shapes & SSE) |
| `apps/api/docs/e2e-test-plan.md`        | E2E test plan (Playwright)                   | ✅                                         |
| `apps/api/docs/e2e-tahap-1-report.md`   | E2E stage 1 results report                   | ✅                                         |
| `apps/api/docs/Video Transcoding S3.md` | Early PRD                                    | ⚠️ Partially stale (stack & ladder)        |
| `apps/app/docs/PRD.md`                  | Requirements, architecture, milestones       | ✅                                         |
| `apps/app/docs/API-DIFFS.md`            | Contract reconciliation + final domain types | ✅ Follow this                             |
| `apps/app/docs/PLANNING.md`             | Frontend per-file execution plan             | ✅                                         |
| `apps/app/docs/thumbnail-picker.md`     | Thumbnail picker spec                        | ✅ Implemented                             |
| `apps/app/docs/about-me.md`             | Author profile dialog spec                   | ⏳ Not implemented yet                     |
| `apps/app/docs/API-SPECS.md`            | Legacy API notes                             | ⚠️ Stale — superseded by `API-DIFFS.md`    |

## Contributing

Contributions are very welcome. The usual flow:

1. Fork & clone the repo
2. Create a branch: `git checkout -b feature/AmazingFeature`
3. Commit: `git commit -m 'Add AmazingFeature'`
4. Push: `git push origin feature/AmazingFeature`
5. Open a Pull Request

Bug reports, documentation fixes, and feature ideas via
[Issues](https://github.com/ifanferdi/video-transcoding/issues) help a lot too.

## License

No license file is present in this repo yet — treat it as all rights reserved
until one is added.

## Contact

Ifan Ferdiansyah — [@ifanferdi](https://github.com/ifanferdi) — ifanferdi7@gmail.com

Project link: [github.com/ifanferdi/video-transcoding](https://github.com/ifanferdi/video-transcoding)

## Acknowledgments

- [FFmpeg](https://ffmpeg.org) — transcoding & thumbnail extraction
- [video.js](https://videojs.com) + VHS — HLS playback with ABR
- [BullMQ](https://docs.bullmq.io) & [Bull-Board](https://github.com/felixmosh/bull-board) — job queue & dashboard
- [Best README Template](https://github.com/othneildrew/best-readme-template) — the structure of this README

<p align="right">(<a href="#readme-top">back to top</a>)</p>
