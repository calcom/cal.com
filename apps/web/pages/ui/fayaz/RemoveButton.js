import clsx from "clsx";
import React from "react";

const RemoveButton = ({ label, onClick, className }) => {
  return (
    <button
      onClick={onClick}
      type="button"
      className={clsx(
        "rounded-md bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-500 ring-1 ring-rose-100 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2",
        className
      )}>
      {label}
    </button>
  );
};

export default RemoveButton;
