import type {
  BookingReference,
  BookingReferencesOutput_2024_08_13,
  CreateTeamMembershipOutput,
  CreateTeamOutput,
  GetTeamEventTypesOutput,
  GetTeamsOutput,
  OrgMeTeamsOutputResponseDto,
  OrgTeamOutputDto,
  TeamEventTypeOutput_2024_06_14,
  TeamMembershipOutput,
  TeamOutputDto,
  UpdateTeamMembershipOutput,
  UpdateTeamOutput,
} from "../../generated/types.gen";

export type Team = TeamOutputDto;
export type TeamList = GetTeamsOutput["data"];
export type TeamCreateResponse = CreateTeamOutput["data"];
export type TeamUpdateResponse = UpdateTeamOutput["data"];
export type TeamMembership = TeamMembershipOutput;
// Note: API spec incorrectly shows single object, but endpoint returns array
export type TeamMembershipList = TeamMembershipOutput[];
export type TeamMembershipCreateResponse = CreateTeamMembershipOutput["data"];
export type TeamMembershipUpdateResponse = UpdateTeamMembershipOutput["data"];

// Types for new org-scoped team endpoints
export type OrgTeam = OrgTeamOutputDto;
export type MyTeamsList = OrgMeTeamsOutputResponseDto["data"];
export type TeamEventType = TeamEventTypeOutput_2024_06_14;
export type TeamEventTypesList = GetTeamEventTypesOutput["data"];
export type BookingReferenceType = BookingReference;
export type BookingReferencesList = BookingReferencesOutput_2024_08_13["data"];

// Booking reference type filter values
export type BookingReferenceFilterType =
  | "google_calendar"
  | "office365_calendar"
  | "daily_video"
  | "google_video"
  | "office365_video"
  | "zoom_video";
