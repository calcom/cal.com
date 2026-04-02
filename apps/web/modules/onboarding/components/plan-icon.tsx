import { Icon, type IconName } from "@calcom/ui/components/icon";
import { AnimatePresence, motion } from "framer-motion";

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
  animationDirection = "down",
}: {
  icon: IconName;
  variant?: "single" | "organization" | "team";
  animationDirection?: "up" | "down";
}) {
  const renderIconContainer = () => {
    return (
      <div
        className="bg-default absolute left-1/2 top-1/2 flex h-[80px] w-[80px] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-clip rounded-full"
        style={{
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

  const renderSmallUserIcon = (ringIndex: number, angle: number, index: number) => {
    const ringSize = RING_SIZES[ringIndex];
    const radius = ringSize / 2;
    const angleRad = (angle * Math.PI) / 180;

    // Calculate position on the ring
    const x = Math.cos(angleRad) * radius;
    const y = Math.sin(angleRad) * radius;
    const iconHalfSize = 20.25; // Half of 40.5px

    return (
      <motion.div
        key={`small-icon-${ringIndex}-${angle}`}
        initial={{
          opacity: 0,
          y: y - iconHalfSize + (animationDirection === "down" ? -20 : 20),
        }}
        animate={{
          opacity: 1,
          y: y - iconHalfSize,
        }}
        exit={{
          opacity: 0,
          y: y - iconHalfSize + (animationDirection === "down" ? 20 : -20),
        }}
        transition={{
          duration: 0.5,
          ease: [0.34, 1.56, 0.64, 1],
          delay: index * 0.05, // Stagger animation for small icons
        }}
        className="bg-default absolute flex h-[40.5px] w-[40.5px] items-center justify-center overflow-clip rounded-full shadow-[0px_2.075px_4.15px_0px_rgba(34,42,53,0.05),0px_0px_0px_0.519px_rgba(34,42,53,0.08),0px_0.519px_2.594px_-2.075px_rgba(19,19,22,0.7)]"
        style={{
          x: x - iconHalfSize,
          left: "50%",
          top: "50%",
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
      </motion.div>
    );
  };

  return (
    <div className="relative mx-auto h-[465px] w-[465px] shrink-0 overflow-visible">
      {/* Generate concentric rings centered on icon */}
      {RING_SIZES.map((size, index) => {
        const opacity = [0.6, 0.5, 0.4, 0.35][index] || 0.3;
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
            }}
          />
        );
      })}

      {/* Small user icons on rings (for team variant) */}
      <AnimatePresence mode="wait">
        {variant === "team" || variant === "organization"
          ? TEAM_ICON_POSITIONS.map(({ ringIndex, angle }, index) =>
              renderSmallUserIcon(ringIndex, angle, index)
            )
          : null}
      </AnimatePresence>

      {renderIconContainer()}
    </div>
  );
}
