import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import {
  OPTIONAL_X_CAL_CLIENT_ID_HEADER,
  OPTIONAL_X_CAL_SECRET_KEY_HEADER,
  OPTIONAL_API_KEY_HEADER,
} from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { UpdateDelegationCredentialInput } from "@/modules/organizations/delegation-credentials/inputs/update-delegation-credential.input";
import { CreateDelegationCredentialOutput } from "@/modules/organizations/delegation-credentials/outputs/create-delegation-credential.output";
import { DelegationCredentialOutput } from "@/modules/organizations/delegation-credentials/outputs/delegation-credential.output";
import { UpdateDelegationCredentialOutput } from "@/modules/organizations/delegation-credentials/outputs/update-delegation-credential.output";
import { OrganizationsDelegationCredentialService } from "@/modules/organizations/delegation-credentials/services/organizations-delegation-credential.service";
import {
  Controller,
  UseGuards,
  Param,
  ParseIntPipe,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Patch,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { User } from "@calcom/prisma/client";

import { CreateDelegationCredentialInput } from "./inputs/create-delegation-credential.input";

@Controller({
  path: "/v2/organizations/:orgId/delegation-credentials",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Delegation Credentials")
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_HEADER)
export class OrganizationsDelegationCredentialController {
  constructor(private readonly delegationCredentialService: OrganizationsDelegationCredentialService) {}

  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @ApiOperation({ summary: "Save delegation credentials for your organization" })
  async createDelegationCredential(
    @Param("orgId", ParseIntPipe) orgId: number,
    @GetUser() delegatedServiceAccountUser: User,
    @Body() body: CreateDelegationCredentialInput
  ): Promise<CreateDelegationCredentialOutput> {
    const delegationCredential = await this.delegationCredentialService.createDelegationCredential(
      orgId,
      delegatedServiceAccountUser,
      body
    );
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(DelegationCredentialOutput, delegationCredential, { strategy: "excludeAll" }),
    };
  }

  @Patch("/:credentialId")
  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @ApiOperation({ summary: "Update delegation credentials of your organization" })
  async updateDelegationCredential(
    @Param("orgId", ParseIntPipe) orgId: number,
    @GetUser() delegatedServiceAccountUser: User,
    @Body() body: UpdateDelegationCredentialInput,
    @Param("credentialId") credentialId: string
  ): Promise<UpdateDelegationCredentialOutput> {
    const delegationCredential = await this.delegationCredentialService.updateDelegationCredential(
      orgId,
      credentialId,
      delegatedServiceAccountUser,
      body
    );
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(DelegationCredentialOutput, delegationCredential, { strategy: "excludeAll" }),
    };
  }
}
