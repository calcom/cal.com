import React from "react";
import classnames from "classnames";
import { TextProps } from "../Text";

const Caption: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames("text-sm text-gray-500 dark:text-white leading-tight");

  return <p className={classes}>{props.children}</p>;
};

export default Caption;
