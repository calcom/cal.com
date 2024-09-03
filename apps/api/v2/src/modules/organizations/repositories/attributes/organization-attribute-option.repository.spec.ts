import { AssignOrganizationAttributeOptionToUserInput } from "@/modules/organizations/inputs/attributes/assign/organizations-attributes-options-assign.input";
import { CreateOrganizationAttributeOptionInput } from "@/modules/organizations/inputs/attributes/options/create-organization-attribute-option.input";
import { UpdateOrganizationAttributeOptionInput } from "@/modules/organizations/inputs/attributes/options/update-organizaiton-attribute-option.input.ts";
import { OrganizationAttributeOptionRepository } from "@/modules/organizations/repositories/attributes/organization-attribute-option.repository";
import { OrganizationAttributesService } from "@/modules/organizations/services/attributes/organization-attributes.service";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Test, TestingModule } from "@nestjs/testing";

describe("OrganizationAttributeOptionRepository", () => {
  let repository: OrganizationAttributeOptionRepository;
  let dbRead: PrismaReadService;
  let dbWrite: PrismaWriteService;
  let organizationsAttributesService: OrganizationAttributesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationAttributeOptionRepository,
        {
          provide: PrismaReadService,
          useValue: {
            prisma: {
              attributeOption: {
                create: jest.fn() as jest.Mock,
                delete: jest.fn() as jest.Mock,
                update: jest.fn() as jest.Mock,
                findMany: jest.fn() as jest.Mock,
              },
              membership: {
                findFirst: jest.fn() as jest.Mock,
              },
              attributeToUser: {
                create: jest.fn() as jest.Mock,
                delete: jest.fn() as jest.Mock,
              },
            },
          },
        },
        {
          provide: PrismaWriteService,
          useValue: {
            prisma: {
              attributeOption: {
                create: jest.fn() as jest.Mock,
                delete: jest.fn() as jest.Mock,
                update: jest.fn() as jest.Mock,
                findMany: jest.fn() as jest.Mock,
              },
              attributeToUser: {
                create: jest.fn() as jest.Mock,
                delete: jest.fn() as jest.Mock,
              },
            },
          },
        },
        {
          provide: OrganizationAttributesService,
          useValue: {
            getOrganizationAttribute: jest.fn() as jest.Mock,
          },
        },
      ],
    }).compile();

    repository = module.get<OrganizationAttributeOptionRepository>(OrganizationAttributeOptionRepository);
    dbRead = module.get<PrismaReadService>(PrismaReadService);
    dbWrite = module.get<PrismaWriteService>(PrismaWriteService);
    organizationsAttributesService = module.get<OrganizationAttributesService>(OrganizationAttributesService);
  });

  it("should create an organization attribute option", async () => {
    const input: CreateOrganizationAttributeOptionInput = { value: "Option1", slug: "option1" };
    const createdOption = { id: "1", ...input, attributeId: "attr1" };
    (dbWrite.prisma.attributeOption.create as jest.Mock).mockResolvedValue(createdOption);

    const result = await repository.createOrganizationAttributeOption(1, "attr1", input);

    expect(result).toEqual(createdOption);
    expect(dbWrite.prisma.attributeOption.create).toHaveBeenCalledWith({
      data: { ...input, attributeId: "attr1" },
    });
  });

  it("should delete an organization attribute option", async () => {
    const deletedOption = { id: "1", attributeId: "attr1" };
    (dbWrite.prisma.attributeOption.delete as jest.Mock).mockResolvedValue(deletedOption);

    const result = await repository.deleteOrganizationAttributeOption(1, "attr1", "1");

    expect(result).toEqual(deletedOption);
    expect(dbWrite.prisma.attributeOption.delete).toHaveBeenCalledWith({
      where: { id: "1", attributeId: "attr1" },
    });
  });

  it("should update an organization attribute option", async () => {
    const input: UpdateOrganizationAttributeOptionInput = { value: "Updated Option" };
    const updatedOption = { id: "1", ...input, attributeId: "attr1" };
    (dbWrite.prisma.attributeOption.update as jest.Mock).mockResolvedValue(updatedOption);

    const result = await repository.updateOrganizationAttributeOption(1, "attr1", "1", input);

    expect(result).toEqual(updatedOption);
    expect(dbWrite.prisma.attributeOption.update).toHaveBeenCalledWith({
      where: { id: "1", attributeId: "attr1" },
      data: input,
    });
  });

  it("should get organization attribute options", async () => {
    const options = [{ id: "1", value: "Option1", attributeId: "attr1" }];
    (dbRead.prisma.attributeOption.findMany as jest.Mock).mockResolvedValue(options);

    const result = await repository.getOrganizationAttributeOptions(1, "attr1");

    expect(result).toEqual(options);
    expect(dbRead.prisma.attributeOption.findMany).toHaveBeenCalledWith({
      where: { attributeId: "attr1" },
    });
  });

  it("should get organization attribute options for user", async () => {
    const options = [{ id: "1", value: "Option1", attributeId: "attr1" }];
    (dbRead.prisma.attributeOption.findMany as jest.Mock).mockResolvedValue(options);

    const result = await repository.getOrganizationAttributeOptionsForUser(1, 1);

    expect(result).toEqual(options);
    expect(dbRead.prisma.attributeOption.findMany).toHaveBeenCalledWith({
      where: {
        attribute: { teamId: 1 },
        assignedUsers: { some: { member: { userId: 1 } } },
      },
    });
  });

  it("should assign organization attribute option to user", async () => {
    const input: AssignOrganizationAttributeOptionToUserInput = {
      attributeId: "attr1",
      attributeOptionId: "opt1",
    };
    const attribute = { id: "attr1", type: "TEXT" };
    const membership = { id: "mem1" };
    const assignedOption = { attributeOptionId: "opt1", memberId: "mem1" };

    (organizationsAttributesService.getOrganizationAttribute as jest.Mock).mockResolvedValue(attribute);
    (dbRead.prisma.membership.findFirst as jest.Mock).mockResolvedValue(membership);
    (dbWrite.prisma.attributeToUser.create as jest.Mock).mockResolvedValue(assignedOption);

    const result = await repository.assignOrganizationAttributeOptionToUser({
      organizationId: 1,
      membershipId: 1,
      data: input,
    });

    expect(result).toEqual(assignedOption);
    expect(organizationsAttributesService.getOrganizationAttribute).toHaveBeenCalledWith(1, "attr1");
    expect(dbRead.prisma.membership.findFirst).toHaveBeenCalledWith({
      where: { teamId: 1, userId: 1, accepted: true },
    });
    expect(dbWrite.prisma.attributeToUser.create).toHaveBeenCalledWith({
      data: { attributeOptionId: "opt1", memberId: "mem1" },
    });
  });

  it("should unassign organization attribute option from user", async () => {
    const membership = { id: "mem1" };
    const unassignedOption = { attributeOptionId: "opt1", memberId: "mem1" };

    (dbRead.prisma.membership.findFirst as jest.Mock).mockResolvedValue(membership);
    (dbWrite.prisma.attributeToUser.delete as jest.Mock).mockResolvedValue(unassignedOption);

    const result = await repository.unassignOrganizationAttributeOptionFromUser(1, 1, "opt1");

    expect(result).toEqual(unassignedOption);
    expect(dbRead.prisma.membership.findFirst).toHaveBeenCalledWith({
      where: { teamId: 1, userId: 1, accepted: true },
    });
    expect(dbWrite.prisma.attributeToUser.delete).toHaveBeenCalledWith({
      where: { memberId_attributeOptionId: { memberId: "mem1", attributeOptionId: "opt1" } },
    });
  });
});
