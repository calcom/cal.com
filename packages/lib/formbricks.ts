import formbricks from "@formbricks/js";

export const initFormbricks = () => {
  if (process.env.NEXT_PUBLIC_FORMBRICKS) {
    const [apiHost, environmentId] = process.env.NEXT_PUBLIC_FORMBRICKS.split("+");
    formbricks.init({
      environmentId,
      apiHost,
      debug: true,
    });
  }
};

export const setFormbricksUserId = (userId: string) => {
  if (process.env.NEXT_PUBLIC_FORMBRICKS) {
    formbricks.setUserId(userId);
  }
};

export const setFormbricksEmail = (email: string) => {
  if (process.env.NEXT_PUBLIC_FORMBRICKS) {
    formbricks.setEmail(email);
  }
};

export const setFormbricksAttribute = (key: string, value: string | number | boolean) => {
  if (process.env.NEXT_PUBLIC_FORMBRICKS) {
    formbricks.setAttribute(key, value.toString());
  }
};

export const trackFormbricksAction = (eventName: string, properties: Record<string, string> = {}) => {
  if (process.env.NEXT_PUBLIC_FORMBRICKS) {
    formbricks.track(eventName, properties);
  }
};

export const logoutFormbricks = () => {
  if (process.env.NEXT_PUBLIC_FORMBRICKS) {
    formbricks.logout();
  }
};
