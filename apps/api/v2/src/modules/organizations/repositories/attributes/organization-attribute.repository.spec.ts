import { CreateOrganizationAttributeInput } from "@/modules/organizations/inputs/attributes/create-organization-attribute.input";
import { UpdateOrganizationAttributeInput } from "@/modules/organizations/inputs/attributes/update-organization-attribute.input";
import { OrganizationAttributesRepository } from "@/modules/organizations/repositories/attributes/organization-attribute.repository";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Test, TestingModule } from "@nestjs/testing";

describe("OrganizationAttributesRepository", () => {
  let repository: OrganizationAttributesRepository;
  let dbRead: PrismaReadService;
  let dbWrite: PrismaWriteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationAttributesRepository,
        {
          provide: PrismaReadService,
          useValue: {
            prisma: {
              attribute: {
                findUnique: jest.fn() as jest.Mock,
                findMany: jest.fn() as jest.Mock,
              },
            },
          },
        },
        {
          provide: PrismaWriteService,
          useValue: {
            prisma: {
              attribute: {
                create: jest.fn() as jest.Mock,
                update: jest.fn() as jest.Mock,
                delete: jest.fn() as jest.Mock,
              },
              attributeOption: {
                createMany: jest.fn() as jest.Mock,
              },
            },
          },
        },
      ],
    }).compile();

    repository = module.get<OrganizationAttributesRepository>(OrganizationAttributesRepository);
    dbRead = module.get<PrismaReadService>(PrismaReadService);
    dbWrite = module.get<PrismaWriteService>(PrismaWriteService);
  });

  it("should create an organization attribute", async () => {
    const input: CreateOrganizationAttributeInput = {
      name: "Test",
      slug: "test",
      type: "SINGLE_SELECT",
      options: [{ value: "Option1", slug: "option-1" }],
    };
    const createdAttribute = { id: "1", ...input, teamId: 1 };
    (dbWrite.prisma.attribute.create as jest.Mock).mockResolvedValue(createdAttribute);
    (dbWrite.prisma.attributeOption.createMany as jest.Mock).mockResolvedValue(null);

    const result = await repository.createOrganizationAttribute(1, input);

    expect(result).toEqual(createdAttribute);
    expect(dbWrite.prisma.attribute.create).toHaveBeenCalledWith({
      data: { name: "Test", type: "SINGLE_SELECT", teamId: 1 },
    });
    expect(dbWrite.prisma.attributeOption.createMany).toHaveBeenCalledWith({
      data: [{ name: "Option1", attributeId: "1" }],
    });
  });

  it("should get an organization attribute", async () => {
    const attribute = { id: "1", name: "Test", type: "SINGLE_SELECT", teamId: 1 };
    (dbRead.prisma.attribute.findUnique as jest.Mock).mockResolvedValue(attribute);

    const result = await repository.getOrganizationAttribute(1, "1");

    expect(result).toEqual(attribute);
    expect(dbRead.prisma.attribute.findUnique).toHaveBeenCalledWith({
      where: { id: "1", teamId: 1 },
    });
  });

  it("should get organization attributes", async () => {
    const attributes = [{ id: "1", name: "Test", type: "SINGLE_SELECT", teamId: 1 }];
    (dbRead.prisma.attribute.findMany as jest.Mock).mockResolvedValue(attributes);

    const result = await repository.getOrganizationAttributes(1);

    expect(result).toEqual(attributes);
    expect(dbRead.prisma.attribute.findMany).toHaveBeenCalledWith({
      where: { teamId: 1 },
      skip: undefined,
      take: undefined,
    });
  });

  it("should update an organization attribute", async () => {
    const input: UpdateOrganizationAttributeInput = { name: "Updated Test" };
    const updatedAttribute = { id: "1", ...input, teamId: 1 };
    (dbWrite.prisma.attribute.update as jest.Mock).mockResolvedValue(updatedAttribute);

    const result = await repository.updateOrganizationAttribute(1, "1", input);

    expect(result).toEqual(updatedAttribute);
    expect(dbWrite.prisma.attribute.update).toHaveBeenCalledWith({
      where: { id: "1", teamId: 1 },
      data: input,
    });
  });

  it("should delete an organization attribute", async () => {
    const deletedAttribute = { id: "1", name: "Test", type: "SINGLE_SELECT", teamId: 1 };
    (dbWrite.prisma.attribute.delete as jest.Mock).mockResolvedValue(deletedAttribute);

    const result = await repository.deleteOrganizationAttribute(1, "1");

    expect(result).toEqual(deletedAttribute);
    expect(dbWrite.prisma.attribute.delete).toHaveBeenCalledWith({
      where: { id: "1", teamId: 1 },
    });
  });
});
