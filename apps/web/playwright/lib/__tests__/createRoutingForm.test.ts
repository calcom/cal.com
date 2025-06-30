import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { expect, describe, it, beforeEach, afterEach, vi } from "vitest";

import { createTestRoutingForm } from "../routingFormHelpers";

// Mock console.log to avoid noise in tests
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

describe("createTestRoutingForm", () => {
  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await prismock.reset();
    consoleSpy.mockClear();
  });

  afterEach(async () => {
    consoleSpy.mockRestore();
  });

  describe("Default routing form", () => {
    it("should create a basic routing form when seedRoutingForms is true", async () => {
      const userId = 1;
      const teamId = 1;

      await createTestRoutingForm({
        userId,
        teamId,
        scenario: { seedRoutingForms: true },
      });

      const createdForm = await prismock.app_RoutingForms_Form.findFirst({
        where: { teamId, userId },
      });

      expect(createdForm).toBeDefined();
      expect(createdForm?.name).toBe("Fixture Routing Form");
      expect(createdForm?.userId).toBe(userId);
      expect(createdForm?.teamId).toBe(teamId);
    });

    it("should create form with multiple route types", async () => {
      const userId = 1;
      const teamId = 1;

      await createTestRoutingForm({
        userId,
        teamId,
        scenario: { seedRoutingForms: true },
      });

      const createdForm = await prismock.app_RoutingForms_Form.findFirst({
        where: { teamId, userId },
      });

      expect(createdForm?.routes).toBeDefined();
      const routes = createdForm?.routes as any[];

      // Should have event redirect, custom page, external redirect, and multiselect routes
      expect(routes.length).toBeGreaterThan(4);

      const eventRedirectRoute = routes.find((r) => r.action?.type === "eventTypeRedirectUrl");
      const customPageRoute = routes.find((r) => r.action?.type === "customPageMessage");
      const externalRedirectRoute = routes.find((r) => r.action?.type === "externalRedirectUrl");
      const fallbackRoute = routes.find((r) => r.isFallback === true);

      expect(eventRedirectRoute).toBeDefined();
      expect(customPageRoute).toBeDefined();
      expect(externalRedirectRoute).toBeDefined();
      expect(fallbackRoute).toBeDefined();
    });

    it("should create form with various field types", async () => {
      const userId = 1;
      const teamId = 1;

      await createTestRoutingForm({
        userId,
        teamId,
        scenario: { seedRoutingForms: true },
      });

      const createdForm = await prismock.app_RoutingForms_Form.findFirst({
        where: { teamId, userId },
      });

      const fields = createdForm?.fields as any[];
      expect(fields).toBeDefined();
      expect(fields.length).toBeGreaterThan(3);

      const textField = fields.find((f) => f.type === "text");
      const multiselectField = fields.find((f) => f.type === "multiselect");
      const selectField = fields.find((f) => f.type === "select");

      expect(textField).toBeDefined();
      expect(multiselectField).toBeDefined();
      expect(selectField).toBeDefined();
    });
  });

  describe("Attribute routing form", () => {
    beforeEach(async () => {
      // Setup organization and team structure for attribute routing
      await prismock.membership.createMany({
        data: [
          { id: 1, userId: 1, teamId: 100, role: "OWNER", accepted: true }, // Org membership
          { id: 2, userId: 1, teamId: 1, role: "OWNER", accepted: true }, // Team membership
        ],
      });

      await prismock.team.createMany({
        data: [
          { id: 100, name: "Test Org", isOrganization: true, slug: "test-org" },
          { id: 1, name: "Test Team", isOrganization: false, slug: "test-team" },
        ],
      });
    });

    it("should create routing form with attribute routing", async () => {
      const userId = 1;
      const teamId = 1;

      const result = await createTestRoutingForm({
        userId,
        teamId,
        scenario: { seedRoutingFormWithAttributeRouting: true },
      });

      expect(result).toBeDefined();
      expect(result.name).toBe("Form with Attribute Routing");
      expect(result.userId).toBe(userId);
      expect(result.teamId).toBe(teamId);
    });

    it("should create team event types for attribute routing", async () => {
      const userId = 1;
      const teamId = 1;

      await createTestRoutingForm({
        userId,
        teamId,
        scenario: { seedRoutingFormWithAttributeRouting: true },
      });

      // Check that team event types were created
      const salesEvent = await prismock.eventType.findFirst({
        where: { slug: "team-sales", teamId },
      });

      const javascriptEvent = await prismock.eventType.findFirst({
        where: { slug: "team-javascript", teamId },
      });

      expect(salesEvent).toBeDefined();
      expect(salesEvent?.title).toBe("Team Sales");
      expect(salesEvent?.schedulingType).toBe("ROUND_ROBIN");

      expect(javascriptEvent).toBeDefined();
      expect(javascriptEvent?.title).toBe("Team Javascript");
      expect(javascriptEvent?.schedulingType).toBe("ROUND_ROBIN");
    });

    it("should create attributes for the organization", async () => {
      const userId = 1;
      const teamId = 1;

      await createTestRoutingForm({
        userId,
        teamId,
        scenario: { seedRoutingFormWithAttributeRouting: true },
      });

      // Check that attributes were created for the organization
      const attributes = await prismock.attribute.findMany({
        where: { teamId: 100 }, // Organization ID
        include: { options: true },
      });

      expect(attributes.length).toBeGreaterThan(0);

      const skillsAttribute = attributes.find((attr) => attr.name === "Skills");
      const locationAttribute = attributes.find((attr) => attr.name === "Location");

      expect(skillsAttribute).toBeDefined();
      expect(locationAttribute).toBeDefined();
    });

    it("should create routes with attribute-based routing logic", async () => {
      const userId = 1;
      const teamId = 1;

      const result = await createTestRoutingForm({
        userId,
        teamId,
        scenario: { seedRoutingFormWithAttributeRouting: true },
      });

      const routes = result.routes as any[];
      expect(routes).toBeDefined();
      expect(routes.length).toBeGreaterThanOrEqual(3);

      // Should have routes with attributesQueryValue
      const attributeRoutes = routes.filter((route) => route.attributesQueryValue);
      expect(attributeRoutes.length).toBeGreaterThanOrEqual(2);

      // Should have fallback route
      const fallbackRoute = routes.find((route) => route.isFallback === true);
      expect(fallbackRoute).toBeDefined();
    });

    it("should create form fields matching attributes", async () => {
      const userId = 1;
      const teamId = 1;

      const result = await createTestRoutingForm({
        userId,
        teamId,
        scenario: { seedRoutingFormWithAttributeRouting: true },
      });

      const fields = result.fields as any[];
      expect(fields).toBeDefined();
      expect(fields.length).toBe(5);

      const locationField = fields.find((f) => f.label === "Location");
      const skillsField = fields.find((f) => f.label === "skills");
      const emailField = fields.find((f) => f.label === "Email");
      const managerField = fields.find((f) => f.label === "Manager");
      const ratingField = fields.find((f) => f.label === "Rating");

      expect(locationField?.type).toBe("select");
      expect(skillsField?.type).toBe("multiselect");
      expect(emailField?.type).toBe("email");
      expect(managerField?.type).toBe("text");
      expect(ratingField?.type).toBe("number");

      // Check required fields
      expect(locationField?.required).toBe(true);
      expect(skillsField?.required).toBe(true);
      expect(emailField?.required).toBe(true);
      expect(managerField?.required).toBe(false);
      expect(ratingField?.required).toBe(false);
    });

    it("should handle missing organization membership", async () => {
      const userId = 2; // User without org membership
      const teamId = 1;

      // Only create team membership, not org membership
      await prismock.membership.create({
        data: { id: 3, userId: 2, teamId: 1, role: "MEMBER", accepted: true },
      });

      await expect(
        createTestRoutingForm({
          userId,
          teamId,
          scenario: { seedRoutingFormWithAttributeRouting: true },
        })
      ).rejects.toThrow("Organization membership not found");
    });

    it("should handle missing team", async () => {
      const userId = 1;
      const teamId = 999; // Non-existent team

      await expect(
        createTestRoutingForm({
          userId,
          teamId,
          scenario: { seedRoutingFormWithAttributeRouting: true },
        })
      ).rejects.toThrow();
    });
  });
});
