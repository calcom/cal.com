import React from "react";
import PropTypes from "prop-types";

import Loading from "./Loading";

type DefaultProps = {
  color: "primary" | "secondary";
  isLoading: true | false;
  label?: String;
  className?: String;
};

const defaultProps: DefaultProps = {
  color: "primary",
  isLoading: false
};

const getColorClass = (color: DefaultProps["color"]) => {
  switch (color) {
    case "primary": {
      return "btn-primary";
    }
    case "secondary": {
      return "btn-white";
    }
    default: {
      return "btn-primary";
    }
  }
};

const UIButton = (props: any) => {
  const { label, isLoading, color, className, ...buttonProps } = props;
  return (
    <button
      className={`btn flex items-center justify-center ${getColorClass(
        color
      )} ${className}`}
      style={{
        minWidth: "80px",
        height: "40px"
      }}
      {...buttonProps}
    >
      {isLoading ? <Loading /> : label}
    </button>
  );
};

UIButton.defaultProps = defaultProps;

UIButton.propTypes = {
  color: PropTypes.oneOf(["primary", "secondary"])
};

export default UIButton;
