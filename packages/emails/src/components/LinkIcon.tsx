import { BASE_URL, IS_PRODUCTION } from "@calcom/lib/constants";

export const LinkIcon = () => (
  <img
    src={IS_PRODUCTION ? BASE_URL + "/emails/linkIcon.png" : "https://app.cal.com/emails/linkIcon.png"}
    width="12px"
    alt=""
  />
);
