import * as React from "react";
import SVG from "react-inlinesvg";

export function IconSprites() {
  return (
    <SVG
      src={`${process.env.NEXT_PUBLIC_WEBAPP_URL}/icons/sprite.svg?v=${process.env.NEXT_PUBLIC_CALCOM_VERSION}`}
    />
  );
}

export default IconSprites;
