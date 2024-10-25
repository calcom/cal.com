import type { Prisma } from "@prisma/client";
import type { SelectedCalendar as PrismaSelectedCalendar } from "@prisma/client";

import { prisma } from "@calcom/prisma";

import { BookingReferenceRepository } from "./bookingReference";

type ISelectedCalendar = Omit<Prisma.SelectedCalendarCreateInput, "user"> & {
  credentialId?: PrismaSelectedCalendar["credentialId"];
  userId?: PrismaSelectedCalendar["userId"];
};

export class SelectedCalendarRepository {
  private static generateSelectedCalendarData = (selectedCalendarCreateData: ISelectedCalendar) => {
    const { credentialId, userId, ...rest } = selectedCalendarCreateData;
    return {
      ...rest,
      ...{ user: { connect: { id: userId } } },
      ...(credentialId ? { credential: { connect: { id: credentialId } } } : null),
    };
  };

  static async create(data: ISelectedCalendar) {
    let selectedCalendar;
    try {
      selectedCalendar = await prisma.selectedCalendar.create({
        data: this.generateSelectedCalendarData(data),
      });
    } catch (error) {
      throw error;
    }

    if (!!selectedCalendar.credentialId) {
      await BookingReferenceRepository.reconnectWithNewCredential(selectedCalendar.credentialId);
    }

    return selectedCalendar;
  }
}
