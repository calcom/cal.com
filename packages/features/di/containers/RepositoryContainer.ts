import { createContainer } from "@calcom/features/di/di";
import { DI_TOKENS } from "@calcom/features/di/tokens";
import type { IBookingReferenceRepository } from "@calcom/lib/server/repository/IBookingReferenceRepository";
import type { IDestinationCalendarRepository } from "@calcom/lib/server/repository/IDestinationCalendarRepository";
import type { IHostRepository } from "@calcom/lib/server/repository/IHostRepository";
import type { IOOORepository } from "@calcom/lib/server/repository/IOOORepository";
import type { ISelectedCalendarRepository } from "@calcom/lib/server/repository/ISelectedCalendarRepository";
import type { ISelectedSlotRepository } from "@calcom/lib/server/repository/ISelectedSlotRepository";
import type { ITravelScheduleRepository } from "@calcom/lib/server/repository/ITravelScheduleRepository";
import type { IVerificationTokenRepository } from "@calcom/lib/server/repository/IVerificationTokenRepository";
import type { IWorkflowRelationsRepository } from "@calcom/lib/server/repository/IWorkflowRelationsRepository";
import type { IWorkflowStepRepository } from "@calcom/lib/server/repository/IWorkflowStepRepository";
import type { IRoutingFormResponseRepository } from "@calcom/lib/server/repository/IRoutingFormResponseRepository";
import type { IAttributeRepository } from "@calcom/lib/server/repository/IAttributeRepository";
import type { IApiKeyRepository } from "@calcom/lib/server/repository/IApiKeyRepository";
import type { IHashedLinkRepository } from "@calcom/lib/server/repository/IHashedLinkRepository";
import type { ICalVideoSettingsRepository } from "@calcom/lib/server/repository/ICalVideoSettingsRepository";
import type { IAssignmentReasonRepository } from "@calcom/lib/server/repository/IAssignmentReasonRepository";
import type { IOrgMembershipRepository } from "@calcom/lib/server/repository/IOrgMembershipRepository";
import type { IAppRepository } from "@calcom/lib/server/repository/IAppRepository";
import type { IRoutingFormRepository } from "@calcom/lib/server/repository/IRoutingFormRepository";

import type { IBookingRepository } from "../../bookings/repositories/IBookingRepository";
import type { ICredentialRepository } from "../../credentials/repositories/ICredentialRepository";
import type { ITeamRepository } from "../../ee/teams/repositories/ITeamRepository";
import type { IEventTypeRepository } from "../../eventtypes/repositories/IEventTypeRepository";
import type { IMembershipRepository } from "../../membership/repositories/IMembershipRepository";
import type { IOAuthClientRepository } from "../../oauth/repositories/IOAuthClientRepository";
import type { IProfileRepository } from "../../profile/repositories/IProfileRepository";
import type { IScheduleRepository } from "../../schedules/repositories/IScheduleRepository";
import type { IUserRepository } from "../../users/repositories/IUserRepository";
import { moduleLoader as bookingRepositoryModuleLoader } from "../modules/Booking";
import { moduleLoader as bookingReferenceRepositoryModuleLoader } from "../modules/BookingReference";
import { moduleLoader as credentialRepositoryModuleLoader } from "../modules/Credential";
import { moduleLoader as destinationCalendarRepositoryModuleLoader } from "../modules/DestinationCalendar";
import { moduleLoader as eventTypeRepositoryModuleLoader } from "../modules/EventType";
import { moduleLoader as hostRepositoryModuleLoader } from "../modules/Host";
import { moduleLoader as membershipRepositoryModuleLoader } from "../modules/Membership";
import { moduleLoader as oauthClientRepositoryModuleLoader } from "../modules/OAuthClient";
import { moduleLoader as oooRepositoryModuleLoader } from "../modules/OOO";
import { moduleLoader as profileRepositoryModuleLoader } from "../modules/Profile";
import { scheduleRepositoryModuleLoader } from "../modules/Schedule";
import { selectedCalendarRepositoryModuleLoader } from "../modules/SelectedCalendar";
import { selectedSlotsRepositoryModuleLoader } from "../modules/SelectedSlots";
import { moduleLoader as teamRepositoryModuleLoader } from "../modules/Team";
import { moduleLoader as travelScheduleRepositoryModuleLoader } from "../modules/TravelSchedule";
import { moduleLoader as userRepositoryModuleLoader } from "../modules/User";
import { moduleLoader as verificationTokenRepositoryModuleLoader } from "../modules/VerificationToken";
import { workflowRelationsRepositoryModuleLoader } from "../modules/WorkflowRelations";
import { workflowStepRepositoryModuleLoader } from "../modules/WorkflowStep";
import { routingFormResponseRepositoryModuleLoader } from "../modules/RoutingFormResponse";
import { attributeRepositoryModuleLoader } from "../modules/Attribute";
import { apiKeyRepositoryModuleLoader } from "../modules/ApiKey";
import { hashedLinkRepositoryModuleLoader } from "../modules/HashedLink";
import { calVideoSettingsRepositoryModuleLoader } from "../modules/CalVideoSettings";
import { assignmentReasonRepositoryModuleLoader } from "../modules/AssignmentReason";
import { orgMembershipRepositoryModuleLoader } from "../modules/OrgMembership";
import { appRepositoryModuleLoader } from "../modules/App";
import { routingFormRepositoryModuleLoader } from "../modules/RoutingForm";

const repositoryContainer = createContainer();

// Load all repository modules (dependencies are loaded recursively)
scheduleRepositoryModuleLoader.loadModule(repositoryContainer);
selectedSlotsRepositoryModuleLoader.loadModule(repositoryContainer);
selectedCalendarRepositoryModuleLoader.loadModule(repositoryContainer);
bookingRepositoryModuleLoader.loadModule(repositoryContainer);
userRepositoryModuleLoader.loadModule(repositoryContainer);
teamRepositoryModuleLoader.loadModule(repositoryContainer);
membershipRepositoryModuleLoader.loadModule(repositoryContainer);
eventTypeRepositoryModuleLoader.loadModule(repositoryContainer);
profileRepositoryModuleLoader.loadModule(repositoryContainer);
credentialRepositoryModuleLoader.loadModule(repositoryContainer);
hostRepositoryModuleLoader.loadModule(repositoryContainer);
oauthClientRepositoryModuleLoader.loadModule(repositoryContainer);
bookingReferenceRepositoryModuleLoader.loadModule(repositoryContainer);
destinationCalendarRepositoryModuleLoader.loadModule(repositoryContainer);
oooRepositoryModuleLoader.loadModule(repositoryContainer);
travelScheduleRepositoryModuleLoader.loadModule(repositoryContainer);
verificationTokenRepositoryModuleLoader.loadModule(repositoryContainer);
repositoryContainer.load(workflowRelationsRepositoryModuleLoader());
repositoryContainer.load(workflowStepRepositoryModuleLoader());
repositoryContainer.load(routingFormResponseRepositoryModuleLoader());
repositoryContainer.load(attributeRepositoryModuleLoader());
repositoryContainer.load(apiKeyRepositoryModuleLoader());
repositoryContainer.load(hashedLinkRepositoryModuleLoader());
repositoryContainer.load(calVideoSettingsRepositoryModuleLoader());
repositoryContainer.load(assignmentReasonRepositoryModuleLoader());
repositoryContainer.load(orgMembershipRepositoryModuleLoader());
repositoryContainer.load(appRepositoryModuleLoader());
repositoryContainer.load(routingFormRepositoryModuleLoader());

export function getScheduleRepository(): IScheduleRepository {
  return repositoryContainer.get<IScheduleRepository>(DI_TOKENS.SCHEDULE_REPOSITORY);
}

export function getSelectedSlotRepository(): ISelectedSlotRepository {
  return repositoryContainer.get<ISelectedSlotRepository>(DI_TOKENS.SELECTED_SLOT_REPOSITORY);
}

export function getSelectedCalendarRepository(): ISelectedCalendarRepository {
  return repositoryContainer.get<ISelectedCalendarRepository>(DI_TOKENS.SELECTED_CALENDAR_REPOSITORY);
}

export function getBookingRepository(): IBookingRepository {
  return repositoryContainer.get<IBookingRepository>(DI_TOKENS.BOOKING_REPOSITORY);
}

export function getUserRepository(): IUserRepository {
  return repositoryContainer.get<IUserRepository>(DI_TOKENS.USER_REPOSITORY);
}

export function getTeamRepository(): ITeamRepository {
  return repositoryContainer.get<ITeamRepository>(DI_TOKENS.TEAM_REPOSITORY);
}

export function getMembershipRepository(): IMembershipRepository {
  return repositoryContainer.get<IMembershipRepository>(DI_TOKENS.MEMBERSHIP_REPOSITORY);
}

export function getEventTypeRepository(): IEventTypeRepository {
  return repositoryContainer.get<IEventTypeRepository>(DI_TOKENS.EVENT_TYPE_REPOSITORY);
}

export function getProfileRepository(): IProfileRepository {
  return repositoryContainer.get<IProfileRepository>(DI_TOKENS.PROFILE_REPOSITORY);
}

export function getCredentialRepository(): ICredentialRepository {
  return repositoryContainer.get<ICredentialRepository>(DI_TOKENS.CREDENTIAL_REPOSITORY);
}

export function getHostRepository(): IHostRepository {
  return repositoryContainer.get<IHostRepository>(DI_TOKENS.HOST_REPOSITORY);
}

export function getOAuthClientRepository(): IOAuthClientRepository {
  return repositoryContainer.get<IOAuthClientRepository>(DI_TOKENS.OAUTH_CLIENT_REPOSITORY);
}

export function getBookingReferenceRepository(): IBookingReferenceRepository {
  return repositoryContainer.get<IBookingReferenceRepository>(DI_TOKENS.BOOKING_REFERENCE_REPOSITORY);
}

export function getDestinationCalendarRepository(): IDestinationCalendarRepository {
  return repositoryContainer.get<IDestinationCalendarRepository>(DI_TOKENS.DESTINATION_CALENDAR_REPOSITORY);
}

export function getOOORepository(): IOOORepository {
  return repositoryContainer.get<IOOORepository>(DI_TOKENS.OOO_REPOSITORY);
}

export function getTravelScheduleRepository(): ITravelScheduleRepository {
  return repositoryContainer.get<ITravelScheduleRepository>(DI_TOKENS.TRAVEL_SCHEDULE_REPOSITORY);
}

export function getVerificationTokenRepository(): IVerificationTokenRepository {
  return repositoryContainer.get<IVerificationTokenRepository>(DI_TOKENS.VERIFICATION_TOKEN_REPOSITORY);
}

export function getWorkflowRelationsRepository(): IWorkflowRelationsRepository {
  return repositoryContainer.get<IWorkflowRelationsRepository>(DI_TOKENS.WORKFLOW_RELATIONS_REPOSITORY);
}

export function getWorkflowStepRepository(): IWorkflowStepRepository {
  return repositoryContainer.get<IWorkflowStepRepository>(DI_TOKENS.WORKFLOW_STEP_REPOSITORY);
}

export function getRoutingFormResponseRepository(): IRoutingFormResponseRepository {
  return repositoryContainer.get<IRoutingFormResponseRepository>(DI_TOKENS.ROUTING_FORM_RESPONSE_REPOSITORY);
}

export function getAttributeRepository(): IAttributeRepository {
  return repositoryContainer.get<IAttributeRepository>(DI_TOKENS.ATTRIBUTE_REPOSITORY);
}

export function getApiKeyRepository(): IApiKeyRepository {
  return repositoryContainer.get<IApiKeyRepository>(DI_TOKENS.API_KEY_REPOSITORY);
}

export function getHashedLinkRepository(): IHashedLinkRepository {
  return repositoryContainer.get<IHashedLinkRepository>(DI_TOKENS.HASHED_LINK_REPOSITORY);
}

export function getCalVideoSettingsRepository(): ICalVideoSettingsRepository {
  return repositoryContainer.get<ICalVideoSettingsRepository>(DI_TOKENS.CAL_VIDEO_SETTINGS_REPOSITORY);
}

export function getAssignmentReasonRepository(): IAssignmentReasonRepository {
  return repositoryContainer.get<IAssignmentReasonRepository>(DI_TOKENS.ASSIGNMENT_REASON_REPOSITORY);
}

export function getOrgMembershipRepository(): IOrgMembershipRepository {
  return repositoryContainer.get<IOrgMembershipRepository>(DI_TOKENS.ORG_MEMBERSHIP_REPOSITORY);
}

export function getAppRepository(): IAppRepository {
  return repositoryContainer.get<IAppRepository>(DI_TOKENS.APP_REPOSITORY);
}

export function getRoutingFormRepository(): IRoutingFormRepository {
  return repositoryContainer.get<IRoutingFormRepository>(DI_TOKENS.ROUTING_FORM_REPOSITORY);
}
