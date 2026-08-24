import { REDIRECT_APPS } from "../redirect-apps.generated";

export { REDIRECT_APPS };

export const isRedirectApp = (slug: string): boolean => {
  return (REDIRECT_APPS as readonly string[]).includes(slug);
};
