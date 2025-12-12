import handleMarkNoShow from "@calcom/features/handleMarkNoShow";
import { getAuditActorRepository } from "@calcom/features/booking-audit/di/AuditActorRepository.container";

import type { TNoShowInputSchema } from "./markHostAsNoShow.schema";

type NoShowOptions = {
  input: TNoShowInputSchema;
};

export const noShowHandler = async ({ input }: NoShowOptions) => {
  const { bookingUid, noShowHost } = input;

  return handleMarkNoShow({
    bookingUid,
    noShowHost,
    auditActorRepository: getAuditActorRepository(),
  });
};

export default noShowHandler;
