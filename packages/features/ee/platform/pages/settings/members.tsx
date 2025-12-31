"use client";

import type { ComponentType, ReactNode } from "react";

import { checkAdminOrOwner } from "@calcom/features/auth/lib/checkAdminOrOwner";

interface UserListTablePropsBase {
  org: {
    isPrivate: boolean;
    user: {
      role: string;
    };
  };
}

interface UserAttributesResult {
  isUserLoading: boolean;
  isUserBillingDataLoading: boolean;
  isPlatformUser: boolean;
  isPaidUser: boolean;
  userBillingData: unknown;
  userOrgId: number | null;
}

interface PlatformPricingProps {
  teamId: number | null;
  heading: ReactNode;
}

interface PlatformMembersViewProps<T extends UserListTablePropsBase> {
  tableProps: Omit<T, "facetedTeamValues" | "attributes">;
  UserListTable: ComponentType<Omit<T, "facetedTeamValues" | "attributes">>;
  UserListTableSkeleton: ComponentType;
  PlatformPricing: ComponentType<PlatformPricingProps>;
  NoPlatformPlan: ComponentType;
  useGetUserAttributes: () => UserAttributesResult;
}

function PlatformMembersView<T extends UserListTablePropsBase>({
  tableProps,
  UserListTable,
  UserListTableSkeleton,
  PlatformPricing,
  NoPlatformPlan,
  useGetUserAttributes,
}: PlatformMembersViewProps<T>) {
  const { isUserLoading, isUserBillingDataLoading, isPlatformUser, isPaidUser, userBillingData, userOrgId } =
    useGetUserAttributes();
  const currentOrg = tableProps.org;
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
    <div>{canLoggedInUserSeeMembers && <UserListTable {...tableProps} />}</div>
  ) : (
    <NoPlatformPlan />
  );
}

export default PlatformMembersView;
export type { PlatformMembersViewProps, UserListTablePropsBase, UserAttributesResult, PlatformPricingProps };
