import formbricks from "@formbricks/js/app";

export const trackFormbricksAction = (eventName: string, properties: Record<string, string> = {}) => {
  if (process.env.NEXT_PUBLIC_FORMBRICKS_HOST_URL && process.env.NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID) {
    formbricks.track(eventName, properties);
  }
};
