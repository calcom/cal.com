/**
 * It takes care of doing the work after a booking is created.
 * 1. It could contact third party integrations to create calendar event/conference invite/etc.
 * 2. It could create a payment
 * 3. It could fire webhooks
 * 4. It could schedule workflows
 * 5. It could schedule reminders
 * 6. It could send notifications
 * 7. It could create calendar sync tasks
 * 8. It could create Booking References which need third party integrations to be used
 *
 * Benefits of having a separate module for onBookingCreationInDb
 * 1. handleNewBooking gets divided into two almost equal steps - a. Create a Booking which does whatever validation is needed and b. Inform/Update rest of the system and third parties about the booking.
 * 2. Second step can be utilized now by other actions that could create a booking e.g. API could create a booking directly or Calendar Sync can create a booking directly without any restrictions.
 * 3. With this exercise, we try to reduce the data being passed to the second step reducing the redundant data lying around. e.g. Once a booking is created we should be able to reuse the data from the booking, we don't need to maintain separate variables for all the data that was submitted in request
 */
import type { DestinationCalendar } from "@prisma/client";
// eslint-disable-next-line no-restricted-imports
import { cloneDeep } from "lodash";

import { metadata as GoogleMeetMetadata } from "@calcom/app-store/googlevideo/_metadata";
import { MeetLocationType } from "@calcom/app-store/locations";
import dayjs from "@calcom/dayjs";
import { scheduleMandatoryReminder } from "@calcom/ee/workflows/lib/reminders/scheduleMandatoryReminder";
import {
  sendAttendeeRequestEmailAndSMS,
  sendOrganizerRequestEmail,
  sendRescheduledEmailsAndSMS,
  sendRoundRobinCancelledEmailsAndSMS,
  sendRoundRobinRescheduledEmailsAndSMS,
  sendRoundRobinScheduledEmailsAndSMS,
  sendScheduledEmailsAndSMS,
} from "@calcom/emails";
import getICalUID from "@calcom/emails/lib/getICalUID";
import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { handleWebhookTrigger } from "@calcom/features/bookings/lib/handleWebhookTrigger";
import { createCalendarSyncTask } from "@calcom/features/calendar-sync/tasks/createCalendarSync/createTask";
import AssignmentReasonRecorder from "@calcom/features/ee/round-robin/assignmentReason/AssignmentReasonRecorder";
import { scheduleWorkflowReminders } from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import { getFullName } from "@calcom/features/form-builder/utils";
import type { GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";
import getWebhooks from "@calcom/features/webhooks/lib/getWebhooks";
import {
  deleteWebhookScheduledTriggers,
  scheduleTrigger,
} from "@calcom/features/webhooks/lib/scheduleTrigger";
import { getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import EventManager from "@calcom/lib/EventManager";
import { handleAnalyticsEvents } from "@calcom/lib/analyticsManager/handleAnalyticsEvents";
import { updateHostInEventName } from "@calcom/lib/event";
import { getPaymentAppData } from "@calcom/lib/getPaymentAppData";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
// Assuming logger is accessible or passed if specific sub-logger is needed
import { handlePayment } from "@calcom/lib/payment/handlePayment";
import { getPiiFreeCalendarEvent } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { WorkflowRepository } from "@calcom/lib/server/repository/workflow";
import prisma from "@calcom/prisma";
import type { AssignmentReasonEnum } from "@calcom/prisma/enums";
import { BookingStatus, SchedulingType, WebhookTriggerEvents } from "@calcom/prisma/enums";
import { eventTypeMetaDataSchemaWithTypedApps } from "@calcom/prisma/zod-utils";
import { eventTypeAppMetadataOptionalSchema } from "@calcom/prisma/zod-utils";
import { getAllWorkflowsFromEventType } from "@calcom/trpc/server/routers/viewer/workflows/util";
import type { Person, AdditionalInformation } from "@calcom/types/Calendar";
import type { EventResult, PartialReference } from "@calcom/types/EventManager";

import type { EventPayloadType, EventTypeInfo } from "../../webhooks/lib/sendPayload";
import { getAllCredentialsIncludeServiceAccountKey } from "./getAllCredentialsForUsersOnEvent/getAllCredentials";
import { refreshCredentials } from "./getAllCredentialsForUsersOnEvent/refreshCredentials";
import { addVideoCallDataToEvent } from "./handleNewBooking/addVideoCallDataToEvent";
import type { Booking as CreatedBooking } from "./handleNewBooking/createBooking";
import { getCustomInputsResponses } from "./handleNewBooking/getCustomInputsResponses";
// Assuming Booking is the CreatedBooking type
import type { getEventTypeResponse } from "./handleNewBooking/getEventTypesFromDB";
import { getRequiresConfirmationFlags } from "./handleNewBooking/getRequiresConfirmationFlags";
import { getVideoCallDetails } from "./handleNewBooking/getVideoCallDetails";
import { handleAppsStatus } from "./handleNewBooking/handleAppsStatus";
import { createLoggerWithEventDetails } from "./handleNewBooking/logger";
import type { BookingType } from "./handleNewBooking/originalRescheduledBookingUtils";
import { scheduleNoShowTriggers } from "./handleNewBooking/scheduleNoShowTriggers";
import type { IEventTypePaymentCredentialType, Invitee, PlatformParams } from "./handleNewBooking/types";
import {
  buildEvent,
  decideLocation,
  getDestinationCalendar,
  getICalSequence,
  getOrgIdAndTeamIdForEventType,
  type UserForBuildingEvent,
} from "./wip-utils";

const buildDryRunEventManager = () => {
  return {
    create: async () => ({ results: [], referencesToCreate: [] }),
    reschedule: async () => ({ results: [], referencesToCreate: [] }),
  };
};

type EventTypeData = getEventTypeResponse;

interface UserData {
  organizerUser: {
    id: number;
    name: string | null;
    username: string | null;
    email: string;
    organizationId: number | undefined | null;
    locale: string | null;
    destinationCalendar: DestinationCalendar | null;
  };
  attendeesList: Invitee;
  attendeeLanguage: string | null;
  users: UserForBuildingEvent[];
}

interface ConfigurationData {
  isDryRun: boolean;
  noEmail: boolean | undefined;
  triggerForUser: boolean;
  bookerUrl: string;
}

interface OrganizationData {
  teamId: number | null | undefined;
  orgId: number | null | undefined;
}

type BookingData = any;

interface OnBookingCreationInDbParams {
  newBooking: CreatedBooking; // mutable
  bookingBeingRescheduled: BookingType | null;
  userIdMakingBooking: number | null;
  eventType: EventTypeData;
  configurationData: ConfigurationData;
  platformParams: PlatformParams;
  legacyData: {
    organizationData: OrganizationData;
    userData: UserData;
  };
  bookingData: BookingData;
}

interface OnBookingCreationInDbResult {
  videoCallUrl?: string | null;
  paymentDetails?: {
    paymentUid?: string;
    paymentId?: number;
    message?: string;
    paymentRequired?: boolean;
  };
  referencesToCreate?: any[];
}

export async function onBookingCreationInDb(
  params: OnBookingCreationInDbParams
): Promise<OnBookingCreationInDbResult> {
  // Destructure grouped parameters
  let { newBooking: booking } = params;
  const { userIdMakingBooking, bookingData } = params;
  const { bookingBeingRescheduled: originalRescheduledBooking } = params;
  const iCalUID = getICalUID({
    event: { iCalUID: originalRescheduledBooking?.iCalUID, uid: originalRescheduledBooking?.uid },
    uid: booking.uid,
  });
  const iCalSequence = getICalSequence(originalRescheduledBooking);

  const {
    organizerUser,
    attendeesList,
    // attendeeLanguage, // Not used in function
    users,
  } = params.legacyData.userData;
  const rawEventType = params.eventType;
  const workflows = await getAllWorkflowsFromEventType(
    {
      ...rawEventType,
      metadata: eventTypeMetaDataSchemaWithTypedApps.parse(rawEventType.metadata),
    },
    organizerUser.id
  );
  const eventType = {
    ...rawEventType,
    workflows,
  };
  const isTeamEventType =
    !!eventType.schedulingType && ["COLLECTIVE", "ROUND_ROBIN"].includes(eventType.schedulingType);
  const { id: eventTypeId, slug: eventTypeSlug } = eventType;
  const destinationCalendar = getDestinationCalendar({ eventType, organizerUser });

  const tOrganizer = await getTranslation(organizerUser?.locale ?? "en", "common");

  const { organizationId: organizerOrganizationId, email: organizerEmail } = organizerUser;

  const { isDryRun, noEmail, triggerForUser, bookerUrl } = params.configurationData;
  const paymentAppData = getPaymentAppData({
    ...eventType,
    metadata: eventTypeMetaDataSchemaWithTypedApps.parse(eventType.metadata),
  });
  const {
    platformClientId,
    platformCancelUrl,
    platformBookingUrl,
    platformRescheduleUrl,
    platformBookingLocation,
  } = params.platformParams;

  const {
    notes: additionalNotes,
    appsStatus: reqAppsStatus,
    name: bookerName,
    email: bookerEmail,
    rescheduleReason,
    hasHashedBookingLink,
    routingFormResponseId,
  } = bookingData;
  const reqBody = bookingData;

  const fullName = getFullName(bookerName);

  const { bookingLocation, conferenceCredentialId, organizerOrFirstDynamicGroupMemberDefaultLocationUrl } =
    decideLocation({
      dynamicUserList: eventType.users,
      users,
      location: reqBody.location,
      eventType,
      organizerUser,
      isManagedEventType,
      isTeamEventType,
    });
  // TODO: To be used from preloadedData
  const { isConfirmedByDefault } = await getRequiresConfirmationFlags({
    eventType,
    bookingStartTime: reqBody.start,
    userId: userIdMakingBooking,
    originalRescheduledBookingOrganizerId: originalRescheduledBooking?.user?.id,
    paymentAppData,
    bookerEmail,
  });
  const allCredentials = await getAllCredentialsIncludeServiceAccountKey(organizerUser, eventType);

  // TODO: Create a preloadedData object in params and provide credentials through that so that handleNewBooking could pass already computed credentials here and we could use that.
  // After polling videoBusyTimes, credentials might have been changed due to refreshment, so query them again.
  const credentials = await refreshCredentials(allCredentials);
  const { teamId, orgId } = await getOrgIdAndTeamIdForEventType({ eventType });

  let assignmentReason: { reasonEnum: AssignmentReasonEnum; reasonString: string } | undefined;
  // If it's a round robin event, record the reason for the host assignment
  if (eventType.schedulingType === SchedulingType.ROUND_ROBIN) {
    if (reqBody.crmOwnerRecordType && reqBody.crmAppSlug && contactOwnerEmail && routingFormResponseId) {
      assignmentReason = await AssignmentReasonRecorder.CRMOwnership({
        bookingId: booking.id,
        crmAppSlug: reqBody.crmAppSlug,
        teamMemberEmail: contactOwnerEmail,
        recordType: reqBody.crmOwnerRecordType,
        routingFormResponseId,
      });
    } else if (routingFormResponseId && teamId) {
      assignmentReason = await AssignmentReasonRecorder.routingFormRoute({
        bookingId: booking.id,
        routingFormResponseId,
        organizerId: organizerUser.id,
        teamId,
      });
    }
  }

  const customInputs = getCustomInputsResponses(reqBody, eventType.customInputs);

  const { evt: basicEvt, eventNameObject } = await buildEvent({
    fullName,
    eventType,
    organizerUser,
    organizerEmail,
    attendeesList,
    bookerUrl,
    platformBookingLocation,
    bookingLocation,
    conferenceCredentialId,
    destinationCalendar,
    tOrganizer,
    isConfirmedByDefault,
    iCalUID,
    iCalSequence,
    platformClientId,
    platformRescheduleUrl,
    platformCancelUrl,
    platformBookingUrl,
    isTeamEventType,
    users,
    bookingData,
  });

  let evt = CalendarEventBuilder.fromEvent(basicEvt)
    .withUid(booking.uid ?? null)
    .build();

  evt = CalendarEventBuilder.fromEvent(evt)
    .withOneTimePassword(booking.oneTimePassword ?? null)
    .build();

  const changedOrganizer =
    !!originalRescheduledBooking &&
    eventType.schedulingType === SchedulingType.ROUND_ROBIN &&
    originalRescheduledBooking.userId !== evt.organizer.id;

  const isBookingRequestedReschedule =
    !!originalRescheduledBooking &&
    !!originalRescheduledBooking.rescheduled &&
    originalRescheduledBooking.status === BookingStatus.CANCELLED;

  const loggerWithEventDetails = createLoggerWithEventDetails(eventTypeId, reqBody.user, eventTypeSlug);

  if (
    changedOrganizer &&
    originalRescheduledBooking &&
    originalRescheduledBooking?.user?.name &&
    organizerUser?.name
  ) {
    evt.title = updateHostInEventName(
      originalRescheduledBooking.title,
      originalRescheduledBooking.user.name,
      organizerUser.name
    );
  }

  const apps = eventTypeAppMetadataOptionalSchema.parse(eventType?.metadata?.apps);
  const eventManager = !isDryRun
    ? new EventManager({ ...organizerUser, credentials }, apps)
    : buildDryRunEventManager();
  const log = logger.getSubLogger({ prefix: ["[onBookingCreationInDb]"] }); // Local logger

  let videoCallUrl;
  let results: EventResult<AdditionalInformation & { url?: string; iCalUID?: string }>[] = [];
  const referencesToCreate: PartialReference[] = [];

  //this is the actual rescheduling logic
  if (!eventType.seatsPerTimeSlot && originalRescheduledBooking?.uid) {
    log.silly("Rescheduling booking", originalRescheduledBooking.uid);
    // cancel workflow reminders from previous rescheduled booking
    await WorkflowRepository.deleteAllWorkflowReminders(originalRescheduledBooking.workflowReminders);

    evt = addVideoCallDataToEvent(originalRescheduledBooking.references, evt);
    evt.rescheduledBy = reqBody.rescheduledBy;

    // If organizer is changed in RR event then we need to delete the previous host destination calendar events
    const previousHostDestinationCalendar = originalRescheduledBooking?.destinationCalendar
      ? [originalRescheduledBooking?.destinationCalendar]
      : [];

    if (changedOrganizer) {
      // location might changed and will be new created in eventManager.create (organizer default location)
      evt.videoCallData = undefined;
      // To prevent "The requested identifier already exists" error while updating event, we need to remove iCalUID
      evt.iCalUID = undefined;
    } else {
      // In case of rescheduling, we need to keep the previous host destination calendar
      evt = CalendarEventBuilder.fromEvent(evt)
        .withDestinationCalendar(
          originalRescheduledBooking?.destinationCalendar
            ? [originalRescheduledBooking?.destinationCalendar]
            : evt.destinationCalendar
        )
        .build();
    }

    const updateManager = await eventManager.reschedule(
      evt,
      originalRescheduledBooking.uid,
      undefined,
      changedOrganizer,
      previousHostDestinationCalendar,
      isBookingRequestedReschedule
    );
    // This gets overridden when updating the event - to check if notes have been hidden or not. We just reset this back
    // to the default description when we are sending the emails.
    evt.description = eventType.description;

    results = updateManager.results;
    referencesToCreate.push(...updateManager.referencesToCreate);

    videoCallUrl = evt.videoCallData && evt.videoCallData.url ? evt.videoCallData.url : null;

    // This gets overridden when creating the event - to check if notes have been hidden or not. We just reset this back
    // to the default description when we are sending the emails.
    evt.description = eventType.description;

    const { metadata: videoMetadata, videoCallUrl: _videoCallUrl } = getVideoCallDetails({
      results,
    });

    let metadata: AdditionalInformation = {};
    metadata = videoMetadata;
    videoCallUrl = _videoCallUrl;

    const isThereAnIntegrationError = results && results.some((res) => !res.success);

    if (isThereAnIntegrationError) {
      const error = {
        errorCode: "BookingReschedulingMeetingFailed",
        message: "Booking Rescheduling failed",
      };

      loggerWithEventDetails.error(
        `EventManager.reschedule failure in some of the integrations ${organizerUser.username}`,
        safeStringify({ error, results })
      );
    } else {
      if (results.length) {
        // Handle Google Meet results
        // We use the original booking location since the evt location changes to daily
        if (bookingLocation === MeetLocationType) {
          const googleMeetResult = {
            appName: GoogleMeetMetadata.name,
            type: "conferencing",
            uid: results[0].uid,
            originalEvent: results[0].originalEvent,
          };

          // Find index of google_calendar inside updateManager.referencesToCreate
          const googleCalIndex = updateManager.referencesToCreate.findIndex(
            (ref) => ref.type === "google_calendar"
          );
          const googleCalResult = results[googleCalIndex];

          if (!googleCalResult) {
            loggerWithEventDetails.warn("Google Calendar not installed but using Google Meet as location");
            results.push({
              ...googleMeetResult,
              success: false,
              calWarnings: [tOrganizer("google_meet_warning")],
            });
          }

          const googleHangoutLink = Array.isArray(googleCalResult?.updatedEvent)
            ? googleCalResult.updatedEvent[0]?.hangoutLink
            : googleCalResult?.updatedEvent?.hangoutLink ?? googleCalResult?.createdEvent?.hangoutLink;

          if (googleHangoutLink) {
            results.push({
              ...googleMeetResult,
              success: true,
            });

            // Add google_meet to referencesToCreate in the same index as google_calendar
            // Ensure referencesToCreate is updated correctly
            const refIdx = referencesToCreate.findIndex(
              (r) =>
                r.type === "google_calendar" &&
                r.uid === updateManager.referencesToCreate[googleCalIndex]?.uid
            );
            if (refIdx !== -1 && updateManager.referencesToCreate[googleCalIndex]) {
              referencesToCreate[refIdx] = {
                ...referencesToCreate[refIdx],
                meetingUrl: googleHangoutLink,
              };
            }

            // Also create a new referenceToCreate with type video for google_meet
            referencesToCreate.push({
              type: "google_meet_video",
              meetingUrl: googleHangoutLink,
              uid: googleCalResult.uid,
              credentialId: updateManager.referencesToCreate[googleCalIndex]?.credentialId,
            });
          } else if (googleCalResult && !googleHangoutLink) {
            results.push({
              ...googleMeetResult,
              success: false,
            });
          }
        }
        const createdOrUpdatedEvent = Array.isArray(results[0]?.updatedEvent)
          ? results[0]?.updatedEvent[0]
          : results[0]?.updatedEvent ?? results[0]?.createdEvent;
        metadata.hangoutLink = createdOrUpdatedEvent?.hangoutLink;
        metadata.conferenceData = createdOrUpdatedEvent?.conferenceData;
        metadata.entryPoints = createdOrUpdatedEvent?.entryPoints;
        evt.appsStatus = handleAppsStatus(results, booking, reqAppsStatus);
        videoCallUrl =
          metadata.hangoutLink ||
          createdOrUpdatedEvent?.url ||
          organizerOrFirstDynamicGroupMemberDefaultLocationUrl ||
          getVideoCallUrlFromCalEvent(evt) ||
          videoCallUrl;
      }

      const calendarResult = results.find((result) => result.type.includes("_calendar"));

      evt.iCalUID = Array.isArray(calendarResult?.updatedEvent)
        ? calendarResult?.updatedEvent[0]?.iCalUID
        : calendarResult?.updatedEvent?.iCalUID || undefined;
    }

    evt.appsStatus = handleAppsStatus(results, booking, reqAppsStatus);

    if (noEmail !== true && isConfirmedByDefault) {
      const copyEvent = cloneDeep(evt);
      const copyEventAdditionalInfo = {
        ...copyEvent,
        additionalInformation: metadata,
        additionalNotes, // Resets back to the additionalNote input and not the override value
        cancellationReason: `$RCH$${rescheduleReason ? rescheduleReason : ""}`, // Removable code prefix to differentiate cancellation from rescheduling for email
      };
      const cancelledRRHostEvt = cloneDeep(copyEventAdditionalInfo);
      loggerWithEventDetails.debug("Emails: Sending rescheduled emails for booking confirmation");

      if (eventType.schedulingType === "ROUND_ROBIN") {
        const originalBookingMemberEmails: Person[] = [];

        for (const user of originalRescheduledBooking.attendees) {
          const translate = await getTranslation(user.locale ?? "en", "common");
          originalBookingMemberEmails.push({
            name: user.name,
            email: user.email,
            timeZone: user.timeZone,
            phoneNumber: user.phoneNumber,
            language: { translate, locale: user.locale ?? "en" },
          });
        }
        if (originalRescheduledBooking.user) {
          const translate = await getTranslation(originalRescheduledBooking.user.locale ?? "en", "common");
          const originalOrganizer = originalRescheduledBooking.user;

          originalBookingMemberEmails.push({
            ...originalRescheduledBooking.user,
            name: originalRescheduledBooking.user.name || "",
            language: { translate, locale: originalRescheduledBooking.user.locale ?? "en" },
          });

          if (changedOrganizer) {
            cancelledRRHostEvt.title = originalRescheduledBooking.title;
            cancelledRRHostEvt.startTime =
              dayjs(originalRescheduledBooking?.startTime).utc().format() ||
              copyEventAdditionalInfo.startTime;
            cancelledRRHostEvt.endTime =
              dayjs(originalRescheduledBooking?.endTime).utc().format() || copyEventAdditionalInfo.endTime;
            cancelledRRHostEvt.organizer = {
              email: originalOrganizer.email,
              name: originalOrganizer.name || "",
              timeZone: originalOrganizer.timeZone,
              language: { translate, locale: originalOrganizer.locale || "en" },
            };
          }
        }

        const newBookingMemberEmails: Person[] =
          copyEvent.team?.members
            .map((member) => member)
            .concat(copyEvent.organizer)
            .concat(copyEvent.attendees) || [];

        const matchOriginalMemberWithNewMember = (originalMember: Person, newMember: Person) => {
          return originalMember.email === newMember.email;
        };

        const newBookedMembers = newBookingMemberEmails.filter(
          (member) =>
            !originalBookingMemberEmails.find((originalMember) =>
              matchOriginalMemberWithNewMember(originalMember, member)
            )
        );
        const cancelledMembers = originalBookingMemberEmails.filter(
          (member) =>
            !newBookingMemberEmails.find((newMember) => matchOriginalMemberWithNewMember(member, newMember))
        );
        const rescheduledMembers = newBookingMemberEmails.filter((member) =>
          originalBookingMemberEmails.find((orignalMember) =>
            matchOriginalMemberWithNewMember(orignalMember, member)
          )
        );

        if (!isDryRun) {
          sendRoundRobinRescheduledEmailsAndSMS(
            copyEventAdditionalInfo,
            rescheduledMembers,
            eventType.metadata
          );
          sendRoundRobinScheduledEmailsAndSMS({
            calEvent: copyEventAdditionalInfo,
            members: newBookedMembers,
            eventTypeMetadata: eventType.metadata,
          });
          sendRoundRobinCancelledEmailsAndSMS(cancelledRRHostEvt, cancelledMembers, eventType.metadata);
        }
      } else {
        if (!isDryRun) {
          await sendRescheduledEmailsAndSMS(
            {
              ...copyEvent,
              additionalInformation: metadata,
              additionalNotes,
              cancellationReason: `$RCH$${rescheduleReason ? rescheduleReason : ""}`,
            },
            eventType?.metadata
          );
        }
      }
    }
  } else if (isConfirmedByDefault) {
    const createManager = await eventManager.create(evt);
    if (evt.location) {
      booking.location = evt.location;
    }
    evt.description = eventType.description;

    results = createManager.results;
    referencesToCreate.push(...createManager.referencesToCreate);
    videoCallUrl = evt.videoCallData && evt.videoCallData.url ? evt.videoCallData.url : null;

    if (results.length > 0 && results.every((res) => !res.success)) {
      const error = {
        errorCode: "BookingCreatingMeetingFailed",
        message: "Booking failed",
      };
      loggerWithEventDetails.error(
        `EventManager.create failure in some of the integrations ${organizerUser.username}`,
        safeStringify({ error, results })
      );
    } else {
      const additionalInformation: AdditionalInformation = {};
      if (results.length) {
        if (bookingLocation === MeetLocationType) {
          const googleMeetResult = {
            appName: GoogleMeetMetadata.name,
            type: "conferencing",
            uid: results[0].uid,
            originalEvent: results[0].originalEvent,
          };
          const googleCalIndex = createManager.referencesToCreate.findIndex(
            (ref) => ref.type === "google_calendar"
          );
          const googleCalResult = results[googleCalIndex];

          if (!googleCalResult) {
            loggerWithEventDetails.warn("Google Calendar not installed but using Google Meet as location");
            results.push({
              ...googleMeetResult,
              success: false,
              calWarnings: [tOrganizer("google_meet_warning")],
            });
          }

          if (googleCalResult?.createdEvent?.hangoutLink) {
            results.push({ ...googleMeetResult, success: true });
            const refIdx = referencesToCreate.findIndex(
              (r) =>
                r.type === "google_calendar" &&
                r.uid === createManager.referencesToCreate[googleCalIndex]?.uid
            );
            if (refIdx !== -1 && createManager.referencesToCreate[googleCalIndex]) {
              referencesToCreate[refIdx] = {
                ...referencesToCreate[refIdx],
                meetingUrl: googleCalResult.createdEvent.hangoutLink,
              };
            }
            referencesToCreate.push({
              type: "google_meet_video",
              meetingUrl: googleCalResult.createdEvent.hangoutLink,
              uid: googleCalResult.uid,
              credentialId: createManager.referencesToCreate[googleCalIndex]?.credentialId,
            });
          } else if (googleCalResult && !googleCalResult.createdEvent?.hangoutLink) {
            results.push({ ...googleMeetResult, success: false });
          }
        }
        additionalInformation.hangoutLink = results[0].createdEvent?.hangoutLink;
        additionalInformation.conferenceData = results[0].createdEvent?.conferenceData;
        additionalInformation.entryPoints = results[0].createdEvent?.entryPoints;
        evt.appsStatus = handleAppsStatus(results, booking, reqAppsStatus);
        videoCallUrl =
          additionalInformation.hangoutLink ||
          organizerOrFirstDynamicGroupMemberDefaultLocationUrl ||
          videoCallUrl;

        if (!isDryRun && evt.iCalUID !== booking.iCalUID) {
          booking = await prisma.booking.update({
            where: { id: booking.id },
            data: { iCalUID: evt.iCalUID || booking.iCalUID },
            include: {
              attendees: true,
              user: true,
              payment: true,
              references: true,
              eventType: true,
            }, // Ensure booking remains compatible with CreatedBooking
          });
        }
      }
      if (noEmail !== true) {
        const isHostConfirmationEmailsDisabled =
          eventType.metadata?.disableStandardEmails?.confirmation?.host || false;
        const isAttendeeConfirmationEmailDisabled =
          eventType.metadata?.disableStandardEmails?.confirmation?.attendee || false;
        // Functions allowDisablingHostConfirmationEmails, allowDisablingAttendeeConfirmationEmails are not passed, direct usage from metadata
        loggerWithEventDetails.debug(
          "Emails: Sending scheduled emails for booking confirmation",
          safeStringify({ calEvent: getPiiFreeCalendarEvent(evt) })
        );
        if (!isDryRun) {
          await sendScheduledEmailsAndSMS(
            { ...evt, additionalInformation, additionalNotes, customInputs },
            eventNameObject,
            isHostConfirmationEmailsDisabled,
            isAttendeeConfirmationEmailDisabled,
            eventType.metadata
          );
        }
      }
    }
  } else {
    loggerWithEventDetails.debug(
      `EventManager doesn't need to create or reschedule event for booking ${organizerUser.username}`,
      safeStringify({
        calEvent: getPiiFreeCalendarEvent(evt),
        isConfirmedByDefault,
        paymentValue: paymentAppData.price,
      })
    );
  }

  const bookingRequiresPayment =
    !Number.isNaN(paymentAppData.price) &&
    paymentAppData.price > 0 &&
    !originalRescheduledBooking?.paid &&
    !!booking;

  let paymentProcessingResult: OnBookingCreationInDbResult["paymentDetails"];

  if (!isConfirmedByDefault && noEmail !== true && !bookingRequiresPayment) {
    loggerWithEventDetails.debug(
      `Emails: Booking ${organizerUser.username} requires confirmation, sending request emails`,
      safeStringify({ calEvent: getPiiFreeCalendarEvent(evt) })
    );
    if (!isDryRun) {
      await sendOrganizerRequestEmail({ ...evt, additionalNotes }, eventType.metadata);
      await sendAttendeeRequestEmailAndSMS({ ...evt, additionalNotes }, attendeesList[0], eventType.metadata);
    }
  }

  if (booking.location?.startsWith("http")) {
    videoCallUrl = booking.location;
  }

  const currentVideoCallUrl = getVideoCallUrlFromCalEvent(evt) || videoCallUrl;
  const metadataForWebhook = currentVideoCallUrl ? { videoCallUrl: currentVideoCallUrl } : undefined;

  const eventTypeInfo: EventTypeInfo = {
    eventTitle: eventType.title,
    eventDescription: eventType.description,
    price: paymentAppData.price,
    currency: eventType.currency,
    length: dayjs(reqBody.end).diff(dayjs(reqBody.start), "minutes"),
  };

  const webhookData: EventPayloadType = {
    ...evt,
    ...eventTypeInfo,
    bookingId: booking?.id,
    rescheduleId: originalRescheduledBooking?.id || undefined,
    rescheduleUid: reqBody.rescheduleUid,
    rescheduleStartTime: originalRescheduledBooking?.startTime
      ? dayjs(originalRescheduledBooking?.startTime).utc().format()
      : undefined,
    rescheduleEndTime: originalRescheduledBooking?.endTime
      ? dayjs(originalRescheduledBooking?.endTime).utc().format()
      : undefined,
    metadata: { ...metadataForWebhook, ...reqBody.metadata },
    eventTypeId,
    status: "ACCEPTED", // Default, will be PENDING if !isConfirmedByDefault
    smsReminderNumber: booking?.smsReminderNumber || undefined,
    rescheduledBy: reqBody.rescheduledBy,
    ...(assignmentReason ? { assignmentReason: [assignmentReason] } : {}),
  };

  if (bookingRequiresPayment) {
    loggerWithEventDetails.debug(`Booking ${organizerUser.username} requires payment`);
    const credentialPaymentAppCategories = await prisma.credential.findMany({
      where: {
        ...(paymentAppData.credentialId ? { id: paymentAppData.credentialId } : { userId: organizerUser.id }),
        app: { categories: { hasSome: ["payment"] } },
      },
      select: { key: true, appId: true, app: { select: { categories: true, dirName: true } } },
    });
    const eventTypePaymentAppCredential = credentialPaymentAppCategories.find(
      (credential) => credential.appId === paymentAppData.appId
    );

    if (!eventTypePaymentAppCredential) {
      throw new HttpError({ statusCode: 400, message: "Missing payment credentials" });
    }

    const payment = await handlePayment({
      evt,
      selectedEventType: eventType,
      paymentAppCredentials: eventTypePaymentAppCredential as IEventTypePaymentCredentialType,
      booking,
      bookerName: fullName,
      bookerEmail: reqBody.email, // Assuming reqBody.email is bookerEmail
      bookerPhoneNumber: reqBody.attendeePhoneNumber, // Assuming this is bookerPhoneNumber
      isDryRun,
    });
    const subscriberOptionsPaymentInitiated: GetSubscriberOptions = {
      userId: triggerForUser ? organizerUser.id : null,
      eventTypeId,
      triggerEvent: WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED,
      teamId,
      orgId,
      oAuthClientId: platformClientId,
    };
    await handleWebhookTrigger({
      subscriberOptions: subscriberOptionsPaymentInitiated,
      eventTrigger: WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED,
      webhookData: { ...webhookData, paymentId: payment?.id },
      isDryRun,
    });

    paymentProcessingResult = {
      message: "Payment required",
      paymentRequired: true,
      paymentUid: payment?.uid,
      paymentId: payment?.id,
    };
    return {
      videoCallUrl: null,
      paymentDetails: paymentProcessingResult,
      referencesToCreate,
    };
  }

  // We are here so, booking doesn't require payment and booking is also created in DB already, through createBooking call
  if (isConfirmedByDefault) {
    const subscriberOptionsMeetingEnded: GetSubscriberOptions = {
      userId: triggerForUser ? organizerUser.id : null,
      eventTypeId,
      triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
      teamId,
      orgId,
      oAuthClientId: platformClientId,
    };
    const subscriberOptionsMeetingStarted: GetSubscriberOptions = {
      userId: triggerForUser ? organizerUser.id : null,
      eventTypeId,
      triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
      teamId,
      orgId,
      oAuthClientId: platformClientId,
    };

    const subscribersMeetingEnded = await getWebhooks(subscriberOptionsMeetingEnded);
    const subscribersMeetingStarted = await getWebhooks(subscriberOptionsMeetingStarted);

    let deleteWebhookScheduledTriggerPromise: Promise<unknown> = Promise.resolve();
    const scheduleTriggerPromises = [];

    if (reqBody.rescheduleUid && originalRescheduledBooking) {
      deleteWebhookScheduledTriggerPromise = deleteWebhookScheduledTriggers({
        booking: originalRescheduledBooking,
        isDryRun,
      });
    }

    if (booking && booking.status === BookingStatus.ACCEPTED) {
      const bookingWithCalEventResponses = { ...booking, responses: reqBody.calEventResponses };
      for (const subscriber of subscribersMeetingEnded) {
        scheduleTriggerPromises.push(
          scheduleTrigger({
            booking: bookingWithCalEventResponses,
            subscriberUrl: subscriber.subscriberUrl,
            subscriber,
            triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
            isDryRun,
          })
        );
      }
      for (const subscriber of subscribersMeetingStarted) {
        scheduleTriggerPromises.push(
          scheduleTrigger({
            booking: bookingWithCalEventResponses,
            subscriberUrl: subscriber.subscriberUrl,
            subscriber,
            triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
            isDryRun,
          })
        );
      }
    }
    await Promise.all([deleteWebhookScheduledTriggerPromise, ...scheduleTriggerPromises]).catch((error) => {
      loggerWithEventDetails.error(
        "Error while scheduling or canceling webhook triggers",
        JSON.stringify({ error })
      );
    });

    const eventTrigger = reqBody.rescheduleUid
      ? WebhookTriggerEvents.BOOKING_RESCHEDULED
      : WebhookTriggerEvents.BOOKING_CREATED;
    const subscriberOptions: GetSubscriberOptions = {
      userId: triggerForUser ? organizerUser.id : null,
      eventTypeId,
      triggerEvent: eventTrigger,
      teamId,
      orgId,
      oAuthClientId: platformClientId,
    };
    await handleWebhookTrigger({ subscriberOptions, eventTrigger, webhookData, isDryRun });
  } else {
    const eventTrigger = WebhookTriggerEvents.BOOKING_REQUESTED;
    const subscriberOptions: GetSubscriberOptions = {
      userId: triggerForUser ? organizerUser.id : null,
      eventTypeId,
      triggerEvent: eventTrigger,
      teamId,
      orgId,
      oAuthClientId: platformClientId,
    };
    webhookData.status = "PENDING";
    await handleWebhookTrigger({ subscriberOptions, eventTrigger, webhookData, isDryRun });
  }

  try {
    if (hasHashedBookingLink && reqBody.hashedLink && !isDryRun) {
      await prisma.hashedLink.delete({ where: { link: reqBody.hashedLink as string } });
    }
  } catch (error) {
    loggerWithEventDetails.error("Error while updating hashed link", JSON.stringify({ error }));
  }

  if (!booking) throw new HttpError({ statusCode: 400, message: "Booking failed" });

  const finalVideoCallUrl = (booking.metadata as any)?.videoCallUrl || currentVideoCallUrl;
  // Update booking with final metadata and references
  // The original handleNewBooking also does this after this block.
  // We should ensure this is done once. Let's do it here.
  try {
    if (!isDryRun) {
      await createCalendarSyncTask({
        results,
        organizer: { id: organizerUser.id, organizationId: organizerOrganizationId ?? null },
      });
      const finalMetadata = {
        ...(typeof booking.metadata === "object" ? booking.metadata : {}),
        ...(finalVideoCallUrl ? { videoCallUrl: finalVideoCallUrl } : {}),
      };

      booking = await prisma.booking.update({
        where: { uid: booking.uid },
        data: {
          location: evt.location, // Use final evt.location
          metadata: finalMetadata,
          references: { createMany: { data: referencesToCreate } },
        },
        include: { attendees: true, user: true, payment: true, references: true, eventType: true },
      });
    }
  } catch (error) {
    loggerWithEventDetails.error(
      "Error while updating booking with references/metadata or creating calendar sync task",
      JSON.stringify({ error })
    );
  }

  const evtWithMetadata = {
    ...evt,
    rescheduleReason,
    metadata: booking.metadata as any, // Use updated booking metadata
    eventType: { slug: eventType.slug, schedulingType: eventType.schedulingType, hosts: eventType.hosts },
    bookerUrl: evt.bookerUrl, // Ensure bookerUrl is on evt
  };

  if (!eventType.metadata?.disableStandardEmails?.all?.attendee) {
    await scheduleMandatoryReminder({
      evt: evtWithMetadata,
      workflows,
      requiresConfirmation: !isConfirmedByDefault,
      hideBranding: !!eventType.owner?.hideBranding,
      seatReferenceUid: evt.attendeeSeatId,
      isPlatformNoEmail: noEmail && Boolean(platformClientId),
      isDryRun,
    });
  }

  try {
    await scheduleWorkflowReminders({
      workflows,
      smsReminderNumber: reqBody.smsReminderNumber || null,
      calendarEvent: evtWithMetadata,
      isNotConfirmed: reqBody.rescheduleUid ? false : !isConfirmedByDefault,
      isRescheduleEvent: !!reqBody.rescheduleUid,
      isFirstRecurringEvent: reqBody.allRecurringDates ? reqBody.isFirstRecurringSlot : undefined,
      hideBranding: !!eventType.owner?.hideBranding,
      seatReferenceUid: evt.attendeeSeatId,
      isDryRun,
    });
  } catch (error) {
    loggerWithEventDetails.error("Error while scheduling workflow reminders", safeStringify(error));
  }

  try {
    if (isConfirmedByDefault && booking.status === BookingStatus.ACCEPTED) {
      // ensure booking is accepted for no show
      await scheduleNoShowTriggers({
        booking: { startTime: booking.startTime, id: booking.id, location: booking.location },
        triggerForUser,
        organizerUser: { id: organizerUser.id },
        eventTypeId,
        teamId,
        orgId,
        isDryRun,
      });
    }
  } catch (error) {
    loggerWithEventDetails.error("Error while scheduling no show triggers", JSON.stringify({ error }));
  }

  if (!isDryRun) {
    await handleAnalyticsEvents({
      credentials, // Use refreshed credentials
      rawBookingData: reqBody, // Assuming reqBody is sufficient for rawBookingData
      bookingInfo: {
        name: fullName,
        email: reqBody.email, // Booker email
        eventName: "Cal.com lead", // Or more specific
      },
    });
  }

  return {
    videoCallUrl: finalVideoCallUrl,
    paymentDetails: paymentProcessingResult,
    referencesToCreate,
  };
}
