import prisma from "@calcom/prisma";

export class ZoomVideoSettingsRepository {
  static async deleteZoomVideoSettings(eventTypeId: number) {
    return await prisma.zoomVideoSettings.delete({
      where: { eventTypeId },
    });
  }

  static async createOrUpdateZoomVideoSettings({
    eventTypeId,
    zoomVideoSettings,
  }: {
    eventTypeId: number;
    zoomVideoSettings: {
      enableWaitingRoom?: boolean | null;
    };
  }) {
    return await prisma.zoomVideoSettings.upsert({
      where: { eventTypeId },
      update: {
        enableWaitingRoom: zoomVideoSettings.enableWaitingRoom ?? false,
        updatedAt: new Date(),
      },
      create: {
        enableWaitingRoom: zoomVideoSettings.enableWaitingRoom ?? false,
        eventTypeId,
      },
    });
  }
}
