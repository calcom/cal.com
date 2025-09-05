import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { CreateOrganizationAttributeInput } from "@/modules/organizations/attributes/index/inputs/create-organization-attribute.input";
import { UpdateOrganizationAttributeInput } from "@/modules/organizations/attributes/index/inputs/update-organization-attribute.input";
import { CreateOrganizationAttributesOutput } from "@/modules/organizations/attributes/index/outputs/create-organization-attributes.output";
import { DeleteOrganizationAttributesOutput } from "@/modules/organizations/attributes/index/outputs/delete-organization-attributes.output";
import {
  GetOrganizationAttributesOutput,
  GetSingleAttributeOutput,
} from "@/modules/organizations/attributes/index/outputs/get-organization-attributes.output";
import { UpdateOrganizationAttributesOutput } from "@/modules/organizations/attributes/index/outputs/update-organization-attributes.output";
import { OrganizationAttributesService } from "@/modules/organizations/attributes/index/services/organization-attributes.service";

@Controller({
  path: "/v2/organizations/:orgId",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Attributes")
@ApiHeader(API_KEY_HEADER)
export class OrganizationsAttributesController {
  constructor(private readonly organizationsAttributesService: OrganizationAttributesService) {}
  // Gets all attributes for an organization
  @Roles("ORG_MEMBER")
  @PlatformPlan("ESSENTIALS")
  @Get("/attributes")
  @ApiOperation({ summary: "Get all attributes" })
  async getOrganizationAttributes(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Query() queryParams: SkipTakePagination
  ): Promise<GetOrganizationAttributesOutput> {
    const { skip, take } = queryParams;
    const attributes = await this.organizationsAttributesService.getOrganizationAttributes(orgId, skip, take);

    return {
      status: SUCCESS_STATUS,
      data: attributes,
    };
  }

  // Gets a single attribute for an organization
  @Roles("ORG_MEMBER")
  @PlatformPlan("ESSENTIALS")
  @Get("/attributes/:attributeId")
  @ApiOperation({ summary: "Get an attribute" })
  async getOrganizationAttribute(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("attributeId") attributeId: string
  ): Promise<GetSingleAttributeOutput> {
    const attribute = await this.organizationsAttributesService.getOrganizationAttribute(orgId, attributeId);
    return {
      status: SUCCESS_STATUS,
      data: attribute,
    };
  }

  // Creates an attribute for an organization
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Post("/attributes")
  @ApiOperation({ summary: "Create an attribute" })
  async createOrganizationAttribute(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Body() bodyAttribute: CreateOrganizationAttributeInput
  ): Promise<CreateOrganizationAttributesOutput> {
    const attribute = await this.organizationsAttributesService.createOrganizationAttribute(
      orgId,
      bodyAttribute
    );
    return {
      status: SUCCESS_STATUS,
      data: attribute,
    };
  }

  // Updates an attribute for an organization
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Patch("/attributes/:attributeId")
  @ApiOperation({ summary: "Update an attribute" })
  async updateOrganizationAttribute(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("attributeId") attributeId: string,
    @Body() bodyAttribute: UpdateOrganizationAttributeInput
  ): Promise<UpdateOrganizationAttributesOutput> {
    const attribute = await this.organizationsAttributesService.updateOrganizationAttribute(
      orgId,
      attributeId,
      bodyAttribute
    );
    return {
      status: SUCCESS_STATUS,
      data: attribute,
    };
  }

  // Deletes an attribute for an organization
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Delete("/attributes/:attributeId")
  @ApiOperation({ summary: "Delete an attribute" })
  async deleteOrganizationAttribute(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("attributeId") attributeId: string
  ): Promise<DeleteOrganizationAttributesOutput> {
    const attribute = await this.organizationsAttributesService.deleteOrganizationAttribute(
      orgId,
      attributeId
    );
    return {
      status: SUCCESS_STATUS,
      data: attribute,
    };
  }
}
