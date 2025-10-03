export const WATCHLIST_DI_TOKENS = {
  // Core services
  WATCHLIST_SERVICE: Symbol("WatchlistService"),
  BLOCKING_SERVICE: Symbol("BlockingService"),
  AUDIT_SERVICE: Symbol("AuditService"),
  ORGANIZATION_BLOCKING_SERVICE: Symbol("OrganizationBlockingService"),
  GLOBAL_BLOCKING_SERVICE: Symbol("GlobalBlockingService"),

  // Repositories
  WATCHLIST_REPOSITORY: Symbol("WatchlistRepository"),
  WATCHLIST_READ_REPOSITORY: Symbol("WatchlistReadRepository"),
  WATCHLIST_WRITE_REPOSITORY: Symbol("WatchlistWriteRepository"),
  AUDIT_REPOSITORY: Symbol("AuditRepository"),
  GLOBAL_WATCHLIST_REPOSITORY: Symbol("GlobalWatchlistRepository"),
  ORGANIZATION_WATCHLIST_REPOSITORY: Symbol("OrganizationWatchlistRepository"),
};
