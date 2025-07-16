import prisma from "@calcom/prisma";

export class CalVideoSettingsRepository {
  static async deleteCalVideoSettings(eventTypeId: number) {
    return await prisma.calVideoSettings.delete({
      where: { eventTypeId },
      select: {
        eventTypeId: true,
      },
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
      enableFlappyBirdGame?: boolean | null;
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
        enableFlappyBirdGame: calVideoSettings.enableFlappyBirdGame ?? false,
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
        enableFlappyBirdGame: calVideoSettings.enableFlappyBirdGame ?? false,
        eventTypeId,
      },
      select: {
        eventTypeId: true,
        disableRecordingForGuests: true,
        disableRecordingForOrganizer: true,
        enableAutomaticTranscription: true,
        disableTranscriptionForGuests: true,
        disableTranscriptionForOrganizer: true,
        redirectUrlOnExit: true,
        enableFlappyBirdGame: true,
        updatedAt: true,
      },
    });
  }
}
