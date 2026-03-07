import type {
  ConferencingAppsOutputDto,
  ConferencingAppsOutputResponseDto,
  ConferencingControllerDisconnectData,
  DefaultConferencingAppsOutputDto,
  DisconnectConferencingAppOutputResponseDto,
  GetDefaultConferencingAppOutputResponseDto,
} from "../../generated/types.gen";

export type ConferencingApp = ConferencingAppsOutputDto;
export type ConferencingAppsResponse = ConferencingAppsOutputResponseDto;
export type DefaultConferencingApp = DefaultConferencingAppsOutputDto;
export type DefaultConferencingAppResponse = GetDefaultConferencingAppOutputResponseDto;
export type DisconnectConferencingAppResponse = DisconnectConferencingAppOutputResponseDto;
export type ConferencingAppType = ConferencingControllerDisconnectData["path"]["app"];
