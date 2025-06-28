import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { GetBookingType } from "@calcom/features/bookings/lib/get-booking";
import { getBookingForReschedule } from "@calcom/features/bookings/lib/get-booking";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";

interface DynamicBookingDataParams {
  teamId: number;
  rescheduleUid?: string | string[];
  query: GetServerSidePropsContext["query"];
  req: GetServerSidePropsContext["req"];
  eventData: any;
  isInstantMeetingQuery?: boolean;
}

interface DynamicBookingData {
  booking: GetBookingType | null;
  teamMemberEmail?: string;
  crmOwnerRecordType?: string;
  crmAppSlug?: string;
  useApiV2: boolean;
  isInstantMeeting: boolean;
}

function hasApiV2RouteInEnv() {
  return Boolean(process.env.NEXT_PUBLIC_API_V2_URL);
}

export async function getDynamicBookingData({
  teamId,
  rescheduleUid,
  query,
  req,
  eventData,
  isInstantMeetingQuery = false,
}: DynamicBookingDataParams): Promise<DynamicBookingData> {
  // Get user session (user-specific)
  const session = await getServerSession({ req });

  // Get booking data for reschedule (user-specific)
  let booking: GetBookingType | null = null;
  if (rescheduleUid) {
    booking = await getBookingForReschedule(`${rescheduleUid}`, session?.user?.id);
  }

  // Handle CRM integration (request-specific)
  const crmContactOwnerEmail = query["cal.crmContactOwnerEmail"];
  const crmContactOwnerRecordType = query["cal.crmContactOwnerRecordType"];
  const crmAppSlugParam = query["cal.crmAppSlug"];

  let teamMemberEmail = Array.isArray(crmContactOwnerEmail) ? crmContactOwnerEmail[0] : crmContactOwnerEmail;
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
      eventData,
    });

    teamMemberEmail = email ?? undefined;
    crmOwnerRecordType = recordType ?? undefined;
    crmAppSlug = crmAppSlugQuery ?? undefined;
  }

  // Check feature flags (team-specific)
  const featureRepo = new FeaturesRepository();
  const teamHasApiV2Route = await featureRepo.checkIfTeamHasFeature(teamId, "use-api-v2-for-team-slots");
  const useApiV2 = teamHasApiV2Route && hasApiV2RouteInEnv();

  // Handle instant meeting query parameter
  const isInstantMeeting = eventData && isInstantMeetingQuery ? true : false;

  return {
    booking,
    teamMemberEmail,
    crmOwnerRecordType,
    crmAppSlug,
    useApiV2,
    isInstantMeeting,
  };
}
