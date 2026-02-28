import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./index";

describe("HoverCard", () => {
  it("renders trigger content", () => {
    render(
      <HoverCard>
        <HoverCardTrigger>Hover me</HoverCardTrigger>
        <HoverCardContent>Card content</HoverCardContent>
      </HoverCard>
    );
    expect(screen.getByText("Hover me")).toBeInTheDocument();
  });

  it("HoverCardContent has correct displayName", () => {
    expect(HoverCardContent.displayName).toBeDefined();
  });

  it("exports HoverCard", () => {
    expect(HoverCard).toBeDefined();
  });

  it("exports HoverCardTrigger", () => {
    expect(HoverCardTrigger).toBeDefined();
  });
});
