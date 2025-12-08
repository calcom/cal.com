export const NOTIFICATION_DI_TOKENS = {
  NOTIFICATION_PREFERENCE_REPOSITORY: Symbol("NotificationPreferenceRepository"),
  NOTIFICATION_PREFERENCE_REPOSITORY_MODULE: Symbol("NotificationPreferenceRepositoryModule"),
  NOTIFICATION_PREFERENCE_SERVICE: Symbol("NotificationPreferenceService"),
  NOTIFICATION_PREFERENCE_SERVICE_MODULE: Symbol("NotificationPreferenceServiceModule"),
  NOTIFICATION_METADATA_EXTRACTOR: Symbol("INotificationMetadataExtractor"),
  NOTIFICATION_METADATA_EXTRACTOR_MODULE: Symbol("NotificationMetadataExtractorModule"),
  NOTIFICATION_TASKER_PREFERENCE_PROXY: Symbol("NotificationTaskerPreferenceProxy"),
  NOTIFICATION_TASKER_PREFERENCE_PROXY_MODULE: Symbol("NotificationTaskerPreferenceProxyModule"),
  NOTIFICATION_TASKER_FACTORY: Symbol("NotificationTaskerFactory"),
  NOTIFICATION_TASKER_FACTORY_MODULE: Symbol("NotificationTaskerFactoryModule"),
} as const;
