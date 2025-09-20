import type { IconName } from "@calid/features/ui/components/icon/Icon";

import { WEBAPP_URL } from "@calcom/lib/constants";

function getHref(baseURL: string, category: string, useQueryParam: boolean) {
  const baseUrlParsed = new URL(baseURL, WEBAPP_URL);
  baseUrlParsed.searchParams.set("category", category);
  return useQueryParam ? `${baseUrlParsed.toString()}` : `${baseURL}/${category}`;
}

type InsightEntry = {
  name: string;
  href: string;
  icon: IconName;
  "data-testid": string;
};

const getInsigthTabs = (baseURL: string, useQueryParam: boolean): InsightEntry[] => {
  return [
    {
      name: "bookings",
      href: getHref(baseURL, "bookings", useQueryParam),
      icon: "calendar-check",
      "data-testid": "calendar-check",
    },
    {
      name: "routing",
      href: getHref(baseURL, "routing", useQueryParam),
      icon: "list-tree",
      "data-testid": "list-tree",
    },
    {
      name: "workflows",
      href: getHref(baseURL, "workflows", useQueryParam),
      icon: "workflow",
      "data-testid": "workflows",
    },
  ];
};

export default getInsigthTabs;
