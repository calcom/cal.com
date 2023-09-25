/* eslint-disable playwright/missing-playwright-await */
import { render, screen, fireEvent } from "@testing-library/react";

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetClose,
  SheetFooter,
  SheetTitle,
  sheetVariants,
  portalVariants,
} from "./sheet";

describe("Tests for Sheet component", () => {
  const portalVars = ["top", "bottom", "left", "right"];
  const compoundVariants = [
    { position: "top", size: "content" },
    { position: "top", size: "sm" },
    { position: "top", size: "lg" },
    { position: "top", size: "xl" },
    { position: "top", size: "full" },
    { position: "left", size: "content" },
    { position: "left", size: "sm" },
    { position: "left", size: "lg", remove: "h-full" },
    { position: "left", size: "xl", remove: "h-full" },
    { position: "left", size: "full", remove: "h-full" },
  ];

  test("should render sheet", () => {
    render(
      <Sheet>
        <SheetTrigger asChild>
          <button data-testid="trigger-btn">Open default sheet</button>
        </SheetTrigger>
        <SheetContent
          position="top"
          size="content"
          bottomActions={
            <div>
              <button data-testid="click-btn">Click</button>
            </div>
          }>
          <SheetHeader>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>This is a description.</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <SheetClose asChild>
              <button data-testid="sheet-close" type="submit">
                Save changes
              </button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
    const triggerBtn = screen.getByTestId("trigger-btn");
    expect(triggerBtn).toBeInTheDocument();
    fireEvent.click(triggerBtn);
    expect(screen.getByTestId("click-btn")).toBeInTheDocument();
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("This is a description.")).toBeInTheDocument();
    expect(screen.getByText("Save changes")).toBeInTheDocument();
    const closeBtn = screen.getByTestId("sheet-close");
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn);
    expect(closeBtn).not.toBeInTheDocument();
  });

  test.each(portalVars)("Should apply portal variants: %s", (position) => {
    render(
      <Sheet>
        <SheetTrigger asChild>
          <button data-testid="trigger-btn">Open default sheet</button>
        </SheetTrigger>
        <SheetContent position={position as any}>
          <SheetHeader>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>This is a description.</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <SheetClose asChild>
              <button data-testid="sheet-close" type="submit">
                Save changes
              </button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
    const triggerBtn = screen.getByTestId("trigger-btn");
    expect(triggerBtn).toBeInTheDocument();
    fireEvent.click(triggerBtn);
    const portalVariantClass = portalVariants({ position } as any);
    const portalClass = screen.getByTestId("sheet-portal").className;
    expect(portalClass).toEqual(portalVariantClass);
  });

  test.each(compoundVariants)(
    "Should apply compound variant class ($position, $size)",
    ({ position, size, remove }) => {
      render(
        <Sheet>
          <SheetTrigger asChild>
            <button data-testid="trigger-btn">Open default sheet</button>
          </SheetTrigger>
          <SheetContent position={position as any} size={size as any}>
            <SheetHeader>
              <SheetTitle>Title</SheetTitle>
              <SheetDescription>This is a description.</SheetDescription>
            </SheetHeader>
            <SheetFooter>
              <SheetClose asChild>
                <button data-testid="sheet-close" type="submit">
                  Save changes
                </button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      );
      const triggerBtn = screen.getByTestId("trigger-btn");
      expect(triggerBtn).toBeInTheDocument();
      fireEvent.click(triggerBtn);
      let sheetVariantClass = sheetVariants({ position, size } as any);
      const dialogClass = screen.getByRole("dialog").className;
      if (remove) {
        sheetVariantClass = sheetVariantClass.replace("h-full", "").replace("  ", " ");
      }
      expect(dialogClass).toEqual(sheetVariantClass);
    }
  );
});
