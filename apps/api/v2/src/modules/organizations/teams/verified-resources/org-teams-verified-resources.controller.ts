import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { Throttle } from "@/lib/endpoint-throttler-decorator";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { RequestEmailVerificationInput } from "@/modules/verified-resources/inputs/request-email-verification.input";
import { RequestPhoneVerificationInput } from "@/modules/verified-resources/inputs/request-phone-verification.input";
import { VerifyEmailInput } from "@/modules/verified-resources/inputs/verify-email.input";
import { VerifyPhoneInput } from "@/modules/verified-resources/inputs/verify-phone.input";
import { RequestEmailVerificationOutput } from "@/modules/verified-resources/outputs/request-email-verification-output";
import { RequestPhoneVerificationOutput } from "@/modules/verified-resources/outputs/request-phone-verification-output";
import {
  TeamVerifiedEmailOutput,
  TeamVerifiedEmailOutputData,
  TeamVerifiedEmailsOutput,
} from "@/modules/verified-resources/outputs/verified-email.output";
import {
  TeamVerifiedPhoneOutput,
  TeamVerifiedPhoneOutputData,
  TeamVerifiedPhonesOutput,
} from "@/modules/verified-resources/outputs/verified-phone.output";
import { VerifiedResourcesService } from "@/modules/verified-resources/services/verified-resources.service";

@Controller({
  path: "/v2/organizations/:orgId/teams/:teamId/verified-resources",
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@ApiTags("Organization Team Verified Resources")
export class OrgTeamsVerifiedResourcesController {
  constructor(private readonly verifiedResourcesService: VerifiedResourcesService) {}
  @ApiOperation({
    summary: "Request email verification code",
    description: `Sends a verification code to the email`,
  })
  @Roles("TEAM_ADMIN")
  @Throttle({
    limit: 3,
    ttl: 60000,
    blockDuration: 60000,
    name: "org_teams_verified_resources_emails_requests",
  })
  @PlatformPlan("ESSENTIALS")
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Post("/emails/verification-code/request")
  @HttpCode(HttpStatus.OK)
  async requestEmailVerificationCode(
    @Body() body: RequestEmailVerificationInput,
    @GetUser("username") username: string,
    @GetUser("locale") locale: string
  ): Promise<RequestEmailVerificationOutput> {
    const verificationCodeRequest = await this.verifiedResourcesService.requestEmailVerificationCode(
      { username, locale },
      body.email
    );

    return {
      status: verificationCodeRequest ? SUCCESS_STATUS : ERROR_STATUS,
    };
  }

  @ApiOperation({
    summary: "Request phone number verification code",
    description: `Sends a verification code to the phone number`,
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Roles("TEAM_ADMIN")
  @Throttle({
    limit: 3,
    ttl: 60000,
    blockDuration: 60000,
    name: "org_teams_verified_resources_phones_requests",
  })
  @Post("/phones/verification-code/request")
  @HttpCode(HttpStatus.OK)
  async requestPhoneVerificationCode(
    @Body() body: RequestPhoneVerificationInput
  ): Promise<RequestPhoneVerificationOutput> {
    const verificationCodeRequest = await this.verifiedResourcesService.requestPhoneVerificationCode(
      body.phone
    );

    return {
      status: verificationCodeRequest ? SUCCESS_STATUS : ERROR_STATUS,
    };
  }

  @ApiOperation({
    summary: "Verify an email for an org team",
    description: `Use code to verify an email`,
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Post("/emails/verification-code/verify")
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() body: VerifyEmailInput,
    @GetUser("id") userId: number,
    @Param("teamId", ParseIntPipe) teamId: number
  ): Promise<TeamVerifiedEmailOutput> {
    const verifiedEmail = await this.verifiedResourcesService.verifyEmail(
      userId,
      body.email,
      body.code,
      teamId
    );
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamVerifiedEmailOutputData, verifiedEmail),
    };
  }

  @ApiOperation({
    summary: "Verify a phone number for an org team",
    description: `Use code to verify a phone number`,
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Post("/phones/verification-code/verify")
  @Throttle({
    limit: 3,
    ttl: 60000,
    blockDuration: 60000,
    name: "org_teams_verified_resources_phones_verify",
  })
  @HttpCode(HttpStatus.OK)
  async verifyPhoneNumber(
    @Body() body: VerifyPhoneInput,
    @GetUser("id") userId: number,
    @Param("teamId", ParseIntPipe) teamId: number
  ): Promise<TeamVerifiedPhoneOutput> {
    const verifiedPhone = await this.verifiedResourcesService.verifyPhone(
      userId,
      body.phone,
      body.code,
      teamId
    );
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamVerifiedPhoneOutputData, verifiedPhone),
    };
  }

  @ApiOperation({
    summary: "Get list of verified emails of an org team",
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Get("/emails")
  @HttpCode(HttpStatus.OK)
  async getVerifiedEmails(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() pagination: SkipTakePagination
  ): Promise<TeamVerifiedEmailsOutput> {
    const verifiedEmails = await this.verifiedResourcesService.getTeamVerifiedEmails(
      teamId,
      pagination?.skip ?? 0,
      pagination?.take ?? 250
    );
    return {
      status: SUCCESS_STATUS,
      data: verifiedEmails.map((verifiedEmail) => plainToClass(TeamVerifiedEmailOutputData, verifiedEmail)),
    };
  }

  @ApiOperation({
    summary: "Get list of verified phone numbers of an org team",
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @PlatformPlan("ESSENTIALS")
  @Get("/phones")
  @Roles("TEAM_ADMIN")
  @HttpCode(HttpStatus.OK)
  async getVerifiedPhoneNumbers(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() pagination: SkipTakePagination
  ): Promise<TeamVerifiedPhonesOutput> {
    const verifiedPhoneNumbers = await this.verifiedResourcesService.getTeamVerifiedPhoneNumbers(
      teamId,
      pagination?.skip ?? 0,
      pagination?.take ?? 250
    );
    return {
      status: SUCCESS_STATUS,
      data: verifiedPhoneNumbers.map((verifiedPhoneNumber) =>
        plainToClass(TeamVerifiedPhoneOutputData, verifiedPhoneNumber)
      ),
    };
  }

  @ApiOperation({
    summary: "Get verified email of an org team by id",
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Get("/emails/:id")
  @HttpCode(HttpStatus.OK)
  async getVerifiedEmailById(
    @Param("id") id: number,
    @Param("teamId", ParseIntPipe) teamId: number
  ): Promise<TeamVerifiedEmailOutput> {
    const verifiedEmail = await this.verifiedResourcesService.getTeamVerifiedEmailById(teamId, id);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamVerifiedEmailOutputData, verifiedEmail),
    };
  }

  @ApiOperation({
    summary: "Get verified phone number of an org team by id",
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Get("/phones/:id")
  @HttpCode(HttpStatus.OK)
  async getVerifiedPhoneById(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("id") id: number
  ): Promise<TeamVerifiedPhoneOutput> {
    const verifiedPhoneNumber = await this.verifiedResourcesService.getTeamVerifiedPhoneNumberById(
      teamId,
      id
    );
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(TeamVerifiedPhoneOutputData, verifiedPhoneNumber),
    };
  }
}
