/* eslint-disable playwright/missing-playwright-await */
import { render } from "@testing-library/react";

import { OrgBanner } from "./OrgBanner";

describe("tests for UserAvatar component", () => {
  test("Should render the UsersAvatar Correctly", () => {
    const { getByTestId } = render(<OrgBanner data-testid="user-avatar-test" />);
    const orgBanner = getByTestId("org-banner-test");

    expect(orgBanner).toBeInTheDocument();
  });
});
