import { Credential } from "@prisma/client";

export const VIDEO_CONFERENCING_INTEGRATIONS_TYPES = {
  zoom: "zoom_video",
  daily: "daily_video",
};

export const FAKE_DAILY_CREDENTIAL: Credential = {
  id: +new Date().getTime(),
  type: "daily_video",
  key: { apikey: process.env.DAILY_API_KEY },
  userId: +new Date().getTime(),
};
