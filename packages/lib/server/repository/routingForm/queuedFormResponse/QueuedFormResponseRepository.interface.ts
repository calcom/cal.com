export type QueuedFormResponseRepositoryFindManyWhere = {
  actualResponseId?: string | null;
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
  updatedAt: Date;
  actualResponseId: string | null;
};

export interface QueuedFormResponseRepositoryInterface {
  findMany(
    args: QueuedFormResponseRepositoryFindManyArgs
  ): Promise<QueuedFormResponseRepositoryFindManyResult[]>;
  deleteByIds(ids: string[]): Promise<{ count: number }>;
}
