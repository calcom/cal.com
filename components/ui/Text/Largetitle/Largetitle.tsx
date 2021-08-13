import React from "react";
import classnames from "classnames";
import { TextProps } from "../Text";

const Largetitle: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames("text-2xl font-normal text-gray-900 dark:text-white");

  return <p className={classes}>{props.children}</p>;
};

export default Largetitle;
