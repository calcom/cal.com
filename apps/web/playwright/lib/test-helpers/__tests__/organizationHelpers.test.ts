import prismock from "../../../../../../tests/libs/__mocks__/prisma";

import { expect, describe, it, beforeEach, afterEach, vi } from "vitest";

import { createAttributes } from "../organizationHelpers";

// Mock console.log to avoid noise in tests
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {
  // Intentionally empty to suppress console output in tests
});

// Default mock attributes matching the original hardcoded values
const mockAttributes = [
  {
    name: "Department",
    type: "SINGLE_SELECT" as const,
    options: ["Engineering", "Sales", "Marketing", "Product", "Design"],
  },
  {
    name: "Location",
    type: "SINGLE_SELECT" as const,
    options: ["New York", "London", "Tokyo", "Berlin", "Remote"],
  },
  {
    name: "Skills",
    type: "MULTI_SELECT" as const,
    options: ["JavaScript", "React", "Node.js", "Python", "Design", "Sales"],
  },
  {
    name: "Years of Experience",
    type: "NUMBER" as const,
  },
  {
    name: "Bio",
    type: "TEXT" as const,
  },
];

// Default assignments matching the original hardcoded behavior
const mockAssignments = [
  {
    memberIndex: 0,
    attributeValues: {
      Location: ["New York"],
      Skills: ["JavaScript"],
    },
  },
  {
    memberIndex: 1,
    attributeValues: {
      Location: ["London"],
      Skills: ["React", "JavaScript"],
    },
  },
];

describe("createAttributes", () => {
  beforeEach(async () => {
    // Reset prismock state between tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prismock as any).reset();
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

    const result = await createAttributes({
      orgId,
      attributes: mockAttributes,
      assignments: mockAssignments,
    });

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
    expect(experienceAttr?.options).toHaveLength(0); // No options created for NUMBER type

    expect(bioAttr).toBeDefined();
    expect(bioAttr?.type).toBe("TEXT");
    expect(bioAttr?.options).toHaveLength(0); // No options created for TEXT type
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

    await createAttributes({
      orgId,
      attributes: mockAttributes,
      assignments: mockAssignments,
    });

    // Check that attribute assignments were created
    const attributeAssignments = await prismock.attributeToUser.findMany();
    const attributeOptions = await prismock.attributeOption.findMany({
      include: { assignedUsers: true },
    });

    // Should have assignments only for specific first two members
    // Member 1: Location (New York) + Skills (JavaScript) = 2 assignments
    // Member 2: Location (London) + Skills (React + JavaScript) = 3 assignments
    // Total = 5 assignments (no random assignments for other members/attributes)
    expect(attributeAssignments.length).toBe(5);

    // Should have 4 options with assigned users:
    // Location: New York (assigned to user 1) + London (assigned to user 2) = 2 options
    // Skills: JavaScript (assigned to user 1) + React & JavaScript (assigned to user 2) = 2 unique options
    const customOptions = attributeOptions.filter((opt) => opt.assignedUsers.length > 0);
    expect(customOptions.length).toBe(4);
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

    const result = await createAttributes({
      orgId,
      attributes: mockAttributes,
      assignments: mockAssignments,
    });

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

    const result = await createAttributes({
      orgId,
      attributes: mockAttributes,
      assignments: mockAssignments,
    });

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

  it("should assign specific skills and locations to first two members", async () => {
    const orgId = 1;

    // Create exactly two memberships to test specific assignments
    await prismock.membership.createMany({
      data: [
        { id: 1, userId: 1, teamId: orgId, role: "OWNER", accepted: true },
        { id: 2, userId: 2, teamId: orgId, role: "MEMBER", accepted: true },
      ],
    });

    await createAttributes({
      orgId,
      attributes: mockAttributes,
      assignments: mockAssignments,
    });

    // Get the attributes and their options
    const skillsAttr = await prismock.attribute.findFirst({
      where: { teamId: orgId, name: "Skills" },
      include: { options: true },
    });

    const locationAttr = await prismock.attribute.findFirst({
      where: { teamId: orgId, name: "Location" },
      include: { options: true },
    });

    expect(skillsAttr).toBeDefined();
    expect(locationAttr).toBeDefined();

    // Check assignments for first member (should have JavaScript skill and New York location)
    const firstMemberAssignments = await prismock.attributeToUser.findMany({
      where: { memberId: 1 },
      include: { attributeOption: true },
    });

    const firstMemberSkills = firstMemberAssignments
      .filter((a) => a.attributeOption.attributeId === skillsAttr!.id)
      .map((a) => a.attributeOption.value);

    const firstMemberLocation = firstMemberAssignments
      .filter((a) => a.attributeOption.attributeId === locationAttr!.id)
      .map((a) => a.attributeOption.value);

    expect(firstMemberSkills).toContain("JavaScript");
    expect(firstMemberLocation).toContain("New York");

    // Check assignments for second member (should have React and JavaScript skills, London location)
    const secondMemberAssignments = await prismock.attributeToUser.findMany({
      where: { memberId: 2 },
      include: { attributeOption: true },
    });

    const secondMemberSkills = secondMemberAssignments
      .filter((a) => a.attributeOption.attributeId === skillsAttr!.id)
      .map((a) => a.attributeOption.value);

    const secondMemberLocation = secondMemberAssignments
      .filter((a) => a.attributeOption.attributeId === locationAttr!.id)
      .map((a) => a.attributeOption.value);

    expect(secondMemberSkills).toContain("JavaScript");
    expect(secondMemberSkills).toContain("React");
    expect(secondMemberLocation).toContain("London");
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

    await createAttributes({
      orgId,
      attributes: mockAttributes,
      assignments: mockAssignments,
    });

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
