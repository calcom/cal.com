import React from "react";
import classnames from "classnames";
import { TextProps } from "../Text";

const Overline: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames(
    "text-sm uppercase font-semibold leading-snug tracking-wide text-gray-900 dark:text-white"
  );

  return <p className={classes}>{props.children}</p>;
};

export default Overline;
