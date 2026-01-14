import type { LucideIcon } from "lucide-react";
import { PlusIcon } from "lucide-react";

import { Button } from "@calcom/ui/components/button";

type EmptyStateProps = {
  icon: LucideIcon;
  header: string;
  text: string;
  buttonText: string;
  buttonOnClick: () => void;
  buttonStartIcon?: LucideIcon;
  buttonClassName?: string;
  buttonDataTestId?: string;
};

export const EmptyState = ({
  icon: IconComponent,
  header,
  text,
  buttonText,
  buttonOnClick,
  buttonStartIcon = PlusIcon,
  buttonClassName,
  buttonDataTestId,
}: EmptyStateProps) => {
  return (
    <div className="border-subtle bg-cal-muted flex flex-col items-center gap-6 rounded-xl border p-11">
      <div className="mb-3 grid">
        {/* Icon card - Top */}
        <div className="bg-default border-subtle z-30 col-start-1 col-end-1 row-start-1 row-end-1 h-10 w-10 transform rounded-md border shadow-sm">
          <div className="flex h-full items-center justify-center">
            <IconComponent className="text-emphasis h-4 w-4" />
          </div>
        </div>
        {/* Left fanned card */}
        <div
          className="bg-default border-subtle z-20 col-start-1 col-end-1 row-start-1 row-end-1 h-10 w-10 rounded-md border shadow-sm"
          style={{
            transform: "translate(-12px, 2px) rotate(-6deg)",
          }}
        />
        {/* Right fanned card */}
        <div
          className="bg-default border-subtle z-10 col-start-1 col-end-1 row-start-1 row-end-1 h-10 w-10 rounded-md border shadow-sm"
          style={{
            transform: "translate(12px, 2px) rotate(6deg)",
          }}
        />
      </div>
      <div className="w-full">
        <h1 className="text-emphasis line-clamp-1 text-center text-lg font-semibold">
          {header}
        </h1>
        <p className="mt-2 line-clamp-1 text-center text-sm leading-normal transition-all duration-200 ease-in-out hover:line-clamp-none">
          {text}
        </p>
      </div>
      <Button
        data-testid={buttonDataTestId}
        StartIcon={buttonStartIcon}
        onClick={buttonOnClick}
        className={buttonClassName}
      >
        {buttonText}
      </Button>
    </div>
  );
};
