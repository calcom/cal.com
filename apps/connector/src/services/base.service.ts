import type { PrismaClient } from "@calcom/prisma";

export abstract class BaseService {
  constructor(protected prisma: PrismaClient) {}

  protected async transaction<T>(
    fn: (
      prisma: Parameters<PrismaClient["$transaction"]>[0] extends (arg: infer U) => any ? U : never
    ) => Promise<T>
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => fn(tx));
  }

  protected logOperation(operation: string, data?: any): void {
    console.log(`[${this.constructor.name}] ${operation}`, data ? { data } : "");
  }

  protected logError(operation: string, error: any): void {
    console.error(`[${this.constructor.name}] Error in ${operation}:`, error);
  }
}
