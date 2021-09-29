import classnames from "classnames";
import React from "react";

import { TextProps } from "../Text";

const Title2: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames("text-base font-normal text-gray-900 dark:text-white", props?.className);

  return <p className={classes}>{props?.text || props.children}</p>;
};

export default Title2;
