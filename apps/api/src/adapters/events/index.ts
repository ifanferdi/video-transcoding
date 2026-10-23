import { UseCases } from '@/domain/use-cases/use-case.interface';
import BullMqRepository from '@/repositories/bullmq/bullmq-repository';

export default class QueueWorker {
  constructor(
    protected readonly useCases: UseCases,
    protected readonly bullMqRepository: BullMqRepository,
  ) {}

  listenTranscodingQueue() {
    this.bullMqRepository.subscribeJob(
      'transcode.jobs',
      async ({ data }) => await this.useCases.transcodeUseCase.transcodeJobListener.execute(data),
    );
  }

  listenDeleteQueue() {
    this.bullMqRepository.subscribeJob(
      'delete.jobs',
      async ({ data }) => await this.useCases.deleteUseCase.deleteVideoJobListener.execute(data),
    );
  }
}
