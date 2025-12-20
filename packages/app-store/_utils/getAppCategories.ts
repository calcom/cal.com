import type { LucideIcon } from "lucide-react";
import {
  CalendarIcon,
  ChartBarIcon,
  ContactIcon,
  CreditCardIcon,
  Grid3x3Icon,
  MailIcon,
  Share2Icon,
  VideoIcon,
} from "lucide-react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import type { AppCategories } from "@calcom/prisma/enums";

function getHref(baseURL: string, category: string, useQueryParam: boolean) {
  const baseUrlParsed = new URL(baseURL, WEBAPP_URL);
  baseUrlParsed.searchParams.set("category", category);
  return useQueryParam ? `${baseUrlParsed.toString()}` : `${baseURL}/${category}`;
}

type AppCategoryEntry = {
  name: AppCategories;
  href: string;
  icon: LucideIcon;
  "data-testid": string;
};

const getAppCategories = (baseURL: string, useQueryParam: boolean): AppCategoryEntry[] => {
  // Manually sorted alphabetically, but leaving "Other" at the end
  // TODO: Refactor and type with Record<AppCategories, AppCategoryEntry> to enforce consistency
  return [
    {
      name: "analytics",
      href: getHref(baseURL, "analytics", useQueryParam),
      icon: ChartBarIcon,
      "data-testid": "analytics",
    },
    {
      name: "automation",
      href: getHref(baseURL, "automation", useQueryParam),
      icon: Share2Icon,
      "data-testid": "automation",
    },
    {
      name: "calendar",
      href: getHref(baseURL, "calendar", useQueryParam),
      icon: CalendarIcon,
      "data-testid": "calendar",
    },
    {
      name: "conferencing",
      href: getHref(baseURL, "conferencing", useQueryParam),
      icon: VideoIcon,
      "data-testid": "conferencing",
    },
    {
      name: "crm",
      href: getHref(baseURL, "crm", useQueryParam),
      icon: ContactIcon,
      "data-testid": "crm",
    },
    {
      name: "messaging",
      href: getHref(baseURL, "messaging", useQueryParam),
      icon: MailIcon,
      "data-testid": "messaging",
    },
    {
      name: "payment",
      href: getHref(baseURL, "payment", useQueryParam),
      icon: CreditCardIcon,
      "data-testid": "payment",
    },
    {
      name: "other",
      href: getHref(baseURL, "other", useQueryParam),
      icon: Grid3x3Icon,
      "data-testid": "other",
    },
  ];
};

export default getAppCategories;
