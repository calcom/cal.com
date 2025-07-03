import type { Prisma } from "@prisma/client";
import type { GetServerSidePropsContext } from "next";

import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import type { SchedulingType } from "@calcom/prisma/enums";

interface CRMData {
  teamMemberEmail: string | undefined;
  crmOwnerRecordType: string | undefined;
  crmAppSlug: string | undefined;
}

export class BookingService {
  static async getCRMData(
    query: GetServerSidePropsContext["query"],
    eventData: {
      id: number;
      isInstantEvent: boolean;
      schedulingType: SchedulingType | null;
      metadata: Prisma.JsonValue | null;
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
        eventData,
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
}
