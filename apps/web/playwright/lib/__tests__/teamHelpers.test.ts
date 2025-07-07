import prismock from "../../../../../tests/libs/__mocks__/prisma";

import { expect, describe, it, beforeEach } from "vitest";

import { createRoundRobinTeamEventType } from "../teamHelpers";

describe("createRoundRobinTeamEventType", () => {
  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await prismock.reset();
  });

  it("should create an event type with provided data", async () => {
    const teamId = 1;
    const eventTypeData = {
      title: "Test Event",
      slug: "test-event",
      length: 30,
      schedulingType: "ROUND_ROBIN" as const,
      description: "Test description",
    };

    const result = await createRoundRobinTeamEventType({
      teamId,
      eventType: eventTypeData,
    });

    expect(result).toBeDefined();
    expect(result.title).toBe("Test Event");
    expect(result.slug).toBe("test-event");
    expect(result.length).toBe(30);
    expect(result.teamId).toBe(teamId);

    // Verify event type was created in database
    const createdEventType = await prismock.eventType.findUnique({
      where: { id: result.id },
    });

    expect(createdEventType).toBeDefined();
    expect(createdEventType?.title).toBe("Test Event");
  });

  it("should add all team members as hosts", async () => {
    const teamId = 1;

    // Create team memberships
    await prismock.membership.createMany({
      data: [
        { id: 1, userId: 1, teamId, role: "OWNER", accepted: true },
        { id: 2, userId: 2, teamId, role: "MEMBER", accepted: true },
        { id: 3, userId: 3, teamId, role: "MEMBER", accepted: true },
      ],
    });

    const eventTypeData = {
      title: "Team Event",
      slug: "team-event",
      length: 60,
      schedulingType: "ROUND_ROBIN" as const,
    };

    const result = await createRoundRobinTeamEventType({
      teamId,
      eventType: eventTypeData,
    });

    // Check that all team members were added as hosts
    const hosts = await prismock.host.findMany({
      where: { eventTypeId: result.id },
    });

    expect(hosts).toHaveLength(3);

    const hostUserIds = hosts.map((host) => host.userId).sort();
    expect(hostUserIds).toEqual([1, 2, 3]);

    // All hosts should be non-fixed (ROUND_ROBIN)
    hosts.forEach((host) => {
      expect(host.isFixed).toBe(false);
    });
  });

  it("should handle team with no members", async () => {
    const teamId = 1;

    // Don't create any memberships

    const eventTypeData = {
      title: "Empty Team Event",
      slug: "empty-team-event",
      length: 45,
      schedulingType: "ROUND_ROBIN" as const,
    };

    const result = await createRoundRobinTeamEventType({
      teamId,
      eventType: eventTypeData,
    });

    expect(result).toBeDefined();

    // Should still create the event type
    const createdEventType = await prismock.eventType.findUnique({
      where: { id: result.id },
    });
    expect(createdEventType).toBeDefined();

    // But no hosts should be created
    const hosts = await prismock.host.findMany({
      where: { eventTypeId: result.id },
    });
    expect(hosts).toHaveLength(0);
  });

  it("should set isFixed to false for all hosts (ROUND_ROBIN behavior)", async () => {
    const teamId = 1;

    // Create team memberships
    await prismock.membership.createMany({
      data: [
        { id: 1, userId: 1, teamId, role: "OWNER", accepted: true },
        { id: 2, userId: 2, teamId, role: "MEMBER", accepted: true },
      ],
    });

    const eventTypeData = {
      title: "Round Robin Event",
      slug: "round-robin-event",
      length: 30,
      schedulingType: "ROUND_ROBIN" as const,
    };

    const result = await createRoundRobinTeamEventType({
      teamId,
      eventType: eventTypeData,
    });

    const hosts = await prismock.host.findMany({
      where: { eventTypeId: result.id },
    });

    // All hosts should have isFixed = false for round robin
    expect(hosts).toHaveLength(2);
    hosts.forEach((host) => {
      expect(host.isFixed).toBe(false);
    });
  });

  it("should preserve all provided event type properties", async () => {
    const teamId = 1;

    await prismock.membership.create({
      data: { id: 1, userId: 1, teamId, role: "OWNER", accepted: true },
    });

    const eventTypeData = {
      title: "Complex Event",
      slug: "complex-event",
      length: 90,
      schedulingType: "ROUND_ROBIN" as const,
      description: "A complex event with many properties",
      locations: [{ type: "integrations:zoom" }],
      price: 100,
      currency: "USD",
      requiresConfirmation: true,
      metadata: { customField: "customValue" },
    };

    const result = await createRoundRobinTeamEventType({
      teamId,
      eventType: eventTypeData,
    });

    expect(result.title).toBe("Complex Event");
    expect(result.slug).toBe("complex-event");
    expect(result.length).toBe(90);
    expect(result.description).toBe("A complex event with many properties");
    expect(result.price).toBe(100);
    expect(result.currency).toBe("USD");
    expect(result.requiresConfirmation).toBe(true);
    expect(result.teamId).toBe(teamId);

    // Verify in database
    const createdEventType = await prismock.eventType.findUnique({
      where: { id: result.id },
    });

    expect(createdEventType?.locations).toEqual([{ type: "integrations:zoom" }]);
    expect(createdEventType?.metadata).toEqual({ customField: "customValue" });
  });
});
