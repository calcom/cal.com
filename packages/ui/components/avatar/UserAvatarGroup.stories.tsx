import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { UserAvatarGroup } from "./UserAvatarGroup";

const meta = {
  component: UserAvatarGroup,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof UserAvatarGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleUsers = [
  {
    name: "John Doe",
    username: "johndoe",
    avatarUrl: "https://i.pravatar.cc/150?img=1",
    profile: {
      username: "johndoe",
      organization: null,
    },
  },
  {
    name: "Jane Smith",
    username: "janesmith",
    avatarUrl: "https://i.pravatar.cc/150?img=2",
    profile: {
      username: "janesmith",
      organization: null,
    },
  },
  {
    name: "Bob Wilson",
    username: "bobwilson",
    avatarUrl: "https://i.pravatar.cc/150?img=3",
    profile: {
      username: "bobwilson",
      organization: null,
    },
  },
  {
    name: "Alice Johnson",
    username: "alicejohnson",
    avatarUrl: "https://i.pravatar.cc/150?img=4",
    profile: {
      username: "alicejohnson",
      organization: null,
    },
  },
  {
    name: "Charlie Brown",
    username: "charliebrown",
    avatarUrl: "https://i.pravatar.cc/150?img=5",
    profile: {
      username: "charliebrown",
      organization: null,
    },
  },
  {
    name: "Diana Prince",
    username: "dianaprince",
    avatarUrl: "https://i.pravatar.cc/150?img=6",
    profile: {
      username: "dianaprince",
      organization: null,
    },
  },
];

const sampleOrgUsers = [
  {
    name: "Alex Turner",
    username: "alexturner",
    avatarUrl: "https://i.pravatar.cc/150?img=7",
    profile: {
      username: "alexturner",
      organization: {
        slug: "acme-corp",
      },
    },
  },
  {
    name: "Sarah Connor",
    username: "sarahconnor",
    avatarUrl: "https://i.pravatar.cc/150?img=8",
    profile: {
      username: "sarahconnor",
      organization: {
        slug: "acme-corp",
      },
    },
  },
  {
    name: "Mike Ross",
    username: "mikeross",
    avatarUrl: "https://i.pravatar.cc/150?img=9",
    profile: {
      username: "mikeross",
      organization: {
        slug: "acme-corp",
      },
    },
  },
];

export const Default: Story = {
  args: {
    size: "sm",
    users: sampleUsers.slice(0, 3),
  },
};

export const Small: Story = {
  args: {
    size: "sm",
    users: sampleUsers.slice(0, 3),
  },
};

export const Large: Story = {
  args: {
    size: "lg",
    users: sampleUsers.slice(0, 3),
  },
};

export const WithTruncation: Story = {
  args: {
    size: "sm",
    users: sampleUsers,
    truncateAfter: 4,
  },
};

export const TruncateAfterTwo: Story = {
  args: {
    size: "sm",
    users: sampleUsers,
    truncateAfter: 2,
  },
};

export const HideTruncatedCount: Story = {
  args: {
    size: "sm",
    users: sampleUsers,
    truncateAfter: 3,
    hideTruncatedAvatarsCount: true,
  },
};

export const SingleUser: Story = {
  args: {
    size: "sm",
    users: [sampleUsers[0]],
  },
};

export const OrganizationMembers: Story = {
  args: {
    size: "sm",
    users: sampleOrgUsers,
    truncateAfter: 3,
  },
};

export const TeamMembers: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <UserAvatarGroup
        size="sm"
        users={sampleUsers.slice(0, 4)}
        truncateAfter={3}
      />
      <span className="text-subtle text-sm">4 team members</span>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-subtle w-12 text-sm">Small:</span>
        <UserAvatarGroup size="sm" users={sampleUsers.slice(0, 4)} />
      </div>
      <div className="flex items-center gap-4">
        <span className="text-subtle w-12 text-sm">Large:</span>
        <UserAvatarGroup size="lg" users={sampleUsers.slice(0, 4)} />
      </div>
    </div>
  ),
};

export const WithoutAvatars: Story = {
  args: {
    size: "sm",
    users: [
      {
        name: "No Avatar User",
        username: "noavatar",
        avatarUrl: null,
        profile: {
          username: "noavatar",
          organization: null,
        },
      },
    ],
  },
};

export const MixedUsersWithAndWithoutOrganization: Story = {
  args: {
    size: "sm",
    users: [
      sampleUsers[0],
      sampleOrgUsers[0],
      sampleUsers[1],
      sampleOrgUsers[1],
    ],
    truncateAfter: 4,
  },
};
