export const WATCHLIST_DI_TOKENS = {
  // Core services
  WATCHLIST_SERVICE: Symbol("WatchlistService"),
  GLOBAL_BLOCKING_SERVICE: Symbol("GlobalBlockingService"),
  ORGANIZATION_BLOCKING_SERVICE: Symbol("OrganizationBlockingService"),
  AUDIT_SERVICE: Symbol("WatchlistAuditService"),

  // Repositories
  GLOBAL_WATCHLIST_REPOSITORY: Symbol("GlobalWatchlistRepository"),
  ORGANIZATION_WATCHLIST_REPOSITORY: Symbol("OrganizationWatchlistRepository"),
  AUDIT_REPOSITORY: Symbol("PrismaWatchlistAuditRepository"),
};
