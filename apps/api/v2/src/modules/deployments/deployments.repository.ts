import { Injectable } from "@nestjs/common";

import { PrismaReadService } from "../prisma/prisma-read.service";
import { PrismaWriteService } from "../prisma/prisma-write.service";

@Injectable()
export class DeploymentsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async getDeployment() {
    return this.dbRead.prisma.deployment.findFirst({ where: { id: 1 } });
  }
}
