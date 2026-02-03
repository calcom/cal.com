export type MonthlyProrationBatchPayload = {
  monthKey: string;
  teamIds: number[];
};

export interface IMonthlyProrationTasker {
  processBatch(payload: MonthlyProrationBatchPayload): Promise<{ runId: string }>;
}
