import { prisma } from "@calcom/prisma/__mocks__/prisma";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { formQueryHandler } from "./formQuery.handler";
import { deleteFormHandler } from "./deleteForm.handler";
import { formsHandler } from "./forms.handler";

vi.mock("@calcom/prisma", () => ({
  prisma,
  default: prisma,
}));

vi.mock("./permissions", () => ({
  checkPermissionOnExistingRoutingForm: vi.fn().mockResolvedValue(true),
}));

vi.mock("@calcom/app-store/routing-forms/lib/getSerializableForm", () => ({
  getSerializableForm: vi.fn().mockImplementation(({ form }) => Promise.resolve(form)),
}));

vi.mock("@calcom/app-store/routing-forms/lib/getConnectedForms", () => ({
  default: vi.fn().mockResolvedValue([]),
}));

vi.mock("@calcom/features/pbac/lib/entityPermissionUtils.server", async () => {
  const actual = await vi.importActual("@calcom/features/pbac/lib/entityPermissionUtils.server");
  return {
    ...actual,
    canEditEntity: vi.fn().mockResolvedValue(true),
  };
});

/**
 * These tests ensure that entityPrismaWhereClause properly scopes queries
 * and that changes to it (e.g., adding role-based filtering) don't break
 * existing functionality across different handlers.
 */
describe("entityPrismaWhereClause Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("formQuery.handler - Read Access", () => {
    it("should allow user to read their own personal form", async () => {
      const user = { id: 1 };
      const formId = "personal-form-123";
      const mockForm = {
        id: formId,
        userId: user.id,
        teamId: null,
        name: "My Personal Form",
        team: null,
        _count: { responses: 5 },
      };

      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue(mockForm);

      const result = await formQueryHandler({
        ctx: { prisma, user },
        input: { id: formId },
      });

      expect(result).toBeDefined();
      expect(prisma.app_RoutingForms_Form.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { userId: user.id },
                  expect.objectContaining({
                    team: expect.objectContaining({
                      members: expect.objectContaining({
                        some: expect.objectContaining({
                          userId: user.id,
                          accepted: true,
                        }),
                      }),
                    }),
                  }),
                ]),
              }),
            ]),
          }),
        })
      );
    });

    it("should allow team member to read team form", async () => {
      const teamMember = { id: 1 };
      const teamId = 100;
      const formId = "team-form-123";
      const mockForm = {
        id: formId,
        userId: null,
        teamId: teamId,
        name: "Team Form",
        team: { slug: "test-team", name: "Test Team" },
        _count: { responses: 10 },
      };

      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue(mockForm);

      const result = await formQueryHandler({
        ctx: { prisma, user: teamMember },
        input: { id: formId },
      });

      expect(result).toBeDefined();
      expect(prisma.app_RoutingForms_Form.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { userId: teamMember.id },
                  expect.objectContaining({
                    team: expect.objectContaining({
                      members: expect.objectContaining({
                        some: expect.objectContaining({
                          userId: teamMember.id,
                          accepted: true,
                        }),
                      }),
                    }),
                  }),
                ]),
              }),
            ]),
          }),
        })
      );
    });

    it("should return null when form is not found or user lacks access", async () => {
      const user = { id: 1 };
      const formId = "inaccessible-form";

      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue(null);

      const result = await formQueryHandler({
        ctx: { prisma, user },
        input: { id: formId },
      });

      expect(result).toBeNull();
    });

    it("should require accepted membership for team forms", async () => {
      const user = { id: 1 };
      const formId = "team-form-123";

      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue(null);

      await formQueryHandler({
        ctx: { prisma, user },
        input: { id: formId },
      });

      expect(prisma.app_RoutingForms_Form.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  expect.anything(),
                  expect.objectContaining({
                    team: expect.objectContaining({
                      members: expect.objectContaining({
                        some: expect.objectContaining({
                          accepted: true,
                        }),
                      }),
                    }),
                  }),
                ]),
              }),
            ]),
          }),
        })
      );
    });
  });

  describe("deleteForm.handler - Delete Access", () => {
    it("should scope delete to user's accessible forms", async () => {
      const user = { id: 1 };
      const formId = "form-to-delete";

      prisma.app_RoutingForms_Form.deleteMany.mockResolvedValue({ count: 1 });

      await deleteFormHandler({
        ctx: { prisma, user },
        input: { id: formId },
      });

      expect(prisma.app_RoutingForms_Form.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: formId,
            OR: expect.arrayContaining([
              { userId: user.id },
              expect.objectContaining({
                team: expect.objectContaining({
                  members: expect.objectContaining({
                    some: expect.objectContaining({
                      userId: user.id,
                      accepted: true,
                    }),
                  }),
                }),
              }),
            ]),
          }),
        })
      );
    });

    it("should not delete forms user doesn't have access to", async () => {
      const user = { id: 1 };
      const formId = "inaccessible-form";

      prisma.app_RoutingForms_Form.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        deleteFormHandler({
          ctx: { prisma, user },
          input: { id: formId },
        })
      ).rejects.toThrow("Form seems to be already deleted");
    });
  });

  describe("forms.handler - List Access", () => {
    it("should list user's personal forms and team forms they're a member of", async () => {
      const user = { id: 1 };
      const mockForms = [
        {
          id: "personal-1",
          userId: user.id,
          teamId: null,
          name: "Personal Form",
          team: null,
          _count: { responses: 5 },
          position: 1,
          createdAt: new Date(),
        },
        {
          id: "team-1",
          userId: null,
          teamId: 100,
          name: "Team Form",
          team: { id: 100, name: "Test Team" },
          _count: { responses: 10 },
          position: 2,
          createdAt: new Date(),
        },
      ];

      prisma.app_RoutingForms_Form.findMany.mockResolvedValue(mockForms);
      prisma.app_RoutingForms_Form.count.mockResolvedValue(2);

      const result = await formsHandler({
        ctx: { prisma, user },
        input: {},
      });

      expect(result.totalCount).toBe(2);
      expect(result.filtered).toHaveLength(2);
    });

    it("should use entityPrismaWhereClause for totalCount", async () => {
      const user = { id: 1 };

      prisma.app_RoutingForms_Form.findMany.mockResolvedValue([]);
      prisma.app_RoutingForms_Form.count.mockResolvedValue(0);

      await formsHandler({
        ctx: { prisma, user },
        input: {},
      });

      expect(prisma.app_RoutingForms_Form.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { userId: user.id },
              expect.objectContaining({
                team: expect.objectContaining({
                  members: expect.objectContaining({
                    some: expect.objectContaining({
                      userId: user.id,
                      accepted: true,
                    }),
                  }),
                }),
              }),
            ]),
          }),
        })
      );
    });

    it("should filter forms based on user and team filters", async () => {
      const user = { id: 1 };
      const filters = {
        userIds: [1],
        teamIds: [100],
      };

      prisma.app_RoutingForms_Form.findMany.mockResolvedValue([]);
      prisma.app_RoutingForms_Form.count.mockResolvedValue(0);

      await formsHandler({
        ctx: { prisma, user },
        input: { filters },
      });

      expect(prisma.app_RoutingForms_Form.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                userId: expect.objectContaining({
                  in: [1],
                }),
                teamId: null,
              }),
              expect.objectContaining({
                team: expect.objectContaining({
                  id: expect.objectContaining({
                    in: [100],
                  }),
                  members: expect.objectContaining({
                    some: expect.objectContaining({
                      userId: user.id,
                      accepted: true,
                    }),
                  }),
                }),
              }),
            ]),
          }),
        })
      );
    });

    it("should handle empty filters by showing all accessible forms", async () => {
      const user = { id: 1 };

      prisma.app_RoutingForms_Form.findMany.mockResolvedValue([]);
      prisma.app_RoutingForms_Form.count.mockResolvedValue(0);

      await formsHandler({
        ctx: { prisma, user },
        input: {},
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const whereClause = (prisma.app_RoutingForms_Form.findMany as any).mock.calls[0][0].where;
      expect(whereClause.OR).toBeDefined();
      expect(whereClause.OR[0].OR).toBeDefined();
      expect(whereClause.OR[0].OR[0]).toEqual({ userId: user.id });
      expect(whereClause.OR[0].OR[1].team.members.some.userId).toBe(user.id);
      expect(whereClause.OR[0].OR[1].team.members.some.accepted).toBe(true);
    });
  });

  describe("Membership State Edge Cases", () => {
    it("should require accepted: true for team membership", async () => {
      const user = { id: 1 };
      const formId = "team-form";

      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue(null);

      await formQueryHandler({
        ctx: { prisma, user },
        input: { id: formId },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const whereClause = (prisma.app_RoutingForms_Form.findFirst as any).mock.calls[0][0].where;
      const teamMemberClause = whereClause.AND[0].OR[1].team.members.some;

      expect(teamMemberClause.accepted).toBe(true);
    });

    it("should scope by userId OR team membership in all handlers", async () => {
      const user = { id: 1 };

      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue(null);
      prisma.app_RoutingForms_Form.deleteMany.mockResolvedValue({ count: 0 });
      prisma.app_RoutingForms_Form.findMany.mockResolvedValue([]);
      prisma.app_RoutingForms_Form.count.mockResolvedValue(0);

      await formQueryHandler({
        ctx: { prisma, user },
        input: { id: "test" },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let whereClause = (prisma.app_RoutingForms_Form.findFirst as any).mock.calls[0][0].where;
      expect(whereClause.AND[0].OR).toHaveLength(2);
      expect(whereClause.AND[0].OR[0]).toEqual({ userId: user.id });

      try {
        await deleteFormHandler({
          ctx: { prisma, user },
          input: { id: "test" },
        });
      } catch {
        void 0;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      whereClause = (prisma.app_RoutingForms_Form.deleteMany as any).mock.calls[0][0].where;
      expect(whereClause.OR).toHaveLength(2);
      expect(whereClause.OR[0]).toEqual({ userId: user.id });

      await formsHandler({
        ctx: { prisma, user },
        input: {},
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      whereClause = (prisma.app_RoutingForms_Form.count as any).mock.calls[0][0].where;
      expect(whereClause.OR).toHaveLength(2);
      expect(whereClause.OR[0]).toEqual({ userId: user.id });
    });
  });

  describe("Consistency Across Handlers", () => {
    it("should use consistent entityPrismaWhereClause structure across all handlers", async () => {
      const user = { id: 1 };

      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue(null);
      prisma.app_RoutingForms_Form.deleteMany.mockResolvedValue({ count: 0 });
      prisma.app_RoutingForms_Form.findMany.mockResolvedValue([]);
      prisma.app_RoutingForms_Form.count.mockResolvedValue(0);

      await formQueryHandler({
        ctx: { prisma, user },
        input: { id: "test" },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formQueryWhere = (prisma.app_RoutingForms_Form.findFirst as any).mock.calls[0][0].where.AND[0];

      try {
        await deleteFormHandler({
          ctx: { prisma, user },
          input: { id: "test" },
        });
      } catch {
        void 0;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deleteFormWhere = (prisma.app_RoutingForms_Form.deleteMany as any).mock.calls[0][0].where;

      await formsHandler({
        ctx: { prisma, user },
        input: {},
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formsWhere = (prisma.app_RoutingForms_Form.count as any).mock.calls[0][0].where;

      expect(formQueryWhere.OR).toBeDefined();
      expect(deleteFormWhere.OR).toBeDefined();
      expect(formsWhere.OR).toBeDefined();

      expect(formQueryWhere.OR[0]).toEqual({ userId: user.id });
      expect(deleteFormWhere.OR[0]).toEqual({ userId: user.id });
      expect(formsWhere.OR[0]).toEqual({ userId: user.id });

      expect(formQueryWhere.OR[1].team.members.some.accepted).toBe(true);
      expect(deleteFormWhere.OR[1].team.members.some.accepted).toBe(true);
      expect(formsWhere.OR[1].team.members.some.accepted).toBe(true);
    });
  });
});
