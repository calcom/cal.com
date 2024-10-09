import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { AssignOrganizationAttributeOptionToUserInput } from "@/modules/organizations/inputs/attributes/assign/organizations-attributes-options-assign.input";
import { CreateOrganizationAttributeOptionInput } from "@/modules/organizations/inputs/attributes/options/create-organization-attribute-option.input";
import { UpdateOrganizationAttributeOptionInput } from "@/modules/organizations/inputs/attributes/options/update-organizaiton-attribute-option.input.ts";
import {
  AssignOptionUserOutput,
  UnassignOptionUserOutput,
} from "@/modules/organizations/outputs/attributes/options/assign-option-user.output";
import { CreateAttributeOptionOutput } from "@/modules/organizations/outputs/attributes/options/create-option.output";
import { DeleteAttributeOptionOutput } from "@/modules/organizations/outputs/attributes/options/delete-option.output";
import { GetOptionUserOutput } from "@/modules/organizations/outputs/attributes/options/get-option-user.output";
import { GetAllAttributeOptionOutput } from "@/modules/organizations/outputs/attributes/options/get-option.output";
import { UpdateAttributeOptionOutput } from "@/modules/organizations/outputs/attributes/options/update-option.output";
import { OrganizationAttributeOptionService } from "@/modules/organizations/services/attributes/organization-attributes-option.service";
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

@Controller({
  path: "/v2/organizations/:orgId",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Attributes / Options")
export class OrganizationsOptionsAttributesController {
  constructor(private readonly organizationsAttributesOptionsService: OrganizationAttributeOptionService) {}

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Post("/attributes/:attributeId/options")
  @ApiOperation({ summary: "Create an attribute option" })
  async createOrganizationAttributeOption(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("attributeId") attributeId: string,
    @Body() bodyAttribute: CreateOrganizationAttributeOptionInput
  ): Promise<CreateAttributeOptionOutput> {
    const attributeOption =
      await this.organizationsAttributesOptionsService.createOrganizationAttributeOption(
        orgId,
        attributeId,
        bodyAttribute
      );
    return {
      status: SUCCESS_STATUS,
      data: attributeOption,
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Delete("/attributes/:attributeId/options/:optionId")
  @ApiOperation({ summary: "Delete an attribute option" })
  async deleteOrganizationAttributeOption(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("attributeId") attributeId: string,
    @Param("optionId") optionId: string
  ): Promise<DeleteAttributeOptionOutput> {
    const attributeOption =
      await this.organizationsAttributesOptionsService.deleteOrganizationAttributeOption(
        orgId,
        attributeId,
        optionId
      );
    return {
      status: SUCCESS_STATUS,
      data: attributeOption,
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Patch("/attributes/:attributeId/options/:optionId")
  @ApiOperation({ summary: "Update an attribute option" })
  async updateOrganizationAttributeOption(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("attributeId") attributeId: string,
    @Param("optionId") optionId: string,
    @Body() bodyAttribute: UpdateOrganizationAttributeOptionInput
  ): Promise<UpdateAttributeOptionOutput> {
    const attributeOption =
      await this.organizationsAttributesOptionsService.updateOrganizationAttributeOption(
        orgId,
        attributeId,
        optionId,
        bodyAttribute
      );
    return {
      status: SUCCESS_STATUS,
      data: attributeOption,
    };
  }

  @Roles("ORG_MEMBER")
  @PlatformPlan("ESSENTIALS")
  @Get("/attributes/:attributeId/options")
  @ApiOperation({ summary: "Get all attribute options" })
  async getOrganizationAttributeOptions(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("attributeId") attributeId: string
  ): Promise<GetAllAttributeOptionOutput> {
    const attributeOptions = await this.organizationsAttributesOptionsService.getOrganizationAttributeOptions(
      orgId,
      attributeId
    );
    return {
      status: SUCCESS_STATUS,
      data: attributeOptions,
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Post("/attributes/options/:userId")
  @ApiOperation({ summary: "Assign an attribute to a user" })
  async assignOrganizationAttributeOptionToUser(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("userId", ParseIntPipe) userId: number,
    @Body() bodyAttribute: AssignOrganizationAttributeOptionToUserInput
  ): Promise<AssignOptionUserOutput> {
    const attributeOption =
      await this.organizationsAttributesOptionsService.assignOrganizationAttributeOptionToUser(
        orgId,
        userId,
        bodyAttribute
      );
    return {
      status: SUCCESS_STATUS,
      data: attributeOption,
    };
  }

  @Roles("ORG_MEMBER")
  @PlatformPlan("ESSENTIALS")
  @Delete("/attributes/options/:userId/:attributeOptionId")
  @ApiOperation({ summary: "Unassign an attribute from a user" })
  async unassignOrganizationAttributeOptionFromUser(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("userId", ParseIntPipe) userId: number,
    @Param("attributeOptionId") attributeOptionId: string
  ): Promise<UnassignOptionUserOutput> {
    const attributeOption =
      await this.organizationsAttributesOptionsService.unassignOrganizationAttributeOptionFromUser(
        orgId,
        userId,
        attributeOptionId
      );
    return {
      status: SUCCESS_STATUS,
      data: attributeOption,
    };
  }

  @Roles("ORG_MEMBER")
  @PlatformPlan("ESSENTIALS")
  @Get("/attributes/options/:userId")
  @ApiOperation({ summary: "Get all attribute options for a user" })
  async getOrganizationAttributeOptionsForUser(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("userId", ParseIntPipe) userId: number
  ): Promise<GetOptionUserOutput> {
    const attributeOptions =
      await this.organizationsAttributesOptionsService.getOrganizationAttributeOptionsForUser(orgId, userId);
    return {
      status: SUCCESS_STATUS,
      data: attributeOptions,
    };
  }
}
