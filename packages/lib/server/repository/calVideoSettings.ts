import prisma from "@calcom/prisma";

export class CalVideoSettingsRepository {
  static async deleteCalVideoSettings(eventTypeId: number) {
    return await prisma.calVideoSettings.delete({
      where: { eventTypeId },
    });
  }

  static async createOrUpdateCalVideoSettings({
    eventTypeId,
    calVideoSettings,
  }: {
    eventTypeId: number;
    calVideoSettings: {
      disableRecordingForGuests?: boolean | null;
      disableRecordingForOrganizer?: boolean | null;
      disableTranscriptionForGuests?: boolean | null;
      disableTranscriptionForOrganizer?: boolean | null;
      enableAutomaticTranscription?: boolean | null;
      redirectUrlOnExit?: string | null;
    };
  }) {
    return await prisma.calVideoSettings.upsert({
      where: { eventTypeId },
      update: {
        disableRecordingForGuests: calVideoSettings.disableRecordingForGuests ?? false,
        disableRecordingForOrganizer: calVideoSettings.disableRecordingForOrganizer ?? false,
        enableAutomaticTranscription: calVideoSettings.enableAutomaticTranscription ?? false,
        disableTranscriptionForGuests: calVideoSettings.disableTranscriptionForGuests ?? false,
        disableTranscriptionForOrganizer: calVideoSettings.disableTranscriptionForOrganizer ?? false,
        redirectUrlOnExit: calVideoSettings.redirectUrlOnExit ?? null,
        updatedAt: new Date(),
      },
      create: {
        disableRecordingForGuests: calVideoSettings.disableRecordingForGuests ?? false,
        disableRecordingForOrganizer: calVideoSettings.disableRecordingForOrganizer ?? false,
        enableAutomaticTranscription: calVideoSettings.enableAutomaticTranscription ?? false,
        disableTranscriptionForGuests: calVideoSettings.disableTranscriptionForGuests ?? false,
        disableTranscriptionForOrganizer: calVideoSettings.disableTranscriptionForOrganizer ?? false,
        redirectUrlOnExit: calVideoSettings.redirectUrlOnExit ?? null,
        eventTypeId,
      },
    });
  }
}
