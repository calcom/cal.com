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
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { User } from "@prisma/client";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

import { API_VERSIONS_VALUES } from "../../../lib/api-versions";
import { PlatformPlan } from "../../auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "../../auth/decorators/get-user/get-user.decorator";
import { Roles } from "../../auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "../../auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "../../auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "../../auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "../../auth/guards/organizations/is-org.guard";
import { RolesGuard } from "../../auth/guards/roles/roles.guard";
import { UpdateDelegationCredentialInput } from "../../organizations/delegation-credentials/inputs/update-delegation-credential.input";
import { CreateDelegationCredentialOutput } from "../../organizations/delegation-credentials/outputs/create-delegation-credential.output";
import { DelegationCredentialOutput } from "../../organizations/delegation-credentials/outputs/delegation-credential.output";
import { UpdateDelegationCredentialOutput } from "../../organizations/delegation-credentials/outputs/update-delegation-credential.output";
import { OrganizationsDelegationCredentialService } from "../../organizations/delegation-credentials/services/organizations-delegation-credential.service";
import { CreateDelegationCredentialInput } from "./inputs/create-delegation-credential.input";

@Controller({
  path: "/v2/organizations/:orgId/delegation-credentials",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Delegation Credentials")
export class OrganizationsDelegationCredentialController {
  constructor(private readonly delegationCredentialService: OrganizationsDelegationCredentialService) {}

  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @Roles("ORG_ADMIN")
  @PlatformPlan("SCALE")
  @ApiOperation({ summary: "Save delegation credentials for your organization." })
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
  @ApiOperation({ summary: "Update delegation credentials of your organization." })
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
