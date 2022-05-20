import React from "react";

export default function CalButtonGroup({ children, config }) {
  return (
    <>
      {children.map((button, index) => {
        return (
          <span key={index} className="ml-2">
            {button}
          </span>
        );
      })}
    </>
  );
}
