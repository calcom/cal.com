import type {
  OrganizationsStripeControllerCheckTeamStripeConnectionResponse,
  OrganizationsStripeControllerGetTeamStripeConnectUrlResponse,
  OrganizationsStripeControllerSaveResponse,
  StripConnectOutputDto,
  StripCredentialsCheckOutputResponseDto,
  StripCredentialsSaveOutputResponseDto,
} from "../../generated/types.gen";

export type TeamStripeConnectUrlResponse = OrganizationsStripeControllerGetTeamStripeConnectUrlResponse;
export type TeamStripeCheckResponse = OrganizationsStripeControllerCheckTeamStripeConnectionResponse;
export type TeamStripeSaveResponse = OrganizationsStripeControllerSaveResponse;

export type TeamStripeConnectUrl = StripConnectOutputDto;
export type TeamStripeCheckStatus = StripCredentialsCheckOutputResponseDto;
export type TeamStripeSaveResult = StripCredentialsSaveOutputResponseDto;
