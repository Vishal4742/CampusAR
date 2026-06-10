export class HttpError extends Error {
  readonly expose = true;

  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export const badRequest = (message: string, code = 'bad_request'): HttpError => new HttpError(400, code, message);
export const unauthorized = (message = 'Authentication is required'): HttpError => new HttpError(401, 'unauthorized', message);
export const forbidden = (message = 'This role is not allowed to perform that action'): HttpError => new HttpError(403, 'forbidden', message);
export const notFound = (message = 'Resource was not found'): HttpError => new HttpError(404, 'not_found', message);
export const conflict = (message: string, code = 'conflict'): HttpError => new HttpError(409, code, message);
