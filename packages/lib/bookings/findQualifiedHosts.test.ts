import { vi, it, describe, expect, afterEach } from "vitest";

import { SchedulingType } from "@calcom/prisma/enums";

import { filterHostsByLeadThreshold } from "./filterHostsByLeadThreshold";
import { findQualifiedHosts } from "./findQualifiedHosts";

// Mock the filterHostsByLeadThreshold function
vi.mock("./filterHostsByLeadThreshold", () => ({
  filterHostsByLeadThreshold: vi.fn(),
}));

// Clear call history after each test
afterEach(() => {
  (filterHostsByLeadThreshold as vi.Mock).mockClear();
});

describe("findQualifiedHosts", async () => {
  it("should return qualified hosts based on mock of filterHostsByLeadThreshold", async () => {
    const hosts = [
      {
        isFixed: true,
        createdAt: new Date(),
        user: {
          id: 2,
          email: "hellouser2@email.com",
        },
      },
      {
        isFixed: false,
        createdAt: new Date(),
        user: {
          id: 1,
          email: "hellouser@email.com",
        },
      },
    ];

    // Configure the mock return value
    (filterHostsByLeadThreshold as vi.Mock).mockResolvedValue(hosts);

    // Define the input for the test
    const eventType = {
      id: 1,
      hosts,
      users: [],
      schedulingType: SchedulingType.ROUND_ROBIN,
      maxLeadThreshold: null,
    };

    // Call the function under test
    const result = await findQualifiedHosts(eventType);

    // Verify the result
    expect(result).toEqual(hosts);
  });

  it("should return hosts after valid input with users", async () => {
    const users = [
      {
        email: "hello@gmail.com",
        id: 1,
      },
      {
        email: "hello2@gmail.com",
        id: 2,
      },
    ];

    // Define the input for the test
    const eventType = {
      id: 1,
      hosts: [],
      users,
      schedulingType: null,
      maxLeadThreshold: null,
    };

    // Call the function under test
    const result = await findQualifiedHosts(eventType);

    // Verify the result
    expect(result).toEqual(
      users.map((user) => ({
        user: user,
        isFixed: true,
        email: user.email,
        createdAt: null,
      }))
    );

    expect(filterHostsByLeadThreshold).not.toHaveBeenCalled();
  });
});
