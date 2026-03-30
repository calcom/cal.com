import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PrismaAuditEventRepository } from "./PrismaAuditEventRepository";

describe("PrismaAuditEventRepository", () => {
  let repository: PrismaAuditEventRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaAuditEventRepository({ prismaClient: prismaMock });
  });

  describe("findByOrgId", () => {
    it("applies pagination with skip/take and returns totalRowCount", async () => {
      prismaMock.auditEvent.findMany.mockResolvedValue([]);
      prismaMock.auditEvent.count.mockResolvedValue(42);

      const result = await repository.findByOrgId(1, 10, 20);

      expect(prismaMock.auditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orgId: 1 }, skip: 20, take: 10 })
      );
      expect(result).toEqual({ rows: [], meta: { totalRowCount: 42 } });
    });

    it("orders by createdAt descending", async () => {
      prismaMock.auditEvent.findMany.mockResolvedValue([]);
      prismaMock.auditEvent.count.mockResolvedValue(0);

      await repository.findByOrgId(1, 10, 0);

      expect(prismaMock.auditEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: "desc" } })
      );
    });

    it("excludes PII from actor select", async () => {
      prismaMock.auditEvent.findMany.mockResolvedValue([]);
      prismaMock.auditEvent.count.mockResolvedValue(0);

      await repository.findByOrgId(1, 10, 0);

      const call = prismaMock.auditEvent.findMany.mock.calls[0][0];
      const actorSelect = call.select?.actor?.select;

      expect(actorSelect).toBeDefined();
      expect(actorSelect).not.toHaveProperty("email");
      expect(actorSelect).not.toHaveProperty("phone");
      expect(actorSelect).toHaveProperty("id");
      expect(actorSelect).toHaveProperty("type");
      expect(actorSelect).toHaveProperty("userUuid");
    });
  });
});
