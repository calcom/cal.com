import prismock from "prismock";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ITransactionalRepository, TransactionClient } from "../types";

vi.mock("@calcom/prisma", () => ({
  prisma: prismock,
}));

import { PrismaUnitOfWork } from "../PrismaUnitOfWork";

class MockRepository implements ITransactionalRepository {
  constructor(private client: TransactionClient | typeof prismock = prismock) {}

  withTransaction(tx: TransactionClient): this {
    return new MockRepository(tx) as this;
  }

  async create(data: { name: string }) {
    return this.client.user.create({
      data: {
        email: `${data.name}@example.com`,
        name: data.name,
      },
    });
  }

  async findByEmail(email: string) {
    return this.client.user.findFirst({
      where: { email },
    });
  }
}

describe("PrismaUnitOfWork", () => {
  beforeEach(async () => {
    await prismock.user.deleteMany();
  });

  it("should execute operations within a transaction", async () => {
    const mockRepository = new MockRepository();
    const unitOfWork = new PrismaUnitOfWork({
      mockRepository: (tx) => mockRepository.withTransaction(tx),
    });

    const result = await unitOfWork.transaction(async ({ mockRepository }) => {
      const user = await mockRepository.create({ name: "Test User" });
      return user;
    });

    expect(result).toBeDefined();
    expect(result.name).toBe("Test User");
    expect(result.email).toBe("Test User@example.com");
  });

  it("should provide transactional repository instances to the callback", async () => {
    const mockRepository = new MockRepository();
    const unitOfWork = new PrismaUnitOfWork({
      mockRepository: (tx) => mockRepository.withTransaction(tx),
    });

    await unitOfWork.transaction(async ({ mockRepository }) => {
      expect(mockRepository).toBeDefined();
      expect(mockRepository.withTransaction).toBeDefined();
      expect(typeof mockRepository.create).toBe("function");
    });
  });

  it("should support multiple repositories in a single transaction", async () => {
    const repo1 = new MockRepository();
    const repo2 = new MockRepository();

    const unitOfWork = new PrismaUnitOfWork({
      repo1: (tx) => repo1.withTransaction(tx),
      repo2: (tx) => repo2.withTransaction(tx),
    });

    await unitOfWork.transaction(async ({ repo1, repo2 }) => {
      expect(repo1).toBeDefined();
      expect(repo2).toBeDefined();

      const user1 = await repo1.create({ name: "User 1" });
      const user2 = await repo2.create({ name: "User 2" });

      expect(user1.name).toBe("User 1");
      expect(user2.name).toBe("User 2");
    });
  });

  it("should return the result from the transaction callback", async () => {
    const mockRepository = new MockRepository();
    const unitOfWork = new PrismaUnitOfWork({
      mockRepository: (tx) => mockRepository.withTransaction(tx),
    });

    const result = await unitOfWork.transaction(async ({ mockRepository }) => {
      const user = await mockRepository.create({ name: "Return Test" });
      return { user, extra: "data" };
    });

    expect(result.user.name).toBe("Return Test");
    expect(result.extra).toBe("data");
  });
});
