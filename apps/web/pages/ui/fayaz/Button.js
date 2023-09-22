import clsx from "clsx";
import React from "react";

const Button = ({ label, icon, size, loading, color = "primary", className, ...props }) => {
  return (
    <button
      className={clsx(
        color === "primary"
          ? "flex items-center justify-center rounded-md bg-indigo-500 font-semibold text-white shadow-sm hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          : "",
        color === "secondary"
          ? "rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1  ring-inset ring-gray-300 hover:bg-gray-50 "
          : "",
        color === "danger"
          ? "rounded-md bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
          : "",
        size === "sm" ? "p-2 text-xs" : "px-5 py-2 text-sm",
        loading && "cursor-not-allowed opacity-50",
        className
      )}
      {...props}>
      {loading && (
        <svg
          className="mr-2 h-4 w-4 animate-spin text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </button>
  );
};

export default Button;
