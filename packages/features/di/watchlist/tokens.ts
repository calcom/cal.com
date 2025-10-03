export const WATCHLIST_DI_TOKENS = {
  // Core services
  WATCHLIST_SERVICE: Symbol("WatchlistService"),
  BLOCKING_SERVICE: Symbol("BlockingService"),
  AUDIT_SERVICE: Symbol("AuditService"),
  ORGANIZATION_BLOCKING_SERVICE: Symbol("OrganizationBlockingService"),

  // Repositories
  WATCHLIST_REPOSITORY: Symbol("WatchlistRepository"),
  AUDIT_REPOSITORY: Symbol("AuditRepository"),
};
