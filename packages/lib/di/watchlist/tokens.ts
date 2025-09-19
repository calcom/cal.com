export const WATCHLIST_DI_TOKENS = {
  // Watchlist tokens
  WATCHLIST_REPOSITORY: Symbol("WatchlistRepository"),
  WATCHLIST_READ_REPOSITORY: Symbol("WatchlistReadRepository"),
  WATCHLIST_WRITE_REPOSITORY: Symbol("WatchlistWriteRepository"),
  WATCHLIST_REPOSITORY_MODULE: Symbol("WatchlistRepositoryModule"),

  // Blocking service tokens
  BLOCKING_SERVICE: Symbol("BlockingService"),
  BLOCKING_SERVICE_MODULE: Symbol("BlockingServiceModule"),

  // Audit service tokens
  AUDIT_SERVICE: Symbol("AuditService"),
  AUDIT_SERVICE_MODULE: Symbol("AuditServiceModule"),

  // Strategy tokens
  EMAIL_BLOCKING_STRATEGY: Symbol("EmailBlockingStrategy"),
  DOMAIN_BLOCKING_STRATEGY: Symbol("DomainBlockingStrategy"),
};
