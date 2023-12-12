import type { NextMiddleware } from "next-api-middleware";

// Used to check if the apiKey is not expired, could be extracted if reused. but not for now.
export const dateNotInPast = function (date: Date) {
  const now = new Date();
  if (now.setHours(0, 0, 0, 0) > date.setHours(0, 0, 0, 0)) {
    return true;
  }
};

// This verifies the apiKey and sets the user if it is valid.
export const verifyApiKey: NextMiddleware = async (req, res, next) => {
  throw new Error("This should go to Sentry");
};
