import { Icon } from "@calcom/ui";

function getHref(baseURL: string, category: string, useQueryParam: boolean) {
  return useQueryParam ? `${baseURL}&category=${category}` : `${baseURL}/${category}`;
}

const getAppCategories = (baseURL: string, useQueryParam = false) => {
  return [
    {
      name: "calendar",
      href: getHref(baseURL, "calendar", useQueryParam),
      icon: Icon.FiCalendar,
    },
    {
      name: "conferencing",
      href: getHref(baseURL, "conferencing", useQueryParam),
      icon: Icon.FiVideo,
    },
    {
      name: "payment",
      href: getHref(baseURL, "payment", useQueryParam),
      icon: Icon.FiCreditCard,
    },
    {
      name: "automation",
      href: getHref(baseURL, "automation", useQueryParam),
      icon: Icon.FiShare2,
    },
    {
      name: "analytics",
      href: getHref(baseURL, "analytics", useQueryParam),
      icon: Icon.FiBarChart,
    },
    {
      name: "web3",
      href: getHref(baseURL, "web3", useQueryParam),
      icon: Icon.FiBarChart,
    },
    {
      name: "other",
      href: getHref(baseURL, "other", useQueryParam),
      icon: Icon.FiGrid,
    },
  ];
};

export default getAppCategories;
