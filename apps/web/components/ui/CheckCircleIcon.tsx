import React, { forwardRef } from "react";

export const CheckCircleIcon = forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(function Discord(
  props
) {
  return (
    <svg
      className={props.className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512">
      {/* <!--!Font Awesome Free 6.6.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--> */}
      <path
        fill="#66bb6a"
        d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"
      />
    </svg>
  );
});
