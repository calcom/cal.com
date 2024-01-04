import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from "@nestjs/common";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "platform/gcal",
  version: "2",
})
export class GcalController {
  private readonly logger = new Logger("Platform Gcal Provider");

  constructor(private readonly credentialRepository: CredentialsRepository) {}

  @Get("/check")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async check(@GetUser("id") userId: number): Promise<ApiResponse> {
    const gcalCredentials = await this.credentialRepository.getByTypeAndUserId("google_calendar", userId);

    if (!gcalCredentials) {
      throw new BadRequestException("Credentials for google_calendar not found.");
    }

    if (gcalCredentials.invalid) {
      throw new BadRequestException("Invalid google oauth credentials.");
    }

    return { status: SUCCESS_STATUS };
  }
}
