import classnames from "classnames";
import React from "react";

import { TextProps } from "../Text";

const Title: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames("font-medium text-neutral-900 ", props?.className);

  return <p className={classes}>{props?.text || props.children}</p>;
};

export default Title;
