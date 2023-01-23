import ConnectionInfo from "@calcom/ee/sso/components/ConnectionInfo";
import LicenseRequired from "@calcom/features/ee/common/components/v2/LicenseRequired";
import OIDCConnection from "@calcom/features/ee/sso/components/OIDCConnection";
import SAMLConnection from "@calcom/features/ee/sso/components/SAMLConnection";
import { trpc } from "@calcom/trpc/react";
import { AppSkeletonLoader as SkeletonLoader } from "@calcom/ui";

export default function SSOConfiguration({ teamId }: { teamId: number | null }) {
  const { data: connection, isLoading } = trpc.viewer.saml.get.useQuery({ teamId });

  if (isLoading) {
    return <SkeletonLoader />;
  }

  // No connection found
  if (!connection) {
    return (
      <LicenseRequired>
        <div className="flex flex-col space-y-10">
          <SAMLConnection teamId={teamId} />
          <OIDCConnection teamId={teamId} />
        </div>
      </LicenseRequired>
    );
  }

  return (
    <LicenseRequired>
      <div className="flex flex-col space-y-10">
        {connection.type === "saml" ? <SAMLConnection teamId={teamId} /> : <OIDCConnection teamId={teamId} />}
        <ConnectionInfo teamId={teamId} connection={connection} />
      </div>
    </LicenseRequired>
  );
}
