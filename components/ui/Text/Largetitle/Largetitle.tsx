import React from "react";
import classnames from "classnames";
import { TextProps } from "../Text";
import Styles from "../Text.module.css";

const Largetitle: React.FunctionComponent<TextProps> = (props: TextProps) => {
  const classes = classnames(Styles["text--largetitle"], props?.className, props?.color);

  return <p className={classes}>{props.children}</p>;
};

export default Largetitle;
