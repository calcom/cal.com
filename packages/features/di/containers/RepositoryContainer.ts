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
import type { IAttributeOptionRepository } from "@calcom/lib/server/repository/IAttributeOptionRepository";
import type { IAttributeToUserRepository } from "@calcom/lib/server/repository/IAttributeToUserRepository";
import type { IBookingPaymentRepository } from "@calcom/lib/server/repository/BookingPaymentRepository.interface";
import type { QueuedFormResponseRepositoryInterface } from "@calcom/app-store/routing-forms/lib/queuedFormResponse/QueuedFormResponseRepository.interface";
import type { IAuditRepository } from "../../watchlist/lib/interface/IAuditRepository";
import type { IBookingAuditRepository } from "../../booking-audit/lib/repository/IBookingAuditRepository";
import type { IAuditActorRepository } from "../../booking-audit/lib/repository/IAuditActorRepository";
import type { IBillingRepository } from "../../ee/billing/repository/billing/IBillingRepository";
import type { ITeamBillingDataRepository } from "../../ee/billing/repository/teamBillingData/ITeamBillingDataRepository";
import type { IPhoneNumberRepository } from "@calcom/lib/server/repository/IPhoneNumberRepository";
import type { IAgentRepository } from "@calcom/lib/server/repository/IAgentRepository";

import type { IBookingRepository } from "../../bookings/repositories/IBookingRepository";
import type { IBookingSeatRepository } from "../../bookings/repositories/IBookingSeatRepository";
import type { IVideoCallGuestRepository } from "../../video-call-guest/repositories/IVideoCallGuestRepository";
import type { IAccessCodeRepository } from "../../oauth/repositories/IAccessCodeRepository";
import type { IOrganizationSettingsRepository } from "../../organizations/repositories/IOrganizationSettingsRepository";
import type { ICalendarCacheEventRepository } from "../../calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";
import type { IGlobalWatchlistRepository, IOrganizationWatchlistRepository } from "../../watchlist/lib/interface/IWatchlistRepositories";
import type { IWorkflowReminderRepository } from "../../ee/workflows/repositories/IWorkflowReminderRepository";
import type { IDelegationCredentialRepository } from "../../delegation-credentials/repositories/IDelegationCredentialRepository";
import type { IWebhookRepository } from "../../webhooks/lib/interface/repository";
import type { KyselyRoleRepository } from "../../pbac/infrastructure/repositories/KyselyRoleRepository";
import type { IPermissionRepository } from "../../pbac/domain/repositories/IPermissionRepository";
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
import { attributeOptionRepositoryModuleLoader } from "../modules/AttributeOption";
import { attributeToUserRepositoryModuleLoader } from "../modules/AttributeToUser";
import { bookingPaymentRepositoryModuleLoader } from "../modules/BookingPayment";
import { queuedFormResponseRepositoryModuleLoader } from "../modules/QueuedFormResponse";
import { watchlistAuditRepositoryModuleLoader } from "../modules/WatchlistAudit";
import { bookingAuditRepositoryModuleLoader } from "../modules/BookingAudit";
import { auditActorRepositoryModuleLoader } from "../modules/AuditActor";
import { teamBillingRepositoryModuleLoader } from "../modules/TeamBilling";
import { organizationBillingRepositoryModuleLoader } from "../modules/OrganizationBilling";
import { teamBillingDataRepositoryModuleLoader } from "../modules/TeamBillingData";
import { phoneNumberRepositoryModuleLoader } from "../modules/PhoneNumber";
import { agentRepositoryModuleLoader } from "../modules/Agent";
import { bookingSeatRepositoryModuleLoader } from "../modules/BookingSeat";
import { videoCallGuestRepositoryModuleLoader } from "../modules/VideoCallGuest";
import { accessCodeRepositoryModuleLoader } from "../modules/AccessCode";
import { organizationSettingsRepositoryModuleLoader } from "../modules/OrganizationSettings";
import { calendarCacheEventRepositoryModuleLoader } from "../modules/CalendarCacheEvent";
import { globalWatchlistRepositoryModuleLoader } from "../modules/GlobalWatchlist";
import { organizationWatchlistRepositoryModuleLoader } from "../modules/OrganizationWatchlist";
import { workflowReminderRepositoryModuleLoader } from "../modules/WorkflowReminder";
import { delegationCredentialRepositoryModuleLoader } from "../modules/DelegationCredential";
import { webhookRepositoryModuleLoader } from "../modules/Webhook";
import { roleRepositoryModuleLoader } from "../modules/Role";
import { permissionRepositoryModuleLoader } from "../modules/Permission";

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
repositoryContainer.load(attributeOptionRepositoryModuleLoader());
repositoryContainer.load(attributeToUserRepositoryModuleLoader());
repositoryContainer.load(bookingPaymentRepositoryModuleLoader());
repositoryContainer.load(queuedFormResponseRepositoryModuleLoader());
repositoryContainer.load(watchlistAuditRepositoryModuleLoader());
repositoryContainer.load(bookingAuditRepositoryModuleLoader());
repositoryContainer.load(auditActorRepositoryModuleLoader());
repositoryContainer.load(teamBillingRepositoryModuleLoader());
repositoryContainer.load(organizationBillingRepositoryModuleLoader());
repositoryContainer.load(teamBillingDataRepositoryModuleLoader());
repositoryContainer.load(phoneNumberRepositoryModuleLoader());
repositoryContainer.load(agentRepositoryModuleLoader());
repositoryContainer.load(bookingSeatRepositoryModuleLoader());
repositoryContainer.load(videoCallGuestRepositoryModuleLoader());
repositoryContainer.load(accessCodeRepositoryModuleLoader());
repositoryContainer.load(organizationSettingsRepositoryModuleLoader());
repositoryContainer.load(calendarCacheEventRepositoryModuleLoader());
repositoryContainer.load(globalWatchlistRepositoryModuleLoader());
repositoryContainer.load(organizationWatchlistRepositoryModuleLoader());
repositoryContainer.load(workflowReminderRepositoryModuleLoader());
repositoryContainer.load(delegationCredentialRepositoryModuleLoader());
repositoryContainer.load(webhookRepositoryModuleLoader());
repositoryContainer.load(roleRepositoryModuleLoader());
repositoryContainer.load(permissionRepositoryModuleLoader());

export function getScheduleRepository():IScheduleRepository {
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

export function getAttributeOptionRepository(): IAttributeOptionRepository {
  return repositoryContainer.get<IAttributeOptionRepository>(DI_TOKENS.ATTRIBUTE_OPTION_REPOSITORY);
}

export function getAttributeToUserRepository(): IAttributeToUserRepository {
  return repositoryContainer.get<IAttributeToUserRepository>(DI_TOKENS.ATTRIBUTE_TO_USER_REPOSITORY);
}

export function getBookingPaymentRepository(): IBookingPaymentRepository {
  return repositoryContainer.get<IBookingPaymentRepository>(DI_TOKENS.BOOKING_PAYMENT_REPOSITORY);
}

export function getQueuedFormResponseRepository(): QueuedFormResponseRepositoryInterface {
  return repositoryContainer.get<QueuedFormResponseRepositoryInterface>(
    DI_TOKENS.QUEUED_FORM_RESPONSE_REPOSITORY
  );
}

export function getWatchlistAuditRepository(): IAuditRepository {
  return repositoryContainer.get<IAuditRepository>(DI_TOKENS.WATCHLIST_AUDIT_REPOSITORY);
}

export function getBookingAuditRepository(): IBookingAuditRepository {
  return repositoryContainer.get<IBookingAuditRepository>(DI_TOKENS.BOOKING_AUDIT_REPOSITORY);
}

export function getAuditActorRepository(): IAuditActorRepository {
  return repositoryContainer.get<IAuditActorRepository>(DI_TOKENS.AUDIT_ACTOR_REPOSITORY);
}

export function getTeamBillingRepository(): IBillingRepository {
  return repositoryContainer.get<IBillingRepository>(DI_TOKENS.TEAM_BILLING_REPOSITORY);
}

export function getOrganizationBillingRepository(): IBillingRepository {
  return repositoryContainer.get<IBillingRepository>(DI_TOKENS.ORGANIZATION_BILLING_REPOSITORY);
}

export function getTeamBillingDataRepository(): ITeamBillingDataRepository {
  return repositoryContainer.get<ITeamBillingDataRepository>(DI_TOKENS.TEAM_BILLING_DATA_REPOSITORY);
}

export function getPhoneNumberRepository(): IPhoneNumberRepository {
  return repositoryContainer.get<IPhoneNumberRepository>(DI_TOKENS.PHONE_NUMBER_REPOSITORY);
}

export function getAgentRepository(): IAgentRepository {
  return repositoryContainer.get<IAgentRepository>(DI_TOKENS.AGENT_REPOSITORY);
}

export function getBookingSeatRepository(): IBookingSeatRepository {
  return repositoryContainer.get<IBookingSeatRepository>(DI_TOKENS.BOOKING_SEAT_REPOSITORY);
}

export function getVideoCallGuestRepository(): IVideoCallGuestRepository {
  return repositoryContainer.get<IVideoCallGuestRepository>(DI_TOKENS.VIDEO_CALL_GUEST_REPOSITORY);
}

export function getAccessCodeRepository(): IAccessCodeRepository {
  return repositoryContainer.get<IAccessCodeRepository>(DI_TOKENS.ACCESS_CODE_REPOSITORY);
}

export function getOrganizationSettingsRepository(): IOrganizationSettingsRepository {
  return repositoryContainer.get<IOrganizationSettingsRepository>(DI_TOKENS.ORGANIZATION_SETTINGS_REPOSITORY);
}

export function getCalendarCacheEventRepository(): ICalendarCacheEventRepository {
  return repositoryContainer.get<ICalendarCacheEventRepository>(DI_TOKENS.CALENDAR_CACHE_EVENT_REPOSITORY);
}

export function getGlobalWatchlistRepository(): IGlobalWatchlistRepository {
  return repositoryContainer.get<IGlobalWatchlistRepository>(DI_TOKENS.GLOBAL_WATCHLIST_REPOSITORY);
}

export function getOrganizationWatchlistRepository(): IOrganizationWatchlistRepository {
  return repositoryContainer.get<IOrganizationWatchlistRepository>(DI_TOKENS.ORGANIZATION_WATCHLIST_REPOSITORY);
}

export function getWorkflowReminderRepository(): IWorkflowReminderRepository {
  return repositoryContainer.get<IWorkflowReminderRepository>(DI_TOKENS.WORKFLOW_REMINDER_REPOSITORY);
}

export function getDelegationCredentialRepository(): IDelegationCredentialRepository {
  return repositoryContainer.get<IDelegationCredentialRepository>(DI_TOKENS.DELEGATION_CREDENTIAL_REPOSITORY);
}

export function getWebhookRepository(): IWebhookRepository {
  return repositoryContainer.get<IWebhookRepository>(DI_TOKENS.WEBHOOK_REPOSITORY);
}

export function getRoleRepository(): KyselyRoleRepository {
  return repositoryContainer.get<KyselyRoleRepository>(DI_TOKENS.ROLE_REPOSITORY);
}

export function getPermissionRepository(): IPermissionRepository {
  return repositoryContainer.get<IPermissionRepository>(DI_TOKENS.PERMISSION_REPOSITORY);
}
