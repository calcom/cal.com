import type {
  ConferencingAppsOutputDto,
  ConferencingAppsOutputResponseDto,
  DisconnectConferencingAppOutputResponseDto,
  GetConferencingAppsOauthUrlResponseDto,
  OrganizationsConferencingControllerConnectTeamAppData,
  OrganizationsConferencingControllerDisconnectTeamAppData,
  OrganizationsConferencingControllerGetTeamOAuthUrlData,
  OrganizationsConferencingControllerSetTeamDefaultAppData,
  SetDefaultConferencingAppOutputResponseDto,
} from "../../generated/types.gen";

export type TeamConferencingApp = ConferencingAppsOutputDto;
export type TeamConferencingAppsResponse = ConferencingAppsOutputResponseDto;
export type TeamSetDefaultConferencingAppResponse = SetDefaultConferencingAppOutputResponseDto;
export type TeamDisconnectConferencingAppResponse = DisconnectConferencingAppOutputResponseDto;
export type TeamOAuthUrlResponse = GetConferencingAppsOauthUrlResponseDto;

export type TeamConferencingConnectAppType =
  OrganizationsConferencingControllerConnectTeamAppData["path"]["app"];
export type TeamConferencingOAuthAppType =
  OrganizationsConferencingControllerGetTeamOAuthUrlData["path"]["app"];
export type TeamConferencingDefaultAppType =
  OrganizationsConferencingControllerSetTeamDefaultAppData["path"]["app"];
export type TeamConferencingDisconnectAppType =
  OrganizationsConferencingControllerDisconnectTeamAppData["path"]["app"];
