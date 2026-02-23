export interface IBookerSlotSnapshotService {
  recordSnapshot(input: { eventTypeId: number; firstSlotLeadTime: number }): Promise<void>;
}
