import { AppCategories } from "@calcom/prisma/enums";
import z from "zod";

const variantSchema = z.nativeEnum(AppCategories);

export default function getInstalledAppPath(
  { variant, slug }: { variant?: string; slug?: string },
  locationSearch = ""
): string {
  if (!variant) return `/apps/installed${locationSearch}`;

  const parsedVariant = variantSchema.safeParse(variant);

  if (!parsedVariant.success) return `/apps/installed${locationSearch}`;

  if (!slug) return `/apps/installed/${variant}${locationSearch}`;

  return `/apps/installed/${variant}?hl=${slug}${locationSearch && locationSearch.slice(1)}`;
}
