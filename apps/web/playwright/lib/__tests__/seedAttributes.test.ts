import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { expect, describe, it, beforeEach, afterEach, vi } from "vitest";

import { seedOrganizationAttributes } from "../organizationHelpers";

// Mock console.log to avoid noise in tests
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

describe("seedOrganizationAttributes", () => {
  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await prismock.reset();
    consoleSpy.mockClear();
  });

  afterEach(async () => {
    consoleSpy.mockRestore();
  });

  it("should create all 5 mock attributes for an organization", async () => {
    const orgId = 1;

    // Create a membership for the organization
    await prismock.membership.create({
      data: {
        id: 1,
        userId: 1,
        teamId: orgId,
        role: "OWNER",
        accepted: true,
      },
    });

    const result = await seedOrganizationAttributes(orgId);

    // Verify all attributes were created
    const attributes = await prismock.attribute.findMany({
      where: { teamId: orgId },
      include: { options: true },
    });

    expect(attributes).toHaveLength(5);
    expect(result).toHaveLength(5);

    // Check specific attributes
    const departmentAttr = attributes.find((attr) => attr.name === "Department");
    const locationAttr = attributes.find((attr) => attr.name === "Location");
    const skillsAttr = attributes.find((attr) => attr.name === "Skills");
    const experienceAttr = attributes.find((attr) => attr.name === "Years of Experience");
    const bioAttr = attributes.find((attr) => attr.name === "Bio");

    expect(departmentAttr).toBeDefined();
    expect(departmentAttr?.type).toBe("SINGLE_SELECT");
    expect(departmentAttr?.options).toHaveLength(5);

    expect(locationAttr).toBeDefined();
    expect(locationAttr?.type).toBe("SINGLE_SELECT");
    expect(locationAttr?.options).toHaveLength(5);

    expect(skillsAttr).toBeDefined();
    expect(skillsAttr?.type).toBe("MULTI_SELECT");
    expect(skillsAttr?.options).toHaveLength(6);

    expect(experienceAttr).toBeDefined();
    expect(experienceAttr?.type).toBe("NUMBER");
    expect(experienceAttr?.options).toHaveLength(1); // Custom option created for the member

    expect(bioAttr).toBeDefined();
    expect(bioAttr?.type).toBe("TEXT");
    expect(bioAttr?.options).toHaveLength(1); // Custom option created for the member
  });

  it("should assign attribute values to all organization members", async () => {
    const orgId = 1;

    // Create multiple memberships
    await prismock.membership.createMany({
      data: [
        { id: 1, userId: 1, teamId: orgId, role: "OWNER", accepted: true },
        { id: 2, userId: 2, teamId: orgId, role: "MEMBER", accepted: true },
        { id: 3, userId: 3, teamId: orgId, role: "MEMBER", accepted: true },
      ],
    });

    await seedOrganizationAttributes(orgId);

    // Check that attribute assignments were created
    const attributeAssignments = await prismock.attributeToUser.findMany();
    const attributeOptions = await prismock.attributeOption.findMany({
      include: { assignedUsers: true },
    });

    // Should have assignments for single/multi select attributes (3 members x 2 select attributes minimum)
    expect(attributeAssignments.length).toBeGreaterThanOrEqual(6);

    // Should have custom options created for TEXT and NUMBER types (3 members x 2 types)
    const customOptions = attributeOptions.filter((opt) => opt.assignedUsers.length > 0);
    expect(customOptions.length).toBeGreaterThanOrEqual(6);
  });

  it("should skip seeding if attributes already exist", async () => {
    const orgId = 1;

    // Create a membership
    await prismock.membership.create({
      data: {
        id: 1,
        userId: 1,
        teamId: orgId,
        role: "OWNER",
        accepted: true,
      },
    });

    // Pre-create one of the attributes
    await prismock.attribute.create({
      data: {
        id: "attr-1",
        name: "Department",
        slug: "department",
        type: "SINGLE_SELECT",
        teamId: orgId,
        enabled: true,
      },
    });

    const result = await seedOrganizationAttributes(orgId);

    // Should return early and not create more attributes
    expect(result).toBeUndefined();

    const attributes = await prismock.attribute.findMany({
      where: { teamId: orgId },
    });

    // Should still only have the 1 pre-existing attribute
    expect(attributes).toHaveLength(1);
  });

  it("should handle organization with no members gracefully", async () => {
    const orgId = 1;

    // Don't create any memberships

    const result = await seedOrganizationAttributes(orgId);

    // Should still create attributes
    const attributes = await prismock.attribute.findMany({
      where: { teamId: orgId },
    });

    expect(attributes).toHaveLength(5);
    expect(result).toHaveLength(5);

    // But no attribute assignments should be created
    const attributeAssignments = await prismock.attributeToUser.findMany();
    expect(attributeAssignments).toHaveLength(0);
  });

  it("should generate correct slugs and enable all attributes", async () => {
    const orgId = 123;

    // Create a membership
    await prismock.membership.create({
      data: {
        id: 1,
        userId: 1,
        teamId: orgId,
        role: "OWNER",
        accepted: true,
      },
    });

    await seedOrganizationAttributes(orgId);

    const attributes = await prismock.attribute.findMany({
      where: { teamId: orgId },
    });

    attributes.forEach((attr) => {
      // All should be enabled
      expect(attr.enabled).toBe(true);

      // Should have correct slug format
      expect(attr.slug).toMatch(/^org:123-/);

      // Specific slug checks
      if (attr.name === "Years of Experience") {
        expect(attr.slug).toBe("org:123-years-of-experience");
      }
    });
  });
});
