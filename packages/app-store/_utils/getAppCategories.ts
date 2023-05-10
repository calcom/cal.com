import { WEBAPP_URL } from "@calcom/lib/constants";
import { Calendar, Video, CreditCard, Share2, BarChart, Grid } from "@calcom/ui/components/icon";

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
      icon: Calendar,
    },
    {
      name: "conferencing",
      href: getHref(baseURL, "conferencing", useQueryParam),
      icon: Video,
    },
    {
      name: "payment",
      href: getHref(baseURL, "payment", useQueryParam),
      icon: CreditCard,
    },
    {
      name: "automation",
      href: getHref(baseURL, "automation", useQueryParam),
      icon: Share2,
    },
    {
      name: "analytics",
      href: getHref(baseURL, "analytics", useQueryParam),
      icon: BarChart,
    },
    {
      name: "web3",
      href: getHref(baseURL, "web3", useQueryParam),
      icon: BarChart,
    },
    {
      name: "other",
      href: getHref(baseURL, "other", useQueryParam),
      icon: Grid,
    },
  ];
};

export default getAppCategories;
