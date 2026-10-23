import { HttpStatusMessage } from '@/constants/http-status-message.constant';
import { HttpStatusCode } from '@/constants/http-status.constant';

export default class AppError extends Error {
  statusCode: number;
  isOperational: boolean; // bedakan error yang "expected" vs bug
  details?: unknown; // untuk validation errors, dll

  constructor(
    message: HttpStatusMessage | string,
    statusCode: HttpStatusCode = HttpStatusCode.INTERNAL_SERVER_ERROR,
    details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================
// 4xx — Client Errors
// ============================================

export class ErrorBadRequest extends AppError {
  constructor(message: string = HttpStatusMessage.BAD_REQUEST, details?: unknown) {
    super(message, HttpStatusCode.BAD_REQUEST, details);
  }
}

export class ErrorNotFound extends AppError {
  constructor(message: string = HttpStatusMessage.NOT_FOUND, details?: unknown) {
    super(message, HttpStatusCode.NOT_FOUND, details);
  }
}

export class ErrorConflict extends AppError {
  constructor(message: string = HttpStatusMessage.CONFLICT, details?: unknown) {
    super(message, HttpStatusCode.CONFLICT, details);
  }
}

export class ErrorValidation extends AppError {
  constructor(message: string = HttpStatusMessage.UNPROCESSABLE_ENTITY, details?: unknown) {
    super(message, HttpStatusCode.UNPROCESSABLE_ENTITY, details);
  }
}

export class ErrorPreconditionFailed extends AppError {
  constructor(message: string = HttpStatusMessage.PRECONDITION_FAILED, details?: unknown) {
    super(message, HttpStatusCode.PRECONDITION_FAILED, details);
  }
}

// ============================================
// 5xx — Server Errors
// ============================================

export class ErrorInternalServer extends AppError {
  constructor(message: string = HttpStatusMessage.INTERNAL_SERVER_ERROR, details?: unknown) {
    super(message, HttpStatusCode.INTERNAL_SERVER_ERROR, details);
  }
}
