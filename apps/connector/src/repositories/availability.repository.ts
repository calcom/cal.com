import { AvailabilityCreation } from "@/schema/availability.schema";

import type { PrismaClient } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";

import { BaseRepository } from "./base.repository";

export class AvailabilityRepository extends BaseRepository<User> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async create(body: AvailabilityCreation) {
    try {
      const availability = await this.prisma.availability.create({
        data: body,
        include: { Schedule: { select: { userId: true } } },
      });

      return availability;
    } catch (error) {
      this.handleDatabaseError(error, "create availability");
    }
  }

  async delete(id: number) {
    try {
      return await this.prisma.availability.delete({ where: { id } });
    } catch (error) {
      this.handleDatabaseError(error, "delete availability");
    }
  }

  async update(data: AvailabilityCreation, userId: number, availabilityId: number) {
    try {
      const availability = await this.prisma.availability.update({
        where: { id: availabilityId },
        data,
        include: { Schedule: { select: { userId: true } } },
      });

      return availability;
    } catch (error) {
      this.handleDatabaseError(error, "update availability");
    }
  }
}
