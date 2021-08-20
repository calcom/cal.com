import React from "react";
import classnames from "classnames";
import { TextProps } from "../Text";

const Title3: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames("text-xs font-semibold leading-tight text-gray-900 dark:text-white");

  return <p className={classes}>{props.children}</p>;
};

export default Title3;
