import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FileUploader, { formatFileSize } from "./FileUploader";

vi.mock("../toast", () => ({
  showToast: vi.fn(),
}));

describe("formatFileSize", () => {
  it("returns '0 Bytes' for 0", () => {
    expect(formatFileSize(0)).toBe("0 Bytes");
  });

  it("formats bytes correctly", () => {
    expect(formatFileSize(500)).toBe("500 Bytes");
  });

  it("formats kilobytes correctly", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
  });

  it("formats megabytes correctly", () => {
    expect(formatFileSize(1048576)).toBe("1 MB");
  });

  it("formats with decimal precision", () => {
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });
});

describe("FileUploader", () => {
  it("renders upload button with translated text", () => {
    const { container } = render(<FileUploader id="test-upload" onFilesChange={vi.fn()} />);
    const label = container.querySelector("label");
    expect(label).toBeInTheDocument();
  });

  it("renders upload button with custom text", () => {
    render(<FileUploader id="test-upload" onFilesChange={vi.fn()} buttonMsg="Upload Photos" />);
    expect(screen.getByText("Upload Photos")).toBeInTheDocument();
  });

  it("renders file input element", () => {
    const { container } = render(<FileUploader id="test-upload" onFilesChange={vi.fn()} />);
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
  });

  it("applies disabled state", () => {
    const { container } = render(<FileUploader id="test-upload" onFilesChange={vi.fn()} disabled />);
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeDisabled();
  });

  it("renders with testId", () => {
    const { container } = render(
      <FileUploader id="test-upload" onFilesChange={vi.fn()} testId="file-uploader" />
    );
    const input = container.querySelector('[data-testid="file-uploader"]');
    expect(input).toBeInTheDocument();
  });

  it("sets multiple attribute by default", () => {
    const { container } = render(<FileUploader id="test-upload" onFilesChange={vi.fn()} />);
    const input = container.querySelector('input[type="file"]');
    expect(input).toHaveAttribute("multiple");
  });

  it("renders file instructions text", () => {
    render(<FileUploader id="test-upload" onFilesChange={vi.fn()} />);
    const instructions = screen.getByText(/10 MB/);
    expect(instructions).toBeInTheDocument();
  });

  it("renders without multiple when set to false", () => {
    const { container } = render(<FileUploader id="test-upload" onFilesChange={vi.fn()} multiple={false} />);
    const input = container.querySelector('input[type="file"]');
    expect(input).not.toHaveAttribute("multiple");
  });
});
