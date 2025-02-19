import { UserOOORepository } from "@/modules/ooo/repositories/ooo.repository";
import { UserOOOService } from "@/modules/ooo/services/ooo.service";
import { OrgUsersOOORepository } from "@/modules/organizations/controllers/users/ooo/repositories/organizations-users-ooo.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrgUsersOOOService {
  constructor(
    private readonly oooRepository: UserOOORepository,
    private readonly oooUserService: UserOOOService,
    private readonly usersRepository: UsersRepository,
    private readonly orgUsersOOORepository: OrgUsersOOORepository
  ) {}

  async getOrgUsersOOOPaginated(
    orgId: number,
    skip: number,
    take: number,
    sort?: { sortStart?: "asc" | "desc"; sortEnd?: "asc" | "desc" },
    filters?: { email?: string }
  ) {
    const ooos = await this.orgUsersOOORepository.getOrgUsersOOOPaginated(orgId, skip, take, sort, filters);
    return ooos.map((ooo) => this.oooUserService.formatOooReason(ooo));
  }
}
