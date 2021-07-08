import React from "react";
import classnames from "classnames";
import { TextProps } from "../Text";

const Headline: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames("text--headline", props?.className, props?.color);

  return <h1 className={classes}>{props.children}</h1>;
};

export default Headline;
