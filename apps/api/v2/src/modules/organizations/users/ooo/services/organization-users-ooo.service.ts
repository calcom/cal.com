import { Injectable } from "@nestjs/common";
import { UserOOORepository } from "@/modules/ooo/repositories/ooo.repository";
import { UserOOOService } from "@/modules/ooo/services/ooo.service";
import { OrgUsersOOORepository } from "@/modules/organizations/users/ooo/organizations-users-ooo.repository";
import { UsersRepository } from "@/modules/users/users.repository";

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
