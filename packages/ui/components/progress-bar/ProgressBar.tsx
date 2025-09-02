import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

import classNames from "@calcom/ui/classNames";

const progressBarStyles = cva("h-2 rounded-full", {
  variants: {
    color: {
      green: "bg-green-500",
      blue: "bg-blue-500",
      red: "bg-red-500",
      yellow: "bg-yellow-500",
      gray: "bg-gray-500",
    },
  },
  defaultVariants: {
    color: "gray",
  },
});

export interface ProgressBarProps extends VariantProps<typeof progressBarStyles> {
  percentageValue: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ color, percentageValue, label, className }: ProgressBarProps) {
  const clampedPercentage = Math.min(100, Math.max(0, percentageValue));

  return (
    <div className={classNames("flex w-full items-center gap-3", className)}>
      <div className="h-2 flex-1 rounded-full bg-gray-200">
        <div className={progressBarStyles({ color })} style={{ width: `${clampedPercentage}%` }} />
      </div>
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
    </div>
  );
}
