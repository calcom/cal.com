export const WATCHLIST_DI_TOKENS = {
  // Legacy watchlist tokens (for backward compatibility)
  WATCHLIST_REPOSITORY: Symbol("WatchlistRepository"),
  WATCHLIST_READ_REPOSITORY: Symbol("WatchlistReadRepository"),
  WATCHLIST_WRITE_REPOSITORY: Symbol("WatchlistWriteRepository"),
  WATCHLIST_REPOSITORY_MODULE: Symbol("WatchlistRepositoryModule"),

  // Global watchlist tokens
  GLOBAL_WATCHLIST_REPOSITORY: Symbol("GlobalWatchlistRepository"),
  GLOBAL_BLOCKING_SERVICE: Symbol("GlobalBlockingService"),

  // Organization watchlist tokens
  ORGANIZATION_WATCHLIST_REPOSITORY: Symbol("OrganizationWatchlistRepository"),
  ORGANIZATION_BLOCKING_SERVICE: Symbol("OrganizationBlockingService"),

  // Legacy blocking service tokens (for backward compatibility)
  BLOCKING_SERVICE: Symbol("BlockingService"),
  BLOCKING_SERVICE_MODULE: Symbol("BlockingServiceModule"),

  // Audit service tokens
  AUDIT_REPOSITORY: Symbol("AuditRepository"),
  AUDIT_SERVICE: Symbol("AuditService"),
  AUDIT_SERVICE_MODULE: Symbol("AuditServiceModule"),

  // Module tokens
  GLOBAL_SERVICES_MODULE: Symbol("GlobalServicesModule"),
  ORGANIZATION_SERVICES_MODULE: Symbol("OrganizationServicesModule"),
};
