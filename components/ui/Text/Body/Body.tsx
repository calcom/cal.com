import React from "react";
import classnames from "classnames";
import { TextProps } from "../Text";

const Body: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames("text-lg leading-relaxed text-gray-900 dark:text-white", props?.className);

  return <p className={classes}>{props?.text || props.children}</p>;
};

export default Body;
