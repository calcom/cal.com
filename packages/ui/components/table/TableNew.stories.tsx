import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./TableNew";

const meta = {
  title: "Table/TableNew",
  component: Table,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>John Doe</TableCell>
          <TableCell>john@example.com</TableCell>
          <TableCell>Admin</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Jane Smith</TableCell>
          <TableCell>jane@example.com</TableCell>
          <TableCell>Member</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Bob Wilson</TableCell>
          <TableCell>bob@example.com</TableCell>
          <TableCell>Member</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const WithCaption: Story = {
  render: () => (
    <Table>
      <TableCaption>A list of team members</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Alice Johnson</TableCell>
          <TableCell>alice@example.com</TableCell>
          <TableCell>Active</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Charlie Brown</TableCell>
          <TableCell>charlie@example.com</TableCell>
          <TableCell>Pending</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Event Type</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead className="text-right">Bookings</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>15 Min Meeting</TableCell>
          <TableCell>15 min</TableCell>
          <TableCell className="text-right">24</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>30 Min Meeting</TableCell>
          <TableCell>30 min</TableCell>
          <TableCell className="text-right">18</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>60 Min Meeting</TableCell>
          <TableCell>60 min</TableCell>
          <TableCell className="text-right">12</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={2}>Total</TableCell>
          <TableCell className="text-right">54</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  ),
};

export const BookingsTable: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Attendee</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium">Product Demo</TableCell>
          <TableCell>Dec 20, 2024</TableCell>
          <TableCell>john@company.com</TableCell>
          <TableCell>
            <span className="bg-success text-success rounded-full px-2 py-1 text-xs">Confirmed</span>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">Sales Call</TableCell>
          <TableCell>Dec 21, 2024</TableCell>
          <TableCell>jane@company.com</TableCell>
          <TableCell>
            <span className="bg-attention text-attention rounded-full px-2 py-1 text-xs">Pending</span>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">Technical Review</TableCell>
          <TableCell>Dec 22, 2024</TableCell>
          <TableCell>bob@company.com</TableCell>
          <TableCell>
            <span className="bg-error text-error rounded-full px-2 py-1 text-xs">Cancelled</span>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const Compact: Story = {
  render: () => (
    <Table className="text-xs">
      <TableHeader>
        <TableRow>
          <TableHead className="h-8 px-2">ID</TableHead>
          <TableHead className="h-8 px-2">Name</TableHead>
          <TableHead className="h-8 px-2">Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[1, 2, 3, 4, 5].map((i) => (
          <TableRow key={i}>
            <TableCell className="px-2 py-1">#{i}</TableCell>
            <TableCell className="px-2 py-1">Item {i}</TableCell>
            <TableCell className="px-2 py-1">${i * 10}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const Empty: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={3} className="text-subtle text-center py-8">
            No data available
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
