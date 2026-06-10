export class HttpError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.expose = true;
  }
}

export const badRequest = (message, code = 'bad_request') => new HttpError(400, code, message);
export const unauthorized = (message = 'Authentication is required') => new HttpError(401, 'unauthorized', message);
export const forbidden = (message = 'This role is not allowed to perform that action') => new HttpError(403, 'forbidden', message);
export const notFound = (message = 'Resource was not found') => new HttpError(404, 'not_found', message);
export const conflict = (message, code = 'conflict') => new HttpError(409, code, message);
