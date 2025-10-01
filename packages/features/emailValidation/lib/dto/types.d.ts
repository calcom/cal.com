export interface EmailValidationRequest {
  email: string;
  ipAddress?: string;
}

export interface EmailValidationResult {
  email: string;
  status: string;
  subStatus?: string;
}

export type EmailValidationStatus = EmailValidationResult["status"];
