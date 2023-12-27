import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { UserRepository } from "@/modules/user/user.repository";
import { Controller, Logger, Get, HttpStatus, HttpCode, UseGuards } from "@nestjs/common";

import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "me",
  version: "2",
})
export class UserController {
  private readonly logger = new Logger("UserController");

  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService,
    private readonly bookingRepository: UserRepository
  ) {}

  @Get("/")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getUser(): Promise<ApiResponse> {
    return "hiii";
  }
}
