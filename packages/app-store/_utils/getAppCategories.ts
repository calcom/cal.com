import { WEBAPP_URL } from "@calcom/lib/constants";
import type { AppCategories } from "@calcom/prisma/enums";
import type { LucideIcon } from "@calcom/ui/components/icon";
import {
  Calendar,
  Video,
  CreditCard,
  Share2,
  BarChart,
  Grid,
  Mail,
  Contact,
} from "@calcom/ui/components/icon";

function getHref(baseURL: string, category: string, useQueryParam: boolean) {
  const baseUrlParsed = new URL(baseURL, WEBAPP_URL);
  baseUrlParsed.searchParams.set("category", category);
  return useQueryParam ? `${baseUrlParsed.toString()}` : `${baseURL}/${category}`;
}

type AppCategoryEntry = {
  name: AppCategories;
  href: string;
  icon: LucideIcon;
};

const getAppCategories = (baseURL: string, useQueryParam: boolean): AppCategoryEntry[] => {
  // Manually sorted alphabetically, but leaving "Other" at the end
  // TODO: Refactor and type with Record<AppCategories, AppCategoryEntry> to enforce consistency
  return [
    {
      name: "analytics",
      href: getHref(baseURL, "analytics", useQueryParam),
      icon: BarChart,
    },
    {
      name: "automation",
      href: getHref(baseURL, "automation", useQueryParam),
      icon: Share2,
    },
    {
      name: "calendar",
      href: getHref(baseURL, "calendar", useQueryParam),
      icon: Calendar,
    },
    {
      name: "conferencing",
      href: getHref(baseURL, "conferencing", useQueryParam),
      icon: Video,
    },
    {
      name: "crm",
      href: getHref(baseURL, "crm", useQueryParam),
      icon: Contact,
    },
    {
      name: "messaging",
      href: getHref(baseURL, "messaging", useQueryParam),
      icon: Mail,
    },
    {
      name: "payment",
      href: getHref(baseURL, "payment", useQueryParam),
      icon: CreditCard,
    },
    {
      name: "other",
      href: getHref(baseURL, "other", useQueryParam),
      icon: Grid,
    },
  ];
};

export default getAppCategories;
