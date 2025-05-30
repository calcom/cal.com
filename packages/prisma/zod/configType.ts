import { z } from "zod";

export const configMetadataSchema = z.object({
  name: z.string(),
  slug: z.string(),
  type: z.string(),
  logo: z.string(),
  publisher: z.string(),
  email: z.string(),
  description: z.string(),
  url: z.string().optional(),
  variant: z.string().optional(),
  categories: z.array(z.string()).optional(),
  category: z.string().optional(),
  installed: z.boolean().optional(),
  isTemplate: z.boolean().optional(),
  title: z.string().optional(),
  dirName: z.string().optional(),
  isOAuth: z.boolean().optional(),
  isGlobal: z.boolean().optional(),
  licenseRequired: z.boolean().optional(),
  appData: z.record(z.any()).optional(),
  extendsFeature: z.string().optional(),
  iconUrl: z.string().optional(),
  rating: z.number().optional(),
  verified: z.boolean().optional(),
  premium: z.boolean().optional(),
  price: z.number().optional(),
  commission: z.number().optional(),
  feeType: z.string().optional(),
  __createdUsingCli: z.boolean().optional(),
  __template: z.string().optional(),
  isAuth: z.boolean().optional(),
});

export type configMetadata = z.infer<typeof configMetadataSchema>;

export function parseconfigMetadata(configJson: unknown): configMetadata {
  return configMetadataSchema.parse(configJson);
}

