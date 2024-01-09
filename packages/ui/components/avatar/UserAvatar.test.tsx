/* eslint-disable playwright/missing-playwright-await */
import { render } from "@testing-library/react";

import { AVATAR_FALLBACK } from "@calcom/lib/constants";

import { UserAvatar } from "./UserAvatar";

const mockUser = {
  name: "John Doe",
  username: "pro",
  organizationId: null,
};

describe("tests for UserAvatar component", () => {
  test("Should render the UsersAvatar Correctly", () => {
    const { getByTestId } = render(<UserAvatar user={mockUser} data-testid="user-avatar-test" />);
    const avatar = getByTestId("user-avatar-test");

    expect(avatar).toBeInTheDocument();
  });

  test("It should render the organization logo if a organization is passed in", () => {
    const { getByTestId } = render(
      <UserAvatar
        user={mockUser}
        organization={{ id: -1, requestedSlug: "steve", slug: "steve", logoUrl: AVATAR_FALLBACK }}
        data-testid="user-avatar-test"
      />
    );

    const avatar = getByTestId("user-avatar-test");
    const organizationLogo = getByTestId("organization-logo");

    expect(avatar).toBeInTheDocument();
    expect(organizationLogo).toBeInTheDocument();
  });
});
