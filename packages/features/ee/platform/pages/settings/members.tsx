"use client";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";
import { UserListTable } from "@calcom/features/users/components/UserTable/UserListTable";
import type { UserListTableProps } from "@calcom/features/users/components/UserTable/UserListTable";
import { UserListTableSkeleton } from "@calcom/features/users/components/UserTable/UserListTableSkeleton";

export type PlatformMembersViewProps = Omit<UserListTableProps, "facetedTeamValues" | "attributes"> & {
  platformUserInfo?: {
    isUserLoading?: boolean;
    isUserBillingDataLoading?: boolean;
    isPlatformUser: boolean;
    isPaidUser?: boolean;
    userBillingData?: unknown;
    userOrgId?: number | null;
  };
  NoPlatformPlanComponent?: React.ComponentType;
  PlatformPricingComponent?: React.ComponentType<{
    teamId?: number | null;
    heading?: React.ReactNode;
  }>;
};

const PlatformMembersView = (props: PlatformMembersViewProps) => {
  const {
    platformUserInfo,
    NoPlatformPlanComponent,
    PlatformPricingComponent,
    ...userListTableProps
  } = props;
  
  const isUserLoading = platformUserInfo?.isUserLoading ?? false;
  const isUserBillingDataLoading = platformUserInfo?.isUserBillingDataLoading ?? false;
  const isPlatformUser = platformUserInfo?.isPlatformUser ?? false;
  const isPaidUser = platformUserInfo?.isPaidUser ?? false;
  const userBillingData = platformUserInfo?.userBillingData;
  const userOrgId = platformUserInfo?.userOrgId;
  const currentOrg = userListTableProps.org;
  const isOrgAdminOrOwner = currentOrg && checkAdminOrOwner(currentOrg.user.role);

  const canLoggedInUserSeeMembers =
    (currentOrg?.isPrivate && isOrgAdminOrOwner) || isOrgAdminOrOwner || !currentOrg?.isPrivate;

  if (isUserLoading || (isUserBillingDataLoading && !userBillingData)) {
    return <UserListTableSkeleton />;
  }

  if (isPlatformUser && !isPaidUser && PlatformPricingComponent) {
    return (
      <PlatformPricingComponent
        teamId={userOrgId}
        heading={
          <div className="mb-5 text-center text-2xl font-semibold">
            <h1>Subscribe to Platform</h1>
          </div>
        }
      />
    );
  }

  if (isPlatformUser && !isPaidUser && !PlatformPricingComponent) {
    return <div>Platform pricing component not provided</div>;
  }

  if (!isPlatformUser && NoPlatformPlanComponent) {
    return <NoPlatformPlanComponent />;
  }

  if (!isPlatformUser && !NoPlatformPlanComponent) {
    return <div>Not a platform user</div>;
  }

  return isPlatformUser ? (
    <div>{canLoggedInUserSeeMembers && <UserListTable {...userListTableProps} platformUserInfo={{ isPlatformUser }} />}</div>
  ) : null;
};

export default PlatformMembersView;
