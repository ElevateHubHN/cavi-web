export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'No encontramos lo que buscas.') {
    super('not_found', message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Inicia sesión para continuar.') {
    super('unauthorized', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(code = 'forbidden', message = 'No tienes permiso para esta acción.') {
    super(code, message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, 409, details);
  }
}
