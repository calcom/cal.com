import classnames from "classnames";
import React from "react";

import { TextProps } from "../Text";

const Subtitle: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames("text-sm font-normal text-neutral-500 ", props?.className);

  return <p className={classes}>{props?.text || props.children}</p>;
};

export default Subtitle;
