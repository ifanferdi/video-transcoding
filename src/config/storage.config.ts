const MULTIPART_THRESHOLD = Number(process.env.UPLOAD_MULTIPART_THRESHOLD) || 100 * 1024 * 1024;
const MULTIPART_CHUNK_SIZE = Number(process.env.UPLOAD_MULTIPART_CHUNK_SIZE) || 10 * 1024 * 1024;
const SINGLE_MAX_SIZE = Number(process.env.UPLOAD_SINGLE_MAX_SIZE) || 1024 * 1024 * 1024;

export default {
  expiredTime: Number(process.env.UPLOAD_PRESIGN_EXPIRES) || 60 * 60, // presign expiry (seconds)
  maxSize: Number(process.env.UPLOAD_SINGLE_MAX_SIZE) || 500 * 1024 * 1024,
  video: {
    types: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'] as const,
    // >= threshold → multipart upload, < threshold → single PUT
    multipartThreshold: MULTIPART_THRESHOLD,
    multipartChunkSize: MULTIPART_CHUNK_SIZE,
    multipartMaxSize: SINGLE_MAX_SIZE,
    minMultipartPartSize: 5 * 1024 * 1024, // S3 min part size (kecuali part terakhir)
  },
  s3: {
    region: process.env.S3_REGION || 'us-east-1',
    accessKeyId: process.env.S3_ACCESS,
    secretAccessKey: process.env.S3_SECRET,
    // endpoint internal — dipakai SDK untuk operasi object (put/get/head/multipart)
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    // endpoint publik — dipakai saat menandatangani URL agar bisa diakses client dari luar
    // (di Docker: internal `http://minio:9000`, publik `http://localhost:9000`)
    publicEndpoint: process.env.S3_PUBLIC_ENDPOINT || process.env.S3_ENDPOINT || 'http://localhost:9000',
    forcePathStyle: true,
    bucket: process.env.S3_BUCKET || 'videos',
  },
};
