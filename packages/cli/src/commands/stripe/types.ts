import type {
  StripConnectOutputResponseDto,
  StripCredentialsCheckOutputResponseDto,
  StripCredentialsSaveOutputResponseDto,
} from "../../generated/types.gen";

export type StripeRedirectResponse = StripConnectOutputResponseDto;
export type StripeSaveResponse = StripCredentialsSaveOutputResponseDto;
export type StripeCheckResponse = StripCredentialsCheckOutputResponseDto;
