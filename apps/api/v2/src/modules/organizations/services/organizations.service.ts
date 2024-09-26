import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsService {
  constructor(private readonly organizationsRepository: OrganizationsRepository) {}

  async isPlatform(organizationId: number) {
    const organization = await this.organizationsRepository.findById(organizationId);
    return organization?.isPlatform;
  }
}
