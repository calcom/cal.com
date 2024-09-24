"use client";

import Shell from "@calcom/features/shell/Shell";
import { UserListTable } from "@calcom/features/users/components/UserTable/UserListTable";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";

const PlatformMembersView = () => {
  const { data: user } = useMeQuery();

  console.log(user, "this is the user".toLocaleUpperCase());

  const { data: currentOrg, isPending } = trpc.viewer.organizations.listCurrent.useQuery();

  const isOrgAdminOrOwner =
    currentOrg &&
    (currentOrg.user.role === MembershipRole.OWNER || currentOrg.user.role === MembershipRole.ADMIN);

  const canLoggedInUserSeeMembers =
    (currentOrg?.isPrivate && isOrgAdminOrOwner) || isOrgAdminOrOwner || !currentOrg?.isPrivate;

  return (
    <Shell
      heading="Member management"
      title="Platform members"
      hideHeadingOnMobile
      withoutMain={false}
      subtitle="Manage the admins and members in your platform team"
      isPlatformUser={true}>
      <div>{!isPending && canLoggedInUserSeeMembers && <UserListTable />}</div>
    </Shell>
  );
};

export default PlatformMembersView;
