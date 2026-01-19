import type React from "react";
import { vi } from "vitest";

vi.mock("@calcom/features/bookings/components/Section", () => {
  const BookerSection = ({
    children,
    className = "",
    area,
  }: {
    children: React.ReactNode;
    className?: string;
    area?: string | { default: string; month_view: string };
  }): React.ReactElement => {
    let areaValue: string | undefined;
    if (typeof area === "string") {
      areaValue = area;
    } else {
      areaValue = area?.default;
    }
    return (
      // biome-ignore lint/suspicious/noReactSpecificProps: This is a React component that requires className
      <div data-testid="booker-section" className={className} data-area={areaValue}>
        {children}
      </div>
    );
  };
  return { BookerSection };
});
