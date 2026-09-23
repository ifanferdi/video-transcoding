import e from 'express';
import { ErrorNotFound } from '@/helpers/error.helper';

export default function RouteNotFoundHandler(
  req: e.Request,
  res: e.Response,
  next: e.NextFunction,
) {
  next(new ErrorNotFound(`Route not found: ${req.originalUrl}`));
}
