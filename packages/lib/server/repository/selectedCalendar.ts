import { prisma } from "@calcom/prisma";

export class SelectedCalendarRepository {
  static async createGoogleCalendar(data: { credentialId: number; userId: number; externalId: string }) {
    return await prisma.selectedCalendar.create({
      data: {
        ...data,
        integration: "google_calendar",
      },
    });
  }
}
