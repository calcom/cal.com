import type { Module } from "@evyweb/ioctopus";

import { kyselyRead, kyselyWrite } from "@calcom/kysely";

import { KyselyBookingSeatRepository } from "../../bookings/repositories/KyselyBookingSeatRepository";
import { DI_TOKENS } from "../tokens";

export function bookingSeatRepositoryModuleLoader(): Module {
  return (container) => {
    container.bind(DI_TOKENS.BOOKING_SEAT_REPOSITORY).toValue(new KyselyBookingSeatRepository(kyselyRead, kyselyWrite));
  };
}
