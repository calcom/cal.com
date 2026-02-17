export const NOTIFICATION_DI_TOKENS = {
  NOTIFICATION_DISPATCHER: Symbol("NotificationDispatcherService"),
  NOTIFICATION_DISPATCHER_MODULE: Symbol("NotificationDispatcherService.module"),
  SLACK_CHANNEL: Symbol("SlackNotificationChannelService"),
  SLACK_CHANNEL_MODULE: Symbol("SlackNotificationChannelService.module"),
  SLACK_FORMATTER: Symbol("SlackMessageFormatterService"),
  SLACK_FORMATTER_MODULE: Symbol("SlackMessageFormatterService.module"),
  SLACK_API_CLIENT: Symbol("SlackApiClientService"),
  SLACK_API_CLIENT_MODULE: Symbol("SlackApiClientService.module"),
} as const;
