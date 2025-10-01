import type { EmailValidationRequest, EmailValidationResult, EmailValidationStatus } from "../dto/types";

export interface IEmailValidationService {
  validateEmail(request: EmailValidationRequest): Promise<EmailValidationResult>;
  isEmailBlocked(status: EmailValidationStatus): boolean;
}
