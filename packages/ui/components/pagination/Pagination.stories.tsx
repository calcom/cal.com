import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Pagination } from "./Pagination";

const meta = {
  component: Pagination,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "600px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    return (
      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={100}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    );
  },
};

export const FirstPage: Story = {
  render: () => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    return (
      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={250}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    );
  },
};

export const MiddlePage: Story = {
  render: () => {
    const [currentPage, setCurrentPage] = useState(5);
    const [pageSize, setPageSize] = useState(25);
    return (
      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={250}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    );
  },
};

export const LastPage: Story = {
  render: () => {
    const [currentPage, setCurrentPage] = useState(10);
    const [pageSize, setPageSize] = useState(10);
    return (
      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={100}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    );
  },
};

export const CustomPageSizes: Story = {
  render: () => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);
    return (
      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={50}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[5, 10, 20, 50]}
      />
    );
  },
};

export const SmallDataset: Story = {
  render: () => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    return (
      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={5}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    );
  },
};
