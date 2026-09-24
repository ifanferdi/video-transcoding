import config from '@/config/storage.config';
import AppError, { ErrorBadRequest } from '@/helpers/error.helper';
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectCommandInput,
  HeadObjectCommand,
  ListPartsCommand,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as mime from 'mime-types';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'stream/promises';

const BUCKET_NAME = config.s3.bucket;
const { region, accessKeyId, secretAccessKey, endpoint, forcePathStyle } = config.s3;

export default class S3StorageRepository {
  private s3Client?: S3Client;

  private getClient() {
    if (!this.s3Client) {
      this.s3Client = new S3Client({
        forcePathStyle,
        region,
        credentials: {
          accessKeyId: accessKeyId || 'minioadmin',
          secretAccessKey: secretAccessKey || 'minioadmin',
        },
        endpoint,
        requestChecksumCalculation: 'WHEN_REQUIRED',
      });
    }

    return this.s3Client;
  }

  async upload(file: Buffer, Key: string) {
    return await this.getClient().send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Body: file,
        Key,
        ContentType: mime.contentType(path.basename(Key)) || undefined,
      }),
    );
  }

  async delete(path: string) {
    try {
      await this.getClient().send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: path }));
    } catch (err) {
      console.error('Error deleting file directory', err);
    }
  }

  async isExist(path: string) {
    try {
      await this.getClient().send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: path }));
      return true;
    } catch (error) {
      return false;
    }
  }

  async getUrl(path: string, expiresIn = config.expiredTime) {
    const options: GetObjectCommandInput = { Bucket: BUCKET_NAME, Key: path };

    return await getSignedUrl(this.getClient(), new GetObjectCommand(options), {
      expiresIn /** seconds */,
    });
  }

  async getPresignUrl(Key: string, size: number, expiresIn = config.expiredTime) {
    const command: PutObjectCommandInput = {
      Bucket: BUCKET_NAME,
      Key,
      ContentType: mime.contentType(path.basename(Key)) || undefined,
    };

    return await getSignedUrl(this.getClient(), new PutObjectCommand(command), {
      expiresIn /** seconds */,
    });
  }

  // ============================================
  // Multipart Upload — untuk file besar
  // ============================================

  async createMultipartUpload(Key: string, contentType?: string) {
    const result = await this.getClient().send(
      new CreateMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key,
        ContentType: contentType || mime.contentType(path.basename(Key)) || undefined,
      }),
    );

    return result.UploadId!;
  }

  async presignPartUrl(
    Key: string,
    UploadId: string,
    partNumber: number,
    expiresIn = config.expiredTime,
  ) {
    const command = new UploadPartCommand({
      Bucket: BUCKET_NAME,
      Key,
      UploadId,
      PartNumber: partNumber,
    });

    return await getSignedUrl(this.getClient(), command, { expiresIn });
  }

  async completeMultipartUpload(
    Key: string,
    UploadId: string,
    parts: Array<{ partNumber: number; etag: string }>,
  ) {
    if (parts.length === 0) throw new ErrorBadRequest('No parts to complete.');

    const sorted = [...parts].sort((a, b) => a.partNumber - b.partNumber);

    return await this.getClient().send(
      new CompleteMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key,
        UploadId,
        MultipartUpload: {
          Parts: sorted.map((part) => ({ ETag: part.etag, PartNumber: part.partNumber })),
        },
      }),
    );
  }

  async abortMultipartUpload(Key: string, UploadId: string) {
    try {
      await this.getClient().send(
        new AbortMultipartUploadCommand({ Bucket: BUCKET_NAME, Key, UploadId }),
      );
    } catch (err) {
      console.error('Error aborting multipart upload', err);
    }
  }

  async listParts(Key: string, UploadId: string) {
    const result = await this.getClient().send(
      new ListPartsCommand({ Bucket: BUCKET_NAME, Key, UploadId }),
    );

    return (result.Parts || []).map((part) => ({
      partNumber: part.PartNumber!,
      etag: part.ETag!,
      size: part.Size!,
    }));
  }

  /**
   * Download 1 object dari S3, tulis langsung ke disk lokal
   * (streaming, bukan load semua ke memory — penting untuk file video besar).
   */
  async downloadFile(key: string, destPath: string): Promise<void> {
    const result = await this.getClient().send(
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
    );

    if (!result.Body) throw new AppError(`Object tidak ditemukan atau kosong: ${key}`);

    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const writeStream = fs.createWriteStream(destPath);

    // result.Body dari AWS SDK v3 adalah Node.js Readable stream
    // (di environment Node; beda tipe kalau di browser/edge)
    await finished((result.Body as Readable).pipe(writeStream));
  }

  /**
   * Upload seluruh isi folder (rekursif) ke S3 dengan prefix tertentu.
   * Dipakai untuk upload hasil transcoding: folder lokal berisi
   * master.m3u8 + subfolder per rendition (1080p/, 720p/, dst)
   * di-mirror strukturnya persis ke S3 key prefix.
   */
  async uploadDirectory(localDir: string, keyPrefix: string): Promise<void> {
    const entries = fs.readdirSync(localDir, { withFileTypes: true });

    for (const entry of entries) {
      const localPath = path.join(localDir, entry.name);
      const key = `${keyPrefix}/${entry.name}`;

      if (entry.isDirectory()) {
        // rekursif untuk subfolder rendition (1080p/, 720p/, dst)
        await this.uploadDirectory(localPath, key);
      } else {
        const fileBuffer = fs.readFileSync(localPath);
        await this.upload(fileBuffer, key);
      }
    }
  }
}
