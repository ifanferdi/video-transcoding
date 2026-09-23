import BaseController from '@/adapters/http/controller/_base-controller';
import {
  CompleteMultipartSchema,
  CreateMultipartSchema,
  FindAllVideoSchema,
  FindByIdVideoSchema,
  PresignPartSchema,
  PresignUploadSchema,
  TriggerTranscodeSchema,
} from '@/validations/video-validation';
import e from 'express';
import asyncHandler from 'express-async-handler';

export default class VideoController extends BaseController {
  /**
   * GET /api/v1/videos — list semua video (job tracking)
   */
  findAll = asyncHandler(async (req: e.Request, res: e.Response) => {
    const params = FindAllVideoSchema.parse(req.query);
    const result = await this.useCases.videoUseCase.findAllVideo.execute(params);

    res.json(result);
  });

  /**
   * GET /api/v1/videos/:id — detail video + status + playback URL
   */
  findOne = asyncHandler(async (req: e.Request, res: e.Response) => {
    const params = FindByIdVideoSchema.parse({ id: Number(req.params.id), ...req.query });

    const result = await this.useCases.videoUseCase.findByIdVideo.execute(params);

    res.json(result);
  });

  /**
   * POST /api/v1/videos — create video record manual
   */
  create = asyncHandler(async (req: e.Request, res: e.Response) => {
    const video = await this.useCases.videoUseCase.createVideo.execute(req.body);

    res.status(201).json(video);
  });

  /**
   * Fase 1 — POST /api/v1/videos/presign
   * Generate presigned PUT URL (single upload, file kecil).
   */
  presignUpload = asyncHandler(async (req: e.Request, res: e.Response) => {
    const body = PresignUploadSchema.parse(req.body);
    const result = await this.useCases.videoUseCase.generatePresignUrl.execute(body);

    res.status(201).json(result);
  });

  /**
   * Fase 5 — POST /api/v1/videos/multipart
   * Init multipart upload untuk file besar → uploadId.
   */
  createMultipart = asyncHandler(async (req: e.Request, res: e.Response) => {
    const body = CreateMultipartSchema.parse(req.body);

    const result = await this.useCases.videoUseCase.createMultipartUpload.execute(body);

    res.status(201).json(result);
  });

  /**
   * Fase 5 — POST /api/v1/videos/:id/multipart/parts/presign
   * Presigned URL untuk part(s) tertentu.
   */
  presignParts = asyncHandler(async (req: e.Request, res: e.Response) => {
    const body = PresignPartSchema.parse(req.body);
    const result = await this.useCases.videoUseCase.presignPartUrl.execute(
      Number(req.params.id),
      body,
    );

    res.json(result);
  });

  /**
   * Fase 5 — POST /api/v1/videos/:id/multipart/complete
   * Complete multipart upload.
   */
  completeMultipart = asyncHandler(async (req: e.Request, res: e.Response) => {
    const body = CompleteMultipartSchema.parse(req.body);
    const result = await this.useCases.videoUseCase.completeMultipartUpload.execute(
      Number(req.params.id),
      body,
    );

    res.json(result);
  });

  /**
   * Fase 1 — POST /api/v1/videos/:id/transcode
   * "Complete upload" → verifikasi file ada → enqueue job transcoding.
   */
  uploadComplete = asyncHandler(async (req: e.Request, res: e.Response) => {
    const body = TriggerTranscodeSchema.parse(req.body || {});
    const result = await this.useCases.videoUseCase.uploadComplete.execute(
      Number(req.params.id),
      body,
    );

    res.status(202).json(result);
  });
}
