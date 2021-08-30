import React from "react";
import classnames from "classnames";
import { TextProps } from "../Text";

const Subtitle: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames("text-sm font-normal text-neutral-500 dark:text-white", props?.className);

  return <p className={classes}>{props?.text || props.children}</p>;
};

export default Subtitle;
