import React, { forwardRef } from "react";

export const SatSymbol = forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(function SatSymbol(props) {
  return (
    <svg
      className={props.className}
      id="Layer_1"
      data-name="Layer 1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 360 360">
      <title>Satoshis</title>

      <rect
        fill="currentColor"
        x="201.48"
        y="37.16"
        width="23.49"
        height="40.14"
        transform="translate(21.82 -52.79) rotate(14.87)"
      />
      <rect
        fill="currentColor"
        x="135.03"
        y="287.5"
        width="23.49"
        height="40.14"
        transform="translate(83.82 -27.36) rotate(14.87)"
      />
      <rect
        fill="currentColor"
        x="184.27"
        y="38.29"
        width="23.49"
        height="167.49"
        transform="translate(364.26 -36.11) rotate(104.87)"
      />
      <rect
        fill="currentColor"
        x="168.36"
        y="98.26"
        width="23.49"
        height="167.49"
        transform="translate(402.22 54.61) rotate(104.87)"
      />
      <rect
        fill="currentColor"
        x="152.89"
        y="156.52"
        width="23.49"
        height="167.49"
        transform="translate(439.1 142.78) rotate(104.87)"
      />
    </svg>
  );
});
