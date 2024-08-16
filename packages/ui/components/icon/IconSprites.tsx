import * as React from "react";
import SVG from "react-inlinesvg";

export function IconSprites() {
  const ref = React.useRef<SVGElement>(null);
  return <SVG innerRef={ref} src={`${process.env.NEXT_PUBLIC_WEBAPP_URL}/icons/sprite.svg`} />;
}

export default IconSprites;
