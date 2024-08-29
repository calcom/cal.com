import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

import { CreateOrganizationAttributeOptionInput } from "@/modules/organizations/inputs/attributes/options/create-organization-attribute-option.input";
import { AssignOrganizationAttributeOptionToUserInput } from "@/modules/organizations/inputs/attributes/assign/organizations-attributes-options-assign.input";
import { OrganizationAttributeOptionService } from "@/modules/organizations/services/attributes/organization-attreibute-option.service";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { UpdateOrganizationAttributeOptionInput } from "@/modules/organizations/inputs/attributes/options/update-organizaiton-attribute-option.input.ts";

@Controller({
  path: "/v2/organizations/:orgId",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
export class OrganizationsOptionsAttributesController {
  constructor(private readonly organizationsAttributesOptionsService: OrganizationAttributeOptionService) {}

  // Creates an attribute option for an attribute
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Post("/attributes/:attributeId/options")
  async createOrganizationAttributeOption(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("attributeId") attributeId: string,
    @Body() bodyAttribute: CreateOrganizationAttributeOptionInput
  ) {
    const attributeOption = await this.organizationsAttributesOptionsService.createOrganizationAttributeOption(orgId, attributeId, bodyAttribute);
    return {
      status: SUCCESS_STATUS,
      data: attributeOption,
    };
  }

  // Deletes an attribute option for an attribute
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Delete("/attributes/:attributeId/options/:optionId")
  async deleteOrganizationAttributeOption(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("attributeId") attributeId: string,
    @Param("optionId") optionId: string
  ) {
    const attributeOption = await this.organizationsAttributesOptionsService.deleteOrganizationAttributeOption(orgId, attributeId, optionId);
    return {
      status: SUCCESS_STATUS,
      data: attributeOption,
    };
  }

  // Updates an attribute option for an attribute
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Patch("/attributes/:attributeId/options/:optionId")
  async updateOrganizationAttributeOption(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("attributeId") attributeId: string,
    @Param("optionId") optionId: string,
    @Body() bodyAttribute: UpdateOrganizationAttributeOptionInput
  ) {
    const attributeOption = await this.organizationsAttributesOptionsService.updateOrganizationAttributeOption(orgId, attributeId, optionId, bodyAttribute);
    return {
      status: SUCCESS_STATUS,
      data: attributeOption,
    };
  }

  // Gets all attribute options for an attribute
  @Roles("ORG_MEMBER")
  @PlatformPlan("ESSENTIALS")
  @Get("/attributes/:attributeId/options")
  async getOrganizationAttributeOptions(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("attributeId") attributeId: string
  ) {
    const attributeOptions = await this.organizationsAttributesOptionsService.getOrganizationAttributeOptions(orgId, attributeId);
    return {
      status: SUCCESS_STATUS,
      data: attributeOptions,
    };
  }

  // Assign attribute option to user
  @Roles("ORG_MEMBER")
  @PlatformPlan("ESSENTIALS")
  @Post("/attributes/options/:userId/:attributeId")
  async assignOrganizationAttributeOptionToUser(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("userId", ParseIntPipe) userId: number,
    @Param("attributeId") attributeId: string,
    @Body() bodyAttribute: AssignOrganizationAttributeOptionToUserInput
  ) {
    const attributeOption = await this.organizationsAttributesOptionsService.assignOrganizationAttributeOptionToUser(orgId, userId, attributeId, bodyAttribute);
    return {
      status: SUCCESS_STATUS,
      data: attributeOption,
    };
  }

  // Unassign attribute option from user
  @Roles("ORG_MEMBER")
  @PlatformPlan("ESSENTIALS")
  @Delete("/attributes/options/:userId/:attributeOptionId")
  async unassignOrganizationAttributeOptionFromUser(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("userId", ParseIntPipe) userId: number,
    @Param("attributeOptionId") attributeOptionId: string
  ) {
    const attributeOption = await this.organizationsAttributesOptionsService.unassignOrganizationAttributeOptionFromUser(orgId, userId, attributeOptionId);
    return {
      status: SUCCESS_STATUS,
      data: attributeOption,
    };
  }
}
