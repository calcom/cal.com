"use client";

import { Meter as MeterPrimitive } from "@base-ui/react/meter";

import { cn } from "@coss/ui/lib/utils";

function Meter({ className, children, ...props }: MeterPrimitive.Root.Props) {
  return (
    <MeterPrimitive.Root className={cn("flex w-full flex-col gap-2", className)} {...props}>
      {children ? (
        children
      ) : (
        <MeterTrack>
          <MeterIndicator />
        </MeterTrack>
      )}
    </MeterPrimitive.Root>
  );
}

function MeterLabel({ className, ...props }: MeterPrimitive.Label.Props) {
  return (
    <MeterPrimitive.Label
      className={cn("font-medium text-sm", className)}
      data-slot="meter-label"
      {...props}
    />
  );
}

function MeterTrack({ className, ...props }: MeterPrimitive.Track.Props) {
  return (
    <MeterPrimitive.Track
      className={cn("block h-2 w-full overflow-hidden bg-input", className)}
      data-slot="meter-track"
      {...props}
    />
  );
}

function MeterIndicator({ className, ...props }: MeterPrimitive.Indicator.Props) {
  return (
    <MeterPrimitive.Indicator
      className={cn("bg-primary transition-all duration-500", className)}
      data-slot="meter-indicator"
      {...props}
    />
  );
}

function MeterValue({ className, ...props }: MeterPrimitive.Value.Props) {
  return (
    <MeterPrimitive.Value
      className={cn("text-sm tabular-nums", className)}
      data-slot="meter-value"
      {...props}
    />
  );
}

export { Meter, MeterLabel, MeterTrack, MeterIndicator, MeterValue };
