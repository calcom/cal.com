import { render, screen } from "@testing-library/react";
import { TopBanner } from "./TopBanner";

describe("Tests for TopBanner component", () => {
  test("Should render the component properly", () => {
    render(<TopBanner text="the banner test" />);

    const bannerElt = screen.getByTestId("banner");
    expect(bannerElt).toBeInTheDocument();

    const btnElt = screen.queryByRole("button");
    expect(btnElt).toBeNull();
  });

  test("Should render actions", () => {
    render(<TopBanner text="the banner test" actions={<div>cta</div>} />);

    const ctaElt = screen.getByText("cta");
    expect(ctaElt).toBeInTheDocument();
  });

  test("Should render the default variant", async () => {
    render(<TopBanner text="the banner test" icon="arrow-down" />);

    const variant = await screen.findByTestId("variant-default");
    expect(variant).toBeInTheDocument();
  });

  test("Should render the alert variant", async () => {
    render(<TopBanner text="the banner test" variant="error" />);

    const variant = await screen.findByTestId("variant-error");
    expect(variant).toBeInTheDocument();
  });

  test("Should render the warning variant", async () => {
    render(<TopBanner text="the banner test" variant="warning" />);

    const variant = await screen.findByTestId("variant-warning");
    expect(variant).toBeInTheDocument();
  });
});
