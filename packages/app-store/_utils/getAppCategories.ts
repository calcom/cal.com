import { WEBAPP_URL } from "@calcom/lib/constants";
import type { AppCategories } from "@calcom/prisma/enums";
import type { IconName } from "@calcom/ui";

function getHref(baseURL: string, category: string, useQueryParam: boolean) {
  const baseUrlParsed = new URL(baseURL, WEBAPP_URL);
  baseUrlParsed.searchParams.set("category", category);
  return useQueryParam ? `${baseUrlParsed.toString()}` : `${baseURL}/${category}`;
}

type AppCategoryEntry = {
  name: AppCategories;
  href: string;
  icon: IconName;
};

const getAppCategories = (baseURL: string, useQueryParam: boolean): AppCategoryEntry[] => {
  // Manually sorted alphabetically, but leaving "Other" at the end
  // TODO: Refactor and type with Record<AppCategories, AppCategoryEntry> to enforce consistency
  return [
    {
      name: "analytics",
      href: getHref(baseURL, "analytics", useQueryParam),
      icon: "bar-chart",
    },
    {
      name: "automation",
      href: getHref(baseURL, "automation", useQueryParam),
      icon: "share-2",
    },
    {
      name: "calendar",
      href: getHref(baseURL, "calendar", useQueryParam),
      icon: "calendar",
    },
    {
      name: "conferencing",
      href: getHref(baseURL, "conferencing", useQueryParam),
      icon: "video",
    },
    {
      name: "crm",
      href: getHref(baseURL, "crm", useQueryParam),
      icon: "contact",
    },
    {
      name: "messaging",
      href: getHref(baseURL, "messaging", useQueryParam),
      icon: "mail",
    },
    {
      name: "payment",
      href: getHref(baseURL, "payment", useQueryParam),
      icon: "credit-card",
    },
    {
      name: "other",
      href: getHref(baseURL, "other", useQueryParam),
      icon: "grid-3x3",
    },
  ];
};

export default getAppCategories;
