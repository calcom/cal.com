import type { NotificationEvent } from "@calcom/prisma/enums";
import type {
  EffectiveNotificationPreferences,
  EffectiveNotificationSettings,
  NotificationResolutionContext,
} from "./notification-scope-types";
import type { PrismaNotificationPreferencesRepository } from "./prisma-notification-preferences-repository";
import { resolveEffectiveNotificationPreferences } from "./resolve-effective-notification-preferences";
import { resolveEffectiveNotificationSettings } from "./resolve-effective-notification-settings";

export class NotificationPreferencesService {
  constructor(private repository: PrismaNotificationPreferencesRepository) {}

  /**
   * Resolve effective notification settings for a user in the context
   * of a booking/event, applying org -> user precedence.
   */
  async getEffectiveSettings(context: NotificationResolutionContext): Promise<EffectiveNotificationSettings> {
    const rawSettings = await this.repository.getSettings(context);

    return resolveEffectiveNotificationSettings(rawSettings);
  }

  /**
   * Resolve effective notification preferences for a user + event in the
   * context of a booking/event, applying org -> user precedence.
   */
  async getEffectivePreferences(
    context: NotificationResolutionContext,
    event: NotificationEvent
  ): Promise<EffectiveNotificationPreferences> {
    const rawPreferences = await this.repository.getPreferences(context, event);

    return resolveEffectiveNotificationPreferences({
      event,
      ...rawPreferences,
    });
  }
}
