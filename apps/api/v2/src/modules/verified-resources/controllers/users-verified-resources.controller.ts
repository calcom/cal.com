import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { Throttle } from "@/lib/endpoint-throttler-decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { RequestEmailVerificationInput } from "@/modules/verified-resources/inputs/request-email-verification.input";
import { RequestPhoneVerificationInput } from "@/modules/verified-resources/inputs/request-phone-verification.input";
import { VerifyEmailInput } from "@/modules/verified-resources/inputs/verify-email.input";
import { VerifyPhoneInput } from "@/modules/verified-resources/inputs/verify-phone.input";
import { RequestEmailVerificationOutput } from "@/modules/verified-resources/outputs/request-email-verification-output";
import { RequestPhoneVerificationOutput } from "@/modules/verified-resources/outputs/request-phone-verification-output";
import {
  UserVerifiedEmailOutput,
  UserVerifiedEmailOutputData,
  UserVerifiedEmailsOutput,
} from "@/modules/verified-resources/outputs/verified-email.output";
import {
  UserVerifiedPhoneOutput,
  UserVerifiedPhoneOutputData,
  UserVerifiedPhonesOutput,
} from "@/modules/verified-resources/outputs/verified-phone.output";
import { VerifiedResourcesService } from "@/modules/verified-resources/services/verified-resources.service";
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";

@Controller({
  path: "/v2/verified-resources",
})
@UseGuards(ApiAuthGuard)
@ApiTags("Verified Resources")
export class UserVerifiedResourcesController {
  constructor(private readonly verifiedResourcesService: VerifiedResourcesService) {}
  @ApiOperation({
    summary: "Request email verification code",
    description: `Sends a verification code to the email`,
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Post("/emails/verification-code/request")
  @HttpCode(HttpStatus.OK)
  @Throttle({ limit: 5, ttl: 60000, blockDuration: 60000, name: "users_verified_resources_emails_requests" })
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
  @Post("/phones/verification-code/request")
  @HttpCode(HttpStatus.OK)
  @Throttle({ limit: 3, ttl: 60000, blockDuration: 60000, name: "users_verified_resources_phones_requests" })
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
    summary: "Verify an email",
    description: `Use code to verify an email`,
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Post("/emails/verification-code/verify")
  @Throttle({ limit: 3, ttl: 60000, blockDuration: 60000, name: "users_verified_resources_phones_verify" })
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() body: VerifyEmailInput,
    @GetUser("id") userId: number
  ): Promise<UserVerifiedEmailOutput> {
    const verifiedEmail = await this.verifiedResourcesService.verifyEmail(userId, body.email, body.code);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(UserVerifiedEmailOutputData, verifiedEmail),
    };
  }

  @ApiOperation({
    summary: "Verify a phone number",
    description: `Use code to verify a phone number`,
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Post("/phones/verification-code/verify")
  @HttpCode(HttpStatus.OK)
  async verifyPhoneNumber(
    @Body() body: VerifyPhoneInput,
    @GetUser("id") userId: number
  ): Promise<UserVerifiedPhoneOutput> {
    const verifiedPhone = await this.verifiedResourcesService.verifyPhone(userId, body.phone, body.code);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(UserVerifiedPhoneOutputData, verifiedPhone),
    };
  }

  @ApiOperation({
    summary: "Get list of verified emails",
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Get("/emails")
  @HttpCode(HttpStatus.OK)
  async getVerifiedEmails(
    @GetUser("id") userId: number,
    @Query() pagination: SkipTakePagination
  ): Promise<UserVerifiedEmailsOutput> {
    const verifiedEmails = await this.verifiedResourcesService.getUserVerifiedEmails(
      userId,
      pagination?.skip ?? 0,
      pagination?.take ?? 250
    );
    return {
      status: SUCCESS_STATUS,
      data: verifiedEmails.map((verifiedEmail) => plainToClass(UserVerifiedEmailOutputData, verifiedEmail)),
    };
  }

  @ApiOperation({
    summary: "Get list of verified phone numbers",
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Get("/phones")
  @HttpCode(HttpStatus.OK)
  async getVerifiedPhoneNumbers(
    @GetUser("id") userId: number,
    @Query() pagination: SkipTakePagination
  ): Promise<UserVerifiedPhonesOutput> {
    const verifiedPhoneNumbers = await this.verifiedResourcesService.getUserVerifiedPhoneNumbers(
      userId,
      pagination?.skip ?? 0,
      pagination?.take ?? 250
    );
    return {
      status: SUCCESS_STATUS,
      data: verifiedPhoneNumbers.map((verifiedPhoneNumber) =>
        plainToClass(UserVerifiedPhoneOutputData, verifiedPhoneNumber)
      ),
    };
  }

  @ApiOperation({
    summary: "Get verified email by id",
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Get("/emails/:id")
  @HttpCode(HttpStatus.OK)
  async getVerifiedEmailById(
    @GetUser("id") userId: number,
    @Param("id") id: number
  ): Promise<UserVerifiedEmailOutput> {
    const verifiedEmail = await this.verifiedResourcesService.getUserVerifiedEmailById(userId, id);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(UserVerifiedEmailOutputData, verifiedEmail),
    };
  }

  @ApiOperation({
    summary: "Get verified phone number by id",
  })
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @Get("/phones/:id")
  @HttpCode(HttpStatus.OK)
  async getVerifiedPhoneById(
    @GetUser("id") userId: number,
    @Param("id") id: number
  ): Promise<UserVerifiedPhoneOutput> {
    const verifiedPhoneNumber = await this.verifiedResourcesService.getUserVerifiedPhoneNumberById(
      userId,
      id
    );
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(UserVerifiedPhoneOutputData, verifiedPhoneNumber),
    };
  }
}
