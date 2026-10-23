# Video Transcoding

Monorepo deployment: API (`apps/api`) + frontend Next.js (`apps/app`).

## Arsitektur

Semua container berada di satu network privat `video-transcoding` dan saling
memanggil lewat nama service, bukan `localhost`.

```
browser
  ├─ :3000  app  ──(http://api:8100)──►  api
  └─ :8100  api                          ├─ postgres:5432
             │                           ├─ redis:6379
             └──────────────────────────►└─ s3:9000 (MinIO)
  :9001  s3  (S3 API, dipakai presigned URL)
  :9003  s3  (console MinIO)
```

Postgres dan Redis tidak di-publish ke host; hanya `app`, `api`, dan `s3` yang
terbuka karena diakses browser.

## 1. Siapkan env

```sh
cp .env.api.production.example .env.api.production
cp .env.app.production.example .env.app.production
```

Wajib disesuaikan sebelum deploy:

- `UPLOAD_SECRET` di `.env.app.production` — kosong berarti fitur tulis terkunci
  (fail closed). Isi dengan `openssl rand -hex 32`.
- Kredensial Postgres/MinIO dan `S3_ACCESS`/`S3_SECRET`.
- `NEXT_PUBLIC_API_URL` — origin API yang bisa dijangkau browser.
- `S3_PUBLIC_ENDPOINT` — origin S3 yang bisa dijangkau browser (harus sama
  dengan port `9001` yang di-publish, atau domain publik di depannya).
- `CORS_ORIGINS` di `.env.api.production` — origin frontend.

## 2. Jalankan

```sh
docker compose --env-file .env.api.production --env-file .env.app.production up -d --build
```

Compose butuh kedua `--env-file` karena variabel `${...}` di `docker-compose.yml`
diambil dari situ (`env_file:` hanya menyuntik env ke container).

Buka:

- Frontend: http://localhost:3000
- API: http://localhost:8100
- MinIO console: http://localhost:9003

## 3. Update

```sh
git pull
docker compose --env-file .env.api.production --env-file .env.app.production up -d --build
```

## Catatan

- Schema DB disiapkan otomatis oleh service `migrate` (`prisma db push`). Begitu
  repo punya file migrasi, ganti command-nya ke `prisma migrate deploy`.
- `NEXT_PUBLIC_*` di-inline saat build. Setelah mengubahnya, rebuild image `app`
  (bukan hanya restart).
- Transcoding jalan di dalam container `api` (ffmpeg) memakai Redis sebagai queue.
