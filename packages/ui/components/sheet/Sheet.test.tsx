import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./Sheet";

describe("Sheet", () => {
  it("renders trigger element", () => {
    render(
      <Sheet>
        <SheetTrigger>Open Sheet</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Title</SheetTitle>
          </SheetHeader>
          <SheetBody>Body content</SheetBody>
        </SheetContent>
      </Sheet>
    );
    expect(screen.getByText("Open Sheet")).toBeInTheDocument();
  });

  it("SheetContent has correct displayName", () => {
    expect(SheetContent.displayName).toBe("SheetContent");
  });

  it("SheetTitle has correct displayName", () => {
    expect(SheetTitle.displayName).toBe("SheetTitle");
  });

  it("SheetDescription has correct displayName", () => {
    expect(SheetDescription.displayName).toBe("SheetDescription");
  });

  it("SheetContent has correct displayName for content", () => {
    expect(SheetContent.displayName).toBe("SheetContent");
  });

  it("exports SheetClose", () => {
    expect(SheetClose).toBeDefined();
  });

  it("exports SheetFooter", () => {
    expect(SheetFooter).toBeDefined();
  });

  it("exports SheetBody", () => {
    expect(SheetBody).toBeDefined();
  });

  it("exports SheetHeader", () => {
    expect(SheetHeader).toBeDefined();
  });
});
