export const WATCHLIST_DI_TOKENS = {
  // Core services
  WATCHLIST_SERVICE: Symbol("WatchlistService"),
  BLOCKING_SERVICE: Symbol("BlockingService"),
  AUDIT_SERVICE: Symbol("AuditService"),
  ORGANIZATION_BLOCKING_SERVICE: Symbol("OrganizationBlockingService"),

  // Repositories
  GLOBAL_WATCHLIST_REPOSITORY: Symbol("GlobalWatchlistRepository"),
  ORGANIZATION_WATCHLIST_REPOSITORY: Symbol("OrganizationWatchlistRepository"),
  AUDIT_REPOSITORY: Symbol("AuditRepository"),
};
