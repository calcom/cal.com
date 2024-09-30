import { Injectable } from "@nestjs/common";

@Injectable()
export class DeploymentsRepository {
  // TODO: PrismaReadService
  async getDeployment() {
    // return this.dbRead.prisma.deployment.findFirst({ where: { id: 1 } });
  }
}
