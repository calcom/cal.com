import React from "react";
import classnames from "classnames";
import { TextProps } from "../Text";
import Styles from "../Text.module.css";

const Overline: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames(Styles["text--overline"], props?.className, props?.color);

  return <p className={classes}>{props.children}</p>;
};

export default Overline;
