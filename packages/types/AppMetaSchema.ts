import { z } from "zod";

const eventLocationTypeSchema = z.object({
  type: z.string(),
  label: z.string(),
  messageForOrganizer: z.string().optional(),
  iconUrl: z.string().optional(),
  variable: z.literal("locationLink").optional(),
  defaultValueVariable: z.literal("link").optional(),
  attendeeInputType: z.null().optional(),
  attendeeInputPlaceholder: z.null().optional(),
  linkType: z.enum(["static", "dynamic"]),
  urlRegExp: z.string().optional(),
  organizerInputPlaceholder: z.string().optional(),
  organizerInputType: z.enum(["text", "phone"]).optional(),
  default: z.boolean().optional(),
});

const appDataSchema = z
  .object({
    location: eventLocationTypeSchema.optional(),
    tag: z
      .object({
        scripts: z
          .array(
            z
              .object({
                src: z.string().optional(),
                content: z.string().optional(),
                attrs: z.record(z.any()).optional(),
              })
              .passthrough()
          )
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .nullable()
  .optional();

const paidAppDataSchema = z.object({
  priceInUsd: z.number(),
  priceId: z.string().optional(),
  trial: z.number().optional(),
  mode: z.enum(["subscription", "one_time"]).optional(),
});

export const AppMetaSchema = z
  .object({
    name: z.string(),
    description: z.string(),
    type: z.string(),
    variant: z.enum([
      "calendar",
      "payment",
      "conferencing",
      "video",
      "other",
      "other_calendar",
      "automation",
      "crm",
      "analytics",
      "messaging",
    ]),
    slug: z.string(),
    categories: z.array(z.string()),
    logo: z.string(),
    publisher: z.string(),
    url: z.string().optional(),
    email: z.string(),
    installed: z.boolean().optional(),
    title: z.string().optional(),
    category: z.string().optional(),
    extendsFeature: z.enum(["EventType", "User"]).optional(),
    docsUrl: z.string().optional(),
    verified: z.boolean().optional(),
    trending: z.boolean().optional(),
    rating: z.number().optional(),
    reviews: z.number().optional(),
    isGlobal: z.boolean().optional(),
    simplePath: z.string().optional(),
    key: z.any().optional(),
    feeType: z.enum(["monthly", "usage-based", "one-time", "free"]).optional(),
    price: z.number().optional(),
    commission: z.number().optional(),
    licenseRequired: z.boolean().optional(),
    teamsPlanRequired: z
      .object({
        upgradeUrl: z.string(),
      })
      .passthrough()
      .optional(),
    appData: appDataSchema,
    paid: paidAppDataSchema.optional(),
    dirName: z.string().optional(),
    isTemplate: z.boolean().optional(),
    __template: z.string().optional(),
    dependencies: z.array(z.string()).optional(),
    concurrentMeetings: z.boolean().optional(),
    createdAt: z.string().optional(),
    isOAuth: z.boolean().optional(),
    isAuth: z.boolean().optional(),
    delegationCredential: z
      .object({
        workspacePlatformSlug: z.string(),
      })
      .passthrough()
      .optional(),
    __createdUsingCli: z.boolean().optional(),
    imageSrc: z.string().optional(),
    label: z.string().optional(),
    linkType: z.string().optional(),
  })
  .passthrough();

export type AppMetaType = z.infer<typeof AppMetaSchema>;
