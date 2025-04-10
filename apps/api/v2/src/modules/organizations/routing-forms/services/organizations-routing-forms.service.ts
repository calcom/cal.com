import { OrganizationsRoutingFormsRepository } from "@/modules/organizations/routing-forms/organizations-routing-forms.repository";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsRoutingFormsService {
  constructor(private readonly organizationsRoutingFormsRepository: OrganizationsRoutingFormsRepository) {}

  async getOrganizationRoutingForms(
    orgId: number,
    skip: number,
    take: number,
    options?: {
      disabled?: boolean;
      name?: string;
      sortCreatedAt?: "asc" | "desc";
      sortUpdatedAt?: "asc" | "desc";
      afterCreatedAt?: Date;
      beforeCreatedAt?: Date;
      afterUpdatedAt?: Date;
      beforeUpdatedAt?: Date;
      teamIds?: number[];
    }
  ) {
    return this.organizationsRoutingFormsRepository.getOrganizationRoutingForms(orgId, skip, take, options);
  }
}
