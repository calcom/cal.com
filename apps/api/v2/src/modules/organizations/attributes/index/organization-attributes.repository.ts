import { CreateOrganizationAttributeInput } from "@/modules/organizations/attributes/index/inputs/create-organization-attribute.input";
import { UpdateOrganizationAttributeInput } from "@/modules/organizations/attributes/index/inputs/update-organization-attribute.input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationAttributesRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) { }

  async createOrganizationAttribute(organizationId: number, data: Omit<CreateOrganizationAttributeInput, 'options'>) {
    const attribute = await this.dbWrite.prisma.attribute.create({
      data: {
        ...data,
        teamId: organizationId,
      },
    });

    return attribute;
  }

  async getOrganizationAttribute(organizationId: number, attributeId: string) {
    const attribute = await this.dbRead.prisma.attribute.findUnique({
      where: {
        id: attributeId,
        teamId: organizationId,
      },
    });
    return attribute;
  }

  async getOrganizationAttributes(organizationId: number, skip?: number, take?: number) {
    const attributes = await this.dbRead.prisma.attribute.findMany({
      where: {
        teamId: organizationId,
      },
      skip,
      take,
    });
    return attributes;
  }
  async updateOrganizationAttribute(
    organizationId: number,
    attributeId: string,
    data: UpdateOrganizationAttributeInput
  ) {
    const attribute = await this.dbWrite.prisma.attribute.update({
      where: {
        id: attributeId,
        teamId: organizationId,
      },
      data,
    });
    return attribute;
  }

  async deleteOrganizationAttribute(organizationId: number, attributeId: string) {
    const attribute = await this.dbWrite.prisma.attribute.delete({
      where: {
        id: attributeId,
        teamId: organizationId,
      },
    });
    return attribute;
  }
}
