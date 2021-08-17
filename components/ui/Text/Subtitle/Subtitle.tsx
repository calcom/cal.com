import React from "react";
import classnames from "classnames";
import { TextProps } from "../Text";

const Subtitle: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames("ext-sm text-neutral-500 dark:text-white");

  return <p className={classes}>{props.children}</p>;
};

export default Subtitle;
