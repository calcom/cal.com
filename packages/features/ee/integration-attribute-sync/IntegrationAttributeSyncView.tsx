"use client";

import { useState } from "react";

import type { Attribute } from "@calcom/lib/service/attribute/server/getAttributes";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";

import EditIntegrationAttributeSyncCard from "./components/EditIntegrationAttributeSyncCard";
import NewIntegrationAttributeSyncCard from "./components/NewIntegrationAttributeSyncCard";
import type { IntegrationAttributeSync } from "./repositories/IIntegrationAttributeSyncRepository";

interface IIntegrationAttributeSyncViewProps {
  credentialsData: {
    id: number;
    type: string;
    team: {
      name: string;
    } | null;
  }[];
  initalIntegrationAttributeSyncs: IntegrationAttributeSync[];
  organizationTeams: {
    id: number;
    name: string;
  }[];
  attributes: Attribute[];
  organizationId: number;
}

const IntegrationAttributeSyncView = (props: IIntegrationAttributeSyncViewProps) => {
  const { credentialsData, initalIntegrationAttributeSyncs, organizationTeams, attributes, organizationId } =
    props;

  const [showNewSync, setShowNewSync] = useState(false);

  const { data: integrationAttributeSyncs } = trpc.viewer.attributeSync.getAllAttributeSyncs.useQuery(
    undefined,
    {
      initialData: initalIntegrationAttributeSyncs,
    }
  );

  const credentialOptions =
    credentialsData?.map((cred) => ({
      value: String(cred.id),
      label: `${cred.type} (${cred.team?.name})`,
    })) ?? [];

  // Transform teams data for rule builder
  const teamOptions =
    organizationTeams?.map((team) => ({
      value: String(team.id),
      label: team.name,
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
          organizationId={organizationId}
          onCancel={handleCancel}
        />
      )}
      <Button StartIcon="plus" onClick={handleAddNewSync}>
        Add new sync
      </Button>
    </>
  );
};

export default IntegrationAttributeSyncView;
