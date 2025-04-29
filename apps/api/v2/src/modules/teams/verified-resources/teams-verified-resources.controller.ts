import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { Throttle } from "@/lib/endpoint-throttler-decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { RequestEmailVerificationInput } from "@/modules/verified-resources/inputs/request-email-verification.input";
import { RequestPhoneVerificationInput } from "@/modules/verified-resources/inputs/request-phone-verification.input";
import { VerifyEmailInput } from "@/modules/verified-resources/inputs/verify-email.input";
import { VerifyPhoneInput } from "@/modules/verified-resources/inputs/verify-phone.input";
import { RequestEmailVerificationOutput } from "@/modules/verified-resources/outputs/request-email-verification-output";
import { RequestPhoneVerificationOutput } from "@/modules/verified-resources/outputs/request-phone-verification-output";
import {
  VerifiedEmailOutput,
  VerifiedEmailOutputData,
  VerifiedEmailsOutput,
} from "@/modules/verified-resources/outputs/verified-email.output";
import {
  VerifiedPhoneOutput,
  VerifiedPhoneOutputData,
  VerifiedPhonesOutput,
} from "@/modules/verified-resources/outputs/verified-phone.output";
import { VerifiedResourcesService } from "@/modules/verified-resources/services/verified-resources.service";
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

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";

@Controller({
  path: "/v2/teams/:teamId/verified-resources",
})
@UseGuards(ApiAuthGuard, RolesGuard)
@ApiTags("Teams Verified Resources")
export class TeamsVerifiedResourcesController {
  constructor(private readonly verifiedResourcesService: VerifiedResourcesService) {}
  @ApiOperation({
    summary: "Request Email Verification Code",
    description: `Sends a verification code to the Email.`,
  })
  @Roles("TEAM_ADMIN")
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Post("/emails/request")
  @Throttle({ limit: 5, ttl: 60000, blockDuration: 60000, name: "teams_verified_resources_emails_requests" })
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
    summary: "Request Phone Number Verification Code",
    description: `Sends a verification code to the phone number.`,
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Roles("TEAM_ADMIN")
  @Post("/phone-numbers/request")
  @Throttle({ limit: 3, ttl: 60000, blockDuration: 60000, name: "teams_verified_resources_phones_requests" })
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
    summary: "Verify an email for a team.",
    description: `Use code to verify an email`,
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Roles("TEAM_ADMIN")
  @Post("/emails/verify")
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() body: VerifyEmailInput,
    @GetUser("id") userId: number,
    @Param("teamId", ParseIntPipe) teamId: number
  ): Promise<VerifiedEmailOutput> {
    const verifiedEmail = await this.verifiedResourcesService.verifyEmail(
      userId,
      body.email,
      body.code,
      teamId
    );
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(VerifiedEmailOutputData, verifiedEmail),
    };
  }

  @ApiOperation({
    summary: "Verify a phone number for an org team.",
    description: `Use code to verify a phone number`,
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Roles("TEAM_ADMIN")
  @Post("/phone-numbers/verify")
  @HttpCode(HttpStatus.OK)
  async verifyPhoneNumber(
    @Body() body: VerifyPhoneInput,
    @GetUser("id") userId: number,
    @Param("teamId", ParseIntPipe) teamId: number
  ): Promise<VerifiedPhoneOutput> {
    const verifiedPhone = await this.verifiedResourcesService.verifyPhone(
      userId,
      body.phone,
      body.code,
      teamId
    );
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(VerifiedPhoneOutputData, verifiedPhone),
    };
  }

  @ApiOperation({
    summary: "Get list of verified emails of a team.",
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Roles("TEAM_ADMIN")
  @Get("/emails")
  @HttpCode(HttpStatus.OK)
  async getVerifiedEmails(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() pagination: SkipTakePagination
  ): Promise<VerifiedEmailsOutput> {
    const verifiedEmails = await this.verifiedResourcesService.getTeamVerifiedEmails(
      teamId,
      pagination.skip,
      pagination.take
    );
    return {
      status: SUCCESS_STATUS,
      data: verifiedEmails.map((verifiedEmail) => plainToClass(VerifiedEmailOutputData, verifiedEmail)),
    };
  }

  @ApiOperation({
    summary: "Get list of verified phone numbers of a team.",
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Get("/phone-numbers")
  @Roles("TEAM_ADMIN")
  @HttpCode(HttpStatus.OK)
  async getVerifiedPhoneNumbers(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() pagination: SkipTakePagination
  ): Promise<VerifiedPhonesOutput> {
    const verifiedPhoneNumbers = await this.verifiedResourcesService.getTeamVerifiedPhoneNumbers(
      teamId,
      pagination.skip,
      pagination.take
    );
    return {
      status: SUCCESS_STATUS,
      data: verifiedPhoneNumbers.map((verifiedPhoneNumber) =>
        plainToClass(VerifiedPhoneOutputData, verifiedPhoneNumber)
      ),
    };
  }

  @ApiOperation({
    summary: "Get verified email of a team by id.",
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Roles("TEAM_ADMIN")
  @Get("/emails/:id")
  @HttpCode(HttpStatus.OK)
  async getVerifiedEmailById(
    @Param("id") id: number,
    @Param("teamId", ParseIntPipe) teamId: number
  ): Promise<VerifiedEmailOutput> {
    const verifiedEmail = await this.verifiedResourcesService.getTeamVerifiedEmailById(teamId, id);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(VerifiedEmailOutputData, verifiedEmail),
    };
  }

  @ApiOperation({
    summary: "Get verified phone number of a team by id.",
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Roles("TEAM_ADMIN")
  @Get("/phone-numbers/:id")
  @HttpCode(HttpStatus.OK)
  async getVerifiedPhoneById(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("id") id: number
  ): Promise<VerifiedPhoneOutput> {
    const verifiedPhoneNumber = await this.verifiedResourcesService.getTeamVerifiedPhoneNumberById(
      teamId,
      id
    );
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(VerifiedPhoneOutputData, verifiedPhoneNumber),
    };
  }
}
