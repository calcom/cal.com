import React from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";

export const CallToActionIcon = ({
  secondary,
  iconName,
  style,
}: {
  secondary?: boolean;
  iconName: string;
  style?: React.CSSProperties;
}) => (
  <img
    src={`${WEBAPP_URL}/emails/${iconName}.png`}
    srcSet={`${WEBAPP_URL}/emails/${iconName}.svg`}
    width="1rem"
    style={{
      height: "1rem",
      width: "1rem",
      marginLeft: "0.5rem",
      ...(secondary && { filter: "brightness(50%)" }),
      ...style,
    }}
    alt=""
  />
);
