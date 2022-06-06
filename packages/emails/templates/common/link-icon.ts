import { BASE_URL, IS_PRODUCTION } from "@calcom/lib/constants";

export const linkIcon = (): string => {
  return IS_PRODUCTION ? BASE_URL + "/emails/linkIcon.png" : "https://app.cal.com/emails/linkIcon.png";
};
