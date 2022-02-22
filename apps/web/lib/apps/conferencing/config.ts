import type { App } from "@calcom/types/App";

export const APPS = {
  daily_video: {
    installed: !!process.env.DAILY_API_KEY,
    type: "daily_video",
    title: "Daily.co Video",
    name: "Daily",
    description: "Video Conferencing",
    imageSrc: "apps/daily.svg",
    variant: "conferencing",
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
