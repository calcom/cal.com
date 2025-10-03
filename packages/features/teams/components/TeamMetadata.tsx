"use client";

import { AdminMetadata } from "@calcom/features/billing/components";
import type { Team } from "@calcom/prisma/client";

export const TeamMetadata = ({ metadata }: { metadata: Team["metadata"] }) => {
  return <AdminMetadata metadata={metadata} />;
};
