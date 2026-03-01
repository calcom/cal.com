import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DisconnectIntegrationComponent } from "./DisconnectIntegration";

vi.mock("../dialog/ConfirmationDialogContent", () => ({
  ConfirmationDialogContent: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="confirmation-dialog">
      <span>{title}</span>
      {children}
    </div>
  ),
}));

vi.mock("../dialog/Dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("DisconnectIntegrationComponent", () => {
  const defaultProps = {
    isModalOpen: false,
    onModalOpen: vi.fn(),
    onDeletionConfirmation: vi.fn(),
  };

  it("renders without label", () => {
    const { container } = render(<DisconnectIntegrationComponent {...defaultProps} />);
    expect(container.querySelector("button")).toBeInTheDocument();
  });

  it("renders with label text", () => {
    render(<DisconnectIntegrationComponent {...defaultProps} label="Disconnect" />);
    expect(screen.getByText("Disconnect")).toBeInTheDocument();
  });

  it("renders disabled button when isGlobal is true", () => {
    const { container } = render(
      <DisconnectIntegrationComponent {...defaultProps} isGlobal label="Remove" />
    );
    const button = container.querySelector("button");
    expect(button).toBeDisabled();
  });

  it("renders disabled button when disabled prop is true", () => {
    const { container } = render(
      <DisconnectIntegrationComponent {...defaultProps} disabled label="Remove" />
    );
    const button = container.querySelector("button");
    expect(button).toBeDisabled();
  });

  it("renders confirmation dialog content", () => {
    render(<DisconnectIntegrationComponent {...defaultProps} isModalOpen />);
    expect(screen.getByText("remove_app")).toBeInTheDocument();
  });
});
