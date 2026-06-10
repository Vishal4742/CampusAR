const JSON_BODY_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const MAX_BODY_BYTES = 1024 * 1024;

export const readJsonBody = async (request) => {
  if (!JSON_BODY_METHODS.has(request.method ?? 'GET')) {
    return {};
  }

  const chunks = [];
  let total = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), 'utf8');
    total += buffer.length;
    if (total > MAX_BODY_BYTES) {
      const error = new Error('Request body exceeds 1 MB limit');
      error.statusCode = 413;
      error.code = 'body_too_large';
      error.expose = true;
      throw error;
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error('Request body must be valid JSON');
    error.statusCode = 400;
    error.code = 'invalid_json';
    error.expose = true;
    throw error;
  }
};
