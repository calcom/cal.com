import { WEBAPP_URL } from "@calcom/lib/constants";
import type { AppCategories } from "@calcom/prisma/enums";
import type { IconName } from "@calcom/ui/components/icon";

function getHref(baseURL: string, category: string, useQueryParam: boolean) {
  const baseUrlParsed = new URL(baseURL, WEBAPP_URL);
  baseUrlParsed.searchParams.set("category", category);
  return useQueryParam ? `${baseUrlParsed.toString()}` : `${baseURL}/${category}`;
}

export type ActiveAppCategoryKeys = Exclude<AppCategories, "video" | "web3">;

type AppCategoryEntry = {
  name: AppCategories;
  href: string;
  icon: IconName;
  "data-testid": string;
};

export const APP_CATEGORY_ENTRIES: Record<ActiveAppCategoryKeys, Omit<AppCategoryEntry, "name">> = {
  analytics: {
    href: "",
    icon: "chart-bar",
    "data-testid": "analytics"
  },
  automation: {
    href: "",
    icon: "share-2",
    "data-testid": "automation"
  },
  calendar: {
    href: "",
    icon: "calendar",
    "data-testid": "calendar"
  },
  conferencing: {
    href: "",
    icon: "video",
    "data-testid": "conferencing"
  },
  crm: {
    href: "",
    icon: "contact",
    "data-testid": "crm"
  },
  messaging: {
    href: "",
    icon: "mail",
    "data-testid": "messaging"
  },
  payment: {
    href: "",
    icon: "credit-card",
    "data-testid": "payment"
  },
  other: {
    href: "",
    icon: "grid-3x3",
    "data-testid": "other"
  }
}

const getAppCategories = (baseURL: string, useQueryParam: boolean): AppCategoryEntry[] => {
  const CATEGORY_ORDER = [
    "analytics", "automation", "calendar", "conferencing",
    "crm", "messaging", "payment", "other",
  ] as const satisfies readonly ActiveAppCategoryKeys[];

  return CATEGORY_ORDER.map((name): AppCategoryEntry => (
      {
        name,
        ...APP_CATEGORY_ENTRIES[name],
        href: getHref(baseURL, name, useQueryParam)
      }
  ))
};

export default getAppCategories;
