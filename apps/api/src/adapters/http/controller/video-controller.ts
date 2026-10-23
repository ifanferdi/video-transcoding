import BaseController from '@/adapters/http/controller/_base-controller';
import { BaseFindById } from '@/validations/base-validation';
import {
  CompleteMultipartSchema,
  CreateMultipartSchema,
  FindAllVideoSchema,
  FindByIdVideoSchema,
  PresignPartSchema,
  PresignUploadSchema,
} from '@/validations/video-validation';
import e from 'express';
import asyncHandler from 'express-async-handler';

export default class VideoController extends BaseController {
  findAll = asyncHandler(async (req: e.Request, res: e.Response) => {
    const params = FindAllVideoSchema.parse(req.query);
    const result = await this.useCases.videoUseCase.findAllVideo.execute(params);

    res.json(result);
  });

  findOne = asyncHandler(async (req: e.Request, res: e.Response) => {
    const params = FindByIdVideoSchema.parse({ id: Number(req.params.id), ...req.query });

    const result = await this.useCases.videoUseCase.findByIdVideo.execute(params);

    res.json(result);
  });

  presignUpload = asyncHandler(async (req: e.Request, res: e.Response) => {
    const body = PresignUploadSchema.parse(req.body);
    const result = await this.useCases.videoUseCase.generatePresignUrl.execute(body);

    res.status(201).json(result);
  });

  createMultipart = asyncHandler(async (req: e.Request, res: e.Response) => {
    const body = CreateMultipartSchema.parse(req.body);

    const result = await this.useCases.videoUseCase.GenerateMultipartPresignUrl.execute(body);

    res.status(201).json(result);
  });

  presignParts = asyncHandler(async (req: e.Request, res: e.Response) => {
    const body = PresignPartSchema.parse(req.body);
    const result = await this.useCases.videoUseCase.presignPartUrl.execute(
      Number(req.params.id),
      body,
    );

    res.json(result);
  });

  completeMultipart = asyncHandler(async (req: e.Request, res: e.Response) => {
    const body = CompleteMultipartSchema.parse(req.body);
    const result = await this.useCases.videoUseCase.completeMultipartUpload.execute(
      Number(req.params.id),
      body,
    );

    res.json(result);
  });

  completeUpload = asyncHandler(async (req: e.Request, res: e.Response) => {
    const result = await this.useCases.videoUseCase.completeUpload.execute(Number(req.params.id));

    res.status(202).json(result);
  });

  deleteVideo = asyncHandler(async (req: e.Request, res: e.Response) => {
    const { id } = BaseFindById.parse({ id: req.params.id });
    const result = await this.useCases.videoUseCase.deleteVideo.execute(id);

    res.status(202).json(result);
  });

  realtimeProgress = asyncHandler(async (_req: e.Request, res: e.Response) => {
    // ------------------------------------------------------
    // 1. Setup response header untuk SSE
    // ------------------------------------------------------
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Kalau ada Nginx di depan, header ini mencegah Nginx buffering
    // response (yang bisa bikin event nunggu numpuk dulu baru terkirim)
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    await this.useCases.videoUseCase.realtimeProgressVideo.execute({ res });
  });
}
