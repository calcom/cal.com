export interface IBookerSlotSnapshotRepository {
  create(data: { eventTypeId: number; firstSlotLeadTime: number }): Promise<{ id: number }>;
}
