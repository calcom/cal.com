/* eslint-disable playwright/missing-playwright-await */
import { render } from "@testing-library/react";

import type { RelevantProfile } from "@calcom/types/RelevantProfile";

import { UserAvatar } from "./UserAvatar";

const mockUser = {
  name: "John Doe",
  username: "pro",
  organizationId: null,
  avatarUrl: "",
  relevantProfile: null,
};

describe("tests for UserAvatar component", () => {
  test("Should render the UsersAvatar Correctly", () => {
    const { getByTestId } = render(<UserAvatar user={mockUser} data-testid="user-avatar-test" />);
    const avatar = getByTestId("user-avatar-test");

    expect(avatar).toBeInTheDocument();
  });

  test("It should render the organization logo if a organization is passed in", () => {
    const relevantProfile: RelevantProfile = {
      username: "",
      organizationId: 1,
      organization: {
        id: 1,
        requestedSlug: "steve",
        slug: "steve",
      },
    };
    const { getByTestId } = render(
      <UserAvatar user={{ ...mockUser, relevantProfile }} data-testid="user-avatar-test" />
    );

    const avatar = getByTestId("user-avatar-test");
    const organizationLogo = getByTestId("organization-logo");

    expect(avatar).toBeInTheDocument();
    expect(organizationLogo).toBeInTheDocument();
  });
});
