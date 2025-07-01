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

export interface DynamicBookingData extends BookingSessionData, CRMData {
  isInstantMeeting: boolean;
  useApiV2: boolean;
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

  static async shouldUseApiV2ForTeamSlots(teamId: number): Promise<boolean> {
    const featureRepo = new FeaturesRepository();
    const teamHasApiV2Route = await featureRepo.checkIfTeamHasFeature(teamId, "use-api-v2-for-team-slots");
    const useApiV2 = teamHasApiV2Route && Boolean(process.env.NEXT_PUBLIC_API_V2_URL);

    return useApiV2;
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
    const sessionData = await this.getBookingSessionData(req, rescheduleUid);
    const crmData = await this.getCRMData(query, rawEventData);
    const useApiV2 = await this.shouldUseApiV2ForTeamSlots(teamId);

    const isInstantMeeting = this.isInstantMeeting(processedEventData, isInstantMeetingQuery);

    return {
      ...sessionData,
      ...crmData,
      useApiV2,
      isInstantMeeting,
    };
  }
}
