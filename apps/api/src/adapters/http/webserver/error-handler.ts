import config from '@/config/config';
import { HttpStatusCode } from '@/constants/http-status.constant';
import e from 'express';
import { ZodError } from 'zod';

export default function (err: any, _req: e.Request, res: e.Response, _next: e.NextFunction) {
  let message = err.message;

  if (err instanceof ZodError) {
    if (err.issues[0])
      if (err.issues[0].path.length > 1)
        message = `Column ${err.issues[0].path.map((val) => val).join('.')}: ${err.issues[0].message}`;
      else message = `Column ${err.issues[0].path[0]}: ${err.issues[0].message}`;

    (err as any).statusCode = HttpStatusCode.BAD_REQUEST;
  }

  if (config.app.env === 'development') {
    return res.status(err.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
      message,
      stack: err.stack,
    });
  }

  return res.status(err.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
    message,
  });
}
