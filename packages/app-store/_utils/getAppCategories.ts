import { WEBAPP_URL } from "@calcom/lib/constants";
import type { AppCategories } from "@calcom/prisma/enums";
import type { IconName } from "@calcom/ui/components/icon";

function getHref(baseURL: string, category: string, useQueryParam: boolean) {
  const baseUrlParsed = new URL(baseURL, WEBAPP_URL);
  baseUrlParsed.searchParams.set("category", category);
  return useQueryParam ? `${baseUrlParsed.toString()}` : `${baseURL}/${category}`;
}

type AppCategoryEntry = {
  name: AppCategories;
  href: string;
  icon: IconName;
  "data-testid": string;
};

const getAppCategories = (baseURL: string, useQueryParam: boolean): AppCategoryEntry[] => {
  // Manually sorted alphabetically, but leaving "Other" at the end
  // TODO: Refactor and type with Record<AppCategories, AppCategoryEntry> to enforce consistency
  return [
    {
      name: "analytics",
      href: getHref(baseURL, "analytics", useQueryParam),
      icon: "chart-bar",
      "data-testid": "analytics",
    },
    {
      name: "automation",
      href: getHref(baseURL, "automation", useQueryParam),
      icon: "share-2",
      "data-testid": "automation",
    },
    {
      name: "calendar",
      href: getHref(baseURL, "calendar", useQueryParam),
      icon: "calendar",
      "data-testid": "calendar",
    },
    {
      name: "conferencing",
      href: getHref(baseURL, "conferencing", useQueryParam),
      icon: "video",
      "data-testid": "conferencing",
    },
    {
      name: "crm",
      href: getHref(baseURL, "crm", useQueryParam),
      icon: "contact",
      "data-testid": "crm",
    },
    {
      name: "messaging",
      href: getHref(baseURL, "messaging", useQueryParam),
      icon: "mail",
      "data-testid": "messaging",
    },
    {
      name: "payment",
      href: getHref(baseURL, "payment", useQueryParam),
      icon: "credit-card",
      "data-testid": "payment",
    },
    {
      name: "other",
      href: getHref(baseURL, "other", useQueryParam),
      icon: "grid-3x3",
      "data-testid": "other",
    },
  ];
};

export default getAppCategories;
