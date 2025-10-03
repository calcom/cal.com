"use client";

import { AdminMetadata } from "@calcom/features/billing/components";
import type { Team } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc/react";

export const OrgMetadata = ({ metadata, orgId }: { metadata: Team["metadata"]; orgId: number }) => {
  const utils = trpc.useUtils();

  const updateMetadataMutation = trpc.viewer.organizations.adminUpdateMetadata.useMutation();

  const handleUpdate = async (editedMetadata: Record<string, string>) => {
    await updateMetadataMutation.mutateAsync({
      id: orgId,
      metadata: editedMetadata,
    });

    // Invalidate to refetch the org data
    await utils.viewer.organizations.adminGet.invalidate({ id: orgId });
  };

  return (
    <AdminMetadata
      metadata={metadata}
      entityId={orgId}
      entityType="organization"
      onUpdate={handleUpdate}
      canEdit={true}
    />
  );
};
