import { z } from "zod";

export const ZGetApiLogsInput = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  statusCode: z.number().optional(),
  endpoint: z.string().optional(),
  isError: z.boolean().optional(),
  method: z.string().optional(),
  userId: z.number().optional(), // Admin filter by customer
  page: z.number().default(1),
  perPage: z.number().default(50),
});

export type TGetApiLogsInput = z.infer<typeof ZGetApiLogsInput>;

export const ZGetApiLogDetailInput = z.object({
  id: z.string(),
});

export type TGetApiLogDetailInput = z.infer<typeof ZGetApiLogDetailInput>;

export const ZGetApiLogsStatsInput = z.object({
  startDate: z.date(),
  endDate: z.date(),
});

export type TGetApiLogsStatsInput = z.infer<typeof ZGetApiLogsStatsInput>;
