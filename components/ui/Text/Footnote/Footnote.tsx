import React from "react";
import classnames from "classnames";
import { TextProps } from "../Text";

const Footnote: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames("text--footnote", props?.className, props?.color);

  return <p className={classes}>{props.children}</p>;
};

export default Footnote;
