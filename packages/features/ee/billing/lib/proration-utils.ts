export const MONTHLY_PRORATION_METADATA_TYPE = "monthly_proration";

type MetadataContainer = {
  metadata?: Record<string, string | null | undefined> | null;
};

export function buildMonthlyProrationMetadata(params: {
  prorationId: string;
  teamId?: number;
  monthKey?: string;
}): Record<string, string> {
  const metadata: Record<string, string> = {
    type: MONTHLY_PRORATION_METADATA_TYPE,
    prorationId: params.prorationId,
  };

  if (typeof params.teamId === "number") {
    metadata.teamId = params.teamId.toString();
  }

  if (params.monthKey) {
    metadata.monthKey = params.monthKey;
  }

  return metadata;
}

export function findMonthlyProrationLineItem<T extends MetadataContainer>(lineItems: T[]): T | undefined {
  return lineItems.find((line) => line.metadata?.type === MONTHLY_PRORATION_METADATA_TYPE);
}
