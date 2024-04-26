import type { ComponentProps } from "react";

export default function PasskeyIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      id="icon-passkey"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="3 1.5 19.5 19"
      width="16"
      height="16"
      fill="currentColor"
      {...props}>
      <g id="icon-passkey-all">
        <circle id="icon-passkey-head" cx="10.5" cy="6" r="4.5" />
        <path
          id="icon-passkey-key"
          d="M22.5,10.5a3.5,3.5,0,1,0-5,3.15V19L19,20.5,21.5,18,20,16.5,21.5,15l-1.24-1.24A3.5,3.5,0,0,0,22.5,10.5Zm-3.5,0a1,1,0,1,1,1-1A1,1,0,0,1,19,10.5Z"
        />
        <path
          id="icon-passkey-body"
          d="M14.44,12.52A6,6,0,0,0,12,12H9a6,6,0,0,0-6,6v2H16V14.49A5.16,5.16,0,0,1,14.44,12.52Z"
        />
      </g>
    </svg>
  );
}
