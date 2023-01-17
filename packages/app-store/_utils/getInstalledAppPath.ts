import z from "zod";

const InstalledAppVariants = [
  "conferencing",
  "calendar",
  "payment",
  "analytics",
  "automation",
  "other",
  "web3",
] as const;

const variantSchema = z.enum(InstalledAppVariants);

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
