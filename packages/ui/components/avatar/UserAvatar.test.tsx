/* eslint-disable playwright/missing-playwright-await */

import type { UserProfile } from "@calcom/types/UserProfile";
import { render } from "@testing-library/react";
import { UserAvatar } from "./UserAvatar";

const mockUser = {
  name: "John Doe",
  username: "pro",
  organizationId: null,
  avatarUrl: "",
  profile: {
    id: 1,
    username: "",
    organizationId: null,
    organization: null,
  },
};

describe("tests for UserAvatar component", () => {
  test("Should render the UsersAvatar Correctly", () => {
    const { getByTestId } = render(<UserAvatar user={mockUser} data-testid="user-avatar-test" />);
    const avatar = getByTestId("user-avatar-test");

    expect(avatar).toBeInTheDocument();
  });

  test("It should render the organization logo if a organization is passed in", () => {
    const profile: UserProfile = {
      username: "",
      id: 1,
      upId: "1",
      organizationId: 1,
      organization: {
        id: 1,
        requestedSlug: "steve",
        slug: "steve",
        name: "Org1",
        calVideoLogo: "",
      },
    };
    const { getByTestId } = render(
      <UserAvatar user={{ ...mockUser, profile }} data-testid="user-avatar-test" />
    );

    const avatar = getByTestId("user-avatar-test");
    const organizationLogo = getByTestId("organization-logo");

    expect(avatar).toBeInTheDocument();
    expect(organizationLogo).toBeInTheDocument();
  });
});
