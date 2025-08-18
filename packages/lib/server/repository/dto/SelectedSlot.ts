import type { SelectedSlots } from "@calcom/prisma/client";

export type SelectedSlot = Pick<
  SelectedSlots,
  "id" | "uid" | "eventTypeId" | "slotUtcStartDate" | "slotUtcEndDate" | "releaseAt" | "isSeat"
>;
