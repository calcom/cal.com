import { WEBAPP_URL } from "@calcom/lib/constants";
import { FiCalendar, FiVideo, FiCreditCard, FiShare2, FiBarChart, FiGrid } from "@calcom/ui/components/icon";

function getHref(baseURL: string, category: string, useQueryParam: boolean) {
  const baseUrlParsed = new URL(baseURL, WEBAPP_URL);
  baseUrlParsed.searchParams.set("category", category);
  return useQueryParam ? `${baseUrlParsed.toString()}` : `${baseURL}/${category}`;
}

const getAppCategories = (baseURL: string, useQueryParam: boolean) => {
  return [
    {
      name: "calendar",
      href: getHref(baseURL, "calendar", useQueryParam),
      icon: FiCalendar,
    },
    {
      name: "conferencing",
      href: getHref(baseURL, "conferencing", useQueryParam),
      icon: FiVideo,
    },
    {
      name: "payment",
      href: getHref(baseURL, "payment", useQueryParam),
      icon: FiCreditCard,
    },
    {
      name: "automation",
      href: getHref(baseURL, "automation", useQueryParam),
      icon: FiShare2,
    },
    {
      name: "analytics",
      href: getHref(baseURL, "analytics", useQueryParam),
      icon: FiBarChart,
    },
    {
      name: "web3",
      href: getHref(baseURL, "web3", useQueryParam),
      icon: FiBarChart,
    },
    {
      name: "other",
      href: getHref(baseURL, "other", useQueryParam),
      icon: FiGrid,
    },
  ];
};

export default getAppCategories;
