import { BASE_URL, IS_PRODUCTION } from "@calcom/lib/constants";

export const LinkIcon = ({ secondary }: { secondary?: boolean }) => (
  <img
    src={IS_PRODUCTION ? BASE_URL + "/emails/linkIcon.png" : "https://app.cal.com/emails/linkIcon.png"}
    srcSet={IS_PRODUCTION ? BASE_URL + "/emails/linkIcon.svg" : "https://app.cal.com/emails/linkIcon.svg"}
    width="16px"
    style={{ marginBottom: "-3px", marginLeft: "8px", ...(secondary && { filter: "brightness(80%)" }) }}
    alt=""
  />
);
