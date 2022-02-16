import classnames from "classnames";
import React from "react";

import { TextProps } from "../Text";

const Headline: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames("font-cal text-xl font-bold text-gray-900 dark:text-white", props?.className);

  return <p className={classes}>{props?.text || props.children}</p>;
};

export default Headline;
