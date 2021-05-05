import React from "react";
import styles from "./Loading.module.css";

import RotateIcon from "../RotateIcon";

const Loading = props => {
  const { width = 24, height = 24, fill = "#ffffff" } = props;
  return (
    <div className={styles.loading}>
      <RotateIcon width={width} height={height} fill={fill} />
    </div>
  );
};

export default Loading;
