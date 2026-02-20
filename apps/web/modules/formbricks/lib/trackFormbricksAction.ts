import formbricks from "@formbricks/js";

export const trackFormbricksAction = (
  eventName: string,
  hiddenFields?: Record<string | number, string | number | string[]>
) => {
  if (process.env.NEXT_PUBLIC_FORMBRICKS_HOST_URL && process.env.NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID) {
    formbricks.track(eventName, hiddenFields ? { hiddenFields } : undefined);
  }
};
