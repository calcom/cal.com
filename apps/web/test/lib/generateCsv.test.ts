import type { Table } from "@tanstack/react-table";
import { describe, it, expect, vi } from "vitest";

import type { UserTableUser } from "@calcom/features/users/components/UserTable/types";
import {
  generateCsvRawForMembersTable,
  generateHeaderFromReactTable,
} from "@calcom/features/users/lib/UserListTableUtils";
import { MembershipRole } from "@calcom/prisma/enums";

function createMockTable(data: UserTableUser[]): Table<UserTableUser> {
  return {
    getHeaderGroups: vi.fn().mockReturnValue([
      {
        headers: [
          {
            id: "select",
            column: { columnDef: { header: "" } },
            getContext: () => ({}),
          },
          {
            id: "member",
            column: { columnDef: { header: "Members" } },
            getContext: () => ({}),
          },
          {
            id: "role",
            column: { columnDef: { header: "Role" } },
            getContext: () => ({}),
          },
          {
            id: "teams",
            column: { columnDef: { header: "Teams" } },
            getContext: () => ({}),
          },
          {
            id: "attr1",
            column: { columnDef: { header: () => "Attribute 1" } },
            getContext: () => ({}),
          },
          {
            id: "attr2",
            column: { columnDef: { header: () => "Attribute 2" } },
            getContext: () => ({}),
          },
          {
            id: "actions",
            column: { columnDef: { header: "" } },
            getContext: () => ({}),
          },
        ],
      },
    ]),
    getRowModel: vi.fn().mockReturnValue({ rows: data.map((item) => ({ original: item })) }),
  } as unknown as Table<UserTableUser>;
}

describe("generate Csv for Org Users Table", () => {
  const orgDomain = "https://acme.cal.com";
  const mockAttributeIds = ["attr1", "attr2"];
  const mockUser: UserTableUser = {
    id: 1,
    username: "testuser",
    email: "test@example.com",
    timeZone: "UTC",
    role: MembershipRole.MEMBER,
    avatarUrl: null,
    accepted: true,
    disableImpersonation: false,
    completedOnboarding: true,
    teams: [],
    attributes: [],
    lastActiveAt: new Date().toISOString(),
    createdAt: null,
    updatedAt: null,
    customRole: {
      type: "SYSTEM",
      id: "member_role",
      name: "Member",
      description: "Default member role",
      teamId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      color: null,
    },
  };

  it("should throw if no headers", () => {
    expect(() => generateCsvRawForMembersTable([], [], mockAttributeIds, orgDomain)).toThrow();
  });

  it("should generate correct CSV headers", () => {
    const mockTable = createMockTable([]);
    const csv = generateCsvRawForMembersTable(
      generateHeaderFromReactTable(mockTable) ?? [],
      [],
      mockAttributeIds,
      orgDomain
    );
    const headers = csv?.split("\n")[0];
    expect(headers).toBe("Members,Link,Role,Teams,Attribute 1,Attribute 2");
  });

  it("should handle user with single attribute value", () => {
    const mockData: UserTableUser[] = [
      {
        ...mockUser,
        teams: [{ id: 1, name: "Team1", slug: "team1" }],
        attributes: [
          {
            id: "1",
            attributeId: "attr1",
            value: "value1",
            slug: "slug1",
            contains: [],
            weight: 0,
            isGroup: false,
          },
        ],
      },
    ];

    const mockTable = createMockTable(mockData);
    const csv = generateCsvRawForMembersTable(
      generateHeaderFromReactTable(mockTable) ?? [],
      mockData,
      mockAttributeIds,
      orgDomain
    );

    expect(csv).toMatchInlineSnapshot(`
      "Members,Link,Role,Teams,Attribute 1,Attribute 2
      test@example.com,https://acme.cal.com/testuser,MEMBER,Team1,value1,"
    `);
  });

  it("should handle user with multiple attribute values for same attribute", () => {
    const mockData: UserTableUser[] = [
      {
        ...mockUser,
        teams: [{ id: 1, name: "Team1", slug: "team1" }],
        attributes: [
          {
            id: "1",
            attributeId: "attr1",
            value: "value1",
            slug: "slug1",
            contains: [],
            weight: 0,
            isGroup: false,
          },
          {
            id: "2",
            attributeId: "attr1",
            value: "value2",
            slug: "slug1",
            contains: [],
            weight: 0,
            isGroup: false,
          },
        ],
      },
    ];

    const mockTable = createMockTable(mockData);
    const csv = generateCsvRawForMembersTable(
      generateHeaderFromReactTable(mockTable) ?? [],
      mockData,
      mockAttributeIds,
      orgDomain
    );

    expect(csv).toMatchInlineSnapshot(`
      "Members,Link,Role,Teams,Attribute 1,Attribute 2
      test@example.com,https://acme.cal.com/testuser,MEMBER,Team1,"value1,value2","
    `);
  });

  it("should handle user with multiple teams", () => {
    const mockData: UserTableUser[] = [
      {
        ...mockUser,
        teams: [
          { id: 1, name: "Team1", slug: "team1" },
          { id: 2, name: "Team2", slug: "team2" },
        ],
        attributes: [],
      },
    ];

    const mockTable = createMockTable(mockData);
    const csv = generateCsvRawForMembersTable(
      generateHeaderFromReactTable(mockTable) ?? [],
      mockData,
      mockAttributeIds,
      orgDomain
    );

    expect(csv).toMatchInlineSnapshot(`
      "Members,Link,Role,Teams,Attribute 1,Attribute 2
      test@example.com,https://acme.cal.com/testuser,MEMBER,"Team1,Team2",,"
    `);
  });

  it("should handle values that need sanitization", () => {
    const mockData: UserTableUser[] = [
      {
        ...mockUser,
        teams: [{ id: 1, name: "Team,1", slug: "team1" }],
        attributes: [
          {
            id: "1",
            attributeId: "attr1",
            value: "value,1",
            slug: "slug1",
            contains: [],
            weight: 0,
            isGroup: false,
          },
        ],
      },
    ];

    const mockTable = createMockTable(mockData);
    const csv = generateCsvRawForMembersTable(
      generateHeaderFromReactTable(mockTable) ?? [],
      mockData,
      mockAttributeIds,
      orgDomain
    );

    expect(csv).toMatchInlineSnapshot(`
      "Members,Link,Role,Teams,Attribute 1,Attribute 2
      test@example.com,https://acme.cal.com/testuser,MEMBER,"Team,1","value,1","
    `);
  });

  it("should handle all membership roles", () => {
    const roles: MembershipRole[] = ["OWNER", "ADMIN", "MEMBER"];
    const mockData: UserTableUser[] = roles.map((role) => ({
      ...mockUser,
      username: role.toLowerCase(),
      role,
      email: `${role.toLowerCase()}@example.com`,
    }));

    const mockTable = createMockTable(mockData);
    const csv = generateCsvRawForMembersTable(
      generateHeaderFromReactTable(mockTable) ?? [],
      mockData,
      mockAttributeIds,
      orgDomain
    );

    expect(csv).toMatchInlineSnapshot(`
      "Members,Link,Role,Teams,Attribute 1,Attribute 2
      owner@example.com,https://acme.cal.com/owner,OWNER,,,
      admin@example.com,https://acme.cal.com/admin,ADMIN,,,
      member@example.com,https://acme.cal.com/member,MEMBER,,,"
    `);
  });

  it("should handle users without teams and attributes", () => {
    const mockData: UserTableUser[] = [
      {
        ...mockUser,
        username: "testuser",
        avatarUrl: null,
      },
    ];

    const mockTable = createMockTable(mockData);
    const csv = generateCsvRawForMembersTable(
      generateHeaderFromReactTable(mockTable) ?? [],
      mockData,
      mockAttributeIds,
      orgDomain
    );

    expect(csv).toMatchInlineSnapshot(`
      "Members,Link,Role,Teams,Attribute 1,Attribute 2
      test@example.com,https://acme.cal.com/testuser,MEMBER,,,"
    `);
  });
});
