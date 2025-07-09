import { v5 as uuidv5 } from "uuid";

export class IdempotencyKeyService {
  static generate({
    startTime,
    endTime,
    userId,
    reassignedById,
  }: {
    startTime: Date | string;
    endTime: Date | string;
    userId?: number;
    reassignedById?: number | null;
  }) {
    return uuidv5(
      `${startTime.valueOf()}.${endTime.valueOf()}.${userId}${reassignedById ? `.${reassignedById}` : ""}`,
      uuidv5.URL
    );
  }
}
