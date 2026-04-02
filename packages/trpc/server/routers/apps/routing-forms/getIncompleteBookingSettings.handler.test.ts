import { prisma } from "@calcom/prisma/__mocks__/prisma";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import getIncompleteBookingSettingsHandler from "./getIncompleteBookingSettings.handler";

vi.mock("@calcom/prisma", () => ({
  prisma,
}));

vi.mock("@calcom/app-store/routing-forms/lib/enabledIncompleteBookingApps", () => ({
  enabledIncompleteBookingApps: ["salesforce"],
}));

describe("getIncompleteBookingSettings.handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authorization - Personal Forms", () => {
    it("should throw NOT_FOUND when user tries to access another user's personal form", async () => {
      const _userA = { id: 1 };
      const userB = { id: 2 };
      const formId = "form-123";

      prisma.app_RoutingForms_IncompleteBookingActions.findMany.mockResolvedValue([]);
      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue(null);

      await expect(
        getIncompleteBookingSettingsHandler({
          ctx: { prisma, user: userB },
          input: { formId },
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        getIncompleteBookingSettingsHandler({
          ctx: { prisma, user: userB },
          input: { formId },
        })
      ).rejects.toThrow("Form not found");
    });

    it("should allow user to access their own personal form", async () => {
      const user = { id: 1 };
      const formId = "form-123";
      const mockCredential = {
        id: 1,
        type: "salesforce_other_calendar",
        userId: user.id,
        teamId: null,
        appId: "salesforce",
        invalid: false,
        delegationCredentialId: null,
      };

      prisma.app_RoutingForms_IncompleteBookingActions.findMany.mockResolvedValue([]);
      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue({
        id: formId,
        userId: user.id,
        teamId: null,
      });
      prisma.credential.findFirst.mockResolvedValue(mockCredential);

      const result = await getIncompleteBookingSettingsHandler({
        ctx: { prisma, user },
        input: { formId },
      });

      expect(result).toBeDefined();
      expect(result.credentials).toHaveLength(1);
      expect(result.credentials[0]).toMatchObject({
        id: 1,
        type: "salesforce_other_calendar",
        userId: user.id,
        teamId: null,
        appId: "salesforce",
      });
    });
  });

  describe("Authorization - Team Forms", () => {
    it("should throw NOT_FOUND when non-team-member tries to access team form", async () => {
      const _teamMember = { id: 1 };
      const nonMember = { id: 2 };
      const _teamId = 100;
      const formId = "team-form-123";

      prisma.app_RoutingForms_IncompleteBookingActions.findMany.mockResolvedValue([]);
      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue(null);

      await expect(
        getIncompleteBookingSettingsHandler({
          ctx: { prisma, user: nonMember },
          input: { formId },
        })
      ).rejects.toThrow(TRPCError);
    });

    it("should allow team member to access team form credentials", async () => {
      const teamMember = { id: 1 };
      const teamId = 100;
      const formId = "team-form-123";
      const mockCredentials = [
        {
          id: 1,
          type: "salesforce_other_calendar",
          userId: null,
          teamId: teamId,
          appId: "salesforce",
          invalid: false,
          delegationCredentialId: null,
          user: null,
          team: { name: "Test Team" },
        },
      ];

      prisma.app_RoutingForms_IncompleteBookingActions.findMany.mockResolvedValue([]);
      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue({
        id: formId,
        userId: teamMember.id,
        teamId: teamId,
      });
      prisma.team.findUnique.mockResolvedValue({
        id: teamId,
        parentId: null,
      });
      prisma.credential.findMany.mockResolvedValue(mockCredentials);

      const result = await getIncompleteBookingSettingsHandler({
        ctx: { prisma, user: teamMember },
        input: { formId },
      });

      expect(result).toBeDefined();
      expect(result.credentials).toHaveLength(1);
      expect(result.credentials[0]).toMatchObject({
        id: 1,
        type: "salesforce_other_calendar",
        teamId: teamId,
        appId: "salesforce",
      });
    });
  });

  describe("Credential Sanitization", () => {
    it("should never return the 'key' field in credentials for personal forms", async () => {
      const user = { id: 1 };
      const formId = "form-123";
      const mockCredentialWithKey = {
        id: 1,
        type: "salesforce_other_calendar",
        userId: user.id,
        teamId: null,
        appId: "salesforce",
        invalid: false,
        delegationCredentialId: null,
        key: {
          access_token: "secret_access_token",
          refresh_token: "secret_refresh_token",
          instance_url: "https://example.salesforce.com",
        },
      };

      prisma.app_RoutingForms_IncompleteBookingActions.findMany.mockResolvedValue([]);
      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue({
        id: formId,
        userId: user.id,
        teamId: null,
      });
      prisma.credential.findFirst.mockResolvedValue(mockCredentialWithKey);

      const result = await getIncompleteBookingSettingsHandler({
        ctx: { prisma, user },
        input: { formId },
      });

      expect(result.credentials).toHaveLength(1);
      expect(result.credentials[0]).not.toHaveProperty("key");
      expect(result.credentials[0].id).toBe(1);
    });

    it("should never return the 'key' field in credentials for team forms", async () => {
      const teamMember = { id: 1 };
      const teamId = 100;
      const formId = "team-form-123";
      const mockCredentialsWithKey = [
        {
          id: 1,
          type: "salesforce_other_calendar",
          userId: null,
          teamId: teamId,
          appId: "salesforce",
          invalid: false,
          delegationCredentialId: null,
          user: null,
          team: { name: "Test Team" },
          key: {
            access_token: "secret_team_access_token",
            refresh_token: "secret_team_refresh_token",
          },
        },
      ];

      prisma.app_RoutingForms_IncompleteBookingActions.findMany.mockResolvedValue([]);
      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue({
        id: formId,
        userId: teamMember.id,
        teamId: teamId,
      });
      prisma.team.findUnique.mockResolvedValue({
        id: teamId,
        parentId: null,
      });
      prisma.credential.findMany.mockResolvedValue(mockCredentialsWithKey);

      const result = await getIncompleteBookingSettingsHandler({
        ctx: { prisma, user: teamMember },
        input: { formId },
      });

      expect(result.credentials).toHaveLength(1);
      expect(result.credentials[0]).not.toHaveProperty("key");
      expect(result.credentials[0].id).toBe(1);
    });

    it("should use safeCredentialSelect fields for team credentials", async () => {
      const teamMember = { id: 1 };
      const teamId = 100;
      const formId = "team-form-123";

      prisma.app_RoutingForms_IncompleteBookingActions.findMany.mockResolvedValue([]);
      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue({
        id: formId,
        userId: teamMember.id,
        teamId: teamId,
      });
      prisma.team.findUnique.mockResolvedValue({
        id: teamId,
        parentId: null,
      });
      prisma.credential.findMany.mockResolvedValue([]);

      await getIncompleteBookingSettingsHandler({
        ctx: { prisma, user: teamMember },
        input: { formId },
      });

      expect(prisma.credential.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            type: true,
            userId: true,
            teamId: true,
            appId: true,
            invalid: true,
            delegationCredentialId: true,
          }),
        })
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callArgs = (prisma.credential.findMany as any).mock.calls[0][0];
      expect(callArgs.select).not.toHaveProperty("key");
    });
  });

  describe("Organization Hierarchy", () => {
    it("should include parent org credentials when team has a parent", async () => {
      const teamMember = { id: 1 };
      const teamId = 100;
      const parentOrgId = 200;
      const formId = "team-form-123";
      const mockCredentials = [
        {
          id: 1,
          type: "salesforce_other_calendar",
          userId: null,
          teamId: teamId,
          appId: "salesforce",
          invalid: false,
          delegationCredentialId: null,
          user: null,
          team: { name: "Test Team" },
        },
        {
          id: 2,
          type: "salesforce_other_calendar",
          userId: null,
          teamId: parentOrgId,
          appId: "salesforce",
          invalid: false,
          delegationCredentialId: null,
          user: null,
          team: { name: "Parent Org" },
        },
      ];

      prisma.app_RoutingForms_IncompleteBookingActions.findMany.mockResolvedValue([]);
      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue({
        id: formId,
        userId: teamMember.id,
        teamId: teamId,
      });
      prisma.team.findUnique.mockResolvedValue({
        id: teamId,
        parentId: parentOrgId,
      });
      prisma.credential.findMany.mockResolvedValue(mockCredentials);

      const result = await getIncompleteBookingSettingsHandler({
        ctx: { prisma, user: teamMember },
        input: { formId },
      });

      expect(prisma.credential.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            teamId: {
              in: [teamId, parentOrgId],
            },
          }),
        })
      );

      expect(result.credentials).toHaveLength(2);
      expect(result.credentials.map((c) => c.teamId)).toContain(teamId);
      expect(result.credentials.map((c) => c.teamId)).toContain(parentOrgId);
    });

    it("should only include team credentials when team has no parent", async () => {
      const teamMember = { id: 1 };
      const teamId = 100;
      const formId = "team-form-123";

      prisma.app_RoutingForms_IncompleteBookingActions.findMany.mockResolvedValue([]);
      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue({
        id: formId,
        userId: teamMember.id,
        teamId: teamId,
      });
      prisma.team.findUnique.mockResolvedValue({
        id: teamId,
        parentId: null,
      });
      prisma.credential.findMany.mockResolvedValue([]);

      await getIncompleteBookingSettingsHandler({
        ctx: { prisma, user: teamMember },
        input: { formId },
      });

      expect(prisma.credential.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            teamId: {
              in: [teamId],
            },
          }),
        })
      );
    });
  });

  describe("App Filtering", () => {
    it("should only return credentials for enabled incomplete booking apps", async () => {
      const user = { id: 1 };
      const formId = "form-123";

      prisma.app_RoutingForms_IncompleteBookingActions.findMany.mockResolvedValue([]);
      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue({
        id: formId,
        userId: user.id,
        teamId: null,
      });
      prisma.credential.findFirst.mockResolvedValue(null);

      await getIncompleteBookingSettingsHandler({
        ctx: { prisma, user },
        input: { formId },
      });

      expect(prisma.credential.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            appId: {
              in: ["salesforce"],
            },
          }),
        })
      );
    });

    it("should filter team credentials by enabled apps", async () => {
      const teamMember = { id: 1 };
      const teamId = 100;
      const formId = "team-form-123";

      prisma.app_RoutingForms_IncompleteBookingActions.findMany.mockResolvedValue([]);
      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue({
        id: formId,
        userId: teamMember.id,
        teamId: teamId,
      });
      prisma.team.findUnique.mockResolvedValue({
        id: teamId,
        parentId: null,
      });
      prisma.credential.findMany.mockResolvedValue([]);

      await getIncompleteBookingSettingsHandler({
        ctx: { prisma, user: teamMember },
        input: { formId },
      });

      expect(prisma.credential.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            appId: {
              in: ["salesforce"],
            },
          }),
        })
      );
    });
  });

  describe("Edge Cases", () => {
    it("should return empty credentials array when no credentials exist for personal form", async () => {
      const user = { id: 1 };
      const formId = "form-123";

      prisma.app_RoutingForms_IncompleteBookingActions.findMany.mockResolvedValue([]);
      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue({
        id: formId,
        userId: user.id,
        teamId: null,
      });
      prisma.credential.findFirst.mockResolvedValue(null);

      const result = await getIncompleteBookingSettingsHandler({
        ctx: { prisma, user },
        input: { formId },
      });

      expect(result.credentials).toEqual([]);
      expect(result.incompleteBookingActions).toBeDefined();
    });

    it("should return empty credentials array when no credentials exist for team form", async () => {
      const teamMember = { id: 1 };
      const teamId = 100;
      const formId = "team-form-123";

      prisma.app_RoutingForms_IncompleteBookingActions.findMany.mockResolvedValue([]);
      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue({
        id: formId,
        userId: teamMember.id,
        teamId: teamId,
      });
      prisma.team.findUnique.mockResolvedValue({
        id: teamId,
        parentId: null,
      });
      prisma.credential.findMany.mockResolvedValue([]);

      const result = await getIncompleteBookingSettingsHandler({
        ctx: { prisma, user: teamMember },
        input: { formId },
      });

      expect(result.credentials).toEqual([]);
      expect(result.incompleteBookingActions).toBeDefined();
    });

    it("should throw NOT_FOUND when form does not exist", async () => {
      const user = { id: 1 };
      const formId = "non-existent-form";

      prisma.app_RoutingForms_IncompleteBookingActions.findMany.mockResolvedValue([]);
      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue(null);

      await expect(
        getIncompleteBookingSettingsHandler({
          ctx: { prisma, user },
          input: { formId },
        })
      ).rejects.toThrow(TRPCError);

      await expect(
        getIncompleteBookingSettingsHandler({
          ctx: { prisma, user },
          input: { formId },
        })
      ).rejects.toThrow("Form not found");
    });

    it("should return incompleteBookingActions along with credentials", async () => {
      const user = { id: 1 };
      const formId = "form-123";
      const mockActions = [
        { id: 1, formId, action: "create_contact" },
        { id: 2, formId, action: "update_lead" },
      ];

      prisma.app_RoutingForms_IncompleteBookingActions.findMany.mockResolvedValue(mockActions);
      prisma.app_RoutingForms_Form.findFirst.mockResolvedValue({
        id: formId,
        userId: user.id,
        teamId: null,
      });
      prisma.credential.findFirst.mockResolvedValue(null);

      const result = await getIncompleteBookingSettingsHandler({
        ctx: { prisma, user },
        input: { formId },
      });

      expect(result.incompleteBookingActions).toEqual(mockActions);
      expect(result.incompleteBookingActions).toHaveLength(2);
    });
  });
});
