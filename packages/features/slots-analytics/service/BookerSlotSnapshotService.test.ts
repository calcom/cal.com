import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IBookerSlotSnapshotRepository } from "../repository/IBookerSlotSnapshotRepository";
import { BookerSlotSnapshotService } from "./BookerSlotSnapshotService";

describe("BookerSlotSnapshotService", () => {
  let mockRepo: IBookerSlotSnapshotRepository;
  let service: BookerSlotSnapshotService;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn().mockResolvedValue({ id: 1 }),
    };
    service = new BookerSlotSnapshotService({ bookerSlotSnapshotRepo: mockRepo });
  });

  it("calls repository.create with correct data", async () => {
    await service.recordSnapshot({ eventTypeId: 123, firstSlotLeadTime: 60 });

    expect(mockRepo.create).toHaveBeenCalledWith({
      eventTypeId: 123,
      firstSlotLeadTime: 60,
    });
  });

  it("skips recording when firstSlotLeadTime is negative", async () => {
    await service.recordSnapshot({ eventTypeId: 123, firstSlotLeadTime: -5 });

    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it("passes through zero firstSlotLeadTime unchanged", async () => {
    await service.recordSnapshot({ eventTypeId: 456, firstSlotLeadTime: 0 });

    expect(mockRepo.create).toHaveBeenCalledWith({
      eventTypeId: 456,
      firstSlotLeadTime: 0,
    });
  });

  it("passes through positive firstSlotLeadTime unchanged", async () => {
    await service.recordSnapshot({ eventTypeId: 789, firstSlotLeadTime: 1440 });

    expect(mockRepo.create).toHaveBeenCalledWith({
      eventTypeId: 789,
      firstSlotLeadTime: 1440,
    });
  });

  it("calls repository exactly once per recordSnapshot call", async () => {
    await service.recordSnapshot({ eventTypeId: 123, firstSlotLeadTime: 30 });

    expect(mockRepo.create).toHaveBeenCalledTimes(1);
  });
});
