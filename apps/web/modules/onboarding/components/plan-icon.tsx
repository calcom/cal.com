import classNames from "@calcom/ui/classNames";
import { Icon, type IconName } from "@calcom/ui/components/icon";

export function PlanIcon({ icon, variant = "single" }: { icon: IconName; variant?: "single" | "double" }) {
  const renderIconContainer = (index: number) => {
    // For double variant: 55px icon width + 24px gap = 79px between centers, so ±39.5px from center
    const leftPosition = variant === "double" ? `calc(50% + ${index === 0 ? -39.5 : 39.5}px)` : "50%";

    return (
      <div
        key={index}
        className="bg-default absolute top-[10px] flex h-[55px] w-[55px] -translate-x-1/2 items-center justify-center overflow-clip rounded-full"
        style={{
          left: leftPosition,
          background: "linear-gradient(to bottom, var(--cal-bg, #ffffff), var(--cal-bg-muted, #f7f7f7))",
          boxShadow:
            "0px 2.818px 5.635px 0px var(--cal-border-subtle), 0px 0px 0px 0.704px var(--cal-border), 0px 0.704px 3.522px -2.818px rgba(0, 0, 0, 0.3)",
        }}>
        {/* Icon */}
        <div className="size-8 flex items-center justify-center">
          <Icon name={icon} size={24} strokeWidth={1.75} className="text-emphasis opacity-80" />
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

  return (
    <div className="relative h-[76px] w-[160px] shrink-0 overflow-visible">
      {/* Outer ring - SVG with linear gradient */}
      <svg
        className="pointer-events-none absolute left-[calc(50%+0.627px)] top-[-40px] -translate-x-1/2"
        width="156"
        height="156"
        viewBox="0 0 156 156"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          maskImage:
            "linear-gradient(180deg, transparent 0%, black 2%, black 50%, black 75%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, transparent 0%, black 2%, black 50%, black 75%, transparent 100%)",
        }}>
        <circle opacity="0.3" cx="78" cy="78" r="77.5" stroke="url(#paint0_linear_outer)" strokeWidth="0.5" />
        <defs>
          <linearGradient
            id="paint0_linear_outer"
            x1="78"
            y1="0"
            x2="78"
            y2="156"
            gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--cal-border-default, #D3D3D3)" />
            <stop offset="1" stopColor="var(--cal-border-emphasis, #B2B2B2)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Middle ring - SVG with linear gradient */}
      <svg
        className="pointer-events-none absolute left-[calc(50%+0.628px)] top-[-20.01px] -translate-x-1/2"
        width="111"
        height="111"
        viewBox="0 0 111 111"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          maskImage:
            "linear-gradient(180deg, transparent 0%, black 2%, black 50%, black 75%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, transparent 0%, black 2%, black 50%, black 75%, transparent 100%)",
        }}>
        <circle
          opacity="0.4"
          cx="55.461"
          cy="55.455"
          r="55.211"
          stroke="url(#paint0_linear_middle)"
          strokeWidth="0.5"
        />
        <defs>
          <linearGradient
            id="paint0_linear_middle"
            x1="55.461"
            y1="-0.006"
            x2="55.461"
            y2="110.916"
            gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--cal-border-default, #D3D3D3)" />
            <stop offset="1" stopColor="var(--cal-border-emphasis, #B2B2B2)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Main icon container(s) with gradient background */}
      {variant === "single" ? renderIconContainer(0) : [renderIconContainer(0), renderIconContainer(1)]}
    </div>
  );
}
