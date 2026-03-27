import { describe, it, expect, vi, beforeEach } from "vitest";

import type { PrismaClient } from "@prisma/client";

import type { TableDefinition } from "../types";
import { AdminTableRegistry } from "../AdminTableRegistry";
import { AdminDataViewService } from "../server/service";



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
    { column: "email", label: "Email", type: "email", access: "readonly", searchable: true, showInList: true },
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

      expect(delegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });

    it("respects custom sort", async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);

      await service.list({ slug: "users", page: 1, sortField: "email", sortDirection: "asc" });

      expect(delegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { email: "asc" } })
      );
    });

    it("falls back to PK sort for relation columns", async () => {
      delegate.findMany.mockResolvedValue([]);
      delegate.count.mockResolvedValue(0);

      await service.list({ slug: "users", page: 1, sortField: "team" });

      expect(delegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { id: "desc" } })
      );
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

      expect(delegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 })
      );
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

      expect(delegate.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 42 } })
      );
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
      await expect(service.getById({ slug: "fake", id: 1 })).rejects.toThrow(
        "Unknown table slug: fake"
      );
    });
  });
});
