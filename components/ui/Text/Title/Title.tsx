import React from "react";
import classnames from "classnames";
import { TextProps } from "../Text";

const Title: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames("font-medium text-neutral-900 dark:text-white");

  return <p className={classes}>{props.children}</p>;
};

export default Title;
