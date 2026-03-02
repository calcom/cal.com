import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./license-view", () => ({
  default: () => <div data-testid="license-view" />,
}));

describe("AdminBillingView", async () => {
  const AdminBillingView = (await import("./billing-view")).default;
  it("should render LicenseView component", () => {
    const { getByTestId } = render(<AdminBillingView />);
    expect(getByTestId("license-view")).toBeInTheDocument();
  });
});
