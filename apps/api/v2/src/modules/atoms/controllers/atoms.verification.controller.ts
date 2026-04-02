import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
  VERSION_NEUTRAL,
  Version,
} from "@nestjs/common";
import { ApiExcludeController as DocsExcludeController, ApiTags as DocsTags } from "@nestjs/swagger";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { Throttle } from "@/lib/endpoint-throttler-decorator";
import { AddVerifiedEmailInput } from "@/modules/atoms/inputs/add-verified-email.input";
import { CheckEmailVerificationRequiredParams } from "@/modules/atoms/inputs/check-email-verification-required-params";
import { GetVerifiedEmailsParams } from "@/modules/atoms/inputs/get-verified-emails-params";
import { SendVerificationEmailInput } from "@/modules/atoms/inputs/send-verification-email.input";
import { VerifyEmailCodeInput } from "@/modules/atoms/inputs/verify-email-code.input";
import { GetVerifiedEmailsOutput } from "@/modules/atoms/outputs/get-verified-emails-output";
import { SendVerificationEmailOutput } from "@/modules/atoms/outputs/send-verification-email.output";
import { VerifyEmailCodeOutput } from "@/modules/atoms/outputs/verify-email-code.output";
import { VerificationAtomsService } from "@/modules/atoms/services/verification-atom.service";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { UserWithProfile } from "@/modules/users/users.repository";

@Controller({
  path: "/v2/atoms",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Atoms - verification endpoints for atoms")
@DocsExcludeController(true)
export class AtomsVerificationController {
  constructor(private readonly verificationService: VerificationAtomsService) {}

  @Post("/verification/email/send-code")
  @Version(VERSION_NEUTRAL)
  @HttpCode(HttpStatus.OK)
  @Throttle({ limit: 3, ttl: 60000, blockDuration: 60000, name: "atoms_verification_email_send_code" })
  async sendEmailVerificationCode(
    @Body() body: SendVerificationEmailInput
  ): Promise<SendVerificationEmailOutput> {
    const result = await this.verificationService.sendEmailVerificationCode({
      email: body.email,
      username: body.username,
      language: body.language,
      isVerifyingEmail: body.isVerifyingEmail,
    });

    return {
      data: { sent: result.ok && !result.skipped },
      status: SUCCESS_STATUS,
    };
  }

  @Get("/verification/email/check")
  @Version(VERSION_NEUTRAL)
  @HttpCode(HttpStatus.OK)
  async checkEmailVerificationRequired(
    @Query() query: CheckEmailVerificationRequiredParams
  ): Promise<ApiResponse<boolean>> {
    const required = await this.verificationService.checkEmailVerificationRequired({
      email: query.email,
      userSessionEmail: query.userSessionEmail,
    });

    return {
      data: required,
      status: SUCCESS_STATUS,
    };
  }

  @Post("/verification/email/verify-code")
  @Version(VERSION_NEUTRAL)
  @HttpCode(HttpStatus.OK)
  async verifyEmailCode(@Body() body: VerifyEmailCodeInput): Promise<VerifyEmailCodeOutput> {
    await this.verificationService.verifyEmailCodeUnAuthenticated({
      email: body.email,
      code: body.code,
    });

    return {
      data: { verified: true },
      status: SUCCESS_STATUS,
    };
  }

  @Post("/verification/email/verify-code-authenticated")
  @Version(VERSION_NEUTRAL)
  @UseGuards(ApiAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyEmailCodeAuthenticated(
    @Body() body: VerifyEmailCodeInput,
    @GetUser() user: UserWithProfile
  ): Promise<VerifyEmailCodeOutput> {
    const verified = await this.verificationService.verifyEmailCodeAuthenticated(user, {
      email: body.email,
      code: body.code,
    });

    return {
      data: { verified },
      status: SUCCESS_STATUS,
    };
  }

  @Get("/emails/verified-emails")
  @Version(VERSION_NEUTRAL)
  @UseGuards(ApiAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getVerifiedEmails(
    @Query() query: GetVerifiedEmailsParams,
    @GetUser() user: UserWithProfile
  ): Promise<GetVerifiedEmailsOutput> {
    const verifiedEmails = await this.verificationService.getVerifiedEmails({
      userId: user.id,
      userEmail: user.email,
      teamId: query.teamId ? Number(query.teamId) : undefined,
    });

    return {
      data: verifiedEmails,
      status: SUCCESS_STATUS,
    };
  }

  @Post("/emails/verified-emails")
  @Version(VERSION_NEUTRAL)
  @UseGuards(ApiAuthGuard)
  @HttpCode(HttpStatus.OK)
  async addVerifiedEmails(
    @Body() body: AddVerifiedEmailInput,
    @GetUser() user: UserWithProfile
  ): Promise<ApiResponse<{ emailVerified: boolean }>> {
    const emailVerified = await this.verificationService.addVerifiedEmail({
      userId: user.id,
      existingPrimaryEmail: user.email,
      email: body.email,
    });

    return {
      data: { emailVerified },
      status: SUCCESS_STATUS,
    };
  }
}
