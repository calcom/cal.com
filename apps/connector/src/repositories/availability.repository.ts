import type { PaginationQuery } from "@/types";
import { NotFoundError } from "@/utils/error";

import { UserRepository as OldUserRepository } from "@calcom/lib/server/repository/user";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma, User, UserPermissionRole } from "@calcom/prisma/client";

import { BaseRepository } from "./base.repository";

export class AvailabilityRepository extends BaseRepository<User> {
  private oldUserRepo: OldUserRepository;
  constructor(prisma: PrismaClient) {
    super(prisma);
    this.oldUserRepo = new OldUserRepository(prisma);
  }
}
