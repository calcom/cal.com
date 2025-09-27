import type { Prisma } from "@calcom/prisma";

export interface CalVideoSettings {
  disableRecordingForGuests?: boolean;
  disableRecordingForOrganizer?: boolean;
  enableAutomaticTranscription?: boolean;
  enableAutomaticRecordingForOrganizer?: boolean;
  disableTranscriptionForGuests?: boolean;
  disableTranscriptionForOrganizer?: boolean;
  redirectUrlOnExit?: string | null;
}

/**
 * Service for handling Cal.video settings
 */
export class CalVideoSettingsService {
  /**
   * Create Cal.video settings for an event type
   */
  createCalVideoSettings(
    settings?: CalVideoSettings
  ): Prisma.CalVideoSettingsCreateNestedOneWithoutEventTypeInput | undefined {
    if (!settings) {
      return undefined;
    }

    return {
      create: {
        disableRecordingForGuests: settings.disableRecordingForGuests ?? false,
        disableRecordingForOrganizer: settings.disableRecordingForOrganizer ?? false,
        enableAutomaticTranscription: settings.enableAutomaticTranscription ?? false,
        enableAutomaticRecordingForOrganizer: settings.enableAutomaticRecordingForOrganizer ?? false,
        disableTranscriptionForGuests: settings.disableTranscriptionForGuests ?? false,
        disableTranscriptionForOrganizer: settings.disableTranscriptionForOrganizer ?? false,
        redirectUrlOnExit: settings.redirectUrlOnExit ?? null,
      },
    };
  }

  /**
   * Validate Cal.video settings
   */
  validateSettings(settings: CalVideoSettings): boolean {
    // Add validation logic here
    // For example, check for invalid combinations of settings

    // Check if redirect URL is valid if provided
    if (settings.redirectUrlOnExit) {
      try {
        new URL(settings.redirectUrlOnExit);
      } catch {
        return false;
      }
    }

    return true;
  }

  /**
   * Get default Cal.video settings
   */
  getDefaultSettings(): CalVideoSettings {
    return {
      disableRecordingForGuests: false,
      disableRecordingForOrganizer: false,
      enableAutomaticTranscription: false,
      enableAutomaticRecordingForOrganizer: false,
      disableTranscriptionForGuests: false,
      disableTranscriptionForOrganizer: false,
      redirectUrlOnExit: null,
    };
  }
}
