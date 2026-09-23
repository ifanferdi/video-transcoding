import Routes from '@/adapters/http/routes';
import ErrorHandler from '@/adapters/http/webserver/error-handler';
import RouteNotFoundHandler from '@/adapters/http/webserver/route-not-found-handler';
import config from '@/config/config';
import { Controllers } from '@/domain/adapters/controller.interface';
import { UseCases } from '@/domain/use-cases/use-case.interface';
import BullMqRepository from '@/repositories/bullmq/bullmq-repository';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import cors from 'cors';
import { default as express, Express } from 'express';
import morgan from 'morgan';

export default function routes(
  app: Express,
  controllers: Controllers,
  useCases: UseCases,
  bullMqRepository: BullMqRepository,
) {
  void useCases;
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));

  app.use(
    cors({
      origin: config.cors.origins,
      credentials: true,
    }),
  );

  // API INDEX
  app.get('/', (_req, res) => {
    res.json({
      name: config.app.name,
      version: config.app.version,
    });
  });

  Routes(app, controllers);

  // Bull-Board — visualisasi & manage queue BullMQ
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullMQAdapter(bullMqRepository.getQueue('transcode.jobs')!)],
    serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());

  app.all('*', RouteNotFoundHandler);

  app.use(ErrorHandler);
}
