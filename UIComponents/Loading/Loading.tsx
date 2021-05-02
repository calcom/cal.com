import React from "react";
import styles from "./Loading.module.css";

import { RotateIcon } from "../../SvgComponents";

const Loading = props => {
  const { width = 24, height = 24 } = props;
  return (
    <div className={styles.loading}>
      <RotateIcon width={width} height={height} fill="#ffffff" />
    </div>
  );
};

export default Loading;
