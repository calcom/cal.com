"use client";

import type { Attribute } from "@calcom/app-store/routing-forms/types/types";
import type { IntegrationAttributeSync } from "@calcom/features/ee/integration-attribute-sync/repositories/IIntegrationAttributeSyncRepository";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { useState } from "react";
import EditIntegrationAttributeSyncCard from "./EditIntegrationAttributeSyncCard";
import NewIntegrationAttributeSyncCard from "./NewIntegrationAttributeSyncCard";

interface IIntegrationAttributeSyncViewProps {
  credentialsData: {
    id: number;
    type: string;
    team: {
      name: string;
    } | null;
  }[];
  initialIntegrationAttributeSyncs: IntegrationAttributeSync[];
  organizationTeams: {
    id: number;
    name: string;
  }[];
  attributes: Attribute[];
  organizationId: number;
}

const IntegrationAttributeSyncView = (props: IIntegrationAttributeSyncViewProps) => {
  const { credentialsData, initialIntegrationAttributeSyncs, organizationTeams, attributes, organizationId } =
    props;
  const { t } = useLocale();

  const [showNewSync, setShowNewSync] = useState(false);

  const { data: integrationAttributeSyncs } = trpc.viewer.attributeSync.getAllAttributeSyncs.useQuery(
    {},
    {
      initialData: initialIntegrationAttributeSyncs,
    }
  );

  const credentialOptions =
    credentialsData?.map((cred) => ({
      value: String(cred.id),
      label: `${cred.type} ${cred.team?.name ? `(${cred.team.name})` : ""}`,
    })) ?? [];

  const teamOptions =
    organizationTeams?.map((team) => ({
      value: String(team.id),
      label: team.name,
    })) ?? [];

  const attributeOptions =
    attributes?.map((attr) => ({
      value: attr.id,
      label: attr.name,
    })) ?? [];

  const handleAddNewSync = () => {
    setShowNewSync(true);
  };

  const handleCancel = () => {
    setShowNewSync(false);
  };

  return (
    <>
      {integrationAttributeSyncs && integrationAttributeSyncs.length > 0 && (
        <div className="mb-4 space-y-2">
          {integrationAttributeSyncs.map((sync) => (
            <EditIntegrationAttributeSyncCard
              key={sync.id}
              sync={sync}
              credentialOptions={credentialOptions}
              teamOptions={teamOptions}
              attributes={attributes}
              attributeOptions={attributeOptions}
              organizationId={organizationId}
            />
          ))}
        </div>
      )}

      {showNewSync && (
        <NewIntegrationAttributeSyncCard
          credentialOptions={credentialOptions}
          teamOptions={teamOptions}
          attributes={attributes}
          attributeOptions={attributeOptions}
          organizationId={organizationId}
          onCancel={handleCancel}
        />
      )}
      <Button StartIcon="plus" onClick={handleAddNewSync}>
        {t("attribute_sync_add_new")}
      </Button>
    </>
  );
};

export default IntegrationAttributeSyncView;
