import { Icon } from "@calcom/ui";

const getAppCategories = (baseURL: string) => {
  return [
    {
      name: "calendar",
      href: `${baseURL}/calendar`,
      icon: Icon.FiCalendar,
    },
    {
      name: "conferencing",
      href: `${baseURL}/conferencing`,
      icon: Icon.FiVideo,
    },
    {
      name: "payment",
      href: `${baseURL}/payment`,
      icon: Icon.FiCreditCard,
    },
    {
      name: "automation",
      href: `${baseURL}/automation`,
      icon: Icon.FiShare2,
    },
    {
      name: "analytics",
      href: `${baseURL}/analytics`,
      icon: Icon.FiBarChart,
    },
    {
      name: "web3",
      href: `${baseURL}/web3`,
      icon: Icon.FiBarChart,
    },
    {
      name: "other",
      href: `${baseURL}/other`,
      icon: Icon.FiGrid,
    },
  ];
};

export default getAppCategories;
