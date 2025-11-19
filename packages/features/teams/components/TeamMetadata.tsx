import { z } from "zod";

import { AdminMetadata } from "@calcom/features/billing/components";
import type { teamMetadataSchema } from "@calcom/prisma/zod-utils";

type Metadata = z.infer<typeof teamMetadataSchema>;

export const TeamMetadata = ({ metadata }: { metadata: Metadata }) => {
  return <AdminMetadata metadata={metadata} />;
};
