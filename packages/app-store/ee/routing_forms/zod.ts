import { z } from "zod";

export const zodFields = z
  .array(
    z.object({
      id: z.string(),
      label: z.string(),
      identifier: z.string().optional(),
      type: z.string(),
      selectText: z.string().optional(),
      required: z.boolean().optional(),
    })
  )
  .optional();
export const zodRoutes = z
  .union([
    z.array(
      z.object({
        id: z.string(),
        queryValue: z.object({
          id: z.string().optional(),
          type: z.union([z.literal("group"), z.literal("switch_group")]),
          children1: z.any(),
          properties: z.any(),
        }),
        isFallback: z.boolean().optional(),
        action: z.object({
          // TODO: Make it a union type of "customPageMessage" and ..
          type: z.union([
            z.literal("customPageMessage"),
            z.literal("externalRedirectUrl"),
            z.literal("eventTypeRedirectUrl"),
          ]),
          value: z.string(),
        }),
      })
    ),
    z.null(),
  ])
  .optional();
