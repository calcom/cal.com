"use client";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { UserListTable } from "@calcom/features/users/components/UserTable/UserListTable";
import type { UserListTableProps } from "@calcom/features/users/components/UserTable/UserListTable";
import { UserListTableSkeleton } from "@calcom/features/users/components/UserTable/UserListTableSkeleton";
import NoPlatformPlan from "@calcom/web/components/settings/platform/dashboard/NoPlatformPlan";
import { useGetUserAttributes } from "@calcom/web/components/settings/platform/hooks/useGetUserAttributes";
import { PlatformPricing } from "@calcom/web/components/settings/platform/pricing/platform-pricing/index";

const PlatformMembersView = (props: UserListTableProps) => {
  const { isUserLoading, isUserBillingDataLoading, isPlatformUser, isPaidUser, userBillingData, userOrgId } =
    useGetUserAttributes();
  const currentOrg = props.org;
  const isOrgAdminOrOwner = currentOrg && checkAdminOrOwner(currentOrg.user.role);

  const canLoggedInUserSeeMembers =
    (currentOrg?.isPrivate && isOrgAdminOrOwner) || isOrgAdminOrOwner || !currentOrg?.isPrivate;

  if (isUserLoading || (isUserBillingDataLoading && !userBillingData)) {
    return <UserListTableSkeleton />;
  }

  if (isPlatformUser && !isPaidUser)
    return (
      <PlatformPricing
        teamId={userOrgId}
        heading={
          <div className="mb-5 text-center text-2xl font-semibold">
            <h1>Subscribe to Platform</h1>
          </div>
        }
      />
    );

  return !isPlatformUser ? (
    <div>{canLoggedInUserSeeMembers && <UserListTable {...props} />}</div>
  ) : (
    <NoPlatformPlan />
  );
};

export default PlatformMembersView;
