/** An error that is safe to show to the client. Anything else becomes a generic 500. */
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: unknown) => new AppError(400, msg, details);
export const unauthorized = (msg = 'Please sign in to continue.') => new AppError(401, msg);
export const forbidden = (msg = 'You do not have permission to do this.') => new AppError(403, msg);
export const notFound = (msg = 'Not found.') => new AppError(404, msg);
export const conflict = (msg: string) => new AppError(409, msg);
