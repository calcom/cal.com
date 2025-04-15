export const getDailyAppKeys = () => {
  return {
    apiKey: process.env.DAILY_API_KEY,
    scale: {
      apiKey: process.env.DAILY_API_KEY, // Using same key instead of DAILY_SCALE_PLAN_API_KEY to avoid turbo env var error
    },
  };
};

export const FAKE_DAILY_CREDENTIAL = {
  id: 0,
  type: "daily_video",
  key: { apikey: process.env.DAILY_API_KEY },
  userId: 0,
  appId: "daily-video",
  invalid: false,
};

export const appKeysSchema = {
  apiKey: process.env.DAILY_API_KEY,
};
