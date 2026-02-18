export enum WatchlistErrorCode {
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  ALREADY_IN_WATCHLIST = "ALREADY_IN_WATCHLIST",
  INVALID_EMAIL = "INVALID_EMAIL",
  INVALID_DOMAIN = "INVALID_DOMAIN",
  INVALID_IP = "INVALID_IP",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  DUPLICATE_ENTRY = "DUPLICATE_ENTRY",
  BULK_DELETE_PARTIAL_FAILURE = "BULK_DELETE_PARTIAL_FAILURE",
}

export class WatchlistError extends Error {
  constructor(
    public readonly code: WatchlistErrorCode,
    message: string
  ) {
    super(message);
    this.name = "WatchlistError";
  }
}

export const WatchlistErrors = {
  notFound: (message: string) => new WatchlistError(WatchlistErrorCode.NOT_FOUND, message),

  unauthorized: (message: string) => new WatchlistError(WatchlistErrorCode.UNAUTHORIZED, message),

  alreadyInWatchlist: (message: string) =>
    new WatchlistError(WatchlistErrorCode.ALREADY_IN_WATCHLIST, message),

  invalidEmail: (message: string) => new WatchlistError(WatchlistErrorCode.INVALID_EMAIL, message),

  invalidDomain: (message: string) => new WatchlistError(WatchlistErrorCode.INVALID_DOMAIN, message),

  invalidIp: (message: string) => new WatchlistError(WatchlistErrorCode.INVALID_IP, message),

  validationError: (message: string) => new WatchlistError(WatchlistErrorCode.VALIDATION_ERROR, message),

  permissionDenied: (message: string) => new WatchlistError(WatchlistErrorCode.PERMISSION_DENIED, message),

  duplicateEntry: (message: string) => new WatchlistError(WatchlistErrorCode.DUPLICATE_ENTRY, message),

  bulkDeletePartialFailure: (message: string) =>
    new WatchlistError(WatchlistErrorCode.BULK_DELETE_PARTIAL_FAILURE, message),
};
