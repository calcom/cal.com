import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import { Table } from "./Table";

const meta = {
  title: "Components/Table",
  component: Table,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[700px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Table>
      <Table.Header>
        <Table.ColumnTitle>Name</Table.ColumnTitle>
        <Table.ColumnTitle>Email</Table.ColumnTitle>
        <Table.ColumnTitle>Role</Table.ColumnTitle>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell>John Doe</Table.Cell>
          <Table.Cell>john@example.com</Table.Cell>
          <Table.Cell>Admin</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Jane Smith</Table.Cell>
          <Table.Cell>jane@example.com</Table.Cell>
          <Table.Cell>Member</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>Bob Wilson</Table.Cell>
          <Table.Cell>bob@example.com</Table.Cell>
          <Table.Cell>Member</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  ),
};

export const TeamMembers: Story = {
  render: () => (
    <Table>
      <Table.Header>
        <Table.ColumnTitle widthClassNames="w-1/3">Member</Table.ColumnTitle>
        <Table.ColumnTitle widthClassNames="w-1/4">Role</Table.ColumnTitle>
        <Table.ColumnTitle widthClassNames="w-1/4">Status</Table.ColumnTitle>
        <Table.ColumnTitle widthClassNames="w-1/6">Actions</Table.ColumnTitle>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell>
            <div className="flex items-center gap-3">
              <Avatar size="sm" alt="John Doe" imageSrc="https://cal.com/stakeholder/peer.jpg" />
              <div>
                <p className="text-emphasis font-medium">John Doe</p>
                <p className="text-subtle text-xs">john@example.com</p>
              </div>
            </div>
          </Table.Cell>
          <Table.Cell>
            <Badge variant="success">Admin</Badge>
          </Table.Cell>
          <Table.Cell>
            <Badge variant="success" withDot>
              Active
            </Badge>
          </Table.Cell>
          <Table.Cell>
            <Button size="sm" color="minimal">
              Edit
            </Button>
          </Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>
            <div className="flex items-center gap-3">
              <Avatar size="sm" alt="Jane Smith" imageSrc={null} />
              <div>
                <p className="text-emphasis font-medium">Jane Smith</p>
                <p className="text-subtle text-xs">jane@example.com</p>
              </div>
            </div>
          </Table.Cell>
          <Table.Cell>
            <Badge variant="gray">Member</Badge>
          </Table.Cell>
          <Table.Cell>
            <Badge variant="success" withDot>
              Active
            </Badge>
          </Table.Cell>
          <Table.Cell>
            <Button size="sm" color="minimal">
              Edit
            </Button>
          </Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>
            <div className="flex items-center gap-3">
              <Avatar size="sm" alt="Bob Wilson" imageSrc={null} />
              <div>
                <p className="text-emphasis font-medium">Bob Wilson</p>
                <p className="text-subtle text-xs">bob@example.com</p>
              </div>
            </div>
          </Table.Cell>
          <Table.Cell>
            <Badge variant="gray">Member</Badge>
          </Table.Cell>
          <Table.Cell>
            <Badge variant="warning" withDot>
              Pending
            </Badge>
          </Table.Cell>
          <Table.Cell>
            <Button size="sm" color="minimal">
              Edit
            </Button>
          </Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  ),
};

export const BookingsTable: Story = {
  render: () => (
    <Table>
      <Table.Header>
        <Table.ColumnTitle>Event</Table.ColumnTitle>
        <Table.ColumnTitle>Attendee</Table.ColumnTitle>
        <Table.ColumnTitle>Date & Time</Table.ColumnTitle>
        <Table.ColumnTitle>Status</Table.ColumnTitle>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell>
            <p className="text-emphasis font-medium">30 Minute Meeting</p>
          </Table.Cell>
          <Table.Cell>alice@example.com</Table.Cell>
          <Table.Cell>Dec 25, 2024 at 10:00 AM</Table.Cell>
          <Table.Cell>
            <Badge variant="success">Confirmed</Badge>
          </Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>
            <p className="text-emphasis font-medium">60 Minute Consultation</p>
          </Table.Cell>
          <Table.Cell>bob@example.com</Table.Cell>
          <Table.Cell>Dec 26, 2024 at 2:00 PM</Table.Cell>
          <Table.Cell>
            <Badge variant="warning">Pending</Badge>
          </Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>
            <p className="text-emphasis font-medium">15 Min Quick Call</p>
          </Table.Cell>
          <Table.Cell>carol@example.com</Table.Cell>
          <Table.Cell>Dec 27, 2024 at 9:00 AM</Table.Cell>
          <Table.Cell>
            <Badge variant="error">Cancelled</Badge>
          </Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  ),
};

export const EmptyState: Story = {
  render: () => (
    <Table>
      <Table.Header>
        <Table.ColumnTitle>Name</Table.ColumnTitle>
        <Table.ColumnTitle>Email</Table.ColumnTitle>
        <Table.ColumnTitle>Role</Table.ColumnTitle>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell>
            <div className="text-subtle py-8 text-center" style={{ gridColumn: "1 / -1" }}>
              No data available
            </div>
          </Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  ),
};
