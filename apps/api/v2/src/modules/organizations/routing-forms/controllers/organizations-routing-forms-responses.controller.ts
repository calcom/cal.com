import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RoutingFormResponseDto } from "@/modules/organizations/routing-forms/outputs/routing-form-response.output";
import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

import { RoutingFormsResponsesService } from "../../../routing-forms-responses/routing-forms-responses.service";
import { GetRoutingFormResponsesOutput } from "../outputs/get-routing-form-responses.output";

@Controller({
  path: "/v2/organizations/:orgId/forms/:formId/responses",
  version: API_VERSIONS_VALUES,
})
@ApiTags("Organizations Routing Forms")
@UseGuards(ApiAuthGuard, IsOrgGuard, IsAdminAPIEnabledGuard)
export class OrganizationsRoutingFormsResponsesController {
  constructor(private readonly routingFormsResponsesService: RoutingFormsResponsesService) {}

  @Get()
  @ApiOperation({ summary: "Get routing form responses" })
  async getRoutingFormResponses(@Param("formId") formId: string): Promise<GetRoutingFormResponsesOutput> {
    const responses = await this.routingFormsResponsesService.getRoutingFormResponses(formId);

    return {
      status: SUCCESS_STATUS,
      data: responses.map((response) =>
        plainToClass(RoutingFormResponseDto, response, { strategy: "excludeAll" })
      ),
    };
  }
}
