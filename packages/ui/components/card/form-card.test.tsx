/* eslint-disable playwright/missing-playwright-await */
import { render, fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";

import FormCard from "./FormCard";

describe("Tests for FormCard", () => {
  const direction = {
    check: () => true,
    fn: vi.fn().mockReturnValue(true),
  };
  const iconArr = [
    {
      name: "ArrowUp icon",
      moveUp: direction,
    },
    {
      name: "ArrowDown icon",
      moveDown: direction,
    },
    {
      name: "Trash icon",
      deleteField: direction,
    },
  ];

  test.each(iconArr)("should render FormCard Component with $name", (props) => {
    const { container } = render(
      <FormCard {...props}>
        <div>Example</div>
      </FormCard>
    );
    const btn = container.getElementsByTagName("button")[0];
    fireEvent.click(btn);
    expect(btn).toBeInTheDocument();
  });

  test("should render FormCard with badge", () => {
    render(
      <FormCard
        badge={{
          text: "Badge",
          variant: "default",
          href: "https://example.com",
        }}>
        <div>Example</div>
      </FormCard>
    );
    expect(screen.getByText("Badge")).toBeInTheDocument();
  });
});
