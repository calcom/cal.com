"use client";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";

import NoPlatformPlan from "@components/settings/platform/dashboard/NoPlatformPlan";
import { useGetUserAttributes } from "@components/settings/platform/hooks/useGetUserAttributes";
import { PlatformPricing } from "@components/settings/platform/pricing/platform-pricing/index";
import type { UserListTableProps } from "~/users/components/UserTable/UserListTable";
import { UserListTable } from "~/users/components/UserTable/UserListTable";
import { UserListTableSkeleton } from "~/users/components/UserTable/UserListTableSkeleton";

const PlatformMembersView = (props: Omit<UserListTableProps, "facetedTeamValues" | "attributes">) => {
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

  return isPlatformUser ? (
    <div>{canLoggedInUserSeeMembers && <UserListTable {...props} />}</div>
  ) : (
    <NoPlatformPlan />
  );
};

export default PlatformMembersView;
