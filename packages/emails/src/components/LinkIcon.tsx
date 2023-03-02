import { WEBAPP_URL } from "@calcom/lib/constants";

export const LinkIcon = ({ secondary, iconName }: { secondary?: boolean; iconName: string }) => (
  <img
    src={`${WEBAPP_URL}/emails/${iconName}.png`}
    srcSet={`${WEBAPP_URL}/emails/${iconName}.svg`}
    width="16px"
    style={{
      marginBottom: "-3px",
      marginLeft: "8px",
      ...(secondary && { filter: "brightness(80%)" }),
    }}
    alt=""
  />
);
