import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";

import FileUploader from "./FileUploader";

const meta = {
  component: FileUploader,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "400px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FileUploader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: "file-upload",
    onFilesChange: fn(),
  },
};

export const ImagesOnly: Story = {
  args: {
    id: "image-upload",
    buttonMsg: "Upload Images",
    acceptedFileTypes: ["images"],
    onFilesChange: fn(),
  },
};

export const DocumentsOnly: Story = {
  args: {
    id: "doc-upload",
    buttonMsg: "Upload Documents",
    acceptedFileTypes: ["documents"],
    onFilesChange: fn(),
  },
};

export const CSVOnly: Story = {
  args: {
    id: "csv-upload",
    buttonMsg: "Import CSV",
    acceptedFileTypes: ["csv"],
    onFilesChange: fn(),
  },
};

export const VideosOnly: Story = {
  args: {
    id: "video-upload",
    buttonMsg: "Upload Video",
    acceptedFileTypes: ["videos"],
    onFilesChange: fn(),
  },
};

export const WithMaxFiles: Story = {
  args: {
    id: "limited-upload",
    buttonMsg: "Upload (Max 3)",
    maxFiles: 3,
    onFilesChange: fn(),
  },
};

export const SingleFile: Story = {
  args: {
    id: "single-upload",
    buttonMsg: "Upload Single File",
    multiple: false,
    onFilesChange: fn(),
  },
};

export const CustomMaxSize: Story = {
  args: {
    id: "size-limited",
    buttonMsg: "Upload (Max 5MB)",
    maxFileSize: 5 * 1024 * 1024,
    onFilesChange: fn(),
  },
};

export const Disabled: Story = {
  args: {
    id: "disabled-upload",
    buttonMsg: "Upload Disabled",
    disabled: true,
    onFilesChange: fn(),
  },
};

export const HiddenFilesList: Story = {
  args: {
    id: "no-list-upload",
    buttonMsg: "Upload Files",
    showFilesList: false,
    onFilesChange: fn(),
  },
};

export const MultipleTypes: Story = {
  args: {
    id: "multi-type-upload",
    buttonMsg: "Upload Media",
    acceptedFileTypes: ["images", "videos"],
    onFilesChange: fn(),
  },
};
