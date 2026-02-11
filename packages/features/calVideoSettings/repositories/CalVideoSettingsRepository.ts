import { prisma } from "@calcom/prisma";

export class CalVideoSettingsRepository {
  static async deleteCalVideoSettings(eventTypeId: number) {
    return await prisma.calVideoSettings.delete({
      where: { eventTypeId },
    });
  }

  static async createCalVideoSettings({
    eventTypeId,
    calVideoSettings,
  }: {
    eventTypeId: number;
    calVideoSettings: {
      disableRecordingForGuests?: boolean | null;
      disableRecordingForOrganizer?: boolean | null;
      enableAutomaticTranscription?: boolean | null;
      enableAutomaticRecordingForOrganizer?: boolean | null;
      disableTranscriptionForGuests?: boolean | null;
      disableTranscriptionForOrganizer?: boolean | null;
      redirectUrlOnExit?: string | null;
      requireEmailForGuests?: boolean | null;
    };
  }) {
    return await prisma.calVideoSettings.create({
      data: {
        disableRecordingForGuests: calVideoSettings.disableRecordingForGuests ?? false,
        disableRecordingForOrganizer: calVideoSettings.disableRecordingForOrganizer ?? false,
        enableAutomaticTranscription: calVideoSettings.enableAutomaticTranscription ?? false,
        enableAutomaticRecordingForOrganizer: calVideoSettings.enableAutomaticRecordingForOrganizer ?? false,
        disableTranscriptionForGuests: calVideoSettings.disableTranscriptionForGuests ?? false,
        disableTranscriptionForOrganizer: calVideoSettings.disableTranscriptionForOrganizer ?? false,
        redirectUrlOnExit: calVideoSettings.redirectUrlOnExit ?? null,
        requireEmailForGuests: calVideoSettings.requireEmailForGuests ?? false,
        eventTypeId,
      },
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
      enableAutomaticRecordingForOrganizer?: boolean | null;
      redirectUrlOnExit?: string | null;
      requireEmailForGuests?: boolean | null;
    };
  }) {
    return await prisma.calVideoSettings.upsert({
      where: { eventTypeId },
      update: {
        disableRecordingForGuests: calVideoSettings.disableRecordingForGuests ?? false,
        disableRecordingForOrganizer: calVideoSettings.disableRecordingForOrganizer ?? false,
        enableAutomaticTranscription: calVideoSettings.enableAutomaticTranscription ?? false,
        enableAutomaticRecordingForOrganizer: calVideoSettings.enableAutomaticRecordingForOrganizer ?? false,
        disableTranscriptionForGuests: calVideoSettings.disableTranscriptionForGuests ?? false,
        disableTranscriptionForOrganizer: calVideoSettings.disableTranscriptionForOrganizer ?? false,
        redirectUrlOnExit: calVideoSettings.redirectUrlOnExit ?? null,
        requireEmailForGuests: calVideoSettings.requireEmailForGuests ?? false,
        updatedAt: new Date(),
      },
      create: {
        disableRecordingForGuests: calVideoSettings.disableRecordingForGuests ?? false,
        disableRecordingForOrganizer: calVideoSettings.disableRecordingForOrganizer ?? false,
        enableAutomaticTranscription: calVideoSettings.enableAutomaticTranscription ?? false,
        enableAutomaticRecordingForOrganizer: calVideoSettings.enableAutomaticRecordingForOrganizer ?? false,
        disableTranscriptionForGuests: calVideoSettings.disableTranscriptionForGuests ?? false,
        disableTranscriptionForOrganizer: calVideoSettings.disableTranscriptionForOrganizer ?? false,
        redirectUrlOnExit: calVideoSettings.redirectUrlOnExit ?? null,
        requireEmailForGuests: calVideoSettings.requireEmailForGuests ?? false,
        eventTypeId,
      },
    });
  }
}
