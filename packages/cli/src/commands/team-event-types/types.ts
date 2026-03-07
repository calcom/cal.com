import type {
  CreateTeamEventTypeOutput,
  GetTeamEventTypeOutput,
  GetTeamEventTypesOutput,
  TeamEventTypeOutput_2024_06_14,
  UpdateTeamEventTypeOutput,
} from "../../generated/types.gen";

export type TeamEventType = TeamEventTypeOutput_2024_06_14;
export type TeamEventTypeList = GetTeamEventTypesOutput["data"];
export type TeamEventTypeGetResponse = GetTeamEventTypeOutput["data"];
export type TeamEventTypeCreateResponse = CreateTeamEventTypeOutput["data"];
export type TeamEventTypeUpdateResponse = UpdateTeamEventTypeOutput["data"];
