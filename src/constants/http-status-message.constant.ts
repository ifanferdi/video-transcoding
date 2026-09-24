export const HttpStatusMessage = {
  OK: 'OK',
  CREATED: 'Created',
  ACCEPTED: 'Accepted',
  BAD_REQUEST: 'Bad Request',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Not Found',
  CONFLICT: 'Conflict',
  UNPROCESSABLE_ENTITY: 'Unprocessable Entity',
  PRECONDITION_FAILED: 'Precondition Failed',
  TOO_MANY_REQUESTS: 'Too Many Requests',
  INTERNAL_SERVER_ERROR: 'Internal Server Error',
  NOT_IMPLEMENTED: 'Not Implemented',
  BAD_GATEWAY: 'Bad Gateway',
  SERVICE_UNAVAILABLE: 'Service Unavailable',
} as const;

export type HttpStatusMessage = (typeof HttpStatusMessage)[keyof typeof HttpStatusMessage];
