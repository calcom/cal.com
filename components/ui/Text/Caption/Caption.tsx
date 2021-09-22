import React from "react";
import classnames from "classnames";
import { TextProps } from "../Text";

const Caption: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames("text-sm text-gray-500 dark:text-white leading-tight", props?.className);

  return <p className={classes}>{props?.text || props.children}</p>;
};

export default Caption;
