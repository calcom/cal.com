import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable, NotFoundException } from "@nestjs/common";

import { getConnectedDestinationCalendars } from "@calcom/platform-libraries";

@Injectable()
export class CalendarsService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly dbRead: PrismaReadService
  ) {}

  async getCalendars(userId: number) {
    const userWithCalendars = await this.usersRepository.findByIdWithCalendars(userId);
    if (!userWithCalendars) {
      throw new NotFoundException("User not found");
    }

    return getConnectedDestinationCalendars(userWithCalendars, false, this.dbRead.prisma);
  }
}
