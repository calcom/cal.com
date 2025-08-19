import { container } from "tsyringe";

import { PrismaAttributeRepository } from "@calcom/lib/server/repository/PrismaAttributeRepository";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import { HostRepository } from "@calcom/lib/server/repository/host";
import { PrismaOOORepository } from "@calcom/lib/server/repository/ooo";
import { UserRepository } from "@calcom/lib/server/repository/user";
import prisma from "@calcom/prisma";

import { DI_TOKENS } from "../tokens";

export function registerLuckyUserModule() {
  container.register(DI_TOKENS.USER_REPOSITORY, {
    useFactory: () => new UserRepository(prisma),
  });

  container.register(DI_TOKENS.HOST_REPOSITORY, {
    useValue: HostRepository,
  });

  container.register(DI_TOKENS.ATTRIBUTE_REPOSITORY, {
    useValue: PrismaAttributeRepository,
  });

  container.register(DI_TOKENS.OOO_REPOSITORY, {
    useValue: PrismaOOORepository,
  });

  container.register(DI_TOKENS.BOOKING_REPOSITORY, {
    useFactory: () => new BookingRepository(prisma),
  });

  container.register(DI_TOKENS.PRISMA_CLIENT, {
    useValue: prisma,
  });
}
