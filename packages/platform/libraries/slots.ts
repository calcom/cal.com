import { getAvailableSlots } from "@calcom/trpc/server/routers/viewer/slots/util";

export { getAvailableSlots };
export type AvailableSlotsType = Awaited<ReturnType<typeof getAvailableSlots>>;
