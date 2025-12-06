export interface NotificationMetadata {
  userId: number;
  teamId: number | null;
  notificationType: string;
  channel: "EMAIL" | "SMS";
}

export interface INotificationMetadataExtractor {
  /**
   * Extracts notification metadata from a task payload.
   * Returns null if the task is not a notification task.
   */
  extract(type: string, payload: unknown): NotificationMetadata | null;
}

