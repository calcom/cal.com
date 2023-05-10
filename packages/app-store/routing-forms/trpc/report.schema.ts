import z from "zod";

export const ZReportInputSchema = z.object({
  formId: z.string(),
  jsonLogicQuery: z.object({
    logic: z.union([z.record(z.any()), z.null()]),
  }),
  cursor: z.number().nullish(), // <-- "cursor" needs to exist when using useInfiniteQuery, but can be any type
});

export type TReportInputSchema = z.infer<typeof ZReportInputSchema>;
