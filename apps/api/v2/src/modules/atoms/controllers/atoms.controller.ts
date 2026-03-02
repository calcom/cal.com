import { SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
  VERSION_NEUTRAL,
  Version,
} from "@nestjs/common";
import { ApiExcludeController as DocsExcludeController, ApiTags as DocsTags } from "@nestjs/swagger";
import type { Request } from "express";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { FindTeamMembersMatchingAttributeQueryDto } from "@/modules/atoms/inputs/find-team-members-matching-attribute.input";
import { AttributesAtomsService } from "@/modules/atoms/services/attributes-atom.service";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";

import { FindTeamMembersMatchingAttributeResponseDto } from "../outputs/find-team-members-matching-attribute.output";
import { GetCountryCodeResponseDto } from "../outputs/get-country-code.output";

/*
Endpoints used only by platform atoms, reusing code from other modules, data is already formatted and ready to be used by frontend atoms
these endpoints should not be recommended for use by third party and are excluded from docs
*/

@Controller({
  path: "/v2/atoms",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Atoms - endpoints for atoms")
@DocsExcludeController(true)
export class AtomsController {
  constructor(private readonly attributesService: AttributesAtomsService) {}

  @Get("/organizations/:orgId/teams/:teamId/members-matching-attribute")
  @Version(VERSION_NEUTRAL)
  @UseGuards(ApiAuthGuard)
  async findTeamMembersMatchingAttributes(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("orgId", ParseIntPipe) orgId: number,
    @Query() query: FindTeamMembersMatchingAttributeQueryDto
  ): Promise<FindTeamMembersMatchingAttributeResponseDto> {
    const result = await this.attributesService.findTeamMembersMatchingAttribute(teamId, orgId, {
      attributesQueryValue: query.attributesQueryValue,
      isPreview: query.isPreview,
      enablePerf: query.enablePerf,
      concurrency: query.concurrency,
    });

    return {
      status: SUCCESS_STATUS,
      data: result,
    };
  }

  @Get("/country-code")
  @Version(VERSION_NEUTRAL)
  async getCountryCode(@Req() req: Request): Promise<GetCountryCodeResponseDto> {
    const countryCode: string | string[] = req?.headers?.["x-vercel-ip-country"] ?? "";
    return {
      status: SUCCESS_STATUS,
      data: {
        countryCode: Array.isArray(countryCode) ? countryCode[0] : countryCode,
      },
    };
  }
}
