import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { showToast } from "@calcom/ui/components/toast";

import PlainContactForm from "../../../lib/plain/PlainContactForm";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("@calcom/ui/components/toast", () => ({
  showToast: vi.fn(),
}));

const mockUseSession = vi.mocked(useSession);
const mockShowToast = vi.mocked(showToast);
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("PlainContactForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: {
        hasValidLicense: true,
        upId: "test-up-id",
        expires: "2025-12-31T23:59:59.999Z",
        user: {
          id: 123,
          name: "Test User",
          email: "test@example.com",
        },
      },
      status: "authenticated",
      update: vi.fn(),
    });
  });

  it("should render contact button when closed", () => {
    render(<PlainContactForm />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("should open contact form when button is clicked", () => {
    render(<PlainContactForm />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(screen.getByText("Contact support")).toBeInTheDocument();
    expect(screen.getByLabelText("Describe the issue")).toBeInTheDocument();
    expect(screen.getByText("Attachments (optional)")).toBeInTheDocument();
  });

  it("should show empty form initially", () => {
    render(<PlainContactForm />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    const messageInput = screen.getByLabelText("Describe the issue") as HTMLTextAreaElement;
    expect(messageInput.value).toBe("");
  });

  it("should close form when X button is clicked", () => {
    render(<PlainContactForm />);

    const openButton = screen.getByRole("button");
    fireEvent.click(openButton);

    const buttons = screen.getAllByRole("button");
    const closeButton = buttons.find((button) => button.querySelector('svg use[href="#x"]'));
    expect(closeButton).toBeDefined();

    fireEvent.click(closeButton!);

    expect(screen.queryByText("Contact support")).not.toBeInTheDocument();
  });

  it("should handle form submission successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<PlainContactForm />);

    const openButton = screen.getByRole("button");
    fireEvent.click(openButton);

    fireEvent.change(screen.getByLabelText("Describe the issue"), {
      target: { value: "Test message" },
    });

    const submitButton = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Message Sent")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/support", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Test message",
        attachmentIds: [],
      }),
    });
  });

  it("should show loading state during submission", async () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    mockFetch.mockImplementation(() => new Promise((_resolve) => {}));

    render(<PlainContactForm />);

    const openButton = screen.getByRole("button");
    fireEvent.click(openButton);

    fireEvent.change(screen.getByLabelText("Describe the issue"), {
      target: { value: "Test message" },
    });

    const submitButton = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(submitButton);

    expect(screen.getByText("Sending")).toBeInTheDocument();
    await expect(submitButton).toBeDisabled();
  });

  it("should reset form after successful submission", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<PlainContactForm />);

    const openButton = screen.getByRole("button");
    fireEvent.click(openButton);

    fireEvent.change(screen.getByLabelText("Describe the issue"), {
      target: { value: "Test message" },
    });

    const submitButton = screen.getByRole("button", { name: /send message/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Message Sent")).toBeInTheDocument();
    });

    const sendAnotherButton = screen.getByRole("button", { name: /send another message/i });
    fireEvent.click(sendAnotherButton);

    await waitFor(() => {
      const messageInput = screen.getByLabelText("Describe the issue") as HTMLTextAreaElement;
      expect(messageInput.value).toBe("");
    });
  });

  it("should handle missing user session", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    render(<PlainContactForm />);

    const openButton = screen.getByRole("button");
    fireEvent.click(openButton);

    const messageInput = screen.getByLabelText("Describe the issue") as HTMLTextAreaElement;
    expect(messageInput.value).toBe("");
  });

  it("should require message field", async () => {
    render(<PlainContactForm />);

    const openButton = screen.getByRole("button");
    fireEvent.click(openButton);

    await expect(screen.getByLabelText("Describe the issue")).toHaveAttribute("required");
  });
});
