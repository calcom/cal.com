import type React from "react";
import { vi } from "vitest";

vi.mock("../Section", () => {
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
      <div data-testid="booker-section" class={className} data-area={areaValue}>
        {children}
      </div>
    );
  };
  return { BookerSection };
});
