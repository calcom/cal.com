import classnames from "classnames";
import React from "react";

import { TextProps } from "../Text";

const Footnote: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames("text-xs font-medium text-gray-500 dark:text-white", props?.className);

  return <p className={classes}>{props?.text || props.children}</p>;
};

export default Footnote;
