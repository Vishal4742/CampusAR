export const sendJson = (response, statusCode, body, extraHeaders = {}) => {
  response.writeHead(statusCode, {
    ...extraHeaders,
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(`${JSON.stringify(body, null, 2)}\n`);
};

export const sendError = (response, statusCode, code, message, extraHeaders = {}) => {
  sendJson(response, statusCode, { error: code, message }, extraHeaders);
};
