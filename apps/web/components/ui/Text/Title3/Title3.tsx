import classnames from "classnames";
import React from "react";

import { TextProps } from "../Text";

const Title3: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames(
    "text-xs font-semibold leading-tight text-gray-900 dark:text-white",
    props?.className
  );

  return <p className={classes}>{props?.text || props.children}</p>;
};

export default Title3;
