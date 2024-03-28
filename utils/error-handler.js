const CLASHOFCLANS_ERROR = 'CLASHOFCLANS_ERROR';
export const HTTP_400_BAD_REQUEST = 400;
export const HTTP_403_FORBIDDEN = 403;
export const HTTP_404_NOT_FOUND = 404;
export const HTTP_429_TOO_MANY_REQUESTS = 429;
export const HTTP_500_INTERNAL_SERVER_ERROR = 500;
export const HTTP_503_SERVICE_UNAVAILABLE = 503;
export const HTTP_504_GATEWAY_TIMEOUT = 504;

export class ClashOfClansError extends Error {
  constructor(error) {
    super(ClashOfClansError.#getErrorMessage(error));
    this.name = CLASHOFCLANS_ERROR;
    this.errno = error.response ? error.response.status : -1;
  }

  static #getErrorMessage(error) {
    if (!error.response || !error.response.status) return 'Unknown error occurred.';
    let errno = error.response.status;

    switch (errno) {
      case HTTP_400_BAD_REQUEST:
        return 'Client provided incorrect parameters for the request.';
      case HTTP_403_FORBIDDEN:
        return 'Access denied, either because of missing/incorrect credentials or used API token does not grant access to the requested resource.';
      case HTTP_404_NOT_FOUND:
        return 'Resource was not found.';
      case HTTP_429_TOO_MANY_REQUESTS:
        return 'Request was throttled, because amount of requests was above the threshold defined for the used API token.';
      case HTTP_500_INTERNAL_SERVER_ERROR:
        return 'Unknown error happened when handling the request.';
      case HTTP_503_SERVICE_UNAVAILABLE:
        return 'Service is temprorarily unavailable because of maintenance.';
      case HTTP_504_GATEWAY_TIMEOUT:
        return 'The server did not get a response in time from the upstream server that it needed in order to complete the request.';
      default:
        return 'Unknown error occurred.';
    }
  }
}

const DATABASE_ERROR = 'DATABASE_ERROR';
const SQLITE_BUSY = 5;
const SQLITE_CONSTRAINT = 19;
export const SQLITE_BUSY_TIMEOUT = 'SQLITE_BUSY_TIMEOUT';
export const SQLITE_CONSTRAINT_FOREIGNKEY = 'SQLITE_CONSTRAINT_FOREIGNKEY';
export const SQLITE_CONSTRAINT_UNIQUE = 'SQLITE_CONSTRAINT_UNIQUE';
export const SQLITE_ERROR = 'SQLITE_ERROR';

export class DatabaseError extends Error {
  constructor(error) {
    super(error && error.message ? error.message : 'Unknown database error');
    this.name = DATABASE_ERROR;
    this.errno = error && error.errno ? error.errno : -1;
    this.code = DatabaseError.#getExtendedError(error);
  }

  static #getExtendedError(error) {
    if (!error || !error.errno) return SQLITE_ERROR;
    let errno = error.errno;

    switch (errno) {
      case SQLITE_CONSTRAINT:
        if (error.message && /FOREIGN KEY/.test(error.message)) {
          return SQLITE_CONSTRAINT_FOREIGNKEY;
        } else if (error.message && /UNIQUE/.test(error.message)) {
          return SQLITE_CONSTRAINT_UNIQUE;
        }
        break;
      case SQLITE_BUSY:
        return SQLITE_BUSY_TIMEOUT;
      default:
        return SQLITE_ERROR;
    }
  }
}
