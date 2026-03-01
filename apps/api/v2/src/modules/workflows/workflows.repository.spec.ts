jest.mock("@calcom/platform-libraries", () => ({
  TimeUnit: { HOUR: "HOUR", MINUTE: "MINUTE", DAY: "DAY" },
  WorkflowTriggerEvents: { BEFORE_EVENT: "BEFORE_EVENT", AFTER_EVENT: "AFTER_EVENT", NEW_EVENT: "NEW_EVENT" },
  CreationSource: { API_V2: "API_V2" },
}));

jest.mock("@calcom/platform-libraries/workflows", () => ({
  updateWorkflow: jest.fn(),
}));

import { Test, TestingModule } from "@nestjs/testing";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { WorkflowsRepository } from "@/modules/workflows/workflows.repository";

describe("WorkflowsRepository", () => {
  let repository: WorkflowsRepository;
  let mockPrismaRead: { prisma: { workflow: Record<string, jest.Mock> } };
  let mockPrismaWrite: { prisma: { workflow: Record<string, jest.Mock> } };

  beforeEach(async () => {
    mockPrismaRead = {
      prisma: {
        workflow: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
        },
      },
    };

    mockPrismaWrite = {
      prisma: {
        workflow: {
          delete: jest.fn(),
          create: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowsRepository,
        { provide: PrismaReadService, useValue: mockPrismaRead },
        { provide: PrismaWriteService, useValue: mockPrismaWrite },
      ],
    }).compile();

    repository = module.get<WorkflowsRepository>(WorkflowsRepository);
    jest.clearAllMocks();
  });

  describe("deleteTeamWorkflowById", () => {
    it("should delete workflow by id and teamId", async () => {
      mockPrismaWrite.prisma.workflow.delete.mockResolvedValue({ id: 1, teamId: 5 });

      await repository.deleteTeamWorkflowById(5, 1);

      expect(mockPrismaWrite.prisma.workflow.delete).toHaveBeenCalledWith({
        where: { id: 1, teamId: 5 },
      });
    });
  });

  describe("getEventTypeTeamWorkflowById", () => {
    it("should find event type workflow with steps and activeOn", async () => {
      const mockWorkflow = {
        id: 1,
        teamId: 5,
        steps: [{ id: 1 }],
        activeOn: [{ eventTypeId: 10 }],
        activeOnRoutingForms: [],
      };
      mockPrismaRead.prisma.workflow.findUnique.mockResolvedValue(mockWorkflow);

      const result = await repository.getEventTypeTeamWorkflowById(5, 1);

      expect(mockPrismaRead.prisma.workflow.findUnique).toHaveBeenCalledWith({
        where: { id: 1, teamId: 5, type: "EVENT_TYPE" },
        include: {
          steps: true,
          activeOn: { select: { eventTypeId: true } },
          activeOnRoutingForms: { select: { routingFormId: true } },
        },
      });
      expect(result).toEqual(mockWorkflow);
    });

    it("should return null when workflow not found", async () => {
      mockPrismaRead.prisma.workflow.findUnique.mockResolvedValue(null);

      const result = await repository.getEventTypeTeamWorkflowById(5, 999);
      expect(result).toBeNull();
    });
  });

  describe("getRoutingFormTeamWorkflowById", () => {
    it("should find routing form workflow", async () => {
      const mockWorkflow = { id: 2, teamId: 5, type: "ROUTING_FORM" };
      mockPrismaRead.prisma.workflow.findUnique.mockResolvedValue(mockWorkflow);

      const result = await repository.getRoutingFormTeamWorkflowById(5, 2);

      expect(mockPrismaRead.prisma.workflow.findUnique).toHaveBeenCalledWith({
        where: { id: 2, teamId: 5, type: "ROUTING_FORM" },
        include: expect.anything(),
      });
      expect(result).toEqual(mockWorkflow);
    });
  });

  describe("getEventTypeTeamWorkflows", () => {
    it("should return paginated event type workflows", async () => {
      const mockWorkflows = [{ id: 1 }, { id: 2 }];
      mockPrismaRead.prisma.workflow.findMany.mockResolvedValue(mockWorkflows);

      const result = await repository.getEventTypeTeamWorkflows(5, 0, 10);

      expect(mockPrismaRead.prisma.workflow.findMany).toHaveBeenCalledWith({
        where: { teamId: 5, type: "EVENT_TYPE" },
        include: expect.anything(),
        skip: 0,
        take: 10,
      });
      expect(result).toHaveLength(2);
    });
  });

  describe("getRoutingFormTeamWorkflows", () => {
    it("should return paginated routing form workflows", async () => {
      mockPrismaRead.prisma.workflow.findMany.mockResolvedValue([{ id: 3 }]);

      const result = await repository.getRoutingFormTeamWorkflows(5, 0, 10);

      expect(mockPrismaRead.prisma.workflow.findMany).toHaveBeenCalledWith({
        where: { teamId: 5, type: "ROUTING_FORM" },
        include: expect.anything(),
        skip: 0,
        take: 10,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("createTeamWorkflowHusk", () => {
    it("should create empty workflow with default values", async () => {
      const mockWorkflow = { id: 1, name: "", teamId: 5 };
      mockPrismaWrite.prisma.workflow.create.mockResolvedValue(mockWorkflow);

      const result = await repository.createTeamWorkflowHusk(5);

      expect(mockPrismaWrite.prisma.workflow.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "",
          teamId: 5,
          time: 24,
        }),
        include: { activeOn: true, steps: true, activeOnRoutingForms: true },
      });
      expect(result).toEqual(mockWorkflow);
    });
  });
});
