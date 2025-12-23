import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import { List, ListItem, ListItemTitle, ListItemText } from "./List";

const meta = {
  component: List,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof List>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <List>
      <ListItem>
        <div className="flex flex-col">
          <ListItemTitle>First Item</ListItemTitle>
          <ListItemText>Description for the first item</ListItemText>
        </div>
      </ListItem>
      <ListItem>
        <div className="flex flex-col">
          <ListItemTitle>Second Item</ListItemTitle>
          <ListItemText>Description for the second item</ListItemText>
        </div>
      </ListItem>
      <ListItem>
        <div className="flex flex-col">
          <ListItemTitle>Third Item</ListItemTitle>
          <ListItemText>Description for the third item</ListItemText>
        </div>
      </ListItem>
    </List>
  ),
};

export const WithRoundedContainer: Story = {
  render: () => (
    <List roundContainer>
      <ListItem rounded={false}>
        <ListItemTitle>Rounded Container Item 1</ListItemTitle>
      </ListItem>
      <ListItem rounded={false}>
        <ListItemTitle>Rounded Container Item 2</ListItemTitle>
      </ListItem>
      <ListItem rounded={false}>
        <ListItemTitle>Rounded Container Item 3</ListItemTitle>
      </ListItem>
    </List>
  ),
};

export const TeamMembersList: Story = {
  render: () => (
    <List>
      <ListItem>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar size="sm" alt="John Doe" imageSrc="https://cal.com/stakeholder/peer.jpg" />
            <div className="flex flex-col">
              <ListItemTitle>John Doe</ListItemTitle>
              <ListItemText>john@example.com</ListItemText>
            </div>
          </div>
          <Badge variant="success">Admin</Badge>
        </div>
      </ListItem>
      <ListItem>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar size="sm" alt="Jane Smith" imageSrc={null} />
            <div className="flex flex-col">
              <ListItemTitle>Jane Smith</ListItemTitle>
              <ListItemText>jane@example.com</ListItemText>
            </div>
          </div>
          <Badge variant="gray">Member</Badge>
        </div>
      </ListItem>
      <ListItem>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar size="sm" alt="Bob Wilson" imageSrc={null} />
            <div className="flex flex-col">
              <ListItemTitle>Bob Wilson</ListItemTitle>
              <ListItemText>bob@example.com</ListItemText>
            </div>
          </div>
          <Badge variant="gray">Member</Badge>
        </div>
      </ListItem>
    </List>
  ),
};

export const EventTypesList: Story = {
  render: () => (
    <List>
      <ListItem>
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col">
            <ListItemTitle>30 Minute Meeting</ListItemTitle>
            <ListItemText>30 min · One-on-One</ListItemText>
          </div>
          <Button size="sm" color="secondary">
            Edit
          </Button>
        </div>
      </ListItem>
      <ListItem>
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col">
            <ListItemTitle>60 Minute Meeting</ListItemTitle>
            <ListItemText>60 min · One-on-One</ListItemText>
          </div>
          <Button size="sm" color="secondary">
            Edit
          </Button>
        </div>
      </ListItem>
      <ListItem>
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col">
            <ListItemTitle>Team Standup</ListItemTitle>
            <ListItemText>15 min · Round Robin</ListItemText>
          </div>
          <Button size="sm" color="secondary">
            Edit
          </Button>
        </div>
      </ListItem>
    </List>
  ),
};

export const ExpandedItems: Story = {
  render: () => (
    <List noBorderTreatment>
      <ListItem expanded>
        <div className="flex flex-col">
          <ListItemTitle>Expanded Item 1</ListItemTitle>
          <ListItemText>This item has extra spacing</ListItemText>
        </div>
      </ListItem>
      <ListItem expanded>
        <div className="flex flex-col">
          <ListItemTitle>Expanded Item 2</ListItemTitle>
          <ListItemText>With margin between items</ListItemText>
        </div>
      </ListItem>
    </List>
  ),
};
