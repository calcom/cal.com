import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { getBookingForReschedule } from "@calcom/features/bookings/lib/get-booking";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { SchedulingType } from "@calcom/prisma/enums";
import { BookingStatus } from "@calcom/prisma/enums";

import type { ProcessedEventData } from "./eventType";

export interface BookingSessionData {
  booking: GetBookingType | null;
  userId?: number;
}

export interface CRMData {
  teamMemberEmail?: string;
  crmOwnerRecordType?: string;
  crmAppSlug?: string;
}

export interface FeatureFlags {
  useApiV2: boolean;
}

export interface DynamicBookingData extends BookingSessionData, CRMData, FeatureFlags {
  isInstantMeeting: boolean;
}

function hasApiV2RouteInEnv() {
  return Boolean(process.env.NEXT_PUBLIC_API_V2_URL);
}

export class BookingService {
  /**
   * Gets user session and booking data - should NOT be cached as it's user/request specific
   */
  static async getBookingSessionData(
    req: GetServerSidePropsContext["req"],
    rescheduleUid?: string | string[]
  ): Promise<BookingSessionData> {
    const session = await getServerSession({ req });

    let booking: GetBookingType | null = null;
    if (rescheduleUid) {
      booking = await getBookingForReschedule(`${rescheduleUid}`, session?.user?.id);
    }

    return {
      booking,
      userId: session?.user?.id,
    };
  }

  /**
   * Processes CRM integration data - should NOT be cached as it's request specific
   */
  static async getCRMData(
    query: GetServerSidePropsContext["query"],
    rawEventData: {
      id: number;
      isInstantEvent: boolean;
      schedulingType: SchedulingType | null;
      metadata: any;
      length: number;
    }
  ): Promise<CRMData> {
    const crmContactOwnerEmail = query["cal.crmContactOwnerEmail"];
    const crmContactOwnerRecordType = query["cal.crmContactOwnerRecordType"];
    const crmAppSlugParam = query["cal.crmAppSlug"];

    let teamMemberEmail = Array.isArray(crmContactOwnerEmail)
      ? crmContactOwnerEmail[0]
      : crmContactOwnerEmail;
    let crmOwnerRecordType = Array.isArray(crmContactOwnerRecordType)
      ? crmContactOwnerRecordType[0]
      : crmContactOwnerRecordType;
    let crmAppSlug = Array.isArray(crmAppSlugParam) ? crmAppSlugParam[0] : crmAppSlugParam;

    if (!teamMemberEmail || !crmOwnerRecordType || !crmAppSlug) {
      const { getTeamMemberEmailForResponseOrContactUsingUrlQuery } = await import(
        "@calcom/lib/server/getTeamMemberEmailFromCrm"
      );
      const {
        email,
        recordType,
        crmAppSlug: crmAppSlugQuery,
      } = await getTeamMemberEmailForResponseOrContactUsingUrlQuery({
        query,
        eventData: rawEventData,
      });

      teamMemberEmail = email ?? undefined;
      crmOwnerRecordType = recordType ?? undefined;
      crmAppSlug = crmAppSlugQuery ?? undefined;
    }

    return {
      teamMemberEmail,
      crmOwnerRecordType,
      crmAppSlug,
    };
  }

  /**
   * Gets feature flags for team - can be cached as feature flags change infrequently per team
   */
  static async getTeamFeatureFlags(teamId: number): Promise<FeatureFlags> {
    const featureRepo = new FeaturesRepository();
    const teamHasApiV2Route = await featureRepo.checkIfTeamHasFeature(teamId, "use-api-v2-for-team-slots");
    const useApiV2 = teamHasApiV2Route && hasApiV2RouteInEnv();

    return {
      useApiV2,
    };
  }

  /**
   * Determines if meeting is instant - not cached as it depends on query params
   */
  static isInstantMeeting(eventData: ProcessedEventData, isInstantMeetingQuery?: boolean): boolean {
    return eventData && isInstantMeetingQuery ? true : false;
  }

  /**
   * Validates if cancelled booking can be rescheduled - not cached as it depends on booking state
   */
  static canRescheduleCancelledBooking(
    booking: GetBookingType | null,
    allowRescheduleForCancelledBooking: boolean,
    eventData: ProcessedEventData
  ): boolean {
    if (
      booking?.status === BookingStatus.CANCELLED &&
      !allowRescheduleForCancelledBooking &&
      !eventData.allowReschedulingCancelledBookings
    ) {
      return false;
    }
    return true;
  }

  /**
   * Combines all dynamic booking data - orchestrates other service calls
   */
  static async getDynamicBookingData(
    teamId: number,
    rescheduleUid: string | string[] | undefined,
    query: GetServerSidePropsContext["query"],
    req: GetServerSidePropsContext["req"],
    rawEventData: {
      id: number;
      isInstantEvent: boolean;
      schedulingType: SchedulingType | null;
      metadata: any;
      length: number;
    },
    processedEventData: ProcessedEventData,
    isInstantMeetingQuery?: boolean
  ): Promise<DynamicBookingData> {
    // Get session and booking data (user-specific, not cached)
    const sessionData = await this.getBookingSessionData(req, rescheduleUid);

    // Get CRM data (request-specific, not cached)
    const crmData = await this.getCRMData(query, rawEventData);

    // Get feature flags (team-specific, can be cached)
    const featureFlags = await this.getTeamFeatureFlags(teamId);

    // Determine if instant meeting (query-specific, not cached)
    const isInstantMeeting = this.isInstantMeeting(processedEventData, isInstantMeetingQuery);

    return {
      ...sessionData,
      ...crmData,
      ...featureFlags,
      isInstantMeeting,
    };
  }
}
