import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import {
  ConferencingAppsOutputResponseDto,
  ConferencingAppOutputResponseDto,
  ConferencingAppsOutputDto,
} from "@/modules/conferencing/outputs/get-conferencing-apps.output";
import { SetDefaultConferencingAppOutputResponseDto } from "@/modules/conferencing/outputs/set-default-conferencing-app.output";
import { ConferencingService } from "@/modules/conferencing/services/conferencing.service";
import { GoogleMeetService } from "@/modules/conferencing/services/google-meet.service";
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Post,
  Param,
  BadRequestException,
  Delete,
} from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";

import { CONFERENCING_APPS, GOOGLE_MEET, SUCCESS_STATUS } from "@calcom/platform-constants";

@Controller({
  path: "/v2/conferencing",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Conferencing")
export class ConferencingController {
  private readonly logger = new Logger("Platform Gcal Provider");

  constructor(
    private readonly conferencingService: ConferencingService,
    private readonly googleMeetService: GoogleMeetService
  ) {}

  @Post("/:app/connect")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Connect your conferencing application" })
  async connect(
    @GetUser("id") userId: number,
    @Param("app") app: string
  ): Promise<ConferencingAppOutputResponseDto> {
    switch (app) {
      case GOOGLE_MEET:
        const credential = await this.googleMeetService.connectGoogleMeetApp(userId);

        return { status: SUCCESS_STATUS, data: plainToInstance(ConferencingAppsOutputDto, credential) };

      default:
        throw new BadRequestException(
          "Invalid conferencing app, available apps are: ",
          CONFERENCING_APPS.join(", ")
        );
    }
  }

  @Get("/")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "List your conferencing applications" })
  async listConferencingApps(@GetUser("id") userId: number): Promise<ConferencingAppsOutputResponseDto> {
    const conferencingApps = await this.conferencingService.getConferencingApps(userId);

    const data = conferencingApps.map((conferencingApps) =>
      plainToInstance(ConferencingAppsOutputDto, conferencingApps)
    );

    return { status: SUCCESS_STATUS, data };
  }

  @Post("/:app/default")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Set your default conferencing application" })
  async default(
    @GetUser("id") userId: number,
    @Param("app") app: string
  ): Promise<SetDefaultConferencingAppOutputResponseDto> {
    switch (app) {
      case GOOGLE_MEET:
        await this.googleMeetService.setDefault(userId);

        return { status: SUCCESS_STATUS };

      default:
        throw new BadRequestException(
          "Invalid conferencing app, available apps are: ",
          CONFERENCING_APPS.join(", ")
        );
    }
  }

  @Delete("/:app/disconnect")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Disconnect your conferencing application" })
  async disconnect(
    @GetUser("id") userId: number,
    @Param("app") app: string
  ): Promise<ConferencingAppOutputResponseDto> {
    switch (app) {
      case GOOGLE_MEET:
        const credential = await this.googleMeetService.disconnectGoogleMeetApp(userId);

        return { status: SUCCESS_STATUS, data: plainToInstance(ConferencingAppsOutputDto, credential) };

      default:
        throw new BadRequestException(
          "Invalid conferencing app, available apps are: ",
          CONFERENCING_APPS.join(", ")
        );
    }
  }
}
