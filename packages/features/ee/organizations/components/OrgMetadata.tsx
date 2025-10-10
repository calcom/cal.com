"use client";

import { z } from "zod";

import { AdminMetadata } from "@calcom/features/billing/components";
import type { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";

type Metadata = z.infer<typeof teamMetadataSchema>;

export const OrgMetadata = ({ metadata, orgId }: { metadata: Metadata; orgId: number }) => {
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
    <AdminMetadata metadata={metadata} entityType="organization" onUpdate={handleUpdate} canEdit={true} />
  );
};
