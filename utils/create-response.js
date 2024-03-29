export const HTTP_200_OK = 200;
export const HTTP_400_BAD_REQUEST = 400;
export const HTTP_403_FORBIDDEN = 403;
export const HTTP_404_NOT_FOUND = 404;
export const HTTP_429_TOO_MANY_REQUESTS = 429;
export const HTTP_500_INTERNAL_SERVER_ERROR = 500;
export const HTTP_503_SERVICE_UNAVAILABLE = 503;
export const HTTP_504_GATEWAY_TIMEOUT = 504;

export async function create(content, statusCode) {
  const response = { statusCode: statusCode };
  if (statusCode === HTTP_200_OK) {
    response.content = content;
  } else {
    response.content = { errno: content };
  }
  return response;
}
