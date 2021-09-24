import React from "react";
import classnames from "classnames";
import { TextProps } from "../Text";

const Largetitle: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames("text-3xl font-extrabold text-gray-900 ", props?.className);

  return <p className={classes}>{props?.text || props.children}</p>;
};

export default Largetitle;
