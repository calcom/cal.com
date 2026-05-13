import { createElement } from "react";
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Cal from "./Cal";

const { defaultCal, namespacedCal } = vi.hoisted(() => {
  const namespacedCal = vi.fn();
  const defaultCal = Object.assign(vi.fn(), {
    ns: {
      inline: namespacedCal,
    },
  });

  return {
    defaultCal,
    namespacedCal,
  };
});

vi.mock("@calcom/embed-snippet", () => ({
  default: () => defaultCal,
}));

describe("<Cal />", () => {
  it("updates inline embed config after the initial mount", async () => {
    const { rerender } = render(
      createElement(Cal, {
        calLink: "pro",
        namespace: "inline",
        config: {
          theme: "light",
          layout: "month_view",
        },
      })
    );

    await waitFor(() => {
      expect(namespacedCal).toHaveBeenCalledWith("inline", {
        elementOrSelector: expect.any(HTMLDivElement),
        calLink: "pro",
        config: {
          theme: "light",
          layout: "month_view",
        },
      });
    });

    namespacedCal.mockClear();

    rerender(
      createElement(Cal, {
        calLink: "pro",
        namespace: "inline",
        config: {
          theme: "dark",
          layout: "week_view",
        },
      })
    );

    expect(namespacedCal).toHaveBeenCalledWith("connect", {
      config: {
        theme: "dark",
        layout: "week_view",
      },
      params: {},
    });
    expect(namespacedCal).toHaveBeenCalledWith("ui", {
      theme: "dark",
      layout: "week_view",
    });
    expect(namespacedCal).not.toHaveBeenCalledWith("inline", expect.anything());
  });
});
