import { SUCCESS_STATUS } from "@calcom/platform-constants";
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
import { Pbac } from "@/modules/auth/decorators/pbac/pbac.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { PbacGuard } from "@/modules/auth/guards/pbac/pbac.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { CreateOrganizationAttributeOptionInput } from "@/modules/organizations/attributes/options/inputs/create-organization-attribute-option.input";
import { GetAssignedAttributeOptions } from "@/modules/organizations/attributes/options/inputs/get-assigned-attribute-options.input";
import { AssignOrganizationAttributeOptionToUserInput } from "@/modules/organizations/attributes/options/inputs/organizations-attributes-options-assign.input";
import { UpdateOrganizationAttributeOptionInput } from "@/modules/organizations/attributes/options/inputs/update-organizaiton-attribute-option.input.ts";
import {
  AssignOptionUserOutput,
  UnassignOptionUserOutput,
} from "@/modules/organizations/attributes/options/outputs/assign-option-user.output";
import { GetAllAttributeAssignedOptionOutput } from "@/modules/organizations/attributes/options/outputs/assigned-options.output";
import { CreateAttributeOptionOutput } from "@/modules/organizations/attributes/options/outputs/create-option.output";
import { DeleteAttributeOptionOutput } from "@/modules/organizations/attributes/options/outputs/delete-option.output";
import { GetAllAttributeOptionOutput } from "@/modules/organizations/attributes/options/outputs/get-option.output";
import { GetOptionUserOutput } from "@/modules/organizations/attributes/options/outputs/get-option-user.output";
import { UpdateAttributeOptionOutput } from "@/modules/organizations/attributes/options/outputs/update-option.output";
import { OrganizationAttributeOptionService } from "@/modules/organizations/attributes/options/services/organization-attributes-option.service";

@Controller({
  path: "/v2/organizations/:orgId",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, PbacGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Attributes / Options")
@ApiHeader(API_KEY_HEADER)
export class OrganizationsAttributesOptionsController {
  constructor(private readonly organizationsAttributesOptionsService: OrganizationAttributeOptionService) {}

  @Roles("ORG_ADMIN")
  @Pbac(["organization.attributes.create"])
  @PlatformPlan("ESSENTIALS")
  @Post("/attributes/:attributeId/options")
  @ApiOperation({
    summary: "Create an attribute option",
    description:
      "Required membership role: `org admin`. PBAC permission: `organization.attributes.create`. Learn more about API access control at https://cal.com/docs/api-reference/v2/access-control",
  })
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
  @Pbac(["organization.attributes.delete"])
  @PlatformPlan("ESSENTIALS")
  @Delete("/attributes/:attributeId/options/:optionId")
  @ApiOperation({
    summary: "Delete an attribute option",
    description:
      "Required membership role: `org admin`. PBAC permission: `organization.attributes.delete`. Learn more about API access control at https://cal.com/docs/api-reference/v2/access-control",
  })
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
  @Pbac(["organization.attributes.update"])
  @PlatformPlan("ESSENTIALS")
  @Patch("/attributes/:attributeId/options/:optionId")
  @ApiOperation({
    summary: "Update an attribute option",
    description:
      "Required membership role: `org admin`. PBAC permission: `organization.attributes.update`. Learn more about API access control at https://cal.com/docs/api-reference/v2/access-control",
  })
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
  @Pbac(["organization.attributes.read"])
  @PlatformPlan("ESSENTIALS")
  @Get("/attributes/:attributeId/options")
  @ApiOperation({
    summary: "Get all attribute options",
    description:
      "Required membership role: `org member`. PBAC permission: `organization.attributes.read`. Learn more about API access control at https://cal.com/docs/api-reference/v2/access-control",
  })
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

  @Roles("ORG_MEMBER")
  @Pbac(["organization.attributes.read"])
  @PlatformPlan("ESSENTIALS")
  @Get("/attributes/:attributeId/options/assigned")
  @ApiOperation({
    summary: "Get all assigned attribute options by attribute ID",
    description:
      "Required membership role: `org member`. PBAC permission: `organization.attributes.read`. Learn more about API access control at https://cal.com/docs/api-reference/v2/access-control",
  })
  async getOrganizationAttributeAssignedOptions(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("attributeId") attributeId: string,
    @Query() queryParams: GetAssignedAttributeOptions
  ): Promise<GetAllAttributeAssignedOptionOutput> {
    const { skip, take, ...rest } = queryParams;
    const attributeOptions =
      await this.organizationsAttributesOptionsService.getOrganizationAttributeAssignedOptions({
        organizationId: orgId,
        attributeId,
        skip: skip ?? 0,
        take: take ?? 250,
        filters: rest,
      });
    return {
      status: SUCCESS_STATUS,
      data: attributeOptions,
    };
  }

  @Roles("ORG_MEMBER")
  @Pbac(["organization.attributes.read"])
  @PlatformPlan("ESSENTIALS")
  @Get("/attributes/slugs/:attributeSlug/options/assigned")
  @ApiOperation({
    summary: "Get all assigned attribute options by attribute slug",
    description:
      "Required membership role: `org member`. PBAC permission: `organization.attributes.read`. Learn more about API access control at https://cal.com/docs/api-reference/v2/access-control",
  })
  async getOrganizationAttributeAssignedOptionsBySlug(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("attributeSlug") attributeSlug: string,
    @Query() queryParams: GetAssignedAttributeOptions
  ): Promise<GetAllAttributeAssignedOptionOutput> {
    const { skip, take, ...rest } = queryParams;
    const attributeOptions =
      await this.organizationsAttributesOptionsService.getOrganizationAttributeAssignedOptions({
        organizationId: orgId,
        attributeSlug,
        skip: skip ?? 0,
        take: take ?? 250,
        filters: rest,
      });
    return {
      status: SUCCESS_STATUS,
      data: attributeOptions,
    };
  }

  @Roles("ORG_ADMIN")
  @Pbac(["organization.attributes.editUsers"])
  @PlatformPlan("ESSENTIALS")
  @Post("/attributes/options/:userId")
  @ApiOperation({
    summary: "Assign an attribute to a user",
    description:
      "Required membership role: `org admin`. PBAC permission: `organization.attributes.editUsers`. Learn more about API access control at https://cal.com/docs/api-reference/v2/access-control",
  })
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
  @Pbac(["organization.attributes.editUsers"])
  @PlatformPlan("ESSENTIALS")
  @Delete("/attributes/options/:userId/:attributeOptionId")
  @ApiOperation({
    summary: "Unassign an attribute from a user",
    description:
      "Required membership role: `org member`. PBAC permission: `organization.attributes.editUsers`. Learn more about API access control at https://cal.com/docs/api-reference/v2/access-control",
  })
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
  @Pbac(["organization.attributes.read"])
  @PlatformPlan("ESSENTIALS")
  @Get("/attributes/options/:userId")
  @ApiOperation({
    summary: "Get all attribute options for a user",
    description:
      "Required membership role: `org member`. PBAC permission: `organization.attributes.read`. Learn more about API access control at https://cal.com/docs/api-reference/v2/access-control",
  })
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
