import TranscodeJobListener from '@/use-cases/transcode/transcode-job-listener';
import CreateVideo from '@/use-cases/video/create-video';
import FindAllVideo from '@/use-cases/video/find-all-video';
import FindByIdVideo from '@/use-cases/video/find-by-id-video';
import CompleteMultipartUpload from '@/use-cases/video/upload/complete-multipart-upload';
import CreateMultipartUpload from '@/use-cases/video/upload/create-multipart-upload';
import GeneratePresignUrl from '@/use-cases/video/upload/generate-presign-url';
import PresignPartUrl from '@/use-cases/video/upload/presign-part-url';
import UploadComplete from '@/use-cases/video/upload/upload-complete';

export interface VideoUseCases {
  findAllVideo: FindAllVideo;
  findByIdVideo: FindByIdVideo;
  createVideo: CreateVideo;
  generatePresignUrl: GeneratePresignUrl;
  createMultipartUpload: CreateMultipartUpload;
  presignPartUrl: PresignPartUrl;
  completeMultipartUpload: CompleteMultipartUpload;
  uploadComplete: UploadComplete;
}

export interface TranscodeUseCases {
  transcodeJobListener: TranscodeJobListener;
}

export interface UseCases {
  videoUseCase: VideoUseCases;
  transcodeUseCase: TranscodeUseCases;
}
