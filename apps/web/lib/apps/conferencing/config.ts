import { App } from "../interfaces/App";

export const APPS = {
  zoom_video: {
    installed: !!(process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET),
    type: "zoom_video",
    title: "Zoom",
    name: "Zoom",
    description: "Video Conferencing",
    imageSrc: "apps/zoom.svg",
    variant: "conferencing",
  },
  daily_video: {
    installed: !!process.env.DAILY_API_KEY,
    type: "daily_video",
    title: "Daily.co Video",
    name: "Daily",
    description: "Video Conferencing",
    imageSrc: "apps/daily.svg",
    variant: "conferencing",
  },
} as Record<string, App>;
