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
   * @param notificationContext Optional context passed from the caller (userId, teamId)
   */
  extract(
    type: string,
    payload: unknown,
    notificationContext?: { userId?: number | null; teamId?: number | null }
  ): Promise<NotificationMetadata | null>;
}
