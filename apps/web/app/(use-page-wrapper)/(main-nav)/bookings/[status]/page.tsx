import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { validStatuses } from "~/bookings/lib/validStatuses";
import BookingsList from "~/bookings/views/bookings-view";

const querySchema = z.object({
  status: z.enum(validStatuses),
});

export const generateMetadata = async ({ params }: { params: Promise<{ status: string }> }) =>
  await _generateMetadata(
    (t) => t("bookings"),
    (t) => t("bookings_description"),
    undefined,
    undefined,
    `/bookings/${(await params).status}`
  );

const Page = async ({ params }: PageProps) => {
  const parsed = querySchema.safeParse(await params);
  if (!parsed.success) {
    redirect("/bookings/upcoming");
  }
  const t = await getTranslate();
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  let canReadOthersBookings = false;
  if (session?.user?.id) {
    const permissionService = new PermissionCheckService();
    const userId = session.user.id;

    const teamIdsWithPermission = await permissionService.getTeamIdsWithPermission({
      userId,
      permission: "booking.read",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });
    // We check if teamIdsWithPermission.length > 0.
    // While this may not be entirely accurate, it's acceptable
    // because we perform a thorough validation on the server side for the actual filter values.
    // This variable is primarily for UI purposes.
    canReadOthersBookings = teamIdsWithPermission.length > 0;
  }

  const featuresRepository = new FeaturesRepository(prisma);
  const isCalendarViewEnabled = await featuresRepository.checkIfFeatureIsEnabledGlobally(
    "booking-calendar-view"
  );

  return (
    <ShellMainAppDir heading={t("bookings")}>
      <BookingsList
        status={parsed.data.status}
        userId={session?.user?.id}
        permissions={{ canReadOthersBookings }}
        isCalendarViewEnabled={isCalendarViewEnabled}
      />
    </ShellMainAppDir>
  );
};

export default Page;
