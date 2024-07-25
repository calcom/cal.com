/* eslint-disable playwright/missing-playwright-await */
import { render } from "@testing-library/react";

import { OrgBanner } from "./OrgBanner";

describe("tests for OrgBanner component", () => {
  test("Should render the OrgBanner correctly when supplied imageSrc", () => {
    const { getByTestId } = render(
      <OrgBanner alt="Test Org Banner" data-testid="org-banner-test" imageSrc="/logo.svg" />
    );
    const orgBanner = getByTestId("org-banner-test");

    expect(orgBanner).toBeInTheDocument();
  });
  test("Should not render the OrgBanner when no imageSrc is supplied", () => {
    const { getByTestId } = render(<OrgBanner alt="Test Org Banner" data-testid="org-banner-test" />);

    expect(() => getByTestId("org-banner-test")).toThrow();
  });
});
