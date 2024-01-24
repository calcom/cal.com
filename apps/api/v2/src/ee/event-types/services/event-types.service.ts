import { getEventTypeById } from "@/ee/event-types/imports/getEventTypeById";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";
import { MembershipRole } from "@prisma/client";

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
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        prisma: this.dbRead.prisma,
        isUserOrganizationAdmin,
      });
      return eventType;
    } catch (error) {
      if (error instanceof Error) throw new Error(error.message);
    }
  }
}
