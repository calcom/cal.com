import { shouldIgnoreContactOwner } from "@calcom/lib/bookings/routing/utils";
import { extractBaseEmail } from "@calcom/lib/extract-base-email";
import { getPaymentAppData } from "@calcom/lib/getPaymentAppData";
import { HttpError } from "@calcom/lib/http-error";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import type { TgetBookingDataSchema } from "../../getBookingDataSchema";
import { getLocationValuesForDb } from "../../handleNewBooking/getLocationValuesForDb";
import { loadAndValidateUsers } from "../../handleNewBooking/loadAndValidateUsers";
import type { UsersWithDelegationCredentials } from "../../handleNewBooking/loadAndValidateUsers";
import type { Invitee, PaymentAppData } from "../../handleNewBooking/types";
import type { QuickValidationOutputContext } from "./quickValidation";

// Individual guest item type (Invitee is an array type)
type GuestItem = Invitee[number];

export type DeepEnrichmentInputContext = QuickValidationOutputContext & {
  hostname: string;
  forcedSlug: string | undefined;
  isPlatformBooking: boolean;
  dynamicUserList: string[];
  routedTeamMemberIds: number[] | null;
  routingFormResponseId: number | undefined;
  contactOwnerFromReq: string | null;
};

export type DeepEnrichmentOutputContext = {
  eventType: QuickValidationOutputContext["eventType"];
  bookingData: QuickValidationOutputContext["bookingData"];
  bookerEmail: string;
  bookerPhoneNumber?: string;
  bookerName: string | { firstName: string; lastName?: string };
  additionalNotes?: string;
  location: string;
  reqBody: TgetBookingDataSchema & { end: string };
  isDryRun: boolean;
  loggerWithEventDetails: QuickValidationOutputContext["loggerWithEventDetails"];
  routingFormResponse: {
    response: Prisma.JsonValue;
    form: {
      routes: Prisma.JsonValue;
      fields: Prisma.JsonValue;
    };
    chosenRouteId: string | null;
  } | null;
  qualifiedRRUsers: UsersWithDelegationCredentials;
  additionalFallbackRRUsers: UsersWithDelegationCredentials;
  fixedUsers: UsersWithDelegationCredentials;
  users: UsersWithDelegationCredentials;
  contactOwnerEmail: string | null;
  locationBodyString: string;
  organizerOrFirstDynamicGroupMemberDefaultLocationUrl: string | null | undefined;
  guests: Invitee;
  guestsRemoved: string[];
  paymentAppData: PaymentAppData;
  isTeamEventType: boolean;
  isRescheduling: boolean;
  isSeatedEvent: boolean;
};

export interface IDeepEnrichmentServiceDependencies {
  prisma: PrismaClient;
}

export interface IDeepEnrichmentService {
  enrich(context: DeepEnrichmentInputContext): Promise<DeepEnrichmentOutputContext>;
}

export class DeepEnrichmentService implements IDeepEnrichmentService {
  constructor(private readonly deps: IDeepEnrichmentServiceDependencies) {}

  async enrich(context: DeepEnrichmentInputContext): Promise<DeepEnrichmentOutputContext> {
    const {
      eventType,
      bookingData,
      bookerEmail,
      bookerPhoneNumber,
      bookerName,
      additionalNotes,
      location,
      reqBody,
      isDryRun,
      loggerWithEventDetails,
      hostname,
      forcedSlug,
      isPlatformBooking,
      dynamicUserList,
      routedTeamMemberIds,
      routingFormResponseId,
      contactOwnerFromReq,
    } = context;

    const { prisma } = this.deps;

    // Extract routing form response enrichment logic
    let routingFormResponse = null;

    if (routedTeamMemberIds) {
      //routingFormResponseId could be 0 for dry run. So, we just avoid undefined value
      if (routingFormResponseId === undefined) {
        throw new HttpError({ statusCode: 400, message: "Missing routingFormResponseId" });
      }
      routingFormResponse = await prisma.app_RoutingForms_FormResponse.findUnique({
        where: {
          id: routingFormResponseId,
        },
        select: {
          response: true,
          form: {
            select: {
              routes: true,
              fields: true,
            },
          },
          chosenRouteId: true,
        },
      });
    }

    // Determine contact owner email
    const skipContactOwner = shouldIgnoreContactOwner({
      skipContactOwner: reqBody.skipContactOwner ?? null,
      rescheduleUid: reqBody.rescheduleUid ?? null,
      routedTeamMemberIds: routedTeamMemberIds ?? null,
    });

    const contactOwnerEmail: string | null = skipContactOwner ? null : contactOwnerFromReq;

    // Load qualified and fixed hosts with credentials
    const { qualifiedRRUsers, additionalFallbackRRUsers, fixedUsers } = await loadAndValidateUsers({
      hostname,
      forcedSlug,
      isPlatform: isPlatformBooking,
      eventType,
      eventTypeId: eventType.id,
      dynamicUserList,
      logger: loggerWithEventDetails,
      routedTeamMemberIds: routedTeamMemberIds ?? null,
      contactOwnerEmail,
      rescheduleUid: reqBody.rescheduleUid || null,
      routingFormResponse,
    });

    // We filter out users but ensure allHostUsers remain same.
    const users = [...qualifiedRRUsers, ...additionalFallbackRRUsers, ...fixedUsers];

    const { locationBodyString, organizerOrFirstDynamicGroupMemberDefaultLocationUrl } =
      getLocationValuesForDb({
        dynamicUserList,
        users,
        location,
      });

    // Extract guest sanitization logic
    const { guests: reqGuests } = bookingData;
    const isTeamEventType =
      !!eventType.schedulingType && ["COLLECTIVE", "ROUND_ROBIN"].includes(eventType.schedulingType);

    // Get attendee timezone and translation for guests
    const attendeeTimezone = reqBody.timeZone;
    const attendeeLanguage = reqBody.language;
    const tGuests = await getTranslation(attendeeLanguage ?? "en", "common");

    const blacklistedGuestEmails = process.env.BLACKLISTED_GUEST_EMAILS
      ? process.env.BLACKLISTED_GUEST_EMAILS.split(",")
      : [];
    const guestsRemoved: string[] = [];
    const guests: Invitee = (reqGuests || []).reduce((guestArray: GuestItem[], guest: string) => {
      const baseGuestEmail = extractBaseEmail(guest).toLowerCase();
      if (blacklistedGuestEmails.some((e) => e.toLowerCase() === baseGuestEmail)) {
        guestsRemoved.push(guest);
        return guestArray;
      }
      // If it's a team event, remove the team member from guests
      if (isTeamEventType && users.some((user) => user.email === guest)) {
        return guestArray;
      }
      guestArray.push({
        email: guest,
        name: "",
        firstName: "",
        lastName: "",
        timeZone: attendeeTimezone,
        language: { translate: tGuests, locale: "en" },
      });
      return guestArray;
    }, [] as GuestItem[]);

    // Extract payment data preparation
    const paymentAppData = getPaymentAppData(eventType);

    // Derive various properties from the input data
    const isRescheduling = !!reqBody.rescheduleUid;
    const isSeatedEvent = !!eventType.seatsPerTimeSlot;

    return {
      eventType,
      bookingData,
      bookerEmail,
      bookerPhoneNumber,
      bookerName,
      additionalNotes,
      location,
      reqBody,
      isDryRun,
      loggerWithEventDetails,
      routingFormResponse,
      qualifiedRRUsers,
      additionalFallbackRRUsers,
      fixedUsers,
      users,
      contactOwnerEmail,
      locationBodyString,
      organizerOrFirstDynamicGroupMemberDefaultLocationUrl,
      guests,
      guestsRemoved,
      paymentAppData,
      isTeamEventType,
      isRescheduling,
      isSeatedEvent,
    };
  }
}
