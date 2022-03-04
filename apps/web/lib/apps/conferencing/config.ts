import type { App } from "@calcom/types/App";

export const APPS = {
  tandem_video: {
    installed: !!(process.env.TANDEM_CLIENT_ID && process.env.TANDEM_CLIENT_SECRET),
    type: "tandem_video",
    title: "Tandem Video",
    imageSrc: "integrations/tandem.svg",
    description: "Virtual Office | Video Conferencing",
    variant: "conferencing",
    name: "Daily",
    label: "",
    slug: "",
    category: "",
    logo: "",
    publisher: "",
    url: "",
    verified: true,
    trending: true,
    rating: 0,
    reviews: 0,
  },
} as Record<string, App>;

export const ALL_INTEGRATIONS = [
  {
    installed: true,
    type: "metamask_web3",
    title: "Metamask",
    imageSrc: "integrations/apple-calendar.svg",
    description: "For personal and business calendars",
    variant: "web3",
  },
];
