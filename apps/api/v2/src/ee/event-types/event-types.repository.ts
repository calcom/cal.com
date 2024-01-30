import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable, NotFoundException } from "@nestjs/common";
import { User } from "@prisma/client";

import { getEventTypeById } from "@calcom/platform-libraries";

@Injectable()
export class EventTypesRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly membershipsRepository: MembershipsRepository
  ) {}

  async getUserEventType(user: User, eventTypeId: number) {
    try {
      const isUserOrganizationAdmin = user?.organizationId
        ? await this.membershipsRepository.isUserOrganizationAdmin(user.id, user.organizationId)
        : false;

      const eventType = await getEventTypeById({
        eventTypeId,
        userId: user.id,
        prisma: this.dbRead.prisma,
        isUserOrganizationAdmin,
      });
      return eventType;
    } catch (error) {
      throw new NotFoundException(`User with id ${user.id} has no event type with id ${eventTypeId}`);
    }
  }
}
