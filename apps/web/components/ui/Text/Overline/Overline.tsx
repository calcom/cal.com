import classnames from "classnames";
import React from "react";

import { TextProps } from "../Text";

const Overline: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames(
    "text-sm capitalize font-medium text-gray-900 dark:text-white",
    props?.className
  );

  return <p className={classes}>{props?.text || props.children}</p>;
};

export default Overline;
