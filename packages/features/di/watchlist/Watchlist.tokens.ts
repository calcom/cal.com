export const WATCHLIST_DI_TOKENS = {
  // Core services
  WATCHLIST_SERVICE: Symbol("WatchlistService"),
  GLOBAL_BLOCKING_SERVICE: Symbol("GlobalBlockingService"),
  ORGANIZATION_BLOCKING_SERVICE: Symbol("OrganizationBlockingService"),
  AUDIT_SERVICE: Symbol("WatchlistAuditService"),

  // Operations services
  ADMIN_WATCHLIST_OPERATIONS_SERVICE: Symbol("AdminWatchlistOperationsService"),
  ORGANIZATION_WATCHLIST_OPERATIONS_SERVICE: Symbol("OrganizationWatchlistOperationsService"),

  // Query services
  ADMIN_WATCHLIST_QUERY_SERVICE: Symbol("AdminWatchlistQueryService"),
  ORGANIZATION_WATCHLIST_QUERY_SERVICE: Symbol("OrganizationWatchlistQueryService"),

  // Repositories
  GLOBAL_WATCHLIST_REPOSITORY: Symbol("GlobalWatchlistRepository"),
  ORGANIZATION_WATCHLIST_REPOSITORY: Symbol("OrganizationWatchlistRepository"),
  AUDIT_REPOSITORY: Symbol("PrismaWatchlistAuditRepository"),
};
