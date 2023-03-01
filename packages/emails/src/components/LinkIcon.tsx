export const LinkIcon = ({ secondary, iconName }: { secondary?: boolean; iconName: string }) => (
  <img
    src={
      IS_PRODUCTION ? WEBAPP_URL + `/emails/${iconName}.png` : `https://app.cal.com/emails/${iconName}.png`
    }
    srcSet={
      IS_PRODUCTION ? WEBAPP_URL + `/emails/${iconName}.svg` : `https://app.cal.com/emails/${iconName}.svg`
    }
    width="16px"
    style={{
      marginBottom: "-3px",
      marginLeft: "8px",
      ...(secondary && { filter: "brightness(80%)" }),
    }}
    alt=""
  />
);
