import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable, NotFoundException } from "@nestjs/common";
import { MembershipRole } from "@prisma/client";

import { getEventTypeById } from "@calcom/platform-libraries";

@Injectable()
export class EventTypesService {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly usersRepository: UsersRepository
  ) {}
  async getUserEventType(userId: number, eventTypeId: number) {
    try {
      const user = await this.usersRepository.findById(userId);
      const isUserOrganizationAdmin = user?.role === MembershipRole.ADMIN;

      const eventType = await getEventTypeById({
        eventTypeId,
        userId,
        prisma: this.dbRead.prisma,
        isUserOrganizationAdmin,
      });
      return eventType;
    } catch (error) {
      throw new NotFoundException(`User with id ${userId} has no event type with id ${eventTypeId}`);
    }
  }
}
