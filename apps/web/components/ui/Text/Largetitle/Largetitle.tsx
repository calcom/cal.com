import React from "react";
import { twMerge } from "tailwind-merge";

import { TextProps } from "../Text";

const Largetitle: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = twMerge(
    "font-cal tracking-wider text-gray-900 text-3xl dark:text-white mb-2",
    props?.className
  );
  return <p className={classes}>{props?.text || props.children}</p>;
};

export default Largetitle;
