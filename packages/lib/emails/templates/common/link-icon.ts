import { IS_PRODUCTION, BASE_URL } from "@calcom/lib/config/constants";

export const linkIcon = (): string => {
  return IS_PRODUCTION ? BASE_URL + "/emails/linkIcon.png" : "https://app.cal.com/emails/linkIcon.png";
};
