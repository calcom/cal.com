import classnames from "classnames";
import React from "react";

import { TextProps } from "../Text";

const Caption2: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames("text-xs italic text-gray-500 dark:text-white leading-tight", props?.className);

  return <p className={classes}>{props?.text || props.children}</p>;
};

export default Caption2;
