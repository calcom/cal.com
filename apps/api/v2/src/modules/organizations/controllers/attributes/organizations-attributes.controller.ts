import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import {
  CreateOrganizationAttributeInput,
  UpdateOrganizationAttributeInput,
} from "@/modules/organizations/inputs/attributes/create-organization-attribute.input";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";

import { SkipTakePagination } from "@calcom/platform-types";

@Controller({
  path: "/v2/organizations/:orgId",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
export class OrganizationsAttributesController {
  @Roles("ORG_MEMBER")
  @PlatformPlan("ESSENTIALS")
  @Get("/attributes")
  async getOrganizationAttributes(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Query() queryParams: SkipTakePagination
  ) {
    const { skip, take } = queryParams;
    // return this.organizationsAttributesService.getOrganizationAttributes(orgId);
    return "";
  }

  @Roles("ORG_MEMBER")
  @PlatformPlan("ESSENTIALS")
  @Get("/attributes/:attributeId")
  async getOrganizationAttribute(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("attributeId", ParseIntPipe) attributeId: number
  ) {
    // return this.organizationsAttributesService.getOrganizationAttribute(orgId, attributeId);
    return "";
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Post("/attributes")
  async createOrganizationAttribute(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Body() bodyAttribute: CreateOrganizationAttributeInput
  ) {
    // return this.organizationsAttributesService.createOrganizationAttribute(orgId, bodyAttribute);
    return "";
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Patch("/attributes/:attributeId")
  async updateOrganizationAttribute(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("attributeId", ParseIntPipe) attributeId: number,
    @Body() bodyAttribute: UpdateOrganizationAttributeInput
  ) {
    // return this.organizationsAttributesService.updateOrganizationAttribute(orgId, attributeId, bodyAttribute);
    return "";
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Delete("/attributes/:attributeId")
  async deleteOrganizationAttribute(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("attributeId", ParseIntPipe) attributeId: number
  ) {
    // return this.organizationsAttributesService.deleteOrganizationAttribute(orgId, attributeId);
    return "";
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Post("/attributes/assign/:userId")
  async assignOrganizationAttributeToUser(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("userId", ParseIntPipe) userId: number,
    @Body() bodyAttribute: AssignOrganizationAttributeToUserInput
  ) {
    // return this.organizationsAttributesService.assignOrganizationAttributeToUser(orgId, userId, bodyAttribute);
    return "";
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Delete("/attributes/assign/:userId")
  async unassignOrganizationAttributeFromUser(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("userId", ParseIntPipe) userId: number,
    @Body() bodyAttribute: AssignOrganizationAttributeToUserInput
  ) {
    // return this.organizationsAttributesService.unassignOrganizationAttributeFromUser(orgId, userId, bodyAttribute);
    return "";
  }

  @Roles("ORG_MEMBER")
  @PlatformPlan("ESSENTIALS")
  @Get("/attributes/assigned/:userId")
  async getAssignedOrganizationAttributesToUser(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("userId", ParseIntPipe) userId: number,
    @Query() queryParams: SkipTakePagination
  ) {
    const { skip, take } = queryParams;
    // return this.organizationsAttributesService.getAssignedOrganizationAttributesToUser(orgId, userId, skip, take);
    return "";
  }
}
