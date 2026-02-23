import type { IBookerSlotSnapshotRepository } from "../repository/IBookerSlotSnapshotRepository";
import type { IBookerSlotSnapshotService } from "./IBookerSlotSnapshotService";

export interface IBookerSlotSnapshotServiceDeps {
  bookerSlotSnapshotRepo: IBookerSlotSnapshotRepository;
}

export class BookerSlotSnapshotService implements IBookerSlotSnapshotService {
  constructor(private deps: IBookerSlotSnapshotServiceDeps) {}

  async recordSnapshot(input: { eventTypeId: number; firstSlotLeadTime: number }): Promise<void> {
    const leadTime = Math.max(input.firstSlotLeadTime, 0);

    await this.deps.bookerSlotSnapshotRepo.create({
      eventTypeId: input.eventTypeId,
      firstSlotLeadTime: leadTime,
    });
  }
}
