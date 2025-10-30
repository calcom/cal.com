export type QueuedFormResponseRepositoryFindManyWhere = {
  actualResponseId?: number | null;
  createdAt?: {
    lt: Date;
  };
};

export type QueuedFormResponseRepositoryFindManyArgs = {
  where: QueuedFormResponseRepositoryFindManyWhere;
  params?: {
    take?: number;
  };
};

export type QueuedFormResponseRepositoryFindManyResult = {
  id: string;
  formId: string;
  response: unknown;
  chosenRouteId: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  actualResponseId: number | null;
};

export interface QueuedFormResponseRepositoryInterface {
  findMany(
    args: QueuedFormResponseRepositoryFindManyArgs
  ): Promise<QueuedFormResponseRepositoryFindManyResult[]>;
  deleteByIds(ids: string[]): Promise<{ count: number }>;
}
