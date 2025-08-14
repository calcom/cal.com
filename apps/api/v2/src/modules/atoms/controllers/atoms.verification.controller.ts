import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { SendVerificationEmailInput } from "@/modules/atoms/inputs/send-verification-email.input";
import { VerifyEmailCodeInput } from "@/modules/atoms/inputs/verify-email-code.input";
import { SendVerificationEmailOutput } from "@/modules/atoms/outputs/send-verification-email.output";
import { VerifyEmailCodeOutput } from "@/modules/atoms/outputs/verify-email-code.output";
import { VerificationAtomsService } from "@/modules/atoms/services/verification-atom.service";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { UserWithProfile } from "@/modules/users/users.repository";
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Version,
  VERSION_NEUTRAL,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags as DocsTags, ApiExcludeController as DocsExcludeController } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

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

  @Post("/verification/email/verify-code")
  @Version(VERSION_NEUTRAL)
  @HttpCode(HttpStatus.OK)
  async verifyEmailCode(@Body() body: VerifyEmailCodeInput): Promise<VerifyEmailCodeOutput> {
    const verified = await this.verificationService.verifyEmailCodeUnAuthenticated({
      email: body.email,
      code: body.code,
    });

    return {
      data: { verified },
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
    const verified = await this.verificationService.verifyEmailCodeAuthenticated({
      email: body.email,
      code: body.code,
      userId: user.id,
      userRole: user.role,
    });

    return {
      data: { verified },
      status: SUCCESS_STATUS,
    };
  }
}
