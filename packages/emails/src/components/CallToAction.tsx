import React from "react";

import type { SVGComponent } from "@calcom/types/SVGComponent";
// import { Button } from "@calcom/ui";
import { FiArrowRight } from "@calcom/ui/components/icon";

export const CallToAction = (props: {
  label: string;
  href: string;
  secondary?: boolean;
  iconName?: string;
  color?: string;
  icon?: SVGComponent | React.ElementType;
  StartIcon?: SVGComponent | React.ElementType;
  EndIcon?: SVGComponent | React.ElementType;
}) => {
  const { label, href, secondary, iconName, color, icon, StartIcon, EndIcon } = props;
  return (
    <p
      style={{
        display: "inline-block",
        background: secondary ? "#FFFFFF" : "#292929",
        border: secondary ? "1px solid #d1d5db" : "",
        color: "#ffffff",
        fontFamily: "Roboto, Helvetica, sans-serif",
        fontSize: "14px",
        fontWeight: 500,
        lineHeight: "20px",
        margin: 0,
        textDecoration: "none",
        textTransform: "none",
        padding: "16px 24px",
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        msoPaddingAlt: "0px",
        borderRadius: "6px",
        boxSizing: "border-box",
      }}>
      <a
        style={{ color: secondary ? "#292929" : "#FFFFFF", textDecoration: "none" }}
        href={href}
        target="_blank"
        rel="noreferrer">
        {!StartIcon && !EndIcon && (
          <FiArrowRight className="hidden h-4 w-4 stroke-[1.5px] ltr:mr-2 ltr:-ml-1 rtl:-mr-1 rtl:ml-2 md:inline-flex" />
        )}
        {StartIcon && (
          <StartIcon className="hidden h-4 w-4 stroke-[1.5px] ltr:mr-2 ltr:-ml-1 rtl:-mr-1 rtl:ml-2 md:inline-flex" />
        )}
        {label}
        {EndIcon && <EndIcon className="-mr-1 hidden h-5 w-5 ltr:ml-2 rtl:-ml-1 rtl:mr-2 md:inline" />}
      </a>
    </p>
  );
};
