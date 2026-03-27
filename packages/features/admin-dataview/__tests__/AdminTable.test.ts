import { describe, it, expect } from "vitest";

import type { TableDefinition } from "../types";
import { AdminTable } from "../AdminTable";

const mockTable: TableDefinition = {
  modelName: "User",
  displayName: "User",
  displayNamePlural: "Users",
  description: "All users",
  slug: "users",
  category: "core",
  defaultSort: "id",
  defaultSortDirection: "desc",
  pageSize: 25,
  fields: [
    { column: "id", label: "ID", type: "number", access: "readonly", isPrimary: true, showInList: true },
    { column: "name", label: "Name", type: "string", access: "readonly", searchable: true, showInList: true },
    { column: "email", label: "Email", type: "email", access: "readonly", searchable: true, showInList: true },
    { column: "role", label: "Role", type: "enum", access: "editable", enumValues: ["USER", "ADMIN"], showInList: true },
    { column: "locked", label: "Locked", type: "boolean", access: "editable", showInList: true },
    { column: "bio", label: "Bio", type: "string", access: "readonly", showInList: false },
    { column: "password", label: "Password", type: "string", access: "hidden" },
    {
      column: "organization",
      label: "Organization",
      type: "string",
      access: "readonly",
      showInList: true,
      relation: {
        modelName: "Team",
        select: { id: true, name: true },
        displayField: "name",
        linkTo: { slug: "teams", paramField: "id" },
      },
    },
    {
      column: "teams",
      label: "Teams",
      type: "number",
      access: "readonly",
      showInList: true,
      relation: {
        modelName: "Membership",
        select: { id: true, role: true },
        displayField: "_count",
        many: true,
        take: 10,
      },
    },
  ],
  actions: [
    {
      id: "lock",
      label: "Lock",
      variant: "destructive",
      mutation: "admin.lockUserAccount",
      buildInput: (row) => ({ userId: row.id, locked: true }),
      condition: (row) => !row.locked,
    },
  ],
};

describe("AdminTable", () => {
  const table = new AdminTable(mockTable);

  describe("basic accessors", () => {
    it("exposes slug, modelName, displayName", () => {
      expect(table.slug).toBe("users");
      expect(table.modelName).toBe("User");
      expect(table.displayName).toBe("User");
      expect(table.displayNamePlural).toBe("Users");
      expect(table.description).toBe("All users");
      expect(table.category).toBe("core");
    });

    it("returns pageSize from definition", () => {
      expect(table.pageSize).toBe(25);
    });

    it("defaults pageSize to 50 when not set", () => {
      const t = new AdminTable({ ...mockTable, pageSize: undefined });
      expect(t.pageSize).toBe(50);
    });

    it("returns defaultSort and direction", () => {
      expect(table.defaultSort).toBe("id");
      expect(table.defaultSortDirection).toBe("desc");
    });

    it("defaults sort to PK when not set", () => {
      const t = new AdminTable({ ...mockTable, defaultSort: undefined });
      expect(t.defaultSort).toBe("id");
    });

    it("returns prismaAccessor as lowercase first char", () => {
      expect(table.prismaAccessor).toBe("user");
      const t = new AdminTable({ ...mockTable, modelName: "EventType" });
      expect(t.prismaAccessor).toBe("eventType");
    });
  });

  describe("primary key", () => {
    it("finds the primary key column", () => {
      expect(table.primaryKeyColumn).toBe("id");
    });

    it("finds the primary key field definition", () => {
      expect(table.primaryKeyField?.column).toBe("id");
      expect(table.primaryKeyField?.type).toBe("number");
    });

    it("defaults to 'id' when no field marked primary", () => {
      const t = new AdminTable({
        ...mockTable,
        fields: [{ column: "name", label: "Name", type: "string", access: "readonly" }],
      });
      expect(t.primaryKeyColumn).toBe("id");
    });

    it("coerces numeric PK from string", () => {
      expect(table.coercePrimaryKey("42")).toBe(42);
      expect(table.coercePrimaryKey(42)).toBe(42);
    });

    it("coerces string PK when type is not number", () => {
      const t = new AdminTable({
        ...mockTable,
        fields: [{ column: "slug", label: "Slug", type: "string", isPrimary: true, access: "readonly" }],
      });
      expect(t.coercePrimaryKey(123)).toBe("123");
      expect(t.coercePrimaryKey("my-slug")).toBe("my-slug");
    });
  });

  describe("field queries", () => {
    it("returns searchable fields", () => {
      expect(table.searchableFields).toEqual(["name", "email"]);
    });

    it("returns list fields (visible + showInList)", () => {
      const names = table.listFields.map((f) => f.column);
      expect(names).toContain("id");
      expect(names).toContain("name");
      expect(names).toContain("role");
      expect(names).not.toContain("bio"); // showInList: false
      expect(names).not.toContain("password"); // hidden
    });

    it("returns visible fields (everything except hidden)", () => {
      const names = table.visibleFields.map((f) => f.column);
      expect(names).toContain("bio");
      expect(names).not.toContain("password");
    });

    it("returns relation fields", () => {
      const names = table.relationFields.map((f) => f.column);
      expect(names).toEqual(["organization", "teams"]);
    });

    it("returns editable field names", () => {
      expect(table.editableFieldNames).toEqual(["role", "locked"]);
    });

    it("detects relation columns", () => {
      expect(table.isRelationColumn("organization")).toBe(true);
      expect(table.isRelationColumn("teams")).toBe(true);
      expect(table.isRelationColumn("name")).toBe(false);
      expect(table.isRelationColumn("nonexistent")).toBe(false);
    });
  });

  describe("resolveSortField", () => {
    it("returns requested field when it's a scalar", () => {
      expect(table.resolveSortField("name")).toBe("name");
      expect(table.resolveSortField("email")).toBe("email");
    });

    it("falls back to PK when requested field is a relation", () => {
      expect(table.resolveSortField("organization")).toBe("id");
      expect(table.resolveSortField("teams")).toBe("id");
    });

    it("uses defaultSort when no field requested", () => {
      expect(table.resolveSortField()).toBe("id");
    });
  });

  describe("buildPrismaSelect", () => {
    it("includes scalar fields as true", () => {
      const select = table.buildPrismaSelect();
      expect(select.id).toBe(true);
      expect(select.name).toBe(true);
      expect(select.email).toBe(true);
    });

    it("excludes hidden fields", () => {
      const select = table.buildPrismaSelect();
      expect(select.password).toBeUndefined();
    });

    it("includes to-one relations with nested select", () => {
      const select = table.buildPrismaSelect();
      expect(select.organization).toEqual({ select: { id: true, name: true } });
    });

    it("includes _count for to-many count relations", () => {
      const select = table.buildPrismaSelect();
      expect(select._count).toEqual({ select: { teams: true } });
    });

    it("includes rows for to-many when take > 0", () => {
      const select = table.buildPrismaSelect();
      expect(select.teams).toEqual({ select: { id: true, role: true }, take: 10 });
    });
  });

  describe("buildWhere", () => {
    it("returns empty object when no search or filters", () => {
      expect(table.buildWhere()).toEqual({});
      expect(table.buildWhere("")).toEqual({});
      expect(table.buildWhere(undefined, {})).toEqual({});
    });

    it("builds OR search across searchable string fields", () => {
      const where = table.buildWhere("john");
      expect(where).toHaveProperty("OR");
      const or = (where as { OR: unknown[] }).OR;
      expect(or).toHaveLength(2);
      expect(or[0]).toEqual({ name: { contains: "john", mode: "insensitive" } });
      expect(or[1]).toEqual({ email: { contains: "john", mode: "insensitive" } });
    });

    it("builds numeric search when input is a number", () => {
      const t = new AdminTable({
        ...mockTable,
        fields: [
          { column: "id", label: "ID", type: "number", access: "readonly", isPrimary: true, searchable: true },
        ],
      });
      const where = t.buildWhere("42");
      const or = (where as { OR: unknown[] }).OR;
      expect(or[0]).toEqual({ id: 42 });
    });

    it("passes through scalar filter values", () => {
      const where = table.buildWhere(undefined, { role: "ADMIN" });
      expect(where).toEqual({ role: "ADMIN" });
    });

    it("passes through structural keys (OR, AND, NOT)", () => {
      const where = table.buildWhere(undefined, { OR: [{ name: "a" }] });
      expect(where).toEqual({ OR: [{ name: "a" }] });
    });

    it("blocks filters on hidden columns", () => {
      const where = table.buildWhere(undefined, { password: "secret" });
      expect(where).toEqual({});
    });

    it("combines search and filters with AND", () => {
      const where = table.buildWhere("john", { role: "ADMIN" });
      expect(where).toHaveProperty("AND");
    });

    it("ignores null/undefined/empty filter values", () => {
      const where = table.buildWhere(undefined, { name: null, email: undefined, role: "" });
      expect(where).toEqual({});
    });
  });

  describe("postProcessRow", () => {
    it("wraps to-one relation with display metadata", () => {
      const row = { id: 1, name: "Test", organization: { id: 5, name: "Acme" } };
      const result = table.postProcessRow(row);
      expect(result.organization).toEqual({
        _relation: true,
        _many: false,
        _data: { id: 5, name: "Acme" },
        _display: "Acme",
        _linkSlug: "teams",
        _linkParam: 5,
      });
    });

    it("wraps to-many _count relation with items", () => {
      const row = {
        id: 1,
        name: "Test",
        teams: [{ id: 10, role: "MEMBER" }],
        _count: { teams: 3 },
      };
      const result = table.postProcessRow(row);
      expect(result.teams).toEqual({
        _relation: true,
        _many: true,
        _count: 3,
        _items: [{ id: 10, role: "MEMBER" }],
        _display: "3 records",
        _linkSlug: undefined,
      });
    });

    it("handles null to-one relation", () => {
      const row = { id: 1, name: "Test", organization: null };
      const result = table.postProcessRow(row);
      expect(result.organization).toBeNull();
    });

    it("removes _count from result", () => {
      const row = { id: 1, _count: { teams: 5 }, teams: [] };
      const result = table.postProcessRow(row);
      expect(result._count).toBeUndefined();
    });

    it("uses singular for count of 1", () => {
      const row = { id: 1, teams: [], _count: { teams: 1 } };
      const result = table.postProcessRow(row);
      expect((result.teams as { _display: string })._display).toBe("1 record");
    });
  });
});
