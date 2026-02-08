import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getFeatureOptInService } from "@calcom/features/di/containers/FeatureOptInService";
import { getUserFeatureRepository } from "@calcom/features/di/containers/UserFeatureRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRole } from "@calcom/prisma/enums";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
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

  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const userId = session.user.id;
  const permissionService = new PermissionCheckService();
  const userFeatureRepository = getUserFeatureRepository();

  const teamIdsWithPermission = await permissionService.getTeamIdsWithPermission({
    userId,
    permission: "booking.read",
    fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
  });
  // We check if teamIdsWithPermission.length > 0.
  // While this may not be entirely accurate, it's acceptable
  // because we perform a thorough validation on the server side for the actual filter values.
  // This variable is primarily for UI purposes.
  const canReadOthersBookings = teamIdsWithPermission.length > 0;

  const featureOptInService = getFeatureOptInService();

  const [bookingAuditEnabled, featureStates] = await Promise.all([
    userFeatureRepository.checkIfUserHasFeature(userId, "booking-audit"),
    featureOptInService.resolveFeatureStates({
      userId,
      featureIds: ["bookings-v3"],
    }),
  ]);

  const bookingsV3Enabled = featureStates["bookings-v3"]?.effectiveEnabled ?? false;

  return (
    <ShellMainAppDir
      {...(!bookingsV3Enabled
        ? {
            heading: t("bookings"),
            subtitle: t("bookings_description"),
          }
        : {})}>
      <BookingsList
        status={parsed.data.status}
        userId={userId}
        permissions={{ canReadOthersBookings }}
        bookingsV3Enabled={bookingsV3Enabled}
        bookingAuditEnabled={bookingAuditEnabled}
      />
    </ShellMainAppDir>
  );
};

export default Page;
