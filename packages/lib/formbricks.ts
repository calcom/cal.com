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
