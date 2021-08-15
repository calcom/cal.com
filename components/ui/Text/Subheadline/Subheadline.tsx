import React from "react";
import classnames from "classnames";
import { TextProps } from "../Text";

const Subheadline: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames("text-xl text-gray-500 dark:text-white leading-relaxed");

  return <p className={classes}>{props.children}</p>;
};

export default Subheadline;
