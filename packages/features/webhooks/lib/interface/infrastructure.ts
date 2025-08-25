export interface ITasker {
  create(
    taskName: string,
    data: any,
    options?: { scheduledAt?: Date; referenceUid?: string }
  ): Promise<string | void>;
}
