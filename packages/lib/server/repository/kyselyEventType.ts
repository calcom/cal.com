import type { Kysely } from "kysely";
import { jsonObjectFrom, jsonArrayFrom } from "kysely/helpers/postgres";

import type { DB } from "@calcom/kysely";
import type { User } from "@calcom/kysely/types";
import logger from "@calcom/lib/logger";
import {
  EventTypeCustomInputType,
  EventTypeAutoTranslatedField,
  MembershipRole,
  WorkflowActions,
  WorkflowTemplates,
  WorkflowTriggerEvents,
  TimeUnit,
  PeriodType,
  SchedulingType,
} from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["KyselyEventTypeRepository"] });

export class KyselyEventTypeRepository {
  private readonly db: Kysely<DB>;

  constructor(db: Kysely<DB>) {
    this.db = db;
  }

  private getCoreUserSelect(): (keyof User)[] {
    const keys: (keyof User)[] = [
      "id",
      "name",
      "username",
      "avatarUrl",
      "email",
      "locale",
      "defaultScheduleId",
      "isPlatformManaged",
    ] as const;
    return keys;
  }

  public async findFirst(eventTypeId: number, requestingUserId: number) {
    const mainQuery = await this.db
      .selectFrom("EventType")
      .leftJoin("Membership", "Membership.teamId", "EventType.teamId")
      .selectAll()
      .where("EventType.id", "=", eventTypeId)
      .where((eb) =>
        eb.or([
          eb("EventType.userId", "=", requestingUserId),
          eb.and([eb("EventType.teamId", "!=", null), eb("Membership.userId", "=", requestingUserId)]),
        ])
      );

    const subQuerySelect = this.db.selectFrom(mainQuery.as("EventType")).select((ebOuter) => [
      ebOuter.ref("EventType.id").as("id"),
      ebOuter.ref("EventType.title").as("title"),
      ebOuter.ref("EventType.slug").as("slug"),
      ebOuter.ref("EventType.description").as("description"),
      ebOuter.ref("EventType.length").as("length"),
      ebOuter.ref("EventType.isInstantEvent").as("isInstantEvent"),
      ebOuter
        .ref("EventType.instantMeetingExpiryTimeOffsetInSeconds")
        .as("instantMeetingExpiryTimeOffsetInSeconds"),
      ebOuter.ref("EventType.instantMeetingParameters").as("instantMeetingParameters"),
      ebOuter.ref("EventType.offsetStart").as("offsetStart"),
      ebOuter.ref("EventType.hidden").as("hidden"),
      ebOuter.cast(ebOuter.ref("EventType.locations"), "jsonb").as("locations"),
      ebOuter.ref("EventType.eventName").as("eventName"),
      ebOuter.ref("EventType.timeZone").as("timeZone"),
      ebOuter
        .cast<PeriodType>(
          ebOuter
            .case()
            .when(ebOuter.ref("EventType.periodType"), "=", "unlimited")
            .then(PeriodType.UNLIMITED)
            .when(ebOuter.ref("EventType.periodType"), "=", "rolling")
            .then(PeriodType.ROLLING)
            .when(ebOuter.ref("EventType.periodType"), "=", "rolling_window")
            .then(PeriodType.ROLLING_WINDOW)
            .when(ebOuter.ref("EventType.periodType"), "=", "range")
            .then(PeriodType.RANGE)
            .else(null)
            .end(),
          "varchar"
        )
        .as("periodType"),
      ebOuter.cast(ebOuter.ref("EventType.metadata"), "jsonb").as("metadata"),
      ebOuter.ref("EventType.periodDays").as("periodDays"),
      ebOuter.ref("EventType.periodStartDate").as("periodStartDate"),
      ebOuter.ref("EventType.periodEndDate").as("periodEndDate"),
      ebOuter.ref("EventType.periodCountCalendarDays").as("periodCountCalendarDays"),
      ebOuter.ref("EventType.lockTimeZoneToggleOnBookingPage").as("lockTimeZoneToggleOnBookingPage"),
      ebOuter.ref("EventType.requiresConfirmation").as("requiresConfirmation"),
      ebOuter.ref("EventType.requiresConfirmationForFreeEmail").as("requiresConfirmationForFreeEmail"),
      ebOuter.ref("EventType.canSendCalVideoTranscriptionEmails").as("canSendCalVideoTranscriptionEmails"),
      ebOuter.ref("EventType.requiresConfirmationWillBlockSlot").as("requiresConfirmationWillBlockSlot"),
      ebOuter.ref("EventType.requiresBookerEmailVerification").as("requiresBookerEmailVerification"),
      ebOuter.ref("EventType.autoTranslateDescriptionEnabled").as("autoTranslateDescriptionEnabled"),
      ebOuter.cast(ebOuter.ref("EventType.recurringEvent"), "jsonb").as("recurringEvent"),
      ebOuter.ref("EventType.hideCalendarNotes").as("hideCalendarNotes"),
      ebOuter.ref("EventType.hideCalendarEventDetails").as("hideCalendarEventDetails"),
      ebOuter.ref("EventType.disableGuests").as("disableGuests"),
      ebOuter.ref("EventType.disableCancelling").as("disableCancelling"),
      ebOuter.ref("EventType.disableRescheduling").as("disableRescheduling"),
      ebOuter.ref("EventType.minimumBookingNotice").as("minimumBookingNotice"),
      ebOuter.ref("EventType.beforeEventBuffer").as("beforeEventBuffer"),
      ebOuter.ref("EventType.afterEventBuffer").as("afterEventBuffer"),
      ebOuter.ref("EventType.slotInterval").as("slotInterval"),
      ebOuter.cast(ebOuter.ref("EventType.eventTypeColor"), "jsonb").as("eventTypeColor"),
      ebOuter.cast(ebOuter.ref("EventType.bookingLimits"), "jsonb").as("bookingLimits"),
      ebOuter.ref("EventType.onlyShowFirstAvailableSlot").as("onlyShowFirstAvailableSlot"),
      ebOuter.cast(ebOuter.ref("EventType.durationLimits"), "jsonb").as("durationLimits"),
      ebOuter.ref("EventType.assignAllTeamMembers").as("assignAllTeamMembers"),
      ebOuter.ref("EventType.allowReschedulingPastBookings").as("allowReschedulingPastBookings"),
      ebOuter.ref("EventType.hideOrganizerEmail").as("hideOrganizerEmail"),
      ebOuter.ref("EventType.assignRRMembersUsingSegment").as("assignRRMembersUsingSegment"),
      ebOuter.cast(ebOuter.ref("EventType.rrSegmentQueryValue"), "jsonb").as("rrSegmentQueryValue"),
      ebOuter.ref("EventType.isRRWeightsEnabled").as("isRRWeightsEnabled"),
      ebOuter.ref("EventType.rescheduleWithSameRoundRobinHost").as("rescheduleWithSameRoundRobinHost"),
      ebOuter.ref("EventType.successRedirectUrl").as("successRedirectUrl"),
      ebOuter.ref("EventType.forwardParamsSuccessRedirect").as("forwardParamsSuccessRedirect"),
      ebOuter.ref("EventType.currency").as("currency"),
      ebOuter.cast(ebOuter.ref("EventType.bookingFields"), "jsonb").as("bookingFields"),
      ebOuter
        .ref("EventType.useEventTypeDestinationCalendarEmail")
        .as("useEventTypeDestinationCalendarEmail"),
      ebOuter.ref("EventType.customReplyToEmail").as("customReplyToEmail"),
      ebOuter.ref("EventType.teamId").as("teamId"),
      ebOuter
        .cast<SchedulingType>(
          ebOuter
            .case()
            .when(ebOuter.ref("EventType.schedulingType"), "=", "roundRobin")
            .then(SchedulingType.ROUND_ROBIN)
            .when(ebOuter.ref("EventType.schedulingType"), "=", "collective")
            .then(SchedulingType.COLLECTIVE)
            .when(ebOuter.ref("EventType.schedulingType"), "=", "managed")
            .then(SchedulingType.MANAGED)
            .else(null)
            .end(),
          "varchar"
        )
        .as("schedulingType"),
      ebOuter.ref("EventType.userId").as("event_type_user_id_fk"),
      ebOuter.ref("EventType.price").as("price"),
      ebOuter.ref("EventType.seatsPerTimeSlot").as("seatsPerTimeSlot"),
      ebOuter.ref("EventType.seatsShowAttendees").as("seatsShowAttendees"),
      ebOuter.ref("EventType.seatsShowAvailabilityCount").as("seatsShowAvailabilityCount"),
      ebOuter.ref("EventType.secondaryEmailId").as("secondaryEmailId"),
      ebOuter.ref("EventType.maxLeadThreshold").as("maxLeadThreshold"),
      ebOuter.ref("EventType.useEventLevelSelectedCalendars").as("useEventLevelSelectedCalendars"),

      // aiPhoneCallConfig
      jsonObjectFrom(
        this.db
          .selectFrom("AIPhoneCallConfiguration")
          .selectAll()
          .whereRef("AIPhoneCallConfiguration.eventTypeId", "=", ebOuter.ref("EventType.id"))
      ).as("aiPhoneCallConfig"),

      // customInputs
      jsonArrayFrom(
        this.db
          .selectFrom("EventTypeCustomInput")
          .select((eb) => [
            "id",
            "eventTypeId",
            "label",
            "options",
            "required",
            "placeholder",
            eb
              .cast<EventTypeCustomInputType>(
                eb
                  .case()
                  .when(eb.ref("EventTypeCustomInput.type"), "=", "text")
                  .then(EventTypeCustomInputType.TEXT)
                  .when(eb.ref("EventTypeCustomInput.type"), "=", "textLong")
                  .then(EventTypeCustomInputType.TEXTLONG)
                  .when(eb.ref("EventTypeCustomInput.type"), "=", "number")
                  .then(EventTypeCustomInputType.NUMBER)
                  .when(eb.ref("EventTypeCustomInput.type"), "=", "bool")
                  .then(EventTypeCustomInputType.BOOL)
                  .when(eb.ref("EventTypeCustomInput.type"), "=", "radio")
                  .then(EventTypeCustomInputType.RADIO)
                  .when(eb.ref("EventTypeCustomInput.type"), "=", "phone")
                  .then(EventTypeCustomInputType.PHONE)
                  .else(EventTypeCustomInputType.TEXT)
                  .end(),
                "varchar"
              )
              .as("type"),
          ])
          .whereRef("EventTypeCustomInput.eventTypeId", "=", ebOuter.ref("EventType.id"))
      ).as("customInputs"),

      // fieldTranslations
      jsonArrayFrom(
        this.db
          .selectFrom("EventTypeTranslation")
          .select((eb) => [
            "translatedText",
            "targetLocale",
            eb
              .cast<EventTypeAutoTranslatedField>(
                eb
                  .case()
                  .when(eb.ref("EventTypeTranslation.field"), "=", "DESCRIPTION")
                  .then(EventTypeAutoTranslatedField.DESCRIPTION)
                  .when(eb.ref("EventTypeTranslation.field"), "=", "TITLE")
                  .then(EventTypeAutoTranslatedField.TITLE)
                  .else(null)
                  .end(),
                "varchar"
              )
              .as("field"),
          ])
          .whereRef("EventTypeTranslation.eventTypeId", "=", ebOuter.ref("EventType.id"))
      ).as("fieldTranslations"),

      // hashedLink
      jsonArrayFrom(
        this.db
          .selectFrom("HashedLink")
          .selectAll()
          .whereRef("HashedLink.eventTypeId", "=", ebOuter.ref("EventType.id"))
      ).as("hashedLink"),

      // owner
      jsonObjectFrom(
        this.db
          .selectFrom("users as owner_user_rel")
          .select(["owner_user_rel.id"])
          .whereRef("owner_user_rel.id", "=", ebOuter.ref("EventType.userId"))
      ).as("owner"),

      // parent
      jsonObjectFrom(
        this.db
          .selectFrom("EventType as parent_event_type_rel")
          .select(["parent_event_type_rel.id", "parent_event_type_rel.teamId"])
          .whereRef("parent_event_type_rel.id", "=", ebOuter.ref("EventType.parentId"))
      ).as("parent"),

      // team
      jsonObjectFrom(
        this.db
          .selectFrom("Team")
          .select((ebTeam) => [
            // ebTeam is for 'Team'
            ebTeam.ref("Team.id").as("id"),
            ebTeam.ref("Team.name").as("name"),
            ebTeam.ref("Team.slug").as("slug"),
            ebTeam.ref("Team.parentId").as("parentId"),
            jsonObjectFrom(
              // team.parent
              this.db
                .selectFrom("Team as parent_team_rel")
                .select((ebParentTeam) => [
                  // ebParentTeam for 'Team as parent_team_rel'
                  ebParentTeam.ref("parent_team_rel.slug").as("slug"),
                  jsonObjectFrom(
                    // team.parent.organizationSettings
                    this.db
                      .selectFrom("OrganizationSettings")
                      .select(["lockEventTypeCreationForUsers"])
                      .whereRef(
                        "OrganizationSettings.organizationId",
                        "=",
                        ebParentTeam.ref("parent_team_rel.id")
                      )
                  ).as("organizationSettings"),
                ])
                .whereRef("parent_team_rel.id", "=", ebTeam.ref("Team.parentId"))
            ).as("parent"),
            jsonArrayFrom(
              // team.members
              this.db
                .selectFrom("Membership")
                .select((ebMembership) => [
                  // ebMembership for 'Membership'
                  ebMembership
                    .cast<MembershipRole>(
                      ebMembership
                        .case()
                        .when(ebMembership.ref("Membership.role"), "=", "MEMBER")
                        .then(MembershipRole.MEMBER)
                        .when(ebMembership.ref("Membership.role"), "=", "ADMIN")
                        .then(MembershipRole.ADMIN)
                        .when(ebMembership.ref("Membership.role"), "=", "OWNER")
                        .then(MembershipRole.OWNER)
                        .else(MembershipRole.MEMBER)
                        .end(),
                      "varchar"
                    )
                    .as("role"),
                  ebMembership.ref("Membership.accepted").as("accepted"),
                  jsonObjectFrom(
                    // team.members.user
                    this.db
                      .selectFrom("users as team_member_user_rel")
                      .select((ebUser) => [
                        // ebUser for 'users as team_member_user_rel'
                        ...this.getCoreUserSelect(),
                        jsonArrayFrom(
                          // team.members.user.eventTypes
                          this.db
                            .selectFrom("_user_eventtype as uet_for_member")
                            .innerJoin("EventType as et_for_member", "et_for_member.id", "uet_for_member.A")
                            .select(["et_for_member.slug"])
                            .whereRef("uet_for_member.B", "=", ebUser.ref("id")) // ebUser.ref('id') is team_member_user_rel.id
                        ).as("eventTypes"),
                      ])
                      .whereRef("id", "=", ebMembership.ref("Membership.userId")) // users.id = Membership.userId
                  ).as("user"),
                ])
                .whereRef("Membership.teamId", "=", ebTeam.ref("Team.id"))
            ).as("members"),
          ])
          .whereRef("Team.id", "=", ebOuter.ref("EventType.teamId"))
      ).as("team"),

      // users (direct relation from EventType)
      jsonArrayFrom(
        this.db
          .selectFrom("_user_eventtype")
          .innerJoin("users as eventtype_user_rel", "eventtype_user_rel.id", "_user_eventtype.B")
          .whereRef("_user_eventtype.A", "=", ebOuter.ref("EventType.id"))
          .select(this.getCoreUserSelect()) // ebUserRel is for 'users as eventtype_user_rel'
      ).as("users"),

      // schedule
      jsonObjectFrom(
        this.db
          .selectFrom("Schedule as sched_rel_main")
          .select(["sched_rel_main.id", "sched_rel_main.name"])
          .whereRef("sched_rel_main.id", "=", ebOuter.ref("EventType.scheduleId"))
      ).as("schedule"),

      // instantMeetingSchedule
      jsonObjectFrom(
        this.db
          .selectFrom("Schedule as ims_sched_rel")
          .select(["ims_sched_rel.id", "ims_sched_rel.name"])
          .whereRef("ims_sched_rel.id", "=", ebOuter.ref("EventType.instantMeetingScheduleId"))
      ).as("instantMeetingSchedule"),

      // hosts
      jsonArrayFrom(
        this.db
          .selectFrom("Host")
          .select(["isFixed", "userId", "priority", "weight", "scheduleId"])
          .whereRef("Host.eventTypeId", "=", ebOuter.ref("EventType.id"))
      ).as("hosts"),

      // children
      jsonArrayFrom(
        this.db
          .selectFrom("EventType as child_event_type_rel")
          .select((ebChild) => [
            // ebChild for 'EventType as child_event_type_rel'
            ebChild.ref("child_event_type_rel.hidden").as("hidden"),
            ebChild.ref("child_event_type_rel.slug").as("slug"),
            jsonObjectFrom(
              // children.owner
              this.db
                .selectFrom("users as child_owner_user_rel")
                .select([
                  "child_owner_user_rel.avatarUrl",
                  "child_owner_user_rel.name",
                  "child_owner_user_rel.username",
                  "child_owner_user_rel.email",
                  "child_owner_user_rel.id",
                ])
                .whereRef("child_owner_user_rel.id", "=", ebChild.ref("child_event_type_rel.userId"))
            ).as("owner"),
          ])
          .whereRef("child_event_type_rel.parentId", "=", ebOuter.ref("EventType.id"))
      ).as("children"),

      // destinationCalendar
      jsonObjectFrom(
        this.db
          .selectFrom("DestinationCalendar")
          .selectAll()
          .whereRef("DestinationCalendar.eventTypeId", "=", ebOuter.ref("EventType.id"))
      ).as("destinationCalendar"),

      // webhooks
      jsonArrayFrom(
        this.db
          .selectFrom("Webhook")
          .select([
            "id",
            "subscriberUrl",
            "payloadTemplate",
            "active",
            "eventTriggers",
            "secret",
            "eventTypeId",
          ])
          .whereRef("Webhook.eventTypeId", "=", ebOuter.ref("EventType.id"))
      ).as("webhooks"),

      // workflows
      jsonArrayFrom(
        this.db
          .selectFrom("WorkflowsOnEventTypes as woet_rel")
          .select((ebWoet) => [
            // ebWoet for 'WorkflowsOnEventTypes as woet_rel'
            jsonObjectFrom(
              // workflow object
              this.db
                .selectFrom("Workflow as w_rel")
                .select((ebWorkflow) => [
                  // ebWorkflow for 'Workflow as w_rel'
                  ebWorkflow.ref("w_rel.name").as("name"),
                  ebWorkflow.ref("w_rel.id").as("id"),
                  ebWorkflow
                    .cast<WorkflowTriggerEvents>(
                      ebWorkflow
                        .case()
                        .when(ebWorkflow.ref("w_rel.trigger"), "=", "BEFORE_EVENT")
                        .then(WorkflowTriggerEvents.BEFORE_EVENT)
                        .when(ebWorkflow.ref("w_rel.trigger"), "=", "EVENT_CANCELLED")
                        .then(WorkflowTriggerEvents.EVENT_CANCELLED)
                        // ... other WorkflowTriggerEvents cases
                        .else(null)
                        .end(),
                      "varchar"
                    )
                    .as("trigger"),
                  ebWorkflow.ref("w_rel.time").as("time"),
                  ebWorkflow
                    .cast<TimeUnit>(
                      ebWorkflow
                        .case()
                        .when(ebWorkflow.ref("w_rel.timeUnit"), "=", "day")
                        .then(TimeUnit.DAY)
                        .when(ebWorkflow.ref("w_rel.timeUnit"), "=", "hour")
                        .then(TimeUnit.HOUR)
                        .when(ebWorkflow.ref("w_rel.timeUnit"), "=", "minute")
                        .then(TimeUnit.MINUTE)
                        .else(null)
                        .end(),
                      "varchar"
                    )
                    .as("timeUnit"),
                  ebWorkflow.ref("w_rel.userId").as("userId"),
                  ebWorkflow.ref("w_rel.teamId").as("teamId"),
                  jsonObjectFrom(
                    // workflow.team
                    this.db
                      .selectFrom("Team as wf_team_rel")
                      .select((ebWfTeam) => [
                        // ebWfTeam for 'Team as wf_team_rel'
                        ebWfTeam.ref("wf_team_rel.id").as("id"),
                        ebWfTeam.ref("wf_team_rel.slug").as("slug"),
                        ebWfTeam.ref("wf_team_rel.name").as("name"),
                        jsonArrayFrom(
                          // workflow.team.members
                          this.db
                            .selectFrom("Membership as wf_team_member_rel")
                            .select((ebWfTeamMember) => [
                              // ebWfTeamMember for 'Membership as wf_team_member_rel'
                              "id",
                              "userId",
                              "teamId",
                              "accepted",
                              "disableImpersonation",
                              "createdAt",
                              "updatedAt",
                              ebWfTeamMember
                                .cast<MembershipRole>(
                                  ebWfTeamMember
                                    .case()
                                    .when(ebWfTeamMember.ref("wf_team_member_rel.role"), "=", "MEMBER")
                                    .then(MembershipRole.MEMBER)
                                    .when(ebWfTeamMember.ref("wf_team_member_rel.role"), "=", "ADMIN")
                                    .then(MembershipRole.ADMIN)
                                    .when(ebWfTeamMember.ref("wf_team_member_rel.role"), "=", "OWNER")
                                    .then(MembershipRole.OWNER)
                                    .else(MembershipRole.MEMBER)
                                    .end(),
                                  "varchar"
                                )
                                .as("role"),
                            ])
                            .whereRef("wf_team_member_rel.teamId", "=", ebWfTeam.ref("wf_team_rel.id"))
                        ).as("members"),
                      ])
                      .whereRef("wf_team_rel.id", "=", ebWorkflow.ref("w_rel.teamId"))
                  ).as("team"),
                  jsonArrayFrom(
                    // workflow.activeOn
                    this.db
                      .selectFrom("WorkflowsOnEventTypes as wf_ao_woet_rel")
                      .select((ebWfAo) => [
                        // ebWfAo for 'WorkflowsOnEventTypes as wf_ao_woet_rel'
                        jsonObjectFrom(
                          // workflow.activeOn.eventType
                          this.db
                            .selectFrom("EventType as wf_ao_et_inner_rel")
                            .select((ebWfAoEt) => [
                              // ebWfAoEt for 'EventType as wf_ao_et_inner_rel'
                              ebWfAoEt.ref("wf_ao_et_inner_rel.id").as("id"),
                              ebWfAoEt.ref("wf_ao_et_inner_rel.title").as("title"),
                              ebWfAoEt.ref("wf_ao_et_inner_rel.parentId").as("parentId"),
                              this.db
                                .selectFrom("EventType")
                                .select(({ fn }) => fn.countAll().as("_count"))
                                .whereRef("parentId", "=", ebWfAoEt.ref("wf_ao_et_inner_rel.id"))
                                .as("_count"),
                            ])
                            .whereRef("wf_ao_et_inner_rel.id", "=", ebWfAo.ref("wf_ao_woet_rel.eventTypeId"))
                        ).as("eventType"),
                      ])
                      .whereRef("wf_ao_woet_rel.workflowId", "=", ebWorkflow.ref("w_rel.id"))
                  ).as("activeOn"),
                  jsonArrayFrom(
                    // workflow.steps
                    this.db
                      .selectFrom("WorkflowStep")
                      .select((ebWfStep) => [
                        // ebWfStep for 'WorkflowStep'
                        "id",
                        "stepNumber",
                        "workflowId",
                        "sendTo",
                        "reminderBody",
                        "emailSubject",
                        "numberRequired",
                        "sender",
                        "numberVerificationPending",
                        "includeCalendarEvent",
                        "verifiedAt",
                        ebWfStep
                          .cast<WorkflowActions>(
                            ebWfStep
                              .case()
                              .when(ebWfStep.ref("WorkflowStep.action"), "=", "EMAIL_HOST")
                              .then(WorkflowActions.EMAIL_HOST)
                              // ... other WorkflowActions cases
                              .else(null)
                              .end(),
                            "varchar"
                          )
                          .as("action"),
                        ebWfStep
                          .cast<WorkflowTemplates>(
                            ebWfStep
                              .case()
                              .when(ebWfStep.ref("WorkflowStep.template"), "=", "REMINDER")
                              .then(WorkflowTemplates.REMINDER)
                              // ... other WorkflowTemplates cases
                              .else(null)
                              .end(),
                            "varchar"
                          )
                          .as("template"),
                      ])
                      .whereRef("WorkflowStep.workflowId", "=", ebWorkflow.ref("w_rel.id"))
                  ).as("steps"),
                ])
                .whereRef("w_rel.id", "=", ebWoet.ref("woet_rel.workflowId"))
            ).as("workflow"),
          ])
          .whereRef("woet_rel.eventTypeId", "=", ebOuter.ref("EventType.id"))
      ).as("workflows"),
    ]);

    const queryCompiled = await subQuerySelect.limit(1).compile();
    log.debug("SQL", queryCompiled.sql, "Params", queryCompiled.parameters);
    console.log("SQL", queryCompiled.sql, "Params", queryCompiled.parameters);
    const result = await this.db.executeQuery(queryCompiled);

    return result.rows[0];
  }
}
