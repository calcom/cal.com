import { Icon, type IconName } from "@calcom/ui/components/icon";

// Ring sizes - just the diameters, all centered on the icon
const RING_SIZES: number[] = [166, 233, 345, 465];

export function PlanIcon({ icon }: { icon: IconName }): JSX.Element {
  const renderIconContainer = (): JSX.Element => {
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
          <Icon name={icon} size={32} strokeWidth={1.75} className="text-emphasis opacity-80" />
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
    <div className="relative mx-auto h-[465px] w-[465px] shrink-0 overflow-visible">
      {/* Generate concentric rings centered on icon */}
      {RING_SIZES.map((size, index) => {
        const opacity = [0.6, 0.5, 0.4, 0.35][index] || 0.3;
        return (
          <div
            key={size}
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

      {renderIconContainer()}
    </div>
  );
}
