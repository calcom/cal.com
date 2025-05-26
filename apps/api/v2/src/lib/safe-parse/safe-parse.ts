import { Logger } from "@nestjs/common";
import { ZodSchema } from "zod";

const logger = new Logger("safeParse");

export function safeParse<T>(schema: ZodSchema<T>, value: unknown, defaultValue: T, logError = true): T {
  const result = schema.safeParse(value);
  if (result.success) {
    return result.data;
  } else {
    const errorStack = new Error().stack;

    if (logError) {
      logger.error(
        `Zod parsing failed.\n` +
          `1. Schema: ${schema.description || "UnnamedSchema"}\n` +
          `2. Input: ${JSON.stringify(value, null, 2)}\n` +
          `3. Zod Error: ${result.error}\n` +
          `4. Call Stack: ${errorStack}`
      );
    }

    return defaultValue;
  }
}
