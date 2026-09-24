import { ErrorNotFound } from '@/helpers/error.helper';
import e from 'express';

export default function RouteNotFoundHandler(
  req: e.Request,
  res: e.Response,
  next: e.NextFunction,
) {
  next(new ErrorNotFound(`Route not found: ${req.originalUrl}`));
}
