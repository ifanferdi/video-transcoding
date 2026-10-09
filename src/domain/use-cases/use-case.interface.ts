import DeleteVideoJobListener from '@/use-cases/delete/delete-video-job-listener';
import TranscodeJobListener from '@/use-cases/transcode/transcode-job-listener';
import DeleteVideo from '@/use-cases/video/delete-video';
import FindAllVideo from '@/use-cases/video/find-all-video';
import FindByIdVideo from '@/use-cases/video/find-by-id-video';
import RealtimeProgressVideo from '@/use-cases/video/realtime-progress-video';
import CompleteMultipartUpload from '@/use-cases/video/upload/complete-multipart-upload';
import CompleteUpload from '@/use-cases/video/upload/complete-upload';
import GenerateMultipartPresignUrl from '@/use-cases/video/upload/generate-multipart-presign-url';
import GeneratePresignUrl from '@/use-cases/video/upload/generate-presign-url';
import PresignPartUrl from '@/use-cases/video/upload/presign-part-url';

export interface VideoUseCases {
  findAllVideo: FindAllVideo;
  findByIdVideo: FindByIdVideo;
  generatePresignUrl: GeneratePresignUrl;
  GenerateMultipartPresignUrl: GenerateMultipartPresignUrl;
  presignPartUrl: PresignPartUrl;
  completeMultipartUpload: CompleteMultipartUpload;
  CompleteUpload: CompleteUpload;
  realtimeProgressVideo: RealtimeProgressVideo;
  deleteVideo: DeleteVideo;
}

export interface TranscodeUseCases {
  transcodeJobListener: TranscodeJobListener;
}

export interface DeleteUseCases {
  deleteVideoJobListener: DeleteVideoJobListener;
}

export interface UseCases {
  videoUseCase: VideoUseCases;
  transcodeUseCase: TranscodeUseCases;
  deleteUseCase: DeleteUseCases;
}
