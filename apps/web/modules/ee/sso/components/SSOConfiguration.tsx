"use client";

import {
  Card,
  CardFrame,
  CardFrameDescription,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@coss/ui/components/card";

import ConnectionInfo from "./ConnectionInfo";
import OIDCConnection from "./OIDCConnection";
import SAMLConnection from "./SAMLConnection";
import LicenseRequired from "~/ee/common/components/LicenseRequired";
import { useLocale } from "@calcom/i18n/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert, AlertDescription } from "@coss/ui/components/alert";
import { Skeleton } from "@coss/ui/components/skeleton";
import { TriangleAlertIcon } from "@coss/ui/icons";
import {
  ListItem,
  ListItemActions,
  ListItemContent,
  ListItemHeader,
} from "@coss/ui/shared/list-item";

function SkeletonRow() {
  return (
    <ListItem>
      <ListItemContent>
        <ListItemHeader>
          <Skeleton className="h-6 w-32 sm:h-5" />
          <Skeleton className="my-0.5 h-4 w-48" />
        </ListItemHeader>
      </ListItemContent>
      <ListItemActions>
        <Skeleton className="h-9 rounded-lg sm:h-8 w-24" />
      </ListItemActions>
    </ListItem>
  );
}

const SkeletonLoader = () => (
  <Card>
    <CardPanel className="p-0">
      <SkeletonRow />
      <SkeletonRow />
    </CardPanel>
  </Card>
);

export default function SSOConfiguration({ teamId }: { teamId: number | null }) {
  const { t } = useLocale();

  const { data: connection, isPending, error } = trpc.viewer.saml.get.useQuery({ teamId });

  if (isPending) {
    return <SkeletonLoader />;
  }

  if (error) {
    return (
      <Alert variant="warning">
        <TriangleAlertIcon />
        <AlertDescription>{t(error.message)}</AlertDescription>
      </Alert>
    );
  }

  // No connection found
  if (!connection) {
    return (
      <LicenseRequired>
        <Card>
          <CardPanel className="p-0">
            <SAMLConnection teamId={teamId} connection={null} />
            <OIDCConnection teamId={teamId} connection={null} />
          </CardPanel>
        </Card>
      </LicenseRequired>
    );
  }

  const headingKey = connection.type === "saml" ? "sso_saml_heading" : "sso_oidc_heading";
  const descriptionKey = connection.type === "saml" ? "sso_saml_description" : "sso_oidc_description";

  return (
    <LicenseRequired>
      <CardFrame>
        <CardFrameHeader>
          <CardFrameTitle>{t(headingKey)}</CardFrameTitle>
          <CardFrameDescription>{t(descriptionKey)}</CardFrameDescription>
        </CardFrameHeader>
        <Card>
          <CardPanel>
            <ConnectionInfo teamId={teamId} connection={connection} />
          </CardPanel>
        </Card>
      </CardFrame>
    </LicenseRequired>
  );
}
