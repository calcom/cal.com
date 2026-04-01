import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminTableRegistry } from "../AdminTableRegistry";
import { AdminDataViewService } from "../server/service";
import type { TableDefinition } from "../types";

const userDef: TableDefinition = {
  modelName: "User",
  displayName: "User",
  displayNamePlural: "Users",
  description: "Users",
  slug: "users",
  category: "core",
  defaultSort: "id",
  defaultSortDirection: "desc",
  pageSize: 10,
  fields: [
    { column: "id", label: "ID", type: "number", access: "readonly", isPrimary: true, showInList: true },
    { column: "name", label: "Name", type: "string", access: "readonly", searchable: true, showInList: true },
    {
      column: "email",
      label: "Email",
      type: "email",
      access: "readonly",
      searchable: true,
      showInList: true,
    },
    { column: "locked", label: "Locked", type: "boolean", access: "readonly", showInList: true },
    { column: "password", label: "Password", type: "string", access: "hidden" },
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

function createMockDelegate() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    findUnique: vi.fn().mockResolvedValue(null),
  };
}

function createService(delegate: ReturnType<typeof createMockDelegate>) {
  const mockPrisma = { user: delegate } as unknown as PrismaClient;
  const reg = new AdminTableRegistry([userDef]);
  return new AdminDataViewService({ prisma: mockPrisma, registry: reg });
}

describe("AdminDataViewService", () => {
  let delegate: ReturnType<typeof createMockDelegate>;
  let service: AdminDataViewService;

  beforeEach(() => {
    delegate = createMockDelegate();
    service = createService(delegate);
  });

  describe("list", () => {
    it("calls findMany with correct select, skip, take, orderBy", async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);

      await service.list({ slug: "users", page: 2 });

      expect(delegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
          orderBy: { id: "desc" },
        })
      );
    });

    it("excludes hidden fields from select", async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);

      await service.list({ slug: "users", page: 1 });

      const call = delegate.findMany.mock.calls[0][0];
      expect(call.select.id).toBe(true);
      expect(call.select.name).toBe(true);
      expect(call.select.password).toBeUndefined();
    });

    it("includes relation selects", async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);

      await service.list({ slug: "users", page: 1 });

      const call = delegate.findMany.mock.calls[0][0];
      expect(call.select.team).toEqual({ select: { id: true, name: true } });
    });

    it("respects custom pageSize", async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);

      await service.list({ slug: "users", page: 1, pageSize: 5 });

      expect(delegate.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
    });

    it("respects custom sort", async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);

      await service.list({ slug: "users", page: 1, sortField: "email", sortDirection: "asc" });

      expect(delegate.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { email: "asc" } }));
    });

    it("falls back to PK sort for relation columns", async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);

      await service.list({ slug: "users", page: 1, sortField: "team" });

      expect(delegate.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { id: "desc" } }));
    });

    it("builds search where clause", async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);

      await service.list({ slug: "users", page: 1, search: "john" });

      const call = delegate.findMany.mock.calls[0][0];
      expect(call.where).toHaveProperty("OR");
      expect(call.where.OR).toHaveLength(2);
    });

    it("passes through filters", async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);

      await service.list({ slug: "users", page: 1, filters: { locked: true } });

      const call = delegate.findMany.mock.calls[0][0];
      expect(call.where).toEqual({ locked: true });
    });

    it("blocks hidden column filters", async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);

      await service.list({ slug: "users", page: 1, filters: { password: "secret" } });

      const call = delegate.findMany.mock.calls[0][0];
      expect(call.where).toEqual({});
    });

    it("allows FK column filters derived from relations (reverse relation scenario)", async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);

      await service.list({ slug: "users", page: 1, filters: { teamId: 42 } });

      const call = delegate.findMany.mock.calls[0][0];
      expect(call.where).toEqual({ teamId: 42 });
    });

    it("returns paginated result with totalPages", async () => {
      delegate.findMany.mockResolvedValue([{ id: 1, name: "Test", email: "t@t.com", locked: false }]);
      delegate.count.mockResolvedValue(25);

      const result = await service.list({ slug: "users", page: 1 });

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
      expect(result.rows).toHaveLength(1);
    });

    it("post-processes relation fields in rows", async () => {
      delegate.findMany.mockResolvedValue([
        { id: 1, name: "Test", email: "t@t.com", locked: false, team: { id: 5, name: "Acme" } },
      ]);
      delegate.count.mockResolvedValue(1);

      const result = await service.list({ slug: "users", page: 1 });

      expect(result.rows[0].team).toEqual({
        _relation: true,
        _many: false,
        _data: { id: 5, name: "Acme" },
        _display: "Acme",
        _linkSlug: "teams",
        _linkParam: 5,
      });
    });

    it("clamps page to minimum 1", async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);

      await service.list({ slug: "users", page: -5 });

      expect(delegate.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0 }));
    });

    it("throws for unknown slug", async () => {
      await expect(service.list({ slug: "nonexistent", page: 1 })).rejects.toThrow(
        "Unknown table slug: nonexistent"
      );
    });
  });

  describe("getById", () => {
    it("calls findUnique with correct where and select", async () => {
      delegate.findUnique.mockResolvedValue({ id: 42, name: "Test", email: "t@t.com", locked: false });

      await service.getById({ slug: "users", id: 42 });

      expect(delegate.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 42 },
        })
      );
      const call = delegate.findUnique.mock.calls[0][0];
      expect(call.select.password).toBeUndefined();
    });

    it("coerces string id to number for numeric PK", async () => {
      delegate.findUnique.mockResolvedValue({ id: 42, name: "Test", email: "t@t.com", locked: false });

      await service.getById({ slug: "users", id: "42" });

      expect(delegate.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 42 } }));
    });

    it("returns null when record not found", async () => {
      delegate.findUnique.mockResolvedValue(null);

      const result = await service.getById({ slug: "users", id: 999 });

      expect(result).toBeNull();
    });

    it("post-processes relations in returned row", async () => {
      delegate.findUnique.mockResolvedValue({
        id: 1,
        name: "Test",
        email: "t@t.com",
        locked: false,
        team: { id: 3, name: "Engineering" },
      });

      const result = await service.getById({ slug: "users", id: 1 });

      expect(result?.team).toEqual(
        expect.objectContaining({
          _relation: true,
          _display: "Engineering",
          _linkParam: 3,
        })
      );
    });

    it("throws for unknown slug", async () => {
      await expect(service.getById({ slug: "fake", id: 1 })).rejects.toThrow("Unknown table slug: fake");
    });
  });

  describe("globalSearch", () => {
    it("returns empty results for whitespace-only query", async () => {
      const result = await service.globalSearch("   ");
      expect(result).toEqual({ results: [] });
      expect(delegate.findMany).not.toHaveBeenCalled();
    });

    it("returns empty results for empty string", async () => {
      const result = await service.globalSearch("");
      expect(result).toEqual({ results: [] });
    });

    it("searches text fields with case-insensitive contains", async () => {
      delegate.findMany.mockResolvedValue([{ id: 1, name: "John", email: "john@test.com", locked: false }]);
      delegate.count.mockResolvedValue(1);

      await service.globalSearch("john");

      const call = delegate.findMany.mock.calls[0][0];
      expect(call.where).toHaveProperty("OR");
      const orConditions = call.where.OR;
      expect(orConditions).toEqual(
        expect.arrayContaining([
          { name: { contains: "john", mode: "insensitive" } },
          { email: { contains: "john", mode: "insensitive" } },
        ])
      );
    });

    it("includes PK lookup for numeric queries", async () => {
      delegate.findMany.mockResolvedValue([{ id: 42, name: "Test", email: "t@t.com", locked: false }]);
      delegate.count.mockResolvedValue(1);

      await service.globalSearch("42");

      const call = delegate.findMany.mock.calls[0][0];
      expect(call.where.OR).toEqual(
        expect.arrayContaining([{ id: 42 }])
      );
    });

    it("limits results to MAX_PER_TABLE (5)", async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);

      await service.globalSearch("test");

      const call = delegate.findMany.mock.calls[0][0];
      expect(call.take).toBe(5);
    });

    it("returns table metadata with results", async () => {
      delegate.findMany.mockResolvedValue([{ id: 1, name: "John", email: "john@test.com", locked: false }]);
      delegate.count.mockResolvedValue(1);

      const result = await service.globalSearch("john");

      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual(
        expect.objectContaining({
          slug: "users",
          displayName: "User",
          displayNamePlural: "Users",
          category: "core",
          total: 1,
        })
      );
      expect(result.results[0].rows).toHaveLength(1);
    });

    it("excludes tables with zero results", async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);

      const result = await service.globalSearch("nonexistent");

      expect(result.results).toHaveLength(0);
    });

    it("post-processes relation fields in search results", async () => {
      delegate.findMany.mockResolvedValue([
        { id: 1, name: "Test", email: "t@t.com", locked: false, team: { id: 5, name: "Acme" } },
      ]);
      delegate.count.mockResolvedValue(1);

      const result = await service.globalSearch("test");

      expect(result.results[0].rows[0].team).toEqual(
        expect.objectContaining({
          _relation: true,
          _display: "Acme",
        })
      );
    });

    it("sorts results by total count descending", async () => {
      const teamDef: TableDefinition = {
        modelName: "Team",
        displayName: "Team",
        displayNamePlural: "Teams",
        description: "Teams",
        slug: "teams",
        category: "core",
        fields: [
          { column: "id", label: "ID", type: "number", access: "readonly", isPrimary: true },
          { column: "name", label: "Name", type: "string", access: "readonly", searchable: true },
        ],
      };

      const userDelegate = createMockDelegate();
      const teamDelegate = createMockDelegate();

      userDelegate.findMany.mockResolvedValue([{ id: 1, name: "Test", email: "t@t.com", locked: false }]);
      userDelegate.count.mockResolvedValue(2);
      teamDelegate.findMany.mockResolvedValue([{ id: 1, name: "Test Team" }]);
      teamDelegate.count.mockResolvedValue(10);

      const mockPrisma = { user: userDelegate, team: teamDelegate } as unknown as PrismaClient;
      const reg = new AdminTableRegistry([userDef, teamDef]);
      const multiService = new AdminDataViewService({ prisma: mockPrisma, registry: reg });

      const result = await multiService.globalSearch("test");

      expect(result.results).toHaveLength(2);
      expect(result.results[0].slug).toBe("teams");
      expect(result.results[0].total).toBe(10);
      expect(result.results[1].slug).toBe("users");
      expect(result.results[1].total).toBe(2);
    });

    it("skips tables with no searchable fields and no numeric PK match", async () => {
      const noSearchDef: TableDefinition = {
        modelName: "Setting",
        displayName: "Setting",
        displayNamePlural: "Settings",
        description: "Settings",
        slug: "settings",
        category: "system",
        fields: [
          { column: "key", label: "Key", type: "string", access: "readonly", isPrimary: true },
          { column: "value", label: "Value", type: "string", access: "readonly" },
        ],
      };

      const settingDelegate = createMockDelegate();
      // String PK lookup should still be attempted
      settingDelegate.findMany.mockResolvedValue([]);
      settingDelegate.count.mockResolvedValue(0);

      const mockPrisma = { user: delegate, setting: settingDelegate } as unknown as PrismaClient;
      const reg = new AdminTableRegistry([userDef, noSearchDef]);
      const svc = new AdminDataViewService({ prisma: mockPrisma, registry: reg });

      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);

      const result = await svc.globalSearch("abc");

      expect(result.results).toHaveLength(0);
    });

    it("handles string PK tables with contains search on PK column", async () => {
      const appDef: TableDefinition = {
        modelName: "App",
        displayName: "App",
        displayNamePlural: "Apps",
        description: "Apps",
        slug: "apps",
        category: "platform",
        fields: [
          { column: "slug", label: "Slug", type: "string", access: "readonly", isPrimary: true },
          { column: "name", label: "Name", type: "string", access: "readonly", searchable: true },
        ],
      };

      const appDelegate = createMockDelegate();
      appDelegate.findMany.mockResolvedValue([{ slug: "zoom", name: "Zoom" }]);
      appDelegate.count.mockResolvedValue(1);

      const mockPrisma = { user: delegate, app: appDelegate } as unknown as PrismaClient;
      const reg = new AdminTableRegistry([userDef, appDef]);
      const svc = new AdminDataViewService({ prisma: mockPrisma, registry: reg });

      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);

      const result = await svc.globalSearch("zoom");

      const appCall = appDelegate.findMany.mock.calls[0][0];
      expect(appCall.where.OR).toEqual(
        expect.arrayContaining([
          { slug: { contains: "zoom", mode: "insensitive" } },
        ])
      );
      expect(result.results).toHaveLength(1);
      expect(result.results[0].slug).toBe("apps");
    });

    it("gracefully handles delegate errors per table", async () => {
      const teamDef: TableDefinition = {
        modelName: "Team",
        displayName: "Team",
        displayNamePlural: "Teams",
        description: "Teams",
        slug: "teams",
        category: "core",
        fields: [
          { column: "id", label: "ID", type: "number", access: "readonly", isPrimary: true },
          { column: "name", label: "Name", type: "string", access: "readonly", searchable: true },
        ],
      };

      const teamDelegate = createMockDelegate();
      teamDelegate.findMany.mockRejectedValue(new Error("DB connection failed"));
      teamDelegate.count.mockRejectedValue(new Error("DB connection failed"));

      delegate.findMany.mockResolvedValue([{ id: 1, name: "John", email: "j@t.com", locked: false }]);
      delegate.count.mockResolvedValue(1);

      const mockPrisma = { user: delegate, team: teamDelegate } as unknown as PrismaClient;
      const reg = new AdminTableRegistry([userDef, teamDef]);
      const svc = new AdminDataViewService({ prisma: mockPrisma, registry: reg });

      const result = await svc.globalSearch("john");

      // Should still return user results despite team table failing
      expect(result.results).toHaveLength(1);
      expect(result.results[0].slug).toBe("users");
    });

    it("orders results by PK descending within each table", async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);

      await service.globalSearch("test");

      const call = delegate.findMany.mock.calls[0][0];
      expect(call.orderBy).toEqual({ id: "desc" });
    });

    it("trims the query before searching", async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);

      await service.globalSearch("  john  ");

      const call = delegate.findMany.mock.calls[0][0];
      const orConditions = call.where.OR;
      expect(orConditions).toEqual(
        expect.arrayContaining([
          { name: { contains: "john", mode: "insensitive" } },
        ])
      );
    });
  });
});
