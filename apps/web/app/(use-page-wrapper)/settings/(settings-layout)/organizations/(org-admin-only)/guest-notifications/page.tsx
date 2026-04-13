import { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { getResourcePermissions } from "@calcom/features/pbac/lib/resource-permissions";
import { MembershipRole } from "@calcom/prisma/enums";
import { AppHeader, AppHeaderContent, AppHeaderDescription } from "@coss/ui/shared/app-header";
import { _generateMetadata, getTranslate } from "app/_utils";
import { redirect } from "next/navigation";
import GuestNotificationsView from "~/ee/organizations/guest-notifications";
import { validateUserHasOrg } from "../../actions/validateUserHasOrg";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("guest_notifications"),
    (t) => t("guest_notifications_description"),
    undefined,
    undefined,
    "/settings/organizations/guest-notifications"
  );

const Page = async () => {
  const session = await validateUserHasOrg();
  const t = await getTranslate();

  if (!session?.user.id || !session?.user.profile?.organizationId || !session?.user.org) {
    return redirect("/settings/profile");
  }

  const { canRead, canEdit } = await getResourcePermissions({
    userId: session.user.id,
    teamId: session.user.profile.organizationId,
    resource: Resource.Organization,
    userRole: session.user.org.role,
    fallbackRoles: {
      read: {
        roles: [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER],
      },
      update: {
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
    },
  });

  if (!canRead) {
    return redirect("/settings/profile");
  }

  return (
    <>
      <AppHeader>
        <AppHeaderContent title={t("guest_notifications")}>
          <AppHeaderDescription>{t("guest_notifications_description")}</AppHeaderDescription>
        </AppHeaderContent>
      </AppHeader>
      <GuestNotificationsView permissions={{ canRead, canEdit }} />
    </>
  );
};

export default Page;

export const unstable_dynamicStaleTime = 30;
