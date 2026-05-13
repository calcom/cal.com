import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { ConferencingAtomsService } from "@/modules/atoms/services/conferencing-atom.service";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Controller, Get, UseGuards, Version, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiTags as DocsTags, ApiExcludeController as DocsExcludeController } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ConnectedApps } from "@calcom/platform-libraries/app-store";
import { ApiResponse } from "@calcom/platform-types";

/*
Conferencing endpoints for atoms, split from AtomsController for clarity and maintainability.
These endpoints should not be recommended for use by third party and are excluded from docs.
*/

@Controller({
  path: "/v2/atoms",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Atoms - conferencing endpoints for atoms")
@DocsExcludeController(true)
export class AtomsConferencingAppsController {
  constructor(private readonly conferencingService: ConferencingAtomsService) {}

  @Get("/conferencing")
  @Version(VERSION_NEUTRAL)
  @UseGuards(ApiAuthGuard)
  async listUserInstalledConferencingApps(
    @GetUser() user: UserWithProfile
  ): Promise<ApiResponse<ConnectedApps>> {
    const conferencingApps = await this.conferencingService.getUserConferencingApps(user);
    return {
      status: SUCCESS_STATUS,
      data: conferencingApps,
    };
  }
}
