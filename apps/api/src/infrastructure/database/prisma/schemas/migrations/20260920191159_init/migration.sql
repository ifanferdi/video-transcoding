-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('uploading', 'queued', 'processing', 'ready', 'failed');

-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "status" "VideoStatus" NOT NULL DEFAULT 'uploading',
    "sourceKey" VARCHAR(500) NOT NULL,
    "hlsKey" VARCHAR(500),
    "fileSize" BIGINT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "videos_status_index" ON "videos"("status");

-- CreateIndex
CREATE INDEX "videos_created_at_index" ON "videos"("createdAt");
