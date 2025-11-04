import classNames from "@calcom/ui/classNames";
import { Icon, type IconName } from "@calcom/ui/components/icon";

// Ring sizes - just the diameters, all centered on the icon
const RING_SIZES = [166, 233, 345, 465];

// Positions for small user icons on rings (for team variant)
// Format: [ringIndex, angleInDegrees]
// Angles: 0 = top, 90 = right, 180 = bottom, 270 = left
const TEAM_ICON_POSITIONS = [
  { ringIndex: 2, angle: 30 }, // Top-right of third ring
  { ringIndex: 2, angle: 150 }, // Bottom-left of third ring
  { ringIndex: 2, angle: 210 }, // Bottom-left of third ring
  { ringIndex: 2, angle: 330 }, // Top-left of third ring
  { ringIndex: 3, angle: 0 }, // Top of largest ring
  { ringIndex: 3, angle: 180 }, // Bottom of largest ring
];

export function PlanIcon({
  icon,
  variant = "single",
}: {
  icon: IconName;
  variant?: "single" | "organization" | "team";
}) {
  const renderIconContainer = (index: number) => {
    const leftPosition = "50%";

    return (
      <div
        key={index}
        className="bg-default absolute flex h-[80px] w-[80px] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-clip rounded-full"
        style={{
          left: leftPosition,
          top: "50%",
          background: "linear-gradient(to bottom, var(--cal-bg, #ffffff), var(--cal-bg-muted, #f7f7f7))",
          boxShadow:
            "0px 2.818px 5.635px 0px var(--cal-border-subtle), 0px 0px 0px 0.704px var(--cal-border), 0px 0.704px 3.522px -2.818px rgba(0, 0, 0, 0.3)",
        }}>
        {/* Icon */}
        <div className="size-12 flex items-center justify-center">
          <Icon
            name={variant === "organization" ? "users" : icon}
            size={32}
            strokeWidth={1.75}
            className="text-emphasis opacity-80"
          />
        </div>

        {/* Inner highlight/shine effect */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            boxShadow: "0px 0.704px 0.423px 0px inset var(--cal-bg-inverted)",
            opacity: 0.15,
          }}
        />
      </div>
    );
  };

  const renderSmallUserIcon = (ringIndex: number, angle: number) => {
    const ringSize = RING_SIZES[ringIndex];
    const radius = ringSize / 2;
    const angleRad = (angle * Math.PI) / 180;

    // Calculate position on the ring
    const x = Math.cos(angleRad) * radius;
    const y = Math.sin(angleRad) * radius;

    return (
      <div
        key={`${ringIndex}-${angle}`}
        className="bg-default absolute flex h-[40.5px] w-[40.5px] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-clip rounded-full shadow-[0px_2.075px_4.15px_0px_rgba(34,42,53,0.05),0px_0px_0px_0.519px_rgba(34,42,53,0.08),0px_0.519px_2.594px_-2.075px_rgba(19,19,22,0.7)]"
        style={{
          left: `calc(50% + ${x}px)`,
          top: `calc(50% + ${y}px)`,
          background: "linear-gradient(to bottom, var(--cal-bg, #ffffff), var(--cal-bg-muted, #f7f7f7))",
        }}>
        <div className="flex items-center justify-center opacity-70">
          <Icon name="user" size={24} strokeWidth={1.75} className="text-emphasis" />
        </div>
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            boxShadow: "0px 0.519px 0.311px 0px inset var(--cal-bg-inverted)",
            opacity: 0.15,
          }}
        />
      </div>
    );
  };

  return (
    <div className="relative h-[282px] w-[465px] shrink-0 overflow-visible">
      {/* Generate concentric rings centered on icon */}
      {RING_SIZES.map((size, index) => {
        const opacity = [0.25, 0.3, 0.35, 0.4][index] || 0.3;
        return (
          <div
            key={index}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              border: "0.5px solid",
              borderColor: "var(--cal-border-default, #D3D3D3)",
              opacity: opacity,
              maskImage:
                "linear-gradient(180deg, transparent 0%, black 2%, black 50%, black 75%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(180deg, transparent 0%, black 2%, black 50%, black 75%, transparent 100%)",
            }}
          />
        );
      })}

      {/* Small user icons on rings (for team variant) */}
      {(variant === "team" || variant === "organization") &&
        TEAM_ICON_POSITIONS.map(({ ringIndex, angle }) => renderSmallUserIcon(ringIndex, angle))}

      {renderIconContainer(0)}
    </div>
  );
}
