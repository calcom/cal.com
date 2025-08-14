import { Injectable } from "@nestjs/common";

import {
  verifyCodeUnAuthenticated,
  verifyCodeAuthenticated,
  sendVerifyEmailCode,
  type VerifyCodeUnAuthenticatedInput,
  type VerifyCodeAuthenticatedInput,
  type SendVerifyEmailCodeInput,
} from "@calcom/platform-libraries";

@Injectable()
export class VerificationAtomsService {
  async verifyEmailCodeUnAuthenticated(input: VerifyCodeUnAuthenticatedInput) {
    return verifyCodeUnAuthenticated(input);
  }

  async verifyEmailCodeAuthenticated(input: VerifyCodeAuthenticatedInput) {
    return verifyCodeAuthenticated(input);
  }

  async sendEmailVerificationCode(input: SendVerifyEmailCodeInput) {
    return sendVerifyEmailCode(input);
  }
}
