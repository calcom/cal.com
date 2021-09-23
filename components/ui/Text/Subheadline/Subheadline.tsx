import classnames from "classnames";
import React from "react";

import { TextProps } from "../Text";

const Subheadline: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames("text-xl text-gray-500 dark:text-white leading-relaxed", props?.className);

  return <p className={classes}>{props?.text || props.children}</p>;
};

export default Subheadline;
