import { Injectable } from "@nestjs/common";
import { OrganizationsRepository } from "src/modules/organizations/organizations.repository";

@Injectable()
export class OrganizationsService {
  constructor(private readonly organizationsRepository: OrganizationsRepository) {}

  async isPlatform(organizationId: number) {
    const organization = await this.organizationsRepository.findById(organizationId);
    return organization?.isPlatform;
  }
}
