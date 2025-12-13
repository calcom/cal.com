import type { Module } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";

import { KyselyVideoCallGuestRepository } from "../../video-call-guest/repositories/KyselyVideoCallGuestRepository";
import { DI_TOKENS } from "../tokens";

export function videoCallGuestRepositoryModuleLoader(): Module {
  return (container) => {
    container.bind(DI_TOKENS.VIDEO_CALL_GUEST_REPOSITORY).toValue(new KyselyVideoCallGuestRepository(kyselyRead, kyselyWrite));
  };
}
