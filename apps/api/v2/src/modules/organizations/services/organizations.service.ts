import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger("OrganizationsService");

  constructor(private readonly organizationsRepository: OrganizationsRepository) {}

  async isPlatform(organizationId: number) {
    const organization = await this.organizationsRepository.findById(organizationId);
    return organization?.isPlatform;
  }

  async createOrganization(data: any) {
    const organization = await this.organizationsRepository.create(data);
    this.logEvent('create', organization.id);
    return organization;
  }

  async updateOrganization(id: number, data: any) {
    const organization = await this.organizationsRepository.update(id, data);
    this.logEvent('update', id);
    return organization;
  }

  async deleteOrganization(id: number) {
    const result = await this.organizationsRepository.delete(id);
    this.logEvent('delete', id);
    return result;
  }

  private logEvent(action: string, organizationId: number) {
    this.logger.log(`Performed ${action} action on organization ${organizationId}`);
  }
}
