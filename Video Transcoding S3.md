# PRD: Video Upload & Adaptive Streaming Pipeline

## 1. Ringkasan

Fitur upload video dengan transcoding otomatis ke beberapa kualitas resolusi, disimpan di S3-compatible storage, dan diputar di client dengan adaptive bitrate streaming (ABR) — sehingga kualitas video menyesuaikan kecepatan koneksi user secara otomatis, atau bisa dipilih manual.

## 2. Latar Belakang & Tujuan

- User saat ini upload video tanpa optimasi kualitas/ukuran berdasarkan kondisi jaringan.
- Dibutuhkan pipeline yang: (1) upload efisien langsung ke storage, (2) transcode ke beberapa rendition kualitas, (3) putar dengan ABR di client.

**Tujuan:**
- Video dapat diputar lancar di berbagai kondisi jaringan (downgrade otomatis saat koneksi lambat).
- Proses upload tidak membebani backend API (upload langsung ke storage via presigned URL).
- Proses transcoding berjalan async, tidak blocking request user.

## 3. Scope

### In-scope
- Presigned URL upload (single & multipart) ke S3-compatible storage.
- Transcoding job (Golang worker) yang generate multi-rendition HLS.
- Playback di client (Next.js/React) dengan adaptive bitrate + manual quality selector.
- Job status tracking (uploading → processing → ready → failed).

### Out-of-scope (fase awal)
- DRM/content protection.
- Live streaming (fokus VOD/on-demand saja).
- Video editing (trim, watermark, dll).

## 4. Arsitektur Teknis

```
Client → Presigned URL → S3-compatible Storage (MinIO/RustFS)
                              ↓ (event/webhook)
                         RabbitMQ Queue
                              ↓
                Golang Transcoding Worker (FFmpeg)
                              ↓
       Multi-rendition HLS output → Storage
                              ↓
                Update job status di DB
                              ↓
       Client fetch master.m3u8 → video.js (ABR playback)
```

### 4.1 Storage
- **MinIO** atau **RustFS**, dijalankan lokal via Docker, S3-compatible API.
- Struktur folder output:
  ```
  videos/{video_id}/
    master.m3u8
    1080p/playlist.m3u8, segment*.ts
    720p/...
    480p/...
    360p/...
  ```

### 4.2 Upload Flow
- Backend generate presigned URL (PUT untuk file kecil, multipart untuk file besar) menggunakan AWS SDK for Go.
- Client upload langsung ke storage tanpa lewat backend.
- Setelah upload selesai, client memanggil endpoint "complete upload" untuk trigger job transcoding.

### 4.3 Transcoding Worker (Golang)
- Worker berjalan sebagai consumer RabbitMQ.
- Spawn proses FFmpeg (`os/exec`) untuk generate multi-rendition HLS dari source video.
- Rendition ladder default: 1080p (5000k), 720p (2800k), 480p (1400k), 360p (800k) — disesuaikan dengan resolusi source.
- Worker pool dengan goroutine + semaphore untuk membatasi jumlah job paralel sesuai kapasitas CPU.
- Upload hasil transcode (manifest + segments) kembali ke storage.
- Update status job di database (progress %, status akhir).

### 4.4 Playback Client
- Next.js/React menggunakan **video.js** dengan plugin **videojs-http-streaming (VHS)** untuk HLS playback.
- ABR otomatis oleh video.js berdasarkan bandwidth measurement.
- Quality selector manual (override ABR) menggunakan level API dari VHS.

## 5. Alur Data / Status Job

| Status | Deskripsi |
|---|---|
| `uploading` | Presigned URL sudah dibuat, menunggu upload client selesai |
| `queued` | Upload selesai, job masuk antrian RabbitMQ |
| `processing` | Worker sedang transcode, progress % tersimpan |
| `ready` | Semua rendition selesai, manifest tersedia |
| `failed` | Transcoding gagal, perlu retry/investigasi |

## 6. Functional Requirements

1. Sistem dapat generate presigned URL (single & multipart) untuk upload video ke storage.
2. Sistem dapat menerima notifikasi "upload complete" dan memicu job transcoding.
3. Worker dapat men-transcode video source menjadi minimal 3 rendition kualitas dalam format HLS.
4. Sistem dapat menyimpan dan mengekspos status job (termasuk progress) ke client.
5. Client dapat memutar video dengan ABR otomatis menggunakan video.js.
6. Client dapat memilih kualitas video secara manual, override ABR.
7. Sistem menangani kegagalan transcoding dengan status `failed` dan mekanisme retry.

## 7. Non-Functional Requirements

- Upload tidak membebani backend API (langsung ke storage).
- Transcoding job dapat di-scale horizontal dengan menambah worker instance.
- Playback tetap berjalan (tanpa buffering signifikan) pada kondisi penurunan bandwidth.

## 8. Tech Stack

| Layer | Teknologi |
|---|---|
| Storage | MinIO / RustFS (S3-compatible, lokal via Docker) |
| Queue | RabbitMQ |
| Transcoding Worker | Golang + FFmpeg (via `os/exec`) |
| Streaming Format | HLS |
| Client Player | Next.js/React + video.js + videojs-http-streaming |

## 9. Open Questions

- Rendition ladder final (jumlah & bitrate tiap level) — perlu disesuaikan dengan tipe konten dan target audiens.
- Mekanisme retry untuk job transcoding yang gagal (jumlah percobaan, backoff strategy).
- Apakah butuh progress real-time ke client (Socket.IO) atau cukup polling status.
- Strategi cleanup source file mentah setelah transcoding selesai (retensi storage).

## 10. Milestone Usulan

1. **Fase 1** — Presigned upload (single file) + endpoint trigger job.
2. **Fase 2** — Golang worker: transcode FFmpeg ke HLS multi-rendition + upload hasil ke storage.
3. **Fase 3** — Client playback dengan video.js + ABR.
4. **Fase 4** — Manual quality selector + job status/progress tracking.
5. **Fase 5** — Multipart upload untuk file besar + retry mechanism.
