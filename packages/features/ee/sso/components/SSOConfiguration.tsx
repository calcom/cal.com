import { useState } from "react";

import ConnectionInfo from "@calcom/ee/sso/components/ConnectionInfo";
import LicenseRequired from "@calcom/features/ee/common/components/LicenseRequired";
import OIDCConnection from "@calcom/features/ee/sso/components/OIDCConnection";
import SAMLConnection from "@calcom/features/ee/sso/components/SAMLConnection";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { AppSkeletonLoader as SkeletonLoader, Meta, Alert } from "@calcom/ui";

export default function SSOConfiguration({ teamId }: { teamId: number | null }) {
  const [errorMessage, setErrorMessage] = useState("");
  const { t } = useLocale();

  const { data: connection, isLoading } = trpc.viewer.saml.get.useQuery(
    { teamId },
    {
      onError: (err) => {
        setErrorMessage(err.message);
      },
    }
  );

  if (isLoading) {
    return <SkeletonLoader />;
  }

  if (errorMessage) {
    return (
      <>
        <Meta title={t("sso_configuration")} description={t("saml_description")} />
        <Alert severity="warning" message={t(errorMessage)} className="mb-4 " />
      </>
    );
  }

  // No connection found
  if (!connection) {
    return (
      <LicenseRequired>
        <div className="flex flex-col space-y-10">
          <SAMLConnection teamId={teamId} connection={null} />
          <OIDCConnection teamId={teamId} connection={null} />
        </div>
      </LicenseRequired>
    );
  }

  return (
    <LicenseRequired>
      <div className="flex flex-col space-y-6">
        {connection.type === "saml" ? (
          <SAMLConnection teamId={teamId} connection={connection} />
        ) : (
          <OIDCConnection teamId={teamId} connection={connection} />
        )}
        <ConnectionInfo teamId={teamId} connection={connection} />
      </div>
    </LicenseRequired>
  );
}
