import { MembershipRole } from "@prisma/client";
import { useRouter } from "next/router";

import SAMLConfiguration from "@calcom/features/ee/sso/components/SAMLConfiguration";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import EmptyScreen from "@calcom/ui/v2/core/EmptyScreen";
import Meta from "@calcom/ui/v2/core/Meta";
import SkeletonLoader from "@calcom/ui/v2/core/apps/SkeletonLoader";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";

const SAMLSSO = () => {
  const router = useRouter();

  const { data: team, isLoading } = trpc.useQuery(["viewer.teams.get", { teamId: Number(router.query.id) }], {
    onError: () => {
      router.push("/settings");
    },
  });

  const { data: saml, isLoading: isLoadingSAML } = trpc.useQuery(
    ["viewer.saml.access", { teamsView: true }],
    {
      onError: () => {
        router.push("/settings");
      },
    }
  );

  if (isLoading || isLoadingSAML) {
    return <SkeletonLoader />;
  }

  if (!team) {
    router.push("/404");
    return;
  }

  const isAdmin =
    team.membership.role === MembershipRole.OWNER || team.membership.role === MembershipRole.ADMIN;

  // Prevent non-admin from accessing this page
  if (!isAdmin) {
    router.push("/404");
  }

  return (
    <>
      <Meta title="SAML SSO" description="Allow team members to login using an Identity Provider." />
      {saml && saml.enabled ? (
        <SAMLConfiguration teamsView={true} teamId={team.id} />
      ) : (
        <EmptyScreen
          Icon={Icon.FiCalendar}
          headline="Please upgrade your plan to enable SAML SSO"
          description="Allow team members to login using an Identity Provider."
        />
      )}
    </>
  );
};

SAMLSSO.getLayout = getLayout;

export default SAMLSSO;
