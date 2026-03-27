import { describe, it, expect } from "vitest";

import type { TableDefinition } from "../types";
import { AdminTableRegistry } from "../AdminTableRegistry";

const teamDef: TableDefinition = {
  modelName: "Team",
  displayName: "Team",
  displayNamePlural: "Teams",
  description: "Teams",
  slug: "teams",
  category: "core",
  fields: [
    { column: "id", label: "ID", type: "number", access: "readonly", isPrimary: true },
    { column: "name", label: "Name", type: "string", access: "readonly" },
  ],
};

const userDef: TableDefinition = {
  modelName: "User",
  displayName: "User",
  displayNamePlural: "Users",
  description: "Users",
  slug: "users",
  category: "core",
  fields: [
    { column: "id", label: "ID", type: "number", access: "readonly", isPrimary: true },
    { column: "name", label: "Name", type: "string", access: "readonly" },
    { column: "teamId", label: "Team ID", type: "number", access: "readonly" },
    {
      column: "team",
      label: "Team",
      type: "string",
      access: "readonly",
      relation: {
        modelName: "Team",
        select: { id: true, name: true },
        displayField: "name",
        linkTo: { slug: "teams", paramField: "id" },
      },
    },
  ],
};

const bookingDef: TableDefinition = {
  modelName: "Booking",
  displayName: "Booking",
  displayNamePlural: "Bookings",
  description: "Bookings",
  slug: "bookings",
  category: "core",
  fields: [
    { column: "id", label: "ID", type: "number", access: "readonly", isPrimary: true },
    { column: "userId", label: "User ID", type: "number", access: "readonly" },
    {
      column: "user",
      label: "User",
      type: "string",
      access: "readonly",
      relation: {
        modelName: "User",
        select: { id: true, name: true },
        displayField: "name",
        linkTo: { slug: "users", paramField: "id" },
      },
    },
    {
      column: "team",
      label: "Team",
      type: "string",
      access: "readonly",
      relation: {
        modelName: "Team",
        select: { id: true, name: true },
        displayField: "name",
        linkTo: { slug: "teams", paramField: "id" },
        fkColumn: "teamId",
      },
    },
  ],
};

describe("AdminTableRegistry", () => {
  const reg = new AdminTableRegistry([teamDef, userDef, bookingDef]);

  it("counts tables", () => {
    expect(reg.count).toBe(3);
  });

  it("returns all tables", () => {
    expect(reg.getAll()).toHaveLength(3);
  });

  describe("lookups", () => {
    it("finds by slug", () => {
      expect(reg.getBySlug("users")?.modelName).toBe("User");
      expect(reg.getBySlug("teams")?.modelName).toBe("Team");
    });

    it("finds by model name", () => {
      expect(reg.getByModel("Booking")?.slug).toBe("bookings");
    });

    it("returns undefined for unknown slug", () => {
      expect(reg.getBySlug("nonexistent")).toBeUndefined();
    });

    it("returns undefined for unknown model", () => {
      expect(reg.getByModel("FakeModel")).toBeUndefined();
    });
  });

  describe("reverse relations", () => {
    it("computes reverse relations for teams", () => {
      const reverses = reg.getReverseRelations("teams");
      expect(reverses.length).toBe(2);

      const labels = reverses.map((r) => r.label);
      expect(labels).toContain("Users (as Team)");
      expect(labels).toContain("Bookings (as Team)");
    });

    it("computes reverse relations for users", () => {
      const reverses = reg.getReverseRelations("users");
      expect(reverses.length).toBe(1);
      expect(reverses[0].label).toBe("Bookings (as User)");
    });

    it("derives FK column from convention", () => {
      const reverses = reg.getReverseRelations("users");
      expect(reverses[0].sourceField.column).toBe("userId");
    });

    it("uses explicit fkColumn override", () => {
      const reverses = reg.getReverseRelations("teams");
      const bookingReverse = reverses.find((r) => r.sourceTable.slug === "bookings");
      expect(bookingReverse?.sourceField.column).toBe("teamId");
    });

    it("returns empty array for table with no inbound relations", () => {
      expect(reg.getReverseRelations("bookings")).toEqual([]);
    });

    it("excludes to-many relations from reverse map", () => {
      const regWithMany = new AdminTableRegistry([
        teamDef,
        {
          ...userDef,
          fields: [
            ...userDef.fields,
            {
              column: "bookings",
              label: "Bookings",
              type: "number",
              access: "readonly",
              relation: {
                modelName: "Booking",
                select: { id: true },
                displayField: "_count",
                many: true,
                take: 5,
                linkTo: { slug: "bookings", paramField: "id" },
              },
            },
          ],
        },
      ]);
      // to-many should NOT create a reverse on "bookings"
      const reverses = regWithMany.getReverseRelations("bookings");
      expect(reverses).toEqual([]);
    });

    it("caches reverse relations on second call", () => {
      const fresh = new AdminTableRegistry([teamDef, userDef]);
      const first = fresh.getReverseRelations("teams");
      const second = fresh.getReverseRelations("teams");
      expect(first).toBe(second); // same reference = cached
    });
  });
});
