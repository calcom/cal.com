import { PrismaReadService } from "@/modules/prisma/prismaReadService";
import { PrismaWriteService } from "@/modules/prisma/prismaWriteService";
import { Injectable } from "@nestjs/common";

@Injectable()
export class DeploymentsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async getDeployment() {
    return this.dbRead.prisma.deployment.findFirst({ where: { id: 1 } });
  }
}
