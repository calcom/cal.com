
export const SidebarToggle = ({
  className,
  width,
  height,
  viewBox,
  strokeWidth,
}) => {
  return (
    <svg
      className={className}
      width={width || "30"}
      height={height || "30"}
      viewBox={viewBox || "0 0 30 30"}
      fill="currentColor"
      strokeWidth={strokeWidth || 1.5}
    >
      <path
        d="M6 10C6 8.89543 6.89543 8 8 8H13V22H8C6.89543 22 6 21.1046 6 20V10Z"
        fill="#D4D4D4"
        stroke="#A3A3A3"
      />
      <rect
        x="6"
        y="8"
        width="18"
        height="14"
        rx="2"
        fill="none"
        stroke="#A3A3A3"
      />
    </svg>
  )
}