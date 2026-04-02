import { Injectable } from "@nestjs/common";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";

@Injectable()
export class OrganizationsService {
  constructor(private readonly organizationsRepository: OrganizationsRepository) {}

  async isPlatform(organizationId: number) {
    const organization = await this.organizationsRepository.findById({ id: organizationId });
    return organization?.isPlatform;
  }
}
