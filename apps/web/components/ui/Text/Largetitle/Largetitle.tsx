import classnames from "classnames";
import React from "react";

import { TextProps } from "../Text";

const Largetitle: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames(
    "font-cal tracking-wider text-3xl text-gray-900 dark:text-white mb-2",
    props?.className
  );

  return <p className={classes}>{props?.text || props.children}</p>;
};

export default Largetitle;
